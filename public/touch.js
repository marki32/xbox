const socket = io();

const statusDiv = document.getElementById('status');

socket.on('connect', () => {
    statusDiv.textContent = 'Connected ✅';
    statusDiv.style.background = 'rgba(16, 124, 16, 0.3)';
    statusDiv.style.borderColor = 'rgba(16, 124, 16, 0.5)';
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'Disconnected ❌';
    statusDiv.style.background = 'rgba(232, 17, 35, 0.3)';
    statusDiv.style.borderColor = 'rgba(232, 17, 35, 0.5)';
});

// INPUT STATE
const inputState = {
    ls: { x: 0, y: 0 },
    rs: { x: 0, y: 0 },
    buttons: {}
};

// Emit state to server
function emitState() {
    socket.emit('input', inputState);
}

// =========================================
// FLOATING JOYSTICK LOGIC (Left & Right via Zones)
// =========================================
const maxVisualDist = 35;
const maxInputRadius = 65;

const leftZone = document.getElementById('left-zone');
const rightZone = document.getElementById('right-zone');

const leftContainer = document.getElementById('joystick-container');
const rightContainer = document.getElementById('right-joystick-container');

const leftBase = document.getElementById('joystick-base');
const rightBase = document.getElementById('right-joystick-base');

const leftStick = document.getElementById('joystick-stick');
const rightStick = document.getElementById('right-joystick-stick');

// Track active touches
let leftTouchId = null;
let rightTouchId = null;
let leftCenter = { x: 0, y: 0 };
let rightCenter = { x: 0, y: 0 };

// --- LEFT ZONE HANDLERS ---
leftZone.addEventListener('touchstart', (e) => {
    // Ignore if touching a specific button, D-Pad, or Drive Controls
    if (e.target.tagName === 'BUTTON' ||
        e.target.closest('.dpad') ||
        e.target.closest('.drive-controls')) return;

    // DISABLE FLOATING JOYSTICK IN DRIVE MODE
    if (isDriveMode) return;

    e.preventDefault();
    // Only accept one touch for stick
    if (leftTouchId !== null) return;

    const touch = e.changedTouches[0];
    leftTouchId = touch.identifier;

    // Set Center
    leftCenter = { x: touch.clientX, y: touch.clientY };

    // Show Joystick at touch position
    // We offset by half width/height to center it
    // Base is approx 130px -> 65px offset
    // But we position the CONTAINER. Container has L3 button too. 
    // Let's position the BASE center at finger.
    // Container top-left = finger - (base_width/2)

    // We'll just position the container such that the stick area is under finger
    // rect is expensive, let's just assume centering.
    leftContainer.style.display = 'flex';
    leftContainer.style.left = (touch.clientX - 65) + 'px';
    leftContainer.style.top = (touch.clientY - 65) + 'px';

    // Reset stick visual
    leftStick.style.transform = 'translate(-50%, -50%)';

    // Initial State = 0
    inputState.ls.x = 0;
    inputState.ls.y = 0;
    emitState();
}, { passive: false });

leftZone.addEventListener('touchmove', (e) => {
    if (leftTouchId === null) return;
    e.preventDefault();

    // Find our touch
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === leftTouchId) {
            const touch = e.changedTouches[i];
            updateJoystick(touch, leftCenter, leftStick, 'ls');
            break;
        }
    }
}, { passive: false });

const endLeft = (e) => {
    if (leftTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === leftTouchId) {
            leftTouchId = null;
            leftContainer.style.display = 'none';
            inputState.ls.x = 0; inputState.ls.y = 0;
            emitState();
            break;
        }
    }
};
leftZone.addEventListener('touchend', endLeft);
leftZone.addEventListener('touchcancel', endLeft);


// --- RIGHT ZONE HANDLERS ---
rightZone.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-buttons')) return;

    e.preventDefault();
    if (rightTouchId !== null) return;

    const touch = e.changedTouches[0];
    rightTouchId = touch.identifier;
    rightCenter = { x: touch.clientX, y: touch.clientY };

    rightContainer.style.display = 'flex';
    rightContainer.style.left = (touch.clientX - 65) + 'px'; // Assuming same size
    rightContainer.style.top = (touch.clientY - 65) + 'px';

    rightStick.style.transform = 'translate(-50%, -50%)';
    inputState.rs.x = 0; inputState.rs.y = 0;
    emitState();
}, { passive: false });

