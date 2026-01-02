const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allow connection from anywhere
        methods: ["GET", "POST"]
    }
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Socket.io handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Relay input events from Phone to Extension
    socket.on('input', (data) => {
        // Broadcast to all other clients (which includes the Extension)
        socket.broadcast.emit('mobile-input', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Use environment PORT for cloud deployment, fallback to 3000 for local
const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== XBOX MOBILE CONTROLLER SERVER ===`);
    console.log(`Server running on port: ${PORT}`);
    console.log(`=====================================\n`);
});
