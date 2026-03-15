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
const loadingScreen = document.getElementById('loading-screen');
const loadingBarFill = document.getElementById('loading-bar-fill');
const loadingPercent = document.getElementById('loading-percent');
const loadingStatus = document.getElementById('loading-status');
const loadingSublabel = document.getElementById('loading-sublabel');
const usernameInput = document.getElementById('username-input');
const loadingBgImg = document.querySelector('.loading-bg-img');

// Overlay Leaderboard Elements
const leaderboardOverlay = document.getElementById('leaderboard-overlay');
const startLbBtn = document.getElementById('start-lb-btn');
const overLbBtn = document.getElementById('over-lb-btn');
const lbCloseBtn = document.getElementById('lb-close-btn');

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
let isSurvivalMode = false;
let isTeleporting = false;
let teleportTimer = 0;
let teleportTargetX = 0;
let teleportStartDist = 0;
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
let playerName = localStorage.getItem('cyberstrike_username') || "GUEST_PILOT";
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
let backgroundTexts = []; // Large subtle rank upgrade text
let currentRankIndex = 0;
let coins = []; // Neural credit coins spawned in the world
let sessionCredits = 0; // Credits collected this run

const RANKS = [
    { name: 'COMPROMISED', minScore: 0, color: '#ff0055' },
    { name: 'OPERATIVE', minScore: 5000, color: '#00e5ff' },
    { name: 'TITAN HUNTER', minScore: 15000, color: '#ff1744' },
    { name: 'NEURAL ARCHITECT', minScore: 40000, color: '#9d00ff' },
    { name: 'OVERDRIVE GOD', minScore: 100000, color: '#ffffff' }
];

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

// --- 3.8 DEVICE DETECTION ---
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobile = isTouchDevice && (window.innerWidth < 1024 || window.innerHeight < 600);

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
let isStartupPhase = false;
let startupTimer = 0;
const STARTUP_DURATION = 3.0;

const DEBUG_MODE = false;
const BOSS_INTERVAL = 60000;
const CHECKPOINT_INTERVAL = 15000;
let timeScale = 1.0;
const WORLD_SCALE = isMobile ? 0.72 : 1.0;
const INV_SCALE = 1 / WORLD_SCALE;

// --- 4. INPUT MANAGEMENT ---
const keys = {};
const mouse = { x: 0, y: 0, down: false };

// UI Bindings for Achievements & Shop
const achOverlay = document.getElementById('achievement-overlay');
const achCloseBtn = document.getElementById('ach-close-btn');
const startAchBtn = document.getElementById('start-ach-btn');

const shopOverlay = document.getElementById('shop-overlay');
const shopCloseBtn = document.getElementById('shop-close-btn');
const startShopBtn = document.getElementById('start-shop-btn');
const overShopBtn = document.getElementById('over-shop-btn');

if (startAchBtn) {
    startAchBtn.addEventListener('click', () => {
        if (window.renderAchievementPanel) window.renderAchievementPanel();
        achOverlay.classList.remove('hidden');
    });
}
if (achCloseBtn) {
    achCloseBtn.addEventListener('click', () => achOverlay.classList.add('hidden'));
}
if (startShopBtn) {
    startShopBtn.addEventListener('click', () => {
        if (window.switchShopTab) window.switchShopTab('upgrades'); // Default to upgrades tab
        else if (window.renderShopPanel) window.renderShopPanel();
        shopOverlay.classList.remove('hidden');
    });
}
if (overShopBtn) {
    overShopBtn.addEventListener('click', () => {
        if (window.switchShopTab) window.switchShopTab('upgrades'); // Default to upgrades tab
        else if (window.renderShopPanel) window.renderShopPanel();
        shopOverlay.classList.remove('hidden');
    });
}
if (shopCloseBtn) {
    shopCloseBtn.addEventListener('click', () => shopOverlay.classList.add('hidden'));
}

// Map the mobile dropdown buttons correctly
const startLbBtnMobile = document.getElementById('start-lb-btn-mobile');
const startAchBtnMobile = document.getElementById('start-ach-btn-mobile');
const startShopBtnMobile = document.getElementById('start-shop-btn-mobile');

if (startLbBtnMobile) {
    startLbBtnMobile.addEventListener('click', () => lbOverlay.classList.remove('hidden'));
}
if (startAchBtnMobile) {
    startAchBtnMobile.addEventListener('click', () => {
        if (window.renderAchievementPanel) window.renderAchievementPanel();
        achOverlay.classList.remove('hidden');
    });
}
if (startShopBtnMobile) {
    startShopBtnMobile.addEventListener('click', () => {
        if (window.switchShopTab) window.switchShopTab('upgrades');
        else if (window.renderShopPanel) window.renderShopPanel();
        shopOverlay.classList.remove('hidden');
    });
}

// Features Dropdown Logic
const featuresToggleBtn = document.getElementById('features-toggle-btn');
const featuresDropdown = document.getElementById('features-dropdown');

if (featuresToggleBtn && featuresDropdown) {
    featuresToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        featuresDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when any of its buttons are clicked
    featuresDropdown.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => featuresDropdown.classList.add('hidden'));
    });
    
    // Function to close dropdown on outside interaction (both click and touch)
    const closeDropdownOutside = (e) => {
        if (!featuresDropdown.classList.contains('hidden') && !featuresDropdown.contains(e.target) && e.target !== featuresToggleBtn) {
            featuresDropdown.classList.add('hidden');
        }
    };
    
    document.addEventListener('click', closeDropdownOutside);
    document.addEventListener('touchstart', closeDropdownOutside, { passive: true });
}

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
    if (e.code === 'KeyM') {
        if (window.addNeuralCredits) {
            window.addNeuralCredits(10000);
            triggerCombatAlert("DEBUG: +10,000 CREDITS RECEIVED", "#ffeb3b", "💠");
        }
    }

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // Map mouse to scaled coordinate space
    mouse.x = (e.clientX - rect.left) * INV_SCALE;
    mouse.y = (e.clientY - rect.top) * INV_SCALE;
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
// isTouchDevice and isMobile moved to section 3.8

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
if (isMobile) {
    mobileControls.classList.remove('hidden');

    // Prevent default touch behaviors like scrolling, zooming, or pull-to-refresh
    document.addEventListener('touchstart', (e) => {
        const isInteractive = e.target.tagName === 'BUTTON' || 
                              e.target.tagName === 'INPUT' || 
                              e.target.closest('button') || 
                              e.target.closest('.mode-card') || 
                              e.target.closest('.variant-card') ||
                              e.target.closest('.level-card') ||
                              e.target.closest('.crate-trail-card') ||
                              e.target.closest('.shop-tab-btn') ||
                              e.target.closest('.crate-btn') ||
                              e.target.id === 'move-joystick' || 
                              e.target.closest('#move-joystick');
                              
        if (!isInteractive) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        // Allow scrolling inside overlays (like shop or achievements)
        if (!e.target.closest('.overlay') && !e.target.closest('.lb-overlay')) {
            e.preventDefault();
        }
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

        // Visual position of player in canvas screen coords
        const screenPx = player.x - camera.x + player.w / 2;
        const screenPy = player.y - camera.y + player.h / 2;

        // Touch input is usually unscaled relative to the raw viewport
        const touchX = (touch.clientX - fireJoyRect.left - fireJoyRect.width / 2);
        const touchY = (touch.clientY - fireJoyRect.top - fireJoyRect.height / 2);

        if (Math.hypot(touchX, touchY) < 10) {
            // Deadzone (center): Aim forward
            mouse.x = screenPx + 1000;
            mouse.y = screenPy;
        } else {
            const angle = Math.atan2(touchY, touchX);
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
    },
    uiClick: () => playDynamicSound(850, 'sine', 0.05, 0.1, 250),
    crateOpen: () => {
        playDynamicSound(300, 'sawtooth', 0.2, 0.1, 400);
        setTimeout(() => playDynamicSound(800, 'square', 0.3, 0.1, 800), 100);
        setTimeout(() => playDynamicSound(1600, 'sine', 0.5, 0.1, 1000), 250);
    },
    loadingDrive: () => {
        // "trrrrrrrrrrrr" mechanical drive sound using rapid oscillators
        const now = audioCtx ? audioCtx.currentTime : 0;
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                playDynamicSound(80 + Math.random() * 20, 'sawtooth', 0.1, 0.02, 10);
            }, i * 50);
        }
    }
};

