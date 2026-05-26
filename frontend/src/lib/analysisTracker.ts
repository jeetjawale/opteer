import { analyzeApplication } from "./api";

type AnalysisStatus = "idle" | "analyzing" | "completed" | "failed";

interface AnalysisUpdate {
  id: string;
  status: AnalysisStatus;
  error?: string;
}

type Listener = (update: AnalysisUpdate) => void;

class AnalysisTracker {
  private activeAnalyses = new Set<string>();
  private analysisPromises = new Map<string, Promise<any>>();
  private listeners = new Set<Listener>();

  /**
   * Check if a specific application ID is currently being analyzed.
   */
  isAnalyzing(id: string): boolean {
    return this.activeAnalyses.has(id);
  }

  /**
   * Triggers the analysis for an application ID. If an analysis for this ID is already
   * in progress, returns the existing promise instead of starting a duplicate fetch.
   */
  async performAnalysis(id: string): Promise<any> {
    if (this.analysisPromises.has(id)) {
      return this.analysisPromises.get(id);
    }

    this.activeAnalyses.add(id);
    this.notify(id, "analyzing");

    const promise = (async () => {
      try {
        const result = await analyzeApplication(id);
        this.activeAnalyses.delete(id);
        this.analysisPromises.delete(id);
        this.notify(id, "completed");
        return result;
      } catch (err: any) {
        this.activeAnalyses.delete(id);
        this.analysisPromises.delete(id);
        const errMsg = err.message || String(err);
        this.notify(id, "failed", errMsg);
        throw err;
      }
    })();

    this.analysisPromises.set(id, promise);
    return promise;
  }

  /**
   * Subscribe to analysis status updates. Returns an unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(id: string, status: AnalysisStatus, error?: string) {
    const update: AnalysisUpdate = { id, status, error };
    this.listeners.forEach((listener) => {
      try {
        listener(update);
      } catch (e) {
        console.error("Error in analysisTracker listener:", e);
      }
    });
  }
}

export const analysisTracker = new AnalysisTracker();
