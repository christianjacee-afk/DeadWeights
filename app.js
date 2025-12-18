// app.js (FULL REWRITE w/ the new “cool as hell” GraveFive split + auto-rotation + sets/reps targets)
// Paste this whole file into app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =========================
   FIREBASE CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   UTIL
========================= */
const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function toast(msg) {
  alert(msg);
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* =========================
   GAME SYSTEMS (RANKS / TROPHIES / CARDS)
========================= */
const RANKS = [
  { min: 0, name: "NEWBORN", cardUnlock: 0 },
  { min: 10, name: "STALKER", cardUnlock: 1 },
  { min: 50, name: "GRAVE_LORD", cardUnlock: 2 },
  { min: 100, name: "IMMORTAL", cardUnlock: 3 },
  { min: 200, name: "CRYPT_KING", cardUnlock: 4 }
];

// trophy thresholds based on estimated 1RM for key lifts
const TROPHIES = [
  { id: "BENCH_225", label: "BENCH 225+ (e1RM)", key: "Bench Press", min: 225 },
  { id: "SQUAT_315", label: "SQUAT 315+ (e1RM)", key: "Back Squats", min: 315 },
  { id: "DEAD_405", label: "DEADLIFT 405+ (e1RM)", key: "Deadlifts", min: 405 },
  { id: "OHP_135", label: "OHP 135+ (e1RM)", key: "Overhead Press", min: 135 },
  { id: "ROW_225", label: "ROW 225+ (e1RM)", key: "Barbell Rows", min: 225 }
];

/* Calling Cards */
const CALLING_CARDS = [
  { id: "rust_sigils", name: "RUST_SIGILS", req: { rankMin: 0 }, fx: "sigils" },
  { id: "crt_wraith", name: "CRT_WRAITH", req: { rankMin: 10 }, fx: "wraith" },
  { id: "blood_oath", name: "BLOOD_OATH", req: { rankMin: 50 }, fx: "blood" },
  { id: "void_howl", name: "VOID_HOWL", req: { rankMin: 100 }, fx: "howl" },
  { id: "trophy_reaper", name: "REAPER_TROPHY", req: { trophy: "DEAD_405" }, fx: "reaper" }
];

/* Grave Tags */
const TAGS = [
  { id: "rust", css: "tag-rust", label: "RUST" },
  { id: "crt", css: "tag-crt", label: "CRT" },
  { id: "blood", css: "tag-blood", label: "BLOOD" },
  { id: "void", css: "tag-void", label: "VOID" }
];

/* =========================
   EXERCISE POOLS
========================= */
const EXERCISES = {
  Push: [
    "Bench Press",
    "Incline DB Press",
    "Incline Bench Press",
    "Overhead Press",
    "Machine Shoulder Press",
    "Seated DB Press",
    "Dips",
    "Close-Grip Bench",
    "Skull Crushers",
    "Rope Pushdowns",
    "Cable Fly",
    "DB Fly",
    "Lateral Raises",
    "Rear Delt Fly",
    "Machine Chest Press",
    "Pec Deck"
  ],
  Pull: [
    "Deadlifts",
    "RDLs",
    "Romanian Deadlift",
    "Barbell Rows",
    "Cable Rows",
    "Seated Cable Row",
    "Lat Pulldown",
    "Pull Ups",
    "Chin Ups",
    "Face Pulls",
    "Shrugs",
    "Back Extensions",
    "Bicep Curls",
    "EZ-Bar Curls",
    "Hammer Curls",
    "Preacher Curls",
    "Incline DB Curls"
  ],
  Legs: [
    "Back Squats",
    "Hack Squat",
    "Front Squats",
    "Leg Press",
    "Bulgarian Split Squat",
    "Lunges",
    "Leg Extensions",
    "Hamstring Curls",
    "Hip Thrust",
    "Glute Bridge",
    "Calf Raises",
    "Step Ups",
    "Good Mornings",
    "Adductor Machine",
    "Abductor Machine"
  ],
  Core: ["Hanging Leg Raises", "Cable Crunch", "Ab Wheel", "Plank", "Side Plank", "Russian Twists"],
  Conditioning: ["Row Machine", "Bike Sprint", "Incline Treadmill", "Farmer Walk", "Sled Push"]
};

function allExercises() {
  const set = new Set();
  Object.values(EXERCISES)
    .flat()
    .forEach((x) => set.add(x));
  return Array.from(set).sort();
}

/* =========================
   BUILT-IN SPLITS
   - day.items[] supports:
     { muscle, options[], sets, reps }
========================= */
const BUILT_IN_PLANS = [
  {
    id: "crypt_ppl_3",
    name: "CRYPT_PPL // 3-DAY",
    vibe: "Minimal days. Max brutality. (Push/Pull/Legs)",
    days: [
      {
        name: "DAY_1 PUSH",
        items: [
          { muscle: "Chest", options: ["Bench Press", "Incline Bench Press"], sets: 4, reps: "6–10" },
          { muscle: "Shoulders", options: ["Overhead Press", "Seated DB Press"], sets: 3, reps: "6–10" },
          { muscle: "Chest", options: ["Cable Fly", "DB Fly", "Pec Deck"], sets: 3, reps: "10–15" },
          { muscle: "Triceps", options: ["Skull Crushers", "Rope Pushdowns", "Close-Grip Bench"], sets: 3, reps: "10–12" }
        ]
      },
      {
        name: "DAY_2 PULL",
        items: [
          { muscle: "Back", options: ["Deadlifts", "RDLs"], sets: 3, reps: "3–6" },
          { muscle: "Back", options: ["Barbell Rows", "Seated Cable Row", "Cable Rows"], sets: 4, reps: "6–10" },
          { muscle: "Back", options: ["Lat Pulldown", "Pull Ups", "Chin Ups"], sets: 4, reps: "8–12" },
          { muscle: "Rear Delts", options: ["Face Pulls", "Rear Delt Fly"], sets: 3, reps: "12–15" },
          { muscle: "Biceps", options: ["EZ-Bar Curls", "Hammer Curls"], sets: 3, reps: "8–12" }
        ]
      },
      {
        name: "DAY_3 LEGS",
        items: [
          { muscle: "Quads", options: ["Back Squats", "Hack Squat"], sets: 4, reps: "5–8" },
          { muscle: "Quads", options: ["Leg Press"], sets: 3, reps: "8–12" },
          { muscle: "Hamstrings", options: ["Romanian Deadlift", "Hamstring Curls"], sets: 3, reps: "8–12" },
          { muscle: "Glutes", options: ["Hip Thrust", "Glute Bridge"], sets: 3, reps: "8–12" },
          { muscle: "Calves", options: ["Calf Raises"], sets: 4, reps: "10–15" }
        ]
      }
    ]
  },

  {
    id: "wraith_ul_4",
    name: "WRAITH_U/L // 4-DAY",
    vibe: "Upper/Lower twice. Strong + aesthetic.",
    days: [
      {
        name: "DAY_1 UPPER_A",
        items: [
          { muscle: "Chest", options: ["Bench Press", "Incline Bench Press"], sets: 4, reps: "6–8" },
          { muscle: "Back", options: ["Barbell Rows", "Seated Cable Row"], sets: 4, reps: "6–10" },
          { muscle: "Shoulders", options: ["Overhead Press", "Seated DB Press"], sets: 3, reps: "6–10" },
          { muscle: "Back", options: ["Lat Pulldown", "Pull Ups"], sets: 3, reps: "8–12" },
          { muscle: "Arms", options: ["Skull Crushers", "EZ-Bar Curls"], sets: 3, reps: "10–12" }
        ]
      },
      {
        name: "DAY_2 LOWER_A",
        items: [
          { muscle: "Quads", options: ["Back Squats", "Hack Squat"], sets: 4, reps: "6–8" },
          { muscle: "Hamstrings", options: ["Romanian Deadlift", "RDLs"], sets: 4, reps: "6–10" },
          { muscle: "Quads", options: ["Leg Press"], sets: 3, reps: "8–12" },
          { muscle: "Hamstrings", options: ["Hamstring Curls"], sets: 3, reps: "10–15" },
          { muscle: "Calves", options: ["Calf Raises"], sets: 4, reps: "10–15" }
        ]
      },
      {
        name: "DAY_3 UPPER_B",
        items: [
          { muscle: "Chest", options: ["Incline DB Press", "Machine Chest Press"], sets: 4, reps: "8–12" },
          { muscle: "Back", options: ["Seated Cable Row", "Cable Rows"], sets: 4, reps: "8–12" },
          { muscle: "Shoulders", options: ["Lateral Raises"], sets: 4, reps: "12–15" },
          { muscle: "Rear Delts", options: ["Face Pulls", "Rear Delt Fly"], sets: 3, reps: "12–15" },
          { muscle: "Arms", options: ["Hammer Curls", "Rope Pushdowns"], sets: 3, reps: "10–12" }
        ]
      },
      {
        name: "DAY_4 LOWER_B",
        items: [
          { muscle: "Quads", options: ["Front Squats", "Hack Squat"], sets: 4, reps: "6–10" },
          { muscle: "Glutes", options: ["Hip Thrust"], sets: 3, reps: "8–12" },
          { muscle: "Quads", options: ["Leg Extensions"], sets: 3, reps: "12–15" },
          { muscle: "Hamstrings", options: ["Hamstring Curls"], sets: 3, reps: "12–15" },
          { muscle: "Quads", options: ["Lunges", "Bulgarian Split Squat"], sets: 3, reps: "8–12" }
        ]
      }
    ]
  },

  /* ✅ YOUR SPLIT (as requested), with a brutal name */
  {
    id: "ironcoffin_gravefive_5",
    name: "IRON_COFFIN // GRAVEFIVE (5-DAY)",
    vibe: "Every muscle 2×/week. Miss a day? The coffin rotates—no schedule breaks.",
    days: [
      {
        name: "MONDAY // FULL BODY COMPOUND",
        items: [
          { muscle: "Quads", options: ["Back Squats", "Leg Press"], sets: 3, reps: "5–8" },
          { muscle: "Chest", options: ["Bench Press", "Incline Bench Press"], sets: 3, reps: "5–8" },
          { muscle: "Back", options: ["Barbell Rows", "Pull Ups", "Lat Pulldown"], sets: 3, reps: "6–10" },
          { muscle: "Shoulders", options: ["Overhead Press", "Machine Shoulder Press"], sets: 2, reps: "6–8" },
          { muscle: "Ham/Glutes", options: ["Romanian Deadlift", "RDLs", "Deadlifts"], sets: 2, reps: "6–8" },
          { muscle: "Arms (opt)", options: ["EZ-Bar Curls", "Hammer Curls", "Rope Pushdowns"], sets: 2, reps: "10–12" }
        ]
      },
      {
        name: "TUESDAY // LOWER A (FULL LEGS)",
        items: [
          { muscle: "Quads", options: ["Back Squats", "Hack Squat"], sets: 4, reps: "6–8" },
          { muscle: "Quads", options: ["Leg Press"], sets: 3, reps: "10" },
          { muscle: "Hamstrings", options: ["Romanian Deadlift", "RDLs"], sets: 4, reps: "8" },
          { muscle: "Hamstrings", options: ["Hamstring Curls"], sets: 3, reps: "12" },
          { muscle: "Glutes", options: ["Hip Thrust"], sets: 3, reps: "10" },
          { muscle: "Adductors", options: ["Adductor Machine"], sets: 3, reps: "15" },
          { muscle: "Abductors", options: ["Abductor Machine"], sets: 3, reps: "15" }
        ]
      },
      {
        name: "WEDNESDAY // UPPER PUSH",
        items: [
          { muscle: "Chest", options: ["Bench Press", "Incline Bench Press"], sets: 4, reps: "6–8" },
          { muscle: "Chest", options: ["Cable Fly", "DB Fly", "Pec Deck"], sets: 3, reps: "12" },
          { muscle: "Shoulders", options: ["Overhead Press", "Machine Shoulder Press"], sets: 3, reps: "8" },
          { muscle: "Shoulders", options: ["Lateral Raises"], sets: 4, reps: "12–15" },
          { muscle: "Triceps", options: ["Skull Crushers"], sets: 3, reps: "10" },
          { muscle: "Triceps", options: ["Rope Pushdowns"], sets: 3, reps: "12" }
        ]
      },
      {
        name: "THURSDAY // LOWER B (POSTERIOR)",
        items: [
          { muscle: "Ham/Glutes", options: ["Deadlifts", "Romanian Deadlift", "RDLs"], sets: 4, reps: "6" },
          { muscle: "Glutes", options: ["Hip Thrust"], sets: 3, reps: "8" },
          { muscle: "Quads", options: ["Bulgarian Split Squat"], sets: 3, reps: "8" },
          { muscle: "Quads", options: ["Leg Extensions"], sets: 3, reps: "15" },
          { muscle: "Adductors", options: ["Adductor Machine"], sets: 2, reps: "15" },
          { muscle: "Abductors", options: ["Abductor Machine"], sets: 2, reps: "15" }
        ]
      },
      {
        name: "FRIDAY // UPPER PULL + ARMS",
        items: [
          { muscle: "Back", options: ["Pull Ups", "Lat Pulldown"], sets: 4, reps: "8–10" },
          { muscle: "Back", options: ["Barbell Rows", "Seated Cable Row", "Cable Rows"], sets: 3, reps: "8–10" },
          { muscle: "Rear Delts", options: ["Face Pulls", "Rear Delt Fly"], sets: 3, reps: "15" },
          { muscle: "Biceps", options: ["EZ-Bar Curls"], sets: 4, reps: "8–10" },
          { muscle: "Biceps", options: ["Hammer Curls"], sets: 3, reps: "10–12" },
          { muscle: "Triceps", options: ["Close-Grip Bench", "Dips"], sets: 3, reps: "6–8" }
        ]
      }
    ]
  },

  {
    id: "immortal_phul_5",
    name: "IMMORTAL_PHUL // 5-DAY",
    vibe: "Power + hypertrophy. Heavy days + pump days.",
    days: [
      {
        name: "DAY_1 UPPER_POWER",
        items: [
          { muscle: "Chest", options: ["Bench Press"], sets: 4, reps: "3–6" },
          { muscle: "Back", options: ["Barbell Rows"], sets: 4, reps: "3–6" },
          { muscle: "Shoulders", options: ["Overhead Press"], sets: 3, reps: "4–6" },
          { muscle: "Back", options: ["Pull Ups", "Lat Pulldown"], sets: 3, reps: "6–10" },
          { muscle: "Triceps", options: ["Close-Grip Bench"], sets: 3, reps: "6–10" }
        ]
      },
      {
        name: "DAY_2 LOWER_POWER",
        items: [
          { muscle: "Quads", options: ["Back Squats"], sets: 4, reps: "3–6" },
          { muscle: "Ham/Glutes", options: ["Deadlifts"], sets: 3, reps: "3–5" },
          { muscle: "Quads", options: ["Leg Press"], sets: 3, reps: "8–12" },
          { muscle: "Calves", options: ["Calf Raises"], sets: 4, reps: "10–15" },
          { muscle: "Core", options: ["Plank"], sets: 3, reps: "30–60s" }
        ]
      },
      {
        name: "DAY_3 UPPER_HYPER",
        items: [
          { muscle: "Chest", options: ["Incline DB Press"], sets: 4, reps: "8–12" },
          { muscle: "Back", options: ["Seated Cable Row"], sets: 4, reps: "8–12" },
          { muscle: "Chest/Tris", options: ["Dips"], sets: 3, reps: "8–12" },
          { muscle: "Rear Delts", options: ["Face Pulls"], sets: 3, reps: "12–15" },
          { muscle: "Biceps", options: ["Hammer Curls"], sets: 3, reps: "10–12" }
        ]
      },
      {
        name: "DAY_4 LOWER_HYPER",
        items: [
          { muscle: "Quads", options: ["Front Squats"], sets: 4, reps: "6–10" },
          { muscle: "Hamstrings", options: ["RDLs", "Romanian Deadlift"], sets: 4, reps: "6–10" },
          { muscle: "Quads", options: ["Leg Extensions"], sets: 3, reps: "12–15" },
          { muscle: "Hamstrings", options: ["Hamstring Curls"], sets: 3, reps: "12–15" },
          { muscle: "Quads", options: ["Lunges"], sets: 3, reps: "8–12" }
        ]
      },
      {
        name: "DAY_5 OPTIONAL_COND",
        items: [
          { muscle: "Conditioning", options: ["Row Machine", "Bike Sprint"], sets: 6, reps: "20–40s" },
          { muscle: "Conditioning", options: ["Farmer Walk", "Sled Push"], sets: 6, reps: "20–40m" },
          { muscle: "Core", options: ["Ab Wheel"], sets: 4, reps: "8–12" }
        ]
      }
    ]
  }
];

/* =========================
   STATE
========================= */
let currentUserData = null;
let selectedTagCss = "tag-rust";
let selectedAvatar = "skull";
let selectedCard = "rust_sigils";
let selectedPlanId = null;
let manualCategory = "Push";

/* =========================
   AVATAR FACTORY
========================= */
function avatarSVG(style = "skull", seed = "X") {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;

  const glow = `hsla(${(h + 110) % 360}, 100%, 55%, 0.45)`;
  const rim = `hsla(${(h + 0) % 360}, 85%, 50%, 0.22)`;

  const base = `
    <svg viewBox="0 0 120 120" class="avatar-sigil" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="35%" cy="30%">
          <stop offset="0%" stop-color="${glow}"/>
          <stop offset="65%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="f">
          <feGaussianBlur stdDeviation="1.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="52" fill="rgba(0,0,0,0.35)" stroke="${rim}" stroke-width="2"/>
      <circle cx="60" cy="60" r="40" fill="url(#g)"/>
      <path d="M60 12 L75 30 L98 34 L82 52 L86 75 L60 66 L34 75 L38 52 L22 34 L45 30 Z"
            fill="rgba(179,0,0,0.14)" filter="url(#f)"/>
    </svg>
  `;

  const skull = `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0;">
      <path d="M60 18c-18 0-30 12-30 28 0 10 4 18 9 23v11c0 6 4 10 10 10h22c6 0 10-4 10-10V69c5-5 9-13 9-23 0-16-12-28-30-28Z"
            fill="rgba(231,231,239,0.85)" stroke="rgba(0,0,0,0.6)" stroke-width="2"/>
      <circle cx="48" cy="52" r="7" fill="rgba(0,0,0,0.75)"/>
      <circle cx="72" cy="52" r="7" fill="rgba(0,0,0,0.75)"/>
      <path d="M55 66h10" stroke="rgba(0,0,0,0.7)" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 84h24" stroke="rgba(0,0,0,0.55)" stroke-width="4" stroke-linecap="round"/>
      <path d="M55 84v10M65 84v10" stroke="rgba(0,0,0,0.5)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  const wraith = `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0;">
      <path d="M60 18c-16 0-28 12-28 28 0 14 8 24 18 28-4 12-10 18-10 18s16-6 20-6 20 6 20 6-6-6-10-18c10-4 18-14 18-28 0-16-12-28-28-28Z"
            fill="rgba(0,255,65,0.16)" stroke="rgba(0,255,65,0.28)" stroke-width="2"/>
      <path d="M40 54c5-10 14-16 20-16s15 6 20 16" stroke="rgba(231,231,239,0.72)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="58" r="5" fill="rgba(0,0,0,0.75)"/>
      <circle cx="70" cy="58" r="5" fill="rgba(0,0,0,0.75)"/>
    </svg>
  `;

  const reaper = `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0;">
      <path d="M60 16c-14 0-26 10-26 24 0 18 12 26 12 42 0 8-6 18-6 18s14-6 20-6 20 6 20 6-6-10-6-18c0-16 12-24 12-42 0-14-12-24-26-24Z"
            fill="rgba(179,0,0,0.16)" stroke="rgba(179,0,0,0.35)" stroke-width="2"/>
      <path d="M45 62c6-6 10-8 15-8s9 2 15 8" stroke="rgba(231,231,239,0.7)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M60 36v56" stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-dasharray="4 3"/>
    </svg>
  `;

  const map = { skull, wraith, reaper };
  const face = map[style] || skull;

  return `<div style="position:absolute; inset:0;">${base}${face}</div>`;
}

function renderAvatarInto(el, style, seed) {
  el.innerHTML = avatarSVG(style, seed);
}

/* =========================
   UI HELPERS
========================= */
function setScreen(which) {
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.add("hidden");
  $("app").classList.add("hidden");
  $(which).classList.remove("hidden");
}

function setTab(tabId) {
  ["feed-panel", "plans-panel", "friends-panel", "settings-panel"].forEach((id) => $(id).classList.add("hidden"));
  $(tabId).classList.remove("hidden");
}

function computeRankName(carvingCount = 0) {
  const r = RANKS.filter((x) => carvingCount >= x.min).pop() || RANKS[0];
  return r.name;
}

function cardUnlocked(user) {
  const carvingCount = user?.carvingCount || 0;
  const rankName = computeRankName(carvingCount);
  const rankObj = RANKS.find((r) => r.name === rankName) || RANKS[0];
  const trophies = user?.trophies || {};
  return CALLING_CARDS.map((c) => {
    const okRank = (c.req?.rankMin ?? -999) <= carvingCount;
    const okTrophy = c.req?.trophy ? !!trophies[c.req.trophy] : true;
    return { ...c, unlocked: okRank && okTrophy, rankObj };
  });
}

function planById(id, user) {
  const built = BUILT_IN_PLANS.find((p) => p.id === id);
  if (built) return built;
  const customs = user?.customPlans || [];
  return customs.find((p) => p.id === id) || null;
}

/* =========================
   AUTH FLOW
========================= */
async function doLogin() {
  const em = $("email").value.trim();
  const pw = $("password").value.trim();
  $("auth-warn").textContent = "";
  if (!em || !pw) {
    $("auth-warn").textContent = "MISSING CREDENTIALS.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, em, pw);
  } catch (e) {
    $("auth-warn").textContent = (e?.message || "LOGIN FAILED.").toUpperCase();
  }
}

async function beginRegistration() {
  const em = $("reg-email").value.trim();
  const pw = $("reg-pass").value.trim();
  const c = $("reg-confirm").value.trim();
  $("reg-warn").textContent = "";

  if (!em || !pw) {
    $("reg-warn").textContent = "EMAIL/PASSCODE REQUIRED.";
    return;
  }
  if (pw.length < 6) {
    $("reg-warn").textContent = "PASSCODE MUST BE 6+ CHARS.";
    return;
  }
  if (pw !== c) {
    $("reg-warn").textContent = "PASSCODES DO NOT MATCH.";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, em, pw);
    $("reg-status-chip").textContent = "STAGE_2";
    $("reg-step-1").classList.add("hidden");
    $("reg-step-2").classList.remove("hidden");
  } catch (e) {
    $("reg-warn").textContent = (e?.message || "REG FAILED.").toUpperCase();
  }
}

async function finalizeRegistration() {
  const user = auth.currentUser;
  const callsign = $("reg-username").value.trim();
  $("reg-warn").textContent = "";

  if (!user) {
    $("reg-warn").textContent = "NO AUTH USER FOUND.";
    return;
  }
  if (!callsign || callsign.length < 3) {
    $("reg-warn").textContent = "CALLSIGN 3+ CHARS.";
    return;
  }

  const payload = {
    uid: user.uid,
    username: callsign,
    tag: selectedTagCss || "tag-rust",
    avatar: selectedAvatar || "skull",
    callingCard: selectedCard || "rust_sigils",
    carvingCount: 0,
    friends: [],
    trophies: {},
    prs: {},
    // ✅ auto-rotation: nextDayIndex advances only when you log.
    activePlan: null, // { planId, startPlanIndex, nextDayIndex, activatedKey, lastCompletedKey }
    customPlans: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginDayKey: todayKey()
  };

  try {
    await setDoc(doc(db, "users", user.uid), payload, { merge: true });
    toast("ENTITY_BOUND. WELCOME TO THE GRAVE.");
  } catch (e) {
    $("reg-warn").textContent = (e?.message || "FINALIZE FAILED.").toUpperCase();
  }
}

/* =========================
   CORE APP INIT
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUserData = null;
    setScreen("auth-screen");
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    setScreen("registration-screen");
    $("reg-status-chip").textContent = "STAGE_2";
    $("reg-step-1").classList.add("hidden");
    $("reg-step-2").classList.remove("hidden");
    buildRegPickers(user.uid);
    return;
  }

  currentUserData = snap.data();
  setScreen("app");
  initApp();
});

function initApp() {
  $("header-callsign").textContent = currentUserData.username;
  $("profileUsername").textContent = currentUserData.username;

  const rankName = computeRankName(currentUserData.carvingCount || 0);
  $("user-rank").textContent = rankName;
  $("header-rank").textContent = `// ${rankName}`;

  const tagCss = currentUserData.tag || "tag-rust";
  $("user-grave-tag").className = `grave-tag ${tagCss}`;
  $("tag-text").textContent = TAGS.find((t) => t.css === tagCss)?.label || "CADAVER";

  renderAvatarInto($("avatar-frame"), currentUserData.avatar || "skull", currentUserData.uid);

  $("active-split-label").textContent = currentUserData.activePlan?.planId
    ? planById(currentUserData.activePlan.planId, currentUserData)?.name || "ACTIVE"
    : "NONE";

  buildSettingsPickers();
  buildStartDaySelect(); // now = plan day selector (not weekdays)
  buildManualLogger();

  hookNavButtons();
  loadFeedStream();
  loadLeaderboardStream();
  loadPRStream();
  loadFriendsUI();
  loadDailyMassGrave();
  renderPlansIndex();
  renderActivePlanStatus();
  renderTodayWorkoutLogger();
  renderTrophies();

  setTab("feed-panel");
}

/* =========================
   NAV BUTTONS
========================= */
function hookNavButtons() {
  document.querySelectorAll(".mini-btn[data-tab]").forEach((btn) => {
    btn.onclick = () => setTab(btn.getAttribute("data-tab"));
  });
}

/* =========================
   REGISTRATION PICKERS
========================= */
function buildRegPickers(seed) {
  const wrap = $("initial-tag-picker");
  wrap.innerHTML = "";
  TAGS.forEach((t, idx) => {
    const div = document.createElement("div");
    div.className = `tag-opt ${t.css} ${idx === 0 ? "active" : ""}`;
    div.onclick = () => {
      selectedTagCss = t.css;
      wrap.querySelectorAll(".tag-opt").forEach((x) => x.classList.remove("active"));
      div.classList.add("active");
    };
    wrap.appendChild(div);
  });
  selectedTagCss = TAGS[0].css;

  const aw = $("avatar-picker");
  aw.innerHTML = "";
  const options = ["skull", "wraith", "reaper", "skull"];
  options.forEach((a, idx) => {
    const div = document.createElement("div");
    div.className = `avatar-opt ${idx === 0 ? "active" : ""}`;
    div.innerHTML = avatarSVG(a, seed);
    div.onclick = () => {
      selectedAvatar = a;
      aw.querySelectorAll(".avatar-opt").forEach((x) => x.classList.remove("active"));
      div.classList.add("active");
    };
    aw.appendChild(div);
  });
  selectedAvatar = options[0];

  selectedCard = "rust_sigils";
}

/* =========================
   SETTINGS PICKERS
========================= */
function buildSettingsPickers() {
  const tagWrap = $("settings-tag-picker");
  tagWrap.innerHTML = "";
  TAGS.forEach((t) => {
    const div = document.createElement("div");
    div.className = `tag-opt ${t.css} ${currentUserData.tag === t.css ? "active" : ""}`;
    div.onclick = () => {
      selectedTagCss = t.css;
      tagWrap.querySelectorAll(".tag-opt").forEach((x) => x.classList.remove("active"));
      div.classList.add("active");
    };
    tagWrap.appendChild(div);
  });
  selectedTagCss = currentUserData.tag || "tag-rust";

  const avWrap = $("settings-avatar-picker");
  avWrap.innerHTML = "";
  const avatarOptions = ["skull", "wraith", "reaper", "skull"];
  avatarOptions.forEach((a) => {
    const div = document.createElement("div");
    div.className = `avatar-opt ${(currentUserData.avatar || "skull") === a ? "active" : ""}`;
    div.innerHTML = avatarSVG(a, currentUserData.uid);
    div.onclick = () => {
      selectedAvatar = a;
      avWrap.querySelectorAll(".avatar-opt").forEach((x) => x.classList.remove("active"));
      div.classList.add("active");
    };
    avWrap.appendChild(div);
  });
  selectedAvatar = currentUserData.avatar || "skull";

  const cards = cardUnlocked(currentUserData);
  const cardWrap = $("card-picker");
  cardWrap.innerHTML = "";
  cards.forEach((c) => {
    const div = document.createElement("div");
    div.className = `plan-card ${currentUserData.callingCard === c.id ? "active" : ""}`;
    div.style.cursor = c.unlocked ? "pointer" : "not-allowed";
    div.style.opacity = c.unlocked ? "1" : "0.55";
    div.innerHTML = `
      <div class="plan-name">${esc(c.name)}</div>
      <div class="plan-sub">${c.unlocked ? "UNLOCKED" : "LOCKED"}</div>
    `;
    div.onclick = () => {
      if (!c.unlocked) return;
      selectedCard = c.id;
      cardWrap.querySelectorAll(".plan-card").forEach((x) => x.classList.remove("active"));
      div.classList.add("active");
    };
    cardWrap.appendChild(div);
  });
  selectedCard = currentUserData.callingCard || "rust_sigils";
}

/* =========================
   START DAY SELECT = PLAN DAY (not weekdays)
========================= */
function buildStartDaySelect(planIdMaybe) {
  const sel = $("start-day-select");
  const plan = planById(planIdMaybe || selectedPlanId || "ironcoffin_gravefive_5", currentUserData);
  const dayCount = plan?.days?.length || 5;

  sel.innerHTML = "";
  for (let i = 0; i < dayCount; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `DAY_${i + 1}`;
    sel.appendChild(opt);
  }
  sel.value = "0";

  $("start-auto-btn").onclick = () => {
    sel.value = "0";
    toast("START DAY SET TO DAY_1.");
  };
}

/* =========================
   MANUAL LOGGER
========================= */
function buildManualLogger() {
  const catSel = $("log-category");
  const exSel = $("log-ex");

  catSel.innerHTML = Object.keys(EXERCISES)
    .map((k) => `<option value="${esc(k)}">${esc(k)}</option>`)
    .join("");
  catSel.value = "Push";
  manualCategory = "Push";

  function refreshExercises() {
    const cat = catSel.value;
    manualCategory = cat;
    exSel.innerHTML = EXERCISES[cat].map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  }
  catSel.onchange = refreshExercises;
  refreshExercises();

  $("manualLogBtn").onclick = async () => {
    const ex = exSel.value;
    const w = Number($("log-w").value);
    const r = Number($("log-r").value);
    if (!ex || !w || !r) return toast("MISSING LOG FIELDS.");
    await submitLog(ex, w, r, { source: "manual", setNumber: 1, targetSets: null, targetReps: null, muscle: manualCategory });
    $("log-w").value = "";
    $("log-r").value = "";
  };
}

/* =========================
   FEED
========================= */
let feedUnsub = null;

function loadFeedStream() {
  if (feedUnsub) feedUnsub();

  const qy = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25));
  feedUnsub = onSnapshot(qy, (snap) => {
    const feed = $("feed-content");
    feed.innerHTML = "";

    snap.forEach((docSnap) => {
      const p = docSnap.data();
      const isMine = p.uid === auth.currentUser.uid;

      const postEl = document.createElement("div");
      postEl.className = "grave-box post";
      postEl.innerHTML = `
        <div class="post-top">
          <div class="who" data-uid="${esc(p.uid)}">${esc(p.username || "UNKNOWN")}</div>
          <div class="meta">
            <span>${esc(p.dayKey || "")}</span>
            ${isMine ? `<button class="mini-btn danger" data-del="${docSnap.id}">DELETE</button>` : ``}
          </div>
        </div>
        <div class="post-body">${esc(p.text || "")}</div>
        <div class="comment-section" id="comments-${docSnap.id}"></div>
        <div class="comment-input-wrap">
          <input id="in-${docSnap.id}" placeholder="REPLY...">
          <button class="mini-btn" data-cmt="${docSnap.id}">SEND</button>
        </div>
      `;

      feed.appendChild(postEl);

      postEl.querySelector(".who").onclick = () => openProfile(p.uid);

      const delBtn = postEl.querySelector(`[data-del="${docSnap.id}"]`);
      if (delBtn) {
        delBtn.onclick = async () => {
          if (!confirm("DELETE YOUR POST?")) return;
          await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      postEl.querySelector(`[data-cmt="${docSnap.id}"]`).onclick = () => postComment(docSnap.id);

      loadCommentsStream(docSnap.id);
    });
  });
}

function loadCommentsStream(postId) {
  const cBox = $(`comments-${postId}`);
  if (!cBox) return;

  const qy = query(collection(db, `posts/${postId}/comments`), orderBy("timestamp", "asc"), limit(50));
  onSnapshot(qy, (snap) => {
    cBox.innerHTML = "";
    snap.forEach((c) => {
      const d = c.data();
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<b>${esc(d.username || "ENTITY")}:</b> ${esc(d.text || "")}`;
      cBox.appendChild(div);
    });
  });
}

async function postComment(postId) {
  const input = $(`in-${postId}`);
  const text = (input?.value || "").trim();
  if (!text) return;

  await addDoc(collection(db, `posts/${postId}/comments`), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp(),
    dayKey: todayKey()
  });

  input.value = "";
}

async function createPost() {
  const text = $("statusText").value.trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp(),
    dayKey: todayKey()
  });

  $("statusText").value = "";
}

/* =========================
   LEADERBOARD
========================= */
function loadLeaderboardStream() {
  const qy = query(collection(db, "users"), orderBy("carvingCount", "desc"), limit(7));
  onSnapshot(qy, (snap) => {
    const lb = $("leaderboard");
    lb.innerHTML = "";
    let i = 1;
    snap.forEach((d) => {
      const u = d.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>#${i} <span class="dim">${esc(u.username || "ENTITY")}</span></span>
        <span>${esc(String(u.carvingCount || 0))}</span>
      `;
      row.onclick = () => openProfile(d.id);
      lb.appendChild(row);
      i++;
    });
  });
}

/* =========================
   PRS + TROPHIES
========================= */
function e1rm(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

function renderTrophies() {
  const trophies = currentUserData.trophies || {};
  const earned = Object.keys(trophies).filter((k) => trophies[k]);
  $("trophy-count").textContent = String(earned.length);

  const wrap = $("trophy-list");
  wrap.innerHTML = "";

  TROPHIES.forEach((t) => {
    const got = !!trophies[t.id];
    const row = document.createElement("div");
    row.className = "index-row";
    row.innerHTML = `
      <span>${got ? "🏴" : "·"} <span class="dim">${esc(t.label)}</span></span>
      <span>${got ? "EARNED" : "LOCKED"}</span>
    `;
    wrap.appendChild(row);
  });
}

function loadPRStream() {
  const uid = auth.currentUser.uid;
  const qy = query(collection(db, "logs"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(60));

  onSnapshot(qy, (snap) => {
    $("stat-count").textContent = String(currentUserData.carvingCount || 0);

    const wrap = $("prList");
    wrap.innerHTML = "";

    snap.forEach((d) => {
      const L = d.data();
      const row = document.createElement("div");
      row.className = "index-row";
      const setTxt = L.setNumber ? `S${L.setNumber}` : "";
      const tgtTxt =
        L.targetSets || L.targetReps
          ? ` · TARGET ${L.targetSets ? `${L.targetSets}S` : ""}${L.targetReps ? ` @${L.targetReps}` : ""}`
          : "";
      row.innerHTML = `
        <span>${esc(L.exercise)} <span class="dim">${esc(setTxt)} ${esc(String(L.weight))}LBS × ${esc(String(L.reps))}${esc(tgtTxt)}</span></span>
        <button class="mini-btn danger">X</button>
      `;
      row.querySelector("button").onclick = async () => {
        if (!confirm("DELETE THIS LOG?")) return;
        await deleteLog(d.id, L);
      };
      wrap.appendChild(row);
    });
  });
}

/* =========================
   LOGGING + MASSGRAVE
   ✅ Auto-rotation: first log of a day “completes” the plan day and advances nextDayIndex.
========================= */
async function submitLog(exercise, weight, reps, meta = {}) {
  const uid = auth.currentUser.uid;
  const dk = todayKey();
  const vol = Math.round(weight * reps);

  await addDoc(collection(db, "logs"), {
    uid,
    exercise,
    weight,
    reps,
    volume: vol,
    dayKey: dk,
    timestamp: serverTimestamp(),
    source: meta.source || "plan",
    planId: meta.planId || null,
    planDayIndex: meta.planDayIndex ?? null,
    muscle: meta.muscle || null,
    setNumber: meta.setNumber ?? null,
    targetSets: meta.targetSets ?? null,
    targetReps: meta.targetReps ?? null
  });

  await updateDoc(doc(db, "users", uid), {
    carvingCount: increment(1),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "dailyTotals", dk), {
    totalVolume: increment(vol),
    updatedAt: serverTimestamp()
  }).catch(async () => {
    await setDoc(
      doc(db, "dailyTotals", dk),
      { dayKey: dk, totalVolume: vol, updatedAt: serverTimestamp() },
      { merge: true }
    );
  });

  // local + PR updates
  currentUserData.carvingCount = (currentUserData.carvingCount || 0) + 1;
  await updatePRsAndTrophies(exercise, weight, reps);

  // ✅ auto-rotation advancement (only for plan logs; advances once per calendar day)
  if (meta.source === "plan" && currentUserData.activePlan?.planId) {
    const ap = currentUserData.activePlan;
    if (ap.lastCompletedKey !== dk) {
      const plan = planById(ap.planId, currentUserData);
      const len = plan?.days?.length || 1;
      const next = (Number(ap.nextDayIndex ?? 0) + 1) % len;

      const patched = { ...ap, nextDayIndex: next, lastCompletedKey: dk };
      await updateDoc(doc(db, "users", uid), { activePlan: patched, updatedAt: serverTimestamp() });
      currentUserData.activePlan = patched;

      renderActivePlanStatus();
      renderTodayWorkoutLogger();
    }
  }

  $("user-rank").textContent = computeRankName(currentUserData.carvingCount);
  $("header-rank").textContent = `// ${computeRankName(currentUserData.carvingCount)}`;
  loadDailyMassGrave();
}

async function deleteLog(logId, logData) {
  const uid = auth.currentUser.uid;
  await deleteDoc(doc(db, "logs", logId));

  await updateDoc(doc(db, "users", uid), {
    carvingCount: increment(-1),
    updatedAt: serverTimestamp()
  });

  const dk = logData.dayKey || todayKey();
  const vol = Number(logData.volume || Number(logData.weight) * Number(logData.reps) || 0);

  await updateDoc(doc(db, "dailyTotals", dk), {
    totalVolume: increment(-vol),
    updatedAt: serverTimestamp()
  }).catch(() => {});

  currentUserData.carvingCount = Math.max(0, (currentUserData.carvingCount || 0) - 1);
  $("user-rank").textContent = computeRankName(currentUserData.carvingCount);
  $("header-rank").textContent = `// ${computeRankName(currentUserData.carvingCount)}`;
  loadDailyMassGrave();
}

async function updatePRsAndTrophies(exercise, weight, reps) {
  const uid = auth.currentUser.uid;
  const prs = currentUserData.prs || {};
  const trophies = currentUserData.trophies || {};

  const est = e1rm(weight, reps);

  const prev = prs[exercise] || { bestE1RM: 0, bestWeight: 0, bestReps: 0 };
  const improvedE = est > (prev.bestE1RM || 0);
  const improvedW = weight > (prev.bestWeight || 0);

  if (improvedE || improvedW) {
    prs[exercise] = {
      bestE1RM: Math.max(prev.bestE1RM || 0, est),
      bestWeight: Math.max(prev.bestWeight || 0, weight),
      bestReps: improvedW ? reps : prev.bestReps || reps,
      updatedAt: Date.now()
    };
  }

  for (const t of TROPHIES) {
    if (trophies[t.id]) continue;
    if (t.key !== exercise) continue;
    if (est >= t.min) trophies[t.id] = true;
  }

  await updateDoc(doc(db, "users", uid), { prs, trophies, updatedAt: serverTimestamp() });

  currentUserData.prs = prs;
  currentUserData.trophies = trophies;
  renderTrophies();
}

function loadDailyMassGrave() {
  const dk = todayKey();
  onSnapshot(doc(db, "dailyTotals", dk), (snap) => {
    const total = snap.exists() ? snap.data().totalVolume || 0 : 0;
    $("massgrave-value").textContent = String(total);
  });
}

/* =========================
   FRIENDS + SEARCH + PROFILE MODAL
========================= */
function loadFriendsUI() {
  renderFriendsList();

  $("userSearch").oninput = async () => {
    const term = $("userSearch").value.trim();
    const box = $("search-results");
    box.innerHTML = "";
    if (term.length < 2) return;

    const snap = await getDocs(query(collection(db, "users"), orderBy("username"), limit(25)));
    const found = [];
    snap.forEach((d) => {
      const u = d.data();
      if ((u.username || "").toLowerCase().includes(term.toLowerCase()) && d.id !== auth.currentUser.uid) {
        found.push({ id: d.id, ...u });
      }
    });

    found.slice(0, 12).forEach((u) => {
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>${esc(u.username)}</span>
        <div style="display:flex; gap:8px;">
          <button class="mini-btn">PROFILE</button>
          <button class="mini-btn">ADD</button>
        </div>
      `;
      row.querySelectorAll("button")[0].onclick = () => openProfile(u.id);
      row.querySelectorAll("button")[1].onclick = () => addFriend(u.id);
      box.appendChild(row);
    });
  };
}

function renderFriendsList() {
  const list = $("friends-list");
  list.innerHTML = "";
  const friends = currentUserData.friends || [];
  if (!friends.length) {
    list.innerHTML = `<div class="hint"><span class="hint-dot"></span>No friends yet. Search callsigns to add.</div>`;
    return;
  }

  friends.forEach(async (fid) => {
    const s = await getDoc(doc(db, "users", fid));
    if (!s.exists()) return;
    const u = s.data();

    const row = document.createElement("div");
    row.className = "index-row";
    row.innerHTML = `
      <span>${esc(u.username)}</span>
      <div style="display:flex; gap:8px;">
        <button class="mini-btn">VIEW</button>
        <button class="mini-btn danger">SEVER</button>
      </div>
    `;
    row.querySelectorAll("button")[0].onclick = () => openProfile(fid);
    row.querySelectorAll("button")[1].onclick = () => removeFriend(fid);
    list.appendChild(row);
  });
}

async function addFriend(targetUid) {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(targetUid), updatedAt: serverTimestamp() });
  currentUserData.friends = Array.from(new Set([...(currentUserData.friends || []), targetUid]));
  toast("CONNECTION_ESTABLISHED");
  renderFriendsList();
}

async function removeFriend(targetUid) {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayRemove(targetUid), updatedAt: serverTimestamp() });
  currentUserData.friends = (currentUserData.friends || []).filter((x) => x !== targetUid);
  toast("CONNECTION_SEVERED");
  renderFriendsList();
}

async function openProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();
  $("profile-modal").classList.remove("hidden");
  $("modal-title").textContent = "ENTITY_PROFILE";
  $("modal-name").textContent = u.username || "ENTITY";
  $("modal-rank").textContent = `RANK: ${computeRankName(u.carvingCount || 0)}`;
  $("modal-stats").textContent = `CARVINGS: ${u.carvingCount || 0}  //  TROPHIES: ${
    Object.keys(u.trophies || {}).filter((k) => u.trophies[k]).length
  }`;

  renderAvatarInto($("modal-avatar"), u.avatar || "skull", uid);

  const isFriend = (currentUserData.friends || []).includes(uid);
  const isMe = uid === auth.currentUser.uid;

  const friendBtn = $("modal-friend-btn");
  friendBtn.textContent = isMe ? "THIS_IS_YOU" : isFriend ? "REMOVE_FRIEND" : "ADD_FRIEND";
  friendBtn.className = isMe ? "mini-btn" : isFriend ? "mini-btn danger" : "mini-btn";

  friendBtn.onclick = async () => {
    if (isMe) return;
    if ((currentUserData.friends || []).includes(uid)) await removeFriend(uid);
    else await addFriend(uid);
    $("profile-modal").classList.add("hidden");
  };

  $("modal-posts").innerHTML = `<div class="hint"><span class="hint-dot"></span>Click “VIEW_POSTS” to load latest broadcasts.</div>`;
  $("modal-view-posts-btn").onclick = async () => {
    const qy = query(collection(db, "posts"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(10));
    const ps = await getDocs(qy);
    const wrap = $("modal-posts");
    wrap.innerHTML = "";
    ps.forEach((p) => {
      const d = p.data();
      const card = document.createElement("div");
      card.className = "plan-card";
      card.innerHTML = `
        <div class="plan-name">${esc(d.dayKey || "")}</div>
        <div class="plan-sub">${esc(d.text || "")}</div>
      `;
      wrap.appendChild(card);
    });
    if (!ps.size) {
      wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>No public broadcasts found.</div>`;
    }
  };
}

function closeProfile() {
  $("profile-modal").classList.add("hidden");
}

/* =========================
   PLANS: INDEX + ACTIVATE + AUTO-ROTATE “MISSED DAYS”
========================= */
function renderPlansIndex() {
  const wrap = $("plan-index");
  wrap.innerHTML = "";

  BUILT_IN_PLANS.forEach((p) => {
    const card = document.createElement("div");
    card.className = `plan-card ${selectedPlanId === p.id ? "active" : ""}`;
    card.innerHTML = `
      <div class="plan-name">${esc(p.name)}</div>
      <div class="plan-sub">${esc(p.vibe)}</div>
      <div class="btn-row" style="margin-top:10px;">
        <button class="mini-btn">SELECT</button>
        <button class="mini-btn">ACTIVATE</button>
      </div>
    `;

    const btns = card.querySelectorAll("button");
    btns[0].onclick = () => {
      selectedPlanId = p.id;
      wrap.querySelectorAll(".plan-card").forEach((x) => x.classList.remove("active"));
      card.classList.add("active");
      buildStartDaySelect(p.id);
    };
    btns[1].onclick = () => activatePlan(p.id);

    wrap.appendChild(card);
  });

  const customs = currentUserData.customPlans || [];
  if (customs.length) {
    const sep = document.createElement("div");
    sep.className = "small-label";
    sep.style.marginTop = "18px";
    sep.textContent = "CUSTOM_SPLITS";
    wrap.appendChild(sep);

    customs.forEach((p) => {
      const card = document.createElement("div");
      card.className = `plan-card ${selectedPlanId === p.id ? "active" : ""}`;
      card.innerHTML = `
        <div class="plan-name">${esc(p.name)}</div>
        <div class="plan-sub">FORGED: ${esc(String(p.days?.length || 0))} DAYS</div>
        <div class="btn-row" style="margin-top:10px;">
          <button class="mini-btn">SELECT</button>
          <button class="mini-btn">ACTIVATE</button>
        </div>
      `;

      const btns = card.querySelectorAll("button");
      btns[0].onclick = () => {
        selectedPlanId = p.id;
        wrap.querySelectorAll(".plan-card").forEach((x) => x.classList.remove("active"));
        card.classList.add("active");
        buildStartDaySelect(p.id);
      };
      btns[1].onclick = () => activatePlan(p.id);
      wrap.appendChild(card);
    });
  }
}

async function activatePlan(planId) {
  const plan = planById(planId, currentUserData);
  if (!plan) return toast("PLAN NOT FOUND.");

  const startPlanIndex = Number($("start-day-select").value || 0);
  const dk = todayKey();

  const active = {
    planId,
    startPlanIndex, // where the rotation begins
    nextDayIndex: startPlanIndex, // ✅ this is what “today” shows until you log
    activatedKey: dk,
    lastCompletedKey: null
  };

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    activePlan: active,
    updatedAt: serverTimestamp()
  });

  currentUserData.activePlan = active;
  $("active-split-label").textContent = plan.name;
  toast("SPLIT ACTIVATED.");

  renderActivePlanStatus();
  renderTodayWorkoutLogger();
}

function deactivatePlan() {
  updateDoc(doc(db, "users", auth.currentUser.uid), { activePlan: null, updatedAt: serverTimestamp() });
  currentUserData.activePlan = null;
  $("active-split-label").textContent = "NONE";
  toast("SPLIT DEACTIVATED.");
  renderActivePlanStatus();
  renderTodayWorkoutLogger();
}

function planDayForToday() {
  const ap = currentUserData.activePlan;
  if (!ap) return null;

  const plan = planById(ap.planId, currentUserData);
  if (!plan) return null;

  const planIndex = clamp(Number(ap.nextDayIndex ?? 0), 0, Math.max(0, plan.days.length - 1));
  return { plan, planIndex };
}

function renderActivePlanStatus() {
  const wrap = $("active-plan-readout");
  const ap = currentUserData.activePlan;

  if (!ap) {
    wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>No active split. Activate one from the index above.</div>`;
    $("active-day-chip").textContent = "DAY_?";
    return;
  }

  const plan = planById(ap.planId, currentUserData);
  if (!plan) {
    wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>Active split missing.</div>`;
    return;
  }

  const info = planDayForToday();
  const todayDay = info ? plan.days[info.planIndex] : null;

  $("active-day-chip").textContent = info ? `DAY_${info.planIndex + 1}` : "DAY_?";

  wrap.innerHTML = `
    <div class="day-badge">
      <div class="dname">${esc(plan.name)}</div>
      <div class="dlist">
        <div style="margin-top:8px;"><span class="dim">TODAY (AUTO-ROTATE):</span> ${esc(todayDay?.name || "UNKNOWN")}</div>
        <div style="margin-top:8px;"><span class="dim">ACTIVATED:</span> ${esc(ap.activatedKey || "")}</div>
        <div style="margin-top:8px;"><span class="dim">LAST COMPLETED:</span> ${esc(ap.lastCompletedKey || "—")}</div>
      </div>
    </div>
  `;

  $("deactivate-plan-btn").onclick = deactivatePlan;

  $("jump-day-btn").onclick = async () => {
    const patched = { ...ap, nextDayIndex: 0 };
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      activePlan: patched,
      updatedAt: serverTimestamp()
    });
    currentUserData.activePlan = patched;
    toast("TODAY SET TO DAY_1.");
    renderActivePlanStatus();
    renderTodayWorkoutLogger();
  };
}

