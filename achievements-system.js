/**
 * ============================================================================
 * CYBERSTRIKE: ACHIEVEMENT & CURRENCY SYSTEM
 * ============================================================================
 * Handles achievement milestones, progress tracking, rewards, and UI rendering.
 */

const ACH_KEY = 'cyberstrike_achievements';
const CURRENCY_KEY = 'cyberstrike_currency';

let _neuralCredits = 0;

// Internal state structure: { id: { progress: 0, state: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' } }
let _achState = {};

// Detailed Achievement Definitions
const ACHIEVEMENTS = [
    {
        id: "boot_sequence",
        title: "BOOT SEQUENCE",
        description: "Start the game for the first time.",
        icon: "🔌",
        maxProgress: 1,
        reward: 50
    },
    {
        id: "first_blood",
        title: "FIRST BLOOD",
        description: "Eliminate your first hostile unit.",
        icon: "🎯",
        maxProgress: 1,
        reward: 100
    },
    {
        id: "drone_terminator",
        title: "DRONE TERMINATOR",
        description: "Neutralize 100 drone units.",
        icon: "🛸",
        maxProgress: 100,
        reward: 500
    },
    {
        id: "sniper_breaker",
        title: "SNIPER BREAKER",
        description: "Neutralize 75 sniper units.",
        icon: "🔭",
        maxProgress: 75,
        reward: 600
    },
    {
        id: "titan_slayer",
        title: "TITAN SLAYER",
        description: "Defeat 5 Titan-class bosses.",
        icon: "👹",
        maxProgress: 5,
        reward: 2000
    },
    {
        id: "overdrive_initiated",
        title: "NEURAL OVERDRIVE",
        description: "Activate Neural Overdrive 10 times in combat.",
        icon: "⚡",
        maxProgress: 10,
        reward: 1000
    },
    {
        id: "survivor_protocol",
        title: "SURVIVOR PROTOCOL",
        description: "Travel 100,000 meters into the sector.",
        icon: "🏃",
        maxProgress: 100000,
        reward: 1500
    },
    {
        id: "city_ghost",
        title: "CITY GHOST",
        description: "Travel 250,000 meters into the sector.",
        icon: "🏙",
        maxProgress: 250000,
        reward: 3000
    },
    {
        id: "overdrive_god",
        title: "OVERDRIVE GOD",
        description: "Reach a total score of 500,000.",
        icon: "👑",
        maxProgress: 500000,
        reward: 5000
    },
    {
        id: "combo_king",
        title: "COMBO KING",
        description: "Reach a 50x rapid elimination combo.",
        icon: "🔥",
        maxProgress: 50,
        reward: 2500
    },
    {
        id: "wealthy_pilot",
        title: "WEALTHY PILOT",
        description: "Hoard 5,000 total Neural Credits.",
        icon: "💠",
        maxProgress: 5000,
        reward: 2000
    },
    {
        id: "titan_bane",
        title: "TITAN BANE",
        description: "Defeat 25 Titan-class bosses in total.",
        icon: "💀",
        maxProgress: 25,
        reward: 10000
    },
    {
        id: "city_phantom",
        title: "CITY PHANTOM",
        description: "Travel 500,000 meters into the sector.",
        icon: "👻",
        maxProgress: 500000,
        reward: 10000
    },
    {
        id: "void_walker",
        title: "VOID WALKER",
        description: "Travel 1,000,000 meters into the sector.",
        icon: "🌌",
        maxProgress: 1000000,
        reward: 25000,
        trailReward: "mythic_void"
    }
];

function initAchievements() {
    // Load Currency
    const savedCurrency = localStorage.getItem(CURRENCY_KEY);
    if (savedCurrency) {
        _neuralCredits = parseInt(savedCurrency) || 0;
    }
    updateCurrencyDisplay();

    // Load Achievement State
    const savedAch = localStorage.getItem(ACH_KEY);
    if (savedAch) {
        _achState = JSON.parse(savedAch);
    }

    // Ensure all defined achievements exist in state and are consistent
    ACHIEVEMENTS.forEach(ach => {
        if (!_achState[ach.id]) {
            _achState[ach.id] = { progress: 0, state: 'LOCKED' };
        } else {
            // CRITICAL FIX: If an achievement requirement was increased, but the state is still COMPLETED/CLAIMED,
            // we must reset the state so the player can actually finish the new requirement.
            const stateData = _achState[ach.id];
            if (stateData.progress < ach.maxProgress) {
                if (stateData.state === 'COMPLETED' || stateData.state === 'CLAIMED') {
                    stateData.state = stateData.progress > 0 ? 'IN_PROGRESS' : 'LOCKED';
                }
            } else if (stateData.progress >= ach.maxProgress && stateData.state === 'IN_PROGRESS') {
                stateData.state = 'COMPLETED';
            }
        }
    });

    saveAchievements();

    // Create Notification Container if not exists
    if (!document.getElementById('achievement-container')) {
        const container = document.createElement('div');
        container.id = 'achievement-container';
        document.body.appendChild(container); // Append to body or UI layer
    }
}

