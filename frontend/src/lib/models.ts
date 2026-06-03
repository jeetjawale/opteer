export interface ModelOption {
  value: string;
  label: string;
  tier: "fast" | "balanced" | "powerful";
  context?: string; // human-readable context window
}

export const PROVIDER_MODELS: Record<string, ModelOption[]> = {

  // ── Google Gemini ───────────────────────────────────────────────────────────
  gemini: [
    { value: "gemini-3.1-flash-lite",           label: "Gemini 3.1 Flash Lite",           tier: "fast",     context: "1M" },
    { value: "gemini-2.0-flash",                label: "Gemini 2.0 Flash",                tier: "balanced",     context: "1M" },
    { value: "gemini-1.5-pro",                  label: "Gemini 1.5 Pro",                  tier: "powerful", context: "2M" },
    { value: "gemini-1.5-flash",                label: "Gemini 1.5 Flash",                tier: "fast",     context: "1M" },
  ],

  // ── Anthropic ───────────────────────────────────────────────────────────────
  anthropic: [
    { value: "claude-3-5-sonnet-20241022",      label: "Claude 3.5 Sonnet",               tier: "balanced", context: "200K" },
    { value: "claude-3-5-haiku-20241022",       label: "Claude 3.5 Haiku",                tier: "fast",     context: "200K" },
    { value: "claude-3-opus-20240229",          label: "Claude 3 Opus",                   tier: "powerful", context: "200K" },
  ],

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  openai: [
    { value: "gpt-4o",                          label: "GPT-4o",                          tier: "balanced", context: "128K" },
    { value: "gpt-4o-mini",                     label: "GPT-4o Mini",                     tier: "fast",     context: "128K" },
    { value: "o1-preview",                      label: "o1 Preview",                      tier: "powerful", context: "128K" },
    { value: "o1-mini",                         label: "o1 Mini",                         tier: "fast",     context: "128K" },
    { value: "o3-mini",                         label: "o3 Mini",                         tier: "balanced", context: "200K" },
  ],

  // ── xAI Grok ────────────────────────────────────────────────────────────────
  xai: [
    { value: "grok-2-1212",                     label: "Grok 2",                          tier: "balanced", context: "128K" },
  ],

  // ── MiniMax ─────────────────────────────────────────────────────────────────
  minimax: [
    { value: "minimax-text-01",                 label: "MiniMax Text-01",                 tier: "powerful", context: "1M" },
  ],

  // ── Moonshot ────────────────────────────────────────────────────────────────
  moonshot: [
    { value: "moonshot-v1-8k",                  label: "Moonshot v1 8K",                  tier: "fast",     context: "8K" },
    { value: "moonshot-v1-32k",                 label: "Moonshot v1 32K",                 tier: "balanced", context: "32K" },
    { value: "moonshot-v1-128k",                label: "Moonshot v1 128K",                tier: "powerful", context: "128K" },
  ],
};

export const PROVIDER_DEFAULTS: Record<string, string> = {
  gemini:    "gemini-3.1-flash-lite",
  anthropic: "claude-3-5-sonnet-20241022",
  openai:    "gpt-4o-mini",
  xai:       "grok-2-1212",
  minimax:   "minimax-text-01",
  moonshot:  "moonshot-v1-32k",
  local:     "",
};

export const TASK_TIER_PREFERENCE: Record<string, "fast" | "balanced" | "powerful"> = {
  fit:    "fast",
  letter: "powerful",
  prep:   "balanced",
  tailor: "balanced",
};

/**
 * Given a provider key (from getProviderFromKey) and a task name,
 * returns the best model for that task based on TASK_TIER_PREFERENCE.
 * Falls back to the provider default if no match found.
 */
export function getRecommendedModelForTask(
  apiKey: string | null,
  task: "fit" | "letter" | "prep" | "tailor"
): string {
  const provider = getProviderFromKey(apiKey);
  const preferredTier = Object.prototype.hasOwnProperty.call(TASK_TIER_PREFERENCE, task) ? TASK_TIER_PREFERENCE[task] : "balanced";
  const models = Object.prototype.hasOwnProperty.call(PROVIDER_MODELS, provider) ? PROVIDER_MODELS[provider] : PROVIDER_MODELS["gemini"];
  const match = models.find((m) => m.tier === preferredTier);
  return match ? match.value : (Object.prototype.hasOwnProperty.call(PROVIDER_DEFAULTS, provider) ? PROVIDER_DEFAULTS[provider] : PROVIDER_DEFAULTS["gemini"]);
}

/** Detects provider from API key prefix. Falls back to gemini (server-side key). */
export function getProviderFromKey(apiKey: string | null): string {
  if (!apiKey) return "gemini";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("xai-"))    return "xai";
  if (apiKey.startsWith("sk-"))     return "openai";
  return "gemini";
}

export function getModelsForKey(apiKey: string | null): ModelOption[] {
  // If the user's provider isn't strictly detectable from key, we can return all models 
  // or allow them to be merged in the UI. For now, just return based on simple prefix.
  const provider = getProviderFromKey(apiKey);
  return Object.prototype.hasOwnProperty.call(PROVIDER_MODELS, provider) ? PROVIDER_MODELS[provider] : PROVIDER_MODELS["gemini"];
}

export function getDefaultModelForKey(apiKey: string | null): string {
  const provider = getProviderFromKey(apiKey);
  return Object.prototype.hasOwnProperty.call(PROVIDER_DEFAULTS, provider) ? PROVIDER_DEFAULTS[provider] : PROVIDER_DEFAULTS["gemini"];
}
