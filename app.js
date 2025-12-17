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
const esc = (s="") => String(s)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

function toast(msg){
  // simple, grim. (You can replace w/ a nicer UI later.)
  alert(msg);
}

function todayKey(){
  // local day key (good enough for “what day is it” UX)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function niceDate(ts){
  try{
    return ts?.toDate().toLocaleString();
  }catch{
    return "";
  }
}

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

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
  { id:"BENCH_225", label:"BENCH 225+ (e1RM)", key:"Bench Press", min:225 },
  { id:"SQUAT_315", label:"SQUAT 315+ (e1RM)", key:"Back Squats", min:315 },
  { id:"DEAD_405",  label:"DEADLIFT 405+ (e1RM)", key:"Deadlifts", min:405 },
  { id:"OHP_135",   label:"OHP 135+ (e1RM)", key:"Overhead Press", min:135 },
  { id:"ROW_225",   label:"ROW 225+ (e1RM)", key:"Barbell Rows", min:225 },
];

/* Calling Cards (animated themes). Some locked by rank/trophy. */
const CALLING_CARDS = [
  { id:"rust_sigils", name:"RUST_SIGILS", req:{ rankMin:0 }, fx:"sigils" },
  { id:"crt_wraith",  name:"CRT_WRAITH", req:{ rankMin:10 }, fx:"wraith" },
  { id:"blood_oath",  name:"BLOOD_OATH", req:{ rankMin:50 }, fx:"blood" },
  { id:"void_howl",   name:"VOID_HOWL", req:{ rankMin:100 }, fx:"howl" },
  { id:"trophy_reaper", name:"REAPER_TROPHY", req:{ trophy:"DEAD_405" }, fx:"reaper" },
];

/* Grave Tags */
const TAGS = [
  { id:"rust",  css:"tag-rust",  label:"RUST"  },
  { id:"crt",   css:"tag-crt",   label:"CRT"   },
  { id:"blood", css:"tag-blood", label:"BLOOD" },
  { id:"void",  css:"tag-void",  label:"VOID"  }
];

/* =========================
   EXERCISE POOLS (big index)
========================= */
const EXERCISES = {
  "Push": [
    "Bench Press","Incline DB Press","Incline Bench Press","Overhead Press","Seated DB Press",
    "Dips","Close-Grip Bench","Skull Crushers","Rope Pushdowns","Cable Fly","DB Fly",
    "Lateral Raises","Front Raises","Rear Delt Fly","Machine Chest Press","Pec Deck"
  ],
  "Pull": [
    "Deadlifts","RDLs","Barbell Rows","DB Rows","Lat Pulldown","Pull Ups","Chin Ups",
    "Seated Cable Row","Face Pulls","Shrugs","Back Extensions",
    "Bicep Curls","EZ-Bar Curls","Hammer Curls","Preacher Curls","Incline DB Curls"
  ],
  "Legs": [
    "Back Squats","Front Squats","Leg Press","Hack Squat","Lunges","Bulgarian Split Squat",
    "Leg Extensions","Hamstring Curls","Hip Thrust","Glute Bridge","Calf Raises",
    "Step Ups","Good Mornings","Adductor Machine","Abductor Machine"
  ],
  "Core": [
    "Hanging Leg Raises","Cable Crunch","Ab Wheel","Plank","Side Plank","Russian Twists"
  ],
  "Conditioning": [
    "Row Machine","Bike Sprint","Incline Treadmill","Farmer Walk","Sled Push"
  ]
};

function allExercises(){
  const set = new Set();
  Object.values(EXERCISES).flat().forEach(x => set.add(x));
  return Array.from(set).sort();
}

