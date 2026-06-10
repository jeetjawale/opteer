"use client";

import { useState, useEffect } from "react";
import { Box, Lock, Key, Link as LinkIcon, GitBranch } from "lucide-react";
import { useSettings, useUpdateSettings, useValidateApiKey, useValidateIntegrationKey, useLlmModels } from "@/features/settings/hooks/useSettings";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

const PROVIDERS = [
  { id: "openai", label: "OpenAI (Recommended)", apiLink: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic Claude", apiLink: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", label: "Google Gemini", apiLink: "https://aistudio.google.com/app/apikey" },
  { id: "deepseek", label: "DeepSeek", apiLink: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", label: "OpenRouter", apiLink: "https://openrouter.ai/keys" },
  { id: "ollama", label: "Ollama (Local)", apiLink: "https://ollama.com" },
];

const TASKS = [
  { id: "fit", label: "Fit Scoring Model" },
  { id: "letter", label: "Cover Letter Model" },
  { id: "prep", label: "Interview Prep Model" },
  { id: "tailor", label: "Resume Tailoring Model" },
];

const Toggle = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-[22px] w-[38px] items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
      checked ? "bg-primary" : "bg-surface-variant border border-outline-variant"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-0.5"
      } ${!checked && "bg-outline"}`}
    />
  </button>
);

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  const [activeProvider, setActiveProvider] = useState("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [taskModels, setTaskModels] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [firecrawlKeyInput, setFirecrawlKeyInput] = useState("");
  const [tavilyKeyInput, setTavilyKeyInput] = useState("");

  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [autoDraftLetter, setAutoDraftLetter] = useState(false);
  const [generatePrep, setGeneratePrep] = useState(true);

  const { mutate: validateApiKey, isPending: isValidating } = useValidateApiKey();
  const { mutate: validateIntegrationKey, isPending: isValidatingIntegration } = useValidateIntegrationKey();
  const { data: modelsData } = useLlmModels(activeProvider);

  useEffect(() => {
    if (settings) {
      if (settings.active_llm_provider) {
        setActiveProvider(settings.active_llm_provider);
      }
      if (settings.task_models) {
        setTaskModels(settings.task_models);
      }
      if (settings.auto_analyze_on_import !== undefined) {
        setAutoAnalyze(settings.auto_analyze_on_import);
      }
      if (settings.generate_interview_prep !== undefined) {
        setGeneratePrep(settings.generate_interview_prep);
      }
      if (settings.auto_draft_cover_letters !== undefined) {
        setAutoDraftLetter(settings.auto_draft_cover_letters);
      }
    }
  }, [settings]);

  useEffect(() => {
    if (settings?.llm_providers_configured?.[activeProvider]) {
      setApiKeyInput("••••••••••••••••••••••••••••••••••••");
    } else {
      setApiKeyInput("");
    }
    
    if (settings?.base_urls?.[activeProvider]) {
      setBaseUrlInput(settings.base_urls[activeProvider]!);
    } else {
      setBaseUrlInput("");
    }
  }, [activeProvider, settings]);

  useEffect(() => {
    if (settings?.integration_providers_configured?.["firecrawl"]) {
      setFirecrawlKeyInput("••••••••••••••••••••••••••••••••••••");
    } else {
      setFirecrawlKeyInput("");
    }
    if (settings?.integration_providers_configured?.["tavily"]) {
      setTavilyKeyInput("••••••••••••••••••••••••••••••••••••");
    } else {
      setTavilyKeyInput("");
    }
  }, [settings]);

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider);
    updateSettings({ active_llm_provider: provider });
  };

  const handleSaveCredentials = () => {
    validateApiKey(
      { provider: activeProvider, api_key: apiKeyInput, base_url: baseUrlInput || undefined },
      {
        onSuccess: () => {
          window.location.reload();
        },
        onError: (err: any) => {
          alert(`Failed to save credentials: ${err.message || 'Unknown error'}`);
        }
      }
    );
  };

  const handleSaveIntegration = (provider: string, apiKey: string) => {
    if (!apiKey) {
      // Clear key via updateSettings
      updateSettings({ integration_keys: { [provider]: "" } });
      return;
    }
    validateIntegrationKey(
      { provider, api_key: apiKey },
      {
        onSuccess: (data) => {
          if (!data.valid) {
            alert(`Validation failed: ${data.error}`);
            return;
          }
          // If valid, save it via updateSettings
          updateSettings({ integration_keys: { [provider]: apiKey } });
        },
        onError: (err: any) => {
          alert(`Failed to validate key: ${err.message || 'Unknown error'}`);
        }
      }
    );
  };

  const handleTaskModelChange = (task: string, model: string) => {
    const updatedTaskModels = { ...taskModels, [task]: model };
    setTaskModels(updatedTaskModels);
    updateSettings({ task_models: updatedTaskModels });
  };

  return (
    <main className="flex-1 p-lg w-full flex flex-col">
      {/* Page Header */}
      <PageHeader 
        title="Configuration" 
        subtitle="Manage your secure API keys, automation pipeline preferences, and core account details." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        
        {/* Left Column */}
        <div className="flex flex-col gap-xl">
          
          {/* LLM Configuration Card */}
          <Card className="overflow-hidden p-0">
            <div className="p-md border-b border-outline-variant/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-on-background">
                <Box className="text-primary" size={24} />
                <h3 className="font-headline-sm text-headline-sm">LLM Configuration</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/10 border border-secondary-container/30 text-on-secondary-fixed-variant font-mono-data text-mono-data">
                <Lock size={14} />
                Encrypted Local Storage
              </div>
            </div>
            
            <div className="p-lg flex flex-col gap-lg">
              
              {/* Active Provider */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Active AI Provider</label>
                <select 
                  value={activeProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full bg-surface-variant border border-outline-variant rounded-md px-3 py-2 text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-outline-variant/30 w-full" />

              {/* Provider Credentials */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                  <div>
                    <h4 className="font-body-sm text-body-sm font-semibold text-on-surface mb-0.5">Provider Credentials</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Configure the API key for {PROVIDERS.find(p => p.id === activeProvider)?.label}.</p>
                  </div>
                  {PROVIDERS.find(p => p.id === activeProvider)?.apiLink && (
                    <a 
                      href={PROVIDERS.find(p => p.id === activeProvider)?.apiLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0 mb-[3px]"
                    >
                      Get API Key <LinkIcon size={12} />
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
                      API Key
                    </label>
                    {settings?.llm_providers_configured?.[activeProvider] ? (
                      <span className="inline-flex items-center gap-1 text-secondary font-mono-data text-[11px] px-2 py-0.5 rounded-full bg-secondary-container/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-outline font-mono-data text-[11px] px-2 py-0.5 rounded-full bg-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                        Not Configured
                      </span>
                    )}
                  </div>
                  <div className="relative flex border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <div className="bg-surface-variant px-3 py-2 border-r border-outline-variant flex items-center text-outline-variant">
                      <Key size={18} />
                    </div>
                    <input 
                      type="password" 
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 bg-surface border-none px-3 py-2 font-mono-data text-mono-data text-on-surface focus:ring-0 outline-none" 
                      placeholder={activeProvider === 'ollama' ? "Not required for Ollama" : "sk-..."}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button 
                    onClick={handleSaveCredentials}
                    disabled={isValidating || (settings?.llm_providers_configured?.[activeProvider] && apiKeyInput === "••••••••••••••••••••••••••••••••••••" && baseUrlInput === (settings?.base_urls?.[activeProvider] || ""))}
                    className="px-4 py-2 font-label-md text-label-md font-semibold text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isValidating ? "Validating..." : "Save Credentials"}
                  </button>
                </div>
              </div>

              <div className="h-px bg-outline-variant/30 w-full" />

              {/* Models Configuration */}
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="font-body-sm text-body-sm font-semibold text-on-surface mb-0.5">Model Selection</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Select the default model for {PROVIDERS.find(p => p.id === activeProvider)?.label}.</p>
                </div>
                
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Default Model</label>
                  <select 
                    value={settings?.active_models?.[activeProvider] || ""}
                    onChange={(e) => {
                      const updatedModels = { ...(settings?.active_models || {}), [activeProvider]: e.target.value };
                      updateSettings({ active_models: updatedModels });
                    }}
                    className="w-full bg-surface-variant border border-outline-variant rounded-md px-3 py-2 text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  >
                    <option value="">Provider Default</option>
                    {modelsData?.models?.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name || m.id}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[13px] font-semibold text-primary self-start hover:underline"
                  >
                    {showAdvanced ? "- Hide Advanced Options" : "+ Show Advanced Options"}
                  </button>
                  
                  {showAdvanced && (
                    <div className="flex flex-col gap-4 mt-1">
                      <div className="flex flex-col gap-2">
                        <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
                          Base URL <span className="text-outline text-xs font-normal">(Optional proxy)</span>
                        </label>
                        <div className="relative flex border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                          <div className="bg-surface-variant px-3 py-2 border-r border-outline-variant flex items-center text-outline-variant">
                            <LinkIcon size={18} />
                          </div>
                          <input 
                            type="text" 
                            value={baseUrlInput}
                            onChange={(e) => setBaseUrlInput(e.target.value)}
                            className="flex-1 bg-surface border-none px-3 py-2 font-mono-data text-mono-data text-on-surface focus:ring-0 outline-none" 
                            placeholder={
                              activeProvider === 'ollama' ? "http://localhost:11434" : 
                              activeProvider === 'gemini' ? "https://generativelanguage.googleapis.com/v1beta" :
                              activeProvider === 'anthropic' ? "https://api.anthropic.com" :
                              "https://api.openai.com/v1"
                            }
                          />
                        </div>
                      </div>

                      {/* Task Models (Moved inside Advanced) */}
                      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/30">
                        <div>
                          <h4 className="font-body-sm text-body-sm font-semibold text-on-surface mb-0.5">Task-Specific Models</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Select which model to use for each stage of the analysis pipeline. Uses the default model if not set.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                          {TASKS.map(task => (
                            <div key={task.id}>
                              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">{task.label}</label>
                              <select 
                                value={taskModels[task.id] || ""}
                                onChange={(e) => handleTaskModelChange(task.id, e.target.value)}
                                className="w-full bg-surface-variant border border-outline-variant rounded-md px-3 py-2 text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                              >
                                <option value="">
                                  {settings?.active_models?.[activeProvider] 
                                    ? `Default (${settings.active_models[activeProvider]})` 
                                    : "Provider Default Model"}
                                </option>
                                {modelsData?.models?.map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleSaveCredentials}
                  disabled={isValidating || (settings?.llm_providers_configured?.[activeProvider] && apiKeyInput === "••••••••••••••••••••••••••••••••••••" && baseUrlInput === (settings?.base_urls?.[activeProvider] || ""))}
                  className="px-4 py-2 font-label-md text-label-md font-semibold text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isValidating ? "Validating..." : "Save Credentials"}
                </button>
              </div>

            </div>
          </Card>


        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-xl">
          
          {/* Integration Credentials Card */}
          <Card className="overflow-hidden p-0">
            <div className="p-md border-b border-outline-variant/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-on-background">
                <LinkIcon className="text-primary" size={24} />
                <h3 className="font-headline-sm text-headline-sm">Integrations</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/10 border border-secondary-container/30 text-on-secondary-fixed-variant font-mono-data text-mono-data">
                <Lock size={14} />
                Encrypted Local Storage
              </div>
            </div>
            
            <div className="p-lg flex flex-col gap-lg">
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                  <div>
                    <h4 className="font-body-sm text-body-sm font-semibold text-on-surface mb-0.5">Firecrawl</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Extract clean job descriptions from arbitrary URLs.</p>
                  </div>
                  <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0 mb-[3px]">
                    Get API Key <LinkIcon size={12} />
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="relative flex border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <div className="bg-surface-variant px-3 py-2 border-r border-outline-variant flex items-center text-outline-variant">
                      <Key size={18} />
                    </div>
                    <input 
                      type="password" 
                      value={firecrawlKeyInput}
                      onChange={(e) => setFirecrawlKeyInput(e.target.value)}
                      className="flex-1 bg-surface border-none px-3 py-2 font-mono-data text-mono-data text-on-surface focus:ring-0 outline-none" 
                      placeholder="fc-..."
                    />
                    <button
                      onClick={() => handleSaveIntegration("firecrawl", firecrawlKeyInput)}
                      disabled={isValidatingIntegration || (settings?.integration_providers_configured?.["firecrawl"] && firecrawlKeyInput === "••••••••••••••••••••••••••••••••••••")}
                      className="px-4 py-2 font-label-md text-label-md font-semibold text-primary border-l border-outline-variant hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-outline-variant/30 w-full" />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                  <div>
                    <h4 className="font-body-sm text-body-sm font-semibold text-on-surface mb-0.5">Tavily</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Provide real-time company research during job import.</p>
                  </div>
                  <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0 mb-[3px]">
                    Get API Key <LinkIcon size={12} />
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="relative flex border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <div className="bg-surface-variant px-3 py-2 border-r border-outline-variant flex items-center text-outline-variant">
                      <Key size={18} />
                    </div>
                    <input 
                      type="password" 
                      value={tavilyKeyInput}
                      onChange={(e) => setTavilyKeyInput(e.target.value)}
                      className="flex-1 bg-surface border-none px-3 py-2 font-mono-data text-mono-data text-on-surface focus:ring-0 outline-none" 
                      placeholder="tvly-..."
                    />
                    <button
                      onClick={() => handleSaveIntegration("tavily", tavilyKeyInput)}
                      disabled={isValidatingIntegration || (settings?.integration_providers_configured?.["tavily"] && tavilyKeyInput === "••••••••••••••••••••••••••••••••••••")}
                      className="px-4 py-2 font-label-md text-label-md font-semibold text-primary border-l border-outline-variant hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </Card>

          {/* Pipeline Automations Card */}
          <Card className="overflow-hidden p-0 mb-4">
            <div className="p-md border-b border-outline-variant/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-on-background">
                <GitBranch className="text-primary" size={24} />
                <h3 className="font-headline-sm text-headline-sm">Pipeline Automations</h3>
              </div>
            </div>
            
            <div className="flex flex-col">
              
              {/* Auto-Analyze on Import */}
              <div className="p-lg flex items-center justify-between border-b border-outline-variant/30">
                <div className="pr-4">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1">Auto-Analyze on Import</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Automatically score fit and extract required skills when importing a new job.</p>
                </div>
                <Toggle checked={autoAnalyze} onChange={(v) => { setAutoAnalyze(v); updateSettings({ auto_analyze_on_import: v }); }} />
              </div>

              {/* Generate Interview Prep */}
              <div className="p-lg flex items-center justify-between border-b border-outline-variant/30">
                <div className="pr-4">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1">Generate Interview Prep</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Create tailored interview questions based on the candidate's resume gaps.</p>
                </div>
                <Toggle checked={generatePrep} onChange={(v) => { setGeneratePrep(v); updateSettings({ generate_interview_prep: v }); }} />
              </div>

              {/* Auto-Draft Cover Letters */}
              <div className="p-lg flex items-center justify-between">
                <div className="pr-4">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1 flex items-center gap-2">
                    Auto-Draft Cover Letters
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Generate a custom cover letter immediately during the import analysis phase.</p>
                </div>
                <Toggle checked={autoDraftLetter} onChange={(v) => { setAutoDraftLetter(v); updateSettings({ auto_draft_cover_letters: v }); }} />
              </div>

            </div>
          </Card>
        </div>
      </div>
      
      {/* Footer Version */}
      <div className="mt-auto border-t border-outline-variant h-20 w-full flex items-center justify-center">
        <p className="font-mono-data text-mono-data text-outline-variant text-[11px]">Opteer Core v2.4.1 — All systems nominal.</p>
      </div>
    </main>
  );
}
