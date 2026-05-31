import { DemoAction } from "./types";
import { demoTiming } from "./timing";

export const mainOnboardingSequence: DemoAction[] = [
  // Intro - Empty Dashboard
  { type: 'spotlight', targetDemoId: 'dashboard-stats', durationMs: 0 },
  { type: 'moveCursor', targetDemoId: 'dashboard-stats', durationMs: demoTiming.cursorTravelLong },
  { type: 'bubble', targetDemoId: 'dashboard-stats', text: 'Track every application in one place.', durationMs: demoTiming.bubbleReadTimeLong },
  
  // Move to Import
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'import-job-btn', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'import-job-btn', durationMs: demoTiming.cursorTravelMedium },
  { type: 'clickPulse', targetDemoId: 'import-job-btn', durationMs: demoTiming.clickPulse },
  
  // Open Fake Import Modal
  { type: 'fakeState', statePayload: { activeModal: 'import', importState: { autoAnalyze: false, saveResume: false, isBulk: false } }, durationMs: 400 },
  
  // Show Single Job Tab
  { type: 'spotlight', targetDemoId: 'fake-import-single', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-single', durationMs: demoTiming.cursorTravelShort },
  { type: 'bubble', targetDemoId: 'fake-import-single', text: 'Import a single job by pasting its URL...', durationMs: demoTiming.bubbleReadTimeLong },

  // Show Bulk Import Tab
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-bulk', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-bulk', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-bulk', durationMs: demoTiming.clickPulse },
  { type: 'fakeState', statePayload: { activeModal: 'import', importState: { autoAnalyze: false, saveResume: false, isBulk: true } }, durationMs: 400 },
  { type: 'bubble', targetDemoId: 'fake-import-bulk', text: '...or switch to Bulk Import to queue up to 50 URLs at once.', durationMs: demoTiming.bubbleReadTimeLong },
  
  // Type Bulk URLs
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-bulk-input', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-bulk-input', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-bulk-input', durationMs: demoTiming.clickPulse },
  { type: 'typeText', targetDemoId: 'fake-import-bulk-input', text: 'https://boards.greenhouse.io/stripe/123\nhttps://jobs.lever.co/netflix/456\nhttps://jobs.ashbyhq.com/altzen/789', durationMs: 2500 },

  // Switch back to Single Job
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-single', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-single', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-single', durationMs: demoTiming.clickPulse },
  { type: 'fakeState', statePayload: { activeModal: 'import', importState: { autoAnalyze: false, saveResume: false, isBulk: false } }, durationMs: 400 },

  // Typing the URL
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-input', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-input', durationMs: demoTiming.cursorTravelMedium },
  { type: 'clickPulse', targetDemoId: 'fake-import-input', durationMs: demoTiming.clickPulse },
  { type: 'typeText', targetDemoId: 'fake-import-input', text: 'https://jobs.ashbyhq.com/altzen/1234', durationMs: 1200 },
  { type: 'bubble', targetDemoId: 'fake-import-input', text: 'Just paste the job posting link from any modern ATS.', durationMs: demoTiming.bubbleReadTimeLong },
  
  // Show Resume Selection
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-resume', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-resume', durationMs: demoTiming.cursorTravelMedium },
  { type: 'bubble', targetDemoId: 'fake-import-resume', text: 'Upload or paste your resume text to match against the job requirements.', durationMs: demoTiming.bubbleReadTimeLong },

  // Click Save Resume
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-save-resume', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-save-resume', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-save-resume', durationMs: demoTiming.clickPulse },
  { type: 'fakeState', statePayload: { activeModal: 'import', importState: { autoAnalyze: false, saveResume: true, isBulk: false } }, durationMs: 400 },
  { type: 'bubble', targetDemoId: 'fake-import-save-resume', text: 'Save it to your profile so you don\'t have to upload it again next time.', durationMs: demoTiming.bubbleReadTimeLong },

  // Show Auto-analyze
  { type: 'hideBubble', durationMs: 200 },
  { type: 'spotlight', targetDemoId: 'fake-import-auto-analyze', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-import-auto-analyze', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-auto-analyze', durationMs: demoTiming.clickPulse },
  { type: 'fakeState', statePayload: { activeModal: 'import', importState: { autoAnalyze: true, saveResume: true, isBulk: false } }, durationMs: 400 },
  { type: 'bubble', targetDemoId: 'fake-import-auto-analyze', text: 'Queue the AI immediately after importing to automatically generate your fit score.', durationMs: demoTiming.bubbleReadTimeLong },
  
  // Click submit
  { type: 'hideBubble', durationMs: 200 },
  { type: 'moveCursor', targetDemoId: 'fake-import-submit', durationMs: demoTiming.cursorTravelShort },
  { type: 'clickPulse', targetDemoId: 'fake-import-submit', durationMs: demoTiming.clickPulse },
  
  // Show Async Progress Panel Fake State
  { type: 'fakeState', statePayload: { activeModal: null, activePanel: 'async', asyncStage: 'Extracting requirements...' }, durationMs: 500 },
  { type: 'spotlight', targetDemoId: 'fake-async-panel', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'fake-async-panel', durationMs: demoTiming.cursorTravelMedium },
  { type: 'bubble', targetDemoId: 'fake-async-panel', text: 'The AI worker runs in the background — you can keep browsing while it analyzes.', durationMs: demoTiming.bubbleReadTimeLong },
  
  // Simulate stages
  { type: 'hideBubble', durationMs: 200 },
  { type: 'fakeState', statePayload: { activePanel: 'async', asyncStage: 'Matching experience...' }, durationMs: 1200 },
  { type: 'fakeState', statePayload: { activePanel: 'async', asyncStage: 'Generating insights...' }, durationMs: 1200 },
  { type: 'fakeState', statePayload: { activePanel: 'async', asyncStage: 'Scoring candidate alignment...' }, durationMs: 1200 },
  
  // Show Fake Completed App in Dashboard
  { type: 'hideSpotlight', durationMs: 300 },
  { type: 'fakeState', statePayload: { showFakeApp: true, activePanel: null }, durationMs: 500 },
  
  // End Sequence
  { type: 'spotlight', targetDemoId: 'import-job-btn', durationMs: demoTiming.spotlightTransition },
  { type: 'moveCursor', targetDemoId: 'import-job-btn', durationMs: demoTiming.cursorTravelShort },
  { type: 'bubble', targetDemoId: 'import-job-btn', text: "Done! A 92% fit score and full analysis — ready instantly. Now it's your turn.", durationMs: demoTiming.bubbleReadTimeLong },
];
