/**
 * ============================================================================
 * CYBERSTRIKE: TRAIL SYSTEM
 * ============================================================================
 * Handles trail data, equipment, and the MY TRAILS equip panel.
 * Unlocking now happens via the Crate System (crate-system.js).
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
    { id: 'legend_gold', name: 'GOLDEN PROTOCOL', color: 'linear-gradient(to right, #ffd700, #ff8c00)', rarity: 'LEGENDARY', type: 'glow' },
    { id: 'legend_matrix', name: 'SYSTEM BREAKER', color: 'linear-gradient(to right, #00ff41, #008f11)', rarity: 'LEGENDARY', type: 'matrix' },

    // MYTHIC (2%)
    { id: 'mythic_boxes', name: 'NEURAL PULSE', color: 'linear-gradient(to right, #ff00ff, #7b1fa2)', rarity: 'MYTHIC', type: 'gradient_box' },
    { id: 'mythic_glitch', name: 'QUANTUM SHIFT', color: 'linear-gradient(to right, #ff0055, #00e5ff)', rarity: 'MYTHIC', type: 'gradient_glitch' },
    { id: 'mythic_void', name: 'VOID NEBULA', color: 'linear-gradient(to right, #aa00ff, #0a0a1a)', rarity: 'MYTHIC', type: 'gradient', exclusive: true } 
];

const RARITY_COLORS = {
    'COMMON': '#e0e0e0',
    'UNCOMMON': '#00e5ff',
    'EPIC': '#a335ee',
    'LEGENDARY': '#ffff00',
    'MYTHIC': '#ff0000'
};

const RARITY_BG_COLORS = {
    'COMMON': 'rgba(224, 224, 224, 0.05)',
    'UNCOMMON': 'rgba(0, 229, 255, 0.1)',
    'EPIC': 'rgba(163, 53, 238, 0.15)',
    'LEGENDARY': 'rgba(255, 255, 0, 0.15)',
    'MYTHIC': 'rgba(255, 0, 0, 0.2)'
};

let trailData = {
    unlocked: ['standard_white'],
    equipped: 'standard_white',
    cratesOpened: 0
};

function initTrails() {
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
}

function saveTrails() {
    localStorage.setItem(TRAIL_KEY, JSON.stringify(trailData));
}

function getEquippedTrail() {
    // Check crate trails first, then original trails
    if (window.getEquippedCrateTrail) {
        const crateTrail = window.getEquippedCrateTrail();
        if (crateTrail) return crateTrail;
    }
    return TRAILS.find(t => t.id === trailData.equipped) || TRAILS[0];
}

function selectTrail(id) {
    // Check if trail exists in original TRAILS
    const originalTrail = TRAILS.find(t => t.id === id);
    if (originalTrail && trailData.unlocked.includes(id)) {
        trailData.equipped = id;
        // Clear crate equipped trail so this one takes priority
        if (window.clearCrateEquipped) window.clearCrateEquipped();
        saveTrails();
        if (window.renderMyTrails) window.renderMyTrails();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
        return;
    }
    // Check crate system trails
    if (window.equipCrateTrail) {
        window.equipCrateTrail(id);
        trailData.equipped = ''; // Clear original equipped
        saveTrails();
        if (window.renderMyTrails) window.renderMyTrails();
    }
}

function getTrailPreviewStyle(trail) {
    if (trail.type === 'gradient') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px;`;
    if (trail.type === 'solid') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px;`;
    if (trail.type === 'glow') return `background: ${trail.color}; height: 4px; width: 80%; border-radius: 2px; box-shadow: 0 0 10px ${trail.color};`;
    if (trail.type === 'box') return `background: repeating-linear-gradient(90deg, ${trail.color}, ${trail.color} 10px, transparent 10px, transparent 15px); height: 10px; width: 80%;`;
    if (trail.id === 'legend_rainbow' || (trail.type === 'special' && trail.color === 'rainbow')) return `background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet); height: 4px; width: 80%; border-radius: 2px;`;
    if (trail.type === 'glitch') return `background: repeating-linear-gradient(90deg, ${trail.color}, ${trail.color} 8px, transparent 8px, transparent 12px); height: 6px; width: 80%;`;
    return `background: ${trail.color || '#fff'}; height: 4px; width: 80%; border-radius: 2px;`;
}

/**
 * MY TRAILS — equip-only panel showing all unlocked trails 
 * from both the original trail system and crate system.
 */