function renderTodayWorkoutLogger() {
  const box = $("today-workout-list");
  box.innerHTML = "";

  const info = planDayForToday();
  if (!info) {
    $("logger-sub").textContent = "Activate a split to load today.";
    return;
  }

  const day = info.plan.days[info.planIndex];
  $("logger-sub").textContent = `${day.name} // Log sets to advance the rotation.`;

  const items = day.items || [];
  items.forEach((it, idx) => {
    const line = document.createElement("div");
    line.className = "workline";

    const options = (it.options?.length ? it.options : allExercises()).map((e, i) => {
      const selected = i === 0 ? "selected" : "";
      return `<option value="${esc(e)}" ${selected}>${esc(e)}</option>`;
    }).join("");

    line.innerHTML = `
      <div class="workline-top">
        <div class="workline-title">${esc(it.muscle || "MUSCLE")} — <span class="dim">${esc(
      `${it.sets || "?"} SETS @ ${it.reps || "?"}`
    )}</span></div>
        <div class="workline-controls">
          <select data-swap="${idx}">${options}</select>
          <button class="mini-btn" data-quick="${idx}">RECORD</button>
        </div>
      </div>

      <div class="row3" style="margin-top:10px;">
        <input type="number" inputmode="decimal" placeholder="LBS" data-w="${idx}">
        <input type="number" inputmode="numeric" placeholder="REPS" data-r="${idx}">
        <button class="mini-btn" data-nextset="${idx}">SET #1</button>
      </div>
    `;

    const sel = line.querySelector(`select[data-swap="${idx}"]`);
    const btnRecord = line.querySelector(`button[data-quick="${idx}"]`);
    const btnSet = line.querySelector(`button[data-nextset="${idx}"]`);
    const inW = line.querySelector(`input[data-w="${idx}"]`);
    const inR = line.querySelector(`input[data-r="${idx}"]`);

    let setNum = 1;
    const targetSets = Number(it.sets || 0) || null;

    function refreshSetBtn() {
      btnSet.textContent = `SET #${setNum}`;
    }
    refreshSetBtn();

    btnSet.onclick = () => {
      // manual bump if you want
      setNum = clamp(setNum + 1, 1, 99);
      refreshSetBtn();
    };

    btnRecord.onclick = async () => {
      const ex = sel.value;
      const w = Number(inW.value);
      const r = Number(inR.value);
      if (!w || !r) return toast("ENTER LBS + REPS.");

      await submitLog(ex, w, r, {
        source: "plan",
        planId: info.plan.id,
        planDayIndex: info.planIndex,
        muscle: it.muscle || null,
        setNumber: setNum,
        targetSets,
        targetReps: it.reps || null
      });

      inW.value = "";
      inR.value = "";

      // auto-advance set number until you reach target sets (then keeps going if you want)
      if (targetSets && setNum < targetSets) setNum += 1;
      else setNum += 1;
      refreshSetBtn();

      toast("CARVING_RECORDED.");
    };

    box.appendChild(line);
  });
}

