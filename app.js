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
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ==========================================
   FIREBASE CONFIG
========================================== */
const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================================
   DATA: TAGS, RANKS, CARD STYLES, TROPHIES
========================================== */
const TAGS = [
  { id: "rust", css: "tag-rust", label: "RUST" },
  { id: "crt", css: "tag-crt", label: "CRT" },
  { id: "blood", css: "tag-blood", label: "BLOOD" },
  { id: "void", css: "tag-void", label: "VOID" }
];

const CARD_STYLES = [
  { id: "crypt", css: "style-crypt", label: "CRYPT" },
  { id: "inferno", css: "style-inferno", label: "INFERNO" },
  { id: "arcade", css: "style-arcade", label: "ARCADE" },
  { id: "null", css: "style-null", label: "NULL" }
];

const RANKS = [
  { min: 0, name: "NEWBORN", avatar: "WISP" },
  { min: 15, name: "STALKER", avatar: "SKULL" },
  { min: 40, name: "CRYPT_WALKER", avatar: "REAPER" },
  { min: 80, name: "GRAVE_LORD", avatar: "LICH" },
  { min: 140, name: "IMMORTAL", avatar: "ARCHON" }
];

/* Trophy rules (simple + satisfying; can expand easily) */
const TROPHY_RULES = [
  { id: "FIRST_BLOOD", label: "FIRST_BLOOD", type: "green", test: (s) => (s.totalLogs >= 1) },
  { id: "CARVER_25", label: "CARVER_25", type: "green", test: (s) => (s.totalLogs >= 25) },
  { id: "CARVER_100", label: "CARVER_100", type: "ice", test: (s) => (s.totalLogs >= 100) },

  { id: "BENCH_225", label: "BENCH_225", type: "blood", test: (s) => (s.bestBench >= 225) },
  { id: "SQUAT_315", label: "SQUAT_315", type: "blood", test: (s) => (s.bestSquat >= 315) },
  { id: "DEAD_405", label: "DEAD_405", type: "blood", test: (s) => (s.bestDead >= 405) }
];

/* ==========================================
   EXERCISE LIBRARY (BIG)
========================================== */
const EXERCISE_LIBRARY = {
  Chest: [
    "Barbell Bench Press","Incline Barbell Bench","Dumbbell Bench Press","Incline Dumbbell Press",
    "Machine Chest Press","Cable Fly","Pec Deck","Push-Ups","Dips (Chest Lean)"
  ],
  Back: [
    "Deadlift","Romanian Deadlift","Pull-Ups","Chin-Ups","Lat Pulldown","Chest-Supported Row",
    "Barbell Row","Cable Row","T-Bar Row","One-Arm Dumbbell Row","Face Pull","Back Extension"
  ],
  Shoulders: [
    "Overhead Press","Dumbbell Shoulder Press","Lateral Raise","Cable Lateral Raise",
    "Rear Delt Fly","Arnold Press","Upright Row (Light)","Shrugs"
  ],
  Legs: [
    "Back Squat","Front Squat","Hack Squat","Leg Press","Bulgarian Split Squat","Lunge",
    "Leg Extension","Hamstring Curl","Glute Bridge","Hip Thrust","Calf Raise","Adduction Machine","Abduction Machine"
  ],
  Arms: [
    "EZ-Bar Curl","Barbell Curl","Dumbbell Curl","Hammer Curl","Cable Curl",
    "Triceps Pushdown","Overhead Triceps Extension","Skull Crushers","Close-Grip Bench Press","Dips (Triceps)"
  ],
  Core: [
    "Hanging Leg Raise","Cable Crunch","Plank","Ab Wheel","Russian Twist","Back Extension (Core)"
  ]
};

const FLAT_EXERCISES = Object.values(EXERCISE_LIBRARY).flat();

