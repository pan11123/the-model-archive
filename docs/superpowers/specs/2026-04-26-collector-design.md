# 模型档案馆 —— 自动采集器设计

- **状态**：设计已确认，待实施
- **创建日期**：2026-04-26
- **作者**：pan11123 + Claude（brainstorming session）
- **目标读者**：实施者（人或 AI agent）

---

## 1. 目标与范围

为 `the-model-archive` 项目提供一个**半自动**的模型发布信息采集器：

- 每日定时从 10 家（且持续增加）AI 厂商的官方 blog / RSS 抓取最新发布
- 用 LLM（智谱 GLM）做结构化抽取与中英双语描述生成
- 把候选条目以 GitHub PR 的形式呈现，由人审核 / 编辑 / merge
- 通过校验时复用主项目的 Zod schema 与 `crossValidate`，保证写出的数据 100% 能被 `loadAll()` 消费

### 非目标

- 不做全自动写入（人始终在 merge 环节）
- 不抓非官方源（HN / Reddit / 公众号）
- 不做模型 benchmark / 性能数据采集，只采"发布事件"
- 不为采集器提供独立 UI / dashboard
- 不在采集失败时引入第三方通知（邮件兜底足矣）

---

## 2. 关键决策（澄清阶段产出）

| 维度 | 决策 | 备注 |
|---|---|---|
| 自动化层级 | 半自动 + 人工复核 | 由人 merge PR |
| 数据源 | 厂商官方渠道（RSS 优先 + Playwright 兜底） | 不依赖聚合源 |
| 抽取方式 | LLM 结构化抽取（智谱 GLM） | 单一 prompt 适配所有厂商，双语一步到位 |
| 复核载体 | GitHub PR（自动开） | 复用 GitHub 原生 review UI |
| 频率 | 每日 cron（02:00 UTC）+ 手动 `workflow_dispatch` | 单 PR 汇总当次所有候选 |
| LLM | 智谱 GLM-4-Flash | 通过 OpenAI 兼容端点调用，无需专有 SDK |
| 仓库组织 | 同仓 + `scripts/collector/` 子目录 | schema 共享是核心理由 |

---

## 3. 架构总览

整个采集器是一条**纯管线**，每次运行从头到尾走一遍：

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions: 每日 cron 02:00 UTC + workflow_dispatch       │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 1. discover (per-vendor adapter)                          │
   │    discover.type='rss'  → rss-parser 拉 feed             │
   │    discover.type='list' → Playwright 渲染列表页          │
   │    输出：{ url, title, publishedAt? }[]                  │
   │    与 state.json 比对去重                                │
   └──────────────────────────────┬───────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 2. fetch (Playwright, 统一)                              │
   │    打开候选 URL → 拿 { html, plainText, title }         │
   │    (RSS 正文常被截断，统一走 Playwright 抓全文)         │
   └──────────────────────────────┬───────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 3. extract (智谱 GLM, structured JSON output)            │
   │    输出：{ isRelease, model, descriptionZh, descriptionEn,│
   │            confidence, releaseDate?, reasoning }         │
   └──────────────────────────────┬───────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 4. validate (复用 src/lib/schemas.ts + crossValidate)    │
   └──────────────────────────────┬───────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 5. emit (yaml writer, round-trip 保格式)                 │
   │    prepend 到 releases.yaml；更新 state.json             │
   └──────────────────────────────┬───────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 6. open PR (peter-evans/create-pull-request)             │
   │    title: "collector: <N> 个候选 (YYYY-MM-DD)"           │
   │    若无候选则不开 PR (空跑安静退出)                     │
   └──────────────────────────────────────────────────────────┘
```

### 设计原则

1. **单一职责管线**：每步只做一件事、有清晰输入输出，便于单测与排错定位
2. **失败局部化**：单厂商或单 post 失败不阻断其它，错误收集后写入 PR body
3. **state.json 与 PR 同 commit**：人 merge PR 时 state 一起进 main，无需依赖 GH Actions cache 或外部存储
4. **自我验证**：写完 yaml 后立即跑 `loadAll()`，不可能产出"语法对但 schema 错"的 PR

---

## 4. Per-vendor Adapter

### 4.1 类型定义

```ts
// scripts/collector/types.ts

export type DiscoverConfig =
  | { type: 'rss'; url: string }
  | {
      type: 'list';
      url: string;
      linkSelector: string;   // 渲染后从 DOM 抽链接的 CSS selector
      linkPrefix?: string;    // 拼接相对 URL 时的前缀
    };