/* =========================
   SPLIT BUILDER (kept, but stores items as plain lines)
========================= */
function openBuilder() {
  $("builder-modal").classList.remove("hidden");
  $("builder-warn").textContent = "";
  $("builder-name").value = "";
  $("builder-days").value = "5";
  buildBuilderDays();
}

function closeBuilder() {
  $("builder-modal").classList.add("hidden");
}

function buildBuilderDays() {
  const count = Number($("builder-days").value || 5);
  const wrap = $("builder-days-wrap");
  wrap.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const day = document.createElement("div");
    day.className = "builder-day";
    day.innerHTML = `
      <div class="builder-day-title">DAY_${i + 1}</div>
      <div class="small-label">EXERCISES (ONE PER LINE)</div>
      <textarea data-day="${i}" placeholder="Bench Press&#10;Overhead Press&#10;..."></textarea>
    `;
    wrap.appendChild(day);
  }
}

async function saveCustomSplit() {
  const name = $("builder-name").value.trim();
  const count = Number($("builder-days").value || 5);
  $("builder-warn").textContent = "";

  if (!name || name.length < 4) {
    $("builder-warn").textContent = "NAME TOO SHORT.";
    return;
  }

  const days = [];
  for (let i = 0; i < count; i++) {
    const ta = document.querySelector(`textarea[data-day="${i}"]`);
    const lines = (ta?.value || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (lines.length < 3) {
      $("builder-warn").textContent = `DAY_${i + 1} NEEDS 3+ EXERCISES.`;
      return;
    }

    // store as items with defaults (no sets/reps targets in builder mode)
    days.push({
      name: `DAY_${i + 1} ${name.toUpperCase().replaceAll(" ", "_")}`,
      items: lines.map((ln) => ({ muscle: "CUSTOM", options: [ln], sets: null, reps: null }))
    });
  }

  const id = `custom_${Date.now()}`;
  const custom = { id, name, vibe: "FORGED IN THE GRAVE.", days };

  const nextPlans = [...(currentUserData.customPlans || []), custom];

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    customPlans: nextPlans,
    updatedAt: serverTimestamp()
  });

  currentUserData.customPlans = nextPlans;
  toast("CUSTOM SPLIT SAVED.");
  closeBuilder();
  renderPlansIndex();
}

