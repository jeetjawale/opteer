"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Loader2, Import, Upload, XCircle } from "lucide-react";
import { importJob, parseResume, getResumes, getResume, createResume } from "@/lib/api";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ImportModal({ isOpen, onClose, onRefresh }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [manualJd, setManualJd] = useState("");
  const [showManualJd, setShowManualJd] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  
  interface SavedResume {
    id: string;
    name: string;
    preview: string;
    created_at: string;
    updated_at: string;
  }
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [useOneOffResume, setUseOneOffResume] = useState(false);
  const [saveNewResume, setSaveNewResume] = useState(false);
  const [newResumeName, setNewResumeName] = useState("");

  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  
  // Progress Steps: 0 = Idle, 1 = Scraping, 2 = Researching, 3 = Saving, 4 = Success
  const [step, setStep] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await parseResume(formData);
      setResumeText(response.text);
    } catch (err: any) {
      setError(err.message || "Failed to parse resume file.");
    } finally {
      setParsingFile(false);
      e.target.value = ""; // Clear file input
    }
  };

  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const list = await getResumes();
      setSavedResumes(list || []);
      if (list && list.length > 0) {
        setSelectedResumeId(list[0].id);
        setUseOneOffResume(false);
      } else {
        setUseOneOffResume(true);
      }
    } catch (err) {
      console.error("Failed to load saved resumes:", err);
      setUseOneOffResume(true);
    } finally {
      setLoadingResumes(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setResumeText("");
      setManualJd("");
      setShowManualJd(false);
      setError(null);
      setLoading(false);
      setStep(0);
      setCancelled(false);
      setSavedResumes([]);
      setSelectedResumeId("");
      setUseOneOffResume(false);
      setSaveNewResume(false);
      setNewResumeName("");
    } else {
      const savedKey = localStorage.getItem("jobpilot_api_key") || "";
      setUserApiKey(savedKey);
      loadResumes();
    }
  }, [isOpen]);

  // Timed progress step animation during the API import call
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    if (loading && step === 1) {
      t1 = setTimeout(() => {
        setStep(2);
      }, 2500); // Transition to researching after 2.5s
    } else if (loading && step === 2) {
      t2 = setTimeout(() => {
        setStep(3);
      }, 5000); // Transition to saving after another 2.5s (5s total)
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading, step]);

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setCancelled(true);
    setLoading(false);
    setStep(0);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    if (useOneOffResume && !resumeText) return;
    if (!useOneOffResume && !selectedResumeId) return;
    if (showManualJd && !manualJd) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setCancelled(false);
    setError(null);
    setStep(1); // Begin scraping step

    try {
      let finalResumeText = resumeText;
      if (!useOneOffResume && selectedResumeId) {
        // Fetch full content of selected resume before submitting
        const fullResume = await getResume(selectedResumeId);
        finalResumeText = fullResume.content;
      } else if (useOneOffResume && saveNewResume) {
        const nameToSave = newResumeName.trim() || `Resume - ${new Date().toLocaleDateString()}`;
        await createResume({
          name: nameToSave,
          content: resumeText
        });
      }

      await importJob(url, finalResumeText, showManualJd ? manualJd : undefined, userApiKey || undefined);

      if (controller.signal.aborted) return; // User cancelled — don't navigate

      setStep(4); // Success step
      
      // Delay closing slightly to show the completed step checkmarks
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 800);
    } catch (err: any) {
      if (controller.signal.aborted) return; // Silently swallow abort errors
      setError(err.message || "Failed to import job description.");
      setLoading(false);
      setStep(0);
      if (err.message && err.message.toLowerCase().includes("scraping")) {
        setShowManualJd(true);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_25px_50px_-12px_rgba(0,0,0,0.5)] relative">
        
        {/* Close / Cancel Button — always functional */}
        <button 
          onClick={handleCancel} 
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          title={loading ? "Cancel import" : "Close"}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-white text-lg font-bold mb-5 flex items-center space-x-2">
          <Import className="w-5 h-5 text-white" />
          <span>Import a job posting</span>
        </h2>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Input Form */}
        {!loading && step === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="job-url">
                Job URL
              </label>
              <input
                id="job-url"
                type="url"
                required
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                placeholder="https://www.workatastartup.com/jobs/64551"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {showManualJd && (
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 space-y-3">
                <p className="text-xs text-blue-300 font-semibold mb-2">
                  URL scraping failed. Please paste the job description text manually below:
                </p>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="manual-jd">
                    Job Description Text
                  </label>
                  <textarea
                    id="manual-jd"
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none"
                    placeholder="Paste the job description text here..."
                    value={manualJd}
                    onChange={(e) => setManualJd(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  Resume Selection
                </label>
                {savedResumes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseOneOffResume(!useOneOffResume);
                      setError(null);
                    }}
                    className="text-xs font-bold text-[#8B5CF6] hover:text-[#6C3CE1] transition-colors"
                  >
                    {useOneOffResume ? "Use a saved resume" : "Use a different resume"}
                  </button>
                )}
              </div>

              {loadingResumes ? (
                <div className="flex items-center space-x-2 py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#6C3CE1]" />
                  <span>Loading saved resumes...</span>
                </div>
              ) : !useOneOffResume && savedResumes.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 transition-colors text-sm appearance-none cursor-pointer"
                  >
                    {savedResumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name} ({resume.preview.substring(0, 40)}...)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[8px] text-zinc-500">
                    ▼
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Upload (PDF, DOCX, TXT, LaTeX) or paste text:
                    </span>
                    <label className="cursor-pointer text-[11px] bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all font-semibold flex items-center space-x-1.5">
                      <Upload className="w-3 h-3 text-zinc-400" />
                      <span>Upload File</span>
                      <input 
                        type="file" 
                        accept=".pdf,.docx,.doc,.txt,.tex,.latex" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={parsingFile || loading}
                      />
                    </label>
                    {parsingFile && <Loader2 className="w-3.5 h-3.5 text-[#8B5CF6] animate-spin" />}
                  </div>
                  
                  <textarea
                    id="resume"
                    required={useOneOffResume}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none"
                    placeholder={parsingFile ? "Extracting text from your resume file..." : "Paste your professional resume text here or upload a file..."}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    disabled={parsingFile}
                  />

                  {/* Save Checkbox option */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveNewResume}
                        onChange={(e) => setSaveNewResume(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-[#6C3CE1] focus:ring-0 focus:ring-offset-0 focus:outline-none accent-[#6C3CE1]"
                      />
                      <span className="text-zinc-400 text-xs font-semibold">Save this resume for future imports</span>
                    </label>

                    {saveNewResume && (
                      <div className="pl-6.5 animate-fadeIn">
                        <input
                          type="text"
                          required={saveNewResume}
                          placeholder="Resume Profile Name (e.g. SWE - 2025)"
                          value={newResumeName}
                          onChange={(e) => setNewResumeName(e.target.value)}
                          className="w-full max-w-sm px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-750 focus:outline-none focus:border-zinc-700 transition-colors text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-colors"
              >
                Import & Analyze
              </button>
            </div>
          </form>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-4 relative pl-8">
              
              {/* Connecting progress line */}
              <div className="absolute left-[15px] top-6 bottom-16 w-[1px] bg-border-default overflow-hidden">
                <div 
                  className="w-full bg-accent transition-all duration-1000 ease-in-out" 
                  style={{ height: step === 1 ? '30%' : step === 2 ? '60%' : step >= 3 ? '100%' : '0%' }}
                ></div>
              </div>

              {/* Step 1: Scraping */}
              <div className={`flex items-center justify-between p-3 rounded-xl transition-all relative z-10 ${
                step === 1 ? 'bg-elevated border-accent-border shadow-[0_0_0_1px_var(--accent-border)] animate-pulse' :
                step > 1 ? 'bg-surface border-border-default border-l-[3px] border-l-green-500' :
                'bg-surface border-border-default'
              }`}>
                <span className={`text-sm ${step >= 1 ? "text-primary" : "text-muted"}`}>
                  Step 1: Scraping job posting...
                </span>
                {step === 1 && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                {step > 1 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 2: Researching */}
              <div className={`flex items-center justify-between p-3 rounded-xl transition-all relative z-10 ${
                step === 2 ? 'bg-elevated border-accent-border shadow-[0_0_0_1px_var(--accent-border)] animate-pulse' :
                step > 2 ? 'bg-surface border-border-default border-l-[3px] border-l-green-500' :
                'bg-surface border-border-default'
              }`}>
                <span className={`text-sm ${step >= 2 ? "text-primary" : "text-muted"}`}>
                  Step 2: Researching company...
                </span>
                {step === 2 && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                {step > 2 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 3: Saving */}
              <div className={`flex items-center justify-between p-3 rounded-xl transition-all relative z-10 ${
                step === 3 ? 'bg-elevated border-accent-border shadow-[0_0_0_1px_var(--accent-border)] animate-pulse' :
                step > 3 ? 'bg-surface border-border-default border-l-[3px] border-l-green-500' :
                'bg-surface border-border-default'
              }`}>
                <span className={`text-sm ${step >= 3 ? "text-primary" : "text-muted"}`}>
                  Step 3: Saving...
                </span>
                {step === 3 && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                {step > 3 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 4: Success Message */}
              {step === 4 && (
                <div className="text-center text-green-400 font-bold text-sm pt-2 animate-bounce">
                  Import completed successfully!
                </div>
              )}

              {/* Cancel button during loading */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 hover:border-rose-700 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-300 font-semibold text-sm transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Import
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
