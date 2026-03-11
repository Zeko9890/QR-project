/**
 * ============================================================================
 * CYBERSTRIKE: SHOP SYSTEM
 * ============================================================================
 * Handles purchasing powerup upgrades and one-time startup boosts.
 */

const SHOP_KEY = 'cyberstrike_shop_data';

// Default Shop State
let shopData = {
    upgrades: {
        rapidFire: { name: "STRIKE OVERLOAD", desc: "Increases rapid fire duration.", level: 1, maxLevel: 5, basePrice: 200, priceMult: 1.5, baseDuration: 4.0, durChange: 1.0, icon: "🔥" },
        speedBoost: { name: "OVERDRIVE SPEED", desc: "Increases boost duration.", level: 1, maxLevel: 5, basePrice: 200, priceMult: 1.5, baseDuration: 4.0, durChange: 1.0, icon: "⚡" },
        shield: { name: "NEGATION FIELD", desc: "Increases shield duration.", level: 1, maxLevel: 5, basePrice: 300, priceMult: 1.6, baseDuration: 5.0, durChange: 1.25, icon: "🛡" }
    },
    consumables: {
        headStart: { name: "ADVANCED DEPLOY", desc: "Start run at 500m instantly.", owned: 0, price: 500, icon: "🚀" },
        aegisArmor: { name: "AEGIS PLATING", desc: "Start next run with a free hit shield.", owned: 0, price: 300, icon: "🛡" }
    }
};

function initShop() {
    const saved = localStorage.getItem(SHOP_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge upgrades to retain defaults for new properties if needed
            for (let k in parsed.upgrades) if (shopData.upgrades[k]) shopData.upgrades[k].level = parsed.upgrades[k].level;
            for (let k in parsed.consumables) if (shopData.consumables[k]) shopData.consumables[k].owned = parsed.consumables[k].owned;
        } catch (e) {
            console.error("Failed to load shop data", e);
        }
    }
}

function saveShop() {
    localStorage.setItem(SHOP_KEY, JSON.stringify(shopData));
}

function getUpgradePrice(key) {
    const upg = shopData.upgrades[key];
    if (upg.level >= upg.maxLevel) return "MAX";
    return Math.floor(upg.basePrice * Math.pow(upg.priceMult, upg.level - 1));
}

function buyUpgrade(key) {
    const upg = shopData.upgrades[key];
    if (!upg || upg.level >= upg.maxLevel) return;

    const cost = getUpgradePrice(key);
    if (window.deductNeuralCredits && window.deductNeuralCredits(cost)) {
        upg.level++;
        saveShop();
        renderShopPanel();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    } else {
        triggerShopReject();
    }
}

function buyConsumable(key) {
    const cons = shopData.consumables[key];
    if (!cons) return;

    if (window.deductNeuralCredits && window.deductNeuralCredits(cons.price)) {
        cons.owned++;
        saveShop();
        renderShopPanel();
        if (window.AudioFX && window.AudioFX.pickup) window.AudioFX.pickup();
    } else {
        triggerShopReject();
    }
}

function triggerShopReject() {
    // Red pulse on wallet
    const wContainer = document.getElementById('global-wallet');
    if (wContainer) {
        wContainer.classList.add('wallet-reject');
        setTimeout(() => wContainer.classList.remove('wallet-reject'), 300);
    }
    // High pitched buzz
    if (window.AudioFX && window.AudioFX.hit) window.AudioFX.hit(); // Using hit as an error sound for now
}

// --- Getter APIs for game.js ---
function getUpgradeDuration(key) {
    const upg = shopData.upgrades[key];
    return upg ? upg.baseDuration + ((upg.level - 1) * upg.durChange) : 4.0;
}

function getUpgradeMaxDuration(key) {
    const upg = shopData.upgrades[key];
    return upg ? upg.baseDuration + ((upg.maxLevel - 1) * upg.durChange) : 4.0;
}

function consumeItem(key) {
    if (shopData.consumables[key] && shopData.consumables[key].owned > 0) {
        shopData.consumables[key].owned--;
        saveShop();
        return true;
    }
    return false;
}

