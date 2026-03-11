/**
 * ============================================================================
 * CYBERSTRIKE: FIREBASE LEADERBOARD MODULE
 * ============================================================================
 * Handles all Firestore interactions for the global leaderboard.
 * Exposes functions to window for use by game.js (non-module script).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyBlFQCU_LlquNlVsO7lbEoQHpG8UmfDbdg",
    authDomain: "cyberstrikeoverdrive.firebaseapp.com",
    projectId: "cyberstrikeoverdrive",
    storageBucket: "cyberstrikeoverdrive.firebasestorage.app",
    messagingSenderId: "366521404692",
    appId: "1:366521404692:web:217cbdf691aa4398d10601",
    measurementId: "G-SPH5N5JZ25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const leaderboardRef = collection(db, "leaderboard");

/**
 * Save a score entry to Firestore.
 * Ensures one entry per player name.
 */
async function saveScoreToFirebase(name, playerScore, reason) {
    if (!name || name === "GUEST_PILOT") return; // Skip guest pilots to keep leaderboard clean

    try {
        // Query for existing document with this name
        const q = query(leaderboardRef, where("name", "==", name));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Player exists - check score
            const existingDoc = snapshot.docs[0];
            const existingData = existingDoc.data();

            if (playerScore > existingData.score) {
                // New higher score - update document
                await updateDoc(doc(db, "leaderboard", existingDoc.id), {
                    score: playerScore,
                    reason: reason || "ENEMY",
                    timestamp: serverTimestamp()
                });
                console.log("[FIREBASE] High score updated for:", name, playerScore);
            } else {
                console.log("[FIREBASE] New score not higher. Skipping update.");
            }
        } else {
            // New player - create entry
            await addDoc(leaderboardRef, {
                name: name,
                score: playerScore,
                reason: reason || "ENEMY",
                timestamp: serverTimestamp()
            });
            console.log("[FIREBASE] New leaderboard entry created for:", name, playerScore);
        }
    } catch (err) {
        console.error("[FIREBASE] Save error:", err);
    }
}

/**
 * Fetch the top 5 scores from Firestore and render them into a list element.
 * Optionally highlights the current player's entry.
 */
async function renderFirebaseLeaderboard(listId, highlightName = '', highlightScore = -1) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    // Show loading state
    listEl.innerHTML = '<li class="lb-empty">SYNCING DATA...</li>';

    try {
        const q = query(leaderboardRef, orderBy("score", "desc"), limit(5));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listEl.innerHTML = '<li class="lb-empty">NO DATA LOGGED</li>';
            return;
        }

        listEl.innerHTML = '';
        let highlighted = false;
        let rank = 0;

        snapshot.forEach((doc) => {
            rank++;
            const entry = doc.data();
            const li = document.createElement('li');
            li.className = 'lb-entry';

            // Highlight current player's entry
            const nameMatch = entry.name === highlightName;
            const scoreMatch = highlightScore === -1 || entry.score === highlightScore;
            if (!highlighted && nameMatch && scoreMatch) {
                li.classList.add('lb-highlight');
                highlighted = true;
            }

            const displayName = entry.name || 'UNKNOWN';
            li.innerHTML = `
                <span class="lb-rank">${rank}</span>
                <span class="lb-name">${displayName}</span>
                <span class="lb-score-val">${entry.score.toString().padStart(6, '0')}</span>
            `;
            listEl.appendChild(li);
        });

    } catch (err) {
        console.error("[FIREBASE] Leaderboard fetch error:", err);
        listEl.innerHTML = '<li class="lb-empty">CONNECTION ERROR</li>';
    }
}

// --- Expose to global scope for game.js ---
window.saveScoreToFirebase = saveScoreToFirebase;
window.renderFirebaseLeaderboard = renderFirebaseLeaderboard;

// Signal that Firebase is ready
window.firebaseReady = true;
console.log("[FIREBASE] Leaderboard module initialized.");
