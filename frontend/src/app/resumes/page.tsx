"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Trash2, 
  Upload, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle,
  Download,
  Code2,
  Edit,
  Sparkles,
  Calendar
} from "lucide-react";
import { getResumes, createResume, updateResume, deleteResume, parseResume, getResume, deleteResumeFile } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface ResumeListEntry {
  id: string;
  name: string;
  preview: string;
  file_url?: string | null;
  file_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface SelectedResumeDetails {
  id: string;
  name: string;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "text">("preview");
  
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
      
      if (selectIdAfterFetch && typeof selectIdAfterFetch === 'string') {
        handleSelectResume(selectIdAfterFetch);
      } else if (data && data.length > 0 && !selectedResume) {
        handleSelectResume(data[0].id);
      } else if (!data || data.length === 0) {
        setEditorMode("create");
        setName("");
        setContent("");
        setFileUrl(null);
        setFileName(null);
        setSelectedResume(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load resumes list.");
    } finally {
      setLoadingList(false);
    }
  }, [selectedResume?.id, editorMode]);

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
      setFileUrl(fullResume.file_url || null);
      setFileName(fullResume.file_name || null);
      setActiveTab(fullResume.file_url ? "preview" : "text");
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
    setFileUrl(null);
    setFileName(null);
    setActiveTab("text");
    setEditorMode("create");
    setError(null);
    setSuccess(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForceCreate?: boolean) => {
    const forceCreate = isForceCreate === true;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    // Validate type
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.tex'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError("Unsupported file type. Please upload PDF, DOCX, TXT, or LaTeX.");
      return;
    }

    setParsing(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await parseResume(formData);
      setContent(response.text);
      if (!name) {
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setName(baseName);
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(path, file, { upsert: false });
            
          if (uploadError) throw uploadError;
          
          const { data: urlData, error: urlError } = await supabase.storage
            .from('resumes')
            .createSignedUrl(path, 60 * 60 * 24 * 365);
            
          if (urlError) throw urlError;
          if (urlData) {
             setFileUrl(urlData.signedUrl);
             setFileName(file.name);
             setActiveTab("preview");
             
             // AUTO-SAVE logic
             const currentName = (forceCreate ? "" : name) || (file.name.substring(0, file.name.lastIndexOf(".")) || file.name);
             
             if (forceCreate || editorMode === "create") {
               const newResume = await createResume({
                 name: currentName,
                 content: response.text,
                 file_url: urlData.signedUrl,
                 file_name: file.name
               });
               setSuccess("Resume parsed, uploaded, and saved automatically!");
               // Use setTimeout to allow state to settle before fetching
               setTimeout(() => fetchResumesList(newResume.id), 50);
             } else if (editorMode === "view-edit" && selectedResume) {
               const updated = await updateResume(selectedResume.id, {
                 name: currentName,
                 content: response.text,
                 file_url: urlData.signedUrl,
                 file_name: file.name
               });
               setSuccess("Resume updated with new file automatically!");
               setSelectedResume(updated);
               setTimeout(() => fetchResumesList(updated.id), 50);
             } else {
               setSuccess("Resume parsed and file securely uploaded!");
             }
          }
        }
      } catch (uploadErr: any) {
        setSuccess("Resume text parsed, but file upload to storage failed.");
        console.error("Storage upload error:", uploadErr);
      }

    } catch (err: any) {
      setError(err.message || "Failed to parse resume file.");
    } finally {
      setParsing(false);
      e.target.value = ""; 
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          content: content.trim(),
          ...(fileUrl && { file_url: fileUrl }),
          ...(fileName && { file_name: fileName })
        });
        setSuccess("Resume created successfully!");
        fetchResumesList(newResume.id);
      } else if (editorMode === "view-edit" && selectedResume) {
        const updated = await updateResume(selectedResume.id, {
          name: name.trim(),
          content: content.trim(),
          ...(fileUrl && fileUrl !== selectedResume.file_url && { file_url: fileUrl }),
          ...(fileName && fileName !== selectedResume.file_name && { file_name: fileName })
        });
        setSuccess("Resume updated successfully!");
        setSelectedResume(updated);
        const data = await getResumes();
        setResumes(data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save resume.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFile = async () => {
    if (editorMode === "view-edit" && selectedResume && selectedResume.file_url) {
      if (!window.confirm("Are you sure you want to remove the attached file?")) return;
      try {
        setSaving(true);
        // Delete from Supabase Storage
        try {
          const urlObj = new URL(selectedResume.file_url);
          const pathParts = urlObj.pathname.split('/resumes/');
          if (pathParts.length > 1) {
            const filePath = decodeURIComponent(pathParts[1]);
            await supabase.storage.from('resumes').remove([filePath]);
          }
        } catch (e) {
          console.error("Storage deletion error", e);
        }
        
        const updated = await deleteResumeFile(selectedResume.id);
        setSelectedResume(updated);
        setFileUrl(null);
        setFileName(null);
        setActiveTab("text");
        setSuccess("File attachment removed.");
      } catch (err: any) {
        setError(err.message || "Failed to remove file.");
      } finally {
        setSaving(false);
      }
    } else {
      setFileUrl(null);
      setFileName(null);
      setActiveTab("text");
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
      // Delete from Supabase Storage if it has a file
      if (selectedResume.file_url) {
        try {
          const urlObj = new URL(selectedResume.file_url);
          const pathParts = urlObj.pathname.split('/resumes/');
          if (pathParts.length > 1) {
            const filePath = decodeURIComponent(pathParts[1]);
            await supabase.storage.from('resumes').remove([filePath]);
          }
        } catch (e) {
          console.error("Storage deletion error", e);
        }
      }

      await deleteResume(selectedResume.id);
      setSuccess("Resume deleted successfully.");
      setSelectedResume(null);
      fetchResumesList();
    } catch (err: any) {
      setError(err.message || "Failed to delete resume.");
    } finally {
      setSaving(false);
    }
  };

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

  const renderThumbnail = (resume: ResumeListEntry) => {
    const fName = resume.file_name?.toLowerCase() || "";
    const isPdf = fName.endsWith('.pdf');
    const isDocx = fName.endsWith('.docx') || fName.endsWith('.doc');
    const isTxt = fName.endsWith('.txt');
    const isTex = fName.endsWith('.tex');
  
    if (resume.file_url && isPdf) {
      return (
        <div className="w-full h-40 rounded-t-xl overflow-hidden relative border-b border-border-default bg-zinc-900/50">
          <iframe 
            src={resume.file_url}
            scrolling="no"
            className="w-full h-40 pointer-events-none border-0 absolute top-0 left-0"
            style={{ width: '167%', height: '167%', transform: 'scale(0.6)', transformOrigin: 'top left' }}
            tabIndex={-1}
          />
        </div>
      );
    }
    
    if (resume.file_url && isDocx) {
      return (
        <div className="w-full h-40 flex items-center justify-center bg-elevated/50 border-b border-border-default rounded-t-xl">
          <FileText className="w-10 h-10 text-blue-400" />
        </div>
      );
    }
  
    if (resume.file_url && isTex) {
      return (
        <div className="w-full h-40 flex items-center justify-center bg-elevated/50 border-b border-border-default rounded-t-xl">
          <Code2 className="w-10 h-10 text-emerald-400" />
        </div>
      );
    }
  
    if (resume.file_url && isTxt) {
      return (
        <div className="w-full h-40 bg-elevated/50 border-b border-border-default rounded-t-xl p-3 overflow-hidden">
          <p className="text-[8px] font-mono leading-relaxed text-muted opacity-60 whitespace-pre-wrap">
            {resume.preview || "Text content..."}
          </p>
        </div>
      );
    }
  
    // Fallback / Text only
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center bg-elevated/50 border-b border-border-default rounded-t-xl">
        <FileText className="w-8 h-8 text-secondary mb-2" />
        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Text Only</span>
      </div>
    );
  };

  const renderPreviewTab = () => {
    const currentFileName = fileName || selectedResume?.file_name;
    const currentFileUrl = fileUrl || selectedResume?.file_url;
  
    if (!currentFileUrl) {
      return (
        <div className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-border-default rounded-xl bg-elevated/50 text-center mt-2">
          <FileText className="w-8 h-8 text-secondary mb-3" />
          <p className="text-sm font-semibold text-primary mb-1">No file attached</p>
          <p className="text-xs text-muted mb-4">Upload a file to attach it to this resume profile.</p>
          <label className="px-4 py-2 bg-elevated border border-border-default rounded-lg text-xs font-medium hover:border-accent/50 cursor-pointer flex items-center space-x-2 transition-colors">
            <Upload className="w-4 h-4 text-accent" />
            <span>Upload File</span>
            <input 
              type="file" 
              accept=".pdf,.docx,.doc,.txt,.tex" 
              onChange={handleFileUpload}
              disabled={parsing || saving}
              className="hidden" 
            />
          </label>
        </div>
      );
    }
  
    const fName = currentFileName?.toLowerCase() || "";
    const isPdf = fName.endsWith('.pdf');
    const isDocx = fName.endsWith('.docx') || fName.endsWith('.doc');
    const isTxt = fName.endsWith('.txt');
    const isTex = fName.endsWith('.tex');
  
    if (isPdf) {
      return (
        <>
          <iframe 
            data-testid="resume-preview"
            src={currentFileUrl}
            className="w-full h-[600px] rounded-xl border border-border-default bg-zinc-900/50 mt-2"
            title="Resume PDF Preview"
          />
          <div className="flex items-center justify-between px-1 mt-2">
            <span className="text-xs text-muted font-medium">File: {currentFileName}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={saving}
              className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Remove File
            </button>
          </div>
        </>
      );
    }
  
    if (isDocx) {
      return (
        <>
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-border-default bg-elevated gap-4 mt-2">
            <FileText className="w-12 h-12 text-blue-400" />
            <div className="text-center">
              <p className="text-primary font-medium">{currentFileName}</p>
              <p className="text-secondary text-xs mt-1">Word documents cannot be previewed in browser</p>
            </div>
            <a 
              href={currentFileUrl} 
              download={currentFileName || "resume.docx"}
              className="px-4 py-2 rounded-lg bg-elevated border border-border-default text-sm text-primary hover:border-accent/50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download to view
            </a>
          </div>
          <div className="flex items-center justify-end px-1 mt-2">
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={saving}
              className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Remove File
            </button>
          </div>
        </>
      );
    }
  
    if (isTxt || isTex) {
      return (
        <>
          <p className="text-xs font-medium text-secondary mb-2 mt-2">Text file — content shown directly</p>
          <pre className="w-full h-96 overflow-auto rounded-xl border border-border-default bg-elevated p-4 text-xs text-secondary font-mono leading-relaxed whitespace-pre-wrap">
            {content || selectedResume?.content}
          </pre>
          <div className="flex items-center justify-between px-1 mt-2">
            <span className="text-xs text-muted font-medium">File: {currentFileName}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={saving}
              className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Remove File
            </button>
          </div>
        </>
      );
    }
  
    // Fallback
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border border-border-default rounded-xl bg-elevated/50 text-center p-4 mt-2">
        <FileText className="w-8 h-8 text-secondary mb-2" />
        <p className="text-sm font-semibold text-primary">Preview not supported</p>
        <p className="text-xs text-muted mt-1">Please use the Extracted Text tab to view content.</p>
      </div>
    );
  };

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto reveal">
      
      {/* Title Header */}
      <div className="reveal-1">
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight flex items-center space-x-3">
          <FileText className="w-8 h-8 text-accent" />
          <span>My Saved Resumes</span>
        </h1>
        <p className="text-muted text-xs mt-1 max-w-xl">
          Manage multiple resume variations. Pick a saved resume directly during job imports to streamline your AI application analysis.
        </p>
      </div>

      {/* Action cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 reveal-1">
        <label 
          className="flex flex-col items-center justify-center p-6 border border-border-default rounded-xl bg-surface hover:border-accent/40 cursor-pointer transition-colors group card-hover text-center h-full"
        >
          <Upload className="w-6 h-6 text-muted group-hover:text-accent mb-2 transition-colors" />
          <h3 className="text-sm font-bold text-primary mb-1">Import an existing resume</h3>
          <p className="text-[10px] text-muted">Upload PDF, DOCX, TXT, or LaTeX to get started</p>
          <input 
            type="file" 
            accept=".pdf,.docx,.doc,.txt,.tex" 
            onChange={(e) => {
              handleCreateTrigger();
              handleFileUpload(e, true);
            }} 
            disabled={parsing || saving}
            className="hidden" 
          />
        </label>

        <button
          onClick={handleCreateTrigger}
          className="flex flex-col items-center justify-center p-6 border border-border-default rounded-xl bg-surface hover:border-accent/40 cursor-pointer transition-colors group card-hover text-center h-full outline-none"
        >
          <Edit className="w-6 h-6 text-muted group-hover:text-accent mb-2 transition-colors" />
          <h3 className="text-sm font-bold text-primary mb-1">+ Create from text</h3>
          <p className="text-[10px] text-muted">Paste or type your resume manually</p>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Resumes Master List */}
        <div className="space-y-4 reveal-2">
          {loadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="bg-surface border border-border-default rounded-xl h-60 animate-pulse flex flex-col justify-between overflow-hidden">
                  <div className="h-40 bg-elevated w-full"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-border-strong rounded w-2/3"></div>
                    <div className="h-3 bg-border-strong rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border-default border-dashed rounded-2xl flex flex-col items-center">
              <FileText className="w-8 h-8 text-secondary mb-2" />
              <p className="text-primary font-medium text-xs">No saved resumes found</p>
              <p className="text-[10px] text-muted mt-1 max-w-[180px]">
                Create a resume profile or upload a file to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 pb-10">
              {resumes.map((resume) => {
                const isSelected = selectedResume?.id === resume.id && editorMode === "view-edit";
                return (
                  <button
                    key={resume.id}
                    onClick={() => handleSelectResume(resume.id)}
                    className={`w-full text-left flex flex-col rounded-xl overflow-hidden transition-all outline-none card-hover border ${
                      isSelected 
                        ? "bg-accent/5 border-accent shadow-accent/10 shadow-lg"
                        : "bg-surface border-border-default hover:border-border-strong hover:scale-[1.01]"
                    }`}
                  >
                    {renderThumbnail(resume)}
                    
                    <div className="p-4 flex flex-col gap-1 w-full bg-surface">
                      <div className="flex justify-between items-start w-full">
                        <span className={`font-bold text-sm truncate pr-2 leading-tight ${isSelected ? "text-primary" : "text-secondary"}`}>
                          {resume.name}
                        </span>
                        {isSelected && <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1"></span>}
                      </div>
                      <div className="text-[10px] text-muted font-medium">
                        Last updated {formatDate(resume.updated_at)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Editor Pane */}
        {(selectedResume || editorMode === "create") && (
          <div className="md:col-span-2 reveal-3">
            <div className="bg-surface border border-border-default rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
              
              {/* Header Title & Form Input */}
              <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                <input
                  type="text"
                  required
                  disabled={saving}
                  className="bg-transparent text-xl md:text-2xl font-bold text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 rounded px-2 py-1 flex-1 mr-4 transition-all"
                  placeholder="Resume Profile Name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  {editorMode === "view-edit" && selectedResume && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving || loadingDetail}
                      className="flex items-center justify-center p-2 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-900/30 transition-colors disabled:opacity-50"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !name || !content || content.length < 50}
                    className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-primary hover:bg-white text-zinc-900 font-bold text-xs transition-colors disabled:bg-elevated disabled:text-muted"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save</span>
                  </button>
                </div>
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

              {loadingDetail || parsing ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <span className="text-xs">
                    {parsing ? "Parsing resume file..." : "Loading resume details..."}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex space-x-2 border-b border-border-default mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 ${
                        activeTab === "preview" 
                          ? "border-accent text-accent" 
                          : "border-transparent text-secondary hover:text-primary"
                      }`}
                    >
                      📄 File Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("text")}
                      className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 ${
                        activeTab === "text" 
                          ? "border-primary text-primary" 
                          : "border-transparent text-secondary hover:text-primary"
                      }`}
                    >
                      📝 Extracted Text
                    </button>
                  </div>

                  {activeTab === "preview" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {renderPreviewTab()}
                    </div>
                  )}

                  {activeTab === "text" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <p className="text-[10px] text-muted italic px-1 font-medium bg-elevated/50 p-2 rounded-md border border-border-default inline-block">
                        <Sparkles className="w-3 h-3 inline mr-1.5 text-accent" />
                        This text is what JobPilot AI reads for analysis
                      </p>
                      <div>
                        <textarea
                          id="resume-content"
                          rows={15}
                          required
                          disabled={saving}
                          className="w-full px-4 py-3 rounded-xl bg-elevated border border-border-default text-primary placeholder-muted focus:outline-none focus:border-border-strong transition-colors text-sm resize-y font-mono text-[11px] leading-relaxed disabled:opacity-50"
                          placeholder="Paste full resume text content here, or upload a file to parse it..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                        <div className="flex justify-between items-center text-[10px] text-muted mt-1.5 px-1 font-medium">
                          <span>Minimum 50 characters required</span>
                          <span>{content.length} characters</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
