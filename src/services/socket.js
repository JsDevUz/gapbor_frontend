import { io } from "socket.io-client";
import { getKey } from "./storage";

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_PUBLIC_SERVER_URL;

export const socket = io(URL, {
  query: { token: `Bearer ${getKey("token")}` },

  autoConnect: false,
});