export interface VendorAdapter {
  id: string;                 // 必须等于 vendors.yaml 中某个厂商的 id
  discover: DiscoverConfig;

  /** 给 LLM 的提示词补丁 */
  releaseHints?: {
    titleKeywords?: string[];     // 必须含其一才视为候选
    excludeKeywords?: string[];   // 出现即排除（粗筛）
  };

  /** URL 过滤：discover 阶段后立即应用 */
  urlFilter?: (url: string) => boolean;
}
```

### 4.2 示例

```ts
// scripts/collector/vendors/anthropic.ts
const adapter: VendorAdapter = {
  id: 'anthropic',
  discover: { type: 'rss', url: 'https://www.anthropic.com/news/rss.xml' },
  releaseHints: { excludeKeywords: ['policy', 'safety report', 'transparency'] },
  urlFilter: (url) => url.includes('/news/'),
};

// scripts/collector/vendors/xai.ts
const adapter: VendorAdapter = {
  id: 'xai',
  discover: {
    type: 'list',
    url: 'https://x.ai/news',
    linkSelector: 'a[href*="/news/"]',
    linkPrefix: 'https://x.ai',
  },
  releaseHints: { titleKeywords: ['grok'] },
};
```

### 4.3 注册

```ts
// scripts/collector/vendors/index.ts
import openai from './openai';
import anthropic from './anthropic';
// ... 其它
export const adapters = [openai, anthropic, /* ... */];
```

加新厂商工作量：编辑 `vendors.yaml` 加一条 + 在 `vendors/` 加一个文件 + 在 `index.ts` 加一行 import。

### 4.4 实施期普查

10 个厂商各自的 RSS / 列表页 URL 与 selector 由实施阶段做"端点普查 + 调试"时填入；spec 不预先猜测具体 URL。每个 adapter 必须配套 vitest fixture 测试。

如果某厂商既无 RSS 也无可稳定解析的列表页，**该 adapter 暂缓接入**：不写 `vendors/<id>.ts`、不在 `vendors/index.ts` 注册；在实施完成报告中列出，留待后续手工兜底（人工补条目）。不让一个抓不到的厂商拖住整体上线。

---

## 5. 状态管理与去重

### 5.1 state 文件

`scripts/collector/state.json`：

```json
{
  "version": 1,
  "vendors": {
    "anthropic": {
      "seenUrls": ["https://www.anthropic.com/news/claude-4-7-sonnet"],
      "lastRun": "2026-04-26T02:00:13Z"
    }
  }
}
```

### 5.2 去重策略

Discover 之后立即用 `seenUrls` 过滤；剩余的 URL 才进入 fetch。

### 5.3 写回 state 的规则

| LLM 判定 | 行为 | 写入 seenUrls |
|---|---|---|
| `isRelease=true` 且 `confidence ≥ 0.85` | 进入 PR 候选并写入 yaml | ✅ |
| `isRelease=true` 且 `0.7 ≤ confidence < 0.85` | 写入 yaml + PR 标"⚠️ 中等置信度" | ✅ |
| `isRelease=true` 且 `confidence < 0.7` | 仅在 PR body "💭 待人工确认" 段列出，不写入 yaml | ✅ |
| `isRelease=false` | 丢弃，写入 `discarded.log` | ✅ |
| 抓取/抽取异常 | 进入 PR "❌ 失败" 段 | ❌（下次重试） |

**误判缓解**：所有丢弃记录写入 `scripts/collector/discarded.log`（同 PR commit），人工抽样审计。如发现误判，手动从 `seenUrls` 删 URL，下次 cron 会重处理。

### 5.4 Bootstrap

首次接入新厂商时，运行 `npm run collect:bootstrap`：把当前发现的所有 URL 直接写入 state（不 fetch、不抽取、不开 PR），避免历史 post 全部被当成新发布。

---

## 6. LLM 抽取

### 6.1 模型

- **首选**：`glm-4-flash`（足够、成本接近 0）
- **回退路径**：实测准确率不达标时升级 `glm-4.6`
- **调用方式**：智谱 OpenAI 兼容端点（`https://open.bigmodel.cn/api/paas/v4/`）+ `openai` 官方 Node SDK

### 6.2 输出 schema（用 JSON Schema 约束）

