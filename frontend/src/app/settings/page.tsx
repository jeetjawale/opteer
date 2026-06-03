"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Cpu, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { testLlmConnection, getUserSettings, updateUserSettings, getApiKeyStatus, updateApiKey } from "@/lib/api";
import { 
  PROVIDER_MODELS, 
  getProviderFromKey, 
  getRecommendedModelForTask,
  PROVIDER_DEFAULTS
} from "@/lib/models";

export default function SettingsPage() {
  const [userApiKey, setUserApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSavedKey, setIsSavedKey] = useState(false);
  
  // Model configuration states
  const [modelDefault, setModelDefault] = useState("");
  const [modelFit, setModelFit] = useState("");
  const [modelLetter, setModelLetter] = useState("");
  const [modelPrep, setModelPrep] = useState("");
  const [modelTailor, setModelTailor] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Test connection states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error"; message: string }>({
    status: "idle",
    message: ""
  });
  
  // Save notification states
  const [saveSuccess, setSaveSuccess] = useState(false);


  useEffect(() => {
    getApiKeyStatus().then(data => {
      if (data && data.has_saved_key) {
        setIsSavedKey(true);
        setUserApiKey("••••••••••••••••"); // visual placeholder
      }
    }).catch(err => console.error("Failed to fetch API key status", err));
    
    getUserSettings().then(data => {
      if (data) {
        setModelDefault(data.model_default || "");
        setModelFit(data.model_fit || "");
        setModelLetter(data.model_letter || "");
        setModelPrep(data.model_prep || "");
        setModelTailor(data.model_tailor || "");
      }
    }).catch(err => {
      console.error("Failed to fetch user settings", err);
    }).finally(() => {
      setLoadingSettings(false);
    });
  }, []);

  const handleKeyChange = (val: string) => {
    const oldProvider = getProviderFromKey(userApiKey);
    const newProvider = getProviderFromKey(val);
    
    setUserApiKey(val);
    
    // If the user starts typing, it's no longer the saved placeholder
    if (val !== "••••••••••••••••") {
      setIsSavedKey(false);
    }
    
    if (newProvider !== oldProvider) {
      const providerDefault = PROVIDER_DEFAULTS[newProvider] || PROVIDER_DEFAULTS["gemini"];
      setModelDefault(providerDefault);
      setModelFit(getRecommendedModelForTask(val, "fit"));
      setModelLetter(getRecommendedModelForTask(val, "letter"));
      setModelPrep(getRecommendedModelForTask(val, "prep"));
      setModelTailor(getRecommendedModelForTask(val, "tailor"));
    }
    
    // Reset test/save states on change
    setTestResult({ status: "idle", message: "" });
    setSaveSuccess(false);
  };

  const handleClearKey = async () => {
    setUserApiKey("");
    setIsSavedKey(false);
    setTestResult({ status: "idle", message: "" });
    try {
      await updateApiKey("");
    } catch (e) {}
    
    // Switch to Gemini defaults on clear
    setModelDefault(PROVIDER_DEFAULTS["gemini"]);
    setModelFit(getRecommendedModelForTask(null, "fit"));
    setModelLetter(getRecommendedModelForTask(null, "letter"));
    setModelPrep(getRecommendedModelForTask(null, "prep"));
    setModelTailor(getRecommendedModelForTask(null, "tailor"));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (userApiKey.trim() !== "••••••••••••••••") {
        const detectedProvider = getProviderFromKey(userApiKey.trim());
        await updateApiKey(userApiKey.trim(), detectedProvider);
        setIsSavedKey(!!userApiKey.trim());
        if (userApiKey.trim()) {
           setUserApiKey("••••••••••••••••");
        }
      }
      
      await updateUserSettings({
        model_default: modelDefault || undefined,
        model_fit: modelFit || undefined,
        model_letter: modelLetter || undefined,
        model_prep: modelPrep || undefined,
        model_tailor: modelTailor || undefined
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  const handleTestConnection = async () => {
    if (!userApiKey.trim()) {
      setTestResult({
        status: "error",
        message: "Please enter an API Key before testing connection."
      });
      return;
    }

    setTesting(true);
    setTestResult({ status: "idle", message: "" });
    
    try {
      const res = await testLlmConnection(userApiKey.trim());
      if (res.status === "ok") {
        setTestResult({
          status: "success",
          message: `Connection successful! Provider detected: ${res.provider}`
        });
      } else {
        setTestResult({
          status: "error",
          message: `Connection failed: ${res.detail || "Unknown error occurred"}`
        });
      }
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: `Connection failed: ${err.message || "Failed to make test request"}`
      });
    } finally {
      setTesting(false);
    }
  };

  const detected = getProviderFromKey(userApiKey);
  const detectedDisplay = detected.charAt(0).toUpperCase() + detected.slice(1);
  const detectedLower = detected.toLowerCase();
  const availableModels = PROVIDER_MODELS[detectedLower] || PROVIDER_MODELS["gemini"];
  
  const recommendedFit = getRecommendedModelForTask(userApiKey, "fit");
  const recommendedLetter = getRecommendedModelForTask(userApiKey, "letter");
  const recommendedPrep = getRecommendedModelForTask(userApiKey, "prep");
  const recommendedTailor = getRecommendedModelForTask(userApiKey, "tailor");

  const handleDefaultModelChange = (val: string) => {
    setModelDefault(val);
    setModelFit(val);
    setModelLetter(val);
    setModelPrep(val);
    setModelTailor(val);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen reveal">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default pb-5 mb-8 reveal-1">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center space-x-2.5">
            <SettingsIcon className="w-6 h-6 text-accent" />
            <span>Settings</span>
          </h1>
          <p className="text-muted text-sm mt-1">Configure your personal preferences and dynamic API keys.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Settings Card */}
        <div className="lg:col-span-2 space-y-6 reveal-2">
          <form onSubmit={handleSave} className="bg-surface border border-border-default rounded-2xl p-6 shadow-xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h2 className="text-primary text-md font-semibold flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-accent" />
                <span>AI Provider Configuration</span>
              </h2>
              {isSavedKey && (
                <span className="text-xs text-green-400 font-semibold flex items-center space-x-1">
                  <span>•</span>
                  <span>Active Saved Key</span>
                </span>
              )}
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="settings-api-key">
                  API Key
                </label>
                {userApiKey && (
                  <span className="text-[10px] bg-green-950/80 text-green-300 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold transition-all">
                    {detectedDisplay} detected
                  </span>
                )}
              </div>
              
              <div className="relative flex items-center">
                <input
                  id="settings-api-key"
                  type={showKey ? "text" : "password"}
                  className="w-full pl-4 pr-16 py-3 rounded-xl bg-elevated border border-border-default text-primary placeholder-muted focus:outline-none focus:border-border-strong transition-colors text-sm"
                  placeholder="sk-ant-... or sk-... or gsk_... or AIza..."
                  value={userApiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                />
                <div className="absolute right-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-secondary hover:text-primary transition-colors focus:outline-none"
                    title={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {userApiKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="text-secondary hover:text-primary transition-colors focus:outline-none font-bold text-lg px-1 select-none"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted">
                Pasting a custom API key configures JobPilot to execute your personal analysis pipelines using the detected provider. 
                The key is saved securely encrypted in your backend database, and will never be exposed in the frontend.
              </p>
            </div>
            
            {/* Model Selections */}
            {!loadingSettings && (
              <div className="space-y-4 pt-2">
                <h3 className="text-primary text-sm font-semibold border-b border-border-subtle pb-2">Task Model Preferences</h3>
                
                {/* Default Model */}
                <div className="bg-surface border border-border-default p-4 rounded-xl ring-1 ring-white/5 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start md:items-center">
                    <div>
                      <label className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-1">
                        Default Model (Global)
                      </label>
                      <p className="text-[10px] text-muted leading-tight pr-4">
                        Used as the primary fallback for all background tasks, imports, and analysis tasks unless individually overridden below.
                      </p>
                    </div>
                    <select 
                      value={modelDefault} 
                      onChange={(e) => handleDefaultModelChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-elevated border border-border-default text-primary text-sm focus:outline-none focus:border-border-strong"
                    >
                      {availableModels.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="text-secondary text-xs font-semibold uppercase tracking-wider">Fit Scoring Model</label>
                  <select 
                    value={modelFit} 
                    onChange={(e) => setModelFit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-elevated border border-border-default text-primary text-sm focus:outline-none focus:border-border-strong"
                  >
                    {availableModels.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}{m.value === recommendedFit ? " (Recommended)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="text-secondary text-xs font-semibold uppercase tracking-wider">Cover Letter Model</label>
                  <select 
                    value={modelLetter} 
                    onChange={(e) => setModelLetter(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-elevated border border-border-default text-primary text-sm focus:outline-none focus:border-border-strong"
                  >
                    {availableModels.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}{m.value === recommendedLetter ? " (Recommended)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="text-secondary text-xs font-semibold uppercase tracking-wider">Interview Prep Model</label>
                  <select 
                    value={modelPrep} 
                    onChange={(e) => setModelPrep(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-elevated border border-border-default text-primary text-sm focus:outline-none focus:border-border-strong"
                  >
                    {availableModels.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}{m.value === recommendedPrep ? " (Recommended)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="text-secondary text-xs font-semibold uppercase tracking-wider">Resume Tailoring Model</label>
                  <select 
                    value={modelTailor} 
                    onChange={(e) => setModelTailor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-elevated border border-border-default text-primary text-sm focus:outline-none focus:border-border-strong"
                  >
                    {availableModels.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}{m.value === recommendedTailor ? " (Recommended)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Test Connection Display */}
            {testResult.status !== "idle" && (
              <div className={`p-4 rounded-xl border text-sm flex items-start space-x-2.5 ${
                testResult.status === "success" 
                  ? "bg-green-950/20 border-green-800/40 text-green-300" 
                  : "bg-red-950/20 border-red-800/40 text-red-300"
              }`}>
                {testResult.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-border-subtle pt-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !userApiKey}
                className="px-4 py-2 rounded-xl bg-elevated hover:bg-border-default border border-border-default disabled:opacity-50 text-primary font-semibold text-xs transition-colors flex items-center space-x-1.5"
              >
                {testing && <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />}
                <span>Test Connection</span>
              </button>

              <div className="flex items-center space-x-3">
                {saveSuccess && (
                  <span className="text-green-400 text-xs font-semibold animate-pulse">
                    Settings updated!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-white text-zinc-900 font-bold text-xs transition-colors flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Model Reference Card */}
        <div className="space-y-6 reveal-3">
          <div className="bg-surface border border-border-default rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-primary text-sm font-semibold uppercase tracking-wider border-b border-border-subtle pb-3">
              Model Overrides
            </h3>
            <p className="text-muted text-xs leading-relaxed">
              When an API key is active, you can customize which models handle each specific analysis task.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              For optimal results, use the recommended model. <strong>Smarter</strong> models yield better reasoning but take longer. <strong>Faster</strong> models return results instantly but might lack nuance.
            </p>
            <div className="pt-2">
              <div className="flex flex-col p-3 rounded-xl bg-elevated border border-border-default space-y-1">
                <span className="text-secondary text-xs font-bold">Detected Provider</span>
                <span className="text-primary font-mono text-[13px]">{detectedDisplay}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
