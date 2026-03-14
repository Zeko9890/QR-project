/**
 * ============================================================================
 * CYBERSTRIKE: OVERDRIVE — DUNGEON SYSTEM
 * ============================================================================
 * 
 * Manages the Levels/Dungeon game mode with structured operations,
 * progression tracking, star ratings, and level definitions.
 * 
 * ============================================================================
 */

// --- DUNGEON LEVEL DEFINITIONS ---
const DUNGEON_LEVELS = [
    // ─── TIER I: RECON (Levels 1-5) ───
    {
        id: 1, name: 'BREACH POINT', tier: 1,
        distance: 30000, bossLevel: 0,
        enemyDensity: 0.35, enemyTypes: ['DRONE'],
        description: 'Basic infiltration. Clear the sector perimeter.',
        starThresholds: [6000, 15000, 28000],
        reward: 50
    },
    {
        id: 2, name: 'GRID SHADOW', tier: 1,
        distance: 40000, bossLevel: 0,
        enemyDensity: 0.5, enemyTypes: ['DRONE'],
        description: 'Navigate through drone-patrolled corridors.',
        starThresholds: [9000, 22000, 40000],
        reward: 75
    },
    {
        id: 3, name: 'SIGNAL DECAY', tier: 1,
        distance: 50000, bossLevel: 0,
        enemyDensity: 0.55, enemyTypes: ['DRONE', 'SNIPER'],
        description: 'Sniper units detected. Watch your flanks.',
        starThresholds: [12000, 28000, 50000],
        reward: 100
    },
    {
        id: 4, name: 'STATIC SURGE', tier: 1,
        distance: 60000, bossLevel: 0,
        enemyDensity: 0.6, enemyTypes: ['DRONE', 'SNIPER'],
        description: 'High-interference zone. Enemy density rising.',
        starThresholds: [15000, 38000, 62000],
        reward: 125
    },
    {
        id: 5, name: 'WATCHDOG', tier: 1,
        distance: 75000, bossLevel: 1,
        enemyDensity: 0.55, enemyTypes: ['DRONE', 'SNIPER'],
        description: 'First Titan encounter. Terminate the guardian.',
        starThresholds: [25000, 55000, 92000],
        reward: 200
    },

    // ─── TIER II: COMBAT (Levels 6-10) ───
    {
        id: 6, name: 'IRON VEIL', tier: 2,
        distance: 85000, bossLevel: 1,
        enemyDensity: 0.65, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'Tank units deployed. Heavy resistance ahead.',
        starThresholds: [31000, 68000, 108000],
        reward: 250
    },
    {
        id: 7, name: 'NERVE CENTER', tier: 2,
        distance: 100000, bossLevel: 1,
        enemyDensity: 0.7, enemyTypes: ['DRONE', 'TANK'],
        description: 'Armored columns advance. Break through or perish.',
        starThresholds: [37000, 80000, 130000],
        reward: 300
    },
    {
        id: 8, name: 'BLACKOUT', tier: 2,
        distance: 120000, bossLevel: 2,
        enemyDensity: 0.75, enemyTypes: ['SNIPER', 'TANK'],
        description: 'Elite forces in a darkened sector. Stay vigilant.',
        starThresholds: [46000, 93000, 150000],
        reward: 350
    },
    {
        id: 9, name: 'CRUCIBLE', tier: 2,
        distance: 140000, bossLevel: 2,
        enemyDensity: 0.8, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'Full-spectrum warfare. Endure the crucible.',
        starThresholds: [55000, 108000, 170000],
        reward: 400
    },
    {
        id: 10, name: 'WARPATH', tier: 2,
        distance: 160000, bossLevel: 3,
        enemyDensity: 0.75, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'Titan-Class III detected. Maximum threat level.',
        starThresholds: [68000, 130000, 200000],
        reward: 500
    },

    // ─── TIER III: TITAN (Levels 11-15) ───
    {
        id: 11, name: 'RED PROTOCOL', tier: 3,
        distance: 180000, bossLevel: 3,
        enemyDensity: 0.85, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'Emergency protocols engaged. Overwhelming force.',
        starThresholds: [77000, 150000, 225000],
        reward: 600
    },
    {
        id: 12, name: 'DEAD SECTOR', tier: 3,
        distance: 210000, bossLevel: 4,
        enemyDensity: 0.9, enemyTypes: ['SNIPER', 'TANK'],
        description: 'No comms. No backup. Pure survival instinct.',
        starThresholds: [86000, 160000, 250000],
        reward: 700
    },
    {
        id: 13, name: 'NEURAL STORM', tier: 3,
        distance: 240000, bossLevel: 4,
        enemyDensity: 0.95, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'Reality fractured. Neural interference at maximum.',
        starThresholds: [99000, 180000, 280000],
        reward: 800
    },
    {
        id: 14, name: 'TITAN CORE', tier: 3,
        distance: 270000, bossLevel: 5,
        enemyDensity: 0.9, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'The heart of the Titan network. Penetrate and destroy.',
        starThresholds: [108000, 192000, 310000],
        reward: 1000
    },
    {
        id: 15, name: 'OVERDRIVE ZERO', tier: 3,
        distance: 320000, bossLevel: 5,
        enemyDensity: 1.0, enemyTypes: ['DRONE', 'SNIPER', 'TANK'],
        description: 'The final operation. Only legends survive.',
        starThresholds: [124000, 217000, 370000],
        reward: 1500
    }
];