```ts
{
  isRelease: boolean,
  confidence: number,           // 0-1
  model: string | null,         // 例 "Claude 4.7 Sonnet"
  releaseDate: string | null,   // ISO YYYY-MM-DD；优先用 RSS pubDate
  descriptionZh: string,        // <= 50 字
  descriptionEn: string,        // <= 25 词
  reasoning: string             // 不进 yaml，仅供 PR body 展示
}
```

### 6.3 Prompt 模板

```
[system]
你是一个数据采集助手。给定一篇 AI 厂商的 blog post 正文，
判断它是否为"新模型的发布公告"，并按 JSON schema 提取结构化字段。

判断标准：
- ✅ 视为发布：宣布一个新模型/新版本上线，含模型名（如 GPT-5、Claude 4.7、Gemini 2.5 Pro）
- ❌ 不视为发布：安全报告、研究论文、政策更新、产品功能更新（非模型本体）、
  现有模型的 benchmark 文章、招聘公告、博客回顾

中文描述要求：50 字以内，简洁陈述模型亮点。
英文描述要求：25 词以内，与中文描述对应（不是机翻，是同一意思的两种自然表达）。

如果 isRelease=false，model / descriptionZh / descriptionEn 可设为 null / 空字符串。

[user]
Vendor: {adapter.id}
Title: {fetchedPost.title}
Published (from RSS): {publishedAt or "unknown"}
Content (前 4000 字):
{plainText.slice(0, 4000)}
```

### 6.4 关键决策

- **截断到 4000 字**：发布判定信息一般在文章前几段，节省 token
- **双语不是机翻**：明确要求两种语言"同一意思的自然表达"
- **reasoning 字段**：让 LLM 解释判断理由，便于人工审核（不进 yaml）
- **adapter 的 releaseHints 用作 LLM 调用前的粗筛**，节省 token，但不作最终判断依据
- **描述长度（50 字 / 25 词）只是 prompt 软约束**：`src/lib/schemas.ts` 里只有 `min(1)` 没有上限，因此偶发过长不会被 Zod 拒掉。如果实测漂移严重，再在 emit 阶段加硬截断或加 Zod refine

### 6.5 成本估算

每月 ≈ 30 天 × ~3 次/天 ≈ 90 次调用 × ~4000 token ≈ < 0.5M token；用 `glm-4-flash` 实际成本 ≈ 0。

### 6.6 防护

- 单次 cron LLM 调用上限 50 次
- 单文章抽取超时 30s
- 触发上限或超时记录到 PR body 警告段

---

## 7. YAML 写回 + PR 生成

### 7.1 YAML round-trip

使用 `yaml`（eemeli/yaml）作为 devDependency（与现有 `js-yaml` 并存）：

- `js-yaml` 不保留注释/格式，写回会"洗"原文件
- `yaml` 支持 Document AST round-trip，保留注释、空行、key 顺序

```ts
const doc = YAML.parseDocument(readFileSync('src/data/releases.yaml', 'utf8'));
for (const candidate of approved) {
  const node = doc.createNode({
    date: candidate.releaseDate,
    vendor: candidate.vendor,
    model: candidate.model,
    description: { zh: candidate.descriptionZh, en: candidate.descriptionEn },
    link: candidate.url,
  });
  insertByDateDesc(doc.contents, node);   // 同日多条 → 按 vendor.id 字典序追加
}
writeFileSync('src/data/releases.yaml', doc.toString({
  lineWidth: 0,
  defaultStringType: 'PLAIN',
  defaultKeyType: 'PLAIN',
}));
```

### 7.2 预提交校验（强约束）

写完之后立即调用：

```ts
import { loadAll } from '@/lib/loadData';
await loadAll();   // 失败则 throw，整个 cron 失败
```

### 7.3 PR 生成

使用 `peter-evans/create-pull-request@v6`，每次用 `collector/<run_id>` 唯一分支名。无 candidate 时该 action 自动跳过（无空 PR）。

### 7.4 PR body 模板

由采集器生成 `.collector-pr-body.md`，包含分段：

```markdown
> 自动采集于 YYYY-MM-DD HH:MM UTC｜本次发现 N 条候选

## ✅ 已写入 releases.yaml（高置信度）
- 列出每条 candidate：vendor + model + confidence + 日期 + URL + 中文描述 + LLM reasoning

## ⚠️ 已写入但中等置信度（请重点核对）

## 💭 低置信度候选（未写入 yaml，需人工判断）

## ❌ 失败（已重试，下次 cron 会再试）

## 📊 本次运行
- 厂商总数 / discover 出候选 / 去重后 / LLM 抽取次数 / 写入 yaml / 跳过
```

