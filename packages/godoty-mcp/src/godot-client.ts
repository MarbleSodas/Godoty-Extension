import WebSocket from 'ws';

interface GodotClientConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class GodotClient {
  private config: GodotClientConfig;
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  private connected = false;
  private reconnecting = false;

  constructor(config: GodotClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnecting = false;
          console.error('Connected to Godot');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          this.connected = false;
          console.error('Disconnected from Godot');
          if (this.config.reconnect && !this.reconnecting) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
          if (!this.connected) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.config.reconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Godot');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle response
      if ('id' in message && message.id !== null) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      }

      // Handle notification/event
      if ('method' in message && !('id' in message)) {
        this.handleEvent(message.method, message.params);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleEvent(method: string, params: unknown): void {
    // Handle Godot events (errors, selection changes, etc.)
    console.error(`Godot event: ${method}`, params);
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    console.error(`Reconnecting in ${this.config.reconnectInterval}ms...`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, this.config.reconnectInterval);
  }
}
