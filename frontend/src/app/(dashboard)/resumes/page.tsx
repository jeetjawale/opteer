"use client";

import { useRef } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  Plus,
  CloudUpload,
  Sparkles,
  Filter,
  ArrowUpDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Edit2,
  Eye,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useDeleteResume, useResumes, useUploadResume, useUpdateResume, useResumeText, type Resume } from "@/features/resumes/hooks/useResumes";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { createPortal } from "react-dom";

export default function ResumesPage() {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const { data: paginatedData, isLoading } = useResumes(page, perPage);
  const resumes = paginatedData?.items || [];
  const totalResumes = paginatedData?.total || 0;
  const { mutate: uploadResume, isPending: isUploading } = useUploadResume();
  const { mutate: deleteResume } = useDeleteResume();
  const { mutate: updateResume } = useUpdateResume();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "nameAsc" | "nameDesc">("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);

  const previewResume = resumes.find(r => r.id === previewResumeId);
  const isPdf = previewResume?.file_name?.toLowerCase().endsWith('.pdf');
  const showIframe = isPdf && previewResume?.file_url;
  
  // Only fetch text if we need it (not a PDF or no file_url)
  const { data: previewResumeData, isLoading: isPreviewLoading } = useResumeText(previewResumeId, !!previewResumeId && !showIframe);

  const startEditing = (resume: Resume) => {
    setEditingId(resume.id);
    setEditingName(resume.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      updateResume({ resumeId: editingId, name: editingName.trim() }, {
        onSuccess: () => setEditingId(null)
      });
    } else {
      setEditingId(null);
    }
  };

  const processedResumes = [...resumes]
    .filter(r => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(lowerQuery) || 
             (r.file_name && r.file_name.toLowerCase().includes(lowerQuery));
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'oldest': return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'nameAsc': return a.name.localeCompare(b.name);
        case 'nameDesc': return b.name.localeCompare(a.name);
        case 'newest':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadResume(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUploading) {
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadResume(file);
    }
  };

  const formatDate = (value: string) => format(new Date(value), "MMM dd, yyyy");



  return (
    <main className="flex-1 p-lg w-full flex flex-col space-y-lg">
      <PageHeader 
        title="Resume Repository"
        subtitle="Manage your tailored CV versions and track AI match performance."
      />

      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx,.txt"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`col-span-1 lg:col-span-2 bg-surface rounded-lg border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all duration-300 flex flex-col items-center justify-center p-xl min-h-[240px] group cursor-pointer relative overflow-hidden ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-md group-hover:scale-110 transition-transform duration-300">
            {isUploading ? (
              <Loader2 className="text-primary animate-spin" size={32} />
            ) : (
              <CloudUpload className="text-primary" size={32} />
            )}
          </div>
          <h3 className="font-headline-sm text-[22px] font-semibold text-on-background mb-xs">
            {isUploading ? "Uploading Resume..." : "Drag & Drop Resume"}
          </h3>
          <p className="font-body-sm text-[15px] text-on-surface-variant text-center mb-4">
            Upload a new version to parse into your repository.
            <br />
            Your resume will be parsed and scored against your active applications.
          </p>
          <span className="font-mono-data text-mono-data text-outline mb-lg block">
            Supported formats: PDF, DOCX, TXT (Max 5MB)
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
            }}
            disabled={isUploading}
            className="font-label-md text-label-md text-primary border border-primary px-lg py-sm rounded hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-50"
          >
            Browse Files
          </button>
        </div>

        <Card className="col-span-1 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-sm mb-lg">
            <Sparkles className="text-tertiary-container fill-tertiary-container" size={24} />
            <h3 className="font-headline-sm text-headline-sm text-on-background">Portfolio Insights</h3>
          </div>
          <div className="space-y-md flex-1">
            <div className="bg-surface-container-low rounded p-md border border-outline-variant/50">
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-xs">Total Versions</p>
              <div className="flex items-end gap-sm">
                <span className="font-display text-[56px] font-bold tracking-tight text-primary leading-none">{totalResumes}</span>
                <span className="font-mono-data text-mono-data text-on-surface-variant mb-1.5">active</span>
              </div>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/50 pb-sm pt-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Latest Update</span>
              <span className="font-mono-data text-mono-data text-on-background">
                {resumes[0] ? formatDate(resumes[0].updated_at) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-sm pt-xs">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Files Attached</span>
              <span className="font-mono-data text-mono-data text-on-background">
                {resumes.filter((resume) => resume.file_url).length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden flex flex-col p-0">
        <div className="flex justify-between items-center p-md border-b border-outline-variant relative">
          <h3 className="font-headline-sm text-headline-sm text-on-background">Version History</h3>
          <div className="flex gap-sm relative z-50">
            {/* Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
                className={`p-2 rounded-md transition-colors ${
                  searchQuery || isFilterOpen ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
                title="Filter"
              >
                <Filter size={18} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-outline-variant rounded-xl shadow-lg p-3 z-50">
                  <h3 className="text-[13px] font-semibold text-on-surface mb-2">Filter by Keyword</h3>
                  <input 
                    type="text" 
                    placeholder="Search name or file..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-[12px] font-medium text-primary hover:text-primary/80"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
                className={`p-2 rounded-md transition-colors ${
                  sortOption !== 'newest' || isSortOpen ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
                title="Sort"
              >
                <ArrowUpDown size={18} />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-outline-variant rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5">
                  <button 
                    onClick={() => setSortOption('newest')} 
                    className={`text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${sortOption === 'newest' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                  >
                    Last Updated (Newest)
                  </button>
                  <button 
                    onClick={() => setSortOption('oldest')} 
                    className={`text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${sortOption === 'oldest' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                  >
                    Last Updated (Oldest)
                  </button>
                  <button 
                    onClick={() => setSortOption('nameAsc')} 
                    className={`text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${sortOption === 'nameAsc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                  >
                    Name (A-Z)
                  </button>
                  <button 
                    onClick={() => setSortOption('nameDesc')} 
                    className={`text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${sortOption === 'nameDesc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                  >
                    Name (Z-A)
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Global Overlay for closing dropdowns */}
          {(isFilterOpen || isSortOpen) && (
            <div className="fixed inset-0 z-40" onClick={() => { setIsFilterOpen(false); setIsSortOpen(false); }} />
          )}
        </div>

        <div className="flex gap-sm px-md py-sm border-b border-outline-variant bg-surface-bright font-label-md text-[13px] font-semibold text-on-surface-variant">
          <div className="w-[30%] min-w-[200px]">Document Name</div>
          <div className="flex-1 min-w-[250px]">Preview</div>
          <div className="w-[120px]">Uploaded</div>
          <div className="w-[80px] text-right">Actions</div>
        </div>

        <div className="flex flex-col divide-y divide-outline-variant">
          {isLoading ? (
            <div className="p-md text-center flex items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 className="animate-spin" size={20} /> Loading resumes...
            </div>
          ) : processedResumes.length === 0 ? (
            <div className="p-md text-center text-on-surface-variant">
              {totalResumes === 0 ? "No resumes uploaded yet." : "No resumes match your filter."}
            </div>
          ) : (
            processedResumes.map((resume) => (
              <div key={resume.id} className="flex gap-sm items-start px-md py-md hover:bg-surface-container-lowest transition-colors group">
                <div className="w-[30%] min-w-[200px] flex items-center gap-md">
                  <FileText className="text-primary shrink-0" size={24} />
                  <div className="flex flex-col min-w-0 flex-1">
                    {editingId === resume.id ? (
                      <input 
                        type="text" 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={e => e.key === 'Enter' ? saveEditing() : e.key === 'Escape' ? setEditingId(null) : undefined}
                        autoFocus
                        className="font-mono-data text-mono-data text-on-background px-1 border border-primary rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary w-full"
                      />
                    ) : (
                      <span 
                        className="font-mono-data text-mono-data text-on-background truncate" 
                        title={resume.name}
                      >
                        {resume.name}
                      </span>
                    )}
                  </div>
                </div>

                <div 
                  className="flex-1 min-w-[250px] text-[13px] text-on-surface-variant cursor-pointer hover:text-primary transition-colors group/preview"
                  onClick={() => setPreviewResumeId(resume.id)}
                  title="Click to view full text"
                >
                  <p className="line-clamp-2 group-hover/preview:underline">
                    {resume.preview || "No preview available"}
                  </p>
                </div>

                <div className="w-[120px] font-mono-data text-[13px] text-on-surface-variant flex items-center mt-1" title={resume.created_at}>
                  {formatDate(resume.created_at)}
                </div>

                <div className="w-[80px] flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                  <button
                    onClick={() => startEditing(resume)}
                    className="p-1 rounded text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    title="Rename Resume"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteResume(resume.id)}
                    className="p-1 rounded text-error hover:bg-error-container transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-md py-sm border-t border-outline-variant bg-surface-bright flex justify-between items-center">
          <span className="font-body-sm text-[14px] text-on-surface-variant">
            Showing {totalResumes === 0 ? 0 : (page - 1) * perPage + 1}-{Math.min(page * perPage, totalResumes)} of {totalResumes} versions
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 rounded text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              disabled={page * perPage >= totalResumes}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </Card>

      {previewResumeId && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close preview dialog"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setPreviewResumeId(null)}
          />

          <div className="relative z-10 w-full max-w-[56rem] h-[90vh] max-h-[1000px] flex flex-col rounded-2xl border border-outline-variant bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-outline-variant shrink-0 bg-surface">
              <div className="min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <FileText className="text-primary" size={24} />
                  {previewResume?.name || "Resume Preview"}
                </h3>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {previewResume?.file_name || "No file attached"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewResumeId(null)}
                className="shrink-0 rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 w-full bg-surface-container-lowest overflow-hidden flex flex-col relative">
              {showIframe ? (
                <iframe 
                  src={`${previewResume.file_url}#view=FitH`}
                  className="w-full h-full border-0 absolute inset-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="p-6 overflow-y-auto w-full h-full font-body-sm text-on-surface whitespace-pre-wrap">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-on-surface-variant gap-4">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p>Loading resume text...</p>
                    </div>
                  ) : previewResumeData?.content ? (
                    previewResumeData.content
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-error gap-2">
                      <p>Could not load resume content.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