// --- PERSISTENCE ---
const DUNGEON_STORAGE_KEY = 'cyberstrike_dungeon_progress';

function loadDungeonProgress() {
    try {
        const raw = localStorage.getItem(DUNGEON_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Dungeon progress load failed:', e);
    }
    // Default: level 1 unlocked, everything else locked
    return { unlockedUpTo: 1, levels: {} };
}

function saveDungeonProgress(data) {
    try {
        localStorage.setItem(DUNGEON_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Dungeon progress save failed:', e);
    }
}

// --- ACTIVE DUNGEON STATE ---
let activeDungeonLevel = null; // The level definition currently being played
let isDungeonMode = false;
let dungeonBossSpawned = false;
let dungeonCompleted = false;

/**
 * Get the star count for a given score on a given level
 */
function getDungeonStars(levelId, score) {
    const lvl = DUNGEON_LEVELS.find(l => l.id === levelId);
    if (!lvl) return 0;
    let stars = 0;
    for (let i = 0; i < lvl.starThresholds.length; i++) {
        if (score >= lvl.starThresholds[i]) stars = i + 1;
    }
    return stars;
}

/**
 * Complete a dungeon level, save progress
 */
function completeDungeonLevel(levelId, score) {
    const progress = loadDungeonProgress();
    const stars = getDungeonStars(levelId, score);
    const lvl = DUNGEON_LEVELS.find(l => l.id === levelId);

    // Update best stars for this level
    const prev = progress.levels[levelId] || { stars: 0, bestScore: 0 };
    if (stars > prev.stars) prev.stars = stars;
    if (score > prev.bestScore) prev.bestScore = score;
    progress.levels[levelId] = prev;

    // Unlock the next level
    if (levelId >= progress.unlockedUpTo) {
        progress.unlockedUpTo = Math.min(levelId + 1, DUNGEON_LEVELS.length);
    }

    saveDungeonProgress(progress);

    // Grant credit reward on first completion or star improvement
    if (lvl && window.addNeuralCredits) {
        const bonusCredits = Math.floor(lvl.reward * (stars / 3));
        window.addNeuralCredits(bonusCredits);
    }

    return { stars, bestScore: prev.bestScore };
}

/**
 * Render the level select grid
 */
function renderLevelGrid() {
    const progress = loadDungeonProgress();
    const grids = {
        1: document.getElementById('tier1-grid'),
        2: document.getElementById('tier2-grid'),
        3: document.getElementById('tier3-grid')
    };

    // Clear grids
    Object.values(grids).forEach(g => { if (g) g.innerHTML = ''; });

    DUNGEON_LEVELS.forEach(lvl => {
        const grid = grids[lvl.tier];
        if (!grid) return;

        const isUnlocked = lvl.id <= progress.unlockedUpTo;
        const savedData = progress.levels[lvl.id] || { stars: 0, bestScore: 0 };
        const isPerfect = savedData.stars >= 3;
        const isCompleted = savedData.stars > 0;

        const card = document.createElement('div');
        card.className = 'level-card';
        if (!isUnlocked) card.classList.add('level-locked');
        if (isCompleted) card.classList.add('level-completed');
        if (isPerfect) card.classList.add('level-perfect');

        if (isUnlocked) {
            // Stars display
            let starsHTML = '';
            for (let s = 1; s <= 3; s++) {
                starsHTML += `<span class="${s <= savedData.stars ? 'star-filled' : 'star-empty'}">★</span>`;
            }

            card.innerHTML = `
                <div class="level-number">${String(lvl.id).padStart(2, '0')}</div>
                <div class="level-name">${lvl.name}</div>
                <div class="level-stars">${starsHTML}</div>
            `;

            card.onclick = () => startDungeonLevel(lvl.id);
            card.title = `${lvl.name}\n${lvl.description}\nBest: ${savedData.bestScore}`;
        } else {
            card.innerHTML = `
                <div class="level-lock-icon">🔒</div>
                <div class="level-number" style="font-size: 16px;">${String(lvl.id).padStart(2, '0')}</div>
                <div class="level-name">${lvl.name}</div>
            `;
        }

        grid.appendChild(card);
    });
}

/**
 * Start a dungeon level
 */
function startDungeonLevel(levelId) {
    const lvl = DUNGEON_LEVELS.find(l => l.id === levelId);
    if (!lvl) return;

    const progress = loadDungeonProgress();
    if (levelId > progress.unlockedUpTo) return; // Can't play locked levels

    activeDungeonLevel = lvl;
    isDungeonMode = true;
    dungeonBossSpawned = false;
    dungeonCompleted = false;

    // Capture username
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        const name = usernameInput.value.trim().toUpperCase() || 'GUEST_PILOT';
        localStorage.setItem('cyberstrike_username', name);
        if (typeof playerName !== 'undefined') playerName = name;
    }

    // Init audio
    if (typeof initAudioSystem === 'function') initAudioSystem();

    // Navigate to game
    document.getElementById('level-select-screen').classList.add('hidden');
    document.getElementById('mode-select-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');

    if (typeof triggerLoadingSequence === 'function') {
        triggerLoadingSequence(() => {
            gameState = 'PLAYING';
            isSurvivalMode = false; // Dungeons always use Classic rules (checkpoints)
            rebootSystem();
            if (typeof triggerCombatAlert === 'function') {
                triggerCombatAlert(`DUNGEON: ${lvl.name}`, '#ff9800', '⚔');
            }
        }, 'loading_bg.png');
    }
}

/**
 * Check dungeon progress during gameplay (called from tick)
 */
function checkDungeonProgress() {
    if (!isDungeonMode || !activeDungeonLevel || dungeonCompleted) return;
    if (typeof player === 'undefined' || !player || player.isCompromised) return;

    const lvl = activeDungeonLevel;

    // Boss spawn when player reaches 70% of the target distance
    if (!dungeonBossSpawned && distanceTraveled >= lvl.distance * 0.7 && lvl.bossLevel > 0) {
        dungeonBossSpawned = true;
        if (typeof TitanBoss !== 'undefined') {
            boss = new TitanBoss(player.x + 1200, player.y, lvl.bossLevel);
            if (typeof AudioFX !== 'undefined') AudioFX.bossEntry();
            screenShake = 45;
            screenFlash = 0.4;
            if (typeof triggerTransition === 'function') {
                triggerTransition(`TITAN-CLASS ${lvl.bossLevel} DEPLOYMENT`, '#f44336');
            }
            const bossHud = document.getElementById('boss-hud');
            const bossHealthFill = document.getElementById('boss-health-fill');
            if (bossHud) bossHud.classList.remove('hidden');
            if (bossHealthFill) bossHealthFill.style.width = '100%';
        }
    }

    // Level completion check
    const bossCleared = lvl.bossLevel === 0 || (dungeonBossSpawned && !boss);
    const distReached = distanceTraveled >= lvl.distance;

    if (distReached && bossCleared) {
        dungeonCompleted = true;

        // Calculate final score
        const finalScore = typeof score !== 'undefined' ? score : 0;
        const result = completeDungeonLevel(lvl.id, finalScore);

        // Show completion alert
        const starText = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
        if (typeof triggerCombatAlert === 'function') {
            triggerCombatAlert(`DUNGEON CLEARED: ${starText}`, '#4caf50', '✅');
        }
        if (typeof triggerTransition === 'function') {
            triggerTransition(`OPERATION ${lvl.name}: COMPLETE`, '#4caf50');
        }

        // Grant reward credits
        if (typeof sessionCredits !== 'undefined' && window.addNeuralCredits) {
            window.addNeuralCredits(lvl.reward);
        }

        // End the level after a short delay
        setTimeout(() => {
            if (typeof initiateSystemHalt === 'function') {
                // Custom "victory" halt
                player.isCompromised = true;
                gameState = 'GAMEOVER';

                // Update game over screen with dungeon results
                const finalScoreEl = document.getElementById('final-score');
                const overHighScoreEl = document.getElementById('over-high-score');
                const unitEl = document.getElementById('unit-status');
                const pilotEl = document.getElementById('over-pilot-name');

                if (finalScoreEl) finalScoreEl.innerText = finalScore.toString().padStart(6, '0');
                if (overHighScoreEl) overHighScoreEl.innerText = (typeof highScore !== 'undefined' ? highScore : 0).toString().padStart(6, '0');
                if (pilotEl) pilotEl.innerText = typeof playerName !== 'undefined' ? playerName : 'PILOT';
                if (unitEl) unitEl.innerText = `OPERATION SUCCESS // CLEARED`;

                const gameOverScreen = document.getElementById('game-over-screen');
                if (gameOverScreen) {
                    gameOverScreen.style.opacity = '0';
                    gameOverScreen.classList.remove('hidden');
                    let fadeIn = 0;
                    const fadeInterval = setInterval(() => {
                        fadeIn += 0.04;
                        gameOverScreen.style.opacity = Math.min(fadeIn, 1).toString();
                        if (fadeIn >= 1) {
                            gameOverScreen.style.opacity = '1';
                            clearInterval(fadeInterval);
                            
                            // Trigger dynamic 3D star animation
                            animateVictoryStars(result.stars);
                        }
                    }, 16);
                }

                if (window.updateCurrencyDisplay) window.updateCurrencyDisplay();
            }
        }, 3000);
    }
}

/**
 * Reset dungeon state when returning to menu
 */
function resetDungeonState() {
    activeDungeonLevel = null;
    isDungeonMode = false;
    dungeonBossSpawned = false;
    dungeonCompleted = false;
    
    // Clear victory stars UI for the next run
    const starContainer = document.getElementById('dungeon-victory-stars');
    if (starContainer) starContainer.classList.add('hidden');
}

/**
 * Animate 3D Stars dynamically upon level clear
 */
function animateVictoryStars(starCount) {
    const container = document.getElementById('dungeon-victory-stars');
    if (!container) return;
    
    // Reset stars state
    for (let i = 1; i <= 3; i++) {
        const starEl = document.getElementById('vic-star-' + i);
        if (starEl) {
            starEl.className = 'vic-star'; // removes active anim class
        }
    }
    
    container.classList.remove('hidden');
    
    let currentStar = 1;
    function popNext() {
        if (currentStar > starCount) return;
        const starEl = document.getElementById('vic-star-' + currentStar);
        if (starEl) {
            starEl.classList.add('star-active');
            if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
        }
        currentStar++;
        setTimeout(popNext, 500); // 500ms delay between stars popping up
    }
    
    setTimeout(popNext, 600); // Delay start slightly after screen fade-in
}

// Expose to global scope (use defineProperty for live value access)
Object.defineProperty(window, 'isDungeonMode', { get: () => isDungeonMode, configurable: true });
Object.defineProperty(window, 'activeDungeonLevel', { get: () => activeDungeonLevel, configurable: true });
window.checkDungeonProgress = checkDungeonProgress;
window.renderLevelGrid = renderLevelGrid;
window.resetDungeonState = resetDungeonState;
window.startDungeonLevel = startDungeonLevel;
window.DUNGEON_LEVELS = DUNGEON_LEVELS;
