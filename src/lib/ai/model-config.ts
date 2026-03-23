/**
 * Model Configuration Registry
 *
 * Single source of truth for all AI model capabilities, limits, and costs.
 * All engines MUST read from this registry to ensure consistent behavior.
 */

// ─── Model Capability Interface ──────────────────────────────────────────────────

export interface ModelConfig {
  /** Model identifier for OpenRouter */
  id: string;
  /** Human-readable name */
  name: string;
  /** Provider name */
  provider: "anthropic" | "deepseek" | "google" | "openai";
  /** Maximum input context window in tokens */
  maxInputTokens: number;
  /** Maximum output tokens the model can generate */
  maxOutputTokens: number;
  /** Safe output limit (leaves buffer for response formatting) */
  safeOutputTokens: number;
  /** Approximate cost per 1M input tokens in USD */
  inputCostPer1M: number;
  /** Approximate cost per 1M output tokens in USD */
  outputCostPer1M: number;
  /** Whether this model supports JSON mode */
  supportsJsonMode: boolean;
  /** Whether this model is good for creative writing */
  goodForCreative: boolean;
  /** Whether this model is good for structured/JSON tasks */
  goodForStructured: boolean;
}

// ─── Model Registry ──────────────────────────────────────────────────────────────

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ─── DeepSeek V3 ───────────────────────────────────────────────────────────────
  "deepseek/deepseek-chat": {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "deepseek",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    safeOutputTokens: 7500,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    supportsJsonMode: true,
    goodForCreative: true,
    goodForStructured: true,
  },

  // ─── Claude 3.5 Haiku ──────────────────────────────────────────────────────────
  "anthropic/claude-3.5-haiku-20241022": {
    id: "anthropic/claude-3.5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    safeOutputTokens: 7500,
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    supportsJsonMode: false,
    goodForCreative: true,
    goodForStructured: true,
  },

  // ─── Claude 3.5 Sonnet ─────────────────────────────────────────────────────────
  "anthropic/claude-3.5-sonnet-20241022": {
    id: "anthropic/claude-3.5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    safeOutputTokens: 7500,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    supportsJsonMode: false,
    goodForCreative: true,
    goodForStructured: true,
  },

  // ─── Gemini Flash 1.5 ──────────────────────────────────────────────────────────
  "google/gemini-flash-1.5": {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "google",
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    safeOutputTokens: 7500,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    supportsJsonMode: true,
    goodForCreative: false,
    goodForStructured: true,
  },
};

// ─── Model Role Assignments ──────────────────────────────────────────────────────

export const MODEL_ROLES = {
  /** Fast tasks: titles, outlines, FAQ, meta - needs reliable JSON */
  FAST: "deepseek/deepseek-chat",

  /** Free plan article generation */
  FREE_ARTICLE: "deepseek/deepseek-chat",

  /** Starter plan article generation */
  STARTER_ARTICLE: "anthropic/claude-3.5-haiku-20241022",

  /** Pro/Enterprise article generation */
  PRO_ARTICLE: "anthropic/claude-3.5-sonnet-20241022",

  /** Humanizer pass - DeepSeek excels at natural writing */
  HUMANIZER: "deepseek/deepseek-chat",
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────────

/**
 * Get model configuration by ID
 * @throws Error if model not found in registry
 */
export function getModelConfig(modelId: string): ModelConfig {
  const config = MODEL_REGISTRY[modelId];
  if (!config) {
    throw new Error(`Model "${modelId}" not found in registry. Available models: ${Object.keys(MODEL_REGISTRY).join(", ")}`);
  }
  return config;
}

/**
 * Get safe output token limit for a model
 * Use this instead of hardcoding token limits
 */
export function getSafeOutputTokens(modelId: string): number {
  return getModelConfig(modelId).safeOutputTokens;
}

/**
 * Get max output tokens for a model
 */
export function getMaxOutputTokens(modelId: string): number {
  return getModelConfig(modelId).maxOutputTokens;
}

/**
 * Calculate token budget for a given word count
 * Uses 1.5 tokens per word as estimate, capped at model's safe limit
 */
export function calculateTokenBudget(modelId: string, targetWords: number): number {
  const safeLimit = getSafeOutputTokens(modelId);
  const estimated = Math.ceil(targetWords * 1.5);
  return Math.min(estimated, safeLimit);
}

/**
 * Check if an article should use chunked generation
 * Returns true if target words would exceed safe token limit
 */
export function shouldUseChunkedGeneration(modelId: string, targetWords: number): boolean {
  const safeLimit = getSafeOutputTokens(modelId);
  const estimated = Math.ceil(targetWords * 1.5);
  // Use chunked if we'd need more than 80% of safe limit
  return estimated > safeLimit * 0.8;
}

/**
 * Get optimal chunk size for section-by-section generation
 */
export function getOptimalChunkWords(modelId: string): number {
  const safeLimit = getSafeOutputTokens(modelId);
  // Each chunk should use about 60% of safe limit for safety margin
  return Math.floor((safeLimit * 0.6) / 1.5);
}

/**
 * Estimate cost for a generation task
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const config = getModelConfig(modelId);
  const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Get model for a specific plan
 */
export function getModelForPlan(planName?: string): string {
  const plan = planName?.toLowerCase() || "free";

  if (plan === "enterprise" || plan === "pro") {
    return MODEL_ROLES.PRO_ARTICLE;
  } else if (plan === "starter") {
    return MODEL_ROLES.STARTER_ARTICLE;
  } else {
    return MODEL_ROLES.FREE_ARTICLE;
  }
}

// ─── Startup Validation ──────────────────────────────────────────────────────────

/**
 * Validate model configuration at startup
 * Call this in your app initialization to catch config errors early
 */
export function validateModelConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all role assignments point to valid models
  for (const [role, modelId] of Object.entries(MODEL_ROLES)) {
    if (!MODEL_REGISTRY[modelId]) {
      errors.push(`Role "${role}" references unknown model "${modelId}"`);
    }
  }

  // Check all models have valid limits
  for (const [modelId, config] of Object.entries(MODEL_REGISTRY)) {
    if (config.safeOutputTokens >= config.maxOutputTokens) {
      errors.push(`Model "${modelId}": safeOutputTokens (${config.safeOutputTokens}) should be less than maxOutputTokens (${config.maxOutputTokens})`);
    }
    if (config.maxOutputTokens <= 0) {
      errors.push(`Model "${modelId}": maxOutputTokens must be positive`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Model configuration validation failed:", errors);
  } else {
    console.log("✅ Model configuration validated successfully");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Auto-validate on import (development only) ──────────────────────────────────
if (process.env.NODE_ENV === "development") {
  validateModelConfig();
}
