import { ModelOption, ModelsConfig } from "./api";

/** Detects provider from API key prefix. Falls back to gemini (server-side key). */
export function getProviderFromKey(apiKey: string | null): string {
  if (!apiKey) return "gemini";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("xai-"))    return "xai";
  if (apiKey.startsWith("sk-"))     return "openai";
  return "gemini";
}

export function getModelsForKey(apiKey: string | null, config: ModelsConfig | null): ModelOption[] {
  if (!config) return [];
  const provider = getProviderFromKey(apiKey);
  return Object.prototype.hasOwnProperty.call(config.provider_models, provider) ? config.provider_models[provider] : (config.provider_models["gemini"] || []);
}

export function getDefaultModelForKey(apiKey: string | null, config: ModelsConfig | null): string {
  if (!config) return "";
  const provider = getProviderFromKey(apiKey);
  return Object.prototype.hasOwnProperty.call(config.provider_defaults, provider) ? config.provider_defaults[provider] : (config.provider_defaults["gemini"] || "");
}

/**
 * Given a provider key (from getProviderFromKey) and a task name,
 * returns the best model for that task based on task_tier_preference.
 * Falls back to the provider default if no match found.
 */
export function getRecommendedModelForTask(
  apiKey: string | null,
  task: "fit" | "letter" | "prep" | "tailor",
  config: ModelsConfig | null
): string {
  if (!config) return "";
  const provider = getProviderFromKey(apiKey);
  const preferredTier = Object.prototype.hasOwnProperty.call(config.task_tier_preference, task) ? config.task_tier_preference[task] : "balanced";
  const models = Object.prototype.hasOwnProperty.call(config.provider_models, provider) ? config.provider_models[provider] : (config.provider_models["gemini"] || []);
  const match = models.find((m) => m.tier === preferredTier);
  return match ? match.value : getDefaultModelForKey(apiKey, config);
}
