/**
 * ============================================================================
 * CYBERSTRIKE: OVERDRIVE - TITAN EDITION (ULTIMATE)
 * ============================================================================
 * 
 * VERSION: 8.0 (PUBLISH FINAL)
 * AESTHETIC: INDUSTRIAL MATTE
 * MOBILE: LANDSCAPE-OPTIMIZED WITH PERFORMANCE TUNING
 * 
 * [ARCHITECTURE OVERVIEW]
 * 1. CORE ENGINE: Handles the main requestAnimationFrame loop and high-level states.
 * 2. PHYSICS SYSTEM: Integrated AABB collision with sub-pixel resolution.
 * 3. AUDIO SYNTHESIS: Zero-dependency WebAudio oscillator system.
 * 4. ENTITY COMPONENT LOGIC:
 *    - Player: Advanced state machine with i-frames and animation scaling.
 *    - Enemies: Multi-type AI (Drone, Sniper, Charger, Shielded).
 *    - Bosses: Segmented Titan classes with procedural attack patterns.
 * 5. WORLD GEN: Infinite progressive generation with "Zone" difficulty scaling.
 * 6. JUICE/FX: Particle system, screen shake, and floating combat text.
 * 
 * ============================================================================
 */

// --- 1. DOM BINDINGS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const healthFill = document.getElementById('health-fill');
const weaponNameEl = document.getElementById('weapon-name');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');
const bossHud = document.getElementById('boss-hud');
const bossHealthFill = document.getElementById('boss-health-fill');
const syncFill = document.getElementById('sync-fill');
const uiLayer = document.getElementById('ui-layer');
const distanceEl = document.getElementById('distance');
const mobileControls = document.getElementById('mobile-controls');
const btnJump = document.getElementById('btn-jump');
const btnDash = document.getElementById('btn-dash');
const btnShoot = document.getElementById('btn-shoot');
const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseHomeBtn = document.getElementById('pause-home-btn');
const startHighScoreEl = document.getElementById('start-high-score');
const pauseHighScoreEl = document.getElementById('pause-high-score');
const overHighScoreEl = document.getElementById('over-high-score');

// --- 2. GLOBAL DESIGN TOKENS (STRICT MATTE) ---
const COLORS = {
    primary: '#00e5ff',    // Neon Cyan (Matte)
    secondary: '#ff0055',  // Sharp Pink
    accent: '#9d00ff',     // Deep Purple
    player: '#00e5ff',
    enemy: '#ff0055',
    platform: '#2a2a2a',   // Graphite
    platformAlt: '#1a1a1a',// Charcoal
    grid: 'rgba(255, 255, 255, 0.02)',
    boss: '#ff1744',       // Industrial Red
    bg: '#121212',         // Matte Obsidian
    white: '#ffffff',
    smoke: 'rgba(150, 150, 150, 0.3)',
    sparks: '#ffeb3b',
    zoneIndicator: '#444'
};

// --- 3. SYSTEM STATE ---
let gameState = 'START';
let score = 0;
let killScore = 0;
let comboCount = 0;
let comboTimer = 0;
let lastFrameTime = performance.now();
let screenShake = 0;
let screenFlash = 0;
let worldSeed = Math.random();
let camera = { x: 0, y: 0 };
let nightAlpha = 0;
let neuralSync = 0; // 0 to 100
let isNeuralOverdrive = false;
let overdriveTimer = 0;
let highScore = parseInt(localStorage.getItem('cyberstrike_highscore')) || 0;
let mobileInputX = 0; // Top-level global for input bridging

// --- Death Animation State ---
let deathTimer = 0;
let deathFadeAlpha = 0;
let deathPlayerVX = 0;
let deathPlayerVY = 0;
let deathPlayerSpin = 0;
const DEATH_DURATION = 2.8; // Total death sequence in seconds

// Object Pools
let platforms = [];
let particles = [];
let bullets = [];
let enemies = [];
let pickups = [];
let floatingTexts = [];
let alerts = [];
let backgroundObjects = []; // Decorative floating objects
let weatherSystems = []; // Rain/Embers
let urbanParallax = []; // Giant Skyscrapers
let checkpoints = []; // Physical checkpoint walls

// --- 3.5 ASSET LOADER ---
const ASSETS = {
    player: new Image(),
    enemy: new Image(),
    boss: new Image(),
    plasma: new Image(),
    cannon: new Image()
};
ASSETS.player.src = 'player_sprite_v2_1772036355372.png';
ASSETS.enemy.src = 'drone_sprite_v2_1772036594798.png';
ASSETS.boss.src = 'boss_sprite_v2_1772036757449.png';
// Files don't exist - disabled
// ASSETS.plasma.src = 'powerup_plasma_core_1772212275022.png';
// ASSETS.cannon.src = 'powerup_heavy_cannon_1772212300648.png';

const IMAGES_LOADED = { player: false, enemy: false, boss: false, plasma: false, cannon: false };
/**
 * Sprite Pre-processor: Removes black and grey backgrounds for edge transparency
 * and enhances visibility.
 */
function processSpriteBackgrounds(img) {
    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tCtx.drawImage(img, 0, 0);

    const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Remove black (near 0,0,0) and grey backgrounds (r,g,b are similar and < 85)
        // This is a heuristic to target flat backgrounds while keeping character detail.
        const isBlack = r < 20 && g < 20 && b < 20;
        const isGrey = Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && Math.abs(r - b) < 8 && r < 85;

        if (isBlack || isGrey) {
            pixels[i + 3] = 0;
        }
    }
    tCtx.putImageData(imgData, 0, 0);
    return tempCanvas;
}

ASSETS.player.onload = () => {
    ASSETS.player = processSpriteBackgrounds(ASSETS.player);
    IMAGES_LOADED.player = true;
};
ASSETS.enemy.onload = () => {
    ASSETS.enemy = processSpriteBackgrounds(ASSETS.enemy);
    IMAGES_LOADED.enemy = true;
};
ASSETS.boss.onload = () => {
    ASSETS.boss = processSpriteBackgrounds(ASSETS.boss);
    IMAGES_LOADED.boss = true;
};
ASSETS.plasma.onload = () => { IMAGES_LOADED.plasma = true; };
ASSETS.plasma.onerror = () => { ASSETS.plasma.broken = true; };
ASSETS.cannon.onload = () => { IMAGES_LOADED.cannon = true; };
ASSETS.cannon.onerror = () => { ASSETS.cannon.broken = true; };

// Game Variables
let player;
let boss = null;
let nextPlatformX = 0;
let distanceTraveled = 0;
let lastBossCheckpoint = 0;
let lastDistanceCheckpoint = 0;
let lastCheckpointSpawnX = 0;
let lastCheckpointKillScore = 0;
let currentZone = 1;
const DEBUG_MODE = false; // Set to false for production
const BOSS_INTERVAL = DEBUG_MODE ? 5000 : 60000;
const CHECKPOINT_INTERVAL = DEBUG_MODE ? 2000 : 15000;
let timeScale = 1.0;

// --- 4. INPUT MANAGEMENT ---
const keys = {};
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP') togglePause();

    // Debug Controls (ALWAYS ON FOR TESTING AS REQUESTED)
    if (e.code === 'KeyB') triggerTitanIncursion();
    if (e.code === 'KeyH') player.hp = player.maxHp;
    if (e.code === 'KeyK' && boss) finalizeBoss();
    if (e.code === 'KeyL') { // Toggle boss level
        const lvl = (boss ? boss.pLevel % 5 : 0) + 1;
        boss = new TitanBoss(player.x + 1200, player.y, lvl);
        triggerTransition(`TEST MODE: TITAN LEVEL ${lvl} DEPLOYED`, boss.getLevelColor());
    }
    if (e.code === 'KeyU') {
        const types = ['PLASMA', 'HEAVY', 'SPREAD', 'RAPID_FIRE', 'SPEED', 'SHIELD'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        pickups.push({ posX: player.x + 100, posY: player.y - 100, model: chosen, isFound: false });
    }

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// Clear all inputs on focus loss to prevent stuck movement
let fireTouchId = null;
let isFiringJoy = false;
let moveTouchId = null;
let isMovingJoy = false;

function clearAllInputs() {
    Object.keys(keys).forEach(k => keys[k] = false);
    mouse.down = false;
    isFiringJoy = false;
    fireTouchId = null;
    isMovingJoy = false;
    moveTouchId = null;
    mobileInputX = 0; // Full reset

    const moveInner = document.querySelector('.joy-stick-inner');
    if (moveInner) {
        moveInner.style.transform = 'translate(0px, 0px)';
        moveInner.style.transition = 'transform 0.2s ease-out';
    }
}
window.addEventListener('blur', clearAllInputs);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAllInputs();
});

// --- 4.5 MOBILE TOUCH MANAGEMENT ---
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobile = isTouchDevice && (window.innerWidth < 1024 || window.innerHeight < 600);

// Force landscape orientation
if (isMobile && screen.orientation && screen.orientation.lock) {
    try {
        screen.orientation.lock('landscape').catch(() => { });
    } catch (e) {
        console.warn('Orientation lock failed:', e);
    }
}

// Performance budgets for mobile
const MAX_PARTICLES = isMobile ? 80 : 250;
const MAX_BULLETS = isMobile ? 30 : 60;
const SCANLINES_ENABLED = !isMobile;
if (isTouchDevice) {
    mobileControls.classList.remove('hidden');

    // Prevent default touch behaviors like scrolling, zooming, or pull-to-refresh
    document.addEventListener('touchstart', (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') &&
            e.target.id !== 'move-joystick' && !e.target.closest('#move-joystick')) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Helper: bind touch start/end/cancel for a button
    function bindTouch(btn, onDown, onUp) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); onDown(); }, { passive: false });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); onUp(); }, { passive: false });
        btn.addEventListener('touchcancel', (e) => { e.preventDefault(); onUp(); }, { passive: false });
    }

    // Movement Unified Joystick
    const moveJoystick = document.getElementById('move-joystick');
    const moveJoyInner = moveJoystick.querySelector('.joy-stick-inner');

    // Simplified High-Performance Touchmove Handler
    window.addEventListener('touchmove', (e) => {
        // Handle all active touches at once
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];

            if (isMovingJoy && t.identifier === moveTouchId) {
                updateMoveTracking(t);
            }
            if (isFiringJoy && t.identifier === fireTouchId) {
                updateAimTracking(t);
            }
        }
        if (isMovingJoy || isFiringJoy) e.preventDefault();
    }, { passive: false });

    // Cache rects on start to avoid heavy layout thrashing in touchmove
    let moveJoyRect = null;
    let fireJoyRect = null;

    moveJoystick.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        const touch = e.changedTouches[0];
        moveTouchId = touch.identifier;
        isMovingJoy = true;
        moveJoyRect = moveJoystick.getBoundingClientRect();
        moveJoyInner.style.transition = 'none';
        updateMoveTracking(touch);
    }, { passive: false });

    const clearMoveJoy = (e) => {
        if (!isMovingJoy) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === moveTouchId) {
                isMovingJoy = false;
                moveTouchId = null;
                mobileInputX = 0; // Stop movement
                moveJoyInner.style.transition = 'transform 0.2s ease-out';
                moveJoyInner.style.transform = `translate(0px, 0px)`;
                break;
            }
        }
    };
    window.addEventListener('touchend', clearMoveJoy, { passive: false });
    window.addEventListener('touchcancel', clearMoveJoy, { passive: false });

    function updateMoveTracking(touch) {
        if (!moveJoyRect) moveJoyRect = moveJoystick.getBoundingClientRect();
        const joyCenterX = moveJoyRect.left + moveJoyRect.width / 2;
        const joyCenterY = moveJoyRect.top + moveJoyRect.height / 2;

        let dx = touch.clientX - joyCenterX;
        let dy = touch.clientY - joyCenterY;
        const maxDist = moveJoyRect.width / 2 - 15;
        const dist = Math.hypot(dx, dy);

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        moveJoyInner.style.transform = `translate(${dx}px, ${dy}px)`;

        // Horizontal thresholds for walking (Direct Injection)
        if (dx < -8) {
            mobileInputX = -1;
        } else if (dx > 8) {
            mobileInputX = 1;
        } else {
            mobileInputX = 0;
        }
    }

    // Actions
    bindTouch(btnJump, () => {
        keys['Space'] = true;
        if (player && !player.isCompromised) {
            player.jumpBuffer = 0.25;
        }
    }, () => { keys['Space'] = false; });
    bindTouch(btnDash, () => { keys['ShiftLeft'] = true; }, () => { keys['ShiftLeft'] = false; });

    // TRUE TWIN-STICK FIRE JOYSTICK LOGIC

    btnShoot.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        const touch = e.changedTouches[0];
        fireTouchId = touch.identifier;
        isFiringJoy = true;
        mouse.down = true;
        fireJoyRect = btnShoot.getBoundingClientRect();
        updateAimTracking(touch);
    }, { passive: false });

    const clearFireJoy = (e) => {
        if (!isFiringJoy) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === fireTouchId) {
                isFiringJoy = false;
                fireTouchId = null;
                mouse.down = false;
                break;
            }
        }
    };
    window.addEventListener('touchend', clearFireJoy, { passive: false });
    window.addEventListener('touchcancel', clearFireJoy, { passive: false });

    function updateAimTracking(touch) {
        if (!player || !fireJoyRect) return; // Guard for dead state

        const joyCenterX = fireJoyRect.left + fireJoyRect.width / 2;
        const joyCenterY = fireJoyRect.top + fireJoyRect.height / 2;

        const dx = touch.clientX - joyCenterX;
        const dy = touch.clientY - joyCenterY;

        // Visual position of player in canvas screen coords
        const screenPx = player.x - camera.x + player.w / 2;
        const screenPy = player.y - camera.y + player.h / 2;

        if (Math.hypot(dx, dy) < 10) {
            // Deadzone (center): Aim forward
            mouse.x = screenPx + 1000;
            mouse.y = screenPy;
        } else {
            const angle = Math.atan2(dy, dx);
            // Project far ahead to ensure accurate line
            mouse.x = screenPx + Math.cos(angle) * 1000;
            mouse.y = screenPy + Math.sin(angle) * 1000;
        }
    }

    // Global safety: if ALL touches end, force-clear all input flags.
    // This prevents 'stuck' keys when fingers slide off buttons.
    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            keys['Space'] = false;
            keys['ShiftLeft'] = false;
            mouse.down = false;
            mobileInputX = 0;
        }
    }, { passive: true });
    window.addEventListener('touchcancel', () => {
        keys['Space'] = false;
        keys['ShiftLeft'] = false;
        mouse.down = false;
        mobileInputX = 0;
        isFiringJoy = false;
    }, { passive: true });
}

