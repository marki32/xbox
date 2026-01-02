const socket = io();

const statusDiv = document.getElementById('status');
const joystickStick = document.getElementById('joystick-stick');
const joystickBase = document.getElementById('joystick-base');

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
// JOYSTICK LOGIC (Dynamic Center Calculation)
// =========================================
const maxVisualDist = 35; // Max visual travel of stick
const maxInputRadius = 65; // Radius for full input

joystickBase.addEventListener('touchstart', handleJoystick, { passive: false });
joystickBase.addEventListener('touchmove', handleJoystick, { passive: false });
joystickBase.addEventListener('touchend', resetJoystick, { passive: false });
joystickBase.addEventListener('touchcancel', resetJoystick, { passive: false });

function handleJoystick(e) {
    e.preventDefault();
    const touch = e.targetTouches[0];
    if (!touch) return;

    // Recalculate center each time for reliability
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    // Calculate distance and angle
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Normalize input to -1..1
    const normalizedDist = Math.min(distance / maxInputRadius, 1.0);

    inputState.ls.x = Math.cos(angle) * normalizedDist;
    inputState.ls.y = Math.sin(angle) * normalizedDist;

    // Visual update (clamped to maxVisualDist)
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
    joystickStick.style.transform = `translate(-50%, -50%)`;
    emitState();
}

// =========================================
// RIGHT STICK (AIM) LOGIC WITH CROSSHAIR
// =========================================
const rightZone = document.getElementById('right-zone');
const aimCrosshair = document.getElementById('aim-crosshair');
let rsOrigin = null; // {x, y} of touch start
let aimSensitivity = 10; // Default sensitivity (1-20)

rightZone.addEventListener('touchstart', handleAimStart, { passive: false });
rightZone.addEventListener('touchmove', handleAimMove, { passive: false });
rightZone.addEventListener('touchend', resetAim, { passive: false });
rightZone.addEventListener('touchcancel', resetAim, { passive: false });

function handleAimStart(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.menu-btn') || e.target.closest('.face-btn')) return;

    e.preventDefault();
    const touch = e.changedTouches[0];
    rsOrigin = { x: touch.clientX, y: touch.clientY };

    // Show and position crosshair
    if (aimCrosshair) {
        aimCrosshair.classList.add('active');
        moveCrosshair(touch.clientX, touch.clientY);
    }
}

function handleAimMove(e) {
    if (!rsOrigin) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-btn')) return;

    e.preventDefault();
    const touch = e.changedTouches[0];

    const dx = touch.clientX - rsOrigin.x;
    const dy = touch.clientY - rsOrigin.y;

    // Max drag distance scaled by sensitivity
    const maxDrag = 150 - (aimSensitivity * 5); // Lower = more sensitive

    let rx = dx / maxDrag;
    let ry = dy / maxDrag;

    // Clamp
    rx = Math.max(-1, Math.min(1, rx));
    ry = Math.max(-1, Math.min(1, ry));

    inputState.rs.x = rx;
    inputState.rs.y = ry;

    // Move crosshair
    if (aimCrosshair) {
        moveCrosshair(touch.clientX, touch.clientY);
    }

    emitState();
}

function moveCrosshair(x, y) {
    if (!aimCrosshair) return;
    const rect = rightZone.getBoundingClientRect();
    // Position relative to rightZone, centered on finger
    aimCrosshair.style.left = (x - rect.left - 30) + 'px';
    aimCrosshair.style.top = (y - rect.top - 30) + 'px';
}

