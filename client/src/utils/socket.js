import { io } from 'socket.io-client'

// In dev, Vite proxies /socket.io to the server.
// In production, both are served from the same origin.
const socket = io({
  autoConnect: false,
  transports: ['websocket', 'polling']
})

export default socket