/**
 * Responsive Resize Utility
 * Keeps the canvas full screen and updates resolution.
 */
const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 5. AUDIO SYNTHESIZER ---
let audioCtx;
const initAudioSystem = () => {
    try {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.warn('Audio system failed to initialize:', e);
    }
};

/**
 * Custom Sound Generator
 * Creates dynamic waves without external assets.
 */
function playDynamicSound(freq, type, duration, volume, sweep = 0) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        if (sweep !== 0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + sweep), audioCtx.currentTime + duration);
        }
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { }
}

const AudioFX = {
    shoot: () => playDynamicSound(500, 'square', 0.08, 0.03, -200),
    explosion: () => playDynamicSound(70, 'sawtooth', 0.4, 0.1, -30),
    heavyExplosion: () => playDynamicSound(40, 'sawtooth', 0.7, 0.15, -20),
    jump: () => playDynamicSound(650, 'triangle', 0.1, 0.05, 300),
    impact: () => playDynamicSound(120, 'triangle', 0.1, 0.1, -40),
    hit: () => playDynamicSound(150, 'square', 0.2, 0.12, -50),
    pickup: () => {
        playDynamicSound(900, 'sine', 0.15, 0.1, 200);
        setTimeout(() => playDynamicSound(1400, 'sine', 0.15, 0.1, 400), 50);
    },
    dash: () => playDynamicSound(300, 'sine', 0.12, 0.08, 1200),
    bossEntry: () => playDynamicSound(60, 'sawtooth', 2.0, 0.2, 50),
    shatter: () => {
        // High-pitched crackling crystal/glass shatter
        playDynamicSound(1800, 'square', 0.05, 0.06, 400);
        setTimeout(() => playDynamicSound(1200, 'sawtooth', 0.1, 0.05, -800), 30);
        setTimeout(() => playDynamicSound(2500, 'square', 0.05, 0.04, -1500), 60);
    }
};

// --- 6. UTILITY CLASSES & FUNCTIONS ---
const random = (min, max) => Math.random() * (max - min) + min;
const lerp = (a, b, t) => a + (b - a) * t;
const pulse = (speed, mag) => Math.sin(Date.now() * speed) * mag;

/**
 * Visual Feedback: Floating Text
 */
class FloatingScore {
    constructor(x, y, text, color, size = 20) {
        this.x = x; this.y = y; this.text = text;
        this.color = color; this.size = size;
        this.life = 1.0;
        this.vy = -140; // Faster vertical movement
        this.vx = random(-60, 60); // Drift horizontally to prevent stacking
    }
    update(dt) {
        this.x += this.vx * dt; // Apply horizontal drift
        this.y += this.vy * dt;
        this.life -= dt * 1.2; // Fade out slightly faster
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = `900 ${this.size}px Outfit`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x - camera.x, this.y - camera.y);
        ctx.restore();
    }
}

class CombatAlert {
    constructor(text, color, icon = "") {
        this.text = text;
        this.color = color;
        this.icon = icon;
        this.life = 2.5;
    }
    update(dt) {
        this.life -= dt;
    }
    draw(index) {
        if (this.life <= 0) return;
        const alpha = Math.min(1.0, this.life * 2);
        ctx.save();
        ctx.globalAlpha = alpha;

        const w = 450;
        const h = 36;
        const x = (canvas.width - w) / 2;
        const y = 85 + (index * 42); // Stacked below HUD

        // Background backing
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(x, y, w, h);

        // Accent accents
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, 4, h); // Left bar
        ctx.fillRect(x + w - 4, y, 4, h); // Right bar

        // Text with icon
        ctx.font = '900 15px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';

        const displayStr = this.icon ? `${this.icon}  ${this.text.toUpperCase()}  ${this.icon}` : this.text.toUpperCase();
        ctx.fillText(displayStr, canvas.width / 2, y + h / 2);

        // Tech decorations
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    }
}

function triggerCombatAlert(text, color, icon = "") {
    // Only one alert of the same text type at a time
    if (alerts.some(a => a.text === text)) return;
    alerts.push(new CombatAlert(text, color, icon));
    if (alerts.length > 3) alerts.shift();
}

// --- 7. PARTICLE PHYSICS ---
class ParticleSystem {
    constructor(x, y, color, size, vx, vy, life, type = 'CIRCLE') {
        this.x = x; this.y = y; this.color = color; this.size = size;
        this.vx = vx; this.vy = vy; this.life = life; this.maxLife = life;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotateSpeed = random(-5, 5);
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.rotation += this.rotateSpeed * dt;
        if (this.type !== 'SQUARE') this.size *= 0.96;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.rotation);
        if (this.type === 'CIRCLE' || this.type === 'SPARK') {
            ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'LINE') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(this.size * 20, 0); // Long smear
            ctx.stroke();
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.restore();
    }
}

/**
 * Global Effect Multi-Spawn
 */
function emitParticles(x, y, variant = 'NORMAL', color = COLORS.primary, count = 10, force = 200) {
    // Throttle particles on mobile
    const actualCount = isMobile ? Math.ceil(count * 0.4) : count;
    if (particles.length >= MAX_PARTICLES) return;
    for (let i = 0; i < actualCount; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const ang = Math.random() * Math.PI * 2;
        const vel = random(force * 0.4, force);
        if (variant === 'NORMAL') {
            particles.push(new ParticleSystem(x, y, color, random(2, 6), Math.cos(ang) * vel, Math.sin(ang) * vel, random(0.5, 1.2), 'CIRCLE'));
        } else if (variant === 'SMOKE') {
            particles.push(new ParticleSystem(x, y, COLORS.smoke, random(5, 15), random(-30, 30), random(-60, -20), random(1, 2), 'CIRCLE'));
        } else if (variant === 'DASH') {
            particles.push(new ParticleSystem(x, y, color, 15, 0, 0, 0.25, 'SQUARE'));
        } else if (variant === 'BITS') {
            particles.push(new ParticleSystem(x, y, color, random(1, 3), Math.cos(ang) * vel * 2, Math.sin(ang) * vel * 2, random(0.2, 0.4), 'SPARK'));
        }
    }
}

// --- 8. COMBAT SYSTEM: BULLETS ---
class Projectile {
    constructor(x, y, angle, speed, dmg, source = 'PLAYER', color = COLORS.primary, type = 'BASIC') {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.dmg = dmg;
        this.source = source;
        this.color = color;
        this.type = type; // BASIC, KNOCKBACK, GRAVITY, SNIPER
        this.activeTime = type === 'SNIPER' ? 3.0 : 2.0;
        this.rotation = angle;
    }
    update(dt) {
        if (this.type === 'GRAVITY') {
            this.vy += 800 * dt; // Heavy arcing projectile
            this.rotation = Math.atan2(this.vy, this.vx);
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.activeTime -= dt;

        // Visual trailing (edged sparks) - reduced on mobile
        const trailChance = isMobile ? 0.92 : 0.7;
        if (Math.random() > trailChance && particles.length < MAX_PARTICLES) {
            particles.push(new ParticleSystem(this.x, this.y, this.color, 2, random(-20, 20), random(-20, 20), 0.3, 'SPARK'));
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.rotation);

        if (!isMobile) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }

        if (this.type === 'HEAVY') {
            // "Heavy Slug" - Sharp edge teardrop
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(-6, 9);
            ctx.lineTo(-6, -9);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'PLASMA') {
            // "Plasma Orb"
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.type === 'KNOCKBACK') {
            // "Pulsing Hammer" Spiky Ball
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = i % 2 === 0 ? 12 : 6;
                const a = (i / 8) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'GRAVITY') {
            // "Heavy Slug" - Teardrop/Edge shape
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-5, 8);
            ctx.lineTo(-5, -8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        } else if (this.type === 'SNIPER') {
            // "Needle" - Very thin/long edge
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-30, 0);
            ctx.lineTo(30, 0);
            ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.fillRect(25, -2, 10, 4); // Glowing tip
        } else {
            // Default "Shards" instead of boxes
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-6, 4);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-6, -4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

// --- 9. PLAYER CONTROLLER ---
class PlayerTitan {
    constructor() {
        this.spawn();
    }

    spawn() {
        this.x = 250; this.y = 400;
        this.w = 32; this.h = 48;
        this.vx = 0; this.vy = 0;
        this.moveSpeed = 520; // Increased for better horizontal cover
        this.jumpPower = -920; // Stronger jump
        this.physGravity = 2400; // Slightly lower gravity for better hangtime
        this.hp = 100;
        this.maxHp = 100;
        this.activeArmament = 'PULSE';
        this.rechargeRate = 0.12;
        this.weaponLevel = 1;
        this.rechargeTimer = 0;
        this.jumpCount = 0;
        this.maxJumpLimit = 2;
        this.dashReload = 0;
        this.dashWindow = 0;
        this.isDashActive = false;
        this.iFrames = 0;
        this.scaleX = 1; this.scaleY = 1;
        this.isCompromised = false;
        this.groundedState = true;
        this.trail = []; // Trailing effect
        this.sinPose = 0;
        this.weaponTransition = 0; // Animation for weapon upgrades
        this.rotation = 0; // Dynamic tilt

        // --- Power-up Timers ---
        this.powerUps = {
            rapidFire: 0,
            speedBoost: 0,
            shield: 0
        };

        // --- Jump Responsiveness (Enhanced) ---
        this.jumpBuffer = 0;      // Window to press jump before landing
        this.coyoteTime = 0;      // Window to jump after leaving platform
        this.jumpInputLock = false;
        this.maxJumpLimit = 2;    // Double jump capacity
        this.glitchIntensity = 0;
        this.muzzleFlash = 0;
        this.hasArmorShield = false;
    }

