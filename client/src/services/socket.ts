import type { WsEvent } from '../types.js';

type Listener = (payload: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    let wsUrl: string;
    if (rawApiUrl) {
      const wsProtocol = rawApiUrl.startsWith('https:') ? 'wss:' : 'ws:';
      const host = rawApiUrl.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${host}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Authenticate socket
      this.send('auth:identify', { token: this.token });

      // Start presence heartbeat every 25 seconds
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = window.setInterval(() => {
        this.send('presence:heartbeat', {});
      }, 25000);
    };

    this.ws.onmessage = (event) => {
      try {
        const { type, payload }: WsEvent = JSON.parse(event.data);
        const callbacks = this.listeners.get(type);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
      } catch (err) {
        console.error('Socket parse error:', err);
      }
    };

    this.ws.onclose = () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      // Attempt reconnect if still authenticated
      if (this.token) {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect(this.token!);
        }, 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('WebSocket encountered error:', err);
    };
  }

  disconnect() {
    this.token = null;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(type: string, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.off(type, listener);
  }

  off(type: string, listener: Listener) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.delete(listener);
    }
  }
}

export const socket = new SocketService();