function renderMyTrails() {
    const shopList = document.getElementById('trail-list');
    if (!shopList) return;

    // Gather all unlocked trails from both systems
    const allTrails = [];

    // Original trails
    TRAILS.forEach(trail => {
        if (trailData.unlocked.includes(trail.id)) {
            allTrails.push({ ...trail, source: 'original' });
        }
    });

    // Crate system trails
    if (window.getCrateUnlockedTrails) {
        const crateTrails = window.getCrateUnlockedTrails();
        crateTrails.forEach(trail => {
            // Avoid duplicates (if trail exists in both systems)
            if (!allTrails.find(t => t.id === trail.id)) {
                allTrails.push({ ...trail, source: 'crate' });
            }
        });
    }

    // Determine currently equipped trail
    const equippedId = getCurrentEquippedId();

    const totalUnlocked = allTrails.length;

    shopList.innerHTML = `
        <div class="shop-section-title">EQUIPPED TRAIL</div>
        ${renderEquippedTrailBanner(equippedId, allTrails)}
        <div class="shop-section-title" style="margin-top: 15px;">YOUR COLLECTION (${totalUnlocked})</div>
        <div class="trail-grid" id="my-trail-grid"></div>
    `;

    const grid = document.getElementById('my-trail-grid');
    if (!grid) return;

    if (allTrails.length === 0) {
        grid.innerHTML = `<div style="color: #555; text-align: center; padding: 30px; letter-spacing: 2px; font-size: 12px;">NO TRAILS UNLOCKED YET<br><span style="font-size: 10px; color: #444;">Open Neural Caches to discover trails</span></div>`;
        return;
    }

    allTrails.forEach(trail => {
        const isEquipped = trail.id === equippedId;
        const rarityColor = getRarityColor(trail.rarity);
        const rarityBG = isEquipped
            ? `rgba(${hexToRgb(rarityColor)}, 0.12)`
            : `rgba(${hexToRgb(rarityColor)}, 0.05)`;

        const card = document.createElement('div');
        card.className = `trail-card ${isEquipped ? 'equipped' : ''}`;
        card.style.background = rarityBG;
        card.style.borderColor = isEquipped ? rarityColor : `${rarityColor}44`;
        card.onclick = () => selectTrail(trail.id);

        const statusText = isEquipped ? 'EQUIPPED' : 'TAP TO EQUIP';

        card.innerHTML = `
            <div class="trail-rarity-dot" style="background: ${rarityColor}; box-shadow: 0 0 6px ${rarityColor};"></div>
            <div class="trail-card-name" style="color: #fff;">${trail.name}</div>
            <div class="trail-card-preview" style="${getTrailPreviewStyle(trail)};"></div>
            <div class="trail-status" style="color: ${isEquipped ? '#000' : rarityColor}; ${isEquipped ? `background: ${rarityColor};` : ''}">${statusText}</div>
        `;
        grid.appendChild(card);
    });
}

function renderEquippedTrailBanner(equippedId, allTrails) {
    const equipped = allTrails.find(t => t.id === equippedId);
    if (!equipped) {
        return `<div style="color: #555; padding: 15px; border: 1px dashed #333; border-radius: 8px; text-align: center; letter-spacing: 2px; font-size: 11px;">NO TRAIL EQUIPPED</div>`;
    }
    const rColor = getRarityColor(equipped.rarity);
    return `
        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(${hexToRgb(rColor)}, 0.08); border: 1px solid ${rColor}44; border-radius: 8px;">
            <div style="${getTrailPreviewStyle(equipped)} width: 60px; flex-shrink: 0;"></div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 900; color: #fff; letter-spacing: 1px; font-size: 14px;">${equipped.name}</div>
                <div style="font-size: 10px; color: ${rColor}; font-weight: 900; letter-spacing: 2px; margin-top: 3px;">${equipped.rarity}</div>
            </div>
            <div style="color: ${rColor}; font-size: 10px; font-weight: 900; letter-spacing: 1px; background: ${rColor}22; padding: 4px 10px; border-radius: 10px;">ACTIVE</div>
        </div>
    `;
}

function getCurrentEquippedId() {
    // Check crate system first
    if (window.getEquippedCrateTrail) {
        const crateTrail = window.getEquippedCrateTrail();
        if (crateTrail) return crateTrail.id;
    }
    return trailData.equipped || 'standard_white';
}

function getRarityColor(rarity) {
    const colors = {
        'COMMON': '#ffffff',
        'UNCOMMON': '#00e5ff',
        'RARE': '#9d00ff',
        'EPIC': '#ff0055',
        'LEGENDARY': '#ffd700',
        'MYTHIC': '#ff0000',
        'MYTHICAL': '#ff0033'
    };
    return colors[rarity] || RARITY_COLORS[rarity] || '#00e5ff';
}

function hexToRgb(hex) {
    // Handle non-hex colors
    if (!hex || !hex.startsWith('#')) return '0, 229, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 229, 255';
}

function unlockTrail(id) {
    if (!trailData.unlocked.includes(id)) {
        trailData.unlocked.push(id);
        saveTrails();
        if (window.renderMyTrails) window.renderMyTrails();
        return true;
    }
    return false;
}

// Expose APIs
window.initTrails = initTrails;
window.selectTrail = selectTrail;
window.getEquippedTrail = getEquippedTrail;
window.renderMyTrails = renderMyTrails;
window.renderTrailShop = renderMyTrails; // backward compat
window.unlockTrail = unlockTrail;