    updateVisuals(dt) {
        this.sinPose += dt * 6; // Faster breathing
        this.weaponTransition = lerp(this.weaponTransition, 0, 0.1);

        // Dynamic tilt based on velocity (more pronounced)
        const targetRot = (this.vx * 0.0004) + (this.vy * 0.00025);
        this.rotation = lerp(this.rotation, targetRot, 0.12);

        // Dynamic Trail Logic
        if (this.isDashActive || isNeuralOverdrive || Math.abs(this.vx) > 600 || Math.abs(this.vy) > 800) {
            this.trail.push({
                x: this.x,
                y: this.y,
                life: isNeuralOverdrive ? 1.5 : 1.0,
                isNeural: isNeuralOverdrive
            });
            // Protect against infinite trail growth
            if (this.trail.length > 40) this.trail.shift();
        }
        for (let j = this.trail.length - 1; j >= 0; j--) {
            this.trail[j].life -= dt * 3;
            if (this.trail[j].life <= 0) this.trail.splice(j, 1);
        }

        if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 15;
    }

    update(dt) {
        if (this.isCompromised) return;

        // --- X Axis Movement ---
        let inputX = mobileInputX; // Prioritize joystick
        if (inputX === 0) { // Fallback to keyboard
            if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
        }

        // Neural Overdrive Activation
        if (keys['KeyQ']) activateNeuralOverdrive();

        // Dash Activation
        if (keys['ShiftLeft'] && this.dashReload <= 0 && inputX !== 0) {
            this.dash(inputX);
        }

        const effectiveSpeed = this.moveSpeed * (this.powerUps.speedBoost > 0 ? 1.5 : 1.0);
        this.vx = inputX * effectiveSpeed;

        if (this.isDashActive) {
            this.vx *= 3.3;
            this.dashWindow -= dt;
            if (this.dashWindow <= 0) this.isDashActive = false;
            if (Math.random() > 0.4) emitParticles(this.x + this.w / 2, this.y + this.h / 2, 'DASH', COLORS.primary, 1);
        }

        if (this.dashReload > 0) this.dashReload -= dt;
        if (this.iFrames > 0) this.iFrames -= dt;

        // Update Power-up Timers
        Object.keys(this.powerUps).forEach(key => {
            if (this.powerUps[key] > 0) this.powerUps[key] -= dt;
        });

        // Smooth visual scaling back to normal
        this.scaleX = lerp(this.scaleX, 1, 0.15);
        this.scaleY = lerp(this.scaleY, 1, 0.15);

        const visiblePlatforms = platforms.filter(p => p.x < player.x + 1000 && p.x + p.w > player.x - 600);
        const visibleDestructibles = destructibles.filter(d => d.x < player.x + 1000 && d.x + d.w > player.x - 600);
        const collisionTargets = [...visiblePlatforms, ...visibleDestructibles];
        let onSolid = false;

        // Sub-step physics to prevent tunneling at low framerates (mobile freeze issue)
        const maxStep = 0.016;
        let timeRemaining = Math.min(dt, 0.05); // Hard cap at 3 sub-steps max

        while (timeRemaining > 0) {
            const sDt = Math.min(timeRemaining, maxStep);
            timeRemaining -= sDt;

            this.vy += this.physGravity * sDt;

            // 1. X-Axis Movement & Collision
            this.x += this.vx * sDt;
            if (this.x < 0) this.x = 0; // Prevent falling off the left map edge on spawn

            collisionTargets.forEach(p => {
                // Include a 1px margin on Y to avoid triggering wall collisions when sliding on floors
                if (this.x < p.x + p.w && this.x + this.w > p.x &&
                    this.y < p.y + p.h - 1 && this.y + this.h > p.y + 1) {
                    if (this.vx > 0) this.x = p.x - this.w;
                    else if (this.vx < 0) this.x = p.x + p.w;
                }
            });

            // 2. Y-Axis Movement & Collision
            this.y += this.vy * sDt;
            let stepGrounded = false;
            collisionTargets.forEach(p => {
                // Horizontal overlap check for vertical collision
                if (this.x < p.x + p.w - 2 && this.x + this.w > p.x + 2) {
                    // Check for landing (moving down or standing)
                    if (this.vy >= 0 && this.y + this.h >= p.y - 4 && this.y + this.h <= p.y + 15) {
                        this.y = p.y - this.h;
                        this.vy = 0;
                        this.jumpCount = 0;
                        this.coyoteTime = 0.35;
                        stepGrounded = true;
                    }
                    // Check for head hit (moving up)
                    // The y > p.y + p.h - 15 check ensures we only hit the CEILING of the platform, 
                    // not the floor we are potentially standing on.
                    else if (this.vy < 0 && this.y < p.y + p.h && this.y > p.y + p.h - 15) {
                        this.y = p.y + p.h;
                        this.vy = 0;
                    }
                }
            });
            if (stepGrounded) onSolid = true;
        }

        if (onSolid && !this.groundedState) {
            // Landing Event
            this.scaleX = 1.4; this.scaleY = 0.6;
            screenShake = Math.max(screenShake, Math.abs(this.vy) * 0.006);
            AudioFX.impact();
            emitParticles(this.x + this.w / 2, this.y + this.h, 'NORMAL', '#333', 6, 60);
        }
        this.groundedState = onSolid;

        // Jump Logic (Buffered and Coyote Time)
        const jumpPressed = keys['Space'] || keys['KeyW'] || keys['ArrowUp'] || keys['KeyK'];

        if (jumpPressed && !this.jumpInputLock) {
            this.jumpBuffer = 0.35; // Increased buffer for better pre-landing registration
        }
        this.jumpInputLock = jumpPressed;

        if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
        if (this.coyoteTime > 0) this.coyoteTime -= dt;

        if (this.jumpBuffer > 0 && (this.coyoteTime > 0 || this.jumpCount < this.maxJumpLimit)) {
            this.performJump();
            this.jumpBuffer = 0;
            this.coyoteTime = 0;
            this.jumpInputLock = true; // Lock AFTER consuming the jump
        }

        // Offensive Systems
        this.rechargeTimer -= dt;
        if (mouse.down && this.rechargeTimer <= 0) {
            this.deployArmament();
        }

        // Void Check (Terminal Fall)
        if (this.y > canvas.height + 600) {
            this.takeHit(999, 0, 0, true); // True flag forces damage regardless of shield
        }
    }

    performJump() {
        this.vy = this.jumpPower;
        this.jumpCount++;
        AudioFX.jump();
        this.scaleX = 0.65; this.scaleY = 1.35;
        emitParticles(this.x + this.w / 2, this.y + this.h, 'NORMAL', COLORS.primary, 10, 140);
    }

    dash(dir) {
        this.isDashActive = true;
        this.dashWindow = 0.18;
        this.dashReload = 0.65;
        this.iFrames = 0.3; // Invul during burst
        screenShake = 10;
        AudioFX.dash();

        // Speed Lines
        for (let i = 0; i < 8; i++) {
            particles.push(new ParticleSystem(
                this.x + random(0, this.w),
                this.y + random(0, this.h),
                '#fff', random(1, 2), -dir * 800, 0, 0.4, 'LINE'
            ));
        }

        emitParticles(this.x + this.w / 2, this.y + this.h / 2, 'NORMAL', COLORS.primary, 12, 180);
    }



    deployArmament() {
        // Weapon Level Scaling
        const levelMod = Math.min(3, 1 + Math.floor(distanceTraveled / 40000));
        if (levelMod > this.weaponLevel) {
            this.weaponLevel = levelMod;
            this.weaponTransition = 2.0; // Trigger "POP" animation
            triggerTransition(`SYSTEM UPGRADE: LEVEL ${this.weaponLevel}`, COLORS.primary);

            // Armor Bonus: HP or Shield
            if (this.hp >= this.maxHp) {
                this.hasArmorShield = true; // 1-time free hit
            } else {
                this.hp = Math.min(this.maxHp, this.hp + 30);
                healthFill.style.width = `${Math.ceil(this.hp)}%`;
            }

            AudioFX.pickup();
            screenShake = 15;
        }

        const dx = mouse.x - (this.x + this.w / 2 - camera.x);
        const dy = mouse.y - (this.y + 15 - camera.y);
        const shotAngle = Math.atan2(dy, dx);

        AudioFX.shoot();
        screenShake = Math.max(screenShake, 2);

        const baseRecharge = this.rechargeRate * (1 - (this.weaponLevel - 1) * 0.15);
        this.rechargeTimer = this.powerUps.rapidFire > 0 ? baseRecharge * 0.4 : baseRecharge;

        const spawnX = this.x + this.w / 2;
        const spawnY = this.y + 15;
        const damage = 10 + (this.weaponLevel - 1) * 5;
        this.muzzleFlash = 1.0; // Trigger flash

        if (this.activeArmament === 'PULSE') {
            bullets.push(new Projectile(spawnX, spawnY, shotAngle, 1150, damage));
        } else if (this.activeArmament === 'SPREAD') {
            for (let i = -1; i <= 1; i++) {
                bullets.push(new Projectile(spawnX, spawnY, shotAngle + i * 0.15, 1000, damage * 0.8, 'PLAYER', COLORS.accent));
            }
        } else if (this.activeArmament === 'HEAVY') {
            bullets.push(new Projectile(spawnX, spawnY, shotAngle, 1400, damage * 2.5, 'PLAYER', '#ff9800', 'HEAVY'));
            screenShake = 8;
        } else if (this.activeArmament === 'PLASMA') {
            for (let i = 0; i < 5; i++) {
                bullets.push(new Projectile(spawnX, spawnY, shotAngle + (i - 2) * 0.1, 800, damage * 0.6, 'PLAYER', '#03a9f4', 'PLASMA'));
            }
        }
    }

    takeHit(rawDmg, kbX = 0, kbY = 0, force = false) {
        if (!force && (this.iFrames > 0 || this.isCompromised || this.powerUps.shield > 0)) return;

        // Armor Shield Logic
        if (this.hasArmorShield && !force) {
            this.hasArmorShield = false;
            this.iFrames = 0.5;
            triggerCombatAlert("ARMOR PLATING CONSUMED", COLORS.secondary, "⚠");
            return;
        }

        this.hp -= rawDmg;
        if (this.hp < 0) this.hp = 0;
        if (!force) this.iFrames = 0.6; // Heavy frames

        this.glitchIntensity = 1.0; // Trigger screen glitch effect
        screenFlash = 0.3; // High-visibility flash

        // Apply Knockback
        this.vx = kbX;
        this.vy = kbY;
        this.groundedState = false;

        screenShake = 20;
        AudioFX.hit();
        emitParticles(this.x + this.w / 2, this.y + this.h / 2, 'NORMAL', COLORS.secondary, 25, 450);

        if (this.hp <= 0) {
            this.isCompromised = true;
            initiateSystemHalt();
        }

        // UI Refresh
        healthFill.style.width = `${Math.ceil(this.hp)}%`;
        if (this.hp < 35) document.body.classList.add('danger');
        else document.body.classList.remove('danger');

        floatingTexts.push(new FloatingScore(this.x + this.w / 2, this.y, `-${Math.ceil(rawDmg)}`, COLORS.secondary, 30));
    }