/* =========================
   SETTINGS ACTIONS
========================= */
async function renameEntity() {
  const newName = $("new-username").value.trim();
  if (!newName || newName.length < 3) return toast("CALLSIGN TOO SHORT.");

  await updateDoc(doc(db, "users", auth.currentUser.uid), { username: newName, updatedAt: serverTimestamp() });
  currentUserData.username = newName;
  $("header-callsign").textContent = newName;
  $("profileUsername").textContent = newName;
  toast("IDENTITY_UPDATED.");
}

async function updateTag() {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { tag: selectedTagCss, updatedAt: serverTimestamp() });
  currentUserData.tag = selectedTagCss;
  $("user-grave-tag").className = `grave-tag ${selectedTagCss}`;
  $("tag-text").textContent = TAGS.find((t) => t.css === selectedTagCss)?.label || "CADAVER";
  toast("TAG_UPDATED.");
}

async function updateAvatar() {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { avatar: selectedAvatar, updatedAt: serverTimestamp() });
  currentUserData.avatar = selectedAvatar;
  renderAvatarInto($("avatar-frame"), selectedAvatar, currentUserData.uid);
  toast("AVATAR_BOUND.");
}

async function updateCallingCard() {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { callingCard: selectedCard, updatedAt: serverTimestamp() });
  currentUserData.callingCard = selectedCard;
  toast("CALLING_CARD_EQUIPPED.");
}