function resetAim(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.face-btn')) return;

    rsOrigin = null;
    inputState.rs.x = 0;
    inputState.rs.y = 0;

    // Hide crosshair
    if (aimCrosshair) {
        aimCrosshair.classList.remove('active');
    }

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
            // Haptic feedback if supported
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

// Toggle between Walk and Drive modes
function toggleDriveMode() {
    isDriveMode = !isDriveMode;

    if (isDriveMode) {
        // Switch to Drive Mode
        if (joystickContainer) joystickContainer.style.display = 'none';
        if (driveControls) driveControls.style.display = 'flex';
        modeToggle.classList.add('drive-active');
        document.body.classList.add('drive-mode');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } else {
        // Switch to Walk Mode
        if (joystickContainer) joystickContainer.style.display = 'flex';
        if (driveControls) driveControls.style.display = 'none';
        modeToggle.classList.remove('drive-active');
        document.body.classList.remove('drive-mode');
        if (navigator.vibrate) navigator.vibrate(30);
        // Reset steering
        inputState.ls.x = 0;
        emitState();
    }
}

// Make toggleDriveMode available globally for onclick
window.toggleDriveMode = toggleDriveMode;

// Simple Steer Button Logic - INSTANT RESPONSE
if (steerLeft) {
    steerLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputState.ls.x = -1; // Full left
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

    steerLeft.addEventListener('touchcancel', (e) => {
        inputState.ls.x = 0;
        steerLeft.classList.remove('pressed');
        emitState();
    }, { passive: false });
}

if (steerRight) {
    steerRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        inputState.ls.x = 1; // Full right
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

    steerRight.addEventListener('touchcancel', (e) => {
        inputState.ls.x = 0;
        steerRight.classList.remove('pressed');
        emitState();
    }, { passive: false });
}

// =========================================
// SETTINGS PANEL & CUSTOMIZATION
// =========================================
const settingsPanel = document.getElementById('settings-panel');
const joystickSizeSlider = document.getElementById('joystick-size');
const buttonSizeSlider = document.getElementById('button-size');
const aimSensSlider = document.getElementById('aim-sensitivity');
const showCrosshairCheck = document.getElementById('show-crosshair');
const faceButtons = document.getElementById('face-buttons');

// Toggle Settings Panel
function toggleSettings() {
    if (settingsPanel) {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }
}
window.toggleSettings = toggleSettings;

// Update Joystick Size
function updateJoystickSize(value) {
    if (joystickBase) {
        joystickBase.style.width = value + 'px';
        joystickBase.style.height = value + 'px';
    }
    const stickSize = Math.round(value * 0.46);
    if (joystickStick) {
        joystickStick.style.width = stickSize + 'px';
        joystickStick.style.height = stickSize + 'px';
    }
    document.getElementById('joystick-size-val').textContent = value + 'px';
    saveSettings();
}
window.updateJoystickSize = updateJoystickSize;

// Update Button Size
function updateButtonSize(value) {
    if (faceButtons) {
        const btns = faceButtons.querySelectorAll('.face-btn');
        btns.forEach(btn => {
            btn.style.width = value + 'px';
            btn.style.height = value + 'px';
            btn.style.fontSize = Math.round(value * 0.4) + 'px';
        });
        faceButtons.style.gridTemplateColumns = `${value}px ${value}px ${value}px`;
        faceButtons.style.gridTemplateRows = `${value}px ${value}px ${value}px`;
    }
    document.getElementById('button-size-val').textContent = value + 'px';
    saveSettings();
}
window.updateButtonSize = updateButtonSize;

// Update Aim Sensitivity
function updateAimSensitivity(value) {
    aimSensitivity = parseInt(value);
    document.getElementById('aim-sens-val').textContent = value;
    saveSettings();
}
window.updateAimSensitivity = updateAimSensitivity;

// Toggle Crosshair Visibility
function toggleCrosshair(show) {
    if (aimCrosshair) {
        aimCrosshair.style.display = show ? 'block' : 'none';
    }
    saveSettings();
}
window.toggleCrosshair = toggleCrosshair;

// Reset to Defaults
function resetSettings() {
    if (joystickSizeSlider) joystickSizeSlider.value = 130;
    if (buttonSizeSlider) buttonSizeSlider.value = 55;
    if (aimSensSlider) aimSensSlider.value = 10;
    if (showCrosshairCheck) showCrosshairCheck.checked = true;

    updateJoystickSize(130);
    updateButtonSize(55);
    updateAimSensitivity(10);
    toggleCrosshair(true);

    localStorage.removeItem('xboxControllerSettings');
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
}
window.resetSettings = resetSettings;

// Save Settings to localStorage
function saveSettings() {
    const settings = {
        joystickSize: joystickSizeSlider?.value || 130,
        buttonSize: buttonSizeSlider?.value || 55,
        aimSensitivity: aimSensSlider?.value || 10,
        showCrosshair: showCrosshairCheck?.checked ?? true
    };
    localStorage.setItem('xboxControllerSettings', JSON.stringify(settings));
}

// Load Settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('xboxControllerSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (joystickSizeSlider) joystickSizeSlider.value = settings.joystickSize;
            if (buttonSizeSlider) buttonSizeSlider.value = settings.buttonSize;
            if (aimSensSlider) aimSensSlider.value = settings.aimSensitivity;
            if (showCrosshairCheck) showCrosshairCheck.checked = settings.showCrosshair;

            updateJoystickSize(settings.joystickSize);
            updateButtonSize(settings.buttonSize);
            updateAimSensitivity(settings.aimSensitivity);
            toggleCrosshair(settings.showCrosshair);
        }
    } catch (e) {
        console.log('Could not load settings:', e);
    }
}

// Load settings on startup
loadSettings();