    draw() {
        // Draw Trail (Advanced Poly-Trails)
        this.trail.forEach((t, i) => {
            ctx.save();
            ctx.globalAlpha = t.life * (t.isNeural ? 0.6 : 0.3);
            ctx.fillStyle = t.isNeural ? '#fff' : COLORS.primary;
            const sizeMod = 0.5 + (i / this.trail.length) * 0.5;
            ctx.translate(t.x - camera.x + this.w / 2, t.y - camera.y + this.h / 2);
            ctx.rotate(this.rotation);
            ctx.fillRect(-this.w / 2 * sizeMod, -this.h / 2 * sizeMod, this.w * sizeMod, this.h * sizeMod);
            ctx.restore();
        });

        ctx.save();
        ctx.translate(this.x - camera.x + this.w / 2, this.y - camera.y + this.h / 2);

        // Advanced dynamic transforms
        ctx.rotate(this.rotation);
        const breath = Math.sin(this.sinPose) * 0.08;
        const jumpStretch = Math.min(0.3, Math.abs(this.vy) * 0.00015);
        ctx.scale(this.scaleX - jumpStretch, this.scaleY + (Math.abs(this.vx) < 10 ? breath : jumpStretch));

        // Weapon Transition Pop
        if (this.weaponTransition > 0.01) {
            ctx.scale(1 + this.weaponTransition * 0.15, 1 + this.weaponTransition * 0.15);
        }

        // I-Frame Transparency
        if (this.iFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        ctx.translate(-this.w / 2, -this.h / 2);

        // --- Character Sprite / Fallback ---
        if (IMAGES_LOADED.player) {
            // Weapon level aura (Radiant) - skip shadowBlur on mobile
            if (this.weaponLevel > 1 && !isMobile) {
                ctx.save();
                ctx.globalAlpha = 0.15 + pulse(0.5, 0.01) * 0.1;
                ctx.shadowBlur = 15 * this.weaponLevel;
                ctx.shadowColor = COLORS.primary;
                ctx.drawImage(ASSETS.player, -4, -4, this.w + 8, this.h + 8);
                ctx.restore();
            }

            // Main Sprite
            ctx.drawImage(ASSETS.player, 0, 0, this.w, this.h);

            // Reactive highlight
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.005) * 0.05;
            ctx.fillRect(0, 0, this.w, this.h);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        } else {
            // Premium Vector Fallback
            const grad = ctx.createLinearGradient(0, 0, 0, this.h);
            grad.addColorStop(0, COLORS.player);
            grad.addColorStop(1, '#004a54');
            ctx.fillStyle = grad;

            // Beveled armored look
            ctx.beginPath();
            ctx.moveTo(5, 0); ctx.lineTo(this.w - 5, 0); ctx.lineTo(this.w, 10);
            ctx.lineTo(this.w, this.h); ctx.lineTo(0, this.h); ctx.lineTo(0, 10);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // --- Universal Detail Layer (Industrial Look) ---
        // Visor
        const targetSide = mouse.x > (this.x - camera.x + this.w / 2) ? 1 : -1;
        ctx.fillStyle = '#000';
        ctx.fillRect(targetSide > 0 ? 12 : 2, 12, 18, 8);

        ctx.fillStyle = COLORS.primary;
        if (!isMobile) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = COLORS.primary;
        }
        ctx.fillRect(targetSide > 0 ? 18 : 6, 14, 10, 4);
        ctx.shadowBlur = 0;

        // Shoulder Guards / Tech bits
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, 5); ctx.lineTo(5, -2);
        ctx.moveTo(this.w + 2, 5); ctx.lineTo(this.w - 5, -2);
        ctx.stroke();

        // Extra Armor Plates based on Level
        if (this.weaponLevel >= 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(-6, 20, 6, 20); // Side plate left
            ctx.fillRect(this.w, 20, 6, 20); // Side plate right
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(-6, 20, 6, 20);
            ctx.strokeRect(this.w, 20, 6, 20);

            // Neon flare on shoulder
            ctx.fillStyle = COLORS.primary;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(-8, 20, 2, 8);
            ctx.fillRect(this.w + 6, 20, 2, 8);
        }
        if (this.weaponLevel >= 3) {
            ctx.fillStyle = COLORS.white;
            ctx.globalAlpha = 0.3;
            // Tech-crest
            ctx.beginPath();
            ctx.moveTo(this.w / 2 - 15, -8); ctx.lineTo(this.w / 2 + 15, -8); ctx.lineTo(this.w / 2, -22);
            ctx.closePath();
            ctx.fill();

            // Back thruster flares
            ctx.fillStyle = COLORS.primary;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(5, this.h, 10, 15);
            ctx.fillRect(this.w - 15, this.h, 10, 15);
        }