### 7.5 PR 包含的 commit 内容

1. `src/data/releases.yaml`（新增条目）
2. `scripts/collector/state.json`（已见 URL 更新）
3. `scripts/collector/discarded.log`（追加丢弃记录）

`.collector-pr-body.md` 不 commit，只用于 PR body 生成。

---

## 8. GitHub Actions Workflow

`.github/workflows/collect.yml`：

```yaml
name: collector

on:
  schedule:
    - cron: '0 2 * * *'           # 每日 UTC 02:00
  workflow_dispatch:
    inputs:
      vendors:
        description: '只跑指定厂商（逗号分隔），留空跑全部'
        required: false
        default: ''
      bootstrap:
        description: '首次接入新厂商：只填 state.json 不开 PR'
        type: boolean
        default: false

permissions:
  contents: write
  pull-requests: write

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium
      - name: Run collector
        id: collect
        env:
          ZHIPUAI_API_KEY: ${{ secrets.ZHIPUAI_API_KEY }}
          COLLECTOR_VENDORS: ${{ inputs.vendors }}
          COLLECTOR_BOOTSTRAP: ${{ inputs.bootstrap }}
        run: npm run collect
      - uses: peter-evans/create-pull-request@v6
        with:
          branch: collector/${{ github.run_id }}
          delete-branch: true
          commit-message: 'chore(collector): ${{ steps.collect.outputs.count }} candidate(s)'
          title: ${{ steps.collect.outputs.title }}
          body-path: .collector-pr-body.md
          labels: collector, needs-review
```

**cron 时间选择**：02:00 UTC = 北京 10:00 / 美西前一天 19:00 / 欧洲 03:00，覆盖大多数厂商发布窗口，且你早上能直接看 PR。

---

## 9. 本地 CLI

`package.json` 新增：

```json
{
  "scripts": {
    "collect": "tsx scripts/collector/index.ts",
    "collect:health": "tsx scripts/collector/index.ts --health-check",
    "collect:dry": "tsx scripts/collector/index.ts --dry-run",
    "collect:bootstrap": "tsx scripts/collector/index.ts --bootstrap"
  }
}
```

| 参数 | 说明 |
|---|---|
| `--vendors=anthropic,openai` | 只跑指定厂商 |
| `--bootstrap` | 只填 state.json，不抽取、不开 PR |
| `--dry-run` | 完整跑但不写文件、不开 PR |
| `--health-check` | 仅 ping discover 端点 |
| `--limit=N` | 单厂商最多处理 N 条候选（默认 10） |

典型用法：

```bash
# 接入新厂商
$ vim src/data/vendors.yaml
$ vim scripts/collector/vendors/zhipu.ts
$ npm run collect:health -- --vendors=zhipu
$ npm run collect:bootstrap -- --vendors=zhipu
$ git add . && git commit -m "feat(collector): add zhipu adapter"

# 怀疑 LLM 误判
$ vim scripts/collector/state.json   # 删掉那条 URL
$ npm run collect:dry -- --vendors=anthropic
```

---

## 10. 错误处理

### 10.1 错误分级

| 级别 | 例子 | 行为 |
|---|---|---|
| adapter 级 | RSS 502、selector 选不到链接 | 跳过该厂商；记入 PR body；workflow success |
| post 级 | Playwright timeout、LLM 抛错 | 跳过该 post；URL 不进 state；记入 PR body |
| 写回级 | 写完 yaml 后 `loadAll()` 失败 | 整次 cron 失败：state 不更新、PR 不开、exit 1 |
| 致命级 | API key 无效、Playwright 装失败 | exit 1，无写入 |

### 10.2 重试策略

- RSS / Playwright fetch：3 次，指数退避 1s / 2s / 4s
- LLM 调用：3 次，指数退避 2s / 4s / 8s（智谱偶有 429）

### 10.3 可观测性

- `.collector-pr-body.md`（PR body）
- 同样内容写入 `$GITHUB_STEP_SUMMARY`（无 PR 时也能看）
- workflow 失败时 GitHub 自动给 commit author 发邮件（默认行为）

---

## 11. 测试策略

### 11.1 单元测试（vitest，`tests/unit/collector/`）

