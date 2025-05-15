import { Notification } from '../components/NotificationSystem';

type WebSocketEventHandlers = {
  onNotification?: (notification: Notification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Event) => void;
};

/**
 * WebSocket service for real-time notifications
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private handlers: WebSocketEventHandlers = {};
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor() {
    // Use environment variable for WebSocket URL or fallback to API URL converted to WebSocket
    this.url = import.meta.env.VITE_WEBSOCKET_URL || 
      (import.meta.env.VITE_API_URL || '')
        .replace('http://', 'ws://')
        .replace('https://', 'wss://') + '/ws';
  }
  
  /**
   * Connect to the WebSocket server
   * @param token Authentication token
   * @param handlers Event handlers
   */
  connect(token: string, handlers: WebSocketEventHandlers = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    this.token = token;
    this.handlers = { ...this.handlers, ...handlers };
    
    try {
      // Append token to WebSocket URL for authentication
      const wsUrl = `${this.url}?token=${token}`;
      this.socket = new WebSocket(wsUrl);
      
      this.socket.addEventListener('open', this.handleOpen);
      this.socket.addEventListener('message', this.handleMessage);
      this.socket.addEventListener('close', this.handleClose);
      this.socket.addEventListener('error', this.handleError);
      
      console.log('WebSocket connecting...');
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.reconnectAttempts = 0;
    console.log('WebSocket disconnected');
  }
  
  private handleOpen = () => {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(true);
    }
  };
  
  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle notification events
      if (data.type === 'notification' && this.handlers.onNotification) {
        this.handlers.onNotification(data.payload);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  private handleClose = () => {
    console.log('WebSocket connection closed');
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(false);
    }
    this.scheduleReconnect();
  };
  
  private handleError = (error: Event) => {
    console.error('WebSocket error:', error);
    if (this.handlers.onError) {
      this.handlers.onError(error);
    }
  };
  
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, giving up');
      return;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.token) {
        this.connect(this.token, this.handlers);
      }
    }, delay);
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 