/**
 * ============================================================================
 * CYBERSTRIKE: CRATE SYSTEM
 * ============================================================================
 * Physical Loot Crate opening with animated reveal sequence.
 * - Crate inventory management
 * - Crate purchase (NEURAL CACHE) from shop
 * - Animated crate opening (shake → burst → reveal)
 * - Weighted random reward generation
 * - Duplicate trail protection with credit conversion
 * - Trail unlock & equipment system
 * - Reward card UI
 */

const CRATE_KEY = 'cyberstrike_crates';
const CRATE_TRAIL_KEY = 'cyberstrike_crate_trails';
const CRATE_PRICE = 600;

// ─── Trail Reward Pool ───────────────────────────────────────────────
const TRAIL_POOL = [
    // COMMON (55%)
    { id: 'plasma_stream', name: 'PLASMA STREAM', rarity: 'COMMON', color: '#e0e0e0', type: 'solid' },
    { id: 'ember_trail', name: 'EMBER TRAIL', rarity: 'COMMON', color: '#cccccc', type: 'solid' },
    { id: 'static_pulse', name: 'STATIC PULSE', rarity: 'COMMON', color: '#aaaaaa', type: 'solid' },
    { id: 'neon_wire', name: 'NEON WIRE', rarity: 'COMMON', color: '#b0b0b0', type: 'solid' },
    { id: 'core_dust', name: 'CORE DUST', rarity: 'COMMON', color: '#ffffff', type: 'solid' },

    // RARE (25%)
    { id: 'ion_wake', name: 'ION WAKE', rarity: 'RARE', color: '#00e5ff', type: 'solid' },
    { id: 'neon_comet', name: 'NEON COMET', rarity: 'RARE', color: '#00ffff', type: 'gradient' },
    { id: 'azure_streak', name: 'AZURE STREAK', rarity: 'RARE', color: 'linear-gradient(to right, #00d2ff, #0083b0)', type: 'gradient' },
    { id: 'crimson_flux', name: 'CRIMSON FLUX', rarity: 'RARE', color: '#0099ff', type: 'solid' },

    // EPIC (12%)
    { id: 'void_ribbon', name: 'VOID RIBBON', rarity: 'EPIC', color: 'linear-gradient(to right, #8e2de2, #ff0055)', type: 'gradient' },
    { id: 'solar_flare', name: 'SOLAR FLARE', rarity: 'EPIC', color: 'linear-gradient(to right, #f83600, #f9d423)', type: 'gradient' },
    { id: 'glacier_edge', name: 'GLACIER EDGE', rarity: 'EPIC', color: 'linear-gradient(to right, #00d2ff, #928dab)', type: 'gradient' },

    // LEGENDARY (6%)
    { id: 'quantum_blaze', name: 'QUANTUM BLAZE', rarity: 'LEGENDARY', color: '#ffff00', type: 'glow' },
    { id: 'infinity_loop', name: 'INFINITY LOOP', rarity: 'LEGENDARY', color: 'rainbow', type: 'special' },

    // MYTHICAL (2%)
    { id: 'abyssal_vortex', name: 'ABYSSAL VORTEX', rarity: 'MYTHICAL', color: 'linear-gradient(to right, #ff0000, #990000, #ff3333)', type: 'gradient' },
    { id: 'neural_singularity', name: 'NEURAL SINGULARITY', rarity: 'MYTHICAL', color: '#ff0000', type: 'glitch' }
];

// ─── Rarity Configuration ────────────────────────────────────────────
const CRATE_RARITY = {
    COMMON:    { weight: 55, color: '#e0e0e0',  dupCredits: 200 },
    RARE:      { weight: 25, color: '#00e5ff',  dupCredits: 400 },
    EPIC:      { weight: 12, color: '#a335ee',  dupCredits: 800 },
    LEGENDARY: { weight: 6,  color: '#ffff00',  dupCredits: 1500 },
    MYTHICAL:  { weight: 2,  color: '#ff0000',  dupCredits: 3000 }
};

// ─── State ───────────────────────────────────────────────────────────
let crateCount = 0;
let crateTrailData = {
    unlocked: [],
    equipped: null
};
let _crateOpening = false;

// ─── Init / Save / Load ──────────────────────────────────────────────
function initCrateSystem() {
    const savedCount = localStorage.getItem(CRATE_KEY);
    if (savedCount !== null) {
        try { crateCount = parseInt(savedCount) || 0; } catch (e) { crateCount = 0; }
    }
    const savedTrails = localStorage.getItem(CRATE_TRAIL_KEY);
    if (savedTrails) {
        try {
            const parsed = JSON.parse(savedTrails);
            crateTrailData.unlocked = parsed.unlocked || [];
            crateTrailData.equipped = parsed.equipped || null;
        } catch (e) { console.error('Failed to load crate trail data:', e); }
    }
}