/* ==========================================
   WORKOUT SPLITS (3–6 DAYS) + YOUR M–F 2× PLAN
   Each plan: id, name, daysPerWeek, goal, style, days: [{name, focus, exercises[]}]
========================================== */
const PLANS = [
  /* Your PDF plan (Monday–Friday, every muscle 2×/week) */
  {
    id: "mf_2x_compound",
    name: "M–F 2× FULL (COMPOUND+ACCESSORY)",
    daysPerWeek: 5,
    goal: "balanced",
    style: "fullbody",
    desc: "Your Monday–Friday 2×/week framework. Heavy compounds + targeted leg volume.",
    days: [
      { name: "MON – FULL BODY COMPOUND", focus: "Full Body", exercises: [
        "Back Squat","Barbell Bench Press","Barbell Row","Overhead Press","Romanian Deadlift","Triceps Pushdown"
      ]},
      { name: "TUE – LOWER A (FULL LEGS)", focus: "Legs", exercises: [
        "Hack Squat","Leg Press","Romanian Deadlift","Hamstring Curl","Hip Thrust","Leg Extension","Adduction Machine","Abduction Machine","Calf Raise"
      ]},
      { name: "WED – UPPER PUSH", focus: "Push", exercises: [
        "Incline Dumbbell Press","Machine Chest Press","Overhead Press","Lateral Raise","Dips (Triceps)","Skull Crushers"
      ]},
      { name: "THU – LOWER B (HINGE+GLUTES)", focus: "Legs", exercises: [
        "Deadlift","Hip Thrust","Bulgarian Split Squat","Leg Extension","Hamstring Curl","Adduction Machine","Abduction Machine","Calf Raise"
      ]},
      { name: "FRI – UPPER PULL + ARMS", focus: "Pull", exercises: [
        "Pull-Ups","Lat Pulldown","Cable Row","Face Pull","EZ-Bar Curl","Hammer Curl","Close-Grip Bench Press"
      ]}
    ]
  },

  /* 3-day Full Body */
  {
    id: "fb_3_hyper",
    name: "FULL BODY (3-DAY) // HYPER",
    daysPerWeek: 3,
    goal: "hypertrophy",
    style: "fullbody",
    desc: "Simple, brutal, repeatable. Great if you’re busy.",
    days: [
      { name: "DAY 1 – FULL", focus: "Full Body", exercises: ["Back Squat","Barbell Bench Press","Lat Pulldown","Lateral Raise","Triceps Pushdown","Dumbbell Curl"] },
      { name: "DAY 2 – FULL", focus: "Full Body", exercises: ["Leg Press","Incline Dumbbell Press","Cable Row","Face Pull","Skull Crushers","Hammer Curl"] },
      { name: "DAY 3 – FULL", focus: "Full Body", exercises: ["Romanian Deadlift","Machine Chest Press","Pull-Ups","Rear Delt Fly","Overhead Triceps Extension","EZ-Bar Curl"] }
    ]
  },

  /* 4-day Upper/Lower */
  {
    id: "ul_4_strength",
    name: "UPPER/LOWER (4-DAY) // STRENGTH",
    daysPerWeek: 4,
    goal: "strength",
    style: "upperlower",
    desc: "Heavy top sets + back-off volume. Strength-forward.",
    days: [
      { name: "UPPER A – HEAVY", focus: "Upper", exercises: ["Barbell Bench Press","Barbell Row","Overhead Press","Pull-Ups","Close-Grip Bench Press","Face Pull"] },
      { name: "LOWER A – HEAVY", focus: "Lower", exercises: ["Back Squat","Romanian Deadlift","Leg Press","Hamstring Curl","Calf Raise","Plank"] },
      { name: "UPPER B – VOLUME", focus: "Upper", exercises: ["Incline Barbell Bench","Cable Row","Dumbbell Shoulder Press","Lat Pulldown","Triceps Pushdown","Dumbbell Curl"] },
      { name: "LOWER B – VOLUME", focus: "Lower", exercises: ["Deadlift","Hack Squat","Hip Thrust","Leg Extension","Hamstring Curl","Hanging Leg Raise"] }
    ]
  },

  /* 5-day PPL+Arms (fits M–F) */
  {
    id: "ppl_5_plus",
    name: "PPL+ (5-DAY) // HYPER",
    daysPerWeek: 5,
    goal: "hypertrophy",
    style: "ppl",
    desc: "Push / Pull / Legs / Upper / Legs. High volume, high reward.",
    days: [
      { name: "PUSH", focus: "Push", exercises: ["Barbell Bench Press","Incline Dumbbell Press","Overhead Press","Lateral Raise","Triceps Pushdown"] },
      { name: "PULL", focus: "Pull", exercises: ["Deadlift","Pull-Ups","Cable Row","Lat Pulldown","Face Pull","EZ-Bar Curl"] },
      { name: "LEGS", focus: "Legs", exercises: ["Back Squat","Leg Press","Romanian Deadlift","Hamstring Curl","Calf Raise"] },
      { name: "UPPER (PUMP)", focus: "Upper", exercises: ["Machine Chest Press","Chest-Supported Row","Rear Delt Fly","Cable Fly","Dumbbell Curl","Skull Crushers"] },
      { name: "LEGS (GLUTES)", focus: "Legs", exercises: ["Hip Thrust","Hack Squat","Bulgarian Split Squat","Leg Extension","Adduction Machine","Abduction Machine"] }
    ]
  },

  /* 6-day PPL */
  {
    id: "ppl_6_classic",
    name: "PPL (6-DAY) // CLASSIC",
    daysPerWeek: 6,
    goal: "balanced",
    style: "ppl",
    desc: "Classic Push/Pull/Legs repeated. For monsters.",
    days: [
      { name: "PUSH A", focus: "Push", exercises: ["Barbell Bench Press","Incline Barbell Bench","Overhead Press","Lateral Raise","Triceps Pushdown"] },
      { name: "PULL A", focus: "Pull", exercises: ["Deadlift","Pull-Ups","Barbell Row","Face Pull","EZ-Bar Curl"] },
      { name: "LEGS A", focus: "Legs", exercises: ["Back Squat","Leg Press","Hamstring Curl","Calf Raise","Hanging Leg Raise"] },
      { name: "PUSH B", focus: "Push", exercises: ["Dumbbell Bench Press","Cable Fly","Dumbbell Shoulder Press","Lateral Raise","Skull Crushers"] },
      { name: "PULL B", focus: "Pull", exercises: ["Romanian Deadlift","Lat Pulldown","Cable Row","Rear Delt Fly","Hammer Curl"] },
      { name: "LEGS B", focus: "Legs", exercises: ["Hack Squat","Hip Thrust","Bulgarian Split Squat","Leg Extension","Adduction Machine","Abduction Machine"] }
    ]
  },

  /* 5-day Bro split (because people ask for it) */
  {
    id: "bro_5",
    name: "BRO_SPLIT (5-DAY) // PUMP",
    daysPerWeek: 5,
    goal: "hypertrophy",
    style: "bro",
    desc: "One focus per day. Simple. Savage.",
    days: [
      { name: "CHEST", focus: "Chest", exercises: EXERCISE_LIBRARY.Chest },
      { name: "BACK", focus: "Back", exercises: EXERCISE_LIBRARY.Back },
      { name: "SHOULDERS", focus: "Shoulders", exercises: EXERCISE_LIBRARY.Shoulders },
      { name: "LEGS", focus: "Legs", exercises: EXERCISE_LIBRARY.Legs },
      { name: "ARMS+CORE", focus: "Arms/Core", exercises: [...EXERCISE_LIBRARY.Arms, ...EXERCISE_LIBRARY.Core] }
    ]
  }
];

/* ==========================================
   STATE
========================================== */
let currentUser = null;
let currentUserData = null;
let selectedTagCss = "tag-rust";
let selectedCardStyle = "style-crypt";
let selectedRegPlanId = "mf_2x_compound";

let activePlan = null;         // plan object
let viewingProfileUid = null;  // whose profile panel is showing

/* ==========================================
   DOM HELPERS
========================================== */
const $ = (id) => document.getElementById(id);

function setVisible(el, show){
  if(!el) return;
  el.classList.toggle("hidden", !show);
}

function toast(msg){
  const box = $("system-feed");
  if(!box) return;
  const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const line = document.createElement("div");
  line.className = "lb-row";
  line.textContent = `[${now}] ${msg}`;
  box.prepend(line);
}

/* ==========================================
   RANK / TROPHY / PR HELPERS
========================================== */
function getRankFromCount(count){
  return RANKS.filter(r => (count || 0) >= r.min).pop() || RANKS[0];
}

function e1rm(weight, reps){
  const w = Number(weight || 0);
  const r = Number(reps || 0);
  if(!w || !r) return 0;
  // Epley
  return Math.round(w * (1 + r/30));
}

