# AI Release Log · 设计规格

- **日期**:2026-04-22
- **产品名**:AI Release Log
- **仓库/目录名**:`ai-release-log`(实施阶段前从 `AI-Calendar` 重命名)
- **副标题**:各大 AI 厂商的模型发布时刻表 / Release timeline for every major AI vendor

---

## 1. 背景与目标

一个面向公众的静态网站,集中展示全球主要 AI 厂商的大语言模型发布时间线,方便快速查看"谁在什么时候发了什么"以及"几家厂商发布节奏的横向对比"。

**核心使用场景**
- 查看近期有哪些模型发布(What's new)
- 横向对比几家厂商的发布频率与时点(Who ships faster)
- 分享特定发布记录的链接给他人

**非目标**
- 非个人工具、非团队协作工具
- 不做用户账号、收藏、通知
- 不包括多模态 / 视频 / 图像 / 音频模型(首期仅 LLM)
- 不做自动抓取;数据由维护者手动录入

## 2. 范围

**覆盖厂商**:20-40 家头部 + 垂直 LLM 厂商(例:OpenAI、Anthropic、Google、xAI、DeepSeek、Alibaba、ByteDance、Zhipu、Minimax, Kimi等)。

**模型粒度**:大版本与小版本均收录(如 Claude 3.5 → Claude 3.7)。由维护者判断是否足够"值得记录"。

**信息字段(Option A 最小集)**:厂商 / 模型名 / 精确日期 / 一句话描述 / 官方链接。

**语言**:站点支持 **中英双语(zh / en)**,可通过 Header 开关切换。首次访问根据 `navigator.language` 自动选择,后续写入 `localStorage` 记忆用户偏好。数据层双语并存,UI 文案维护 zh/en 两份字符串。

## 3. 整体架构

静态站点,单页,构建期把 YAML 数据渲染成 HTML,仅筛选交互在浏览器里执行。

```
GitHub Repo (ai-release-log)
├─ src/data/releases.yaml     # 手工维护
├─ src/data/vendors.yaml      # 手工维护
├─ src/pages/index.astro      # 主表格页
├─ src/components/            # Header / FilterBar / ReleaseTable / ReleaseChip / ReleaseDetail
└─ .github/workflows/deploy.yml

push → GitHub Actions (npm ci → astro build → 产物 dist/)
     → 部署到 GitHub Pages
     → 公开访问 <username>.github.io/ai-release-log/
```

**技术栈**
- **Astro**(静态站点生成器):构建期读 YAML,输出预渲染 HTML,交互局部 JS 化
- **Zod**:数据校验
- **Vitest**:组件单元测试
- **Playwright**:少量 E2E 冒烟测试
- **GitHub Pages + GitHub Actions**:部署与 CI
- 无后端、无数据库、无外部 API 依赖

## 4. 数据模型

两份 YAML,位于 `src/data/`。

### 4.1 `vendors.yaml`

```yaml
- id: openai
  name:
    zh: OpenAI
    en: OpenAI
  color: "#6a1b9a"
  website: https://openai.com

- id: zhipu
  name:
    zh: 智谱
    en: Zhipu AI
  color: "#1565c0"
  website: https://z.ai

# ... 20-40 条
```

**字段说明**
- `id`:kebab-case 英文唯一标识,`releases.yaml` 通过它引用厂商(必填)
- `name.zh` / `name.en`:中英文显示名称(均必填)
- `color`:品牌色,用于 pill、列头、chip(必填,十六进制)
- `website`:官方主页(必填)

### 4.2 `releases.yaml`

```yaml
- date: 2026-04-16
  vendor: openai
  model: GPT-5
  description:
    zh: 旗舰模型发布,推理、编程、多语言全面升级。
    en: Flagship release with major gains in reasoning, coding, and multilingual tasks.
  link: https://openai.com/blog/gpt-5

- date: 2026-04-02
  vendor: anthropic
  model: Claude 3.7 Sonnet
  description:
    zh: 引入扩展思考模式,可配置推理预算。
    en: Introduces extended thinking mode with configurable reasoning budget.
  link: https://anthropic.com/news/claude-3-7-sonnet
```

**字段说明**
- `date`:必填,严格 ISO 8601 `YYYY-MM-DD`
- `vendor`:必填,必须匹配 `vendors.yaml` 中某个 `id`
- `model`:必填,模型展示名(单一字符串,通常为英文官方名,双语共用)
- `description.zh` / `description.en`:必填,单行纯文本,不使用 Markdown
- `link`:必填,`https://` URL

### 4.3 UI 文案 i18n

UI 字符串(Header 标题、副标题、Filter 标签、详情抽屉按钮文字等)集中维护于 `src/i18n/zh.ts` 与 `src/i18n/en.ts`,通过语言键查询。构建期生成两套语言产物(或同构单页面 + 客户端切换,见第 5 节)。

## 5. 页面与交互

**单页面**:路由 `/`,主表格视图。

### 5.1 布局结构(自上而下)

1. **Header**:站标 "AI Release Log" / 语言切换(ZH/EN)/ 主题切换(亮暗)/ GitHub 仓库链接
2. **Hero**:一行副标题
3. **FilterBar**:
   - 厂商 Pills(多选,显示选中/未选状态,含"全选"/"全不选"快捷)
   - 时段下拉(单选,可选值:`最近 12 个月`(默认) / `最近 6 个月` / `2026 年` / `2025 年` / `2024 年` / ... / `全部`)
4. **ReleaseTable**:稀疏矩阵
   - 第一列:日期(`YYYY-MM-DD`,倒序,只列有发布的日期)
   - 其余列:每个被选中的厂商一列,列头带厂商色条
   - 单元格:当天该厂商如有发布 → 渲染 `ReleaseChip`;无发布 → 留空或显示 `—`
   - 同一厂商同日多条发布:并列多个 chip
5. **ReleaseDetail 抽屉**:点击 chip 触发,显示全部字段 + 跳转官方链接按钮

### 5.2 默认状态

首次加载(无 query):
- 勾选所有主流厂商
- 时段 = 最近 12 个月
- 语言根据 `navigator.language` 判断(以 `zh` 开头 → 中文,否则英文),之后写入 `localStorage`

### 5.3 组件清单

| 组件 | 职责 | 渲染方式 |
|---|---|---|
| `Header` | 静态头部 | 构建期静态 |
| `FilterBar` | 厂商 pills + 年份/时段下拉 | 构建期渲染 + 客户端 JS 交互 |
| `ReleaseTable` | 稀疏表格 | 构建期完整渲染,客户端按筛选隐藏列/行 |
| `ReleaseChip` | 单条发布标签(显示模型名,点击打开详情) | 构建期渲染 |
| `ReleaseDetail` | 详情抽屉(5 字段 + 官方链接) | 构建期渲染为隐藏元素,JS 控制显隐 |

### 5.4 交互细节

- **筛选状态写入 URL query**,如 `?vendors=openai,anthropic&year=2025`,可分享、可刷新、可收藏
- **点击 chip**:打开详情抽屉并将 URL hash 设为 `#<vendor>-<model-slug>-<date>`
- **空列自动隐藏**:若筛选后某厂商无任何发布,不渲染该列
- **空行自动跳过**:按日期分组后,无发布的日期不占行(已由"数据行 = 至少一条发布"约束保证)

### 5.5 响应式

- **桌面(≥768px)**:表格直接显示,列头固定在顶部(`position: sticky`)
- **窄屏(<768px)**:表格水平滚动,日期列固定在左(`position: sticky`)

### 5.6 可访问性

- 使用语义化 `<table><thead><tbody>`
- 详情抽屉用 `<dialog>` 元素或符合 WAI-ARIA 规范的 modal
- 厂商颜色仅作辅助提示,文字标签同时存在,保证色盲用户可用
- 键盘导航:Tab 焦点顺序合理,Esc 关闭抽屉

## 6. URL 方案

| URL | 含义 |
|---|---|
| `/` | 默认视图(最近 12 个月 + 所有主流厂商 + 语言自动检测) |
| `/?lang=zh` 或 `/?lang=en` | 强制指定语言 |
| `/?vendors=openai,anthropic` | 只看这两家 |
| `/?period=2025` | 只看 2025 年 |
| `/?period=last-6m` | 最近 6 个月 |
| `/?period=all` | 全部历史 |
| `/?vendors=openai&period=2025` | 组合筛选 |
| `/#<vendor>-<model-slug>-<date>` | 打开指定发布详情 |

**`period` 参数可选值**:`last-12m`(缺省等价) / `last-6m` / `YYYY`(具体年份) / `all`
**`<model-slug>`**:由 `model` 字段转为小写并将非字母数字字符替换为 `-`,相邻多个 `-` 合并(例:`Claude 3.7 Sonnet` → `claude-3-7-sonnet`)

**设计动机**
- Query 使筛选状态可分享、可刷新
- Hash 使单条发布记录可作为分享链接
- 爬虫抓 `/` 获取全量内容,不存在基于 query 的内容分叉

## 7. 构建、校验、部署

### 7.1 构建流程

```
npm run build
  ↓
读 YAML → 运行校验 → Astro 渲染 → 输出 dist/
```

### 7.2 数据校验规则(构建期执行)

| 规则 | 处理 |
|---|---|
| `date` 非 `YYYY-MM-DD` | 构建失败,提示文件与行号 |
| `date` 在未来超过 90 天 | 构建失败(防手滑) |
| `vendor` 不在 `vendors.yaml` 中 | 构建失败 |
| 同 `(vendor, model, date)` 重复 | 构建失败 |
| 必填字段缺失 | 构建失败 |
| `link` 非 `https://` | 构建警告(不失败) |

实现方式:Astro content collections + Zod schema,结合一个自定义交叉校验脚本。

### 7.3 GitHub Actions

`.github/workflows/deploy.yml`:

- **Push 到 main** → 构建 + 部署到 GitHub Pages(约 1-2 分钟)
- **Pull request** → 仅构建 + 测试,不部署(保护主分支)
- 使用 `actions/deploy-pages` 官方工作流

### 7.4 本地开发

- `npm run dev`:Astro dev server,YAML 热重载
- `npm run build`:本地完整构建(含校验)
- `npm test`:运行 vitest 单元测试

## 8. 测试策略

三层,刻意保持最小。

### 8.1 数据校验(构建期自动)
Zod schema + 自定义规则,由构建流程强制。每次新增数据自动覆盖。

### 8.2 组件单元测试(Vitest)
- `ReleaseTable`:给定固定数据 + 筛选条件,验证行/列结构与空列隐藏
- `FilterBar`:pill 点击后 URL query 正确更新
- 仅测逻辑,不测样式,不测 Astro 渲染层

### 8.3 E2E 冒烟(Playwright,2-3 条)
- 打开首页 → 看到表格与最新发布
- 取消勾选一家厂商 → 该列消失
- 点击一个 chip → 详情抽屉弹出 + URL hash 更新

**不做(明确 YAGNI)**
- 视觉回归测试
- 跨浏览器矩阵(仅测现代 Chromium)
- 性能基准

### 8.4 CI 钩子
- `pull_request`:`npm run build`(含数据校验)+ vitest
- E2E 仅本地跑,避免 CI 过重

## 9. 错误与异常处理

- **数据错误**:由构建期校验兜底,不会让坏数据上线
- **客户端 JS 失败**:表格本身为服务端渲染,即便 JS 全挂,用户仍能看到所有数据(仅失去筛选交互)
- **外部链接 404**:不主动检测(YAGNI);用户反馈后由维护者更新

## 10. 命名与目录改名

- **产品显示名**:`AI Release Log`
- **仓库名**:`ai-release-log`(GitHub 主流小写连字符)
- **本地目录**:实施阶段开始前,从 `F:\web-project\AI-Calendar` 重命名为 `F:\web-project\ai-release-log`。重命名时需先停止 brainstorm 浏览器伴侣服务,并将 CWD 同步切换。

## 11. 未来扩展(不在本次范围内)

- 多模态/图像/音频模型收录
- RSS / Atom 订阅
- 自定义域名
- 更多语言(日、韩、法等;本次仅 zh / en)
- 自动化数据抓取(当前仅手工维护)
- 社区 PR 投稿流程

## 12. 成功标准

- 首次访问可在 2 秒内看到当前表格
- 无 JS 环境下仍能看到全部发布内容(SEO 友好)
- 新增一条发布 = 编辑 `releases.yaml` + 提交 + 自动部署,无其他手工步骤
- 整个站点静态产物 < 500KB(不含字体)
