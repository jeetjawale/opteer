"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Cpu, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { testLlmConnection } from "@/lib/api";

export default function SettingsPage() {
  const [userApiKey, setUserApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSavedKey, setIsSavedKey] = useState(false);
  
  // Test connection states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error"; message: string }>({
    status: "idle",
    message: ""
  });
  
  // Save notification states
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getDetectedProvider = (key: string): string => {
    if (!key) return "";
    if (key.startsWith("sk-ant-")) return "Anthropic";
    if (key.startsWith("sk-")) return "OpenAI";
    if (key.startsWith("gsk_")) return "Groq";
    return "Gemini";
  };

  useEffect(() => {
    const savedKey = localStorage.getItem("jobpilot_api_key") || "";
    setUserApiKey(savedKey);
    setIsSavedKey(!!savedKey);
  }, []);

  const handleKeyChange = (val: string) => {
    setUserApiKey(val);
    const savedKey = localStorage.getItem("jobpilot_api_key") || "";
    setIsSavedKey(val === savedKey && !!val);
    // Reset test/save states on change
    setTestResult({ status: "idle", message: "" });
    setSaveSuccess(false);
  };

  const handleClearKey = () => {
    setUserApiKey("");
    setIsSavedKey(false);
    localStorage.removeItem("jobpilot_api_key");
    setTestResult({ status: "idle", message: "" });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (userApiKey.trim()) {
      localStorage.setItem("jobpilot_api_key", userApiKey.trim());
      setIsSavedKey(true);
    } else {
      localStorage.removeItem("jobpilot_api_key");
      setIsSavedKey(false);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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

  const detected = getDetectedProvider(userApiKey);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <SettingsIcon className="w-6 h-6 text-white" />
            <span>Settings</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Configure your personal preferences and dynamic API keys.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Settings Card */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-4">
              <h2 className="text-white text-md font-semibold flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-white" />
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
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider" htmlFor="settings-api-key">
                  API Key
                </label>
                {userApiKey && (
                  <span className="text-[10px] bg-green-950/80 text-green-300 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold transition-all">
                    {detected} detected
                  </span>
                )}
              </div>
              
              <div className="relative flex items-center">
                <input
                  id="settings-api-key"
                  type={showKey ? "text" : "password"}
                  className="w-full pl-4 pr-16 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                  placeholder="sk-ant-... or sk-... or gsk_... or AIza..."
                  value={userApiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                />
                <div className="absolute right-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-zinc-500 hover:text-white transition-colors focus:outline-none"
                    title={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {userApiKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="text-zinc-500 hover:text-white transition-colors focus:outline-none font-bold text-lg px-1 select-none"
                      title="Clear key"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                Pasting a custom API key configures JobPilot to execute your personal analysis pipelines using the detected provider. 
                The key is saved locally in your browser and sent only for your runs, securely clearing from database caches once finished.
              </p>
            </div>

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
            <div className="flex items-center justify-between border-t border-zinc-800/40 pt-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !userApiKey}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5"
              >
                {testing && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
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
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Model Reference Card */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider border-b border-zinc-800/40 pb-3">
              Supported Providers & Models
            </h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              When a user-provided API key is used, the system automatically routes all LLM chains (fit scoring, cover letter, and interview prep) to these optimized models:
            </p>

            <div className="space-y-3 pt-2">
              
              {/* Anthropic */}
              <div className="flex flex-col p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-400 text-xs font-bold">Anthropic</span>
                <span className="text-zinc-300 font-mono text-[11px] mt-0.5">claude-sonnet-4-5</span>
              </div>

              {/* OpenAI */}
              <div className="flex flex-col p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-400 text-xs font-bold">OpenAI</span>
                <span className="text-zinc-300 font-mono text-[11px] mt-0.5">gpt-4o-mini</span>
              </div>

              {/* Groq */}
              <div className="flex flex-col p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-400 text-xs font-bold">Groq</span>
                <span className="text-zinc-300 font-mono text-[11px] mt-0.5">llama-3.3-70b-versatile</span>
              </div>

              {/* Gemini */}
              <div className="flex flex-col p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-400 text-xs font-bold">Gemini (Default)</span>
                <span className="text-zinc-300 font-mono text-[11px] mt-0.5">gemini-2.5-flash</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