/* ==========================================
   AVATARS (SCARY SVG, ANIMATED)
   Seeded from UID so everyone looks consistent.
========================================== */
function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function makeAvatarSvg(seedStr, tierName){
  const seed = hashStr(seedStr || "deadweights");
  const a = (seed % 360);
  const eye = (seed % 5) + 1;
  const scars = (seed % 3);
  const horn = (seed % 2);

  // tiers influence intensity
  const tierBoost = (tierName === "IMMORTAL") ? 1 : (tierName === "GRAVE_LORD" ? 0.75 : 0.5);
  const glow = 0.35 + tierBoost * 0.35;

  const eyePath = [
    "M20 36 Q32 24 44 36 Q32 46 20 36 Z",
    "M20 36 Q32 18 44 36 Q32 54 20 36 Z",
    "M18 36 Q32 26 46 36 Q32 44 18 36 Z",
    "M18 36 Q32 20 46 36 Q32 52 18 36 Z",
    "M20 34 Q32 22 44 34 Q32 48 20 34 Z"
  ][eye-1];

  const scarLines = scars === 0 ? "" : (scars === 1
    ? `<path d="M18 52 L46 44" stroke="rgba(179,0,0,0.55)" stroke-width="2" />`
    : `<path d="M16 50 L44 42" stroke="rgba(179,0,0,0.55)" stroke-width="2" />
       <path d="M22 56 L50 48" stroke="rgba(179,0,0,0.45)" stroke-width="2" />`
  );

  const horns = horn
    ? `<path d="M18 18 Q14 6 24 10" fill="none" stroke="rgba(220,220,220,0.35)" stroke-width="3" />
       <path d="M46 18 Q50 6 40 10" fill="none" stroke="rgba(220,220,220,0.35)" stroke-width="3" />`
    : "";

  return `
  <svg viewBox="0 0 64 64" width="100%" height="100%" style="display:block">
    <defs>
      <radialGradient id="bg" cx="30%" cy="30%" r="80%">
        <stop offset="0%" stop-color="rgba(0,255,65,${0.10+glow*0.15})"/>
        <stop offset="55%" stop-color="rgba(0,0,0,0.9)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,1)"/>
      </radialGradient>
      <filter id="g">
        <feGaussianBlur stdDeviation="0.6" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#bg)"/>

    <g filter="url(#g)" transform="rotate(${a} 32 32)">
      <path d="M14 28 Q32 10 50 28 Q56 44 42 52 Q32 58 22 52 Q8 44 14 28Z"
            fill="rgba(255,255,255,0.07)" stroke="rgba(0,255,65,0.22)" stroke-width="2"/>

      ${horns}

      <path d="${eyePath}" fill="rgba(0,255,65,${0.45+glow*0.25})" stroke="rgba(0,255,65,0.35)" stroke-width="2"/>
      <circle cx="32" cy="36" r="5" fill="rgba(0,0,0,0.9)"/>
      <circle cx="34" cy="34" r="2" fill="rgba(255,255,255,0.5)"/>

      <path d="M22 46 Q32 52 42 46" fill="none" stroke="rgba(179,0,0,0.45)" stroke-width="2"/>

      ${scarLines}
    </g>

    <g opacity="0.12">
      <path d="M0 16 H64" stroke="rgba(0,255,65,0.55)" />
      <path d="M0 32 H64" stroke="rgba(0,255,65,0.35)" />
      <path d="M0 48 H64" stroke="rgba(0,255,65,0.25)" />
    </g>
  </svg>`;
}

function mountAvatar(targetEl, seedStr, tierName){
  if(!targetEl) return;
  targetEl.innerHTML = makeAvatarSvg(seedStr, tierName);

  // simple “alive” animation without external libs
  const svg = targetEl.querySelector("svg");
  if(svg){
    svg.style.animation = "avatarFloat 3.2s ease-in-out infinite";
    const style = document.createElement("style");
    style.textContent = `
      @keyframes avatarFloat{
        0%{ transform: translateY(0) scale(1); filter: drop-shadow(0 0 6px rgba(0,255,65,0.25)); }
        50%{ transform: translateY(-2px) scale(1.01); filter: drop-shadow(0 0 12px rgba(0,255,65,0.35)); }
        100%{ transform: translateY(0) scale(1); filter: drop-shadow(0 0 6px rgba(0,255,65,0.25)); }
      }`;
    document.head.appendChild(style);
  }
}

/* ==========================================
   AUTH FLOW
========================================== */
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if(user){
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if(!snap.exists()){
      // user exists in Auth but not in Firestore -> send to registration step 2
      showRegistration();
      return;
    }

    currentUserData = snap.data();

    // If flagged/disabled, boot them (front-end hint; rules should enforce properly)
    if(currentUserData.disabled){
      await signOut(auth);
      $("login-warn").textContent = "ACCESS_DENIED: ENTITY_DISABLED";
      return;
    }

    // Show app
    setVisible($("auth-screen"), false);
    setVisible($("registration-screen"), false);
    setVisible($("app"), true);

    initApp();
  } else {
    // Logged out
    setVisible($("app"), false);
    setVisible($("registration-screen"), false);
    setVisible($("auth-screen"), true);
  }
});

/* ==========================================
   UI NAV (tabs)
========================================== */
function showTab(id){
  const panels = ["feed-panel","plans-panel","profile-panel","friends-panel","settings-panel"];
  panels.forEach(p => setVisible($(p), p === id));
}

function showAuth(){
  setVisible($("registration-screen"), false);
  setVisible($("auth-screen"), true);
}

function showRegistration(){
  setVisible($("auth-screen"), false);
  setVisible($("registration-screen"), true);
}