window.AudioFX = AudioFX;

// --- GLOBAL UI CLICK SOUND HOOK ---
document.addEventListener('mousedown', (e) => {
    initAudioSystem(); // ensure audio is unlocked
    if (e.target.closest('button') || e.target.closest('.btn-sync') || e.target.closest('.mode-card') || e.target.closest('.level-card') || e.target.closest('.shop-tab-btn')) {
        AudioFX.uiClick();
    }
});

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

/**
 * Background Large Notification (Clean & Smooth)
 */
class BackgroundText {
    constructor(text, color) {
        this.text = text;
        this.color = color;
        this.life = 4.0;
        this.maxLife = 4.0;
        this.y = canvas.height * 0.45; // Center-ish
        this.x = canvas.width * 0.5;
        this.opacity = 0;
    }
    update(dt) {
        this.life -= dt;
        // Fade in quickly, stay, then fade out
        if (this.life > 3.5) this.opacity = lerp(this.opacity, 0.4, 0.1);
        else if (this.life < 1.0) this.opacity = lerp(this.opacity, 0, 0.05);

        this.y -= 15 * dt; // Slow drift
    }
    draw() {
        if (this.opacity <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = `900 ${isMobile ? 60 : 100}px Outfit`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = "10px";
        ctx.fillText(this.text, this.x, this.y);

        // Sub-text
        ctx.font = `600 ${isMobile ? 20 : 30}px Outfit`;
        ctx.letterSpacing = "4px";
        ctx.fillText("UNIT STATUS: UPGRADED", this.x, this.y + (isMobile ? 40 : 60));
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
        const equippedTrail = window.getEquippedTrail ? window.getEquippedTrail() : null;
        
        // Record trail point
        // Always record if a trail is equipped, otherwise only on special actions
        if (equippedTrail || this.isDashActive || isNeuralOverdrive || Math.abs(this.vx) > 600 || Math.abs(this.vy) > 800) {
            this.trail.push({
                x: this.x,
                y: this.y,
                life: isNeuralOverdrive ? 1.5 : 1.0,
                isNeural: isNeuralOverdrive,
                style: equippedTrail
            });
            // Protect against infinite trail growth
            if (this.trail.length > 50) this.trail.shift();
        }
        for (let j = this.trail.length - 1; j >= 0; j--) {
            this.trail[j].life -= dt * 2.5;
            if (this.trail[j].life <= 0) this.trail.splice(j, 1);
        }

        if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 15;

        // --- Rarity-Specific Special Effects (Particles) ---
        if (equippedTrail && !this.isCompromised) {
            if (equippedTrail.rarity === 'MYTHIC') {
                // Mythic trails leave constant unique effects
                if (Math.random() > 0.4) {
                    const particleColor = equippedTrail.color && !equippedTrail.color.startsWith('linear') ? equippedTrail.color : COLORS.primary;
                    emitParticles(this.x + this.w / 2, this.y + this.h / 2, 'BITS', particleColor, 1, 100);
                }
            } else if (equippedTrail.rarity === 'LEGENDARY') {
                // Legendary trails have subtle sparkles
                if (Math.random() > 0.8) {
                    emitParticles(this.x + this.w / 2, this.y + this.h / 2, 'BITS', '#fff', 1, 150);
                }
            }
        }
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
            this.takeHit(999, 0, 0, true, 'VOID'); // True flag forces damage regardless of shield
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

    takeHit(rawDmg, kbX = 0, kbY = 0, force = false, reason = 'ENEMY') {
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
            initiateSystemHalt(reason);
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
            const lifeAlpha = t.life * (t.isNeural ? 0.7 : 0.4);
            ctx.globalAlpha = lifeAlpha;
            
            let trailColor = t.isNeural ? '#fff' : COLORS.primary;
            let useGlow = false;
            let isSpecial = false;
            let trailType = t.style ? t.style.type : 'solid';

            if (t.style) {
                if (t.style.type === 'solid' || t.style.type === 'glow') {
                    trailColor = t.style.color;
                    if (t.style.type === 'glow') useGlow = true;
                } else if (t.style.type.includes('gradient')) {
                    // Optimized color approximations
                    if (t.style.id === 'gradient_fire') {
                        trailColor = `rgb(255, ${Math.floor(255 * (1 - t.life))}, 0)`;
                    } else if (t.style.id === 'gradient_ice') {
                        trailColor = `rgb(0, ${Math.floor(255 * (1 - t.life))}, 255)`;
                    } else if (t.style.id === 'gradient_void') {
                        trailColor = `rgb(${142 - t.life * 50}, ${45 + t.life * 20}, ${226})`;
                    } else if (t.style.id === 'mythic_void') {
                        // Mythic Void Nebula Pulse
                        trailColor = `hsl(${(Date.now() / 15 + i * 5) % 60 + 260}, 100%, ${50 + Math.sin(Date.now() * 0.005 + i) * 20}%)`;
                        useGlow = true;
                    } else if (t.style.id === 'azure_streak') {
                        trailColor = `rgb(0, ${Math.floor(131 + (t.life) * 49)}, ${176 + Math.floor(t.life*43)})`;
                    } else if (t.style.id === 'void_ribbon') {
                        trailColor = `rgb(${142 + Math.floor((1-t.life)*113)}, 45, ${226 - Math.floor((1-t.life)*141)})`;
                    } else if (t.style.id === 'solar_flare') {
                        trailColor = `rgb(248, ${Math.floor(54 + (1-t.life)*158)}, ${Math.floor((1-t.life)*35)})`;
                        useGlow = true;
                    } else if (t.style.id === 'glacier_edge') {
                        trailColor = `rgb(${Math.floor((1-t.life)*146)}, ${210 - Math.floor((1-t.life)*69)}, ${255 - Math.floor((1-t.life)*84)})`;
                    } else if (t.style.id === 'abyssal_vortex') {
                        trailColor = `hsl(${(Date.now() / 5 + i * 15) % 60 + 330}, 100%, 50%)`; // Red/Violet swirl
                        useGlow = true;
                    } else if (t.style.id === 'mythic_boxes' || t.style.id === 'mythic_glitch' || t.style.type.includes('mythic')) {
                       // Unique Mythic pulse gradient
                       trailColor = `hsl(${(Date.now() / 10 + i * 20) % 360}, 80%, 60%)`;
                       useGlow = true;
                    } else {
                        trailColor = t.style.color || COLORS.primary;
                        if (trailColor && typeof trailColor === 'string' && trailColor.startsWith('linear-gradient')) {
                            const match = trailColor.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
                            trailColor = match ? match[0] : COLORS.primary;
                        }
                    }
                } else if (t.style.type === 'special') {
                    if (t.style.id === 'legend_rainbow' || t.style.id === 'infinity_loop' || t.style.color === 'rainbow') {
                        trailColor = `hsl(${(Date.now() / 10 + i * 15) % 360}, 100%, 50%)`;
                        useGlow = true;
                    }
                } else if (t.style.type === 'matrix') {
                    trailColor = Math.random() > 0.8 ? '#fff' : '#00ff41';
                    useGlow = true;
                } else if (t.style.type === 'box') {
                    trailColor = t.style.color || '#ff00ff';
                    useGlow = true;
                } else if (t.style.type === 'glitch') {
                    const baseColor = t.style.color || '#00e5ff';
                    trailColor = Math.random() > 0.7 ? '#fff' : (Math.random() > 0.5 ? baseColor : '#222');
                    useGlow = true;
                }
            }

            if (useGlow && !isMobile) {
                ctx.shadowBlur = t.style?.rarity === 'MYTHIC' ? 25 : (t.isNeural ? 20 : 10);
                ctx.shadowColor = trailColor;
            }

            ctx.fillStyle = trailColor;
            const sizeMod = (0.3 + (i / this.trail.length) * 0.7) * (t.style?.type.includes('box') ? 1.4 : 1.0);
            ctx.translate(t.x - camera.x + this.w / 2, t.y - camera.y + this.h / 2);
            ctx.rotate(this.rotation);
            
            const trailW = (t.style?.type.includes('box') ? 16 : this.w) * sizeMod;
            const trailH = (t.style?.type.includes('box') ? 16 : this.h) * sizeMod;

            if (t.style?.type.includes('box')) {
                // Draw square particles for Mythic Box trail
                ctx.fillRect(-trailW / 2, -trailH / 2, trailW, trailH);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(-trailW / 2, -trailH / 2, trailW, trailH);
                
                // Static internal dot
                ctx.fillStyle = '#fff';
                ctx.fillRect(-2, -2, 4, 4);
            } else if (t.style?.type.includes('glitch')) {
                // Skewed glitchy bars
                const offset = Math.sin(Date.now() * 0.05 + i) * 15;
                if (Math.random() > 0.2) {
                    ctx.fillRect(-trailW / 2 + offset, -trailH / 2, trailW, trailH / 4);
                    ctx.fillRect(-trailW / 2 - offset, trailH / 4, trailW, trailH / 4);
                }
                if (Math.random() > 0.8) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(random(-20, 20), random(-20, 20), 10, 2);
                }
            } else if (t.style?.id === 'mythic_void') {
                // Draw Nebula "Core"
                ctx.beginPath();
                ctx.arc(0, 0, trailW / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Add star particles
                if (Math.random() > 0.7) {
                    ctx.fillStyle = '#fff';
                    const s = Math.random() * 3;
                    ctx.fillRect(random(-trailW, trailW), random(-trailH, trailH), s, s);
                }
            } else {
                ctx.fillRect(-trailW / 2, -trailH / 2, trailW, trailH);
            }
            
            // Add matrix "code" particles
            if (t.style && t.style.type === 'matrix' && Math.random() > 0.9) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(random(-trailW, trailW), random(-trailH, trailH), 2, 4);
            }

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
        
        let difficultyMod = 1;
        if (window.isDungeonMode && window.activeDungeonLevel) {
            difficultyMod = 1 + (window.activeDungeonLevel.id * 0.15); // +15% per level, up to +225%
        } else {
            difficultyMod = 1 + (distanceTraveled / 50000); // Endless scaling
        }
        
        this.integrity = (model === 'SNIPER' ? 60 : (model === 'TANK' ? 250 : 120)) * difficultyMod;
        
        // Faster initial firing for harder levels
        this.recharge = random(0.5, 2.0) / Math.max(1, Math.sqrt(difficultyMod));
        this.oscOffset = Math.random() * 8;
        this.hasExpired = false;
        this.baseX = x;
        this.flashTimer = 0; // Flash effect when hit
    }

    update(dt, titan) {
        if (this.flashTimer > 0) this.flashTimer -= dt * 6;
        this.oscOffset += dt * 4;
        
        let speedMod = 1 + (distanceTraveled / 100000); // Gradual speed increase
        let fireRateMod = 1 + (distanceTraveled / 150000);
        
        if (window.isDungeonMode && window.activeDungeonLevel) {
            speedMod = 1 + (window.activeDungeonLevel.id * 0.1); 
            fireRateMod = 1 + (window.activeDungeonLevel.id * 0.08); 
        }

        if (this.model === 'DRONE') {
            this.y += Math.sin(this.oscOffset) * 1.8;
            this.x -= 30 * speedMod * dt; // Drones now drift left slowly
        } else if (this.model === 'TANK') {
            this.x -= 80 * speedMod * dt; // Slow advance
        }

        this.recharge -= dt;
        if (this.recharge <= 0) {
            const distance = Math.hypot(titan.x - this.x, titan.y - this.y);
            if (distance < 900) {
                this.executeFireSequence(titan);
                const baseRecharge = this.model === 'SNIPER' ? 2.5 : (this.model === 'TANK' ? 3.5 : 1.2); // Differential fire rates
                this.recharge = baseRecharge / fireRateMod;
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
        
        let diffMod = 1;
        if (window.isDungeonMode && window.activeDungeonLevel) {
            diffMod = 1 + (window.activeDungeonLevel.id * 0.15); // +15% per level
        }
        
        this.hitPoints = (1200 + (pLevel * 800)) * diffMod;
        this.maxHitPoints = this.hitPoints;
        this.pLevel = pLevel;
        this.phaseTimer = 0;
        this.arrivalMode = true;
        this.attackPhase = 0;
        this.maxPhases = 6;
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

        let speedMod = 1;
        if (window.isDungeonMode && window.activeDungeonLevel) {
            speedMod = 1 + (window.activeDungeonLevel.id * 0.05); // Faster boss tracking and firing
        }

        this.phaseTimer += dt * speedMod;
        this.cycleTime += dt * speedMod;
        this.shotCounter += dt * speedMod;

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
            if (this.shotCounter > 1.2) {
                const spawnX = titan.x + canvas.width * INV_SCALE + 200; // Spawn just off-screen ahead
                const spawnY = titan.y - 150 + random(-100, 100);
                const elite = new HostileUnit(spawnX, spawnY, 'DRONE');
                elite.integrity = 200; // Stronger minions
                enemies.push(elite);
                triggerTransition("TITAN SQUADRON DEPLOYED", COLORS.boss);
                this.shotCounter = 0;
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
        if (dx + this.w < 0 || dx > canvas.width * INV_SCALE || dy + this.h < 0 || dy > canvas.height * INV_SCALE) return;

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
        const lastY = platforms.length > 0 ? platforms[platforms.length - 1].y : canvas.height * 0.6 * INV_SCALE;

        // Ensure next platform is within jumping range (+/- 160px height difference)
        const platX = nextPlatformX + random(160, 360);
        const platY = Math.max(canvas.height * 0.25 * INV_SCALE, Math.min(canvas.height * 0.85 * INV_SCALE, lastY + random(-160, 160)));

        platforms.push(new SolidSurface(platX, platY, platW, 45, currentZone));

        // Physical Checkpoint Spawn
        if (platX > lastCheckpointSpawnX + CHECKPOINT_INTERVAL) {
            checkpoints.push(new CheckpointWall(platX + platW / 2, platY));
            lastCheckpointSpawnX = platX;
        }

        // Background floating objects (even under the floor)
        for (let i = 0; i < 3; i++) {
            const bx = platX + random(0, platW);
            const by = random(-200, canvas.height * INV_SCALE + 600);
            const bSize = random(10, 40);
            backgroundObjects.push(new BackgroundScrap(bx, by, bSize, i % 2 === 0 ? COLORS.primary : COLORS.secondary, 0));
        }

        // Hostile Population (Increased Density)
        if (window.isDungeonMode && window.activeDungeonLevel) {
            const lvl = window.activeDungeonLevel;
            const spawnChance = lvl.enemyDensity;
            if (Math.random() < spawnChance) {
                const types = lvl.enemyTypes || ['DRONE'];
                const hModel = types[Math.floor(Math.random() * types.length)];
                enemies.push(new HostileUnit(platX + platW / 2, platY - 55, hModel));
                
                // Spawn extra enemies based on high density
                if (lvl.enemyDensity >= 0.7 && Math.random() < (lvl.enemyDensity - 0.5)) {
                    const extraModel = types[Math.floor(Math.random() * types.length)];
                    enemies.push(new HostileUnit(platX + platW / 2 + random(80, platW / 2 - 50), platY - 55, extraModel));
                }
            }
        } else {
            if (Math.random() > 0.25) {
                const hModel = Math.random() > 0.85 ? 'SNIPER' : (Math.random() > 0.7 ? 'TANK' : 'DRONE');
                enemies.push(new HostileUnit(platX + platW / 2, platY - 55, hModel));
            }
        }

        // Logistics Population
        if (Math.random() > 0.96) { // Decreased spawn rate
            pickups.push({ posX: platX + platW / 2, posY: platY - 50, model: 'SPREAD', isFound: false });
        }

        // Destructible Crates
        if (Math.random() > 0.6) {
            destructibles.push(new DestructibleBlock(platX + random(100, platW - 100), platY - 50));
        }

        // Randomly spawn special armaments
        if (Math.random() > 0.98) { // Decreased spawn rate
            const types = ['PLASMA', 'HEAVY'];
            pickups.push({ posX: platX + random(50, platW - 50), posY: platY - 50, model: types[Math.floor(Math.random() * 2)], isFound: false });
        }

        // NEURAL CREDIT COINS - lying on floor and scattered in air
        if (Math.random() > 0.2) { // Increased spawn rate
            const coinFormation = Math.random();
            const coinValue = Math.max(1, Math.floor(currentZone * 0.5) + 1);

            if (coinFormation < 0.35) {
                // Ground flush line (lying directly on the floor)
                const baseY = platY - 15;
                const count = Math.floor(random(4, 9));
                const startX = platX + random(50, Math.max(80, platW - count * 45));
                for (let ci = 0; ci < count; ci++) {
                    coins.push({
                        x: startX + ci * 45,
                        y: baseY,
                        value: coinValue,
                        collected: false,
                        bobOffset: 0, // No bob, lying flat
                        sparkle: Math.random()
                    });
                }
            } else if (coinFormation < 0.55) {
                // Arc formation (coins in a jump arc in the air)
                const baseY = platY - 40;
                const count = Math.floor(random(4, 8));
                const startX = platX + random(60, Math.max(80, platW - count * 50));
                for (let ci = 0; ci < count; ci++) {
                    const t = ci / (count - 1);
                    const arcY = baseY - Math.sin(t * Math.PI) * random(80, 160);
                    coins.push({
                        x: startX + ci * 50,
                        y: arcY,
                        value: coinValue,
                        collected: false,
                        bobOffset: Math.random() * Math.PI * 2,
                        sparkle: Math.random()
                    });
                }
            } else if (coinFormation < 0.75) {
                // Scattered in the air (random heights above platform)
                const count = Math.floor(random(3, 7));
                for (let ci = 0; ci < count; ci++) {
                    coins.push({
                        x: platX + random(50, platW - 50),
                        y: platY - random(80, 250), // Random air height
                        value: coinValue * 2,
                        collected: false,
                        bobOffset: Math.random() * Math.PI * 2,
                        sparkle: Math.random()
                    });
                }
            } else {
                // Gap floaters (coins suspended in the air over the empty gap before this platform)
                // This gives them coins "in the air" between jumps
                if (platX > 500) { // Don't do it on the very first platform
                    const gapWidth = Math.min(400, platX - (nextPlatformX ? nextPlatformX : platX - 200));
                    if (gapWidth > 100) {
                        const count = Math.floor(random(2, 5));
                        const gapStartX = platX - gapWidth;
                        for (let ci = 0; ci < count; ci++) {
                            coins.push({
                                x: gapStartX + random(40, gapWidth - 40),
                                y: platY - random(20, 120),
                                value: coinValue * 3,
                                collected: false,
                                bobOffset: Math.random() * Math.PI * 2,
                                sparkle: Math.random()
                            });
                        }
                    }
                }
            }
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
        const py = Math.random() * canvas.height * INV_SCALE;
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

function triggerLoadingSequence(onComplete, bgImage = 'loading_bg.png') {
    loadingScreen.classList.remove('hidden');
    if (loadingBgImg) {
        loadingBgImg.style.backgroundImage = `url('${bgImage}')`;
    }
    let progress = 0;
    const statusMessages = [
        "SYNCHRONIZING NEURAL UPLINK...",
        "DECRYPTING SECTOR GEOMETRY...",
        "CALIBRATING WEAPON SYSTEMS...",
        "ESTABLISHING TITAN PROTOCOLS...",
        "RENDER ENGINE INITIALIZED"
    ];

    AudioFX.loadingDrive();

    const startTime = performance.now();
    const duration = 2000; // 2 seconds of loading

    function update() {
        const now = performance.now();
        const elapsed = now - startTime;
        progress = Math.min(elapsed / duration, 1);

        loadingBarFill.style.width = `${progress * 100}%`;
        loadingPercent.innerText = `${Math.floor(progress * 100)}%`;

        const msgIdx = Math.floor(progress * (statusMessages.length - 1));
        loadingStatus.innerText = statusMessages[msgIdx];

        // Random tech noise for sublabel
        if (Math.random() > 0.9) {
            const techTxt = ["0x" + Math.floor(Math.random() * 1000000).toString(16), "SYS_READY", "LINK_ACTIVE", "PORT_8080_OPEN"];
            loadingSublabel.innerText = techTxt[Math.floor(Math.random() * techTxt.length)];
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                if (onComplete) onComplete();
            }, 300);
        }
    }

    requestAnimationFrame(update);
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
        pauseHighScoreEl.innerText = highScore.toString().padStart(6, '0');
        const pausePilotEl = document.getElementById('pause-pilot-name');
        if (pausePilotEl) pausePilotEl.innerText = playerName;
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

    // Achievement: Overdrive
    if (window.checkAchievementConditions) window.checkAchievementConditions('OVERDRIVE_ACTIVATE');
}

// --- 13. SYSTEM ORCHESTRATION ---
function rebootSystem() {
    player = new PlayerTitan();
    platforms = []; particles = []; bullets = []; enemies = []; pickups = [];
    floatingTexts = []; destructibles = []; alerts = []; checkpoints = [];
    coins = []; sessionCredits = 0;
    boss = null;
    score = 0; killScore = 0;
    syncFill.style.width = '0%';
    uiLayer.classList.remove('overdrive-active', 'neural-overdrive');
    weatherSystems = [];

    // Survival Mode Thematic Swaps
    if (isSurvivalMode) {
        COLORS.primary = '#ff0055';
        COLORS.bg = '#1a0005';
        COLORS.grid = 'rgba(255, 0, 85, 0.05)';
        document.getElementById('health-fill').style.background = 'linear-gradient(90deg, #ff0000, #ff0055)';
        triggerCombatAlert("CRITICAL: BIOMETRIC DECAY DETECTED", "#ff0055", "⚠");
    } else {
        COLORS.primary = '#00e5ff';
        COLORS.bg = '#121212';
        COLORS.grid = 'rgba(255, 255, 255, 0.02)';
        document.getElementById('health-fill').style.background = 'linear-gradient(90deg, #00b4db, #0083b0)';
    }
    
    // Core Distances Reset
    distanceTraveled = 0;
    lastBossCheckpoint = 0;
    lastDistanceCheckpoint = 0;
    lastCheckpointSpawnX = 0;
    lastCheckpointKillScore = 0;
    currentZone = 1;

    // Movement Reset
    camera.x = 0; camera.y = 0;

    // Clear stuck input (critical for mobile restart)
    clearAllInputs();

    // UI Hard Reset
    bossHud.classList.add('hidden');
    healthFill.style.width = '100%';
    scoreEl.innerText = "000000";
    if (distanceEl) distanceEl.innerText = "0m";
    const hudCoinEl = document.getElementById('hud-coin-count');
    if (hudCoinEl) hudCoinEl.innerText = '0';
    document.body.classList.remove('danger');

    // Deployment Platform
    platforms.push(new SolidSurface(0, 500, 1800, 90, 1));
    nextPlatformX = 2000;

    buildWorldSectors(6000, true);

    // Initial Startup Phase (Subway Surfers style)
    initStartupPhase();

    // Init Weather
    weatherSystems = [];

    if (isMobile) mobileControls.classList.remove('hidden');
    currentRankIndex = 0;
    backgroundTexts = [];

    // Achievement: Game Start
    if (window.checkAchievementConditions) window.checkAchievementConditions('GAME_START');
}

function finalizeTeleport() {
    isTeleporting = false;
    player.isCompromised = false;
    
    // Clear old world to prevent overlaps and "void" glitches
    platforms = [];
    enemies = [];
    coins = [];
    pickups = [];
    destructibles = [];
    backgroundObjects = [];
    checkpoints = [];
    floatingTexts = [];
    particles = [];
    
    // Set destination
    player.x = teleportTargetX;
    player.y = 100; // Drop into new sector
    player.vy = 0;
    camera.x = player.x - canvas.width * 0.35 * INV_SCALE;
    distanceTraveled = teleportTargetX;
    
    if (window.isDungeonMode) {
        // Dungeon remains in sector 1 environment to avoid sequence breaking
        currentZone = 1;
    } else {
        currentZone = 2;
    }
    
    nextPlatformX = teleportTargetX;
    lastCheckpointSpawnX = teleportTargetX;
    
    // Build initial safety platform
    platforms.push(new SolidSurface(teleportTargetX - 400, 500, 2000, 90, currentZone));
    
    // Blast effect on arrival
    triggerCombatAlert("DE-SYNCHING: SECTOR 2 REACHED", COLORS.accent, "⚡");
    screenShake = 60;
    screenFlash = 1.0;
    if (window.AudioFX && window.AudioFX.shatter) window.AudioFX.shatter();
    
    // Force build some initial world
    buildWorldSectors(player.x + 4000);
}

let hasUsedStartup = false;

function initStartupPhase() {
    hasUsedStartup = false;
    const owned = window.getOwnedConsumables ? window.getOwnedConsumables() : [];
    if (owned.length === 0) {
        isStartupPhase = false;
        document.getElementById('startup-container').classList.add('hidden');
        return;
    }

    isStartupPhase = true;
    startupTimer = STARTUP_DURATION;

    const container = document.getElementById('startup-container');
    const pList = document.getElementById('startup-powerups');

    if (container && pList) {
        pList.innerHTML = '';
        owned.forEach(item => {
            const btn = document.createElement('div');
            btn.className = 'startup-icon';
            btn.innerHTML = `${item.icon} <span class="count-badge">${item.owned}</span>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                useStartupPowerup(item.key);
            };
            pList.appendChild(btn);
        });
        container.classList.remove('hidden');
    }
}

function useStartupPowerup(key) {
    if (!isStartupPhase || hasUsedStartup) return;

    if (window.consumeItem && window.consumeItem(key)) {
        hasUsedStartup = true; // Lock out further usage this round
        
        if (key === 'aegisArmor') {
            player.hasArmorShield = true;
            triggerCombatAlert("AEGIS PLATING DEPLOYED", COLORS.primary, "🛡");
        } else if (key === 'headStart') {
            isTeleporting = true;
            teleportTimer = 1.2;
            
            // Adjust teleport distance based on mode so it scales reasonably
            if (window.isDungeonMode && window.activeDungeonLevel) {
                 // Teleport 20% of the active dungeon length, up to a max of 7500
                 teleportTargetX = Math.min(7500, window.activeDungeonLevel.distance * 0.2);
            } else {
                 teleportTargetX = 5000;
            }
            
            teleportStartDist = distanceTraveled;
            
            // Lock player and systems during warp
            player.vx = 0; player.vy = 0;
            player.isCompromised = true;
            
            triggerCombatAlert("HYPERSPACE DEPLOYMENT INITIATED", COLORS.primary, "🚀");
            if (window.AudioFX && window.AudioFX.loadingDrive) window.AudioFX.loadingDrive();
        }

        // Hide UI immediately so they can't spam clicks
        const container = document.getElementById('startup-container');
        if (container) container.classList.add('hidden');
        isStartupPhase = false;

        // Refresh UI
        const owned = window.getOwnedConsumables();
        const pList = document.getElementById('startup-powerups');
        if (pList) {
            pList.innerHTML = '';
            owned.forEach(item => {
                const btn = document.createElement('div');
                btn.className = 'startup-icon';
                btn.innerHTML = `${item.icon} <span class="count-badge">${item.owned}</span>`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    useStartupPowerup(item.key);
                };
                pList.appendChild(btn);
            });
        }

        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    }
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
    camera.x = player.x - canvas.width * 0.35 * INV_SCALE;
    camera.y = player.y;

    distanceTraveled = lastDistanceCheckpoint; // Fixes distance pausing
    killScore = lastCheckpointKillScore;       // Fixes score pausing
    score = Math.floor(distanceTraveled / 10) + killScore;

    // Reset Environment & UI
    platforms = []; particles = []; bullets = []; enemies = []; pickups = [];
    floatingTexts = []; destructibles = []; alerts = []; checkpoints = [];
    coins = [];
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

    if (isMobile) mobileControls.classList.remove('hidden');

    // Restore rank based on score
    currentRankIndex = 0;
    for (let i = 0; i < RANKS.length; i++) {
        if (score >= RANKS[i].minScore) currentRankIndex = i;
    }
    backgroundTexts = [];
}

// --- LEADERBOARD SYSTEM (Firebase Bridge) ---
function saveToLeaderboard(name, playerScore, reason) {
    if (window.saveScoreToFirebase) {
        window.saveScoreToFirebase(name, playerScore, reason);
    }
}

function renderLeaderboard(listId, highlightName = '', highlightScore = -1) {
    if (window.renderFirebaseLeaderboard) {
        window.renderFirebaseLeaderboard(listId, highlightName, highlightScore);
    } else {
        // Firebase not loaded yet - show placeholder
        const listEl = document.getElementById(listId);
        if (listEl) listEl.innerHTML = '<li class="lb-empty">SYNCING DATA...</li>';
    }
}

function initiateSystemHalt(reason = 'ENEMY') {
    // Enter DYING state instead of immediate GAMEOVER
    gameState = 'DYING';
    deathTimer = 0;
    deathFadeAlpha = 0;

    // Visual Variations based on reason
    if (reason === 'VOID') {
        deathPlayerVX = player.vx * 0.2;
        deathPlayerVY = player.vy * 0.5;
        deathPlayerSpin = random(2, 4);
        screenShake = 20;
        screenFlash = 0.5;
        emitParticles(player.x + player.w / 2, player.y + player.h / 2, 'NORMAL', COLORS.primary, 30, 300);
    } else if (reason === 'TITAN') {
        deathPlayerVX = (player.x - boss.x > 0 ? 800 : -800) + random(-200, 200);
        deathPlayerVY = -700;
        deathPlayerSpin = random(15, 25);
        screenShake = 60;
        screenFlash = 1.0;
        emitParticles(player.x + player.w / 2, player.y + player.h / 2, 'NORMAL', COLORS.boss, 60, 800);
    } else {
        deathPlayerVX = player.vx * 0.3 + random(-150, 150);
        deathPlayerVY = -500;
        deathPlayerSpin = (Math.random() > 0.5 ? 1 : -1) * random(5, 12);
        screenShake = 40;
        screenFlash = 0.8;
        emitParticles(player.x + player.w / 2, player.y + player.h / 2, 'NORMAL', COLORS.secondary, 50, 600);
    }

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
    const pilotNameEl = document.getElementById('over-pilot-name');
    if (pilotNameEl) pilotNameEl.innerText = playerName;

    if (unitEl) {
        let rank = 'COMPROMISED';
        if (score > 5000) rank = 'OPERATIVE';
        if (score > 15000) rank = 'TITAN HUNTER';
        if (score > 40000) rank = 'NEURAL ARCHITECT';
        if (score > 100000) rank = 'OVERDRIVE GOD';

        let diagnostic = 'HARDWARE FAILURE';
        if (reason === 'VOID') diagnostic = 'KINETIC DESYNC';
        else if (reason === 'TITAN') diagnostic = 'TITAN EXECUTION';
        else if (reason === 'ENEMY') diagnostic = 'COMBAT FATIGUE';

        unitEl.innerText = `${diagnostic} // ${rank}`;
    }

    // Save to leaderboard
    saveToLeaderboard(playerName, score, reason);

    // Update wallet display with session credits
    if (window.updateCurrencyDisplay) window.updateCurrencyDisplay();

    // Clear all stuck inputs
    clearAllInputs();
    document.body.classList.remove('danger');
    if (isMobile && mobileControls) mobileControls.classList.add('hidden');
}

function finalizeDeathSequence() {
    gameState = 'GAMEOVER';
    gameOverScreen.style.opacity = '0';
    gameOverScreen.classList.remove('hidden');

    // Pre-fetch the latest leaderboard so it's ready if they open the overlay
    renderLeaderboard('leaderboard-list', playerName, score);

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

        // Survival Mode: Biometric Decay
        if (isSurvivalMode && !isStartupPhase && !isTeleporting && !player.isCompromised) {
            player.hp -= 2.5 * delta; // Drain 2.5 HP per second
            if (player.hp <= 0) {
                player.hp = 0;
                player.isCompromised = true;
                initiateSystemHalt('BIOMETRIC DECAY');
            }
            healthFill.style.width = `${Math.ceil(player.hp)}%`;
            if (player.hp < 35) document.body.classList.add('danger');
            else document.body.classList.remove('danger');
        }

        // Smooth Multi-Point Camera (Adjusted for World Scale)
        const viewW = canvas.width * INV_SCALE;
        const viewH = canvas.height * INV_SCALE;

        const camTX = player.x - viewW * 0.35 + (mouse.x - (player.x - camera.x + player.w / 2)) * 0.15;
        let camTY = player.y - viewH * 0.5 + (mouse.y - (player.y - camera.y + player.h / 2)) * 0.15;

        // Mobile Floor Protection & Vertical Tracking
        if (isMobile) {
            // Soft clamp to prevent losing the floor or looking too high into empty space
            // -300 lets us look up slightly during jumps.
            // Increased from 200 to 450 to keep the floor visible during high jumps.
            camTY = Math.max(-300, Math.min(camTY, 450));
        }

        camera.x = lerp(camera.x, camTX, 0.12);
        camera.y = lerp(camera.y, camTY, isMobile ? 0.08 : 0.1); // Slightly slower Y-tracking on mobile

        // Achievement: Distance
        if (window.checkAchievementConditions) window.checkAchievementConditions('DISTANCE_UPDATE', { distance: distanceTraveled });

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

        // Dungeon Level Progress Check
        if (window.checkDungeonProgress) window.checkDungeonProgress();

        // Visual Updates
        player.updateVisuals(delta);

        if (screenFlash > 0) screenFlash -= delta * 4;

        // Startup Phase Logic
        if (isStartupPhase) {
            startupTimer -= delta;
            const timerEl = document.getElementById('startup-timer');
            if (timerEl) timerEl.innerText = Math.ceil(startupTimer);

            if (startupTimer <= 0 && !isTeleporting) {
                isStartupPhase = false;
                document.getElementById('startup-container').classList.add('hidden');
            }
        }

        // Hyperspace Teleport Animation Logic
        if (isTeleporting) {
            teleportTimer -= delta;
            
            // Background running backwards = Camera moving fast forward
            const warpSpeed = 15000; // Fast motion feel
            camera.x += warpSpeed * delta;
            
            // Add warp streaks
            if (Math.random() > 0.2) {
                particles.push(new ParticleSystem(
                    camera.x + canvas.width * INV_SCALE + 100,
                    random(0, canvas.height * INV_SCALE),
                    COLORS.primary, random(1, 3), -6000, 0, 0.4, 'LINE'
                ));
            }
            
            // Glitch screen as we warp
            player.glitchIntensity = Math.max(player.glitchIntensity, (1.2 - teleportTimer) * 0.8);

            if (teleportTimer <= 0) {
                finalizeTeleport();
                isStartupPhase = false;
                document.getElementById('startup-container').classList.add('hidden');
            }
        }

        // Update Background Texts
        for (let i = backgroundTexts.length - 1; i >= 0; i--) {
            backgroundTexts[i].update(delta);
            if (backgroundTexts[i].life <= 0) backgroundTexts.splice(i, 1);
        }
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
            const camTX = player.x - canvas.width * 0.5 * INV_SCALE + player.w / 2;
            const camTY = player.y - canvas.height * 0.4 * INV_SCALE;
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

                const reason = b.color === COLORS.boss ? 'TITAN' : 'ENEMY';
                player.takeHit(b.dmg, kX, kY, false, reason);
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
                player.takeHit(10, (player.x - en.x) * 5, -200, false, 'ENEMY');
            }
        }
    }

    // Always track distance, even during boss fights
    distanceTraveled = Math.max(distanceTraveled, player.x);

    if (boss) {
        boss.update(delta, player);
    } else {
        // Boss Spawn Check (only in endless mode — dungeon system handles its own bosses)
        if (!window.isDungeonMode && distanceTraveled - lastBossCheckpoint > BOSS_INTERVAL) {
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
                player.powerUps.rapidFire = window.getUpgradeDuration ? window.getUpgradeDuration('rapidFire') : 4.0;
                triggerCombatAlert("STRIKE CAPACITY OVERLOAD", COLORS.accent, "🔥");
            } else if (pu.model === 'SPEED') {
                player.powerUps.speedBoost = window.getUpgradeDuration ? window.getUpgradeDuration('speedBoost') : 4.0;
                triggerCombatAlert("OVERDRIVE ENGAGED", COLORS.primary, "⚡");
            } else if (pu.model === 'SHIELD') {
                player.powerUps.shield = window.getUpgradeDuration ? window.getUpgradeDuration('shield') : 5.0;
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

    // NEURAL CREDIT COIN COLLECTION
    const magnetRange = isNeuralOverdrive ? 180 : 90;
    const collectRange = 30;
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (coin.collected) continue;

        const dx = (player.x + player.w / 2) - coin.x;
        const dy = (player.y + player.h / 2) - coin.y;
        const dist = Math.hypot(dx, dy);

        // Magnet effect: pull coins toward player
        if (dist < magnetRange && dist > collectRange) {
            const pullStrength = (1 - dist / magnetRange) * 600 * delta;
            coin.x += (dx / dist) * pullStrength;
            coin.y += (dy / dist) * pullStrength;
        }

        // Collect coin
        if (dist < collectRange + 30) {
            coin.collected = true;
            const coinVal = isNeuralOverdrive ? coin.value * 2 : coin.value;
            sessionCredits += coinVal;

            // Add to persistent neural credits via achievements system
            if (window.addNeuralCredits) window.addNeuralCredits(coinVal);

            // Visual feedback
            emitParticles(coin.x, coin.y, 'BITS', COLORS.primary, 6, 150);
            floatingTexts.push(new FloatingScore(coin.x, coin.y, `+${coinVal}💠`, COLORS.primary, 16));

            // Update HUD counter
            const hudCoinEl = document.getElementById('hud-coin-count');
            if (hudCoinEl) hudCoinEl.innerText = sessionCredits;

            // Subtle pickup chime (higher pitch than regular pickup)
            if (audioCtx && audioCtx.state !== 'suspended') {
                playDynamicSound(1200 + Math.random() * 400, 'sine', 0.06, 0.04, 600);
            }

            // Remove coin from array
            coins.splice(i, 1);
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
    backgroundTexts.forEach(bt => bt.update(delta));

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

    if (isSurvivalMode && player && !player.isCompromised) {
        // Kill restores health
        const healAmt = en.type === 'HEAVY' ? 10 : 5;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        healthFill.style.width = `${Math.ceil(player.hp)}%`;
        if (player.hp >= 35) document.body.classList.remove('danger');
        floatingTexts.push(new FloatingScore(player.x + player.w/2, player.y - 20, `+${healAmt} HP`, '#ff0055', 20));
    }

    // Achievement: Kill + Combo
    if (window.checkAchievementConditions) {
        window.checkAchievementConditions('ENEMY_KILL', { type: en.model });
        window.checkAchievementConditions('COMBO_CHANGE', { combo: comboCount });
    }

    // Drop Neural Credit coins from enemies
    const dropCount = Math.floor(random(2, 5));
    const coinVal = en.model === 'SNIPER' ? 3 : en.model === 'TANK' ? 4 : 2;
    for (let dc = 0; dc < dropCount; dc++) {
        coins.push({
            x: en.x + en.w / 2 + random(-40, 40),
            y: en.y + en.h / 2 + random(-40, 20),
            value: coinVal,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2,
            sparkle: Math.random()
        });
    }

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

    if (isSurvivalMode && player && !player.isCompromised) {
        player.hp = Math.min(player.maxHp, player.hp + 40);
        healthFill.style.width = `${Math.ceil(player.hp)}%`;
        if (player.hp >= 35) document.body.classList.remove('danger');
        floatingTexts.push(new FloatingScore(player.x + player.w/2, player.y - 40, `+40 HP`, '#ff0055', 30));
    }

    // Achievement: Boss Defeat
    if (window.checkAchievementConditions) window.checkAchievementConditions('BOSS_DEFEAT');

    // DROP BUFFS
    for (let i = 0; i < 3; i++) {
        pickups.push({
            posX: boss.x + boss.w / 2 + random(-100, 100),
            posY: boss.y + boss.h / 2 + random(-100, 100),
            model: 'SPREAD',
            isFound: false
        });
    }

    // DROP NEURAL CREDIT COIN SHOWER (Boss reward)
    const bossDropCount = Math.floor(random(15, 21));
    for (let bc = 0; bc < bossDropCount; bc++) {
        coins.push({
            x: boss.x + boss.w / 2 + random(-150, 150),
            y: boss.y + boss.h / 2 + random(-150, 50),
            value: 10 + Math.floor(currentZone * 2),
            collected: false,
            bobOffset: Math.random() * Math.PI * 2,
            sparkle: Math.random()
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
    if (coins.length > (isMobile ? 60 : 120)) coins = coins.filter(c => !c.collected && c.x > player.x - cleanDist);
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
    const distScore = Math.max(0, Math.floor((distanceTraveled - 250) / 10)); // Offset by spawn pos
    score = distScore + killScore;
    scoreEl.innerText = score.toString().padStart(6, '0');
    if (distanceEl) distanceEl.innerText = `${distScore}m`;

    // Check for Rank Upgrade
    if (currentRankIndex < RANKS.length - 1) {
        const nextRank = RANKS[currentRankIndex + 1];
        if (score >= nextRank.minScore) {
            currentRankIndex++;
            backgroundTexts.push(new BackgroundText(nextRank.name, nextRank.color));
            triggerCombatAlert(`UNIT STATUS UPGRADED: ${nextRank.name}`, nextRank.color, "⚡");
            AudioFX.bossEntry(); // Impact sound
            screenFlash = 0.3;
        }
    }

    // Achievement: Score
    if (window.checkAchievementConditions) window.checkAchievementConditions('SCORE_UPDATE', { score: score });
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

    // --- APPLY WORLD SCALE ---
    ctx.save();
    ctx.scale(WORLD_SCALE, WORLD_SCALE);

    // NEURAL OVERDRIVE: WIREFRAME DOMINANCE
    if (isNeuralOverdrive) {
        const gridStep = isMobile ? 80 : 40;
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        for (let i = 0; i < canvas.width * INV_SCALE; i += gridStep) {
            ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height * INV_SCALE);
        }
        for (let j = 0; j < canvas.height * INV_SCALE; j += gridStep) {
            ctx.moveTo(0, j); ctx.lineTo(canvas.width * INV_SCALE, j);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.05;
        ctx.fillRect(0, 0, canvas.width * INV_SCALE, canvas.height * INV_SCALE);
        ctx.globalAlpha = 1.0;
    }

    if (nightAlpha > 0.1) {
        // High-Quality Moon
        ctx.save();
        ctx.globalAlpha = nightAlpha;
        const moonX = canvas.width * 0.82 * INV_SCALE;
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
            const sx = (i * 213 + worldSeed * 1000) % (canvas.width * INV_SCALE);
            const sy = (i * 357 + worldSeed * 2000) % (canvas.height * INV_SCALE);
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
        let sx = (s.x - camera.x * s.p) % (canvas.width * INV_SCALE);
        let sy = (s.y - camera.y * s.p * 0.5) % (canvas.height * INV_SCALE);
        if (sx < 0) sx += (canvas.width * INV_SCALE); if (sy < 0) sy += (canvas.height * INV_SCALE);

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

    // Background Texts (behind everything else)
    backgroundTexts.forEach(bt => bt.draw());

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

    // NEURAL CREDIT COINS RENDERING
    const now = Date.now();
    coins.forEach(coin => {
        if (coin.collected) return;
        const bobY = Math.sin(now * 0.004 + coin.bobOffset) * 6;
        const screenX = coin.x - camera.x;
        const screenY = coin.y - camera.y + bobY;

        // Skip if off-screen
        if (screenX < -30 || screenX > canvas.width * INV_SCALE + 30 ||
            screenY < -30 || screenY > canvas.height * INV_SCALE + 30) return;

        const coinSize = 10 + (coin.value > 3 ? 4 : coin.value > 1 ? 2 : 0);
        const glowIntensity = coin.value > 3 ? 20 : coin.value > 1 ? 12 : 8;
        const rotation = now * 0.003 + coin.bobOffset;

        ctx.save();
        ctx.translate(screenX, screenY);

        // Glow
        if (!isMobile) {
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = COLORS.primary;
        }

        // Outer diamond
        ctx.rotate(rotation);
        ctx.fillStyle = COLORS.primary;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -coinSize);
        ctx.lineTo(coinSize * 0.7, 0);
        ctx.lineTo(0, coinSize);
        ctx.lineTo(-coinSize * 0.7, 0);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5 + Math.sin(now * 0.006 + coin.sparkle * 10) * 0.3;
        const innerSize = coinSize * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -innerSize);
        ctx.lineTo(innerSize * 0.7, 0);
        ctx.lineTo(0, innerSize);
        ctx.lineTo(-innerSize * 0.7, 0);
        ctx.closePath();
        ctx.fill();

        // Sparkle burst (occasional)
        if (Math.sin(now * 0.005 + coin.sparkle * 20) > 0.92) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-1, -coinSize - 4, 2, 5);
            ctx.fillRect(-1, coinSize - 1, 2, 5);
            ctx.fillRect(-coinSize - 4, -1, 5, 2);
            ctx.fillRect(coinSize - 1, -1, 5, 2);
        }

        ctx.restore();
    });

    enemies.forEach(e => { if (!e.hasExpired) e.draw(); });
    if (boss) boss.draw();
    bullets.forEach(b => b.draw());
    particles.forEach(p => p.draw());

    if (gameState === 'PLAYING' || gameState === 'DYING') player.draw();

    ctx.restore(); // END WORLD SCALE

    // UI HUD Layers (Text drawn on top)
    if (gameState !== 'DYING') drawPowerUpBars();
    floatingTexts.forEach(ft => ft.draw());
    alerts.forEach((alert, i) => alert.draw(i));

    // Dungeon Progress HUD
    if (window.isDungeonMode && window.activeDungeonLevel && gameState === 'PLAYING') {
        const dlvl = window.activeDungeonLevel;
        const prog = Math.min(1.0, distanceTraveled / dlvl.distance);
        const barW = 300;
        const barH = 10;
        const barX = (canvas.width - barW) / 2;
        const barY = canvas.height - 50;

        ctx.save();
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 10, barY - 25, barW + 20, 50);
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.3)';
        ctx.strokeRect(barX - 10, barY - 25, barW + 20, 50);

        // Label
        ctx.fillStyle = '#ff9800';
        ctx.font = '900 11px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔ ${dlvl.name} — ${Math.floor(prog * 100)}%`, canvas.width / 2, barY - 8);

        // Bar track
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(barX, barY, barW, barH);

        // Bar fill
        const grad = ctx.createLinearGradient(barX, 0, barX + barW * prog, 0);
        grad.addColorStop(0, '#ff9800');
        grad.addColorStop(1, '#ffeb3b');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, barW * prog, barH);

        // Boss marker at 70%
        if (dlvl.bossLevel > 0) {
            const bossX = barX + barW * 0.7;
            ctx.strokeStyle = '#f44336';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bossX, barY - 3);
            ctx.lineTo(bossX, barY + barH + 3);
            ctx.stroke();
            ctx.fillStyle = '#f44336';
            ctx.font = '700 8px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('TITAN', bossX, barY + barH + 12);
        }

        ctx.restore();
    }

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
            ctx.font = `italic 900 ${48 * WORLD_SCALE}px Outfit`;
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
        { label: 'STRIKE OVERLOAD', val: player.powerUps.rapidFire, max: window.getUpgradeMaxDuration ? window.getUpgradeMaxDuration('rapidFire') : 4.0, color: COLORS.accent },
        { label: 'OVERDRIVE SPEED', val: player.powerUps.speedBoost, max: window.getUpgradeMaxDuration ? window.getUpgradeMaxDuration('speedBoost') : 4.0, color: COLORS.primary },
        { label: 'NEGATION FIELD', val: player.powerUps.shield, max: window.getUpgradeMaxDuration ? window.getUpgradeMaxDuration('shield') : 5.0, color: COLORS.white }
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

// --- 14. TERMINAL HOOKS (Multi-Page Navigation) ---

// Page Elements
const modeSelectScreen = document.getElementById('mode-select-screen');
const endlessConfigScreen = document.getElementById('endless-config-screen');
const levelSelectScreen = document.getElementById('level-select-screen');

// Navigation Buttons
const navPlayBtn = document.getElementById('nav-play-btn');
const modeBackBtn = document.getElementById('mode-back-btn');
const endlessBackBtn = document.getElementById('endless-back-btn');
const levelsBackBtn = document.getElementById('levels-back-btn');
const cardEndless = document.getElementById('card-endless');
const cardDungeons = document.getElementById('card-dungeons');

// Variant Selector
const variantClassic = document.getElementById('variant-classic');
const variantSurvival = document.getElementById('variant-survival');

/**
 * Page Navigation Helpers
 */
function showPage(el) {
    el.classList.remove('hidden');
    el.classList.add('page-enter');
    // Remove animation class after it completes to allow re-trigger
    setTimeout(() => el.classList.remove('page-enter'), 400);
}

function hidePage(el) {
    el.classList.add('hidden');
}

function hideAllMenuPages() {
    hidePage(startScreen);
    hidePage(modeSelectScreen);
    hidePage(endlessConfigScreen);
    hidePage(levelSelectScreen);
}

// ─── TITLE SCREEN → MODE SELECT ───
if (navPlayBtn) {
    navPlayBtn.onclick = () => {
        // Save username before leaving
        if (usernameInput) {
            playerName = usernameInput.value.trim().toUpperCase() || "GUEST_PILOT";
            localStorage.setItem('cyberstrike_username', playerName);
        }
        hidePage(startScreen);
        showPage(modeSelectScreen);
    };
}

// ─── MODE SELECT → BACK TO TITLE ───
if (modeBackBtn) {
    modeBackBtn.onclick = () => {
        hidePage(modeSelectScreen);
        showPage(startScreen);
    };
}

// ─── MODE SELECT → ENDLESS CONFIG ───
if (cardEndless) {
    cardEndless.onclick = () => {
        hidePage(modeSelectScreen);
        showPage(endlessConfigScreen);
    };
}

// ─── MODE SELECT → LEVEL SELECT ───
if (cardDungeons) {
    cardDungeons.onclick = () => {
        hidePage(modeSelectScreen);
        showPage(levelSelectScreen);
        // Render level grid
        if (window.renderLevelGrid) window.renderLevelGrid();
    };
}

// ─── ENDLESS CONFIG → BACK TO MODE SELECT ───
if (endlessBackBtn) {
    endlessBackBtn.onclick = () => {
        hidePage(endlessConfigScreen);
        showPage(modeSelectScreen);
    };
}

// ─── LEVEL SELECT → BACK TO MODE SELECT ───
if (levelsBackBtn) {
    levelsBackBtn.onclick = () => {
        hidePage(levelSelectScreen);
        showPage(modeSelectScreen);
    };
}

// ─── VARIANT SELECTOR (Classic / Survival) ───
if (variantClassic) {
    variantClassic.onclick = () => {
        isSurvivalMode = false;
        variantClassic.classList.add('variant-active');
        if (variantSurvival) variantSurvival.classList.remove('variant-active');
    };
}

if (variantSurvival) {
    variantSurvival.onclick = () => {
        isSurvivalMode = true;
        variantSurvival.classList.add('variant-active');
        if (variantClassic) variantClassic.classList.remove('variant-active');
    };
}

// ─── START GAME (Endless Mode) ───
startBtn.onclick = () => {
    initAudioSystem();

    // Capture Username
    if (usernameInput) {
        playerName = usernameInput.value.trim().toUpperCase() || "GUEST_PILOT";
        localStorage.setItem('cyberstrike_username', playerName);
    }

    // Reset dungeon state in case we came from dungeon mode
    if (window.resetDungeonState) window.resetDungeonState();

    triggerLoadingSequence(() => {
        gameState = 'PLAYING';
        hideAllMenuPages();
        rebootSystem();
        triggerCombatAlert(`NEURAL LINK ESTABLISHED: ${playerName}`, COLORS.primary, "🛰");
    }, 'loading_bg.png');
};

// ─── RESTART (Game Over) ───
restartBtn.onclick = () => {
    triggerLoadingSequence(() => {
        gameState = 'PLAYING';
        gameOverScreen.classList.add('hidden');

        // If we were in a dungeon, restart the same level
        if (window.isDungeonMode && window.activeDungeonLevel) {
            const lvlId = window.activeDungeonLevel.id;
            if (window.startDungeonLevel) {
                window.startDungeonLevel(lvlId);
                return;
            }
        }

        rebootSystem();
    }, 'loading_bg.png');
};

// ─── HOME (Game Over → Title Screen) ───
homeBtn.onclick = () => {
    if (window.resetDungeonState) window.resetDungeonState();
    triggerLoadingSequence(() => {
        gameState = 'START';
        gameOverScreen.classList.add('hidden');
        showPage(startScreen);
        startHighScoreEl.innerText = highScore.toString().padStart(6, '0');
        renderLeaderboard('leaderboard-list');
    }, 'exiting_bg.png');
};

// ─── PAUSE CONTROLS ───
pauseBtn.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePause();
};
resumeBtn.onclick = togglePause;

pauseRestartBtn.onclick = () => {
    pauseScreen.classList.add('hidden');

    // If dungeon mode, restart the dungeon level
    if (window.isDungeonMode && window.activeDungeonLevel) {
        const lvlId = window.activeDungeonLevel.id;
        if (window.startDungeonLevel) {
            window.startDungeonLevel(lvlId);
            return;
        }
    }

    rebootFromCheckpoint();
    gameState = 'PLAYING';
};

pauseHomeBtn.onclick = () => {
    pauseScreen.classList.add('hidden');
    if (window.resetDungeonState) window.resetDungeonState();
    triggerLoadingSequence(() => {
        gameState = 'START';
        showPage(startScreen);
        startHighScoreEl.innerText = highScore.toString().padStart(6, '0');
        renderLeaderboard('leaderboard-list');
    }, 'exiting_bg.png');
};

// --- LEADERBOARD OVERLAY LOGIC ---
const openLeaderboard = () => {
    leaderboardOverlay.classList.remove('hidden');
};
const closeLeaderboard = () => {
    leaderboardOverlay.classList.add('hidden');
};

if (startLbBtn) startLbBtn.onclick = openLeaderboard;
if (overLbBtn) overLbBtn.onclick = openLeaderboard;
if (lbCloseBtn) lbCloseBtn.onclick = closeLeaderboard;

// Close leaderboard if click happens outside the box
leaderboardOverlay.onclick = (e) => {
    if (e.target === leaderboardOverlay) closeLeaderboard();
};
if (achOverlay) {
    achOverlay.onclick = (e) => {
        if (e.target === achOverlay) achOverlay.classList.add('hidden');
    };
}

// Initial High Score Display
if (usernameInput) usernameInput.value = playerName;
startHighScoreEl.innerText = highScore.toString().padStart(6, '0');

// Render leaderboard once Firebase module is ready (it loads async as ES module)
function initLeaderboard() {
    if (window.firebaseReady) {
        renderLeaderboard('leaderboard-list');
    } else {
        setTimeout(initLeaderboard, 300);
    }
}
initLeaderboard();

// Initiate Primary Application Thread
requestAnimationFrame(tick);

// Initialize System
window.onload = () => {
    if (window.initAchievements) window.initAchievements();
    if (window.initShop) window.initShop();
    if (window.renderLevelGrid) window.renderLevelGrid();
};

/**
 * ============================================================================
 * [END OF TITAN CORE MODULE]
 * ============================================================================
 */