export interface ModelOption {
  value: string;
  label: string;
  tier: "fast" | "balanced" | "powerful";
  context?: string; // human-readable context window
}

export const PROVIDER_MODELS: Record<string, ModelOption[]> = {

  // ── Google Gemini ───────────────────────────────────────────────────────────
  gemini: [
    { value: "gemini-2.5-flash",                label: "Gemini 2.5 Flash",                tier: "fast",     context: "1M" },
    { value: "gemini-2.5-pro",                  label: "Gemini 2.5 Pro",                  tier: "powerful", context: "1M" },
    { value: "gemini-2.0-flash",                label: "Gemini 2.0 Flash",                tier: "fast",     context: "1M" },
    { value: "gemini-3-flash-preview",          label: "Gemini 3 Flash",                  tier: "fast",     context: "1M" },
    { value: "gemini-3-1-pro-preview",          label: "Gemini 3.1 Pro",                  tier: "powerful", context: "1M" },
    { value: "gemini-3.1-flash-lite",           label: "Gemini 3.1 Flash Lite",           tier: "fast",     context: "1M" },
    { value: "gemini-3-5-flash",                label: "Gemini 3.5 Flash",                tier: "fast",     context: "1M" },
    { value: "gemma-3-12b-it",                  label: "Gemma 3 (12B)",                   tier: "fast",     context: "128K" },
    { value: "gemma-3-27b-it",                  label: "Gemma 3 (27B)",                   tier: "balanced", context: "128K" },
    { value: "gemma-4-31b-it",                  label: "Gemma 4 (31B)",                   tier: "balanced", context: "262K" },
  ],

  // ── Anthropic ───────────────────────────────────────────────────────────────
  anthropic: [
    { value: "claude-opus-4-7",                 label: "Claude Opus 4.7",                 tier: "powerful", context: "1M"  },
    { value: "claude-sonnet-4-6-20260218",      label: "Claude Sonnet 4.6",               tier: "balanced", context: "200K" },
    { value: "claude-opus-4-6",                 label: "Claude Opus 4.6",                 tier: "powerful", context: "200K" },
    { value: "claude-sonnet-4-5",               label: "Claude Sonnet 4.5",               tier: "balanced", context: "200K" },
    { value: "claude-opus-4-5",                 label: "Claude Opus 4.5",                 tier: "powerful", context: "200K" },
    { value: "claude-haiku-4-5-20251001",       label: "Claude Haiku 4.5",                tier: "fast",     context: "200K" },
    { value: "claude-4-opus",                   label: "Claude 4 Opus",                   tier: "powerful", context: "200K" },
  ],

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  openai: [
    { value: "gpt-5-4-pro",                     label: "GPT-5.4 Pro",                     tier: "powerful", context: "1M" },
    { value: "gpt-5-5",                         label: "GPT-5.5",                         tier: "powerful", context: "1M" },
    { value: "gpt-5-2025-08-07",                label: "GPT-5",                           tier: "powerful", context: "400K" },
    { value: "gpt-4.1-2025-04-14",              label: "GPT-4.1",                         tier: "balanced", context: "1M" },
    { value: "gpt-4.1-mini-2025-04-14",         label: "GPT-4.1 Mini",                    tier: "fast",     context: "1M" },
    { value: "o3-2025-04-16",                   label: "o3",                              tier: "powerful", context: "200K" },
    { value: "o4-mini-2025-04-16",              label: "o4-mini",                         tier: "balanced", context: "200K" },
    { value: "gpt-4o",                          label: "GPT-4o",                          tier: "balanced", context: "128K" },
    { value: "gpt-4o-mini",                     label: "GPT-4o Mini",                     tier: "fast",     context: "128K" },
  ],

  // ── xAI Grok ────────────────────────────────────────────────────────────────
  xai: [
    { value: "grok-4-1-fast-reasoning",         label: "Grok 4.1 Fast Reasoning",         tier: "powerful", context: "2M" },
    { value: "grok-4-fast-reasoning",           label: "Grok 4 Fast Reasoning",           tier: "powerful", context: "2M" },
    { value: "grok-4-07-09",                    label: "Grok 4",                          tier: "balanced", context: "256K" },
    { value: "grok-3-beta",                     label: "Grok 3",                          tier: "balanced", context: "131K" },
    { value: "grok-3-mini-beta",                label: "Grok 3 Mini",                     tier: "fast",     context: "131K" },
  ],

  // ── MiniMax ─────────────────────────────────────────────────────────────────
  minimax: [
    { value: "minimax/m2-7-highspeed",          label: "MiniMax M2.7 Highspeed",          tier: "fast",     context: "204K" },
    { value: "minimax/m2-7-20260402",           label: "MiniMax M2.7",                    tier: "balanced", context: "204K" },
    { value: "minimax/m2-5-highspeed-20260218", label: "MiniMax M2.5 Highspeed",          tier: "fast",     context: "204K" },
    { value: "minimax/m2-5-20260218",           label: "MiniMax M2.5",                    tier: "balanced", context: "204K" },
    { value: "minimax/m2-1-highspeed",          label: "MiniMax M2.1 Highspeed",          tier: "fast",     context: "204K" },
    { value: "minimax/m2-1",                    label: "MiniMax M2.1",                    tier: "balanced", context: "204K" },
    { value: "minimax/m2",                      label: "MiniMax M2",                      tier: "balanced", context: "200K" },
    { value: "minimax/m1",                      label: "MiniMax M1",                      tier: "balanced", context: "1M" },
    { value: "MiniMax-Text-01",                 label: "MiniMax Text-01",                 tier: "powerful", context: "1M" },
  ],

  // ── Moonshot ────────────────────────────────────────────────────────────────
  moonshot: [
    { value: "moonshot/kimi-k2-6",              label: "Kimi K2.6",                       tier: "powerful", context: "256K" },
    { value: "moonshot/kimi-k2-5",              label: "Kimi K2.5",                       tier: "balanced", context: "262K" },
    { value: "moonshot/kimi-k2-0905-preview",   label: "Kimi K2 Preview 0905",            tier: "balanced", context: "256K" },
    { value: "moonshot/kimi-k2-preview",        label: "Kimi K2 Preview",                 tier: "fast",     context: "131K" },
  ],
};

export const PROVIDER_DEFAULTS: Record<string, string> = {
  gemini:    "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-5",
  openai:    "gpt-4o-mini",
  xai:       "grok-3-beta",
  minimax:   "minimax/m2-7-highspeed",
  moonshot:  "moonshot/kimi-k2-6",
  local:     "",
};

export const TASK_TIER_PREFERENCE: Record<string, "fast" | "balanced" | "powerful"> = {
  fit:    "fast",
  letter: "powerful",
  prep:   "balanced",
};

/**
 * Given a provider key (from getProviderFromKey) and a task name,
 * returns the best model for that task based on TASK_TIER_PREFERENCE.
 * Falls back to the provider default if no match found.
 */
export function getRecommendedModelForTask(
  apiKey: string | null,
  task: "fit" | "letter" | "prep"
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