/* ==========================================
   INIT APP
========================================== */
function initApp(){
  // header
  $("header-callsign").textContent = currentUserData.username || "SUBJECT";
  const rank = getRankFromCount(currentUserData.carvingCount || 0);
  $("header-rank").textContent = rank.name;

  // role
  const role = currentUserData.role || "user";
  $("role-chip").textContent = role.toUpperCase();
  setVisible($("admin-box"), role === "admin");

  // tag + card style
  const tagCss = currentUserData.tagCss || "tag-rust";
  const cardStyle = currentUserData.cardStyle || "style-crypt";

  $("user-grave-tag").className = `grave-tag ${tagCss}`;
  $("user-grave-tag").querySelector(".tag-text").textContent = (currentUserData.tagLabel || "CADAVER");

  // calling card styling
  const cc = $("calling-card");
  cc.classList.remove(...CARD_STYLES.map(s => s.css));
  cc.classList.add(cardStyle);

  // avatar
  mountAvatar($("avatarWrap"), auth.currentUser.uid, rank.name);

  // active plan
  const planId = currentUserData.activePlanId || null;
  activePlan = planId ? PLANS.find(p => p.id === planId) : null;
  $("active-plan-label").textContent = activePlan ? `ACTIVE_SPLIT: ${activePlan.name}` : "NO_ACTIVE_SPLIT";

  // trophies render (from cached user trophies)
  renderTrophies(currentUserData.trophies || []);

  // settings UI
  buildTagPickers();
  buildCardStylePicker();
  hydrateSettings();

  // plans panel
  buildPlansList();       // based on current filters
  hydrateLogUI();         // day+exercise dropdown from active plan
  wireListeners();

  // social
  liveFeed();
  liveLeaderboard();
  livePRStrip();
  liveWorkoutHistory();
  loadFriends();
  wireSearch();
  wireAdminSearch();

  // profile (default to self)
  openProfile(auth.currentUser.uid, true);

  toast("ENTITY_RESURRECTED");
}

/* ==========================================
   SETTINGS UI
========================================== */
function buildTagPickers(){
  // settings picker
  const s = $("settings-tag-picker");
  if(s){
    s.innerHTML = TAGS.map(t =>
      `<div class="tag-opt ${t.css}" data-tagcss="${t.css}" data-taglabel="${t.label}"></div>`
    ).join("");
  }

  // registration picker
  const r = $("initial-tag-picker");
  if(r){
    r.innerHTML = TAGS.map(t =>
      `<div class="tag-opt ${t.css}" data-tagcss="${t.css}" data-taglabel="${t.label}"></div>`
    ).join("");
  }

  // activate current
  const activeCss = currentUserData?.tagCss || "tag-rust";
  document.querySelectorAll("[data-tagcss]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-tagcss") === activeCss);
  });
}

function buildCardStylePicker(){
  const wrap = $("card-style-picker");
  if(!wrap) return;
  wrap.innerHTML = CARD_STYLES.map(s => {
    return `<div class="card-style ${s.css}" data-cardstyle="${s.css}" title="${s.label}"></div>`;
  }).join("");

  const active = currentUserData?.cardStyle || "style-crypt";
  wrap.querySelectorAll("[data-cardstyle]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-cardstyle") === active);
  });
}

function hydrateSettings(){
  $("privacy-hide-lifts").checked = !!currentUserData.hideLifts;
}

async function saveSettingsPatch(patch){
  const userRef = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userRef, patch);
  currentUserData = { ...currentUserData, ...patch };
}

/* ==========================================
   PLANS: FILTER + RENDER + ACTIVATE
========================================== */
function planMatchesFilters(p){
  const days = Number($("plan-days").value || 5);
  const goal = $("plan-goal").value || "hypertrophy";
  const style = $("plan-style").value || "any";

  const daysOk = p.daysPerWeek === days;
  const goalOk = (goal === "balanced") ? true : (p.goal === goal || p.goal === "balanced");
  const styleOk = (style === "any") ? true : (p.style === style);

  return daysOk && goalOk && styleOk;
}

function buildPlansList(){
  const list = $("plans-list");
  if(!list) return;

  const filtered = PLANS.filter(planMatchesFilters);

  list.innerHTML = filtered.map(p => {
    const isActive = (currentUserData.activePlanId === p.id);
    return `
      <div class="plan-card">
        <div class="plan-title">${p.name}</div>
        <div class="plan-sub">
          ${p.daysPerWeek} DAYS • ${p.goal.toUpperCase()} • ${p.style.toUpperCase()}
          <span class="dot">•</span>${p.desc}
        </div>
        <div class="plan-actions">
          <button class="mini-btn" data-preview="${p.id}">PREVIEW</button>
          <button class="${isActive ? "mini-btn danger" : "mini-btn"}" data-activate="${p.id}">
            ${isActive ? "ACTIVE" : "ACTIVATE"}
          </button>
        </div>
      </div>
    `;
  }).join("");

  // if filter yields nothing, show fallback suggestions
  if(filtered.length === 0){
    list.innerHTML = `
      <div class="plan-card">
        <div class="plan-title">NO_SPLITS_FOUND</div>
        <div class="plan-sub">Try DAYS/WEEK = 5 or STYLE = ANY.</div>
      </div>
    `;
  }
}

function buildRegPlanPicker(){
  const wrap = $("reg-plan-picker");
  if(!wrap) return;

  // show a couple starter options (5-day default + one 4-day)
  const picks = [
    "mf_2x_compound",
    "ppl_5_plus",
    "ul_4_strength",
    "fb_3_hyper"
  ].map(id => PLANS.find(p => p.id === id)).filter(Boolean);

  wrap.innerHTML = picks.map(p => `
    <div class="plan-mini ${p.id === selectedRegPlanId ? "active" : ""}" data-regplan="${p.id}">
      <div class="t">${p.name}</div>
      <div class="s">${p.daysPerWeek} DAYS • ${p.goal.toUpperCase()}</div>
    </div>
  `).join("");
}

async function activatePlan(planId){
  const plan = PLANS.find(p => p.id === planId);
  if(!plan) return;

  await saveSettingsPatch({
    activePlanId: plan.id,
    activePlanName: plan.name
  });

  activePlan = plan;
  $("active-plan-label").textContent = `ACTIVE_SPLIT: ${plan.name}`;

  hydrateLogUI();
  buildPlansList();

  toast(`SPLIT_ACTIVATED: ${plan.name}`);
}

function hydrateLogUI(){
  const daySel = $("log-day");
  const exSel = $("log-ex");
  const chip = $("log-day-chip");

  if(!daySel || !exSel) return;

  if(!activePlan){
    daySel.innerHTML = `<option value="">NO_ACTIVE_SPLIT</option>`;
    exSel.innerHTML = `<option value="">ACTIVATE_SPLIT_FIRST</option>`;
    chip.textContent = "DAY_NONE";
    $("log-hint").textContent = "Activate a split to unlock day templates + dropdowns.";
    return;
  }

  daySel.innerHTML = activePlan.days.map((d, idx) =>
    `<option value="${idx}">${d.name}</option>`
  ).join("");

  const dayIdx = Number(daySel.value || 0);
  const day = activePlan.days[dayIdx];
  chip.textContent = (day?.focus || "DAY").toUpperCase();

  // exercises: plan day list + fallback big library
  const pool = [...new Set([...(day?.exercises || []), ...FLAT_EXERCISES])];
  exSel.innerHTML = pool.map(e => `<option value="${e}">${e}</option>`).join("");

  $("log-hint").textContent = `Logging for: ${activePlan.name} → ${day.name}`;
}

