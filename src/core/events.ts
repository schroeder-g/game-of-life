// A simple event emitter (pub/sub)
type Listener<T> = (payload: T) => void;

export class Emitter<E extends Record<string, unknown>> {
  private listeners: { [K in keyof E]?: Array<Listener<E[K]>> } = {};

  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    return () => this.off(event, listener); // Return an unsubscribe function
  }

  off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((l) => l !== listener);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach((listener) => listener(payload));
  }
}
