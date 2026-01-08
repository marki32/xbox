const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Cloud-compatible settings
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files
app.use(express.static('public'));

// Health check for Render
app.get('/health', (req, res) => res.status(200).send('OK'));

// Socket.io - Fast relay
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Instant relay
    socket.on('input', (data) => {
        socket.broadcast.emit('mobile-input', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

const os = require('os');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`\n==================================================`);
    console.log(`🚀 SERVER RUNNING! NO MORE RENDER TIMEOUTS!`);
    console.log(`👉 PC/Xbox Extension Connect to: http://localhost:${PORT}`);
    console.log(`👉 PHONE Connect to: http://${localIp}:${PORT}`);
    console.log(`==================================================\n`);
});