/* ==========================================
   LOGGING + PRs + TROPHIES
========================================== */
async function submitLog(){
  if(!activePlan){
    toast("NO_ACTIVE_SPLIT");
    return;
  }
  const dayIdx = Number($("log-day").value || 0);
  const day = activePlan.days[dayIdx];

  const exercise = $("log-ex").value;
  const weight = Number($("log-w").value);
  const reps = Number($("log-r").value);

  if(!exercise || !weight || !reps){
    toast("MISSING_FIELDS");
    return;
  }

  const log = {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    planId: activePlan.id,
    planName: activePlan.name,
    dayName: day?.name || "DAY",
    exercise,
    weight,
    reps,
    e1rm: e1rm(weight, reps),
    timestamp: serverTimestamp()
  };

  await addDoc(collection(db, "logs"), log);

  // increment carvingCount (rank progress)
  const newCount = (currentUserData.carvingCount || 0) + 1;
  await saveSettingsPatch({ carvingCount: newCount });

  // update PRs
  await upsertPR(exercise, weight, reps);

  // trophies
  await recomputeTrophies();

  // refresh local UI
  const rank = getRankFromCount(newCount);
  $("user-rank").textContent = rank.name;
  $("header-rank").textContent = rank.name;
  mountAvatar($("avatarWrap"), auth.currentUser.uid, rank.name);

  $("log-w").value = "";
  $("log-r").value = "";

  toast(`CARVING_RECORDED: ${exercise} ${weight}x${reps}`);
}

async function upsertPR(exercise, weight, reps){
  const prRef = doc(db, "users", auth.currentUser.uid, "prs", sanitizeKey(exercise));
  const snap = await getDoc(prRef);

  const bestE = e1rm(weight, reps);
  const entry = {
    exercise,
    bestWeight: weight,
    bestReps: reps,
    bestE1RM: bestE,
    updatedAt: serverTimestamp()
  };

  if(!snap.exists()){
    await setDoc(prRef, entry);
    return;
  }

  const prev = snap.data();
  const prevE = Number(prev.bestE1RM || 0);

  // update if better e1rm or heavier weight
  if(bestE > prevE || weight > Number(prev.bestWeight || 0)){
    await setDoc(prRef, {
      ...prev,
      ...entry,
      bestWeight: Math.max(Number(prev.bestWeight||0), weight),
      bestE1RM: Math.max(prevE, bestE)
    }, { merge: true });
  }
}

