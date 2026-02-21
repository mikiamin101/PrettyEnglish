import { io } from 'socket.io-client'

// In dev, Vite proxies /socket.io to the server.
// In production, both are served from the same origin.
const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 30,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling']
})

export default socket