function getOwnedConsumables() {
    let owned = [];
    for (let key in shopData.consumables) {
        if (shopData.consumables[key].owned > 0) {
            let c = shopData.consumables[key];
            owned.push({ key: key, name: c.name, desc: c.desc, owned: c.owned, icon: c.icon });
        }
    }
    return owned;
}

// --- UI Rendering ---
function renderShopPanel() {
    const listEl = document.getElementById('shop-list');
    if (!listEl) return;

    listEl.innerHTML = `
        <div class="shop-section-title">SYSTEM UPGRADES</div>
    `;

    // Render Upgrades
    for (let key in shopData.upgrades) {
        const u = shopData.upgrades[key];
        const cost = getUpgradePrice(key);
        const costStr = cost === "MAX" ? "MAX LVL" : `${cost} CR`;
        const btnClass = cost === "MAX" ? 'claimed-btn' : 'collect-btn';
        const progressPct = ((u.level - 1) / (u.maxLevel - 1)) * 100;

        const item = document.createElement('div');
        item.className = 'ach-card shop-card' + (u.level === u.maxLevel ? ' completed' : '');
        item.innerHTML = `
            <div class="ach-icon">${u.icon}</div>
            <div class="ach-body">
                <div class="ach-title-bar">
                    <span class="ach-card-title">${u.name} (LVL ${u.level})</span>
                </div>
                <div class="ach-card-desc">${u.desc}</div>
                <div class="ach-progress-container shop-progress">
                    <div class="ach-progress-bar">
                        <div class="ach-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>
            </div>
            <div class="ach-action-area">
                <button class="ach-action-btn ${btnClass}" ${cost === "MAX" ? 'disabled' : `onclick="buyUpgrade('${key}')"`}>
                    ${costStr}
                </button>
            </div>
        `;
        listEl.appendChild(item);
    }

    const consTitle = document.createElement('div');
    consTitle.className = 'shop-section-title';
    consTitle.style.marginTop = '15px';
    consTitle.innerText = "TACTICAL CONSUMABLES";
    listEl.appendChild(consTitle);

    // Render Consumables
    for (let key in shopData.consumables) {
        const c = shopData.consumables[key];
        const item = document.createElement('div');
        item.className = 'ach-card shop-card consumables-card';
        item.innerHTML = `
            <div class="ach-icon">${c.icon}</div>
            <div class="ach-body">
                <div class="ach-title-bar">
                    <span class="ach-card-title">${c.name}</span>
                    <span class="cons-owned">OWNED: ${c.owned}</span>
                </div>
                <div class="ach-card-desc">${c.desc}</div>
            </div>
            <div class="ach-action-area">
                <button class="ach-action-btn collect-btn" onclick="buyConsumable('${key}')">
                    ${c.price} CR
                </button>
            </div>
        `;
        listEl.appendChild(item);
    }
}

// --- Tab Switching Logic ---
function switchShopTab(tab) {
    const shopList = document.getElementById('shop-list');
    const trailList = document.getElementById('trail-list');
    const tabUpg = document.getElementById('tab-upgrades');
    const tabTrail = document.getElementById('tab-trails');

    if (tab === 'upgrades') {
        shopList.classList.remove('hidden');
        trailList.classList.add('hidden');
        tabUpg.classList.add('active');
        tabTrail.classList.remove('active');
        renderShopPanel();
    } else {
        shopList.classList.add('hidden');
        trailList.classList.remove('hidden');
        tabUpg.classList.remove('active');
        tabTrail.classList.add('active');
        if (window.renderTrailShop) window.renderTrailShop();
    }
}

// Update initialization to include trails
const originalInitShop = initShop;
initShop = function () {
    originalInitShop();
    if (window.initTrails) window.initTrails();
};

// Expose APIs
window.initShop = initShop;
window.renderShopPanel = renderShopPanel;
window.buyUpgrade = buyUpgrade;
window.buyConsumable = buyConsumable;
window.getUpgradeDuration = getUpgradeDuration;
window.getUpgradeMaxDuration = getUpgradeMaxDuration;
window.consumeItem = consumeItem;
window.getOwnedConsumables = getOwnedConsumables;
window.switchShopTab = switchShopTab;