function sanitizeKey(s){
  // Firestore doc id safe-ish
  return String(s).replace(/[\/#\?\[\]]/g, "_").slice(0, 120);
}

async function recomputeTrophies(){
  // derive stats from PRs + total logs
  const prsSnap = await getDocs(query(collection(db, "users", auth.currentUser.uid, "prs"), limit(200)));

  let bestBench = 0, bestSquat = 0, bestDead = 0;
  prsSnap.forEach(d => {
    const pr = d.data();
    const ex = (pr.exercise || "").toLowerCase();
    const bw = Number(pr.bestWeight || 0);

    if(ex.includes("bench")) bestBench = Math.max(bestBench, bw);
    if(ex.includes("squat")) bestSquat = Math.max(bestSquat, bw);
    if(ex.includes("deadlift")) bestDead = Math.max(bestDead, bw);
  });

  const totalLogs = Number(currentUserData.carvingCount || 0);
  const stats = { bestBench, bestSquat, bestDead, totalLogs };

  const earned = TROPHY_RULES.filter(t => t.test(stats)).map(t => ({
    id: t.id,
    label: t.label,
    type: t.type
  }));

  await saveSettingsPatch({ trophies: earned });
  renderTrophies(earned);
}

function renderTrophies(list){
  const strip = $("trophy-strip");
  if(!strip) return;

  if(!list || list.length === 0){
    strip.innerHTML = `<span class="trophy">NO_TROPHIES_YET</span>`;
    return;
  }
  strip.innerHTML = list.slice(0, 12).map(t =>
    `<span class="trophy ${t.type || ""}">${t.label}</span>`
  ).join("");
}

/* ==========================================
   FEED + POSTS + DELETE OWN POSTS + COMMENTS
========================================== */
function liveFeed(){
  const feed = $("feed-content");
  if(!feed) return;

  const q = query(collection(db, "posts"), orderBy("timestamp","desc"), limit(25));
  onSnapshot(q, (snap) => {
    feed.innerHTML = "";
    snap.forEach((d) => {
      const p = d.data();
      const mine = p.uid === auth.currentUser.uid;
      const admin = (currentUserData.role === "admin");
      const canDelete = mine || admin;

      const date = p.timestamp?.toDate ? p.timestamp.toDate() : null;
      const dateStr = date ? date.toLocaleString() : "";

      feed.innerHTML += `
        <div class="grave-box post">
          <div class="grave-header-sub">
            <span>
              <a class="userlink" data-user="${p.uid}">${escapeHtml(p.username || "UNKNOWN")}</a>
              <span class="chip">${p.anon ? "ANON" : "LIVE"}</span>
            </span>
            <span class="post-tools">
              <span class="chip">${escapeHtml(dateStr)}</span>
              ${canDelete ? `<button class="mini-btn danger" data-delpost="${d.id}">DELETE</button>` : ""}
            </span>
          </div>

          <div class="grave-body">
            <p>${escapeHtml(p.text || "")}</p>
          </div>

          <div class="comment-section" id="comments-${d.id}"></div>

          <div class="comment-input-wrap">
            <input id="in-${d.id}" placeholder="REPLY...">
            <button class="mini-btn" data-comment="${d.id}">SEND</button>
          </div>
        </div>
      `;

      liveComments(d.id);
    });
  });
}

function liveComments(postId){
  const cbox = $(`comments-${postId}`);
  if(!cbox) return;

  const q = query(collection(db, `posts/${postId}/comments`), orderBy("timestamp","asc"), limit(50));
  onSnapshot(q, (snap) => {
    cbox.innerHTML = "";
    snap.forEach((c) => {
      const data = c.data();
      cbox.innerHTML += `<div class="comment"><b>${escapeHtml(data.username || "???")}:</b> ${escapeHtml(data.text || "")}</div>`;
    });
  });
}

async function postComment(postId){
  const input = $(`in-${postId}`);
  const text = (input?.value || "").trim();
  if(!text) return;

  await addDoc(collection(db, `posts/${postId}/comments`), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  input.value = "";
}

async function deletePost(postId){
  // NOTE: rules must enforce ownership/admin
  await deleteDoc(doc(db, "posts", postId));
  toast("POST_DELETED");
}

async function createPost({ anon=false }){
  const text = ($("statusText").value || "").trim();
  if(!text) return;

  await addDoc(collection(db, "posts"), {
    uid: auth.currentUser.uid,
    username: anon ? "ANON_ENTITY" : currentUserData.username,
    anon,
    text,
    timestamp: serverTimestamp()
  });

  $("statusText").value = "";
  toast("TRANSMITTED");
}

/* ==========================================
   LEADERBOARD
========================================== */
function liveLeaderboard(){
  const lb = $("leaderboard");
  if(!lb) return;

  const q = query(collection(db, "users"), orderBy("carvingCount","desc"), limit(5));
  onSnapshot(q, (snap) => {
    lb.innerHTML = "";
    snap.forEach((d, i) => {
      const u = d.data();
      lb.innerHTML += `<div class="lb-row">#${i+1} ${escapeHtml(u.username || "???")} [${u.carvingCount || 0}]</div>`;
    });
  });
}

/* ==========================================
   PR PANEL (right column)
========================================== */
function livePRStrip(){
  const prList = $("prList");
  if(!prList) return;

  const q = query(collection(db, "users", auth.currentUser.uid, "prs"), orderBy("bestE1RM","desc"), limit(20));
  onSnapshot(q, (snap) => {
    if(snap.empty){
      prList.innerHTML = `<div class="index-row"><span>NO_PRS_YET</span></div>`;
      return;
    }
    prList.innerHTML = "";
    snap.forEach((d) => {
      const pr = d.data();
      prList.innerHTML += `
        <div class="index-row">
          <span>${escapeHtml(pr.exercise)} — <b>${pr.bestWeight}lbs</b> • e1RM <b>${pr.bestE1RM}</b></span>
        </div>
      `;
    });
  });
}

/* ==========================================
   WORKOUT HISTORY (plans panel)
========================================== */
function liveWorkoutHistory(){
  const box = $("workout-history");
  if(!box) return;

  const q = query(collection(db, "logs"),
    where("uid","==",auth.currentUser.uid),
    orderBy("timestamp","desc"),
    limit(20)
  );

  onSnapshot(q, (snap) => {
    if(snap.empty){
      box.innerHTML = `<div class="index-row"><span>NO_LOGS_YET</span></div>`;
      return;
    }
    box.innerHTML = "";
    snap.forEach((d) => {
      const l = d.data();
      const date = l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : "";
      box.innerHTML += `
        <div class="index-row">
          <span>
            <b>${escapeHtml(l.dayName || "DAY")}</b> • ${escapeHtml(l.exercise)} — ${l.weight}x${l.reps}
            <span class="chip">e1RM ${l.e1rm || "?"}</span>
            <span class="chip">${escapeHtml(date)}</span>
          </span>
          <button class="mini-btn danger" data-dellog="${d.id}">X</button>
        </div>
      `;
    });
  });
}

async function deleteLog(logId){
  // NOTE: rules must enforce uid ownership
  await deleteDoc(doc(db, "logs", logId));
  toast("LOG_DELETED");
}

/* ==========================================
   FRIENDS + SEARCH
========================================== */
async function loadFriends(){
  const list = $("friends-list");
  if(!list) return;

  const ids = currentUserData.friends || [];
  if(ids.length === 0){
    list.innerHTML = `<div class="tiny-note">NO_COVEN_MEMBERS_YET</div>`;
    return;
  }

  list.innerHTML = "";
  for(const uid of ids){
    const snap = await getDoc(doc(db, "users", uid));
    if(snap.exists()){
      const u = snap.data();
      list.innerHTML += `
        <div class="index-row">
          <span><a class="userlink" data-user="${uid}">${escapeHtml(u.username || "???")}</a></span>
          <button class="mini-btn danger" data-unfriend="${uid}">SEVER</button>
        </div>
      `;
    }
  }
}

async function addFriend(uid){
  await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(uid) });
  currentUserData.friends = [...(currentUserData.friends || []), uid];
  toast("CONNECTION_ESTABLISHED");
  loadFriends();
}

async function removeFriend(uid){
  await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayRemove(uid) });
  currentUserData.friends = (currentUserData.friends || []).filter(x => x !== uid);
  toast("CONNECTION_SEVERED");
  loadFriends();
}

function wireSearch(){
  const input = $("userSearch");
  const results = $("search-results");
  if(!input || !results) return;

  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const term = (input.value || "").trim().toLowerCase();
      if(term.length < 2){
        results.innerHTML = `<div class="tiny-note">TYPE_2+_CHARS</div>`;
        return;
      }

      // requires users.usernameLower field
      const q = query(
        collection(db, "users"),
        where("usernameLower", ">=", term),
        where("usernameLower", "<=", term + "\uf8ff"),
        limit(10)
      );

      const snap = await getDocs(q);
      if(snap.empty){
        results.innerHTML = `<div class="tiny-note">NO_ENTITIES_FOUND</div>`;
        return;
      }

      results.innerHTML = "";
      snap.forEach(d => {
        const u = d.data();
        const isMe = d.id === auth.currentUser.uid;
        const already = (currentUserData.friends || []).includes(d.id);

        results.innerHTML += `
          <div class="index-row">
            <span><a class="userlink" data-user="${d.id}">${escapeHtml(u.username || "???")}</a></span>
            ${isMe ? `<span class="chip">YOU</span>` : (already
              ? `<span class="chip">FRIEND</span>`
              : `<button class="mini-btn" data-addfriend="${d.id}">BIND</button>`
            )}
          </div>
        `;
      });
    }, 250);
  });
}

