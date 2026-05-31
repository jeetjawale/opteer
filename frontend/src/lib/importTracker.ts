type Listener = (count: number) => void;

class ImportTracker {
  private count = 0;
  private listeners = new Set<Listener>();

  setCount(newCount: number) {
    this.count = newCount;
    this.notify();
  }

  decrementCount() {
    this.count = Math.max(0, this.count - 1);
    this.notify();
  }

  getCount() {
    return this.count;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.count);
      } catch (e) {
        console.error("Error in importTracker listener:", e);
      }
    });
  }
}

export const importTracker = new ImportTracker();