        // Energy Core (Pulsing)
        const coreSize = (6 + (this.weaponLevel * 2)) + Math.sin(Date.now() * 0.01) * 2;
        ctx.fillStyle = COLORS.white;
        if (!isMobile) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.primary;
        }
        ctx.beginPath();
        ctx.arc(this.w / 2, 30, coreSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shield Logic
        if (this.powerUps.shield > 0 || this.hasArmorShield) {
            ctx.save();
            ctx.strokeStyle = this.hasArmorShield ? '#fff' : COLORS.primary;
            ctx.lineWidth = 3;
            ctx.setLineDash(this.hasArmorShield ? [] : [5, 5]);
            ctx.lineDashOffset = Date.now() * 0.01;
            ctx.beginPath();
            ctx.arc(this.w / 2, this.h / 2, 45, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 0.15;
            ctx.fillStyle = this.hasArmorShield ? '#fff' : COLORS.primary;
            ctx.fill();
            ctx.restore();
        }

        // Muzzle Flash
        if (this.muzzleFlash > 0) {
            ctx.save();
            ctx.translate(this.w / 2, 15);
            ctx.globalAlpha = this.muzzleFlash;
            ctx.fillStyle = 'white';
            const s = 20 * this.muzzleFlash;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.rect(-s / 2, -1, s, 2);
                ctx.rect(-1, -s / 2, 2, s);
            }
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}

// --- 10. ENEMY INTELLIGENCE ---
class HostileUnit {
    constructor(x, y, model = 'DRONE') {
        this.x = x; this.y = y;
        this.w = 48; this.h = 48; // Scaled up from 42 for better presence
        this.model = model;
        this.integrity = model === 'SNIPER' ? 45 : (model === 'TANK' ? 200 : 90); // Harder enemies
        this.recharge = random(1.0, 3.5); // Faster firing
        this.oscOffset = Math.random() * 8;
        this.hasExpired = false;
        this.baseX = x;
        this.flashTimer = 0; // Flash effect when hit
    }

    update(dt, titan) {
        if (this.flashTimer > 0) this.flashTimer -= dt * 6;
        this.oscOffset += dt * 4;
        const distMod = 1 + (distanceTraveled / 100000); // Gradual speed increase

        if (this.model === 'DRONE') {
            this.y += Math.sin(this.oscOffset) * 1.8;
            this.x -= 30 * distMod * dt; // Drones now drift left slowly
        } else if (this.model === 'TANK') {
            this.x -= 80 * distMod * dt; // Slow advance
        }

        // Tactical Range Check
        this.recharge -= dt;
        if (this.recharge <= 0) {
            const distance = Math.hypot(titan.x - this.x, titan.y - this.y);
            if (distance < 900) {
                this.executeFireSequence(titan);
                this.recharge = this.model === 'SNIPER' ? 3.0 : 1.8; // Aggressive recharge
            }
        }
    }

    executeFireSequence(titan) {
        const theta = Math.atan2(titan.y - this.y, titan.x - this.x);

        if (this.model === 'SNIPER') {
            // Fast needle bullet
            bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, theta, 1400, 15, 'ENEMY', COLORS.secondary, 'SNIPER'));
        } else if (this.model === 'TANK') {
            // Heavy arcing gravity shell with high damage
            bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, theta - 0.2, 700, 25, 'ENEMY', COLORS.accent, 'GRAVITY'));
        } else {
            // Drones fire faster knockback spikes
            bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, theta, 750, 12, 'ENEMY', COLORS.secondary, 'KNOCKBACK'));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x + this.w / 2, this.y - camera.y + this.h / 2);

        const p = Math.sin(Date.now() * 0.008) * 0.1;
        let finalScale = 1 + p;
        if (this.model === 'TANK') finalScale *= 1.4;
        ctx.scale(finalScale, finalScale);
        ctx.translate(-this.w / 2, -this.h / 2);

        if (IMAGES_LOADED.enemy) {
            // Shadow Glow (skip on mobile)
            if (!isMobile) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = COLORS.enemy;
            }
            ctx.drawImage(ASSETS.enemy, 0, 0, this.w, this.h);
            ctx.shadowBlur = 0;

            if (this.flashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTimer})`;
                ctx.fillRect(0, 0, this.w, this.h);
                ctx.globalCompositeOperation = 'source-over';
            }

            // Tech overlays
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            if (this.model === 'DRONE') {
                ctx.beginPath();
                ctx.arc(this.w / 2, this.h / 2, 28 + p * 20, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.model === 'SNIPER') {
                ctx.fillStyle = COLORS.enemy;
                ctx.fillRect(this.w / 2 - 2, -10, 4, 10); // Barrel
            }
        } else {
            // Vector Hostile
            const color = this.model === 'TANK' ? '#444' : COLORS.enemy;
            ctx.fillStyle = color;
            ctx.beginPath();
            if (this.model === 'DRONE') {
                ctx.arc(this.w / 2, this.h / 2, 20, 0, Math.PI * 2);
            } else {
                ctx.rect(0, 0, this.w, this.h);
            }
            ctx.fill();

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Core lens
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(this.w / 2, this.h / 2, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Common Hostile Visor
        ctx.fillStyle = COLORS.enemy;
        if (!isMobile) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.enemy;
        }
        ctx.fillRect(4, 10, this.w - 8, 4);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

// --- 11. BOSS ARCHITECT ---
class TitanBoss {
    constructor(x, y, pLevel = 1) {
        this.x = x; this.y = y - 600;
        this.anchorY = y;
        this.w = 200; this.h = 200;
        this.hitPoints = 1200 + (pLevel * 800);
        this.maxHitPoints = this.hitPoints;
        this.pLevel = pLevel;
        this.phaseTimer = 0;
        this.arrivalMode = true;
        this.attackPhase = 0;
        this.maxPhases = 6; // All bosses use all phases now for better variety
        this.cycleTime = 0;
        this.shotCounter = 0;
        this.flashTimer = 0;
    }

    update(dt, titan) {
        if (this.flashTimer > 0) this.flashTimer -= dt * 5;
        if (this.arrivalMode) {
            this.y = lerp(this.y, this.anchorY, 0.04);
            if (Math.abs(this.y - this.anchorY) < 10) this.arrivalMode = false;
            return;
        }

        this.phaseTimer += dt;
        this.cycleTime += dt;
        this.shotCounter += dt;

        // Fluid Tracking Logic
        this.x = lerp(this.x, titan.x + 650 + Math.sin(this.phaseTimer) * 450, 0.05);
        this.y = lerp(this.y, titan.y - 200 + Math.cos(this.phaseTimer * 0.75) * 180, 0.05);

        // Pattern Switcher
        if (this.cycleTime > 4) {
            this.attackPhase = (this.attackPhase + 1) % this.maxPhases;
            this.cycleTime = 0;
            this.shotCounter = 0;
        }

        this.executeAttackLogic(dt, titan);
    }

    executeAttackLogic(dt, titan) {
        if (this.attackPhase === 0) {
            // PULSED TRI-BURST
            if (this.shotCounter > 0.8) {
                const ang = Math.atan2(titan.y - this.y - this.h / 2, titan.x - this.x - this.w / 2);
                for (let i = -1; i <= 1; i++) {
                    bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, ang + i * 0.3, 550, 15, 'ENEMY', COLORS.boss));
                }
                this.shotCounter = 0;
            }
        } else if (this.attackPhase === 1) {
            // NOVA BURST
            if (this.shotCounter > 1.2) {
                for (let i = 0; i < 10; i++) {
                    const ang = (Math.PI * 2 / 10) * i + (this.phaseTimer * 3);
                    bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, ang, 420, 20, 'ENEMY', COLORS.secondary));
                }
                this.shotCounter = 0;
            }
        } else if (this.attackPhase === 2) {
            // SNIPER SHAKE
            if (this.shotCounter > 2.0) {
                const ang = Math.atan2(titan.y - this.y - this.h / 1.5, titan.x - this.x - this.w / 2);
                bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, ang, 1100, 30, 'ENEMY', COLORS.white, 'SNIPER'));
                this.shotCounter = 0;
            }
        } else if (this.attackPhase === 3) {
            // VERTICAL BARRAGE (Level 2+)
            if (this.shotCounter > 0.4) {
                const dropX = titan.x + random(-400, 800);
                bullets.push(new Projectile(dropX, camera.y - 100, Math.PI / 2, 700, 15, 'ENEMY', this.getLevelColor()));
                this.shotCounter = 0;
            }
        } else if (this.attackPhase === 4) {
            // PLASMA RAIN (Level 3+)
            if (this.shotCounter > 0.12) {
                const ang = Math.PI / 2 + Math.sin(this.phaseTimer * 5) * 0.5;
                bullets.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, ang, 600, 10, 'ENEMY', COLORS.primary));
                this.shotCounter = 0;
            }
        } else if (this.attackPhase === 5) {
            // ELITE DRONE DEPLOYMENT
            if (this.shotCounter > 1.8) {
                const spawnX = this.x + random(-150, 150);
                const spawnY = this.y + random(100, 200);
                const elite = new HostileUnit(spawnX, spawnY, 'DRONE');
                elite.integrity *= 1.5; // Boss minions are tougher
                enemies.push(elite);
                triggerTransition("TITAN SQUADRON DEPLOYED", COLORS.boss);
                this.shotCounter = 0;

                // Extra blast for feedback
                AudioFX.explosion();
                emitParticles(spawnX, spawnY, 'NORMAL', COLORS.boss, 15, 200);
            }
        }
    }

    getLevelColor() {
        if (this.pLevel === 1) return COLORS.boss;
        if (this.pLevel === 2) return COLORS.accent;
        return COLORS.primary;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const center = { x: this.w / 2, y: this.h / 2 };
        const pulseVal = Math.sin(Date.now() * 0.004) * 0.2 + 0.8;
        const levelColor = this.getLevelColor();

        // Rotating Core Atmosphere
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(Date.now() * 0.0005);

        if (!isMobile) {
            ctx.shadowBlur = (50 + (this.pLevel * 20)) * pulseVal;
            ctx.shadowColor = levelColor;
        }

        if (IMAGES_LOADED.boss) {
            ctx.drawImage(ASSETS.boss, -this.w / 2, -this.h / 2, this.w, this.h);
        } else {
            // Vector Boss Core
            const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
            grad.addColorStop(0, 'white');
            grad.addColorStop(0.3, levelColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, (100 + this.pLevel * 20) * pulseVal, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- DISTINCT BOSS MODELS BY LEVEL ---
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6;

        if (this.pLevel === 1) {
            // "VANGUARD" TYPE: Triangle Shield
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const a = (i * Math.PI * 2 / 3) + Date.now() * 0.002;
                ctx.lineTo(Math.cos(a) * 140, Math.sin(a) * 140);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (this.pLevel === 2) {
            // "CENTURION" TYPE: Twin Rings
            ctx.beginPath();
            ctx.arc(0, 0, 130, 0, Math.PI * 2);
            ctx.stroke();
            ctx.rotate(-Date.now() * 0.004);
            ctx.strokeRect(-120, -120, 240, 240);
        } else if (this.pLevel >= 3) {
            // "OVERLORD" TYPE: Geometric Spike Ring
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI * 2 / 8) + Date.now() * 0.001;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 130, Math.sin(a) * 130);
                ctx.lineTo(Math.cos(a) * 180, Math.sin(a) * 180);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // Mechanical Shield Rings (Scales with Level)
        const ringCount = 2 + this.pLevel;
        for (let i = 0; i < ringCount; i++) {
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(Date.now() * (0.001 * (i + 1)) * (i % 2 === 0 ? 1 : -1));
            ctx.strokeStyle = i === 0 ? COLORS.white : levelColor;
            ctx.lineWidth = Math.max(1, 4 - i);
            ctx.setLineDash([20, 40]);
            ctx.beginPath();
            ctx.arc(0, 0, 130 + i * 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Hit Flash
        if (this.flashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashTimer;
            ctx.fillStyle = 'white';
            ctx.strokeRect(0, 0, this.w, this.h);
            ctx.restore();
        }

        ctx.restore();
    }
}

class PickupAsset {
    static draw(ctx, x, y, model) {
        ctx.fillStyle = model === 'PLASMA' ? '#03a9f4' : '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// --- 12. WORLD ENGINE ---
class BackgroundScrap {
    constructor(x, y, size, color, speed) {
        this.x = x; this.y = y;
        this.size = size;
        this.color = color;
        this.speed = speed;
        this.osc = Math.random() * Math.PI * 2;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 2;
    }

    update(dt) {
        this.osc += dt * 0.5;
        this.rot += dt * this.rotSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x * 0.5, this.y - camera.y * 0.5); // Parallax
        ctx.rotate(this.rot);
        ctx.fillStyle = this.color;

        const alphaPulse = 0.15 + Math.sin(this.osc) * 0.1;
        ctx.globalAlpha = alphaPulse;

        // Randomize shape based on a simple index derived from initial position
        const shapeType = Math.floor(this.x + this.y) % 3;

        if (shapeType === 0) { // Triangle
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
            ctx.fill();
        } else if (shapeType === 1) { // Square
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else { // Cross/Plus
            ctx.fillRect(-this.size / 2, -this.size / 8, this.size, this.size / 4);
            ctx.fillRect(-this.size / 8, -this.size / 2, this.size / 4, this.size);
        }

        ctx.restore();
    }
}

class Skyscraper {
    constructor(x, w, h, depth) {
        this.x = x; this.w = w; this.h = h;
        this.depth = depth; // Parallax factor
        this.color = depth > 0.15 ? '#1a1a1a' : '#0a0a0a';
        this.windows = [];
        for (let i = 0; i < 15; i++) {
            this.windows.push({
                rx: random(5, w - 10),
                ry: random(5, h - 50),
                on: Math.random() > 0.5
            });
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x * this.depth, canvas.height - this.h - camera.y * 0.2);

        // At night, buildings are darker silhouettes
        const bColor = nightAlpha > 0.5 ? '#050505' : this.color;
        ctx.fillStyle = bColor;
        ctx.fillRect(0, 0, this.w, this.h);

        // Tech lines
        ctx.strokeStyle = nightAlpha > 0.5 ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)';
        ctx.strokeRect(0, 0, this.w, this.h);

        this.windows.forEach(w => {
            if (w.on) {
                // Brighter, warmer windows at night
                const glow = 0.1 + Math.sin(Date.now() * 0.001 + w.rx) * 0.1;
                ctx.globalAlpha = nightAlpha > 0.8 ? glow * 2.5 : glow;
                ctx.fillStyle = nightAlpha > 0.8 ? '#fff' : COLORS.primary;
                ctx.fillRect(w.rx, w.ry, 3, 3);
            }
        });
        ctx.restore();
    }
}



class SolidSurface {
    constructor(x, y, w, h, zone = 1) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.color = zone % 2 === 0 ? COLORS.platformAlt : COLORS.platform;
    }
    draw() {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        // Skip if off screen
        if (dx + this.w < 0 || dx > canvas.width || dy + this.h < 0 || dy > canvas.height) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(dx, dy, this.w, this.h);

        // Edge stroke (skip shadowBlur on mobile)
        if (!isMobile) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(dx, dy, this.w, this.h);
            ctx.restore();
        }

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(dx, dy, this.w, 4);

        ctx.strokeStyle = '#3d3d3d';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx, dy, this.w, this.h);
    }
}

class CheckpointWall {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = canvas.height * 2.5;
        this.isPassed = false;
        this.noiseSeed = Math.random() * 1000;
    }

    draw() {
        if (this.isPassed) return;
        const dx = this.x - camera.x;
        // Optimization: skip if far off screen
        if (dx + 200 < 0 || dx - 200 > canvas.width) return;

        ctx.save();
        ctx.translate(dx, 0);

        // Glass Wall Base (Frosted/Prismatic)
        const grad = ctx.createLinearGradient(-this.w / 2, 0, this.w / 2, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.3, 'rgba(0, 229, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(0.7, 'rgba(0, 229, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

        ctx.fillStyle = grad;
        ctx.fillRect(-this.w / 2, 0, this.w, canvas.height);

        // Glass Internal Cracks/Fractures
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 15; i++) {
            const ry = ((i * 123 + this.noiseSeed) % canvas.height);
            ctx.moveTo(-this.w / 2, ry);
            ctx.lineTo(this.w / 2, ry + (Math.sin(i) * 40));
        }
        ctx.stroke();

        // Prismatic Edges
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeRect(-this.w / 2, 0, this.w, canvas.height);

        // Scanning Pulse
        const p = (Date.now() * 0.001) % 1;
        ctx.fillStyle = `rgba(0, 229, 255, ${0.4 * (1 - p)})`;
        ctx.fillRect(-this.w / 2, p * canvas.height, this.w, 40);

        // Highlight Glow
        if (!isMobile) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = COLORS.primary;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(-2, 0, 4, canvas.height);
        }

        ctx.restore();
    }
}

class DestructibleBlock {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 50; this.h = 50;
        this.hp = 20;
        this.color = '#333';
    }
    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        // Rigid Industrial Box Look
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.w, this.h);

        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.w, this.h);

        // Inner tech pattern
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(this.w, this.h);
        ctx.moveTo(this.w, 0); ctx.lineTo(0, this.h);
        ctx.stroke();

        // Center core glow
        const glow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.fillStyle = COLORS.accent;
        ctx.globalAlpha = glow * 0.5;
        ctx.fillRect(this.w / 2 - 5, this.h / 2 - 5, 10, 10);

        ctx.restore();
    }
}

// Object Pools
let destructibles = [];

/**
 * Procedural Sector Builder
 */
function buildWorldSectors(rangeX, unlimited = false) {
    let sectorsBuilt = 0;
    const maxSectorsPerFrame = isMobile ? 2 : 8;
    while (nextPlatformX < rangeX) {
        if (!unlimited && sectorsBuilt >= maxSectorsPerFrame) break;
        sectorsBuilt++;
        const platW = random(480, 950);
        const lastY = platforms.length > 0 ? platforms[platforms.length - 1].y : canvas.height * 0.6;

        // Ensure next platform is within jumping range (+/- 160px height difference)
        const platX = nextPlatformX + random(160, 360);
        const platY = Math.max(canvas.height * 0.25, Math.min(canvas.height * 0.85, lastY + random(-160, 160)));

        platforms.push(new SolidSurface(platX, platY, platW, 45, currentZone));

        // Physical Checkpoint Spawn
        if (platX > lastCheckpointSpawnX + CHECKPOINT_INTERVAL) {
            checkpoints.push(new CheckpointWall(platX + platW / 2, platY));
            lastCheckpointSpawnX = platX;
        }

        // Background floating objects (even under the floor)
        for (let i = 0; i < 3; i++) {
            const bx = platX + random(0, platW);
            const by = random(-200, canvas.height + 600);
            const bSize = random(10, 40);
            backgroundObjects.push(new BackgroundScrap(bx, by, bSize, i % 2 === 0 ? COLORS.primary : COLORS.secondary, 0));
        }

        // Hostile Population (Increased Density)
        if (Math.random() > 0.25) {
            const hModel = Math.random() > 0.85 ? 'SNIPER' : (Math.random() > 0.7 ? 'TANK' : 'DRONE');
            enemies.push(new HostileUnit(platX + platW / 2, platY - 55, hModel));
        }

        // Logistics Population
        if (Math.random() > 0.93) {
            pickups.push({ posX: platX + platW / 2, posY: platY - 50, model: 'SPREAD', isFound: false });
        }

        // Destructible Crates
        if (Math.random() > 0.6) {
            destructibles.push(new DestructibleBlock(platX + random(100, platW - 100), platY - 50));
        }

        // Randomly spawn special armaments
        if (Math.random() > 0.95) {
            const types = ['PLASMA', 'HEAVY'];
            pickups.push({ posX: platX + random(50, platW - 50), posY: platY - 50, model: types[Math.floor(Math.random() * 2)], isFound: false });
        }

        nextPlatformX = platX + platW;

        // Populate Urban Background
        if (Math.random() > 0.7) {
            urbanParallax.push(new Skyscraper(platX, random(200, 400), random(600, 1200), random(0.05, 0.25)));
        }
    }
}

/**
 * Dynamic Combat Events
 */
function triggerTitanIncursion() {
    const dangerLevel = Math.floor(distanceTraveled / 25000);
    boss = new TitanBoss(player.x + 1200, player.y, dangerLevel);

    AudioFX.bossEntry();
    screenShake = 45;
    screenFlash = 0.4;

    // Consolidate warning: Redundant alertBox removed, using triggerTransition only.
    triggerTransition(`CRITICAL: TITAN-CLASS ${dangerLevel + 1} DETECTED`, COLORS.boss);

    bossHud.classList.remove('hidden');
    bossHealthFill.style.width = '100%';
}

function reachCheckpoint(x, y) {
    lastDistanceCheckpoint = distanceTraveled;
    lastCheckpointKillScore = killScore;

    // Glass Shatter Visuals
    const shards = isMobile ? 25 : 60;
    for (let i = 0; i < shards; i++) {
        const py = Math.random() * canvas.height;
        const color = Math.random() > 0.5 ? '#fff' : COLORS.primary;
        // Explode outward from the center line of the wall
        particles.push(new ParticleSystem(
            x + random(-10, 10),
            py,
            color,
            random(4, 12),
            random(200, 800) * (Math.random() > 0.5 ? 1 : -1),
            random(-300, 300),
            random(0.8, 1.5),
            Math.random() > 0.5 ? 'SQUARE' : 'CIRCLE'
        ));
    }

    // Secondary dust clouds
    emitParticles(x, y, 'SMOKE', '#fff', 15, 200);

    // Vibration
    if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
    }

    // Recovery
    player.hp = Math.min(player.maxHp, player.hp + 15);
    healthFill.style.width = `${Math.ceil(player.hp)}%`;

    AudioFX.shatter(); // Play new glass shatter sound
    screenShake = 15; // Jolt the camera

    // Drifting notification
    floatingTexts.push(new FloatingScore(x, player.y - 150, "CHECKPOINT REACHED", COLORS.accent, 35));
}

let transitionTimer = 0;
let transitionText = "";
let transitionColor = "";

function triggerTransition(text, color) {
    if (transitionTimer > 0.5 && text.includes("BOSS")) return; // Don't overlap boss warnings if one is active
    transitionTimer = 3.0; // Longer for better visibility
    transitionText = text;
    transitionColor = color;
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
        pauseHighScoreEl.innerText = highScore.toString().padStart(6, '0');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseScreen.classList.add('hidden');
        lastFrameTime = performance.now(); // Reset delta to prevent huge jumps
    }
}

function activateNeuralOverdrive() {
    if (neuralSync < 100 || isNeuralOverdrive) return;

    isNeuralOverdrive = true;
    overdriveTimer = 10.0; // 10 seconds of terror
    screenFlash = 1.0;
    screenShake = 60;
    uiLayer.classList.add('overdrive-active', 'neural-overdrive');
    triggerCombatAlert("NEURAL OVERDRIVE: TRANSCENDENCE ACTIVE", COLORS.primary, "⚡");
    AudioFX.bossEntry(); // Use a heavy sound
}

// --- 13. SYSTEM ORCHESTRATION ---
function rebootSystem() {
    player = new PlayerTitan();
    platforms = []; particles = []; bullets = []; enemies = []; pickups = [];
    floatingTexts = []; destructibles = []; alerts = []; checkpoints = [];
    boss = null;
    score = 0; killScore = 0;
    syncFill.style.width = '0%';
    uiLayer.classList.remove('overdrive-active', 'neural-overdrive');
    lastBossCheckpoint = 0;
    lastDistanceCheckpoint = 0;
    lastCheckpointSpawnX = 0;
    currentZone = 1;
    backgroundObjects = [];
    urbanParallax = [];
    weatherSystems = [];

    // Clear stuck input (critical for mobile restart)
    clearAllInputs();

    // UI Hard Reset
    bossHud.classList.add('hidden');
    healthFill.style.width = '100%';
    scoreEl.innerText = "000000";
    if (distanceEl) distanceEl.innerText = "0m";
    document.body.classList.remove('danger');

    // Deployment Platform
    platforms.push(new SolidSurface(0, 500, 1800, 90, 1));
    nextPlatformX = 2000;

    buildWorldSectors(6000, true);

    // Init Weather
    weatherSystems = [];

    if (isTouchDevice) mobileControls.classList.remove('hidden');
}

function rebootFromCheckpoint() {
    if (lastDistanceCheckpoint === 0) {
        rebootSystem();
        return;
    }

    // Restore Player and Stats
    player = new PlayerTitan();
    player.x = lastDistanceCheckpoint;
    player.y = 100; // Drop in from top
    camera.x = player.x - canvas.width * 0.35;
    camera.y = player.y;

    distanceTraveled = lastDistanceCheckpoint; // Fixes distance pausing
    killScore = lastCheckpointKillScore;       // Fixes score pausing
    score = Math.floor(distanceTraveled / 10) + killScore;

    // Reset Environment & UI
    platforms = []; particles = []; bullets = []; enemies = []; pickups = [];
    floatingTexts = []; destructibles = []; alerts = []; checkpoints = [];
    boss = null;
    syncFill.style.width = '0%';
    uiLayer.classList.remove('overdrive-active', 'neural-overdrive');
    lastCheckpointSpawnX = lastDistanceCheckpoint;
    backgroundObjects = [];
    urbanParallax = [];
    weatherSystems = [];

    clearAllInputs();

    bossHud.classList.add('hidden');
    healthFill.style.width = '100%';
    scoreEl.innerText = score.toString().padStart(6, '0');
    if (distanceEl) distanceEl.innerText = `${Math.floor(distanceTraveled / 10)}m`;
    document.body.classList.remove('danger');

    // Rebuild Sector Geometry seamlessly
    platforms.push(new SolidSurface(lastDistanceCheckpoint - 400, 500, 2000, 90, currentZone));
    nextPlatformX = lastDistanceCheckpoint + 1600;

    buildWorldSectors(lastDistanceCheckpoint + 6000, true);

    if (isTouchDevice) mobileControls.classList.remove('hidden');
}

function initiateSystemHalt() {
    // Enter DYING state instead of immediate GAMEOVER
    gameState = 'DYING';
    deathTimer = 0;
    deathFadeAlpha = 0;

    // Give the player a dramatic upward pop then let gravity take over
    deathPlayerVX = player.vx * 0.3 + random(-100, 100);
    deathPlayerVY = -500; // Pop upward
    deathPlayerSpin = (Math.random() > 0.5 ? 1 : -1) * random(4, 8);

    // Big death explosion
    screenShake = 40;
    screenFlash = 0.8;
    emitParticles(player.x + player.w / 2, player.y + player.h / 2, 'NORMAL', COLORS.secondary, 50, 600);
    emitParticles(player.x + player.w / 2, player.y + player.h / 2, 'BITS', '#fff', 20, 300);
    AudioFX.heavyExplosion();

    // Prepare final scores
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cyberstrike_highscore', highScore);
    }
    finalScoreEl.innerText = score.toString().padStart(6, '0');
    overHighScoreEl.innerText = highScore.toString().padStart(6, '0');
    const unitEl = document.getElementById('unit-status');
    if (unitEl) {
        let status = 'COMPROMISED';
        if (score > 5000) status = 'OPERATIVE';
        if (score > 15000) status = 'TITAN HUNTER';
        if (score > 40000) status = 'NEURAL ARCHITECT';
        if (score > 100000) status = 'OVERDRIVE GOD';
        unitEl.innerText = status;
    }

    // Clear all stuck inputs
    clearAllInputs();
    document.body.classList.remove('danger');
    if (isTouchDevice) mobileControls.classList.add('hidden');
}

function finalizeDeathSequence() {
    gameState = 'GAMEOVER';
    gameOverScreen.style.opacity = '0';
    gameOverScreen.classList.remove('hidden');
    // Smooth fade-in of the game over screen
    let fadeIn = 0;
    const fadeInterval = setInterval(() => {
        fadeIn += 0.04;
        gameOverScreen.style.opacity = Math.min(fadeIn, 1).toString();
        if (fadeIn >= 1) {
            gameOverScreen.style.opacity = '1';
            clearInterval(fadeInterval);
        }
    }, 16);
}

/**
 * Primary Execution Frame
 */
function tick(timestamp) {
    let delta = Math.min((timestamp - lastFrameTime) / 1000, 0.05); // More aggressive cap for mobile stability
    lastFrameTime = timestamp;

    // Apply Time Scale for Matrix Effects
    timeScale = lerp(timeScale, 1.0, 0.05);

    if (gameState === 'PAUSED') {
        drawFrame(0);
        return requestAnimationFrame(tick);
    }

    if (gameState === 'PLAYING') {
        if (!player) { gameState = 'START'; startScreen.classList.remove('hidden'); return requestAnimationFrame(tick); }
        player.update(delta);

        // Smooth Multi-Point Camera
        const camTX = player.x - canvas.width * 0.35 + (mouse.x - canvas.width / 2) * 0.22;
        const camTY = player.y - canvas.height * 0.5 + (mouse.y - canvas.height / 2) * 0.22;
        camera.x = lerp(camera.x, camTX, 0.12);
        camera.y = lerp(camera.y, camTY, 0.1);

        // Shake Decay (clamped)
        if (screenShake > 0) {
            screenShake = Math.min(screenShake, 60); // Clamp max shake
            camera.x += random(-screenShake, screenShake);
            camera.y += random(-screenShake, screenShake);
            screenShake *= 0.91;
            if (screenShake < 0.3) screenShake = 0;
        }

        // Combat Collision Management
        handleBulletCollisions(delta);

        // Enemy/Boss Systems
        handleEntityDynamics(delta);

        // Environment Streaming (Throttled for mobile health)
        if (Math.floor(timestamp / 50) % 2 === 0) {
            buildWorldSectors(player.x + 3000);
        }

        // Memory Garbage Collection (Throttled)
        if (Math.floor(timestamp / 100) % 5 === 0) {
            garbageCollection();
        }

        // Global Statistics
        processScoring(delta);

        // Visual Updates
        player.updateVisuals(delta);

        if (screenFlash > 0) screenFlash -= delta * 4;
    }

    // --- DYING STATE: Cinematic Death Sequence ---
    if (gameState === 'DYING') {
        const slowDelta = delta * 0.4; // Slow-motion effect
        deathTimer += delta;

        // Ragdoll physics on the dead player
        if (player) {
            deathPlayerVY += 1200 * slowDelta; // Gravity
            player.x += deathPlayerVX * slowDelta;
            player.y += deathPlayerVY * slowDelta;
            player.rotation += deathPlayerSpin * slowDelta;
            deathPlayerVX *= 0.98; // Air drag
        }

        // Camera slowly zooms in and follows the falling body
        if (player) {
            const camTX = player.x - canvas.width * 0.5 + player.w / 2;
            const camTY = player.y - canvas.height * 0.4;
            camera.x = lerp(camera.x, camTX, 0.06);
            camera.y = lerp(camera.y, camTY, 0.06);
        }

        // Shake decay during death
        if (screenShake > 0) {
            camera.x += random(-screenShake, screenShake);
            camera.y += random(-screenShake, screenShake);
            screenShake *= 0.93;
            if (screenShake < 0.3) screenShake = 0;
        }

        // Update particles during death
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(slowDelta);
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            floatingTexts[i].update(slowDelta);
            if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
        }

        // Fade to black over time
        const fadeStart = 0.8; // Start fading at 0.8s
        if (deathTimer > fadeStart) {
            deathFadeAlpha = Math.min(1.0, (deathTimer - fadeStart) / (DEATH_DURATION - fadeStart));
        }

        if (screenFlash > 0) screenFlash -= delta * 3;

        // Sequence complete - transition to game over
        if (deathTimer >= DEATH_DURATION) {
            finalizeDeathSequence();
        }
    }

    drawFrame(delta);
    requestAnimationFrame(tick);
}

/**
 * Sub-system Logic Clusters
 */
function handleBulletCollisions(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update(delta);
        if (b.activeTime <= 0) {
            bullets.splice(i, 1);
            continue;
        }

        const bRect = { x: b.x - 10, y: b.y - 10, w: 20, h: 20 };

        if (b.source === 'ENEMY') {
            if (bRect.x < player.x + player.w && bRect.x + bRect.w > player.x &&
                bRect.y < player.y + player.h && bRect.y + bRect.h > player.y) {

                let kX = b.vx * 0.8;
                let kY = b.vy * 0.6 - 300; // Bump upwards
                if (b.type === 'KNOCKBACK') { kX *= 2.5; kY -= 200; }

                player.takeHit(b.dmg, kX, kY);
                bullets.splice(i, 1);
            }
        } else {
            // Neutralization Loop
            let hit = false;
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const en = enemies[ei];
                if (en.hasExpired) continue;
                if (bRect.x < en.x + en.w && bRect.x + bRect.w > en.x &&
                    bRect.y < en.y + en.h && bRect.y + bRect.h > en.y) {
                    en.integrity -= b.dmg;
                    en.flashTimer = 1.0;
                    bullets.splice(i, 1);
                    hit = true;
                    emitParticles(en.x + en.w / 2, en.y + en.h / 2, 'BITS', COLORS.enemy, 4, 150);
                    if (en.integrity <= 0) {
                        en.hasExpired = true;
                        flagEnemyKill(en);
                    }
                    break;
                }
            }
            if (hit) continue;

            for (let di = destructibles.length - 1; di >= 0; di--) {
                const db = destructibles[di];
                if (bRect.x < db.x + db.w && bRect.x + bRect.w > db.x &&
                    bRect.y < db.y + db.h && bRect.y + bRect.h > db.y) {
                    db.hp -= b.dmg;
                    bullets.splice(i, 1);
                    hit = true;
                    if (db.hp <= 0) {
                        destructibles.splice(di, 1);
                        emitParticles(db.x + 25, db.y + 25, 'NORMAL', COLORS.accent, 35, 300); // Increased
                        emitParticles(db.x + 25, db.y + 25, 'BITS', '#fff', 15, 150);
                        score += 500;
                        const dropSeed = Math.random();
                        if (dropSeed > 0.4) {
                            const types = ['RAPID_FIRE', 'SPEED', 'SHIELD'];
                            const chosen = types[Math.floor(Math.random() * types.length)];
                            pickups.push({ posX: db.x + 25, posY: db.y + 25, model: chosen, isFound: false });
                        }
                        AudioFX.explosion();
                    }
                    break;
                }
            }
            if (hit) continue;

            if (boss && bRect.x < boss.x + boss.w && bRect.x + bRect.w > boss.x &&
                bRect.y < boss.y + boss.h && bRect.y + bRect.h > boss.y) {
                boss.hitPoints -= b.dmg;
                boss.flashTimer = 1.0; // TRIGGER FLASH
                bullets.splice(i, 1);
                screenShake = 5;
                // Impact spark for boss
                emitParticles(b.x, b.y, 'BITS', COLORS.primary, 3, 100);
                bossHealthFill.style.width = `${Math.ceil((boss.hitPoints / boss.maxHitPoints) * 100)}%`;
                if (boss.hitPoints <= 0) finalizeBoss();
            }
        }
    }
}

function handleEntityDynamics(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        if (en.hasExpired || en.x < player.x - 2500) {
            enemies.splice(i, 1);
            continue;
        }
        en.update(delta, player);
        if (en.hasExpired) continue;
        if (!player.isCompromised && Math.hypot(player.x + 16 - (en.x + 24), player.y + 24 - (en.y + 24)) < 45) {
            // NEURAL PHASING: Kill enemies while dashing in Overdrive
            if (isNeuralOverdrive && player.isDashActive) {
                en.hasExpired = true;
                flagEnemyKill(en);
                score += 1000; // Bonus for phasing
                emitParticles(en.x, en.y, 'BITS', COLORS.white, 20, 300);
            } else {
                player.takeHit(10, (player.x - en.x) * 5, -200);
            }
        }
    }

    // Always track distance, even during boss fights
    distanceTraveled = Math.max(distanceTraveled, player.x);

    if (boss) {
        boss.update(delta, player);
    } else {
        // Boss Spawn Check
        if (distanceTraveled - lastBossCheckpoint > BOSS_INTERVAL) {
            triggerTitanIncursion();
            lastBossCheckpoint = distanceTraveled;
            currentZone++;
        }

        // Physical Checkpoint Collision
        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];
            // Check if player passed the wall (with 50px tolerance buffer)
            if (!cp.isPassed && player.x + (player.w / 2) > cp.x - (cp.w / 2)) {
                cp.isPassed = true;
                reachCheckpoint(cp.x, cp.y);
            }
        }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
        const pu = pickups[i];
        if (!pu.isFound && Math.hypot(player.x + 16 - pu.posX, player.y + 24 - pu.posY) < 65) {

            // CONSTRAIN: Only one timed buff at a time
            const TimedModels = ['RAPID_FIRE', 'SPEED', 'SHIELD'];
            const anyTimedActive = player.powerUps.rapidFire > 0 || player.powerUps.speedBoost > 0 || player.powerUps.shield > 0;

            if (anyTimedActive && TimedModels.includes(pu.model)) {
                continue; // Can't pick up a new timed buff until the current one expires
            }

            if (pu.model === 'RAPID_FIRE') {
                player.powerUps.rapidFire = 8.0;
                triggerCombatAlert("STRIKE CAPACITY OVERLOAD", COLORS.accent, "🔥");
            } else if (pu.model === 'SPEED') {
                player.powerUps.speedBoost = 8.0;
                triggerCombatAlert("OVERDRIVE ENGAGED", COLORS.primary, "⚡");
            } else if (pu.model === 'SHIELD') {
                player.powerUps.shield = 10.0;
                triggerCombatAlert("NEGATION FIELD STABLE", COLORS.primary, "🛡");
            } else if (pu.model === 'PLASMA' || pu.model === 'HEAVY') {
                player.activeArmament = pu.model;
                weaponNameEl.innerText = `${pu.model} CORE`;
                const weaponIcon = pu.model === 'PLASMA' ? "💠" : "💣";
                triggerCombatAlert(`WEAPON SYSTEM: ${pu.model} INTEGRATED`, pu.model === 'PLASMA' ? "#03a9f4" : "#ff9800", weaponIcon);
            }
            fulfillPickup(pu, i);
            break;
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(delta);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(delta);
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }
    for (let i = alerts.length - 1; i >= 0; i--) {
        alerts[i].update(delta);
        if (alerts[i].life <= 0) alerts.splice(i, 1);
    }
    backgroundObjects.forEach(bo => bo.update(delta));

    if (player.glitchIntensity > 0) player.glitchIntensity -= delta * 2;
}
function flagEnemyKill(en) {
    comboCount++;
    comboTimer = 2.5;
    const gain = 600 * (1 + (comboCount * 0.15));
    killScore += Math.floor(gain);
    AudioFX.explosion();
    emitParticles(en.x + en.w / 2, en.y + en.h / 2, 'NORMAL', COLORS.secondary, 30, 450);
    emitParticles(en.x + en.w / 2, en.y + en.h / 2, 'BITS', '#fff', 10, 250);
    floatingTexts.push(new FloatingScore(en.x + en.w / 2, en.y, `+${Math.floor(gain)}`, COLORS.white, 22 + comboCount));
    if (!isNeuralOverdrive) {
        neuralSync = Math.min(100, neuralSync + 2 + (comboCount * 0.5));
        syncFill.style.width = `${neuralSync}%`;
        if (neuralSync >= 100) triggerCombatAlert("NEURAL SYNC CRYSTALLIZED: [Q]", COLORS.primary, "🧠");
    }
    if (comboCount > 1) floatingTexts.push(new FloatingScore(en.x + en.w / 2, en.y - 40, `X${comboCount} COMBO`, COLORS.primary, 18));
}

function finalizeEnemy(en, index) {
    if (!en.hasExpired) {
        en.hasExpired = true;
        flagEnemyKill(en);
    }
}

function finalizeBoss() {
    if (!boss) return; // Safety guard
    const hugeGain = 15000;
    killScore += hugeGain;
    AudioFX.heavyExplosion();
    screenFlash = 1.0;
    emitParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, 'NORMAL', COLORS.boss, 100, 1000);
    emitParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, 'SMOKE', '#000', 30, 200);
    floatingTexts.push(new FloatingScore(boss.x + boss.w / 2, boss.y, `TITAN ERADICATED +${hugeGain}`, COLORS.primary, 45));

    // DROP BUFFS
    for (let i = 0; i < 3; i++) {
        pickups.push({
            posX: boss.x + boss.w / 2 + random(-100, 100),
            posY: boss.y + boss.h / 2 + random(-100, 100),
            model: 'SPREAD',
            isFound: false
        });
    }

    // Advance checkpoint so next boss doesn't trigger immediately
    lastBossCheckpoint = distanceTraveled;

    boss = null;
    bossHud.classList.add('hidden');
    screenShake = 120; // Massive impact
}

function fulfillPickup(pu, index) {
    pu.isFound = true;

    const weaponModels = ['PULSE', 'PLASMA', 'HEAVY'];
    const buffModels = ['RAPID_FIRE', 'SPEED', 'SHIELD'];

    if (weaponModels.includes(pu.model)) {
        player.activeArmament = pu.model;
        weaponNameEl.innerText = `${pu.model} ARMAMENT`;
        floatingTexts.push(new FloatingScore(pu.posX, pu.posY, "ARMAMENT UPGRADED", COLORS.accent, 28));
        killScore += 1500;
    } else if (pu.model === 'SPREAD') {
        player.activeArmament = 'SPREAD';
        weaponNameEl.innerText = `SPREAD ARMAMENT`;
        floatingTexts.push(new FloatingScore(pu.posX, pu.posY, "SPREAD UNLOCKED", COLORS.accent, 28));
        killScore += 1500;
    } else if (buffModels.includes(pu.model)) {
        // Buff already applied in handleEntityDynamics, just score + fx
        floatingTexts.push(new FloatingScore(pu.posX, pu.posY, "SYSTEM OVERCLOCK", COLORS.primary, 28));
        killScore += 500;
    }

    AudioFX.pickup();
}

function garbageCollection() {
    // Aggressive cleanup for performance and freeze prevention
    const cleanDist = isMobile ? 1200 : 1800;
    if (platforms.length > 40) platforms = platforms.filter(p => p.x + p.w > player.x - cleanDist);
    if (pickups.length > 15) pickups = pickups.filter(pu => pu.posX > player.x - cleanDist);
    if (backgroundObjects.length > (isMobile ? 15 : 30)) backgroundObjects = backgroundObjects.filter(bo => bo.x > player.x - cleanDist);
    if (enemies.length > (isMobile ? 8 : 20)) enemies = enemies.filter(en => !en.hasExpired && en.x > player.x - cleanDist);
    if (bullets.length > MAX_BULLETS) bullets.splice(0, bullets.length - MAX_BULLETS);
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    if (destructibles.length > (isMobile ? 10 : 20)) destructibles = destructibles.filter(db => db.x + db.w > player.x - cleanDist);
    if (urbanParallax.length > (isMobile ? 8 : 20)) urbanParallax = urbanParallax.filter(s => s.x + s.w > camera.x - 3000);
    if (floatingTexts.length > 40) floatingTexts.splice(0, floatingTexts.length - 40); // Hard bounds
    if (weatherSystems.length > 200) weatherSystems.splice(0, weatherSystems.length - 200); // Hard bounds
}

function processScoring(delta) {
    if (comboTimer > 0) {
        comboTimer -= delta;
        if (comboTimer <= 0) comboCount = 0;
    }

    // Neural Overdrive Depletion
    if (isNeuralOverdrive) {
        overdriveTimer -= delta;
        neuralSync = (overdriveTimer / 10) * 100;
        syncFill.style.width = `${neuralSync}%`;

        if (overdriveTimer <= 0) {
            isNeuralOverdrive = false;
            neuralSync = 0;
            syncFill.style.width = '0%';
            uiLayer.classList.remove('overdrive-active', 'neural-overdrive');
            triggerTransition("NEURAL COOLING INITIATED", COLORS.accent);
        }
    }

    // High-precision score calculation
    const distScore = Math.floor(distanceTraveled / 10);
    score = distScore + killScore;
    scoreEl.innerText = score.toString().padStart(6, '0');
    if (distanceEl) distanceEl.innerText = `${distScore}m`;
}

/**
 * MASTER RENDER ARCHITECTURE
 */
function drawFrame(delta) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Neural Night Cycle Lerp
    const targetNight = (distanceTraveled > 110000) ? 1.0 : 0.0;
    nightAlpha = lerp(nightAlpha, targetNight, 0.005);

    // Stable Matte Obsidian Base
    ctx.fillStyle = nightAlpha > 0.5 ? '#000' : COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // NEURAL OVERDRIVE: WIREFRAME DOMINANCE
    if (isNeuralOverdrive) {
        const gridStep = isMobile ? 80 : 40;
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i += gridStep) {
            ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        }
        for (let j = 0; j < canvas.height; j += gridStep) {
            ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.05;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    if (nightAlpha > 0.1) {
        // High-Quality Moon
        ctx.save();
        ctx.globalAlpha = nightAlpha;
        const moonX = canvas.width * 0.82;
        const moonY = 140;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 100);
        glowGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
        glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(moonX - 100, moonY - 100, 200, 200);

        // Moon Body
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 40 * nightAlpha;
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Massive Starfield (Twinkly & Bright)
        ctx.save();
        ctx.globalAlpha = nightAlpha;
        for (let i = 0; i < 80; i++) {
            const sx = (i * 213 + worldSeed * 1000) % canvas.width;
            const sy = (i * 357 + worldSeed * 2000) % canvas.height;
            const flicker = 0.5 + Math.sin(Date.now() * 0.003 + i) * 0.5;
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = nightAlpha * flicker;
            const sSize = Math.random() * (i % 10 === 0 ? 3 : 1.5);
            ctx.beginPath();
            ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Deep Space Parallax (Rich, Layered Stars)
    const backgroundStars = [
        { x: 100, y: 150, s: 1.5, p: 0.1, c: '#fff' },
        { x: 500, y: 300, s: 2.0, p: 0.2, c: COLORS.primary },
        { x: 900, y: 100, s: 1.2, p: 0.15, c: '#fff' },
        { x: 300, y: 600, s: 3.0, p: 0.4, c: COLORS.accent }, // Fast moving accent star
        { x: 800, y: 700, s: 1.4, p: 0.12, c: '#fff' },
        { x: 1200, y: 400, s: 2.5, p: 0.25, c: COLORS.secondary }
    ];
    backgroundStars.forEach(s => {
        let sx = (s.x - camera.x * s.p) % canvas.width;
        let sy = (s.y - camera.y * s.p * 0.5) % canvas.height;
        if (sx < 0) sx += canvas.width; if (sy < 0) sy += canvas.height;

        ctx.fillStyle = s.c;
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.001 + s.x) * 0.2;
        ctx.beginPath();
        if (s.p > 0.3) { // Speed streaks for closer stars
            ctx.rect(sx, sy, s.s * 4, s.s / 2);
        } else {
            ctx.arc(sx, sy, s.s, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Grid Mesh Removed for Premium Matte Look

    // Urban World
    urbanParallax.forEach(up => up.draw());

    // Entity Render Stack
    backgroundObjects.forEach(bo => bo.draw());
    platforms.forEach(p => p.draw());
    destructibles.forEach(db => db.draw());
    checkpoints.forEach(cp => cp.draw());

    pickups.forEach(pu => {
        if (!pu.isFound) {
            if (pu.model === 'PLASMA' || pu.model === 'HEAVY') {
                PickupAsset.draw(ctx, pu.posX - camera.x, pu.posY - camera.y, pu.model);
            } else {
                ctx.save();
                ctx.translate(pu.posX - camera.x, pu.posY - camera.y);
                const color = (pu.model === 'RAPID_FIRE' || pu.model === 'SPREAD') ? COLORS.accent : COLORS.primary;
                ctx.fillStyle = color;
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.rotate(Date.now() * 0.01);
                ctx.beginPath();
                ctx.moveTo(0, -20); ctx.lineTo(15, 0); ctx.lineTo(0, 20); ctx.lineTo(-15, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.fillRect(-4, -4, 8, 8);
                ctx.restore();
            }
        }
    });

    enemies.forEach(e => { if (!e.hasExpired) e.draw(); });
    if (boss) boss.draw();
    bullets.forEach(b => b.draw());
    particles.forEach(p => p.draw());

    if (gameState === 'PLAYING' || gameState === 'DYING') player.draw();

    // UI HUD Layers (Text drawn on top)
    if (gameState !== 'DYING') drawPowerUpBars();
    floatingTexts.forEach(ft => ft.draw());
    alerts.forEach((alert, i) => alert.draw(i));

    // Speed & Motion Juice
    if (gameState !== 'DYING') drawSpeedVignette();

    // Global Screen Flash
    if (screenFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(screenFlash, 1.0);
        ctx.fillStyle = gameState === 'DYING' ? '#fff' : '#fff'; // White flash for both
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Visual Transition Overlays
    if (transitionTimer > 0) {
        drawTransitionOverlay(delta);
    }

    // CRT Overlay
    drawCRTScanlines();

    // Damage Glitch Logic
    if (player && player.glitchIntensity > 0) {
        drawDamageGlitch();
    }

    // --- DEATH FADE OVERLAY ---
    if (gameState === 'DYING' && deathFadeAlpha > 0) {
        ctx.save();

        // Red vignette first, then fades to full black
        const redPhase = Math.min(deathFadeAlpha * 2, 1.0);
        const blackPhase = Math.max(0, (deathFadeAlpha - 0.4) / 0.6);

        // Red danger vignette
        if (redPhase > 0 && blackPhase < 1) {
            const vig = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.1,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(255, 0, 40, ${redPhase * 0.6})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Black fade
        if (blackPhase > 0) {
            ctx.globalAlpha = blackPhase;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // "SYSTEM COMPROMISED" text flicker
        if (deathFadeAlpha > 0.3 && deathFadeAlpha < 0.95) {
            ctx.globalAlpha = (Math.sin(Date.now() * 0.02) * 0.3 + 0.7) * (1 - blackPhase);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fff'; // White glow
            ctx.font = 'italic 900 48px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SYSTEM COMPROMISED', canvas.width / 2, canvas.height / 2);

            // Glitch offset duplicate
            ctx.globalAlpha *= 0.4;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#777'; // Grey shade
            ctx.fillText('SYSTEM COMPROMISED', canvas.width / 2 + random(-6, 6), canvas.height / 2 + random(-3, 3));
        }

        ctx.restore();
    }
}

function drawDamageGlitch() {
    const intensity = player.glitchIntensity;
    ctx.save();

    // Split-scan glitch strips (fewer on mobile)
    const stripCount = isMobile ? 4 : 12;
    for (let i = 0; i < stripCount; i++) {
        const h = random(2, 40);
        const y = random(0, canvas.height);
        const offset = random(-80, 80) * intensity;
        ctx.globalAlpha = intensity * 0.5;
        if (gameState === 'DYING') {
            ctx.fillStyle = i % 2 === 0 ? '#fff' : '#777'; // Monochrome theme
        } else {
            ctx.fillStyle = i % 2 === 0 ? COLORS.secondary : COLORS.primary; // Combat theme
        }
        ctx.fillRect(offset, y, canvas.width, h);
    }

    // Full screen color inversion flash (very brief) - skip on mobile
    if (!isMobile && Math.random() > 0.9) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
}

function drawSpeedVignette() {
    if (!player) return;
    const speed = Math.hypot(player.vx, player.vy);
    const speedFactor = Math.min(1.0, (speed - 800) / 1200);
    if (speedFactor <= 0) return;

    // Skip gradient vignette on mobile for perf
    if (!isMobile) {
        ctx.save();
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.9
        );
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, `rgba(0, 229, 255, ${speedFactor * 0.15})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Speed Stretched Particles (fewer on mobile)
    const lineCount = isMobile ? 5 : 15;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < lineCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const len = 100 * speedFactor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (player.vx > 0 ? -len : len), y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPowerUpBars() {
    if (!player || !player.powerUps) return;

    // Positioned at Mid-Left for maximum visibility
    let yOffset = canvas.height / 2 - 40;
    const barW = 160;
    const barH = 10;

    const timers = [
        { label: 'STRIKE OVERLOAD', val: player.powerUps.rapidFire, max: 8.0, color: COLORS.accent },
        { label: 'OVERDRIVE SPEED', val: player.powerUps.speedBoost, max: 8.0, color: COLORS.primary },
        { label: 'NEGATION FIELD', val: player.powerUps.shield, max: 10.0, color: COLORS.white }
    ];

    timers.forEach(t => {
        if (t.val > 0) {
            ctx.save();
            ctx.translate(30, yOffset);

            // Bar Background Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, barW, barH);

            // Bar Fill with Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = t.color;
            ctx.fillStyle = t.color;
            ctx.fillRect(0, 0, (t.val / t.max) * barW, barH);

            // Label (Cyber-style)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '900 11px Outfit, Courier';
            ctx.fillText(t.label, 0, -6);

            // Time display
            ctx.textAlign = 'right';
            ctx.fillText(t.val.toFixed(1) + 's', barW, -6);

            ctx.restore();
            yOffset += 35;
        }
    });
}