/* ==========================================
   PROFILE PAGES (self + click to view others)
========================================== */
async function openProfile(uid, isSelf = false){
  viewingProfileUid = uid;

  const chip = $("profile-chip");
  chip.textContent = isSelf ? "SELF" : "ENTITY";

  const snap = await getDoc(doc(db, "users", uid));
  if(!snap.exists()) return;

  const u = snap.data();
  const count = u.carvingCount || 0;
  const rank = getRankFromCount(count);

  $("profileNameBig").textContent = u.username || "SUBJECT";
  $("profileMeta").textContent =
    `RANK ${rank.name} • CARVINGS ${count} • ${u.activePlanName ? "ACTIVE " + u.activePlanName : "NO_ACTIVE_SPLIT"}`;

  // avatar
  mountAvatar($("profileAvatar"), uid, rank.name);

  // badges
  const badges = $("profileBadges");
  const trophies = (u.trophies || []).slice(0, 10);
  badges.innerHTML = trophies.length
    ? trophies.map(t => `<span class="trophy ${t.type || ""}">${t.label}</span>`).join("")
    : `<span class="trophy">NO_TROPHIES</span>`;

  // PR hall (unless hidden)
  const prHall = $("pr-hall");
  if(u.hideLifts && !isSelf){
    prHall.innerHTML = `<div class="tiny-note">LIFTS_HIDDEN_BY_ENTITY</div>`;
  } else {
    const prsSnap = await getDocs(query(collection(db, "users", uid, "prs"), orderBy("bestE1RM","desc"), limit(10)));
    if(prsSnap.empty){
      prHall.innerHTML = `<div class="tiny-note">NO_PRS_RECORDED</div>`;
    } else {
      prHall.innerHTML = prsSnap.docs.map(d => {
        const pr = d.data();
        return `<div class="lb-row">${escapeHtml(pr.exercise)} — <b>${pr.bestWeight}lbs</b> • e1RM <b>${pr.bestE1RM}</b></div>`;
      }).join("");
    }
  }

  // posts
  const postsBox = $("profile-posts");
  postsBox.innerHTML = `<div class="tiny-note">SCANNING_POSTS...</div>`;
  const postSnap = await getDocs(query(collection(db, "posts"), where("uid","==",uid), orderBy("timestamp","desc"), limit(10)));
  if(postSnap.empty){
    postsBox.innerHTML = `<div class="tiny-note">NO_POSTS_FOUND</div>`;
  } else {
    postsBox.innerHTML = postSnap.docs.map(d => {
      const p = d.data();
      const date = p.timestamp?.toDate ? p.timestamp.toDate().toLocaleString() : "";
      return `<div class="lb-row">${escapeHtml(date)} • ${escapeHtml(p.text || "").slice(0,140)}${(p.text||"").length>140?"…":""}</div>`;
    }).join("");
  }

  showTab("profile-panel");
  toast(isSelf ? "PROFILE_OPENED: SELF" : `PROFILE_OPENED: ${u.username || "ENTITY"}`);
}

/* ==========================================
   ADMIN: quick user lookup (front-end)
========================================== */
function wireAdminSearch(){
  const box = $("admin-box");
  if(!box) return;

  const input = $("admin-user-lookup");
  const results = $("admin-user-results");
  if(!input || !results) return;

  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const term = (input.value || "").trim().toLowerCase();
      if(term.length < 2){
        results.innerHTML = `<div class="tiny-note">TYPE_2+_CHARS</div>`;
        return;
      }

      const q = query(
        collection(db, "users"),
        where("usernameLower", ">=", term),
        where("usernameLower", "<=", term + "\uf8ff"),
        limit(10)
      );
      const snap = await getDocs(q);
      if(snap.empty){
        results.innerHTML = `<div class="tiny-note">NO_RESULTS</div>`;
        return;
      }

      results.innerHTML = "";
      snap.forEach(d => {
        const u = d.data();
        results.innerHTML += `
          <div class="index-row">
            <span>${escapeHtml(u.username || "???")} <span class="chip">${(u.role||"user").toUpperCase()}</span></span>
            <button class="mini-btn danger" data-flag="${d.id}">FLAG</button>
          </div>
        `;
      });
    }, 250);
  });
}

async function flagUser(uid){
  // NOTE: rules must restrict to admins
  await updateDoc(doc(db, "users", uid), { flagged: true });
  toast("ENTITY_FLAGGED");
}

/* ==========================================
   REGISTRATION (2-step)
========================================== */
async function regContinue(){
  const email = ($("reg-email").value || "").trim();
  const pass = $("reg-pass").value || "";
  const conf = $("reg-confirm").value || "";

  $("reg-warn").textContent = "";

  if(!email || !pass || pass.length < 6){
    $("reg-warn").textContent = "PASSCODE_TOO_SHORT (6+)";
    return;
  }
  if(pass !== conf){
    $("reg-warn").textContent = "PASSCODE_MISMATCH";
    return;
  }

  // proceed to step 2, build pickers
  setVisible($("reg-step-1"), false);
  setVisible($("reg-step-2"), true);
  buildTagPickers();
  buildRegPlanPicker();
}

async function regFinalize(){
  const email = ($("reg-email").value || "").trim();
  const pass = $("reg-pass").value || "";
  const username = ($("reg-username").value || "").trim();

  $("reg-warn-2").textContent = "";

  if(!username || username.length < 3){
    $("reg-warn-2").textContent = "CALLSIGN_TOO_SHORT";
    return;
  }

  // create auth user
  const cred = await createUserWithEmailAndPassword(auth, email, pass);

  // default picks
  const tagLabel = selectedTagCss.includes("crt") ? "CRT" :
                   selectedTagCss.includes("blood") ? "BLOOD" :
                   selectedTagCss.includes("void") ? "VOID" : "RUST";

  const userDoc = {
    username,
    usernameLower: username.toLowerCase(),
    createdAt: serverTimestamp(),

    // visuals
    tagCss: selectedTagCss,
    tagLabel: tagLabel,
    cardStyle: selectedCardStyle,

    // social
    friends: [],

    // progression
    carvingCount: 0,
    trophies: [],

    // plans
    activePlanId: selectedRegPlanId,
    activePlanName: (PLANS.find(p => p.id === selectedRegPlanId)?.name || ""),

    // flags/roles
    role: "user",
    flagged: false,
    disabled: false,

    // privacy
    hideLifts: false
  };

  await setDoc(doc(db, "users", cred.user.uid), userDoc);

  toast("RECRUIT_BOUND_TO_GRAVE");
}

