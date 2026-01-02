// LOW LATENCY socket connection
const socket = io({
    transports: ['websocket'],
    upgrade: false
});

const statusDiv = document.getElementById('status');
const joystickStick = document.getElementById('joystick-stick');
const joystickBase = document.getElementById('joystick-base');

socket.on('connect', () => {
    statusDiv.textContent = 'Connected ✅ FAST';
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

// Emit state INSTANTLY (volatile = no buffering, no retry)
function emitState() {
    socket.volatile.emit('input', inputState);
}

// =========================================
// JOYSTICK LOGIC
// =========================================
const maxVisualDist = 35;
const maxInputRadius = 65;

joystickBase.addEventListener('touchstart', handleJoystick, { passive: false });
joystickBase.addEventListener('touchmove', handleJoystick, { passive: false });
joystickBase.addEventListener('touchend', resetJoystick, { passive: false });
joystickBase.addEventListener('touchcancel', resetJoystick, { passive: false });

function handleJoystick(e) {
    e.preventDefault();
    const touch = e.targetTouches[0];
    if (!touch) return;

    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const normalizedDist = Math.min(distance / maxInputRadius, 1.0);

    inputState.ls.x = Math.cos(angle) * normalizedDist;
    inputState.ls.y = Math.sin(angle) * normalizedDist;

    const visualDist = Math.min(distance, maxVisualDist);
    const vx = Math.cos(angle) * visualDist;
    const vy = Math.sin(angle) * visualDist;

    joystickStick.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px))`;
    emitState();
}

function resetJoystick(e) {
    if (e) e.preventDefault();
    inputState.ls.x = 0;
    inputState.ls.y = 0;
    joystickStick.style.transform = 'translate(-50%, -50%)';
    emitState();
}

// =========================================
// RIGHT STICK (AIM) LOGIC
// =========================================
const rightZone = document.getElementById('right-zone');
let rsOrigin = null;

rightZone.addEventListener('touchstart', handleAimStart, { passive: false });
rightZone.addEventListener('touchmove', handleAimMove, { passive: false });
rightZone.addEventListener('touchend', resetAim, { passive: false });
rightZone.addEventListener('touchcancel', resetAim, { passive: false });

function handleAimStart(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-btn')) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    rsOrigin = { x: touch.clientX, y: touch.clientY };
}

function handleAimMove(e) {
    if (!rsOrigin) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-btn')) return;

    e.preventDefault();
    const touch = e.changedTouches[0];

    const dx = touch.clientX - rsOrigin.x;
    const dy = touch.clientY - rsOrigin.y;

    const maxDrag = 100;

    let rx = dx / maxDrag;
    let ry = dy / maxDrag;

    rx = Math.max(-1, Math.min(1, rx));
    ry = Math.max(-1, Math.min(1, ry));

    inputState.rs.x = rx;
    inputState.rs.y = ry;
    emitState();
}

function resetAim(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-btn')) return;
    rsOrigin = null;
    inputState.rs.x = 0;
    inputState.rs.y = 0;
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
let isDriveMode = false;
const driveControls = document.getElementById('drive-controls');
const joystickContainer = document.getElementById('joystick-container');
const modeToggle = document.getElementById('mode-toggle');
const steerLeft = document.getElementById('steer-left');
const steerRight = document.getElementById('steer-right');

function toggleDriveMode() {
    isDriveMode = !isDriveMode;

    if (isDriveMode) {
        if (joystickContainer) joystickContainer.style.display = 'none';
        if (driveControls) driveControls.style.display = 'flex';
        if (modeToggle) modeToggle.classList.add('drive-active');
        document.body.classList.add('drive-mode');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } else {
        if (joystickContainer) joystickContainer.style.display = 'flex';
        if (driveControls) driveControls.style.display = 'none';
        if (modeToggle) modeToggle.classList.remove('drive-active');
        document.body.classList.remove('drive-mode');
        if (navigator.vibrate) navigator.vibrate(30);
        inputState.ls.x = 0;
        emitState();
    }
}
window.toggleDriveMode = toggleDriveMode;

// Steer Left
if (steerLeft) {
    steerLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputState.ls.x = -1;
        inputState.ls.y = 0;
        steerLeft.classList.add('pressed');
        emitState();
        if (navigator.vibrate) navigator.vibrate(15);
    }, { passive: false });

    steerLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        inputState.ls.x = 0;
        steerLeft.classList.remove('pressed');
        emitState();
    }, { passive: false });

    steerLeft.addEventListener('touchcancel', () => {
        inputState.ls.x = 0;
        steerLeft.classList.remove('pressed');
        emitState();
    }, { passive: false });
}

// Steer Right
if (steerRight) {
    steerRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputState.ls.x = 1;
        inputState.ls.y = 0;
        steerRight.classList.add('pressed');
        emitState();
        if (navigator.vibrate) navigator.vibrate(15);
    }, { passive: false });

    steerRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        inputState.ls.x = 0;
        steerRight.classList.remove('pressed');
        emitState();
    }, { passive: false });

    steerRight.addEventListener('touchcancel', () => {
        inputState.ls.x = 0;
        steerRight.classList.remove('pressed');
        emitState();
    }, { passive: false });
}
