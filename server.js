const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // LOW LATENCY SETTINGS
    pingTimeout: 5000,
    pingInterval: 1000,
    transports: ['websocket'], // Skip polling, go straight to websocket
    allowUpgrades: false
});
const ip = require('ip');

// Serve static files
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Socket.io - FAST relay
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Instant relay - no processing delay
    socket.on('input', (data) => {
        socket.broadcast.volatile.emit('mobile-input', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const IP_ADDRESS = ip.address();

http.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║   XBOX MOBILE CONTROLLER - FAST MODE   ║`);
    console.log(`╠════════════════════════════════════════╣`);
    console.log(`║  Open on PHONE: http://${IP_ADDRESS}:${PORT}`);
    console.log(`╚════════════════════════════════════════╝\n`);
});