function saveCrateData() {
    localStorage.setItem(CRATE_KEY, crateCount.toString());
    localStorage.setItem(CRATE_TRAIL_KEY, JSON.stringify(crateTrailData));
}

// ─── Buy Crate (NEURAL CACHE) ───────────────────────────────────────
function buyCrate() {
    if (window.deductNeuralCredits && window.deductNeuralCredits(CRATE_PRICE)) {
        crateCount++;
        saveCrateData();
        if (window.renderCrateShopTab) window.renderCrateShopTab();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
        // Flash purchase success
        const btn = document.getElementById('buy-crate-btn');
        if (btn) {
            btn.textContent = 'ACQUIRED';
            btn.style.background = 'rgba(0, 229, 255, 0.3)';
            setTimeout(() => {
                btn.textContent = `${CRATE_PRICE} CR`;
                btn.style.background = '';
            }, 600);
        }
    } else {
        if (window.triggerShopReject) window.triggerShopReject();
    }
}

// ─── Weighted Random Selection ───────────────────────────────────────
function generateTrailReward() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let chosenRarity = 'COMMON';

    for (const [rarity, config] of Object.entries(CRATE_RARITY)) {
        cumulative += config.weight;
        if (rand < cumulative) {
            chosenRarity = rarity;
            break;
        }
    }

    // Get pool for this rarity
    let pool = TRAIL_POOL.filter(t => t.rarity === chosenRarity);

    // If empty, fallback to full pool
    if (pool.length === 0) pool = TRAIL_POOL;

    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Open Crate ──────────────────────────────────────────────────────
function openCrate() {
    if (crateCount <= 0 || _crateOpening) return;

    _crateOpening = true;
    crateCount--;
    saveCrateData();
    if (window.renderCrateShopTab) window.renderCrateShopTab();

    // Generate reward
    const reward = generateTrailReward();
    const isDuplicate = crateTrailData.unlocked.includes(reward.id);

    // Show crate opening screen
    showCrateOpeningScreen(reward, isDuplicate);
}

