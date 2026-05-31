"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Loader2, Import, Upload, XCircle, FilePlus2, Layers } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importJob, parseResume, getResumes, getResume, createResume } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { importTracker } from "@/lib/importTracker";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ImportModal({ isOpen, onClose, onRefresh }: ImportModalProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [url, setUrl] = useState("");
  const router = useRouter();
  const [bulkUrlsText, setBulkUrlsText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [manualJd, setManualJd] = useState("");
  const [showManualJd, setShowManualJd] = useState(false);
  
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  
  // Progress Steps: 0 = Idle, 1 = Scraping, 2 = Researching, 3 = Saving, 4 = Success
  const [step, setStep] = useState(0);

  // Bulk Progress
  const [skippedCount, setSkippedCount] = useState(0);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, successful: 0, failed: 0 });

  // Compute duplicates in real-time for UI
  const rawUrls = bulkUrlsText.split('\n').map(u => u.trim()).filter(u => u);
  const uniqueUrls = Array.from(new Set(rawUrls));
  const currentDuplicates = rawUrls.length - uniqueUrls.length;

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
      setSelectedFile(file);
    } catch (err: any) {
      setError(err.message || "Failed to parse resume file.");
      setSelectedFile(null);
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
      setIsBulkMode(false);
      setUrl("");
      setBulkUrlsText("");
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
      setSelectedFile(null);
      setSkippedCount(0);
      setBulkProgress({ current: 0, total: 0, successful: 0, failed: 0 });
      setAutoAnalyze(true);
    } else {
      loadResumes();
      setAutoAnalyze(!isBulkMode);
    }
  }, [isOpen]);

  // Timed progress step animation during single API import call
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    if (!isBulkMode && loading && step === 1) {
      t1 = setTimeout(() => {
        setStep(2);
      }, 2500);
    } else if (!isBulkMode && loading && step === 2) {
      t2 = setTimeout(() => {
        setStep(3);
      }, 5000);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading, step, isBulkMode]);

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setCancelled(true);
    if (!isBulkMode) {
      setLoading(false);
      setStep(0);
      setError(null);
      onClose();
    } else if (step === 4) {
      onClose(); // Allow closing via X when done
    }
    // If cancelling bulk midway, keep loading true so UI shows "Cancelled" state before user clicks close
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBulkMode && !url) return;
    if (isBulkMode && uniqueUrls.length === 0) return;
    if (useOneOffResume && !resumeText) return;
    if (!useOneOffResume && !selectedResumeId) return;
    if (!isBulkMode && showManualJd && !manualJd) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setCancelled(false);
    setError(null);
    setStep(1);

    try {
      let finalResumeText = resumeText;
      if (!useOneOffResume && selectedResumeId) {
        const fullResume = await getResume(selectedResumeId);
        finalResumeText = fullResume.content;
      } else if (useOneOffResume && saveNewResume) {
        let finalFileUrl = null;
        let finalFileName = null;

        if (selectedFile) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const path = `${user.id}/${crypto.randomUUID()}-${selectedFile.name}`;
              const { error: uploadError } = await supabase.storage.from('resumes').upload(path, selectedFile);
              if (!uploadError) {
                const { data: urlData } = await supabase.storage.from('resumes').createSignedUrl(path, 60 * 60 * 24 * 365);
                if (urlData) {
                  finalFileUrl = urlData.signedUrl;
                  finalFileName = selectedFile.name;
                }
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload file during save", uploadErr);
          }
        }

        const nameToSave = newResumeName.trim() || `Resume - ${new Date().toLocaleDateString()}`;
        await createResume({
          name: nameToSave,
          content: resumeText,
          ...(finalFileUrl && { file_url: finalFileUrl }),
          ...(finalFileName && { file_name: finalFileName })
        });
      }

      const targetUrls = isBulkMode ? uniqueUrls : [url];
      
      importTracker.setCount(targetUrls.length);
      onClose(); // Close modal immediately for background processing

      // Fire and forget background import
      (async () => {
        for (let i = 0; i < targetUrls.length; i++) {
          try {
            await importJob(
              targetUrls[i],
              finalResumeText,
              (!isBulkMode && showManualJd) ? manualJd : undefined,
              !isBulkMode ? autoAnalyze : false  // auto_analyze ON for single if checked, OFF for bulk
            );
          } catch (err: any) {
            toast.error(`Failed to import ${targetUrls[i]}`);
          } finally {
            importTracker.decrementCount();
          }
        }
        // Force refresh table when done
        onRefresh();
      })();

    } catch (err: any) {
      setError(err.message || "Failed to process import.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div data-testid="import-modal" className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_25px_50px_-12px_rgba(0,0,0,0.5)] relative flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          data-testid="close-import-modal-btn"
          onClick={loading && !isBulkMode ? handleCancel : () => { if(abortRef.current) abortRef.current.abort(); onClose(); }} 
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-white text-lg font-bold mb-5 flex items-center space-x-2">
          <Import className="w-5 h-5 text-white" />
          <span>Import a job posting</span>
        </h2>

        {/* Error Notification */}
        {error && !isBulkMode && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Input Form */}
        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Toggle Single / Bulk */}
              <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
                <button
                  type="button"
                  data-testid="single-import-tab"
                  onClick={() => { setIsBulkMode(false); setAutoAnalyze(true); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                    !isBulkMode ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Single Job</span>
                </button>
                <button
                  type="button"
                  data-testid="bulk-import-tab"
                  onClick={() => { setIsBulkMode(true); setAutoAnalyze(false); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                    isBulkMode ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Bulk Import</span>
                </button>
              </div>

              {/* URL Input Area */}
              {!isBulkMode ? (
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
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="job-urls">
                      Job URLs (One per line)
                    </label>
                    {currentDuplicates > 0 && (
                      <span className="text-xs text-amber-400 font-medium">
                        Skipping {currentDuplicates} duplicate{currentDuplicates !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <textarea
                    id="job-urls"
                    data-testid="bulk-textarea"
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none custom-scrollbar"
                    placeholder="https://company.com/job/1&#10;https://company.com/job/2&#10;https://company.com/job/3"
                    value={bulkUrlsText}
                    onChange={(e) => setBulkUrlsText(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">
                    Paste up to 50 URLs. We will import them into your queue sequentially.
                  </p>
                </div>
              )}

              {/* Manual JD Fallback (Single Only) */}
              {!isBulkMode && showManualJd && (
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
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none custom-scrollbar"
                      placeholder="Paste the job description text here..."
                      value={manualJd}
                      onChange={(e) => setManualJd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Resume Selection */}
              <div>
                <div className="flex justify-between items-center mb-2 mt-4">
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
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none custom-scrollbar"
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

              {/* Auto-Analyze checkbox (single mode only) */}
              {!isBulkMode && (
                <label className="flex items-center space-x-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={autoAnalyze}
                    onChange={(e) => setAutoAnalyze(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 focus:ring-0 focus:ring-offset-0 focus:outline-none accent-[#6C3CE1]"
                  />
                  <span className="text-zinc-400 text-xs font-semibold">
                    Auto-analyze after import
                  </span>
                </label>
              )}

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
                  disabled={isBulkMode && uniqueUrls.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && !isBulkMode && autoAnalyze
                    ? "Queueing Analysis..."
                    : isBulkMode
                    ? `Import ${uniqueUrls.length} Job${uniqueUrls.length !== 1 ? "s" : ""}`
                    : autoAnalyze
                    ? "Import & Analyze"
                    : "Import Job"}
                </button>
              </div>
            </form>
          </div>


      </div>
    </div>
  );
}