- `state.test.ts` — seenUrls 去重、bootstrap 模式、state round-trip
- `extract.test.ts` — 用 mock LLM 响应测置信度三档分流
- `yaml-write.test.ts` — fixture yaml + 候选 → 验证日期倒序、格式保留、`loadAll()` 通过
- `pr-body.test.ts` — 给定 RunSummary 验证 markdown 分段
- `vendors/<id>.test.ts × 10` — 用静态 RSS XML / HTML fixture 测每个 adapter 的 discover

**禁止**：单测内做真实网络 / LLM / Playwright 调用。

### 11.2 E2E 测试（Playwright，`tests/e2e/collector/`）

- `dry-run.spec.ts` — `npm run collect:dry`（mock LLM、本地 fixture HTTP server），断言 state/yaml 不变、stdout 含预期 summary
- `health-check.spec.ts` — `npm run collect:health`，断言所有 adapter 至少返回非空

只覆盖"骨架串通"，不覆盖业务正确性（业务正确性由人 review PR）。

### 11.3 测试与 CI 关系

- 主 CI（`deploy.yml`）跑 `npm test`，自动包含 collector 单测
- E2E 通过 `npm run test:e2e` 触发
- 采集器自身 workflow（`collect.yml`）**不跑测试**

---

## 12. 项目结构

```
the-model-archive/
├── .github/workflows/
│   ├── deploy.yml                     (现有)
│   └── collect.yml                    ← 新增
├── scripts/                           ← 新增
│   └── collector/
│       ├── index.ts                   (CLI 入口)
│       ├── types.ts
│       ├── state.ts
│       ├── state.json                 (committed)
│       ├── discarded.log              (committed)
│       ├── discover/
│       │   ├── rss.ts
│       │   └── playwright-list.ts
│       ├── fetch/
│       │   └── playwright-article.ts
│       ├── extract/
│       │   ├── client.ts              (智谱 OpenAI 兼容)
│       │   ├── prompt.ts
│       │   └── schema.ts
│       ├── emit/
│       │   ├── yaml-writer.ts
│       │   └── pr-body.ts
│       ├── lib/
│       │   ├── retry.ts
│       │   └── html-to-text.ts
│       └── vendors/
│           ├── index.ts
│           └── <id>.ts × 10
├── tests/
│   ├── unit/collector/                ← 新增
│   ├── e2e/collector/                 ← 新增
│   └── fixtures/collector/            ← 新增
└── docs/superpowers/specs/
    └── 2026-04-26-collector-design.md
```

**与主项目的边界**：采集器只**读** `src/data/vendors.yaml`、`src/lib/{schemas,loadData,crossValidate}.ts`（通过 `@/` 别名），只**写** `src/data/releases.yaml`。`src/` 下不会有任何来自采集器的新文件。

---

## 13. 新增依赖

全部 `devDependencies`：

```json
{
  "devDependencies": {
    "tsx": "^4",
    "openai": "^4",
    "rss-parser": "^3",
    "yaml": "^2",
    "turndown": "^7"
  }
}
```

复用已有：`playwright`、`zod`、`vitest`。

**对部署的影响**：零。`scripts/` 不被 Astro 打包，devDependencies 不进生产。

---

## 14. 用户 setup 清单

按顺序：

1. **申请智谱 API key**：[https://open.bigmodel.cn/](https://open.bigmodel.cn/) → 注册 → 控制台创建 API Key
2. **加 GitHub Secret**：仓库 Settings → Secrets and variables → Actions → New repository secret
   - Name: `ZHIPUAI_API_KEY`
   - Value: 上一步的 key
3. **开启 Actions 权限**：仓库 Settings → Actions → General →
   - Workflow permissions: 选 **Read and write permissions**
   - 勾上 **Allow GitHub Actions to create and approve pull requests**
4. **首次 bootstrap**（实施完成后由实施者引导）：本地跑 `npm run collect:bootstrap`，把现存历史 post 标记为已知
5. **(可选) 失败邮件通知**：GitHub 账号 Settings → Notifications → 勾选 "Send notifications for failed workflows"

实施者负责其余全部工作（写代码、写测试、写 spec、写 workflow、首次 adapter 端点普查）。

---

## 15. 未来演进路径（明确不在本次实施范围）

- 多个下游消费者出现时，再考虑分仓 + npm 包形式的 schema 共享
- 采集器复杂度 ~5k+ LOC 时，再考虑独立 repo
- 准确率不达标时，从 `glm-4-flash` 升级 `glm-4.6`
- 真出现 JS 渲染失败的 RSS 厂商时，再加局部 Playwright 兜底
- 失败通知从邮件升级到 Slack / 钉钉，仅在多人协作时考虑
