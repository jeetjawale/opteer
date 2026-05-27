export interface ModelOption {
  value: string;
  label: string;
  tier: "fast" | "balanced" | "powerful" | string;
}

export const PROVIDER_MODELS: Record<string, ModelOption[]> = {

  gemini: [
    { value: "gemini-2.5-flash",      label: "Gemini 2.5 Flash", tier: "fast" },
    { value: "gemini-2.5-pro",        label: "Gemini 2.5 Pro",   tier: "powerful" },
    { value: "gemini-1.5-flash",      label: "Gemini 1.5 Flash", tier: "fast" },
  ],

  anthropic: [
    { value: "claude-sonnet-4-5",          label: "Claude Sonnet 4.5", tier: "balanced" },
    { value: "claude-haiku-4-5-20251001",  label: "Claude Haiku",      tier: "fast" },
  ],

  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "fast" },
    { value: "gpt-4o",      label: "GPT-4o",      tier: "powerful" },
  ],

  xai: [
    { value: "grok-3",      label: "Grok 3 (recommended)", tier: "balanced" },
    { value: "grok-3-mini", label: "Grok 3 Mini (fast)",   tier: "fast" },
  ],

};

export const PROVIDER_DEFAULTS: Record<string, string> = {
  gemini:    "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-5",
  openai:    "gpt-4o-mini",
  xai:       "grok-3",
  local:     "",
};

export const TASK_TIER_PREFERENCE: Record<string, "fast" | "balanced" | "powerful"> = {
  fit:    "fast",
  letter: "powerful",
  prep:   "balanced",
};

export function getProviderFromKey(apiKey: string | null): string {
  if (!apiKey) return "gemini";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("sk-"))     return "openai";
  if (apiKey.startsWith("xai-"))    return "xai";      // ← xAI key prefix
  return "gemini";
}

export function getModelsForKey(apiKey: string | null): ModelOption[] {
  const provider = getProviderFromKey(apiKey);
  return PROVIDER_MODELS[provider] || PROVIDER_MODELS["gemini"];
}

export function getDefaultModelForKey(apiKey: string | null): string {
  const provider = getProviderFromKey(apiKey);
  return PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS["gemini"];
}
