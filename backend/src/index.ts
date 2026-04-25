import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { initializeWebSocket } from './services/websocket.service';

const server = http.createServer(app);

// Initialize WebSocket server
initializeWebSocket(server);

server.listen(env.PORT, () => {
    console.log(`EduPayTrack backend is running on port ${env.PORT}`);
    console.log(`WebSocket server initialized`);
});