// ─── Crate Opening Screen ────────────────────────────────────────────
function showCrateOpeningScreen(reward, isDuplicate) {
    const rarityColor = CRATE_RARITY[reward.rarity]?.color || '#00e5ff';

    const overlay = document.createElement('div');
    overlay.id = 'crate-open-overlay';
    overlay.className = 'crate-overlay-fullscreen';

    overlay.innerHTML = `
        <div class="crate-scene">
            <!-- Particle Field -->
            <div class="crate-particle-field" id="crate-particles"></div>

            <!-- 3D Crate -->
            <div class="crate-3d-wrapper" id="crate-3d-wrapper">
                <div class="crate-ground-shadow"></div>
                <div class="crate-3d" id="crate-3d">
                    <div class="crate-body">
                        <div class="crate-face crate-front"></div>
                        <div class="crate-face crate-back"></div>
                        <div class="crate-face crate-left"></div>
                        <div class="crate-face crate-right"></div>
                        <div class="crate-face crate-bottom"></div>
                        <!-- Neon seams -->
                        <div class="crate-seam crate-seam-h"></div>
                        <div class="crate-seam crate-seam-v"></div>
                        <!-- Inner glow and effects inside body -->
                        <div class="crate-inner-glow" id="crate-inner-glow"></div>
                        <div class="crate-energy-burst" id="crate-energy-burst"></div>
                    </div>
                    <div class="crate-lid" id="crate-lid">
                        <div class="crate-face crate-lid-top"></div>
                        <div class="crate-seam crate-seam-h2"></div>
                    </div>
                </div>
            </div>

            <!-- Tap prompt -->
            <div class="crate-tap-prompt" id="crate-tap-prompt">TAP TO OPEN</div>

            <!-- Glitch overlay -->
            <div class="crate-glitch-overlay" id="crate-glitch"></div>

            <!-- Light burst -->
            <div class="crate-light-explosion" id="crate-light-explosion"></div>

            <!-- Reward reveal -->
            <div class="crate-reward-reveal" id="crate-reward-reveal" style="display:none;"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Idle animation
    const crate3d = document.getElementById('crate-3d');
    crate3d.classList.add('crate-anim-idle');

    // Spawn ambient particles
    spawnCrateParticles();

    // Wait for tap
    const tapPrompt = document.getElementById('crate-tap-prompt');
    const wrapper = document.getElementById('crate-3d-wrapper');

    const tapHandler = () => {
        wrapper.removeEventListener('click', tapHandler);
        tapPrompt.removeEventListener('click', tapHandler);
        tapPrompt.style.display = 'none';
        beginCrateSequence(reward, isDuplicate, rarityColor);
    };

    wrapper.addEventListener('click', tapHandler);
    tapPrompt.addEventListener('click', tapHandler);
}

// ─── Crate Opening Sequence ──────────────────────────────────────────
function beginCrateSequence(reward, isDuplicate, rarityColor) {
    const crate3d = document.getElementById('crate-3d');
    const innerGlow = document.getElementById('crate-inner-glow');
    const glitch = document.getElementById('crate-glitch');
    const energyBurst = document.getElementById('crate-energy-burst');
    const lightExplosion = document.getElementById('crate-light-explosion');
    const rewardReveal = document.getElementById('crate-reward-reveal');
    const lid = document.getElementById('crate-lid');
    const frontFace = document.querySelector('.crate-face.crate-front');

    // Phase 1: Shake (0 - 1.5s)
    crate3d.classList.remove('crate-anim-idle');
    crate3d.classList.add('crate-anim-shake');
    if (window.AudioFX && window.AudioFX.loadingDrive) window.AudioFX.loadingDrive();
    if (window.AudioFX && window.AudioFX.crateOpen) window.AudioFX.crateOpen();
    
    // Energy leaks start building up inside
    innerGlow.style.opacity = '0.5';
    innerGlow.style.background = rarityColor;
    
    // Phase 2: Open Lid + Energy Burst (1.5s)
    setTimeout(() => {
        crate3d.classList.remove('crate-anim-shake');
        if (window.AudioFX && window.AudioFX.shatter) window.AudioFX.shatter();

        // Rotate lid open backward on hinge
        lid.classList.add('open');
        innerGlow.style.opacity = '1';

        // Full screen flash (Expanding Sphere)
        lightExplosion.style.display = 'block';
        lightExplosion.style.background = `radial-gradient(circle at center, #ffffff 0%, ${rarityColor} 40%, transparent 80%)`;
        lightExplosion.classList.add('crate-light-burst-anim');

        // Upward light beam (Volumetric) from INSIDE crate
        const beam = document.createElement('div');
        beam.className = 'crate-volumetric-beam';
        beam.style.background = `linear-gradient(to top, #ffffff 0%, ${rarityColor} 50%, transparent 100%)`;
        energyBurst.appendChild(beam);

        // Spawn burst rays from inside matching cyan glow
        for (let i = 0; i < 24; i++) {
            const ray = document.createElement('div');
            ray.className = 'crate-burst-ray';
            ray.style.setProperty('--rot', `${i * 15}deg`);
            ray.style.background = `linear-gradient(to top, #fff, transparent)`;
            ray.style.boxShadow = `0 0 20px #fff`;
            ray.style.animationDelay = `${i * 0.01}s`;
            energyBurst.appendChild(ray);
        }

        // Glitch flash
        glitch.classList.add('crate-glitch-active');
    }, 1500);

    // Phase 3: Reward hologram rises from inside the chest (2.3s)
    setTimeout(() => {
        // We push the crate slightly down and back to make visual room for the UI
        const crateWrapper = document.getElementById('crate-3d-wrapper');
        crateWrapper.style.transition = 'transform 0.8s ease, filter 0.8s ease';
        crateWrapper.style.transform = 'translateY(120px) translateZ(-150px) scale(0.85)';
        crateWrapper.style.filter = 'brightness(0.6)';

        // Clear energy burst
        energyBurst.innerHTML = '';
        
        // Show reward card rising out
        showRewardCard(reward, isDuplicate, rarityColor, rewardReveal);
    }, 2300);
}