function drawCRTScanlines() {
    // Skip scanlines entirely on mobile - massive perf savings
    if (isMobile) return;

    ctx.save();
    // Subtle scanline flicker
    const flicker = Math.random() > 0.98 ? 0.08 : 0.04;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#000';
    // Use larger step for scanlines (6px instead of 3px)
    for (let i = 0; i < canvas.height; i += 6) {
        ctx.fillRect(0, i, canvas.width, 1);
    }

    // Vignette
    const vig = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.9
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(20,0,30,0.6)');
    ctx.fillStyle = vig;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawTransitionOverlay(dt) {
    transitionTimer -= dt;
    const alpha = Math.min(transitionTimer, 1.0);

    ctx.save();

    // Cinematic Letterbox
    const barH = 100 * alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, barH);
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);

    // Background Digital Tint
    ctx.fillStyle = transitionColor;
    ctx.globalAlpha = alpha * 0.2;
    ctx.fillRect(0, barH, canvas.width, canvas.height - barH * 2);

    // Scanning Data Line
    const scanY = (Date.now() * 0.6) % canvas.height;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, scanY, canvas.width, 4);

    // Floating data particles
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 10; i++) {
        const px = (Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5) * canvas.width;
        const py = (Math.cos(Date.now() * 0.0012 + i) * 0.5 + 0.5) * canvas.height;
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillRect(px, py, 2, 2);
    }

    // Large centered text with chromatic aberration shadow
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const bounce = Math.sin(Date.now() * 0.01) * 5;

    // Offset Shadows (Chromatic)
    ctx.font = 'italic 900 72px Outfit';
    ctx.fillStyle = COLORS.secondary;
    ctx.fillText(transitionText, canvas.width / 2 - 4, canvas.height / 2 + bounce);
    ctx.fillStyle = COLORS.primary;
    ctx.fillText(transitionText, canvas.width / 2 + 4, canvas.height / 2 + bounce);

    // Main text
    ctx.fillStyle = '#fff';
    ctx.fillText(transitionText, canvas.width / 2, canvas.height / 2 + bounce);

    // Subtext label
    ctx.font = '700 16px courier';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillText("NEURAL UPLINK STABLE >> UPDATING SECTOR DATA", canvas.width / 2, canvas.height / 2 + 60 + bounce);

    // Loading Progress Bar
    const progW = 400;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(canvas.width / 2 - progW / 2, canvas.height / 2 + 100 + bounce, progW, 10);
    ctx.fillStyle = transitionColor;
    ctx.fillRect(canvas.width / 2 - progW / 2, canvas.height / 2 + 100 + bounce, (1 - (transitionTimer / 3.0)) * progW, 10);

    ctx.restore();
}

// --- 14. TERMINAL HOOKS ---
startBtn.onclick = () => {
    initAudioSystem();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    rebootSystem();
};

restartBtn.onclick = () => {
    gameState = 'PLAYING';
    gameOverScreen.classList.add('hidden');
    rebootSystem();
};

homeBtn.onclick = () => {
    gameState = 'START';
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startHighScoreEl.innerText = highScore.toString().padStart(6, '0');
};

pauseBtn.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePause();
};
resumeBtn.onclick = togglePause;
pauseRestartBtn.onclick = () => {
    pauseScreen.classList.add('hidden');
    rebootFromCheckpoint();
    gameState = 'PLAYING';
};
pauseHomeBtn.onclick = () => {
    pauseScreen.classList.add('hidden');
    gameState = 'START';
    startScreen.classList.remove('hidden');
    startHighScoreEl.innerText = highScore.toString().padStart(6, '0');
};

// Initial High Score Display
startHighScoreEl.innerText = highScore.toString().padStart(6, '0');

// Initiate Primary Application Thread
requestAnimationFrame(tick);

/**
 * ============================================================================
 * [END OF TITAN CORE MODULE]
 * ============================================================================
 */