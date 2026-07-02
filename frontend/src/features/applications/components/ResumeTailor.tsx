"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Loader2, FileDown, Sparkles, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
}

interface ExperienceEntry {
  role: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

interface ProjectEntry {
  name: string;
  tech_stack?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

interface SkillCategory {
  category: string;
  items: string[];
}

interface CertificationEntry {
  name: string;
  issuer?: string;
  date?: string;
  notes?: string;
}

interface ResumeStructured {
  contact: ContactInfo;
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillCategory[];
  certifications: CertificationEntry[];
}

// ─── LaTeX-style Resume Renderer ─────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <div style={{
      marginBottom: '6px',
      marginTop: '16px',
    }}>
      <div style={{
        fontSize: '11.5pt',
        fontWeight: '700',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        marginBottom: '3px',
      }}>
        {title}
      </div>
      <hr style={{ border: 'none', borderTop: '1.2px solid #000', margin: 0 }} />
    </div>
  );
}

function DateRange({ start, end }: { start?: string; end?: string }) {
  if (!start && !end) return null;
  const range = [start, end].filter(Boolean).join(' - ');
  return (
    <span style={{ fontSize: '10.5pt', whiteSpace: 'nowrap' as const }}>{range}</span>
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  if (!bullets?.length) return null;
  return (
    <ul style={{
      margin: '4px 0 8px 18px',
      padding: 0,
      listStyleType: 'disc',
    }}>
      {bullets.map((b, i) => (
        <li key={i} style={{ fontSize: '10.5pt', marginBottom: '2.5px', lineHeight: '1.4' }}>
          {b}
        </li>
      ))}
    </ul>
  );
}

function ResumeDocument({ data, edits }: { data: ResumeStructured; edits: any[] }) {
  const { contact, summary, experience, education, projects, skills, certifications } = data;

  const contactParts = [
    contact.phone,
    contact.location,
    contact.email,
    ...(contact.links || []),
  ].filter(Boolean);

  return (
    <div style={{
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '11pt',
      color: '#000',
      lineHeight: '1.4',
      width: '8.5in',
      margin: '0 auto',
      padding: '0.5in',
      backgroundColor: '#fff',
      minHeight: '11in',
      boxSizing: 'border-box'
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{
          fontSize: '18pt',
          fontWeight: '700',
          letterSpacing: '1px',
          textTransform: 'uppercase' as const,
          marginBottom: '4px',
        }}>
          {contact.name}
        </div>
        {contactParts.length > 0 && (
          <div style={{ fontSize: '9.5pt', color: '#333' }}>
            {contactParts.join(' \u25c6 ')}
          </div>
        )}
      </div>

      {/* ── Objective / Summary ────────────────────────────────────────────── */}
      {summary && (
        <>
          <SectionHeading title="Objective" />
          <p style={{ fontSize: '11pt', margin: '4px 0 8px 0' }}>{summary}</p>
        </>
      )}

      {/* ── Education ─────────────────────────────────────────────────────── */}
      {education?.length > 0 && (
        <>
          <SectionHeading title="Education" />
          {education.map((e, i) => (
            <div key={i} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '11pt' }}>{e.degree}</span>
                  {e.institution && <span style={{ fontSize: '11pt' }}>, {e.institution}</span>}
                  {e.location && <span style={{ fontSize: '11pt', color: '#444' }}> &mdash; {e.location}</span>}
                </div>
                <DateRange start={e.start_date} end={e.end_date} />
              </div>
              {e.notes && (
                <div style={{ fontSize: '10.5pt', marginTop: '1px' }}>{e.notes}</div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      {skills?.length > 0 && (
        <>
          <SectionHeading title="Skills" />
          <table style={{ borderCollapse: 'collapse', marginBottom: '6px', width: '100%' }}>
            <tbody>
              {skills.map((s, i) => (
                <tr key={i}>
                  <td style={{
                    fontWeight: '700',
                    fontSize: '11pt',
                    paddingRight: '24px',
                    paddingBottom: '2px',
                    verticalAlign: 'top',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {s.category}
                  </td>
                  <td style={{ fontSize: '11pt', paddingBottom: '2px', verticalAlign: 'top' }}>
                    {s.items.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Experience ────────────────────────────────────────────────────── */}
      {experience?.length > 0 && (
        <>
          <SectionHeading title="Experience" />
          {experience.map((e, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: '700', fontSize: '11pt' }}>{e.role}</span>
                <DateRange start={e.start_date} end={e.end_date} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                <span style={{ fontSize: '11pt' }}>{e.company}</span>
                {e.location && <span style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#333' }}>{e.location}</span>}
              </div>
              <BulletList bullets={e.bullets} />
            </div>
          ))}
        </>
      )}

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      {projects?.length > 0 && (
        <>
          <SectionHeading title="Projects" />
          <div style={{ marginBottom: '6px' }}>
            {projects.map((p, i) => (
              <div key={i} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '700', fontSize: '11pt' }}>{p.name}</span>
                  <DateRange start={p.start_date} end={p.end_date} />
                </div>
                {p.tech_stack && (
                  <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444', marginBottom: '1px' }}>
                    {p.tech_stack}
                  </div>
                )}
                <BulletList bullets={p.bullets} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Certifications ────────────────────────────────────────────────── */}
      {certifications?.length > 0 && (
        <>
          <SectionHeading title="Certifications" />
          <ul style={{ margin: '4px 0 6px 18px', padding: 0, listStyleType: 'disc' }}>
            {certifications.map((c, i) => (
              <li key={i} style={{ fontSize: '11pt', marginBottom: '2px' }}>
                <strong>{c.name}</strong>
                {c.issuer && ` — ${c.issuer}`}
                {c.date && ` (${c.date})`}
                {c.notes && <> &mdash; {c.notes}</>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumeTailor({
  applicationId,
  initialContent,
  resumeEdits,
  initialStructuredResume,
}: {
  applicationId: string;
  initialContent: string;
  resumeEdits: any[];
  initialStructuredResume?: ResumeStructured;
}) {
  const [structured, setStructured] = useState<ResumeStructured | null>(initialStructuredResume || null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const resumeW = 816; // 8.5in at 96dpi
      const resumeH = 1056; // 11in at 96dpi
      const scaleX = (width - 40) / resumeW; // 40px margin
      const scaleY = (height - 40) / resumeH;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale, structured]);

  const handleParse = useCallback(async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const data = await apiClient.post(`/applications/${applicationId}/parse-resume`, {});
      setStructured(data as ResumeStructured);
    } catch (err: any) {
      setParseError(err?.message || 'Failed to parse resume. Try again.');
    } finally {
      setIsParsing(false);
    }
  }, [applicationId]);

  const handleExportPDF = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Tailored_Resume',
    pageStyle: `
      @page { size: Letter; margin: 0; }
      body { margin: 0; padding: 0; }
      @media print {
        .print\\:hidden { display: none !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const hasResume = !!initialContent;

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* ── Top: Resume Renderer ────────────────────────────────────────── */}
      <div className="w-full relative border border-outline-variant rounded-xl bg-surface flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-lowest rounded-t-xl shrink-0">
          <span className="text-label-lg font-medium text-on-surface">Resume Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleParse}
              disabled={isParsing || !hasResume}
              title={!hasResume ? 'No resume attached to this job' : 'Apply AI suggestions and format resume'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-high border border-outline-variant text-on-surface text-label-md font-medium hover:bg-surface-container-highest disabled:opacity-50 transition-colors"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isParsing ? 'Applying...' : structured ? 'Re-Apply' : 'Apply Tailoring & Format'}
            </button>
            <button
              onClick={() => handleExportPDF()}
              disabled={!structured}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <FileDown size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-surface-container-low relative flex items-center justify-center p-5 rounded-b-xl aspect-[8.5/11]">
          {parseError && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
              {parseError}
            </div>
          )}

          {!structured && !isParsing && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
                <FileDown size={28} className="text-outline-variant" />
              </div>
              <div className="text-center">
                <p className="font-body-md font-medium text-on-surface mb-1">Preview your resume</p>
                <p className="text-sm text-on-surface-variant">
                  {hasResume
                    ? 'Click "Apply Tailoring & Format" to rewrite your resume using the AI suggestions and structure it into a clean ATS-friendly layout.'
                    : 'No resume attached — re-import this job and select a resume'}
                </p>
              </div>
            </div>
          )}

          {isParsing && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm">AI is rewriting and structuring your resume…</p>
            </div>
          )}

          {structured && !isParsing && (
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <div ref={printRef} className="shadow-2xl border border-outline-variant/30" style={{ width: '8.5in', minHeight: '11in', backgroundColor: '#fff' }}>
                <ResumeDocument data={structured} edits={resumeEdits} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: AI Suggestions ──────────────────────────────────────────── */}
      <div className="w-full flex flex-col border border-outline-variant rounded-xl bg-surface overflow-hidden">
        <div className="p-4 bg-surface-container-lowest border-b border-outline-variant flex items-center gap-2">
          <Sparkles size={18} className="text-tertiary" />
          <h3 className="font-headline-sm text-on-surface">Tailoring Suggestions</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {resumeEdits && resumeEdits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumeEdits.map((edit: any, i: number) => (
                <div key={i} className="bg-surface-container-low border border-outline-variant rounded-lg p-3 shadow-sm hover:border-tertiary/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${edit.type === 'add' ? 'bg-primary/20 text-primary' : edit.type === 'remove' ? 'bg-error/20 text-error' : 'bg-tertiary/20 text-tertiary'}`}>
                      {edit.type}
                    </span>
                    <span className="font-bold text-on-surface text-xs truncate">[{edit.section}]</span>
                  </div>
                  <p className="text-on-surface font-medium text-sm mb-2">{edit.suggestion}</p>
                  <div className="bg-surface-container p-2 rounded text-xs text-on-surface-variant italic border-l-2 border-tertiary/40">
                    <span className="font-semibold not-italic">Why: </span>{edit.reasoning}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm italic text-center py-8">
              Run AI Analysis to generate tailoring suggestions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
