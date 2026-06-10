"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useImportJob } from "@/features/applications/hooks/useApplications";
import { useResumes, useResumeText } from "@/features/resumes/hooks/useResumes";

const OPEN_IMPORT_EVENT = "opteer:open-job-import-modal";

export default function ImportJobModal() {
  const { mutateAsync: importJob, isPending: isImporting } = useImportJob();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [importError, setImportError] = useState("");

  const { data: paginatedData, isLoading: isResumesLoading } = useResumes();
  const resumes = paginatedData?.items || [];
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (isImportOpen) {
      if (!autoSelectedRef.current && resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
        autoSelectedRef.current = true;
      }
    } else {
      autoSelectedRef.current = false;
      setSelectedResumeId(null);
    }
  }, [isImportOpen, resumes]);

  const { data: selectedResumeText, isLoading: isResumeTextLoading } = useResumeText(selectedResumeId, isImportOpen);

  const openImportModal = () => {
    setImportError("");
    setIsImportOpen(true);
  };

  useEffect(() => {
    window.addEventListener(OPEN_IMPORT_EVENT, openImportModal);
    return () => window.removeEventListener(OPEN_IMPORT_EVENT, openImportModal);
  }, []);

  const closeImportModal = () => {
    setIsImportOpen(false);
    setJobUrl("");
    setImportError("");
  };

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportError("");

    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) {
      setImportError("Paste a job URL.");
      return;
    }

    const resumeText = selectedResumeId ? (selectedResumeText?.content?.trim() ?? "") : "";
    if (selectedResumeId && !resumeText) {
      setImportError("Waiting for resume text to load...");
      return;
    }

    try {
      await importJob({
        url: trimmedUrl,
        resume_text: resumeText,
        auto_analyze: false,
      });

      closeImportModal();
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^API Error:\s*/, "") : "Failed to import job.";
      setImportError(message);
    }
  };

  if (!isImportOpen) return null;

  return typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close import dialog"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={closeImportModal}
          />

          <div className="relative z-10 w-full max-w-[36rem] rounded-2xl border border-outline-variant bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Import Job Posting</h3>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Paste any public job posting or career link. Select which resume to use.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="shrink-0 rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block font-label-md text-label-md text-on-surface">Job URL</span>
                <input
                  autoFocus
                  type="url"
                  value={jobUrl}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setJobUrl(event.target.value)}
                  placeholder="https://company.com/careers/job-id"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                {isResumesLoading ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    Loading saved resumes...
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm text-label-sm text-on-surface font-medium">Select Resume (Optional)</label>
                    <select 
                      value={selectedResumeId || ''} 
                      onChange={e => setSelectedResumeId(e.target.value || null)}
                      className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">No Resume (Import Only)</option>
                      {resumes.map(r => (
                        <option key={r.id} value={r.id}>{r.name || r.file_name}</option>
                      ))}
                    </select>
                    {selectedResumeId && isResumeTextLoading && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                        <Loader2 className="animate-spin" size={12} /> Loading resume text...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {importError ? (
                <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container">
                  {importError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="rounded-lg border border-outline-variant px-4 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || isResumesLoading || (!!selectedResumeId && isResumeTextLoading) || (!!selectedResumeId && !selectedResumeText)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? <Loader2 className="animate-spin" size={18} /> : null}
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;
}
