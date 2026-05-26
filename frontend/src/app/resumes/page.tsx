"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  Save, 
  Loader2, 
  X, 
  Check, 
  AlertCircle,
  Calendar,
  Sparkles
} from "lucide-react";
import { getResumes, createResume, updateResume, deleteResume, parseResume, getResume } from "@/lib/api";

interface ResumeListEntry {
  id: string;
  name: string;
  preview: string;
  created_at: string;
  updated_at: string;
}

interface SelectedResumeDetails {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeListEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedResume, setSelectedResume] = useState<SelectedResumeDetails | null>(null);
  
  // Editor / Form state
  const [editorMode, setEditorMode] = useState<"view-edit" | "create">("create");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  
  // UI States
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchResumesList = useCallback(async (selectIdAfterFetch?: string) => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await getResumes();
      setResumes(data || []);
      
      // If requested, select a specific ID
      if (selectIdAfterFetch) {
        handleSelectResume(selectIdAfterFetch);
      } else if (data && data.length > 0 && !selectedResume) {
        // Otherwise default to selecting the first item if nothing is selected yet
        handleSelectResume(data[0].id);
      } else if (!data || data.length === 0) {
        setEditorMode("create");
        setName("");
        setContent("");
        setSelectedResume(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load resumes list.");
    } finally {
      setLoadingList(false);
    }
  }, [selectedResume]);

  useEffect(() => {
    fetchResumesList();
  }, []);

  const handleSelectResume = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    setSuccess(null);
    try {
      const fullResume = await getResume(id);
      setSelectedResume(fullResume);
      setName(fullResume.name);
      setContent(fullResume.content);
      setEditorMode("view-edit");
    } catch (err: any) {
      setError(err.message || "Failed to load resume details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateTrigger = () => {
    setSelectedResume(null);
    setName("");
    setContent("");
    setEditorMode("create");
    setError(null);
    setSuccess(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await parseResume(formData);
      setContent(response.text);
      setSuccess("Resume file parsed successfully!");
      if (!name) {
        // Auto-generate name from file name if input name is empty
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setName(baseName);
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse resume file.");
    } finally {
      setParsing(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a resume name.");
      return;
    }
    if (!content.trim() || content.trim().length < 50) {
      setError("Resume content must be at least 50 characters long.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editorMode === "create") {
        const newResume = await createResume({
          name: name.trim(),
          content: content.trim()
        });
        setSuccess("Resume created successfully!");
        fetchResumesList(newResume.id);
      } else if (editorMode === "view-edit" && selectedResume) {
        const updated = await updateResume(selectedResume.id, {
          name: name.trim(),
          content: content.trim()
        });
        setSuccess("Resume updated successfully!");
        setSelectedResume(updated);
        // Refresh the list to update names/previews, while maintaining the selected item
        const data = await getResumes();
        setResumes(data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save resume.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResume) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedResume.name}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteResume(selectedResume.id);
      setSuccess("Resume deleted successfully.");
      setSelectedResume(null);
      fetchResumesList();
    } catch (err: any) {
      setError(err.message || "Failed to delete resume.");
      setSaving(false);
    }
  };

  // Safe date formatter helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <FileText className="w-8 h-8 text-[#6C3CE1]" />
          <span>My Saved Resumes</span>
        </h1>
        <p className="text-zinc-500 text-xs mt-1 max-w-xl">
          Manage multiple resume variations. Pick a saved resume directly during job imports to streamline your AI application analysis.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Resumes Master List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              Saved Profiles ({resumes.length})
            </h2>
            <button
              onClick={handleCreateTrigger}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#6C3CE1]/15 hover:bg-[#6C3CE1]/25 text-[#8B5CF6] transition-colors border border-[#8B5CF6]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </button>
          </div>

          {loadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl h-24 animate-pulse flex flex-col justify-between">
                  <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                  <div className="h-3 bg-zinc-800 rounded w-full"></div>
                  <div className="h-3 bg-zinc-800 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center">
              <FileText className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-400 font-medium text-xs">No saved resumes found</p>
              <p className="text-[10px] text-zinc-600 mt-1 max-w-[180px]">
                Create a resume profile or upload a file to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {resumes.map((resume) => {
                const isSelected = selectedResume?.id === resume.id && editorMode === "view-edit";
                return (
                  <button
                    key={resume.id}
                    onClick={() => handleSelectResume(resume.id)}
                    className={`w-full text-left p-4 border rounded-xl flex flex-col justify-between gap-2.5 transition-all outline-none ${
                      isSelected 
                        ? "bg-[#6C3CE1]/10 border-[#6C3CE1] shadow-[#6C3CE1]/5 shadow-md"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-semibold text-sm truncate pr-2 ${isSelected ? "text-white" : "text-zinc-200"}`}>
                          {resume.name}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full flex-shrink-0 animate-pulse"></span>}
                      </div>
                      <p className="text-zinc-500 text-[11px] line-clamp-2 leading-relaxed">
                        {resume.preview || "No content preview available."}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 text-[9px] text-zinc-600 font-medium uppercase tracking-wider">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>Saved {formatDate(resume.created_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Editor Pane */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            
            {/* Header Title */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-white text-base font-bold flex items-center space-x-2">
                  <span>
                    {editorMode === "create" ? "Add New Resume Profile" : `Edit: ${selectedResume?.name}`}
                  </span>
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {editorMode === "create" ? "Create a resume variation by typing or uploading a file." : "Update the text contents or label name below."}
                </p>
              </div>
              
              {editorMode === "view-edit" && selectedResume && (
                <button
                  onClick={handleDelete}
                  disabled={saving || loadingDetail}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-900/30 bg-red-950/20 hover:bg-red-950/55 text-red-400 transition-colors disabled:opacity-50"
                  title="Delete resume profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>

            {/* Notification Banners */}
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-950/30 border border-green-800/40 rounded-xl text-green-300 text-xs flex items-start space-x-2.5">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                <span>{success}</span>
              </div>
            )}

            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#6C3CE1]" />
                <span className="text-xs">Loading resume details...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* File Upload Parser Button */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Parse From File (PDF, DOCX, TXT, LaTeX)
                  </label>
                  <div className="relative flex items-center justify-center w-full">
                    <label 
                      htmlFor="resume-upload" 
                      className={`flex flex-col items-center justify-center w-full h-24 border border-dashed rounded-xl cursor-pointer hover:bg-zinc-950/40 transition-colors ${
                        parsing ? "border-[#6C3CE1]/40 bg-zinc-950/20" : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {parsing ? (
                          <>
                            <Loader2 className="w-6 h-6 text-[#8B5CF6] animate-spin mb-2" />
                            <p className="text-xs text-zinc-400">Extracting text content from file...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                            <p className="text-xs text-zinc-400 font-semibold">Click to upload resume file</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">Supports PDF, Word, TXT, or LaTeX (max 5MB)</p>
                          </>
                        )}
                      </div>
                      <input 
                        id="resume-upload" 
                        type="file" 
                        accept=".pdf,.docx,.doc,.txt,.tex" 
                        onChange={handleFileUpload} 
                        disabled={parsing || saving}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2" htmlFor="resume-name">
                    Resume Profile Name
                  </label>
                  <input
                    id="resume-name"
                    type="text"
                    required
                    disabled={saving}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors text-sm disabled:opacity-50"
                    placeholder="e.g., Software Engineer - Senior, ML Research Assistant"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2" htmlFor="resume-content">
                    Resume Text Content
                  </label>
                  <textarea
                    id="resume-content"
                    rows={12}
                    required
                    disabled={saving}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-y font-mono text-xs leading-relaxed disabled:opacity-50"
                    placeholder="Paste full resume text content here, or upload a file above to parse it..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="flex justify-between items-center text-[10px] text-zinc-600 mt-1.5 px-1 font-medium">
                    <span>Minimum 50 characters required</span>
                    <span>{content.length} characters</span>
                  </div>
                </div>

                {/* Form Submit Footer */}
                <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                  {editorMode === "create" && resumes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectResume(resumes[0].id)}
                      className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/40 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    disabled={saving || !name || !content || content.length < 50}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center space-x-2 disabled:bg-zinc-800 disabled:text-zinc-650"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>
                          {editorMode === "create" ? "Save Resume Profile" : "Update Resume"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