rightZone.addEventListener('touchmove', (e) => {
    if (rightTouchId === null) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rightTouchId) {
            const touch = e.changedTouches[i];
            updateJoystick(touch, rightCenter, rightStick, 'rs');
            break;
        }
    }
}, { passive: false });

const endRight = (e) => {
    if (rightTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rightTouchId) {
            rightTouchId = null;
            rightContainer.style.display = 'none';
            inputState.rs.x = 0; inputState.rs.y = 0;
            emitState();
            break;
        }
    }
};
rightZone.addEventListener('touchend', endRight);
rightZone.addEventListener('touchcancel', endRight);


// --- SHARED CALC FUNCTION ---
function updateJoystick(touch, center, stickElement, inputKey) {
    const dx = touch.clientX - center.x;
    const dy = touch.clientY - center.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const normalizedDist = Math.min(distance / maxInputRadius, 1.0);

    inputState[inputKey].x = Math.cos(angle) * normalizedDist;
    inputState[inputKey].y = Math.sin(angle) * normalizedDist;

    const visualDist = Math.min(distance, maxVisualDist);
    const vx = Math.cos(angle) * visualDist;
    const vy = Math.sin(angle) * visualDist;

    stickElement.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px))`;
    emitState();
}

// =========================================
// BUTTON LOGIC
// =========================================
const buttons = document.querySelectorAll('button[data-key]');

buttons.forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const key = btn.dataset.key;
        if (key) {
            inputState.buttons[key] = true;
            btn.classList.add('pressed');
            emitState();
            if (navigator.vibrate) navigator.vibrate(10);
        }
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        const key = btn.dataset.key;
        if (key) {
            inputState.buttons[key] = false;
            btn.classList.remove('pressed');
            emitState();
        }
    }, { passive: false });
});

// =========================================
// DRIVE MODE - SIMPLE LEFT/RIGHT BUTTONS
// =========================================
// =========================================
// DRIVE MODE - 4-BUTTON STEERING PAD
// =========================================
let isDriveMode = false;
const driveControls = document.getElementById('drive-controls');
const joystickContainer = document.getElementById('joystick-container');
const modeToggle = document.getElementById('mode-toggle');

const btnSteerL = document.getElementById('steer-left');
const btnSteerR = document.getElementById('steer-right');
const btnQuickL = document.getElementById('q-steer-left');
const btnQuickR = document.getElementById('q-steer-right');

const dpad = document.querySelector('.dpad');

function toggleDriveMode() {
    isDriveMode = !isDriveMode;

    if (isDriveMode) {
        if (joystickContainer) joystickContainer.style.display = 'none';
        if (dpad) dpad.style.display = 'none'; // Hide D-Pad
        if (driveControls) driveControls.style.display = 'flex';
        if (modeToggle) modeToggle.classList.add('drive-active');
        document.body.classList.add('drive-mode');
    } else {
        if (joystickContainer) joystickContainer.style.display = 'flex';
        if (dpad) dpad.style.display = 'grid'; // Restore D-Pad
        if (driveControls) driveControls.style.display = 'none';
        if (modeToggle) modeToggle.classList.remove('drive-active');
        document.body.classList.remove('drive-mode');
        inputState.ls.x = 0;
        emitState();
    }
}
window.toggleDriveMode = toggleDriveMode;

// Helper to attach steering logic
function attachSteer(btn, value) {
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputState.ls.x = value;
        inputState.ls.y = 0;
        btn.classList.add('pressed');
        emitState();
    }, { passive: false });

    const stop = (e) => {
        if (e) e.preventDefault();
        inputState.ls.x = 0;
        btn.classList.remove('pressed');
        emitState();
    };

    btn.addEventListener('touchend', stop, { passive: false });
    btn.addEventListener('touchcancel', stop, { passive: false });
}

// Attach all 4 buttons
attachSteer(btnSteerL, -0.7);
attachSteer(btnSteerR, 0.7);
attachSteer(btnQuickL, -1.0);
attachSteer(btnQuickR, 1.0);
