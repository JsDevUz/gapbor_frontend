import { io } from "socket.io-client";
import { getKey } from "./storage";

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_PUBLIC_SERVER_URL;

export const socket = io(URL, {
  query: { token: `Bearer ${getKey("token")}` },
  
  // Performance optimizatsiyalari
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  
  // Timeout sozlamalari
  timeout: 10000,
  
  // Transport optimizatsiyalari
  transports: ['websocket', 'polling'],
  
  // Buffer sozlamalari
  maxHttpBufferSize: 1e6, // 1MB
  
  // Ping sozlamalari
  pingInterval: 25000,
  pingTimeout: 5000,
  
  // Upgrade sozlamalari
  upgrade: true,
  rememberUpgrade: true,
});
