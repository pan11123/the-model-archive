export const extractionJsonSchema = {
  type: 'object',
  properties: {
    isRelease: { type: 'boolean', description: 'Whether this article announces a new model release' },
    confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence score 0-1' },
    model: { type: ['string', 'null'], description: 'Model name, e.g. "Claude 4.7 Sonnet". Null if not a release.' },
    releaseDate: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD. Null if not determinable.' },
    descriptionZh: { type: 'string', description: 'Chinese description, <= 50 chars. Empty string if not a release.' },
    descriptionEn: { type: 'string', description: 'English description, <= 25 words. Empty string if not a release.' },
    reasoning: { type: 'string', description: 'Explanation of the判断 (not stored in YAML, shown in PR body)' },
  },
  required: ['isRelease', 'confidence', 'model', 'releaseDate', 'descriptionZh', 'descriptionEn', 'reasoning'],
  additionalProperties: false,
} as const;