/* =========================
   BUILT-IN SPLITS (3–5 day)
   - Each has days[] with { name, category, exercises[] }
========================= */
const BUILT_IN_PLANS = [
  {
    id: "crypt_ppl_3",
    name: "CRYPT_PPL // 3-DAY",
    vibe: "Minimal days. Max brutality. (Push/Pull/Legs)",
    days: [
      { name:"DAY_1 PUSH", category:"Push", exercises:["Bench Press","Overhead Press","Incline DB Press","Lateral Raises","Rope Pushdowns"] },
      { name:"DAY_2 PULL", category:"Pull", exercises:["Deadlifts","Barbell Rows","Lat Pulldown","Face Pulls","EZ-Bar Curls"] },
      { name:"DAY_3 LEGS", category:"Legs", exercises:["Back Squats","Leg Press","RDLs","Leg Extensions","Calf Raises"] }
    ]
  },
  {
    id: "wraith_ul_4",
    name: "WRAITH_U/L // 4-DAY",
    vibe: "Upper/Lower twice. Strong + aesthetic.",
    days: [
      { name:"DAY_1 UPPER_A", category:"Push", exercises:["Bench Press","Barbell Rows","Overhead Press","Lat Pulldown","Skull Crushers"] },
      { name:"DAY_2 LOWER_A", category:"Legs", exercises:["Back Squats","RDLs","Leg Press","Hamstring Curls","Calf Raises"] },
      { name:"DAY_3 UPPER_B", category:"Push", exercises:["Incline DB Press","Seated Cable Row","Dips","Face Pulls","Hammer Curls"] },
      { name:"DAY_4 LOWER_B", category:"Legs", exercises:["Front Squats","Hip Thrust","Leg Extensions","Hamstring Curls","Lunges"] }
    ]
  },
  {
    id: "gravefive_hybrid_5",
    name: "GRAVEFIVE // 5-DAY",
    vibe: "Every muscle 2×/week (weekday friendly).",
    days: [
      { name:"DAY_1 FULL_BODY_COMPOUND", category:"Legs", exercises:["Back Squats","Bench Press","Barbell Rows","Overhead Press","Hanging Leg Raises"] },
      { name:"DAY_2 UPPER_PULL+PUSH", category:"Pull", exercises:["Deadlifts","Lat Pulldown","Incline DB Press","Face Pulls","EZ-Bar Curls"] },
      { name:"DAY_3 LOWER_A", category:"Legs", exercises:["Leg Press","RDLs","Lunges","Leg Extensions","Calf Raises"] },
      { name:"DAY_4 LOWER_B_POSTERIOR", category:"Legs", exercises:["Hip Thrust","Hamstring Curls","Back Extensions","Adductor Machine","Abductor Machine"] },
      { name:"DAY_5 ARMS+SHOULDERS", category:"Push", exercises:["Seated DB Press","Lateral Raises","Preacher Curls","Rope Pushdowns","Close-Grip Bench"] }
    ]
  },
  {
    id: "immortal_phul_5",
    name: "IMMORTAL_PHUL // 5-DAY",
    vibe: "Power + hypertrophy. Heavy days + pump days.",
    days: [
      { name:"DAY_1 UPPER_POWER", category:"Push", exercises:["Bench Press","Barbell Rows","Overhead Press","Pull Ups","Close-Grip Bench"] },
      { name:"DAY_2 LOWER_POWER", category:"Legs", exercises:["Back Squats","Deadlifts","Leg Press","Calf Raises","Plank"] },
      { name:"DAY_3 UPPER_HYPER", category:"Push", exercises:["Incline DB Press","Seated Cable Row","Dips","Face Pulls","Hammer Curls"] },
      { name:"DAY_4 LOWER_HYPER", category:"Legs", exercises:["Front Squats","RDLs","Leg Extensions","Hamstring Curls","Lunges"] },
      { name:"DAY_5 OPTIONAL_COND", category:"Conditioning", exercises:["Row Machine","Bike Sprint","Farmer Walk","Sled Push","Ab Wheel"] }
    ]
  },
  {
    id: "void_fullbody_3",
    name: "VOID_FULLBODY // 3-DAY",
    vibe: "Full body 3×. Great for consistency + strength.",
    days: [
      { name:"DAY_1 FULLBODY_A", category:"Legs", exercises:["Back Squats","Bench Press","Barbell Rows","Lateral Raises","Cable Crunch"] },
      { name:"DAY_2 FULLBODY_B", category:"Pull", exercises:["Deadlifts","Incline DB Press","Lat Pulldown","Face Pulls","Hammer Curls"] },
      { name:"DAY_3 FULLBODY_C", category:"Legs", exercises:["Leg Press","Overhead Press","Seated Cable Row","Dips","Hanging Leg Raises"] }
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
let selectedPlanId = null; // chosen in UI before activation
let manualCategory = "Push";

/* =========================
   AVATAR FACTORY (scary, animated, no image hosting needed)
========================= */
function avatarSVG(style="skull", seed="X"){
  // Deterministic-ish color jitter from seed
  let h = 0;
  for(const ch of seed) h = (h*31 + ch.charCodeAt(0)) % 360;

  const glow = `hsla(${(h+110)%360}, 100%, 55%, 0.45)`;
  const rim  = `hsla(${(h+0)%360}, 85%, 50%, 0.22)`;

  const base = `
    <svg viewBox="0 0 120 120" class="avatar-sigil" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="35%" cy="30%">
          <stop offset="0%" stop-color="${glow}"/>
          <stop offset="65%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="f">
          <feGaussianBlur stdDeviation="1.2" result="b"/>
          <feMerge>
            <feMergeNode in="b"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
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

function renderAvatarInto(el, style, seed){
  el.innerHTML = avatarSVG(style, seed);
}

/* =========================
   UI HELPERS
========================= */
function setScreen(which){
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.add("hidden");
  $("app").classList.add("hidden");
  $(which).classList.remove("hidden");
}

function setTab(tabId){
  ["feed-panel","plans-panel","friends-panel","settings-panel"].forEach(id => $(id).classList.add("hidden"));
  $(tabId).classList.remove("hidden");
}

function computeRankName(carvingCount=0){
  const r = RANKS.filter(x => carvingCount >= x.min).pop() || RANKS[0];
  return r.name;
}

function cardUnlocked(user){
  const carvingCount = user?.carvingCount || 0;
  const rankName = computeRankName(carvingCount);
  const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
  const trophies = user?.trophies || {};
  return CALLING_CARDS.map(c => {
    const okRank = (c.req?.rankMin ?? -999) <= carvingCount;
    const okTrophy = c.req?.trophy ? !!trophies[c.req.trophy] : true;
    return { ...c, unlocked: okRank && okTrophy, rankObj };
  });
}

function planById(id, user){
  // built-ins + user custom plans stored in user doc
  const built = BUILT_IN_PLANS.find(p => p.id === id);
  if(built) return built;

  const customs = user?.customPlans || [];
  return customs.find(p => p.id === id) || null;
}

/* =========================
   AUTH FLOW (FIXED BUTTONS)
========================= */
async function doLogin(){
  const em = $("email").value.trim();
  const pw = $("password").value.trim();
  $("auth-warn").textContent = "";
  if(!em || !pw){ $("auth-warn").textContent = "MISSING CREDENTIALS."; return; }

  try{
    await signInWithEmailAndPassword(auth, em, pw);
  }catch(e){
    $("auth-warn").textContent = (e?.message || "LOGIN FAILED.").toUpperCase();
  }
}

async function beginRegistration(){
  const em = $("reg-email").value.trim();
  const pw = $("reg-pass").value.trim();
  const c  = $("reg-confirm").value.trim();
  $("reg-warn").textContent = "";

  if(!em || !pw){ $("reg-warn").textContent = "EMAIL/PASSCODE REQUIRED."; return; }
  if(pw.length < 6){ $("reg-warn").textContent = "PASSCODE MUST BE 6+ CHARS."; return; }
  if(pw !== c){ $("reg-warn").textContent = "PASSCODES DO NOT MATCH."; return; }

  try{
    await createUserWithEmailAndPassword(auth, em, pw);
    // move to stage 2
    $("reg-status-chip").textContent = "STAGE_2";
    $("reg-step-1").classList.add("hidden");
    $("reg-step-2").classList.remove("hidden");
  }catch(e){
    $("reg-warn").textContent = (e?.message || "REG FAILED.").toUpperCase();
  }
}

async function finalizeRegistration(){
  const user = auth.currentUser;
  const callsign = $("reg-username").value.trim();
  $("reg-warn").textContent = "";

  if(!user){ $("reg-warn").textContent = "NO AUTH USER FOUND."; return; }
  if(!callsign || callsign.length < 3){ $("reg-warn").textContent = "CALLSIGN 3+ CHARS."; return; }

  const nowKey = todayKey();

  const payload = {
    uid: user.uid,
    username: callsign,
    tag: selectedTagCss || "tag-rust",
    avatar: selectedAvatar || "skull",
    callingCard: selectedCard || "rust_sigils",
    carvingCount: 0,
    friends: [],
    trophies: {},
    prs: {},            // { exercise: { bestE1RM, bestWeight, bestReps, updatedAt } }
    activePlan: null,   // { planId, startDayIndex, startKey, lastComputedKey }
    customPlans: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginDayKey: nowKey
  };

  try{
    await setDoc(doc(db,"users", user.uid), payload, { merge:true });
    toast("ENTITY_BOUND. WELCOME TO THE GRAVE.");
  }catch(e){
    $("reg-warn").textContent = (e?.message || "FINALIZE FAILED.").toUpperCase();
  }
}

/* =========================
   CORE APP INIT
========================= */
onAuthStateChanged(auth, async (user) => {
  if(!user){
    currentUserData = null;
    setScreen("auth-screen");
    return;
  }

  // Load user doc
  const snap = await getDoc(doc(db,"users", user.uid));
  if(!snap.exists()){
    // user exists in Auth but not in Firestore -> send to stage2
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

function initApp(){
  // Header + profile
  $("header-callsign").textContent = currentUserData.username;
  $("profileUsername").textContent = currentUserData.username;

  const rankName = computeRankName(currentUserData.carvingCount || 0);
  $("user-rank").textContent = rankName;
  $("header-rank").textContent = `// ${rankName}`;

  // Tag
  const tagCss = currentUserData.tag || "tag-rust";
  $("user-grave-tag").className = `grave-tag ${tagCss}`;
  $("tag-text").textContent = (TAGS.find(t => t.css===tagCss)?.label || "CADAVER");

  // Avatar
  renderAvatarInto($("avatar-frame"), currentUserData.avatar || "skull", currentUserData.uid);

  // Active split label
  $("active-split-label").textContent = currentUserData.activePlan?.planId
    ? (planById(currentUserData.activePlan.planId, currentUserData)?.name || "ACTIVE")
    : "NONE";

  // Build UI pickers
  buildSettingsPickers();
  buildStartDaySelect();

  // Populate manual logger selects
  buildManualLogger();

  // Load streams
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

  // default tab
  setTab("feed-panel");
}

/* =========================
   NAV BUTTONS (fixes “buttons don’t work”)
========================= */
function hookNavButtons(){
  document.querySelectorAll(".mini-btn[data-tab]").forEach(btn => {
    btn.onclick = () => setTab(btn.getAttribute("data-tab"));
  });
}

/* =========================
   REGISTRATION PICKERS
========================= */
function buildRegPickers(seed){
  // tags
  const wrap = $("initial-tag-picker");
  wrap.innerHTML = "";
  TAGS.forEach((t, idx) => {
    const div = document.createElement("div");
    div.className = `tag-opt ${t.css} ${idx===0 ? "active":""}`;
    div.onclick = () => {
      selectedTagCss = t.css;
      wrap.querySelectorAll(".tag-opt").forEach(x => x.classList.remove("active"));
      div.classList.add("active");
    };
    wrap.appendChild(div);
  });
  selectedTagCss = TAGS[0].css;

  // avatars
  const aw = $("avatar-picker");
  aw.innerHTML = "";
  const options = ["skull","wraith","reaper","skull"];
  options.forEach((a, idx) => {
    const div = document.createElement("div");
    div.className = `avatar-opt ${idx===0 ? "active":""}`;
    div.innerHTML = avatarSVG(a, seed);
    div.onclick = () => {
      selectedAvatar = a;
      aw.querySelectorAll(".avatar-opt").forEach(x => x.classList.remove("active"));
      div.classList.add("active");
    };
    aw.appendChild(div);
  });
  selectedAvatar = options[0];

  // cards default
  selectedCard = "rust_sigils";
}

/* =========================
   SETTINGS PICKERS (tag/avatar/card)
========================= */
function buildSettingsPickers(){
  // TAG picker
  const tagWrap = $("settings-tag-picker");
  tagWrap.innerHTML = "";
  TAGS.forEach(t => {
    const div = document.createElement("div");
    div.className = `tag-opt ${t.css} ${currentUserData.tag===t.css ? "active":""}`;
    div.onclick = () => {
      selectedTagCss = t.css;
      tagWrap.querySelectorAll(".tag-opt").forEach(x => x.classList.remove("active"));
      div.classList.add("active");
    };
    tagWrap.appendChild(div);
  });
  selectedTagCss = currentUserData.tag || "tag-rust";

  // Avatar picker
  const avWrap = $("settings-avatar-picker");
  avWrap.innerHTML = "";
  const avatarOptions = ["skull","wraith","reaper","skull"];
  avatarOptions.forEach(a => {
    const div = document.createElement("div");
    div.className = `avatar-opt ${(currentUserData.avatar||"skull")===a ? "active":""}`;
    div.innerHTML = avatarSVG(a, currentUserData.uid);
    div.onclick = () => {
      selectedAvatar = a;
      avWrap.querySelectorAll(".avatar-opt").forEach(x => x.classList.remove("active"));
      div.classList.add("active");
    };
    avWrap.appendChild(div);
  });
  selectedAvatar = currentUserData.avatar || "skull";

  // Card picker
  const cards = cardUnlocked(currentUserData);
  const cardWrap = $("card-picker");
  cardWrap.innerHTML = "";
  cards.forEach(c => {
    const div = document.createElement("div");
    div.className = `plan-card ${currentUserData.callingCard===c.id ? "active":""}`;
    div.style.cursor = c.unlocked ? "pointer" : "not-allowed";
    div.style.opacity = c.unlocked ? "1" : "0.55";
    div.innerHTML = `
      <div class="plan-name">${esc(c.name)}</div>
      <div class="plan-sub">${c.unlocked ? "UNLOCKED" : "LOCKED"}</div>
    `;
    div.onclick = () => {
      if(!c.unlocked) return;
      selectedCard = c.id;
      cardWrap.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
      div.classList.add("active");
    };
    cardWrap.appendChild(div);
  });
  selectedCard = currentUserData.callingCard || "rust_sigils";
}

/* =========================
   MANUAL LOGGER
========================= */
function buildManualLogger(){
  const catSel = $("log-category");
  const exSel = $("log-ex");

  catSel.innerHTML = Object.keys(EXERCISES).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("");
  catSel.value = "Push";
  manualCategory = "Push";

  function refreshExercises(){
    const cat = catSel.value;
    manualCategory = cat;
    exSel.innerHTML = EXERCISES[cat].map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  }
  catSel.onchange = refreshExercises;
  refreshExercises();

  $("manualLogBtn").onclick = async () => {
    const ex = exSel.value;
    const w  = Number($("log-w").value);
    const r  = Number($("log-r").value);
    if(!ex || !w || !r) return toast("MISSING LOG FIELDS.");
    await submitLog(ex, w, r, { source: "manual" });
    $("log-w").value = "";
    $("log-r").value = "";
  };
}

/* =========================
   FEED (posts + delete own posts + profile click)
========================= */
let feedUnsub = null;

function loadFeedStream(){
  if(feedUnsub) feedUnsub();

  const qy = query(collection(db,"posts"), orderBy("timestamp","desc"), limit(25));
  feedUnsub = onSnapshot(qy, (snap) => {
    const feed = $("feed-content");
    feed.innerHTML = "";

    snap.forEach(docSnap => {
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

      // profile open
      postEl.querySelector(".who").onclick = () => openProfile(p.uid);

      // delete own post
      const delBtn = postEl.querySelector(`[data-del="${docSnap.id}"]`);
      if(delBtn){
        delBtn.onclick = async () => {
          if(!confirm("DELETE YOUR POST?")) return;
          await deleteDoc(doc(db,"posts", docSnap.id));
        };
      }

      // comment send
      postEl.querySelector(`[data-cmt="${docSnap.id}"]`).onclick = () => postComment(docSnap.id);

      // comments stream
      loadCommentsStream(docSnap.id);
    });
  });
}

function loadCommentsStream(postId){
  const cBox = $(`comments-${postId}`);
  if(!cBox) return;

  const qy = query(collection(db, `posts/${postId}/comments`), orderBy("timestamp","asc"), limit(50));
  onSnapshot(qy, (snap) => {
    cBox.innerHTML = "";
    snap.forEach(c => {
      const d = c.data();
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<b>${esc(d.username||"ENTITY")}:</b> ${esc(d.text||"")}`;
      cBox.appendChild(div);
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
    timestamp: serverTimestamp(),
    dayKey: todayKey()
  });

  input.value = "";
}

/* Post broadcast */
async function createPost(){
  const text = $("statusText").value.trim();
  if(!text) return;

  await addDoc(collection(db,"posts"), {
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
function loadLeaderboardStream(){
  const qy = query(collection(db,"users"), orderBy("carvingCount","desc"), limit(7));
  onSnapshot(qy, (snap) => {
    const lb = $("leaderboard");
    lb.innerHTML = "";
    let i = 1;
    snap.forEach(d => {
      const u = d.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>#${i} <span class="dim">${esc(u.username||"ENTITY")}</span></span>
        <span>${esc(String(u.carvingCount||0))}</span>
      `;
      row.onclick = () => openProfile(d.id);
      lb.appendChild(row);
      i++;
    });
  });
}

/* =========================
   PRS + TROPHIES (auto)
========================= */
function e1rm(weight, reps){
  // Epley estimate
  return Math.round(weight * (1 + (reps/30)));
}

function renderTrophies(){
  const trophies = currentUserData.trophies || {};
  const earned = Object.keys(trophies).filter(k => trophies[k]);
  $("trophy-count").textContent = String(earned.length);

  const wrap = $("trophy-list");
  wrap.innerHTML = "";

  TROPHIES.forEach(t => {
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

function loadPRStream(){
  const uid = auth.currentUser.uid;
  const qy = query(collection(db,"logs"), where("uid","==",uid), orderBy("timestamp","desc"), limit(40));

  onSnapshot(qy, (snap) => {
    $("stat-count").textContent = String(currentUserData.carvingCount || 0);

    // show last logs as “PR index”
    const wrap = $("prList");
    wrap.innerHTML = "";

    snap.forEach(d => {
      const L = d.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>${esc(L.exercise)} <span class="dim">${esc(String(L.weight))}LBS × ${esc(String(L.reps))}</span></span>
        <button class="mini-btn danger">X</button>
      `;
      row.querySelector("button").onclick = async () => {
        if(!confirm("DELETE THIS LOG?")) return;
        await deleteLog(d.id, L);
      };
      wrap.appendChild(row);
    });
  });
}

/* =========================
   LOGGING + MASSGRAVE (daily total)
========================= */
async function submitLog(exercise, weight, reps, meta={}){
  const uid = auth.currentUser.uid;
  const dk = todayKey();
  const vol = Math.round(weight * reps);

  // add log
  const ref = await addDoc(collection(db,"logs"), {
    uid,
    exercise,
    weight,
    reps,
    volume: vol,
    dayKey: dk,
    timestamp: serverTimestamp(),
    source: meta.source || "plan",
    planId: meta.planId || null,
    planDayIndex: (meta.planDayIndex ?? null)
  });

  // increment user carving count
  await updateDoc(doc(db,"users", uid), {
    carvingCount: increment(1),
    updatedAt: serverTimestamp()
  });

  // update daily massgrave doc
  await updateDoc(doc(db,"dailyTotals", dk), {
    totalVolume: increment(vol),
    updatedAt: serverTimestamp()
  }).catch(async () => {
    // doc might not exist
    await setDoc(doc(db,"dailyTotals", dk), {
      dayKey: dk,
      totalVolume: vol,
      updatedAt: serverTimestamp()
    }, { merge:true });
  });

  // refresh local user snapshot-ish (cheap) then run PR updates
  currentUserData.carvingCount = (currentUserData.carvingCount || 0) + 1;

  await updatePRsAndTrophies(exercise, weight, reps);

  // update UI bits
  $("user-rank").textContent = computeRankName(currentUserData.carvingCount);
  $("header-rank").textContent = `// ${computeRankName(currentUserData.carvingCount)}`;
  loadDailyMassGrave();
}

async function deleteLog(logId, logData){
  const uid = auth.currentUser.uid;

  // delete log
  await deleteDoc(doc(db,"logs", logId));

  // decrement user count
  await updateDoc(doc(db,"users", uid), {
    carvingCount: increment(-1),
    updatedAt: serverTimestamp()
  });

  // decrement daily total
  const dk = logData.dayKey || todayKey();
  const vol = Number(logData.volume || (Number(logData.weight)*Number(logData.reps)) || 0);

  await updateDoc(doc(db,"dailyTotals", dk), {
    totalVolume: increment(-vol),
    updatedAt: serverTimestamp()
  }).catch(()=>{});

  currentUserData.carvingCount = Math.max(0, (currentUserData.carvingCount||0) - 1);
  $("user-rank").textContent = computeRankName(currentUserData.carvingCount);
  $("header-rank").textContent = `// ${computeRankName(currentUserData.carvingCount)}`;
  loadDailyMassGrave();
}

/* PR map + trophies */
async function updatePRsAndTrophies(exercise, weight, reps){
  const uid = auth.currentUser.uid;
  const prs = currentUserData.prs || {};
  const trophies = currentUserData.trophies || {};

  const est = e1rm(weight, reps);

  const prev = prs[exercise] || { bestE1RM: 0, bestWeight: 0, bestReps: 0 };
  const improvedE = est > (prev.bestE1RM || 0);
  const improvedW = weight > (prev.bestWeight || 0);

  if(improvedE || improvedW){
    prs[exercise] = {
      bestE1RM: Math.max(prev.bestE1RM||0, est),
      bestWeight: Math.max(prev.bestWeight||0, weight),
      bestReps: improvedW ? reps : (prev.bestReps || reps),
      updatedAt: Date.now()
    };
  }

  // trophies check
  for(const t of TROPHIES){
    if(trophies[t.id]) continue;
    if(t.key !== exercise) continue;
    if(est >= t.min){
      trophies[t.id] = true;
      // unlock special calling card maybe later
    }
  }

  // persist
  await updateDoc(doc(db,"users", uid), { prs, trophies, updatedAt: serverTimestamp() });

  currentUserData.prs = prs;
  currentUserData.trophies = trophies;

  renderTrophies();
}

/* Daily MassGrave read */
function loadDailyMassGrave(){
  const dk = todayKey();
  onSnapshot(doc(db,"dailyTotals", dk), (snap) => {
    const total = snap.exists() ? (snap.data().totalVolume || 0) : 0;
    $("massgrave-value").textContent = String(total);
  });
}

/* =========================
   FRIENDS + SEARCH + PROFILE PAGES
========================= */
function loadFriendsUI(){
  renderFriendsList();

  $("userSearch").oninput = async () => {
    const term = $("userSearch").value.trim();
    const box = $("search-results");
    box.innerHTML = "";
    if(term.length < 2) return;

    // Firestore doesn't do contains; we'll do prefix-ish by storing usernameLower (not required here)
    // For now: cheap top users, filter client-side.
    const snap = await getDocs(query(collection(db,"users"), orderBy("username"), limit(25)));
    const found = [];
    snap.forEach(d => {
      const u = d.data();
      if((u.username||"").toLowerCase().includes(term.toLowerCase()) && d.id !== auth.currentUser.uid){
        found.push({ id:d.id, ...u });
      }
    });

    found.slice(0,12).forEach(u => {
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

function renderFriendsList(){
  const list = $("friends-list");
  list.innerHTML = "";
  const friends = currentUserData.friends || [];
  if(!friends.length){
    list.innerHTML = `<div class="hint"><span class="hint-dot"></span>No friends yet. Search callsigns to add.</div>`;
    return;
  }

  friends.forEach(async (fid) => {
    const s = await getDoc(doc(db,"users", fid));
    if(!s.exists()) return;
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

async function addFriend(targetUid){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { friends: arrayUnion(targetUid), updatedAt: serverTimestamp() });
  currentUserData.friends = Array.from(new Set([...(currentUserData.friends||[]), targetUid]));
  toast("CONNECTION_ESTABLISHED");
  renderFriendsList();
}

async function removeFriend(targetUid){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { friends: arrayRemove(targetUid), updatedAt: serverTimestamp() });
  currentUserData.friends = (currentUserData.friends||[]).filter(x => x !== targetUid);
  toast("CONNECTION_SEVERED");
  renderFriendsList();
}

/* Profile modal */
async function openProfile(uid){
  const snap = await getDoc(doc(db,"users", uid));
  if(!snap.exists()) return;

  const u = snap.data();
  $("profile-modal").classList.remove("hidden");
  $("modal-title").textContent = "ENTITY_PROFILE";
  $("modal-name").textContent = u.username || "ENTITY";
  $("modal-rank").textContent = `RANK: ${computeRankName(u.carvingCount||0)}`;
  $("modal-stats").textContent = `CARVINGS: ${u.carvingCount||0}  //  TROPHIES: ${Object.keys(u.trophies||{}).filter(k=>u.trophies[k]).length}`;

  renderAvatarInto($("modal-avatar"), u.avatar || "skull", uid);

  const isFriend = (currentUserData.friends||[]).includes(uid);
  const isMe = uid === auth.currentUser.uid;

  const friendBtn = $("modal-friend-btn");
  friendBtn.textContent = isMe ? "THIS_IS_YOU" : (isFriend ? "REMOVE_FRIEND" : "ADD_FRIEND");
  friendBtn.className = isMe ? "mini-btn" : (isFriend ? "mini-btn danger" : "mini-btn");

  friendBtn.onclick = async () => {
    if(isMe) return;
    if((currentUserData.friends||[]).includes(uid)) await removeFriend(uid);
    else await addFriend(uid);
    $("profile-modal").classList.add("hidden");
  };

  $("modal-posts").innerHTML = `<div class="hint"><span class="hint-dot"></span>Click “VIEW_POSTS” to load latest broadcasts.</div>`;
  $("modal-view-posts-btn").onclick = async () => {
    const qy = query(collection(db,"posts"), where("uid","==", uid), orderBy("timestamp","desc"), limit(10));
    const ps = await getDocs(qy);
    const wrap = $("modal-posts");
    wrap.innerHTML = "";
    ps.forEach(p => {
      const d = p.data();
      const card = document.createElement("div");
      card.className = "plan-card";
      card.innerHTML = `
        <div class="plan-name">${esc(d.dayKey || "")}</div>
        <div class="plan-sub">${esc(d.text || "")}</div>
      `;
      wrap.appendChild(card);
    });
    if(!ps.size){
      wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>No public broadcasts found.</div>`;
    }
  };
}

/* close profile */
function closeProfile(){
  $("profile-modal").classList.add("hidden");
}

/* =========================
   PLANS: INDEX + ACTIVATE + DAY START + TODAY LOGGER + SWAPS
========================= */
function buildStartDaySelect(){
  const sel = $("start-day-select");
  sel.innerHTML = "";
  const days = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
  days.forEach((d, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = d;
    sel.appendChild(opt);
  });

  // default: today
  sel.value = String(new Date().getDay() === 0 ? 6 : new Date().getDay()-1); // Mon=0..Sun=6
}

function renderPlansIndex(){
  const wrap = $("plan-index");
  wrap.innerHTML = "";

  // Built-ins
  BUILT_IN_PLANS.forEach(p => {
    const card = document.createElement("div");
    card.className = `plan-card ${selectedPlanId===p.id ? "active":""}`;
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
      wrap.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
    };
    btns[1].onclick = () => activatePlan(p.id);

    wrap.appendChild(card);
  });

  // Custom plans
  const customs = currentUserData.customPlans || [];
  if(customs.length){
    const sep = document.createElement("div");
    sep.className = "small-label";
    sep.style.marginTop = "18px";
    sep.textContent = "CUSTOM_SPLITS";
    wrap.appendChild(sep);

    customs.forEach(p => {
      const card = document.createElement("div");
      card.className = `plan-card ${selectedPlanId===p.id ? "active":""}`;
      card.innerHTML = `
        <div class="plan-name">${esc(p.name)}</div>
        <div class="plan-sub">FORGED: ${esc(String(p.days?.length||0))} DAYS</div>
        <div class="btn-row" style="margin-top:10px;">
          <button class="mini-btn">SELECT</button>
          <button class="mini-btn">ACTIVATE</button>
        </div>
      `;
      const btns = card.querySelectorAll("button");
      btns[0].onclick = () => {
        selectedPlanId = p.id;
        wrap.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
        card.classList.add("active");
      };
      btns[1].onclick = () => activatePlan(p.id);
      wrap.appendChild(card);
    });
  }

  // Buttons
  $("start-auto-btn").onclick = () => {
    const idx = new Date().getDay() === 0 ? 6 : new Date().getDay()-1;
    $("start-day-select").value = String(idx);
    toast("START DAY SET TO TODAY.");
  };
}

async function activatePlan(planId){
  const plan = planById(planId, currentUserData);
  if(!plan) return toast("PLAN NOT FOUND.");

  // startDayIndex: 0..6 (Mon..Sun), but plan days are 0..N-1
  const startDayIndex = Number($("start-day-select").value || 0);
  const dk = todayKey();

  const active = {
    planId,
    startDayIndex, // user’s chosen “week start day”
    startKey: dk,  // when activated
    lastComputedKey: dk
  };

  await updateDoc(doc(db,"users", auth.currentUser.uid), {
    activePlan: active,
    updatedAt: serverTimestamp()
  });

  currentUserData.activePlan = active;
  $("active-split-label").textContent = plan.name;
  toast("SPLIT ACTIVATED.");

  renderActivePlanStatus();
  renderTodayWorkoutLogger();
}

function deactivatePlan(){
  updateDoc(doc(db,"users", auth.currentUser.uid), { activePlan: null, updatedAt: serverTimestamp() });
  currentUserData.activePlan = null;
  $("active-split-label").textContent = "NONE";
  toast("SPLIT DEACTIVATED.");
  renderActivePlanStatus();
  renderTodayWorkoutLogger();
}

function planDayForToday(){
  const ap = currentUserData.activePlan;
  if(!ap) return null;

  const plan = planById(ap.planId, currentUserData);
  if(!plan) return null;

  // We map actual weekday into plan day index based on chosen “start weekday”
  // weekdayMon0: 0..6
  const weekdayMon0 = (new Date().getDay() === 0 ? 6 : new Date().getDay()-1);
  const offset = (weekdayMon0 - ap.startDayIndex + 7) % 7; // 0..6
  const planIndex = offset % plan.days.length; // wrap through plan days

  return { plan, planIndex, weekdayMon0 };
}

function renderActivePlanStatus(){
  const wrap = $("active-plan-readout");
  const ap = currentUserData.activePlan;

  if(!ap){
    wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>No active split. Activate one from the index above.</div>`;
    $("active-day-chip").textContent = "DAY_?";
    return;
  }

  const plan = planById(ap.planId, currentUserData);
  if(!plan){
    wrap.innerHTML = `<div class="hint"><span class="hint-dot"></span>Active split missing.</div>`;
    return;
  }

  const info = planDayForToday();
  const todayDay = info ? plan.days[info.planIndex] : null;

  $("active-day-chip").textContent = info ? `DAY_${info.planIndex+1}` : "DAY_?";

  wrap.innerHTML = `
    <div class="day-badge">
      <div class="dname">${esc(plan.name)}</div>
      <div class="dlist">
        <div style="margin-top:8px;"><span class="dim">TODAY:</span> ${esc(todayDay?.name || "UNKNOWN")}</div>
        <div style="margin-top:8px;"><span class="dim">START WEEKDAY:</span> ${["MON","TUE","WED","THU","FRI","SAT","SUN"][ap.startDayIndex]}</div>
        <div style="margin-top:8px;"><span class="dim">ACTIVATED:</span> ${esc(ap.startKey || "")}</div>
      </div>
    </div>
  `;

  $("deactivate-plan-btn").onclick = deactivatePlan;

  // “SET_TODAY_DAY”: lets user override startDayIndex to make today be Day_1 if desired
  $("jump-day-btn").onclick = async () => {
    const weekdayMon0 = (new Date().getDay() === 0 ? 6 : new Date().getDay()-1);
    const newStart = weekdayMon0; // makes offset 0 => planIndex 0 today
    await updateDoc(doc(db,"users", auth.currentUser.uid), {
      activePlan: { ...ap, startDayIndex: newStart, lastComputedKey: todayKey() },
      updatedAt: serverTimestamp()
    });
    currentUserData.activePlan.startDayIndex = newStart;
    toast("TODAY SET TO DAY_1.");
    renderActivePlanStatus();
    renderTodayWorkoutLogger();
  };
}

function renderTodayWorkoutLogger(){
  const box = $("today-workout-list");
  box.innerHTML = "";

  const info = planDayForToday();
  if(!info){
    $("logger-sub").textContent = "Activate a split to load today.";
    return;
  }

  const day = info.plan.days[info.planIndex];
  $("logger-sub").textContent = `${day.name} // Swap exercises beside each line, then log.`;

  day.exercises.forEach((exName, exIdx) => {
    const line = document.createElement("div");
    line.className = "workline";

    // swap dropdown
    const pool = allExercises();
    const options = pool.map(e => `<option value="${esc(e)}" ${e===exName ? "selected":""}>${esc(e)}</option>`).join("");

    line.innerHTML = `
      <div class="workline-top">
        <div class="workline-title">${esc(exName)}</div>
        <div class="workline-controls">
          <select data-swap="${exIdx}">${options}</select>
          <button class="mini-btn" data-log="${exIdx}">LOG</button>
        </div>
      </div>
      <div class="row3" style="margin-top:10px;">
        <input type="number" inputmode="decimal" placeholder="LBS" data-w="${exIdx}">
        <input type="number" inputmode="numeric" placeholder="REPS" data-r="${exIdx}">
        <button class="mini-btn" data-quick="${exIdx}">RECORD</button>
      </div>
    `;

    // swap change updates displayed title + stores a “session override”
    const sel = line.querySelector(`select[data-swap="${exIdx}"]`);
    sel.onchange = () => {
      line.querySelector(".workline-title").textContent = sel.value;
    };

    // record
    line.querySelector(`button[data-quick="${exIdx}"]`).onclick = async () => {
      const ex = sel.value;
      const w = Number(line.querySelector(`input[data-w="${exIdx}"]`).value);
      const r = Number(line.querySelector(`input[data-r="${exIdx}"]`).value);
      if(!w || !r) return toast("ENTER LBS + REPS.");
      await submitLog(ex, w, r, { source:"plan", planId: info.plan.id, planDayIndex: info.planIndex });
      line.querySelector(`input[data-w="${exIdx}"]`).value = "";
      line.querySelector(`input[data-r="${exIdx}"]`).value = "";
      toast("CARVING_RECORDED.");
    };

    box.appendChild(line);
  });
}

/* =========================
   SPLIT BUILDER
========================= */
function openBuilder(){
  $("builder-modal").classList.remove("hidden");
  $("builder-warn").textContent = "";

  $("builder-name").value = "";
  $("builder-days").value = "5";
  buildBuilderDays();
}

function closeBuilder(){
  $("builder-modal").classList.add("hidden");
}

function buildBuilderDays(){
  const count = Number($("builder-days").value || 5);
  const wrap = $("builder-days-wrap");
  wrap.innerHTML = "";

  for(let i=0;i<count;i++){
    const day = document.createElement("div");
    day.className = "builder-day";
    day.innerHTML = `
      <div class="builder-day-title">DAY_${i+1}</div>
      <div class="small-label">EXERCISES (ONE PER LINE)</div>
      <textarea data-day="${i}" placeholder="Bench Press&#10;Overhead Press&#10;..."></textarea>
    `;
    wrap.appendChild(day);
  }
}

async function saveCustomSplit(){
  const name = $("builder-name").value.trim();
  const count = Number($("builder-days").value || 5);
  $("builder-warn").textContent = "";

  if(!name || name.length < 4){
    $("builder-warn").textContent = "NAME TOO SHORT.";
    return;
  }

  const days = [];
  for(let i=0;i<count;i++){
    const ta = document.querySelector(`textarea[data-day="${i}"]`);
    const lines = (ta?.value || "")
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 12);

    if(lines.length < 3){
      $("builder-warn").textContent = `DAY_${i+1} NEEDS 3+ EXERCISES.`;
      return;
    }

    days.push({
      name: `DAY_${i+1} ${name.toUpperCase().replaceAll(" ","_")}`,
      category: "Custom",
      exercises: lines
    });
  }

  const id = `custom_${Date.now()}`;
  const custom = { id, name, vibe:"FORGED IN THE GRAVE.", days };

  const nextPlans = [...(currentUserData.customPlans||[]), custom];

  await updateDoc(doc(db,"users", auth.currentUser.uid), {
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
async function renameEntity(){
  const newName = $("new-username").value.trim();
  if(!newName || newName.length < 3) return toast("CALLSIGN TOO SHORT.");

  await updateDoc(doc(db,"users", auth.currentUser.uid), { username:newName, updatedAt: serverTimestamp() });
  currentUserData.username = newName;
  $("header-callsign").textContent = newName;
  $("profileUsername").textContent = newName;
  toast("IDENTITY_UPDATED.");
}

async function updateTag(){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { tag:selectedTagCss, updatedAt: serverTimestamp() });
  currentUserData.tag = selectedTagCss;
  $("user-grave-tag").className = `grave-tag ${selectedTagCss}`;
  $("tag-text").textContent = (TAGS.find(t => t.css===selectedTagCss)?.label || "CADAVER");
  toast("TAG_UPDATED.");
}

async function updateAvatar(){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { avatar:selectedAvatar, updatedAt: serverTimestamp() });
  currentUserData.avatar = selectedAvatar;
  renderAvatarInto($("avatar-frame"), selectedAvatar, currentUserData.uid);
  toast("AVATAR_BOUND.");
}

async function updateCallingCard(){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { callingCard:selectedCard, updatedAt: serverTimestamp() });
  currentUserData.callingCard = selectedCard;
  toast("CALLING_CARD_EQUIPPED.");
}

/* Purges */
async function purgeMyLogs(){
  if(!confirm("PURGE ALL YOUR LOGS?")) return;
  const uid = auth.currentUser.uid;
  const snap = await getDocs(query(collection(db,"logs"), where("uid","==",uid), limit(200)));
  const batch = [];
  snap.forEach(d => batch.push(deleteDoc(doc(db,"logs", d.id))));
  await Promise.all(batch);
  toast("LOGS PURGED (UP TO 200).");
}

async function purgeMyPosts(){
  if(!confirm("PURGE ALL YOUR POSTS?")) return;
  const uid = auth.currentUser.uid;
  const snap = await getDocs(query(collection(db,"posts"), where("uid","==",uid), limit(200)));
  const batch = [];
  snap.forEach(d => batch.push(deleteDoc(doc(db,"posts", d.id))));
  await Promise.all(batch);
  toast("POSTS PURGED (UP TO 200).");
}

/* =========================
   WIRE ALL BUTTONS (critical)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Auth/Reg navigation
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

  // App buttons
  $("postStatusBtn").onclick = createPost;
  $("refreshFeedBtn").onclick = loadFeedStream;

  $("logoutBtn").onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  // Settings buttons
  $("renameBtn").onclick = renameEntity;
  $("updateTagBtn").onclick = updateTag;
  $("updateAvatarBtn").onclick = updateAvatar;
  $("updateCardBtn").onclick = updateCallingCard;
  $("purgeMyLogsBtn").onclick = purgeMyLogs;
  $("purgeMyPostsBtn").onclick = purgeMyPosts;

  // Profile modal close
  $("closeProfileBtn").onclick = closeProfile;
  $("profile-modal").onclick = (e) => { if(e.target.id === "profile-modal") closeProfile(); };

  // Builder modal
  $("open-builder-btn").onclick = openBuilder;
  $("closeBuilderBtn").onclick = closeBuilder;
  $("builder-modal").onclick = (e) => { if(e.target.id === "builder-modal") closeBuilder(); };
  $("builder-days").onchange = buildBuilderDays;
  $("builder-create-btn").onclick = saveCustomSplit;
});
