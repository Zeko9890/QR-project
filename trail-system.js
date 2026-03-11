/**
 * ============================================================================
 * CYBERSTRIKE: TRAIL SYSTEM
 * ============================================================================
 * Handles unlocking, purchasing, and selecting player trails.
 * Includes a random spin (gacha) mechanic.
 */

const TRAIL_KEY = 'cyberstrike_trail_data';

const TRAILS = [
    // COMMON (50%)
    { id: 'standard_white', name: 'CORE WHITE', color: '#ffffff', rarity: 'COMMON', type: 'solid' },
    { id: 'standard_grey', name: 'ASH GREY', color: '#888888', rarity: 'COMMON', type: 'solid' },
    
    // UNCOMMON (25%)
    { id: 'standard_cyan', name: 'CYAN NEON', color: '#00e5ff', rarity: 'UNCOMMON', type: 'solid' },
    { id: 'standard_pink', name: 'HOT PINK', color: '#ff0055', rarity: 'UNCOMMON', type: 'solid' },
    { id: 'standard_green', name: 'TOXIC GREEN', color: '#39ff14', rarity: 'UNCOMMON', type: 'solid' },
    { id: 'standard_yellow', name: 'CITRUS VOLT', color: '#ffeb3b', rarity: 'UNCOMMON', type: 'solid' },
    
    // EPIC (15%) - Replaces RARE
    { id: 'gradient_fire', name: 'HELLFIRE', color: 'linear-gradient(to right, #ff0000, #ffeb3b)', rarity: 'EPIC', type: 'gradient' },
    { id: 'gradient_ice', name: 'GLACIER', color: 'linear-gradient(to right, #00d2ff, #3a7bd5)', rarity: 'EPIC', type: 'gradient' },
    { id: 'gradient_void', name: 'VOID STREAK', color: 'linear-gradient(to right, #8e2de2, #4a00e0)', rarity: 'EPIC', type: 'gradient' },
    
    // LEGENDARY (8%)
    { id: 'legend_rainbow', name: 'PRISM OVERDRIVE', color: 'rainbow', rarity: 'LEGENDARY', type: 'special' },
    { id: 'legend_gold', name: 'GOLDEN PROTOCOL', color: '#ffd700', rarity: 'LEGENDARY', type: 'glow' },
    { id: 'legend_matrix', name: 'SYSTEM BREAKER', color: '#00ff41', rarity: 'LEGENDARY', type: 'matrix' },

    // MYTHIC (2%)
    { id: 'mythic_boxes', name: 'NEURAL BLOCKS', color: '#ff00ff', rarity: 'MYTHIC', type: 'box' },
    { id: 'mythic_glitch', name: 'QUANTUM GHOST', color: '#ff0055', rarity: 'MYTHIC', type: 'glitch' },
    { id: 'mythic_void', name: 'VOID NEBULA', color: '#aa00ff', rarity: 'MYTHIC', type: 'gradient', exclusive: true } 
];

const RARITY_COLORS = {
    'COMMON': '#ffffff',
    'UNCOMMON': '#00e5ff',
    'EPIC': '#a335ee',
    'LEGENDARY': '#ffeb3b',
    'MYTHIC': '#ff0000'
};

const RARITY_BG_COLORS = {
    'COMMON': 'rgba(255, 255, 255, 0.05)',
    'UNCOMMON': 'rgba(0, 229, 255, 0.1)',
    'EPIC': 'rgba(163, 53, 238, 0.15)',
    'LEGENDARY': 'rgba(255, 235, 59, 0.15)',
    'MYTHIC': 'rgba(255, 0, 0, 0.2)'
};

let trailData = {
    unlocked: ['standard_white'],
    equipped: 'standard_white',
    cratesOpened: 0
};

function getCrateCost() {
    const costs = [500, 1500, 2500, 5000];
    return costs[Math.min(trailData.cratesOpened, costs.length - 1)];
}

function initTrails() {
    // TEMPORARY: Reset for testing animations
    /*
    const saved = localStorage.getItem(TRAIL_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            trailData.unlocked = parsed.unlocked || ['standard_white'];
            trailData.equipped = parsed.equipped || 'standard_white';
            trailData.cratesOpened = parsed.cratesOpened || 0;
        } catch (e) {
            console.error('Failed to load trail data:', e);
        }
    }
    */
    renderTrailShop();
}

function saveTrails() {
    localStorage.setItem(TRAIL_KEY, JSON.stringify(trailData));
}

function getEquippedTrail() {
    return TRAILS.find(t => t.id === trailData.equipped) || TRAILS[0];
}

