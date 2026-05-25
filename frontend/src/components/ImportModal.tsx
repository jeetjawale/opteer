"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2, Import, Upload } from "lucide-react";
import { importJob, parseResume } from "@/lib/api";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ImportModal({ isOpen, onClose, onRefresh }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setResumeText("");
      setError(null);
      setLoading(false);
      setStep(0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !resumeText) return;

    setLoading(true);
    setError(null);
    setStep(1); // Begin scraping step

    try {
      await importJob(url, resumeText);
      setStep(4); // Success step
      
      // Delay closing slightly to show the completed step checkmarks
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to import job description.");
      setLoading(false);
      setStep(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider" htmlFor="resume">
                  Resume Text
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-zinc-500 font-medium">Or upload (PDF, DOCX, TXT, LaTeX):</span>
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
                  {parsingFile && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                </div>
              </div>
              <textarea
                id="resume"
                required
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none"
                placeholder={parsingFile ? "Extracting text from your resume file..." : "Paste your professional resume text here or upload a file..."}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                disabled={parsingFile}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
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
          /* Stepped Loader Sequence */
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              
              {/* Step 1: Scraping */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                <span className={`text-sm ${step >= 1 ? "text-white" : "text-zinc-600"}`}>
                  Step 1: Scraping job posting...
                </span>
                {step === 1 && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {step > 1 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 2: Researching */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                <span className={`text-sm ${step >= 2 ? "text-white" : "text-zinc-600"}`}>
                  Step 2: Researching company...
                </span>
                {step === 2 && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {step > 2 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 3: Saving */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                <span className={`text-sm ${step >= 3 ? "text-white" : "text-zinc-600"}`}>
                  Step 3: Saving...
                </span>
                {step === 3 && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {step > 3 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              {/* Step 4: Success Message */}
              {step === 4 && (
                <div className="text-center text-green-400 font-bold text-sm pt-2 animate-bounce">
                  Import completed successfully!
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