/* ==========================================
   LISTENERS (single mount)
========================================== */
let wired = false;
function wireListeners(){
  if(wired) return;
  wired = true;

  // tab buttons
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      showTab(btn.getAttribute("data-tab"));
      if(btn.getAttribute("data-tab") === "plans-panel"){
        hydrateLogUI();
      }
    });
  });

  // auth
  $("showRegBtn").onclick = () => showRegistration();
  $("returnToLoginBtn").onclick = () => showAuth();

  $("loginBtn").onclick = async () => {
    $("login-warn").textContent = "";
    try{
      await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
    }catch(e){
      $("login-warn").textContent = "LOGIN_FAILED: " + (e?.code || "UNKNOWN");
    }
  };

  $("logoutBtn").onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  // registration buttons
  $("nextStepBtn").onclick = regContinue;
  $("finalizeRegBtn").onclick = regFinalize;

  // tag click (both reg + settings pickers)
  document.body.addEventListener("click", async (e) => {
    const tagEl = e.target.closest("[data-tagcss]");
    if(tagEl){
      document.querySelectorAll("[data-tagcss]").forEach(x => x.classList.remove("active"));
      tagEl.classList.add("active");
      selectedTagCss = tagEl.getAttribute("data-tagcss");

      // if already logged in, update preview only; commit on button
      if(currentUserData){
        $("user-grave-tag").className = `grave-tag ${selectedTagCss}`;
      }
    }

    const cardEl = e.target.closest("[data-cardstyle]");
    if(cardEl){
      document.querySelectorAll("[data-cardstyle]").forEach(x => x.classList.remove("active"));
      cardEl.classList.add("active");
      selectedCardStyle = cardEl.getAttribute("data-cardstyle");

      // preview
      const cc = $("calling-card");
      if(cc){
        cc.classList.remove(...CARD_STYLES.map(s => s.css));
        cc.classList.add(selectedCardStyle);
      }
    }

    const regPlan = e.target.closest("[data-regplan]");
    if(regPlan){
      document.querySelectorAll("[data-regplan]").forEach(x => x.classList.remove("active"));
      regPlan.classList.add("active");
      selectedRegPlanId = regPlan.getAttribute("data-regplan");
    }

    // plan activate/preview
    const act = e.target.closest("[data-activate]");
    if(act){
      const id = act.getAttribute("data-activate");
      await activatePlan(id);
    }

    const prev = e.target.closest("[data-preview]");
    if(prev){
      const id = prev.getAttribute("data-preview");
      const p = PLANS.find(x => x.id === id);
      if(p){
        toast(`PREVIEW: ${p.name}`);
        // quick preview = set day dropdown temporarily (no save)
        activePlan = p;
        hydrateLogUI();
        // revert after short delay if you already had an active plan saved
        setTimeout(() => {
          const saved = currentUserData.activePlanId ? PLANS.find(z => z.id === currentUserData.activePlanId) : null;
          activePlan = saved;
          hydrateLogUI();
        }, 1200);
      }
    }

    // delete post / log / comment action
    const delPost = e.target.closest("[data-delpost]");
    if(delPost) await deletePost(delPost.getAttribute("data-delpost"));

    const delLog = e.target.closest("[data-dellog]");
    if(delLog) await deleteLog(delLog.getAttribute("data-dellog"));

    const cBtn = e.target.closest("[data-comment]");
    if(cBtn) await postComment(cBtn.getAttribute("data-comment"));

    const userLink = e.target.closest("[data-user]");
    if(userLink){
      const uid = userLink.getAttribute("data-user");
      const isSelf = uid === auth.currentUser.uid;
      await openProfile(uid, isSelf);
    }

    const addF = e.target.closest("[data-addfriend]");
    if(addF) await addFriend(addF.getAttribute("data-addfriend"));

    const unF = e.target.closest("[data-unfriend]");
    if(unF) await removeFriend(unF.getAttribute("data-unfriend"));

    const flag = e.target.closest("[data-flag]");
    if(flag) await flagUser(flag.getAttribute("data-flag"));
  });

  // feed post buttons
  $("postStatusBtn").onclick = () => createPost({ anon:false });
  $("postStatusAnonBtn").onclick = () => createPost({ anon:true });

  // plan filters
  $("applyPlanFiltersBtn").onclick = () => buildPlansList();
  $("plan-days").onchange = () => buildPlansList();
  $("plan-goal").onchange = () => buildPlansList();
  $("plan-style").onchange = () => buildPlansList();

  // log panel
  $("log-day").onchange = () => hydrateLogUI();
  $("submitLogBtn").onclick = submitLog;

  $("addExerciseBtn").onclick = async () => {
    const ex = prompt("ADD_EXERCISE_NAME:");
    if(!ex) return;
    if(activePlan){
      const idx = Number($("log-day").value || 0);
      activePlan.days[idx].exercises = [...new Set([...(activePlan.days[idx].exercises || []), ex])];
      hydrateLogUI();
      toast("EXERCISE_ADDED_TO_DAY (LOCAL)");
    }
  };

  // settings buttons
  $("renameBtn").onclick = async () => {
    const newName = ($("new-username").value || "").trim();
    if(!newName || newName.length < 3){
      toast("CALLSIGN_TOO_SHORT");
      return;
    }
    await saveSettingsPatch({ username: newName, usernameLower: newName.toLowerCase() });
    toast("IDENTITY_UPDATED");
    location.reload();
  };

  $("updateTagBtn").onclick = async () => {
    await saveSettingsPatch({ tagCss: selectedTagCss, tagLabel: selectedTagCss.includes("blood") ? "BLOOD" : (selectedTagCss.includes("crt") ? "CRT" : (selectedTagCss.includes("void") ? "VOID" : "RUST")) });
    toast("TAG_UPDATED");
    location.reload();
  };

  $("saveCardStyleBtn").onclick = async () => {
    await saveSettingsPatch({ cardStyle: selectedCardStyle });
    toast("CALLING_CARD_SEALED");
    location.reload();
  };

  $("privacy-hide-lifts").onchange = async () => {
    await saveSettingsPatch({ hideLifts: $("privacy-hide-lifts").checked });
    toast("PRIVACY_UPDATED");
  };
}

/* ==========================================
   UTILS
========================================== */
function escapeHtml(str){
  return String(str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