// ─── Reward Card ─────────────────────────────────────────────────────
function showRewardCard(reward, isDuplicate, rarityColor, container) {
    const dupCredits = CRATE_RARITY[reward.rarity]?.dupCredits || 200;
    let trailPreviewStyle = getCrateTrailPreview(reward);

    let dupMessage = '';
    if (isDuplicate) {
        dupMessage = `<div class="crate-dup-msg">DUPLICATE TRAIL CONVERTED → +${dupCredits} NEURAL CREDITS</div>`;
        // Give credits for duplicate
        if (window.addNeuralCredits) window.addNeuralCredits(dupCredits);
    } else {
        // Unlock the trail
        crateTrailData.unlocked.push(reward.id);
        saveCrateData();
        // Also add to the main trail system if it exists there
        if (window.unlockTrail) window.unlockTrail(reward.id);
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <div class="crate-reward-card" style="border-color: ${rarityColor}; box-shadow: 0 0 60px ${rarityColor}44, inset 0 0 30px rgba(0,0,0,0.8);">
            <div class="crate-reward-glow" style="background: radial-gradient(circle, ${rarityColor}33 0%, transparent 70%);"></div>
            <div class="crate-reward-scanline"></div>

            <div class="crate-reward-header">${isDuplicate ? '⚠ DUPLICATE DETECTED' : '◈ TRAIL UNLOCKED'}</div>

            <div class="crate-reward-name">${reward.name}</div>

            <div class="crate-reward-rarity" style="color: ${rarityColor}; text-shadow: 0 0 20px ${rarityColor};">
                RARITY: ${reward.rarity}
            </div>

            <div class="crate-reward-preview-box">
                <div class="crate-reward-trail-preview" style="${trailPreviewStyle}"></div>
            </div>

            ${dupMessage}

            <div class="crate-reward-buttons">
                ${!isDuplicate ? `<button class="crate-btn crate-btn-equip" style="border-color: ${rarityColor}; color: ${rarityColor};" onclick="equipCrateTrail('${reward.id}'); closeCrateOverlay();">EQUIP</button>` : ''}
                <button class="crate-btn crate-btn-collect" onclick="closeCrateOverlay();">COLLECT</button>
            </div>
        </div>
    `;

    // Animate in
    requestAnimationFrame(() => {
        const card = container.querySelector('.crate-reward-card');
        if (card) card.classList.add('crate-card-reveal');
    });
}

// ─── Trail Preview Style ─────────────────────────────────────────────
function getCrateTrailPreview(trail) {
    if (trail.type === 'gradient') return `background: ${trail.color}; height: 6px; width: 90%; border-radius: 3px;`;
    if (trail.type === 'glow') return `background: ${trail.color}; height: 6px; width: 90%; border-radius: 3px; box-shadow: 0 0 15px ${trail.color};`;
    if (trail.type === 'glitch') return `background: repeating-linear-gradient(90deg, ${trail.color}, ${trail.color} 8px, transparent 8px, transparent 12px); height: 8px; width: 90%;`;
    if (trail.type === 'special' && trail.color === 'rainbow') return `background: linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet); height: 6px; width: 90%; border-radius: 3px;`;
    return `background: ${trail.color || '#fff'}; height: 6px; width: 90%; border-radius: 3px;`;
}

// ─── Equip Trail ─────────────────────────────────────────────────────
function equipCrateTrail(trailId) {
    if (crateTrailData.unlocked.includes(trailId)) {
        crateTrailData.equipped = trailId;
        saveCrateData();
        // Refresh UIs
        if (window.renderCrateShopTab) window.renderCrateShopTab();
        if (window.renderMyTrails) window.renderMyTrails();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    }
}

// ─── Close Overlay ───────────────────────────────────────────────────
function closeCrateOverlay() {
    _crateOpening = false;
    const overlay = document.getElementById('crate-open-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
    }
    if (window.renderCrateShopTab) window.renderCrateShopTab();
}

// ─── Ambient Particles ──────────────────────────────────────────────
function spawnCrateParticles() {
    const container = document.getElementById('crate-particles');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'crate-ambient-particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.animationDuration = `${2 + Math.random() * 4}s`;
        p.style.animationDelay = `${Math.random() * 3}s`;
        p.style.width = p.style.height = `${2 + Math.random() * 3}px`;
        container.appendChild(p);
    }
}

// ─── Render Crate Tab in Shop ────────────────────────────────────────
function renderCrateShopTab() {
    const container = document.getElementById('crate-list');
    if (!container) return;

    const unlockedCount = crateTrailData.unlocked.length;
    const totalCount = TRAIL_POOL.length;

    container.innerHTML = `
        <!-- Neural Cache Purchase -->
        <div class="shop-section-title">NEURAL CACHE</div>
        <div class="crate-purchase-area">
            <div class="crate-purchase-visual">
                <div class="crate-mini-3d">
                    <div class="crate-mini-face crate-mini-front"></div>
                    <div class="crate-mini-face crate-mini-back"></div>
                    <div class="crate-mini-face crate-mini-left"></div>
                    <div class="crate-mini-face crate-mini-right"></div>
                    <div class="crate-mini-face crate-mini-top"></div>
                    <div class="crate-mini-face crate-mini-bottom"></div>
                    <div class="crate-mini-seam"></div>
                </div>
            </div>
            <div class="crate-purchase-info">
                <div class="crate-purchase-name">NEURAL CACHE</div>
                <div class="crate-purchase-desc">Contains a random Neural Trail cosmetic. Higher tier trails are rarer.</div>
                <div class="crate-purchase-stock">
                    IN STOCK: <span class="crate-count-badge">${crateCount}</span>
                </div>
            </div>
            <div class="crate-purchase-actions">
                <button id="buy-crate-btn" class="ach-action-btn collect-btn crate-buy-btn" onclick="buyCrate()">${CRATE_PRICE} CR</button>
                <button class="ach-action-btn collect-btn crate-open-btn" 
                    ${crateCount <= 0 ? 'disabled style="opacity:0.4;"' : ''}
                    onclick="openCrate()">
                    OPEN (${crateCount})
                </button>
            </div>
        </div>

        <!-- Drop Rates -->
        <div class="shop-section-title" style="margin-top: 20px;">DROP RATES</div>
        <div class="crate-drop-rates">
            ${Object.entries(CRATE_RARITY).map(([rarity, cfg]) => `
                <div class="crate-rate-row">
                    <span class="crate-rate-dot" style="background: ${cfg.color}; box-shadow: 0 0 8px ${cfg.color};"></span>
                    <span class="crate-rate-name" style="color: ${cfg.color};">${rarity}</span>
                    <span class="crate-rate-pct">${cfg.weight}%</span>
                </div>
            `).join('')}
        </div>

        <!-- Trail Selection -->
        <div class="shop-section-title" style="margin-top: 20px;">TRAIL ARCHIVE (${unlockedCount}/${totalCount})</div>
        <div class="crate-trail-grid">
            ${TRAIL_POOL.map(trail => {
                const isUnlocked = crateTrailData.unlocked.includes(trail.id);
                const isEquipped = crateTrailData.equipped === trail.id;
                const rColor = CRATE_RARITY[trail.rarity]?.color || '#00e5ff';
                const statusText = isEquipped ? 'EQUIPPED' : (isUnlocked ? 'SELECT' : '🔒 LOCKED');
                return `
                    <div class="crate-trail-card ${isUnlocked ? 'crate-unlocked' : 'crate-locked'} ${isEquipped ? 'crate-equipped' : ''}"
                         style="border-color: ${isUnlocked ? rColor : '#222'};"
                         ${isUnlocked ? `onclick="equipCrateTrail('${trail.id}')"` : ''}>
                        <div class="crate-trail-rarity-pip" style="background: ${rColor}; box-shadow: 0 0 6px ${rColor};"></div>
                        <div class="crate-trail-card-name" style="color: ${isUnlocked ? '#fff' : '#555'};">${trail.name}</div>
                        <div class="crate-trail-preview-bar" style="${getCrateTrailPreview(trail)} opacity: ${isUnlocked ? 1 : 0.2};"></div>
                        <div class="crate-trail-card-rarity" style="color: ${isUnlocked ? rColor : '#444'};">${trail.rarity}</div>
                        <div class="crate-trail-card-status" style="color: ${isEquipped ? '#000' : (isUnlocked ? rColor : '#444')}; ${isEquipped ? `background: ${rColor};` : ''}">${statusText}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ─── Get equipped crate trail for rendering in-game ──────────────────
function getEquippedCrateTrail() {
    if (!crateTrailData.equipped) return null;
    return TRAIL_POOL.find(t => t.id === crateTrailData.equipped) || null;
}

// ─── Get all unlocked crate trails (for My Trails panel) ─────────────
function getCrateUnlockedTrails() {
    return TRAIL_POOL.filter(t => crateTrailData.unlocked.includes(t.id));
}

// ─── Clear crate equipped (when player equips an original trail) ─────
function clearCrateEquipped() {
    crateTrailData.equipped = null;
    saveCrateData();
}

// ─── Expose APIs ─────────────────────────────────────────────────────
window.initCrateSystem = initCrateSystem;
window.buyCrate = buyCrate;
window.openCrate = openCrate;
window.generateTrailReward = generateTrailReward;
window.equipCrateTrail = equipCrateTrail;
window.closeCrateOverlay = closeCrateOverlay;
window.renderCrateShopTab = renderCrateShopTab;
window.getEquippedCrateTrail = getEquippedCrateTrail;
window.getCrateUnlockedTrails = getCrateUnlockedTrails;
window.clearCrateEquipped = clearCrateEquipped;