function spinForTrail() {
    const currentCost = getCrateCost();
    
    // Filter out already owned trails AND exclusive trails (achievement rewards)
    const lockedTrails = TRAILS.filter(t => !trailData.unlocked.includes(t.id) && !t.exclusive);
    
    if (lockedTrails.length === 0) {
        triggerCombatAlert("ALL NEURAL UNITS ARCHIVED", "#fff", "✓");
        return null;
    }

    if (window.deductNeuralCredits && window.deductNeuralCredits(currentCost)) {
        const rand = Math.random() * 100;
        let rarityChosen = 'COMMON';

        if (rand < 2) rarityChosen = 'MYTHIC';
        else if (rand < 10) rarityChosen = 'LEGENDARY';
        else if (rand < 25) rarityChosen = 'EPIC';
        else if (rand < 50) rarityChosen = 'UNCOMMON';
        else rarityChosen = 'COMMON';

        // Find locked items of chosen rarity
        let pool = lockedTrails.filter(t => t.rarity === rarityChosen);
        
        // If no locked items of that rarity, pick from ANY locked items to ensure no duplicates
        if (pool.length === 0) {
            pool = lockedTrails; 
        }
        
        const wonTrail = pool[Math.floor(Math.random() * pool.length)];

        trailData.unlocked.push(wonTrail.id);
        trailData.cratesOpened++;

        saveTrails();
        renderTrailShop();
        openNeuralCrate(wonTrail, true);
        
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
        return wonTrail;
    } else {
        if (window.triggerShopReject) window.triggerShopReject();
        return null;
    }
}

function openNeuralCrate(wonTrail, isNew) {
    const rarityColor = RARITY_COLORS[wonTrail.rarity] || '#00e5ff';
    const overlay = document.createElement('div');
    overlay.className = 'crate-opening-overlay';
    overlay.innerHTML = `
        <div class="crate-container">
            <div id="neural-crate" class="neural-crate" style="border-color: ${rarityColor}; box-shadow: 0 0 30px ${rarityColor}44"></div>
            <div class="opening-text" style="color: ${rarityColor}">UPLINKING DATA...</div>
            <div id="crate-burst" class="crate-burst"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const crate = document.getElementById('neural-crate');
    const burstContainer = document.getElementById('crate-burst');

    // Custom CSS for crate icon color
    crate.style.setProperty('--rarity-color', rarityColor);

    // 1. Initial Shake
    setTimeout(() => {
        crate.classList.add('crate-shake');
        if (window.AudioFX && window.AudioFX.loadingDrive) window.AudioFX.loadingDrive();
    }, 500);

    // 2. Intense Glow & Rays (Now uses Rarity Color)
    setTimeout(() => {
        for (let i = 0; i < 24; i++) {
            const ray = document.createElement('div');
            ray.className = 'crate-light-ray';
            ray.style.transform = `rotate(${i * 15}deg)`;
            ray.style.height = '0px';
            ray.style.background = rarityColor;
            ray.style.boxShadow = `0 0 15px ${rarityColor}`;
            burstContainer.appendChild(ray);
            
            setTimeout(() => {
                ray.style.transition = 'height 0.8s ease, opacity 0.8s ease';
                ray.style.height = '400px';
                ray.style.opacity = '1';
            }, i * 20);
        }
        crate.style.boxShadow = `0 0 120px ${rarityColor}, inset 0 0 50px ${rarityColor}`;
        crate.style.borderColor = '#fff';
    }, 2000);

    // 3. Explosion & Result
    setTimeout(() => {
        if (window.AudioFX && window.AudioFX.shatter) window.AudioFX.shatter();
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            overlay.remove();
            showSpinResult(wonTrail, isNew);
        }, 400);
    }, 3500);
}

function selectTrail(id) {
    if (trailData.unlocked.includes(id)) {
        trailData.equipped = id;
        saveTrails();
        renderTrailShop();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    }
}

function showSpinResult(trail, isNew) {
    const resultOverlay = document.createElement('div');
    resultOverlay.id = 'spin-result-overlay';
    resultOverlay.className = 'spin-result-container';
    
    const rarityColor = RARITY_COLORS[trail.rarity] || '#fff';

    resultOverlay.innerHTML = `
        <div class="spin-result-card" style="border-color: ${rarityColor}">
            <div class="spin-result-glow" style="background: radial-gradient(circle, ${rarityColor}33 0%, transparent 70%)"></div>
            <div class="spin-label">${isNew ? 'NEW UNLOCK' : 'DUPLICATE'}</div>
            <div class="spin-rarity" style="color: ${rarityColor}">${trail.rarity}</div>
            <div class="spin-name">${trail.name}</div>
            <div class="spin-preview" style="${getTrailPreviewStyle(trail)}"></div>
            <button class="btn-sync" style="margin-top: 20px; width: 100%; border-color: ${rarityColor}; color: ${rarityColor}" onclick="this.parentElement.parentElement.remove()">REDEEM UNIT</button>
        </div>
    `;
    
    document.body.appendChild(resultOverlay);
}

function getTrailPreviewStyle(trail) {
    if (trail.type === 'gradient') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px;`;
    if (trail.type === 'solid') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px;`;
    if (trail.type === 'glow') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px; box-shadow: 0 0 10px ${trail.color};`;
    if (trail.type === 'box') return `background: repeating-linear-gradient(90deg, ${trail.color}, ${trail.color} 10px, transparent 10px, transparent 15px); height: 10px; width: 80%;`;
    if (trail.id === 'legend_rainbow') return `background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet); height: 4px; width: 80%; border-radius: 2px;`;
    return `background: ${trail.color || '#fff'}; height: 4px; width: 80%; border-radius: 2px;`;
}