function saveCurrency() {
    localStorage.setItem(CURRENCY_KEY, _neuralCredits);
    updateCurrencyDisplay();
}

function saveAchievements() {
    localStorage.setItem(ACH_KEY, JSON.stringify(_achState));
}

function getPlayerCurrency() {
    return _neuralCredits;
}

function updateCurrencyDisplay() {
    const formatted = _neuralCredits.toLocaleString();
    const globalWallet = document.getElementById('global-wallet-amount');
    if (globalWallet) globalWallet.innerText = formatted;
}

/**
 * Increment or set progress for an achievement ID.
 */
function updateAchievementProgress(id, amount, absolute = false) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    const state = _achState[id];

    if (!ach || !state) return;
    
    // If requirement increased, we allow updates again even if it was previously "COMPLETED"
    if (state.progress >= ach.maxProgress && (state.state === 'COMPLETED' || state.state === 'CLAIMED')) return;

    if (absolute) {
        state.progress = Math.max(state.progress, amount);
    } else {
        state.progress += amount;
    }

    if (state.progress > 0 && state.state === 'LOCKED') {
        state.state = 'IN_PROGRESS';
    }

    if (state.progress >= ach.maxProgress) {
        state.progress = ach.maxProgress;
        state.state = 'COMPLETED';
        unlockAchievement(id);
    }

    saveAchievements();

    // Auto-update UI if panel is open
    const panel = document.getElementById('achievement-overlay');
    if (panel && !panel.classList.contains('hidden')) {
        renderAchievementPanel();
    }
}

function unlockAchievement(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
        showAchievementNotification(ach);
    }
}

function claimAchievementReward(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    const state = _achState[id];

    if (ach && state && state.state === 'COMPLETED') {
        state.state = 'CLAIMED';
        _neuralCredits += ach.reward;
        
        // Handle Trail Reward
        if (ach.trailReward && window.unlockTrail) {
            window.unlockTrail(ach.trailReward);
            triggerCombatAlert("LEGENDARY TRAIL UNLOCKED!", "#ff00ff", "✨");
        }

        saveCurrency();
        saveAchievements();
        showRewardAnimation(ach.reward);
        renderAchievementPanel();

        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    }
}

