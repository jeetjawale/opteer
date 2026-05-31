"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Import, FilePlus2, Layers, Upload, X } from "lucide-react";
import { DemoAction } from "@/lib/demo/types";
import { mainOnboardingSequence } from "@/lib/demo/sequences";
import { getDuration, defaultDemoConfig } from "@/lib/demo/timing";

import DemoCursor from "./DemoCursor";
import SpotlightOverlay from "./SpotlightOverlay";
import GuidedBubble from "./GuidedBubble";

interface DemoSequenceEngineProps {
  onComplete: () => void;
  onSkip: () => void;
}

// These are mock overlay components to render fake visual states during the demo
function FakeImportModal({ active, statePayload }: { active: boolean; statePayload?: any }) {
  if (!active) return null;
  
  const importState = statePayload?.importState || {
    isBulk: false,
    saveResume: false,
    autoAnalyze: false
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-none">
      <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_25px_50px_-12px_rgba(0,0,0,0.5)] relative flex flex-col max-h-[90vh]">
        <button className="absolute top-4 right-4 text-zinc-500">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-white text-lg font-bold mb-5 flex items-center space-x-2">
          <Import className="w-5 h-5 text-white" />
          <span>Import a job posting</span>
        </h2>

        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
          <div className="space-y-4">
            
            <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
              <button data-demo-id="fake-import-single" className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 ${!importState.isBulk ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                <FilePlus2 className="w-4 h-4" />
                <span>Single Job</span>
              </button>
              <button data-demo-id="fake-import-bulk" className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 ${importState.isBulk ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                <Layers className="w-4 h-4" />
                <span>Bulk Import</span>
              </button>
            </div>

            <div className={importState.isBulk ? 'hidden' : 'block'}>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Job URL
              </label>
              <input
                data-demo-id="fake-import-input"
                type="url"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm"
                placeholder="https://www.workatastartup.com/jobs/64551"
              />
            </div>

            <div className={!importState.isBulk ? 'hidden' : 'space-y-2'}>
              <div className="flex items-center justify-between">
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Job URLs (One per line)
                </label>
              </div>
              <textarea
                data-demo-id="fake-import-bulk-input"
                key={importState.isBulk ? 'bulk-active' : 'bulk-inactive'}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none custom-scrollbar"
                placeholder="https://company.com/job/1&#10;https://company.com/job/2&#10;https://company.com/job/3"
                defaultValue=""
              />
              <p className="text-xs text-zinc-500">
                Paste up to 50 URLs. We will import them into your queue sequentially.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  Resume Selection
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Upload (PDF, DOCX, TXT, LaTeX) or paste text:
                  </span>
                  <label data-demo-id="fake-import-resume" className="text-[11px] bg-zinc-800 text-white px-2.5 py-1 rounded-lg border border-zinc-700 font-semibold flex items-center space-x-1.5">
                    <Upload className="w-3 h-3 text-zinc-400" />
                    <span>Upload File</span>
                  </label>
                </div>
                
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm resize-none"
                  placeholder="Paste your professional resume text here or upload a file..."
                  readOnly
                />

                <div className="space-y-2 pt-1">
                  <label className="flex items-center space-x-2.5 select-none">
                    <input
                      data-demo-id="fake-import-save-resume"
                      type="checkbox"
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-[#6C3CE1]"
                      readOnly
                      checked={importState.saveResume}
                    />
                    <span className="text-zinc-400 text-xs font-semibold">Save this resume for future imports</span>
                  </label>
                  {!importState.isBulk && (
                    <label className="flex items-center space-x-2.5 select-none">
                      <input
                        data-demo-id="fake-import-auto-analyze"
                        type="checkbox"
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-[#6C3CE1]"
                        readOnly
                        checked={importState.autoAnalyze}
                      />
                      <span className="text-zinc-400 text-xs font-semibold">Auto-analyze after import</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 font-semibold text-sm">
                Cancel
              </button>
              <button
                data-demo-id="fake-import-submit"
                className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-sm"
              >
                {importState.isBulk ? "Import 3 Jobs" : (importState.autoAnalyze ? "Import & Analyze" : "Import Job")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeAsyncPanel({ active, stage }: { active: boolean; stage: string }) {
  if (!active) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[85] pointer-events-none" data-demo-id="fake-async-panel">
      <div className="bg-surface border border-border-default shadow-xl rounded-xl p-4 w-72 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white uppercase tracking-wider">AI Analysis</span>
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-primary">{stage || 'Processing...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeAppRow({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed z-[85] pointer-events-none mt-[160px] max-w-7xl mx-auto w-full px-8 left-0 right-0">
      <div className="bg-surface border border-border-default hover:border-border-strong rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
         <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
             <span className="text-white font-bold">A</span>
           </div>
           <div>
             <h3 className="font-bold text-primary">Senior Software Engineer</h3>
             <p className="text-sm text-secondary">Altzen Technologies</p>
           </div>
         </div>
         <div className="flex items-center gap-8">
           <div className="flex flex-col">
             <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Fit Score</span>
             <div className="flex items-center gap-2">
               <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                 <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
               </div>
               <span className="text-sm font-bold text-primary">92%</span>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}


export default function DemoSequenceEngine({ onComplete, onSkip }: DemoSequenceEngineProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // UI State
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isCursorClicking, setIsCursorClicking] = useState(false);
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  
  const [spotlightRect, setSpotlightRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isSpotlightVisible, setIsSpotlightVisible] = useState(false);
  
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  
  const [fakeState, setFakeState] = useState<any>({});

  const shouldReduceMotion = useReducedMotion() ?? false;
  
  // Update target rect continuously to handle resizing/layout shifts
  const [targetDemoId, setTargetDemoId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!targetDemoId) return;
    const interval = setInterval(() => {
      const el = document.querySelector(`[data-demo-id="${targetDemoId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
        // Only update cursor continuously if not moving
      }
    }, 100);
    return () => clearInterval(interval);
  }, [targetDemoId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const playNextAction = async () => {
      if (currentStepIndex >= mainOnboardingSequence.length) {
        onComplete();
        return;
      }

      const action = mainOnboardingSequence[currentStepIndex];
      const duration = getDuration(action.durationMs || 0, defaultDemoConfig);
      
      let rect: DOMRect | null = null;
      if (action.targetDemoId) {
        const el = document.querySelector(`[data-demo-id="${action.targetDemoId}"]`);
        if (el) {
          rect = el.getBoundingClientRect();
          setTargetDemoId(action.targetDemoId);
        }
      }

      switch (action.type) {
        case 'moveCursor':
          if (rect) {
            setIsCursorVisible(true);
            setCursorPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }
          break;
        case 'clickPulse':
          setIsCursorClicking(true);
          setTimeout(() => setIsCursorClicking(false), duration);
          break;
        case 'spotlight':
          if (rect) {
            setSpotlightRect({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
            setIsSpotlightVisible(true);
          }
          break;
        case 'hideSpotlight':
          setIsSpotlightVisible(false);
          setTargetDemoId(null);
          break;
        case 'bubble':
          if (action.text) {
            setBubbleText(action.text);
            setIsBubbleVisible(true);
          }
          break;
        case 'hideBubble':
          setIsBubbleVisible(false);
          break;
        case 'typeText':
          if (action.targetDemoId && action.text) {
            const el = document.querySelector(`[data-demo-id="${action.targetDemoId}"]`) as HTMLInputElement;
            if (el) {
              if (shouldReduceMotion) {
                el.value = action.text;
              } else {
                let charIdx = 0;
                const typeChar = () => {
                  if (charIdx < action.text!.length) {
                    el.value += action.text![charIdx];
                    charIdx++;
                    setTimeout(typeChar, duration / action.text!.length);
                  }
                };
                el.value = '';
                typeChar();
              }
            }
          }
          break;
        case 'fakeState':
          if (action.statePayload) {
            // If switching scene (modal→panel), do a full replace to avoid bleed
            if (action.statePayload.activeModal === null || action.statePayload.activePanel) {
              setFakeState(action.statePayload);
            } else {
              setFakeState((prev: any) => ({ ...prev, ...action.statePayload }));
            }
          }
          break;
        case 'wait':
        default:
          break;
      }

      timeout = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, duration);
    };

    playNextAction();

    return () => clearTimeout(timeout);
  }, [currentStepIndex, shouldReduceMotion]);

  return (
    <>
      <FakeImportModal active={fakeState.activeModal === 'import'} statePayload={fakeState} />
      <FakeAsyncPanel active={fakeState.activePanel === 'async'} stage={fakeState.asyncStage} />
      <FakeAppRow active={fakeState.showFakeApp} />

      <SpotlightOverlay 
        x={spotlightRect.x} 
        y={spotlightRect.y} 
        width={spotlightRect.w} 
        height={spotlightRect.h} 
        isVisible={isSpotlightVisible}
        reducedMotion={shouldReduceMotion}
      />
      
      <GuidedBubble
        x={spotlightRect.x} 
        y={spotlightRect.y} 
        width={spotlightRect.w} 
        height={spotlightRect.h} 
        text={bubbleText}
        isVisible={isBubbleVisible}
        reducedMotion={shouldReduceMotion}
      />
      
      <DemoCursor 
        x={cursorPos.x} 
        y={cursorPos.y} 
        isClicking={isCursorClicking}
        isVisible={isCursorVisible}
        reducedMotion={shouldReduceMotion}
      />
      
      {/* Skip Button - Always available and clickable */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <button 
          onClick={onSkip}
          className="px-4 py-2 bg-surface border border-border-default text-xs font-bold text-secondary hover:text-primary rounded-lg shadow-lg pointer-events-auto transition-colors"
        >
          Skip Demo
        </button>
      </div>
    </>
  );
}