async function purgeMyLogs() {
  if (!confirm("PURGE ALL YOUR LOGS?")) return;
  const uid = auth.currentUser.uid;
  const snap = await getDocs(query(collection(db, "logs"), where("uid", "==", uid), limit(200)));
  const batch = [];
  snap.forEach((d) => batch.push(deleteDoc(doc(db, "logs", d.id))));
  await Promise.all(batch);
  toast("LOGS PURGED (UP TO 200).");
}

async function purgeMyPosts() {
  if (!confirm("PURGE ALL YOUR POSTS?")) return;
  const uid = auth.currentUser.uid;
  const snap = await getDocs(query(collection(db, "posts"), where("uid", "==", uid), limit(200)));
  const batch = [];
  snap.forEach((d) => batch.push(deleteDoc(doc(db, "posts", d.id))));
  await Promise.all(batch);
  toast("POSTS PURGED (UP TO 200).");
}

/* =========================
   WIRE ALL BUTTONS
========================= */
document.addEventListener("DOMContentLoaded", () => {
  $("showRegBtn").onclick = () => {
    setScreen("registration-screen");
    $("reg-status-chip").textContent = "STAGE_1";
    $("reg-step-1").classList.remove("hidden");
    $("reg-step-2").classList.add("hidden");
    buildRegPickers("SEED");
  };

  $("returnToLoginBtn").onclick = () => setScreen("auth-screen");
  $("loginBtn").onclick = doLogin;

  $("nextStepBtn").onclick = beginRegistration;
  $("finalizeRegBtn").onclick = finalizeRegistration;

  $("postStatusBtn").onclick = createPost;
  $("refreshFeedBtn").onclick = loadFeedStream;

  $("logoutBtn").onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  $("renameBtn").onclick = renameEntity;
  $("updateTagBtn").onclick = updateTag;
  $("updateAvatarBtn").onclick = updateAvatar;
  $("updateCardBtn").onclick = updateCallingCard;
  $("purgeMyLogsBtn").onclick = purgeMyLogs;
  $("purgeMyPostsBtn").onclick = purgeMyPosts;

  $("closeProfileBtn").onclick = closeProfile;
  $("profile-modal").onclick = (e) => {
    if (e.target.id === "profile-modal") closeProfile();
  };

  $("open-builder-btn").onclick = openBuilder;
  $("closeBuilderBtn").onclick = closeBuilder;
  $("builder-modal").onclick = (e) => {
    if (e.target.id === "builder-modal") closeBuilder();
  };
  $("builder-days").onchange = buildBuilderDays;
  $("builder-create-btn").onclick = saveCustomSplit;
});