function showAchievementNotification(ach) {
    const container = document.getElementById('achievement-container');
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';

    notification.innerHTML = `
        <div class="ach-header">ACHIEVEMENT COMPLETED</div>
        <div class="ach-title">${ach.icon} ${ach.title}</div>
        <div class="ach-desc">${ach.description}</div>
        <div class="ach-reward-info">REWARD UNLOCKED: ${ach.reward} CR${ach.trailReward ? ' + [VOID NEBULA TRAIL]' : ''}</div>
    `;

    container.appendChild(notification);

    if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup(); // Or a custom sound

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

function showRewardAnimation(amount, btnEvent) {
    const walletEl = document.getElementById('global-wallet-amount');
    const container = document.getElementById('achievement-container');

    // Default start pos (center screen) if no event provided
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (btnEvent && btnEvent.target) {
        const rect = btnEvent.target.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    }

    let targetX = window.innerWidth - 100;
    let targetY = 40;
    if (walletEl) {
        const wRect = walletEl.getBoundingClientRect();
        targetX = wRect.left + wRect.width / 2;
        targetY = wRect.top + wRect.height / 2;
    }

    // Scatter Coins
    const coinCount = Math.min(15, Math.max(8, Math.floor(amount / 25)));
    for (let i = 0; i < coinCount; i++) {
        const coin = document.createElement('div');
        coin.className = 'flying-coin';
        coin.innerText = '💠';

        // Initial scatter directions
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterDist = 40 + Math.random() * 80;
        const offsetX = Math.cos(scatterAngle) * scatterDist;
        const offsetY = Math.sin(scatterAngle) * scatterDist;

        coin.style.left = `${startX}px`;
        coin.style.top = `${startY}px`;

        document.body.appendChild(coin);

        // Animation Sequence
        requestAnimationFrame(() => {
            // 1. Burst phase
            coin.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1.6) rotate(${Math.random() * 360}deg)`;
            coin.style.opacity = '1';

            // 2. Fly to wallet phase
            setTimeout(() => {
                const flyX = targetX - (startX + offsetX);
                const flyY = targetY - (startY + offsetY);
                coin.style.transition = 'transform 0.8s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 0.8s ease';
                coin.style.transform = `translate(${offsetX + flyX}px, ${offsetY + flyY}px) scale(0.3) rotate(720deg)`;
                coin.style.opacity = '0.4';

                setTimeout(() => {
                    coin.remove();
                    // Pulse wallet on arrival (only for last few coins)
                    if (i === coinCount - 1) {
                        const wContainer = document.getElementById('global-wallet');
                        if (wContainer) {
                            wContainer.classList.add('wallet-pulse');
                            setTimeout(() => wContainer.classList.remove('wallet-pulse'), 300);
                        }
                    }
                }, 800);
            }, 500 + Math.random() * 400);
        });
    }

    // Reward notification (toast) instead of central popup
    showAchievementNotification({
        title: "CREDITS RECEIVED",
        description: `Successfully uplinked +${amount} Neural Credits.`,
        icon: "💠",
        reward: amount
    });
}

/**
 * Event hook to handle game events and route them to progress updates
 */
function checkAchievementConditions(eventType, data = {}) {
    switch (eventType) {
        case 'GAME_START':
            updateAchievementProgress('boot_sequence', 1, true);
            break;

        case 'ENEMY_KILL':
            updateAchievementProgress('first_blood', 1, true);
            if (data.type === 'DRONE') {
                updateAchievementProgress('drone_terminator', 1);
            }
            if (data.type === 'SNIPER') {
                updateAchievementProgress('sniper_breaker', 1);
            }
            break;

        case 'BOSS_DEFEAT':
            updateAchievementProgress('titan_slayer', 1);
            updateAchievementProgress('titan_bane', 1);
            break;

        case 'OVERDRIVE_ACTIVATE':
            updateAchievementProgress('overdrive_initiated', 1);
            break;

        case 'DISTANCE_UPDATE':
            updateAchievementProgress('survivor_protocol', data.distance, true);
            updateAchievementProgress('city_ghost', data.distance, true);
            updateAchievementProgress('city_phantom', data.distance, true);
            updateAchievementProgress('void_walker', data.distance, true);
            break;

        case 'SCORE_UPDATE':
            updateAchievementProgress('overdrive_god', data.score, true);
            break;

        case 'COMBO_CHANGE':
            updateAchievementProgress('combo_king', data.combo, true);
            break;

        case 'CREDIT_ADD':
            updateAchievementProgress('wealthy_pilot', data.amount);
            break;
    }
}

function renderAchievementPanel() {
    const listEl = document.getElementById('achievement-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Prioritize achievements that are actually achievable or claimable
    const sortedAchs = [...ACHIEVEMENTS].sort((a, b) => {
        const stateA = _achState[a.id].state;
        const stateB = _achState[b.id].state;

        const rank = (state) => {
            if (state === 'COMPLETED') return 4;
            if (state === 'IN_PROGRESS') return 3;
            if (state === 'LOCKED') return 2;
            if (state === 'CLAIMED') return 1;
            return 0;
        };

        if (rank(stateB) !== rank(stateA)) return rank(stateB) - rank(stateA);
        
        // Secondary sort: Progress percentage
        const progA = (_achState[a.id].progress / a.maxProgress);
        const progB = (_achState[b.id].progress / b.maxProgress);
        return progB - progA;
    });

    sortedAchs.forEach(ach => {
        const stateData = _achState[ach.id];
        const progressPct = Math.min(100, (stateData.progress / ach.maxProgress) * 100);

        const item = document.createElement('div');
        item.className = `ach-card ${stateData.state.toLowerCase()}`;

        let actionBtnHTML = '';
        if (stateData.state === 'COMPLETED') {
            actionBtnHTML = `<button class="ach-action-btn collect-btn" onclick="claimAchievementReward('${ach.id}')">COLLECT</button>`;
        } else if (stateData.state === 'CLAIMED') {
            actionBtnHTML = `<button class="ach-action-btn claimed-btn" disabled>CLAIMED</button>`;
        } else {
            const trailText = ach.trailReward ? `<div class="ach-reward-trail" style="color: #ff00ff; font-size: 9px; margin-bottom: 4px;">+ VOID NEBULA TRAIL</div>` : '';
            actionBtnHTML = `
                <div class="ach-action-area-inner">
                    ${trailText}
                    <div class="ach-reward-amount">${ach.reward} CR</div>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="ach-icon">${ach.icon}</div>
            <div class="ach-body">
                <div class="ach-title-bar">
                    <span class="ach-card-title">${ach.title}</span>
                </div>
                <div class="ach-card-desc">${ach.description}</div>
                <div class="ach-progress-container">
                    <div class="ach-progress-bar">
                        <div class="ach-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="ach-progress-text">${Math.floor(stateData.progress)} / ${ach.maxProgress}</div>
                </div>
            </div>
            <div class="ach-action-area">
                ${actionBtnHTML}
            </div>
        `;
        listEl.appendChild(item);
    });
}
// Add credits directly (used by game.js coin collection)
function addNeuralCredits(amount) {
    _neuralCredits += amount;
    saveCurrency();
    checkAchievementConditions('CREDIT_ADD', { amount: amount });
}

function deductNeuralCredits(amount) {
    if (_neuralCredits >= amount) {
        _neuralCredits -= amount;
        saveCurrency();
        return true;
    }
    return false;
}

// Expose to window
window.initAchievements = initAchievements;
window.updateAchievementProgress = updateAchievementProgress;
window.checkAchievementConditions = checkAchievementConditions;
window.renderAchievementPanel = renderAchievementPanel;
window.claimAchievementReward = claimAchievementReward;
window.getPlayerCurrency = getPlayerCurrency;
window.addNeuralCredits = addNeuralCredits;
window.deductNeuralCredits = deductNeuralCredits;
window.saveCurrency = saveCurrency;
window.updateCurrencyDisplay = updateCurrencyDisplay;