function renderTrailShop() {
    const shopList = document.getElementById('trail-list');
    if (!shopList) return;

    const currentCost = getCrateCost();
    const allUnlocked = TRAILS.every(t => trailData.unlocked.includes(t.id));

    shopList.innerHTML = `
        <div class="shop-section-title">NEURAL UPLINK</div>
        <div class="spin-area" style="border-color: #00e5ff; background: rgba(0, 229, 255, 0.05); ${allUnlocked ? 'opacity: 0.5;' : ''}">
            <div class="spin-info">
                <span class="spin-cost-label" style="color: #00e5ff; text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);">${allUnlocked ? 'DATABASE COMPLETE' : 'ENCRYPTION CRATE'}</span>
                <span class="spin-price" style="color: #fff;">${allUnlocked ? 'MAXED' : currentCost + ' CR'}</span>
            </div>
            <button class="ach-action-btn collect-btn" 
                    style="border-color: #00e5ff; color: #00e5ff;" 
                    ${allUnlocked ? 'disabled' : ''}
                    onclick="spinForTrail()">${allUnlocked ? 'SOLD OUT' : 'BUY CRATE'}</button>
        </div>
        <div class="trail-grid" id="trail-grid-inner"></div>
    `;

    const grid = document.getElementById('trail-grid-inner');
    TRAILS.forEach(trail => {
        const isUnlocked = trailData.unlocked.includes(trail.id);
        const isEquipped = trailData.equipped === trail.id;
        
        const card = document.createElement('div');
        card.className = `trail-card ${isUnlocked ? '' : 'locked'} ${isEquipped ? 'equipped' : ''}`;
        
        // rarity-based background
        const rarityBG = RARITY_BG_COLORS[trail.rarity] || 'rgba(255,255,255,0.05)';
        card.style.background = isUnlocked ? rarityBG : 'rgba(0,0,0,0.5)';
        card.style.borderColor = isUnlocked ? (RARITY_COLORS[trail.rarity] || 'var(--primary)') : '#333';
        
        card.onclick = () => isUnlocked && selectTrail(trail.id);
        
        const rarityClass = trail.rarity.toLowerCase();
        
        const statusText = isEquipped ? 'EQUIPPED' : (isUnlocked ? 'UNLOCKED' : (trail.exclusive ? 'ACHIEVEMENT' : 'LOCKED'));
        
        card.innerHTML = `
            <div class="trail-rarity-dot ${rarityClass}" style="background: ${RARITY_COLORS[trail.rarity]}"></div>
            <div class="trail-card-name" style="color: ${isUnlocked ? '#fff' : '#666'}">${trail.name}</div>
            <div class="trail-card-preview" style="${getTrailPreviewStyle(trail)}; opacity: ${isUnlocked ? 1 : 0.2}"></div>
            <div class="trail-status" style="color: ${isUnlocked ? (RARITY_COLORS[trail.rarity] || '#aaa') : (trail.exclusive ? '#ff00ff' : '#444')}">${statusText}</div>
        `;
        grid.appendChild(card);
    });
}

function unlockTrail(id) {
    if (!trailData.unlocked.includes(id)) {
        trailData.unlocked.push(id);
        saveTrails();
        if (window.renderTrailShop) window.renderTrailShop();
        return true;
    }
    return false;
}

// Expose APIs
window.initTrails = initTrails;
window.spinForTrail = spinForTrail;
window.selectTrail = selectTrail;
window.getEquippedTrail = getEquippedTrail;
window.renderTrailShop = renderTrailShop;
window.unlockTrail = unlockTrail;
