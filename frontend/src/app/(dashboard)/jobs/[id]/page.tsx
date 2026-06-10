"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/Card";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight, 
  ChevronDown,
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Brain, 
  Globe,
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useApplicationAnalysis, useUpdateApplicationStatus, useRerunAnalysis, useDeleteApplication } from "@/features/applications/hooks/useApplications";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: app, isLoading, isError } = useApplicationAnalysis(id);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateApplicationStatus();
  const { mutate: rerunAnalysis, isPending: isRerunning } = useRerunAnalysis();
  const { mutate: deleteApp, isPending: isDeleting } = useDeleteApplication();

  const [activeTab, setActiveTab] = useState<'cover_letter' | 'interview_prep' | 'resume_tailoring'>('cover_letter');

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this job application? This action cannot be undone.')) {
      deleteApp(id, {
        onSuccess: () => {
          router.push('/applications');
        }
      });
    }
  };

  const handleDownloadAssets = () => {
    if (!app) return;
    
    let content = `--- Opteer Assets for ${app.role || 'Role'} at ${app.company || 'Company'} ---\n\n`;
    
    if (app.cover_letter) {
      content += `=== COVER LETTER ===\n${app.cover_letter}\n\n`;
    }
    
    if (app.interview_prep?.questions) {
      content += `=== INTERVIEW PREP ===\n`;
      app.interview_prep.questions.forEach((q: any, i: number) => {
        content += `Q${i+1}: ${q.question}\nA${i+1}: ${q.suggested_answer}\n\n`;
      });
    }
    
    if (app.resume_edits?.edits) {
      content += `=== RESUME EDITS ===\n`;
      app.resume_edits.edits.forEach((edit: any) => {
        content += `[${edit.type.toUpperCase()}] ${edit.section}: ${edit.suggestion}\nReasoning: ${edit.reasoning}\n\n`;
      });
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opteer_assets_${(app.company || 'company').replace(/\\s+/g, '_')}_${(app.role || 'role').replace(/\\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-lg w-full flex items-center justify-center">
        <div className="flex flex-col items-center text-on-surface-variant">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Loading application details...</p>
        </div>
      </main>
    );
  }

  if (isError || !app) {
    return (
      <main className="flex-1 p-lg w-full">
        <div className="bg-error/10 border border-error/20 p-lg rounded-xl text-center">
          <AlertTriangle className="text-error mx-auto mb-2" size={32} />
          <h2 className="text-error font-headline-sm mb-1">Failed to load job</h2>
          <p className="text-on-surface-variant">Could not retrieve application details. Please try again.</p>
        </div>
      </main>
    );
  }

  const analysisStatus = app.analysis_status || 'idle';

  return (
    <main className="flex-1 p-lg w-full flex flex-col">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-body-sm font-body-sm text-on-surface-variant mb-md gap-2">
        <Link href="/jobs" className="hover:text-primary transition-colors">Job Board</Link>
        <ChevronRight size={16} className="text-on-surface-variant" />
        <span className="text-on-surface">{app.role || 'Unknown Role'} - {app.company || 'Unknown Company'}</span>
      </nav>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg lg:gap-xl">
        
        {/* Left Column: Core Job Details (8 cols) */}
        <div className="lg:col-span-8 space-y-lg">
          
          {/* Job Header Card */}
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-outline-variant pb-md mb-md">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center p-2 shrink-0">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{(app.company || 'U')[0].toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight mb-1">{app.role || 'Unknown Role'}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-md font-body-md text-on-surface-variant">
                    <span className="font-medium text-on-surface">{app.company || 'Unknown Company'}</span>
                    <span className="flex items-center gap-1 text-sm"><MapPin size={16} /> {`${app.location || ''} ${app.work_model ? `(${app.work_model})` : ''}`.trim() || 'Remote'}</span>
                  </div>
                </div>
              </div>
              
              {/* Fit Score Gauge */}
              <div className="flex flex-col items-center justify-center bg-surface-container-low p-3 rounded-lg border border-outline-variant shrink-0 min-w-[100px]">
                <span className="font-mono-data text-mono-data text-secondary-container-high mb-1">FIT SCORE</span>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeWidth="3"></path>
                    <path className={app.is_quality_gated ? 'text-error' : (app.fit_score && app.fit_score >= 80 ? 'text-primary' : app.fit_score && app.fit_score >= 60 ? 'text-secondary' : 'text-error')} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={app.is_quality_gated ? "100, 100" : `${app.fit_score || 0}, 100`} strokeWidth="3"></path>
                  </svg>
                  <span className="absolute font-headline-sm text-headline-sm font-bold text-on-surface">
                    {app.is_quality_gated ? 'Fail' : (app.fit_score !== undefined && app.fit_score !== null ? app.fit_score : '--')}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {app.is_quality_gated && (
            <div className="bg-error/5 rounded-xl border border-error/20 p-lg flex flex-col items-center justify-center py-12">
              <AlertTriangle className="text-error mb-4" size={32} />
              <h3 className="font-headline-sm text-on-surface mb-2">Quality Gate Failed</h3>
              <p className="text-body-sm text-on-surface-variant text-center max-w-sm mb-4">This job was flagged by the automated quality gate and rejected.</p>
              {app.quality_gate_reason && <p className="font-mono-data text-sm text-error bg-error/10 p-3 rounded text-center">{app.quality_gate_reason}</p>}
            </div>
          )}

          {/* Activity Log Placeholder */}
          {analysisStatus === 'queued' && (
            <Card className="bg-surface-container-low flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mb-4" size={32} />
              <h3 className="font-headline-sm text-on-surface mb-2">Analysis Queued</h3>
              <p className="text-body-sm text-on-surface-variant text-center max-w-sm">Your application is waiting in the queue for AI processing. This usually takes just a moment.</p>
            </Card>
          )}

          {analysisStatus === 'processing' && (
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-lg flex flex-col items-center justify-center py-12">
              <RefreshCw className="animate-spin text-primary mb-4" size={32} />
              <h3 className="font-headline-sm text-on-surface mb-2">AI Analysis in Progress</h3>
              <p className="text-body-sm text-on-surface-variant text-center max-w-sm">Our AI is currently analyzing your resume against the job description to generate your tailored cover letter and interview prep.</p>
            </div>
          )}

          {analysisStatus === 'failed' && (
            <div className="bg-error/5 rounded-xl border border-error/20 p-lg flex flex-col items-center justify-center py-12">
              <AlertTriangle className="text-error mb-4" size={32} />
              <h3 className="font-headline-sm text-on-surface mb-2">Analysis Failed</h3>
              <p className="text-body-sm text-on-surface-variant text-center max-w-sm mb-4">We encountered an issue while analyzing your application.</p>
              {app.analysis_error && <p className="font-mono-data text-xs text-error/80 bg-error/10 p-2 rounded">{app.analysis_error}</p>}
            </div>
          )}

          {/* AI Fit Analysis Block (Only show if completed and data exists) */}
          {!app.is_quality_gated && (analysisStatus === 'completed' || analysisStatus === 'idle') && app.fit_score !== undefined && app.fit_score !== null && (
            <>
              <Card className="border-tertiary-fixed overflow-hidden relative p-0">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary"></div>
                <div className="p-lg bg-tertiary-container/5">
                  <div className="flex items-center gap-2 mb-md">
                    <Sparkles className="text-tertiary" size={24} />
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-tertiary">AI Fit Analysis</h3>
                  </div>
                  
                  {app.summary && (
                    <div className="prose prose-sm prose-p:leading-relaxed prose-a:text-primary mb-6 text-on-surface">
                      <ReactMarkdown>{app.summary}</ReactMarkdown>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-secondary" /> Strengths
                      </h4>
                      <ul className="space-y-2 font-body-sm text-body-sm text-on-surface">
                        {app.matched_skills && app.matched_skills.length > 0 ? (
                          app.matched_skills.map((skill: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0"></div>
                              <span>{skill}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-on-surface-variant italic">No matched skills identified.</li>
                        )}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-label-md text-label-md text-error uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={16} className="text-error" /> Identified Gaps
                      </h4>
                      <ul className="space-y-2 font-body-sm text-body-sm text-on-surface">
                        {app.missing_skills && app.missing_skills.length > 0 ? (
                          app.missing_skills.map((skill: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-error mt-2 shrink-0"></div>
                              <span>{skill}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-on-surface-variant italic">No major gaps identified!</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Generated Assets Tabs */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant pb-sm mb-md gap-3">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Generated Assets</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button 
                      onClick={() => setActiveTab('cover_letter')}
                      className={`px-3 py-1 rounded-md font-label-md text-label-md transition-colors whitespace-nowrap ${
                        activeTab === 'cover_letter' 
                          ? 'bg-surface-container text-primary font-medium border-b-2 border-primary rounded-b-none' 
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      Cover Letter
                    </button>
                    <button 
                      onClick={() => setActiveTab('interview_prep')}
                      className={`px-3 py-1 rounded-md font-label-md text-label-md transition-colors whitespace-nowrap ${
                        activeTab === 'interview_prep' 
                          ? 'bg-surface-container text-primary font-medium border-b-2 border-primary rounded-b-none' 
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      Interview Prep
                    </button>
                    <button 
                      onClick={() => setActiveTab('resume_tailoring')}
                      className={`px-3 py-1 rounded-md font-label-md text-label-md transition-colors whitespace-nowrap ${
                        activeTab === 'resume_tailoring' 
                          ? 'bg-surface-container text-primary font-medium border-b-2 border-primary rounded-b-none' 
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      Resume Tailoring
                    </button>
                  </div>
                </div>
                
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md font-mono-data text-body-sm text-on-surface whitespace-pre-line leading-relaxed overflow-x-auto min-h-[300px] max-h-[600px] overflow-y-auto">
                  {activeTab === 'cover_letter' && (
                    app.cover_letter ? app.cover_letter : <span className="text-on-surface-variant italic">No cover letter generated yet.</span>
                  )}
                  {activeTab === 'interview_prep' && (
                    app.interview_prep?.questions ? (
                      <div className="space-y-6">
                        {app.interview_prep.questions.map((q: any, i: number) => (
                          <div key={i} className="border-b border-outline-variant pb-4 last:border-0">
                            <p className="font-bold text-on-surface mb-2">Q: {q.question}</p>
                            <p className="text-on-surface-variant">A: {q.suggested_answer}</p>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-on-surface-variant italic">No interview prep generated yet.</span>
                  )}
                  {activeTab === 'resume_tailoring' && (
                    app.resume_edits?.edits ? (
                      <div className="space-y-6">
                        {app.resume_edits.edits.map((edit: any, i: number) => (
                          <div key={i} className="border-b border-outline-variant pb-4 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${edit.type === 'add' ? 'bg-primary/20 text-primary' : edit.type === 'remove' ? 'bg-error/20 text-error' : 'bg-secondary/20 text-secondary'}`}>
                                {edit.type}
                              </span>
                              <span className="font-bold text-on-surface text-sm">[{edit.section}]</span>
                            </div>
                            <p className="text-on-surface font-medium mb-1">{edit.suggestion}</p>
                            <p className="text-on-surface-variant text-sm italic">Reasoning: {edit.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-on-surface-variant italic">No resume edits generated yet.</span>
                  )}
                </div>
              </Card>
            </>
          )}

        </div>

        {/* Right Column: Company Intel & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-lg">
          
          {/* Action Bar Card */}
          <Card className="p-md flex flex-col gap-3">
            <button 
              onClick={handleDownloadAssets}
              className="w-full bg-primary-container text-on-primary py-2.5 rounded-lg font-label-md text-label-md hover:bg-primary-container/90 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download Assets
            </button>
            <button 
              onClick={() => rerunAnalysis(id)}
              disabled={isRerunning || app.analysis_status === 'processing' || isDeleting}
              className="w-full border border-primary text-primary py-2.5 rounded-lg font-label-md text-label-md hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Brain size={18} /> {isRerunning || app.analysis_status === 'processing' ? 'Re-running...' : 'Re-run Analysis'}
            </button>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full border border-error text-error py-2.5 rounded-lg font-label-md text-label-md hover:bg-error/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} /> {isDeleting ? 'Deleting...' : 'Delete Job'}
            </button>
            
            <div className="h-px bg-outline-variant my-1"></div>
            
            <div className="flex justify-between items-center px-1">
              <span className="font-label-md text-label-md text-on-surface-variant">Pipeline Status</span>
            </div>
            
            <div className="relative mt-1">
              <select 
                value={app.status || 'saved'}
                onChange={(e) => updateStatus({ id: app.id, status: e.target.value })}
                disabled={isUpdatingStatus}
                className="w-full bg-surface-container-low border border-outline-variant text-on-surface px-3 py-2 pr-10 rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container"
              >
                <option value="saved">Saved</option>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={16} />
            </div>
          </Card>

          {/* Activity Log Placeholder */}
          <Card>
            <div className="flex items-center gap-2 mb-md border-b border-outline-variant pb-2">
              <Globe className="text-on-surface-variant" size={20} />
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Company Intelligence</h3>
            </div>
            
            <div className="space-y-4">
              <div className="group">
                <span className="font-mono-data text-[11px] text-on-surface-variant mb-2 block uppercase">AI RESEARCH SUMMARY</span>
                <div className="font-body-sm text-body-sm text-on-surface whitespace-pre-line leading-relaxed">
                  {app.company_research ? app.company_research : <span className="italic text-on-surface-variant">No company research available.</span>}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
