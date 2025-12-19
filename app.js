import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
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
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const setText = (id, value) => { const el = $(id); if(el) el.textContent = value; };
const setHTML = (id, value) => { const el = $(id); if(el) el.innerHTML = value; };
const setClass = (id, className) => { const el = $(id); if(el) el.className = className; };
const show = (id) => { const el = $(id); if(el) el.classList.remove("hidden"); };
const hide = (id) => { const el = $(id); if(el) el.classList.add("hidden"); };

const esc = (s="") => String(s)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

function toast(msg){ alert(msg); }

function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function e1rm(w, r){
  return Math.round((Number(w) || 0) * (1 + (Number(r) || 0)/30));
}

/* =========================
   GAME SYSTEMS
========================= */
const RANKS = [
  { min: 0, name: "NEWBORN" },
  { min: 10, name: "STALKER" },
  { min: 40, name: "GRAVE_LORD" },
  { min: 80, name: "IMMORTAL" },
  { min: 150, name: "CRYPT_KING" }
];

const TROPHIES = [
  { id:"BENCH_185", label:"BENCH 185+ (e1RM)", key:"Bench Press", min:185 },
  { id:"SQUAT_225", label:"SQUAT 225+ (e1RM)", key:"Back Squat", min:225 },
  { id:"DEAD_275",  label:"DEADLIFT 275+ (e1RM)", key:"Deadlift", min:275 },
  { id:"OHP_95",    label:"OHP 95+ (e1RM)", key:"Overhead Press", min:95 },
  { id:"ROW_185",   label:"ROW 185+ (e1RM)", key:"Barbell Row", min:185 },
];

const CALLING_CARDS = [
  { id:"rust_sigils", name:"RUST_SIGILS", req:{ carvingsMin:0 } },
  { id:"crt_wraith",  name:"CRT_WRAITH", req:{ carvingsMin:10 } },
  { id:"blood_oath",  name:"BLOOD_OATH", req:{ carvingsMin:40 } },
  { id:"void_howl",   name:"VOID_HOWL", req:{ carvingsMin:80 } },
  { id:"trophy_reaper", name:"REAPER_TROPHY", req:{ trophy:"DEAD_275" } },
];

const TAGS = [
  { id:"rust",  css:"tag-rust",  label:"RUST"  },
  { id:"crt",   css:"tag-crt",   label:"CRT"   },
  { id:"blood", css:"tag-blood", label:"BLOOD" },
  { id:"void",  css:"tag-void",  label:"VOID"  }
];

function computeRankName(carvingCount=0){
  const r = RANKS.filter(x => carvingCount >= x.min).pop() || RANKS[0];
  return r.name;
}

function cardsForUser(user){
  const carvings = user?.carvingCount || 0;
  const trophies = user?.trophies || {};
  return CALLING_CARDS.map(c => {
    const okCarvings = (c.req?.carvingsMin ?? 0) <= carvings;
    const okTrophy = c.req?.trophy ? !!trophies[c.req.trophy] : true;
    return { ...c, unlocked: okCarvings && okTrophy };
  });
}

/* =========================
   RELIC VAULT
========================= */
const RELICS = [
  { id:"rusted_plate", tier:"COMMON", name:"RUSTED_PLATE", reqText:"ACCOUNT_CREATED",
    unlocked:(u)=>true },

  { id:"chain_sigil", tier:"UNCOMMON", name:"CHAIN_SIGIL", reqText:"25 CARVINGS",
    unlocked:(u)=>(u?.carvingCount||0) >= 25 },

  { id:"cracked_skull", tier:"UNCOMMON", name:"CRACKED_SKULL", reqText:"ANY PR RECORDED",
    unlocked:(u)=>Object.keys(u?.prs||{}).length >= 1 },

  { id:"blood_jar", tier:"RARE", name:"BLOOD_JAR", reqText:"LIFETIME_VOLUME ≥ 50,000",
    unlocked:(u)=>(u?.lifetimeVolume||0) >= 50000 },

  { id:"iron_circlet", tier:"RARE", name:"IRON_CIRCLET", reqText:"BENCH 185+ OR SQUAT 225+ OR DEAD 275+ (e1RM)",
    unlocked:(u)=>{
      const prs=u?.prs||{};
      const b=prs["Bench Press"]?.bestE1RM||0;
      const s=prs["Back Squat"]?.bestE1RM||0;
      const d=prs["Deadlift"]?.bestE1RM||0;
      return b>=185 || s>=225 || d>=275;
    }},

  { id:"crown_of_iron", tier:"EPIC", name:"CROWN_OF_IRON", reqText:"100 CARVINGS + 2 COMPOUND PRS (bench/squat/dead)",
    unlocked:(u)=>{
      if((u?.carvingCount||0) < 100) return false;
      const prs=u?.prs||{};
      let count=0;
      if((prs["Bench Press"]?.bestE1RM||0)>0) count++;
      if((prs["Back Squat"]?.bestE1RM||0)>0) count++;
      if((prs["Deadlift"]?.bestE1RM||0)>0) count++;
      return count>=2;
    }},

  { id:"void_reliquary", tier:"EPIC", name:"VOID_RELIQUARY", reqText:"7 DISTINCT DAYS LOGGED",
    unlocked:(u)=>(u?.daysLoggedCount||0) >= 7 },

  { id:"grave_helm", tier:"MYTHIC", name:"GRAVE_HELM", reqText:"225 BENCH + 315 SQUAT + 405 DEAD (e1RM) + 250 CARVINGS",
    unlocked:(u)=>{
      const prs=u?.prs||{};
      const b=prs["Bench Press"]?.bestE1RM||0;
      const s=prs["Back Squat"]?.bestE1RM||0;
      const d=prs["Deadlift"]?.bestE1RM||0;
      return (u?.carvingCount||0) >= 250 && b>=225 && s>=315 && d>=405;
    }},
];

function computeUnlockedRelics(u){
  const out = {};
  RELICS.forEach(r => out[r.id] = !!r.unlocked(u));
  return out;
}

/* =========================
   EXERCISE POOLS
========================= */
const EXERCISES = {
  "Push": [
    "Bench Press","Incline Bench Press","Machine Chest Press","DB Bench Press","DB Incline Press",
    "Overhead Press","Seated DB Press","Machine Shoulder Press",
    "Dips","Close-Grip Bench","Skull Crushers","Rope Pushdowns",
    "Cable Fly","Pec Deck","DB Fly",
    "Lateral Raises","Front Raises","Rear Delt Fly"
  ],
  "Pull": [
    "Deadlift","Romanian Deadlift (RDL)","DB Romanian Deadlift","Barbell Row","Cable Row","Seated Cable Row","DB Row",
    "Pull-up","Chin-up","Lat Pulldown",
    "Face Pull","Shrug","Back Extension",
    "EZ-Bar Curl","DB Curl","Hammer Curl","Preacher Curl","Incline DB Curl"
  ],
  "Legs": [
    "Back Squat","Front Squat","Hack Squat","Leg Press","Bulgarian Split Squat","Lunge","Step Up",
    "Leg Extension","Hamstring Curl",
    "Hip Thrust","Glute Bridge",
    "Calf Raise",
    "Adductor Machine","Abductor Machine"
  ],
  "Core": [
    "Hanging Leg Raise","Cable Crunch","Ab Wheel","Plank","Side Plank","Russian Twist"
  ],
  "Conditioning": [
    "Row Machine","Bike Sprint","Incline Treadmill","Farmer Walk","Sled Push"
  ]
};

function allExercises(){
  const set = new Set();
  Object.values(EXERCISES).flat().forEach(x => set.add(x));
  (currentUserData?.exerciseLibrary || []).forEach(x => set.add(x));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

/* =========================
   BUILT-IN SPLITS
========================= */
const exRow = (muscle, name, sets, reps) => ({ muscle, name, sets, reps });

const BUILT_IN_PLANS = [
  {
    id: "crypt_ppl_3",
    name: "CRYPT_PPL // 3-DAY",
    vibe: "Minimal days. Max brutality. (Push/Pull/Legs)",
    days: [
      { name:"DAY_1 PUSH", exercises:[
        exRow("Chest","Bench Press",3,"5–8"),
        exRow("Shoulders","Overhead Press",3,"6–8"),
        exRow("Chest","Incline Bench Press",3,"6–10"),
        exRow("Shoulders","Lateral Raises",3,"12–15"),
        exRow("Triceps","Rope Pushdowns",3,"10–12"),
      ]},
      { name:"DAY_2 PULL", exercises:[
        exRow("Back","Deadlift",3,"3–6"),
        exRow("Back","Barbell Row",3,"6–10"),
        exRow("Back","Lat Pulldown",3,"8–12"),
        exRow("Rear Delts","Face Pull",3,"12–15"),
        exRow("Biceps","EZ-Bar Curl",3,"8–12"),
      ]},
      { name:"DAY_3 LEGS", exercises:[
        exRow("Quads","Back Squat",3,"5–8"),
        exRow("Quads","Leg Press",3,"8–12"),
        exRow("Hamstrings","Romanian Deadlift (RDL)",3,"6–10"),
        exRow("Quads","Leg Extension",3,"12–15"),
        exRow("Calves","Calf Raise",3,"10–15"),
      ]}
    ]
  },
  {
    id: "wraith_ul_4",
    name: "WRAITH_U/L // 4-DAY",
    vibe: "Upper/Lower twice. Strong + aesthetic.",
    days: [
      { name:"DAY_1 UPPER_A", exercises:[
        exRow("Chest","Bench Press",4,"6–8"),
        exRow("Back","Barbell Row",4,"6–10"),
        exRow("Shoulders","Overhead Press",3,"6–8"),
        exRow("Back","Lat Pulldown",3,"8–12"),
        exRow("Triceps","Skull Crushers",3,"10"),
      ]},
      { name:"DAY_2 LOWER_A", exercises:[
        exRow("Quads","Back Squat",4,"6–8"),
        exRow("Hamstrings","Romanian Deadlift (RDL)",4,"8"),
        exRow("Quads","Leg Press",3,"10"),
        exRow("Hamstrings","Hamstring Curl",3,"12"),
        exRow("Calves","Calf Raise",3,"12–15"),
      ]},
      { name:"DAY_3 UPPER_B", exercises:[
        exRow("Chest","Incline Bench Press",4,"6–8"),
        exRow("Back","Cable Row",3,"8–10"),
        exRow("Chest","Cable Fly",3,"12"),
        exRow("Rear Delts","Face Pull",3,"15"),
        exRow("Biceps","Hammer Curl",3,"10–12"),
      ]},
      { name:"DAY_4 LOWER_B", exercises:[
        exRow("Quads","Hack Squat",4,"6–8"),
        exRow("Glutes","Hip Thrust",3,"8–10"),
        exRow("Quads","Leg Extension",3,"15"),
        exRow("Hamstrings","Hamstring Curl",3,"12"),
        exRow("Quads","Bulgarian Split Squat",3,"8"),
      ]}
    ]
  },
  {
    id: "gravefive_hybrid_5",
    name: "GRAVEFIVE // 5-DAY",
    vibe: "Every muscle 2×/week (weekday friendly).",
    days: [
      { name:"MONDAY – FULL BODY COMPOUND", exercises:[
        exRow("Quads","Squat / Leg Press",3,"5–8"),
        exRow("Chest","Bench / Incline",3,"5–8"),
        exRow("Back","Row / Pull-ups",3,"6–10"),
        exRow("Shoulders","Overhead Press",2,"6–8"),
        exRow("Ham/Glutes","RDL / Deadlift",2,"6–8"),
        exRow("Arms","Curl or Pushdown (opt)",2,"10–12"),
      ]},
      { name:"TUESDAY – LOWER A (FULL LEGS)", exercises:[
        exRow("Quads","Squat / Hack Squat",4,"6–8"),
        exRow("Quads","Leg Press",3,"10"),
        exRow("Hamstrings","Romanian Deadlift",4,"8"),
        exRow("Hamstrings","Ham Curl",3,"12"),
        exRow("Glutes","Hip Thrust",3,"10"),
        exRow("Adductors","Adduction Machine",3,"15"),
        exRow("Abductors","Abduction Machine",3,"15"),
      ]},
      { name:"WEDNESDAY – UPPER PUSH", exercises:[
        exRow("Chest","Bench / Incline Press",4,"6–8"),
        exRow("Chest","Fly Variation",3,"12"),
        exRow("Shoulders","OHP / Machine Press",3,"8"),
        exRow("Shoulders","Lateral Raises",4,"12–15"),
        exRow("Triceps","Skull Crushers",3,"10"),
        exRow("Triceps","Rope Pushdowns",3,"12"),
      ]},
      { name:"THURSDAY – LOWER B (POSTERIOR)", exercises:[
        exRow("Ham/Glutes","Deadlift / RDL",4,"6"),
        exRow("Glutes","Hip Thrust",3,"8"),
        exRow("Quads","Bulgarian Split Squat",3,"8"),
        exRow("Quads","Leg Extension",3,"15"),
        exRow("Adductors","Adduction Machine",2,"15"),
        exRow("Abductors","Abduction Machine",2,"15"),
      ]},
      { name:"FRIDAY – UPPER PULL + ARMS", exercises:[
        exRow("Back","Pull-ups / Pulldowns",4,"8–10"),
        exRow("Back","Barbell / Cable Rows",3,"8–10"),
        exRow("Rear Delts","Face Pulls",3,"15"),
        exRow("Biceps","EZ-Bar Curls",4,"8–10"),
        exRow("Biceps","Hammer Curls",3,"10–12"),
        exRow("Triceps","Close-Grip Bench / Dips",3,"6–8"),
      ]}
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

let unsubMyLogs = null;
let unsubMassGrave = null;
let unsubIncomingReq = null;
let unsubOutgoingReq = null;

let currentModalUid = null;
let currentModalUsername = null;

/* =========================
   AVATAR FACTORY (SVG)
========================= */
function avatarSVG(style="skull", seed="X"){
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
  if(!el) return;
  el.innerHTML = avatarSVG(style, seed);
}

/* =========================
   UI NAV + TRANSITIONS
========================= */
function setScreen(which){
  $("auth-screen")?.classList.add("hidden");
  $("registration-screen")?.classList.add("hidden");
  $("app")?.classList.add("hidden");
  $(which)?.classList.remove("hidden");
}

function flashTransition(){
  const f = $("page-flash");
  if(!f) return;
  f.classList.add("on");
  clearTimeout(f._t);
  f._t = setTimeout(()=>f.classList.remove("on"), 170);
}

function setTab(tabId){
  const panels = ["feed-panel","plans-panel","workout-panel","friends-panel","settings-panel"];
  panels.forEach(id => {
    const el = $(id);
    if(!el) return;
    el.classList.add("hidden");
    el.classList.remove("active");
  });

  const target = $(tabId);
  if(target){
    target.classList.remove("hidden");
    requestAnimationFrame(()=> target.classList.add("active"));
  }

  // active nav highlight
  document.querySelectorAll(".mini-btn[data-tab]").forEach(btn=>{
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  flashTransition();
}

function planById(id, user){
  const built = BUILT_IN_PLANS.find(p => p.id === id);
  if(built) return built;
  const customs = user?.customPlans || [];
  return customs.find(p => p.id === id) || null;
}

/* =========================
   AUTH FLOW
========================= */
async function doLogin(){
  const em = $("email")?.value.trim();
  const pw = $("password")?.value.trim();
  if($("auth-warn")) $("auth-warn").textContent = "";
  if(!em || !pw){ if($("auth-warn")) $("auth-warn").textContent = "MISSING CREDENTIALS."; return; }

  try{
    await signInWithEmailAndPassword(auth, em, pw);
  }catch(e){
    if($("auth-warn")) $("auth-warn").textContent = (e?.message || "LOGIN FAILED.").toUpperCase();
  }
}

async function beginRegistration(){
  const em = $("reg-email")?.value.trim();
  const pw = $("reg-pass")?.value.trim();
  const c  = $("reg-confirm")?.value.trim();
  if($("reg-warn")) $("reg-warn").textContent = "";

  if(!em || !pw){ if($("reg-warn")) $("reg-warn").textContent = "EMAIL/PASSCODE REQUIRED."; return; }
  if(pw.length < 6){ if($("reg-warn")) $("reg-warn").textContent = "PASSCODE MUST BE 6+ CHARS."; return; }
  if(pw !== c){ if($("reg-warn")) $("reg-warn").textContent = "PASSCODES DO NOT MATCH."; return; }

  try{
    await createUserWithEmailAndPassword(auth, em, pw);
    setText("reg-status-chip","STAGE_2");
    $("reg-step-1")?.classList.add("hidden");
    $("reg-step-2")?.classList.remove("hidden");
    buildRegPickers(auth.currentUser.uid);
  }catch(e){
    if($("reg-warn")) $("reg-warn").textContent = (e?.message || "REG FAILED.").toUpperCase();
  }
}

async function finalizeRegistration(){
  const user = auth.currentUser;
  const callsign = $("reg-username")?.value.trim();
  if($("reg-warn")) $("reg-warn").textContent = "";

  if(!user){ if($("reg-warn")) $("reg-warn").textContent = "NO AUTH USER FOUND."; return; }
  if(!callsign || callsign.length < 3){ if($("reg-warn")) $("reg-warn").textContent = "CALLSIGN 3+ CHARS."; return; }

  const payload = {
    uid: user.uid,
    username: callsign,
    tag: selectedTagCss || "tag-rust",
    avatar: selectedAvatar || "skull",
    callingCard: selectedCard || "rust_sigils",

    carvingCount: 0,
    trophies: {},
    prs: {},

    equippedRelic: "rusted_plate",
    lifetimeVolume: 0,
    daysLoggedCount: 0,
    lastLoggedDayKey: null,

    activePlan: null,
    customPlans: [],
    exerciseLibrary: [],

    friends: [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try{
    await setDoc(doc(db,"users", user.uid), payload, { merge:true });
    toast("ENTITY_BOUND. WELCOME TO THE GRAVE.");
  }catch(e){
    if($("reg-warn")) $("reg-warn").textContent = (e?.message || "FINALIZE FAILED.").toUpperCase();
  }
}

async function doForgot(){
  const em = $("email")?.value.trim();
  if(!em) return toast("ENTER EMAIL FIRST.");
  try{
    await sendPasswordResetEmail(auth, em);
    toast("RESET LINK SENT.");
  }catch(e){
    toast((e?.message || "RESET FAILED.").toUpperCase());
  }
}

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if(!user){
    currentUserData = null;
    setScreen("auth-screen");
    return;
  }

  const snap = await getDoc(doc(db,"users", user.uid));
  if(!snap.exists()){
    setScreen("registration-screen");
    setText("reg-status-chip","STAGE_2");
    $("reg-step-1")?.classList.add("hidden");
    $("reg-step-2")?.classList.remove("hidden");
    buildRegPickers(user.uid);
    return;
  }

  currentUserData = snap.data();
  setScreen("app");
  initApp();
});

/* =========================
   INIT APP
========================= */
function initApp(){
  try{
    setText("header-callsign", currentUserData?.username || "UNKNOWN");
    setText("profileUsername", currentUserData?.username || "UNKNOWN");
    setText("stat-count", String(currentUserData?.carvingCount || 0));

    const rankName = computeRankName(currentUserData?.carvingCount || 0);
    setText("user-rank", rankName);
    setText("header-rank", `// ${rankName}`);

    const tagCss = currentUserData?.tag || "tag-rust";
    setClass("user-grave-tag", `grave-tag ${tagCss}`);
    setText("tag-text", (TAGS.find(t => t.css===tagCss)?.label || "CADAVER"));

    renderAvatarInto($("avatar-frame"), currentUserData?.avatar || "skull", currentUserData?.uid || "seed");
    setText("equipped-relic-chip", String(currentUserData?.equippedRelic || "rusted_plate").toUpperCase());

    const activeLabel = currentUserData?.activePlan?.planId
      ? (planById(currentUserData.activePlan.planId, currentUserData)?.name || "ACTIVE")
      : "NONE";
    setText("active-split-label", activeLabel);

    hookCoreButtons();

    buildSettingsPickers();
    buildManualLogger();

    renderPlansIndex();
    buildStartDaySelect(); // now depends on selected plan
    renderActivePlanStatus();
    renderTodayWorkoutLogger();

    loadDailyMassGrave();
    loadMyLogs();
    loadPRUI();
    loadLeaderboardStream();
    loadFeedStream();
    setupFriendSystems();   // NEW: requests + friends list
    renderTrophies();

    // default tab
    setTab("feed-panel");
  }catch(e){
    console.error("initApp crash:", e);
    try{ hookCoreButtons(); }catch(_){}
  }
}

function hookCoreButtons(){
  // Auth
  if($("loginBtn")) $("loginBtn").onclick = doLogin;
  if($("showRegBtn")) $("showRegBtn").onclick = () => {
    setScreen("registration-screen");
    setText("reg-status-chip", "STAGE_1");
    $("reg-step-1")?.classList.remove("hidden");
    $("reg-step-2")?.classList.add("hidden");
    setText("reg-warn", "");
    buildRegPickers("seed");
  };
  if($("forgotBtn")) $("forgotBtn").onclick = doForgot;

  // Registration
  if($("nextStepBtn")) $("nextStepBtn").onclick = beginRegistration;
  if($("finalizeRegBtn")) $("finalizeRegBtn").onclick = finalizeRegistration;
  if($("returnToLoginBtn")) $("returnToLoginBtn").onclick = () => setScreen("auth-screen");

  // Nav tabs
  document.querySelectorAll(".mini-btn[data-tab]").forEach(btn => {
    btn.onclick = () => setTab(btn.getAttribute("data-tab"));
  });

  // Logout
  if($("logoutBtn")) $("logoutBtn").onclick = async () => {
    try{
      if(unsubMyLogs) unsubMyLogs();
      if(unsubMassGrave) unsubMassGrave();
      if(unsubIncomingReq) unsubIncomingReq();
      if(unsubOutgoingReq) unsubOutgoingReq();
    }catch(_){}
    await signOut(auth);
  };

  // Plans + builder
  if($("open-builder-btn")) $("open-builder-btn").onclick = openBuilder;
  if($("closeBuilderBtn")) $("closeBuilderBtn").onclick = closeBuilder;
  if($("builder-days")) $("builder-days").onchange = buildBuilderDays;
  if($("builder-create-btn")) $("builder-create-btn").onclick = saveCustomSplit;

  // START TODAY AS (select) + activate
  if($("start-day-select")) $("start-day-select").onchange = () => {
    // visual feedback only
    flashTransition();
  };

  if($("start-auto-btn")) $("start-auto-btn").onclick = () => activateSelectedPlanTodayAsSelected();
  if($("deactivate-plan-btn")) $("deactivate-plan-btn").onclick = deactivatePlan;
  if($("jump-day-btn")) $("jump-day-btn").onclick = setTodayToSelectedPlanDay;

  // Logger
  if($("manualLogBtn")) $("manualLogBtn").onclick = manualLog;

  // Custom exercise buttons
  if($("addCustomExBtn")) $("addCustomExBtn").onclick = addCustomExercise;
  if($("clearCustomExBtn")) $("clearCustomExBtn").onclick = clearCustomExercises;

  // Feed placeholders
  if($("postStatusBtn")) $("postStatusBtn").onclick = () => toast("FEED NOT WIRED YET.");
  if($("refreshFeedBtn")) $("refreshFeedBtn").onclick = () => loadFeedStream();

  // Profile modal
  if($("closeProfileBtn")) $("closeProfileBtn").onclick = () => $("profile-modal")?.classList.add("hidden");
  if($("modal-friend-btn")) $("modal-friend-btn").onclick = async () => {
    if(!currentModalUid) return;
    await sendFriendRequest(currentModalUid, currentModalUsername || "UNKNOWN");
  };

  // Settings
  if($("renameBtn")) $("renameBtn").onclick = renameEntity;
  if($("updateTagBtn")) $("updateTagBtn").onclick = updateTag;
  if($("updateAvatarBtn")) $("updateAvatarBtn").onclick = updateAvatar;

  // Relic Vault
  if($("openRelicVaultBtn")) $("openRelicVaultBtn").onclick = openRelicVault;
  if($("closeRelicVaultBtn")) $("closeRelicVaultBtn").onclick = closeRelicVault;

  // Admin placeholders
  if($("purgeMyLogsBtn")) $("purgeMyLogsBtn").onclick = purgeMyLogs;
  if($("purgeMyPostsBtn")) $("purgeMyPostsBtn").onclick = purgeMyPosts;
}

/* =========================
   REGISTRATION PICKERS
========================= */
function buildRegPickers(seed){
  const wrap = $("initial-tag-picker");
  if(wrap){
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
  }

  const aw = $("avatar-picker");
  if(aw){
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
  }

  selectedCard = "rust_sigils";
}

/* =========================
   SETTINGS PICKERS
========================= */
function buildSettingsPickers(){
  const tagWrap = $("settings-tag-picker");
  if(tagWrap){
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
  }

  const avWrap = $("settings-avatar-picker");
  if(avWrap){
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
  }

  const cardWrap = $("card-picker");
  if(cardWrap){
    const cards = cardsForUser(currentUserData);
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
      div.onclick = async () => {
        if(!c.unlocked) return;
        selectedCard = c.id;
        cardWrap.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
        div.classList.add("active");
        await updateDoc(doc(db,"users", auth.currentUser.uid), { callingCard: selectedCard, updatedAt: serverTimestamp() });
        currentUserData.callingCard = selectedCard;
        toast("CARD_EQUIPPED.");
      };
      cardWrap.appendChild(div);
    });
  }
}

async function renameEntity(){
  const val = $("new-username")?.value.trim();
  if(!val || val.length < 3) return toast("CALLSIGN 3+ CHARS.");
  await updateDoc(doc(db,"users", auth.currentUser.uid), { username: val, updatedAt: serverTimestamp() });
  currentUserData.username = val;
  setText("header-callsign", val);
  setText("profileUsername", val);
  toast("ENTITY_RENAMED.");
  if($("new-username")) $("new-username").value = "";
}

async function updateTag(){
  const uid = auth.currentUser.uid;
  const next = selectedTagCss || currentUserData.tag || "tag-rust";
  await updateDoc(doc(db,"users", uid), { tag: next, updatedAt: serverTimestamp() });
  currentUserData.tag = next;
  setClass("user-grave-tag", `grave-tag ${next}`);
  setText("tag-text", (TAGS.find(t => t.css===next)?.label || "CADAVER"));
  toast("TAG_UPDATED.");
}

async function updateAvatar(){
  const uid = auth.currentUser.uid;
  const next = selectedAvatar || currentUserData.avatar || "skull";
  await updateDoc(doc(db,"users", uid), { avatar: next, updatedAt: serverTimestamp() });
  currentUserData.avatar = next;
  renderAvatarInto($("avatar-frame"), next, currentUserData.uid);
  toast("AVATAR_BOUND.");
}

/* =========================
   RELIC VAULT
========================= */
function openRelicVault(){
  renderRelicVault();
  $("relic-vault-modal")?.classList.remove("hidden");
}
function closeRelicVault(){
  $("relic-vault-modal")?.classList.add("hidden");
}

function renderRelicVault(){
  const grid = $("relic-grid");
  if(!grid) return;

  setText("vault-vol", String(Math.round(currentUserData.lifetimeVolume || 0)));
  setText("vault-days", String(currentUserData.daysLoggedCount || 0));

  const unlockedMap = computeUnlockedRelics(currentUserData);
  const equipped = currentUserData.equippedRelic || "rusted_plate";

  grid.innerHTML = "";
  RELICS.forEach(r => {
    const isUnlocked = !!unlockedMap[r.id];
    const card = document.createElement("div");
    card.className = `relic-card ${isUnlocked ? "" : "locked"} ${equipped===r.id ? "equipped" : ""}`.trim();

    card.innerHTML = `
      <div class="relic-art"></div>
      <div class="relic-meta">
        <div class="relic-name">${esc(r.name)}</div>
        <div class="relic-tier">${esc(r.tier)}</div>
        <div class="relic-req">${isUnlocked ? "UNLOCKED" : ("LOCKED — " + esc(r.reqText))}</div>
      </div>
      ${isUnlocked ? "" : `<div class="relic-lock"><span>LOCKED</span></div>`}
    `;

    card.onclick = async () => {
      if(!isUnlocked) return;
      await equipRelic(r.id);
      renderRelicVault();
    };

    grid.appendChild(card);
  });
}

async function equipRelic(relicId){
  const uid = auth.currentUser.uid;
  await updateDoc(doc(db,"users", uid), { equippedRelic: relicId, updatedAt: serverTimestamp() });
  currentUserData.equippedRelic = relicId;
  setText("equipped-relic-chip", relicId.toUpperCase());
  toast("RELIC_BOUND.");
}

/* =========================
   MANUAL LOGGER + CUSTOM EXERCISES
========================= */
function buildManualLogger(){
  const catSel = $("log-category");
  const exSel = $("log-ex");
  if(!catSel || !exSel) return;

  catSel.innerHTML = Object.keys(EXERCISES)
    .map(k => `<option value="${esc(k)}" ${k===manualCategory ? "selected":""}>${esc(k)}</option>`)
    .join("");

  const buildEx = () => {
    const cat = catSel.value;
    manualCategory = cat;
    const list = [...(EXERCISES[cat] || []), ...(currentUserData.exerciseLibrary || [])];
    const uniq = Array.from(new Set(list)).sort((a,b)=>a.localeCompare(b));
    exSel.innerHTML = uniq.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
  };

  catSel.onchange = buildEx;
  buildEx();
}

async function addCustomExercise(){
  const input = $("custom-ex-name");
  const name = (input?.value || "").trim();
  if(!name || name.length < 3) return toast("ENTER 3+ CHARS.");

  const clean = name.replace(/\s+/g, " ").trim();
  const current = currentUserData.exerciseLibrary || [];
  const next = Array.from(new Set([...current, clean])).sort((a,b)=>a.localeCompare(b));

  await updateDoc(doc(db,"users", auth.currentUser.uid), {
    exerciseLibrary: next,
    updatedAt: serverTimestamp()
  });

  currentUserData.exerciseLibrary = next;
  if(input) input.value = "";

  buildManualLogger();
  renderTodayWorkoutLogger();
  toast("EXERCISE_ADDED.");
}

async function clearCustomExercises(){
  if(!confirm("Clear all custom exercises from your library?")) return;

  await updateDoc(doc(db,"users", auth.currentUser.uid), {
    exerciseLibrary: [],
    updatedAt: serverTimestamp()
  });

  currentUserData.exerciseLibrary = [];
  buildManualLogger();
  renderTodayWorkoutLogger();
  toast("LIBRARY_CLEARED.");
}

async function manualLog(){
  const ex = $("log-ex")?.value;
  const w = Number($("log-w")?.value);
  const r = Number($("log-r")?.value);
  if(!ex) return toast("PICK EXERCISE.");
  if(!w || !r) return toast("ENTER LBS + REPS.");
  await submitLog(ex, w, r, { source:"manual" });
  if($("log-w")) $("log-w").value = "";
  if($("log-r")) $("log-r").value = "";
  toast("CARVING_RECORDED.");
}

/* =========================
   PLANS
========================= */
function renderPlansIndex(){
  const wrap = $("plan-index");
  if(!wrap) return;
  wrap.innerHTML = "";

  const built = BUILT_IN_PLANS;
  const customs = currentUserData.customPlans || [];
  const plans = [...built, ...customs];

  plans.forEach(p => {
    const card = document.createElement("div");
    card.className = `plan-card ${selectedPlanId===p.id ? "active":""}`;
    card.innerHTML = `
      <div class="plan-name">${esc(p.name)}</div>
      <div class="plan-sub">${esc(p.vibe || "")}</div>
    `;
    card.onclick = () => {
      selectedPlanId = p.id;
      wrap.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      buildStartDaySelect();       // IMPORTANT: update “start today as” options for this plan
      flashTransition();
    };
    wrap.appendChild(card);
  });

  selectedPlanId = selectedPlanId || currentUserData.activePlan?.planId || built[0]?.id;
  buildStartDaySelect();
}

function buildStartDaySelect(){
  const sel = $("start-day-select");
  if(!sel) return;

  const plan = selectedPlanId ? planById(selectedPlanId, currentUserData) : null;
  if(!plan){
    sel.innerHTML = `<option value="0">DAY_1</option>`;
    sel.value = "0";
    return;
  }

  sel.innerHTML = plan.days.map((d,i)=>`<option value="${i}">DAY_${i+1} — ${esc(d.name)}</option>`).join("");

  // default: if active plan matches selected, show its current day
  if(currentUserData.activePlan?.planId === selectedPlanId){
    sel.value = String(clamp(Number(currentUserData.activePlan.currentDayIndex ?? 0), 0, plan.days.length-1));
  }else{
    sel.value = "0";
  }
}

function planDayForToday(){
  const ap = currentUserData.activePlan;
  if(!ap?.planId) return null;
  const plan = planById(ap.planId, currentUserData);
  if(!plan) return null;

  const idx = clamp(Number(ap.currentDayIndex ?? 0), 0, plan.days.length-1);
  return { plan, planIndex: idx };
}

async function activateSelectedPlanTodayAsSelected(){
  if(!selectedPlanId) return toast("SELECT A SPLIT.");
  const plan = planById(selectedPlanId, currentUserData);
  if(!plan) return toast("PLAN NOT FOUND.");

  const chosenIdx = Number($("start-day-select")?.value || 0);
  const startIdx = clamp(chosenIdx, 0, plan.days.length-1);

  const activePlan = {
    planId: selectedPlanId,
    startDayIndex: startIdx,
    currentDayIndex: startIdx,
    startedDayKey: todayKey(),
    lastAdvancedDayKey: null
  };

  await updateDoc(doc(db,"users", auth.currentUser.uid), { activePlan, updatedAt: serverTimestamp() });
  currentUserData.activePlan = activePlan;

  setText("active-split-label", plan.name);
  renderActivePlanStatus();
  renderTodayWorkoutLogger();

  // take them straight to the logger
  setTab("workout-panel");
  toast("SPLIT_ACTIVATED.");
}

async function setTodayToSelectedPlanDay(){
  const ap = currentUserData.activePlan;
  if(!ap?.planId) return toast("NO ACTIVE SPLIT.");

  const plan = planById(ap.planId, currentUserData);
  if(!plan) return toast("PLAN NOT FOUND.");

  const chosenIdx = Number($("start-day-select")?.value || 0);
  const idx = clamp(chosenIdx, 0, plan.days.length-1);

  const next = { ...ap, currentDayIndex: idx };
  await updateDoc(doc(db,"users", auth.currentUser.uid), { activePlan: next, updatedAt: serverTimestamp() });
  currentUserData.activePlan = next;

  renderActivePlanStatus();
  renderTodayWorkoutLogger();
  toast("TODAY_REALIGNED.");
}

async function deactivatePlan(){
  await updateDoc(doc(db,"users", auth.currentUser.uid), { activePlan: null, updatedAt: serverTimestamp() });
  currentUserData.activePlan = null;

  setText("active-split-label","NONE");
  setText("active-day-chip","DAY_?");
  setHTML("active-plan-readout","");
  renderTodayWorkoutLogger();
  buildStartDaySelect();

  setTab("plans-panel");
  toast("SPLIT_DEACTIVATED.");
}

function renderActivePlanStatus(){
  const ap = currentUserData.activePlan;
  const wrap = $("active-plan-readout");
  if(!wrap) return;
  wrap.innerHTML = "";

  if(!ap?.planId){
    setText("active-day-chip","DAY_?");
    return;
  }

  const plan = planById(ap.planId, currentUserData);
  if(!plan){
    setText("active-day-chip","DAY_?");
    return;
  }

  const idx = clamp(Number(ap.currentDayIndex ?? 0), 0, plan.days.length-1);
  setText("active-day-chip", `DAY_${idx+1}`);

  plan.days.forEach((d, i) => {
    const badge = document.createElement("div");
    badge.className = "day-badge";
    badge.innerHTML = `
      <div class="dname">${esc(d.name)}</div>
      <div class="dlist">${d.exercises.map(e => esc(`${e.muscle}: ${e.name} (${e.sets} x ${e.reps})`)).join("<br>")}</div>
    `;
    if(i === idx){
      badge.style.borderColor = "rgba(0,255,65,0.55)";
      badge.style.boxShadow = "0 0 0 3px rgba(0,255,65,0.12)";
    }
    wrap.appendChild(badge);
  });

  // sync selector to active day if viewing this plan
  if(selectedPlanId === ap.planId){
    const sel = $("start-day-select");
    if(sel) sel.value = String(idx);
  }
}

/* =========================
   TODAY WORKOUT LOGGER
========================= */
function renderTodayWorkoutLogger(){
  const box = $("today-workout-list");
  if(!box) return;
  box.innerHTML = "";

  const info = planDayForToday();
  if(!info){
    setText("logger-sub","Activate a split to load today.");
    return;
  }

  const day = info.plan.days[info.planIndex];
  setText("logger-sub", `${day.name} // Log each exercise line.`);

  day.exercises.forEach((row, exIdx) => {
    const line = document.createElement("div");
    line.className = "workline";

    const pool = allExercises();
    const currentName = row.name;

    const options = [
      ...pool.map(e => `<option value="${esc(e)}" ${e===currentName ? "selected":""}>${esc(e)}</option>`),
      `<option value="__ADD__">+ ADD EXERCISE…</option>`
    ].join("");

    line.innerHTML = `
      <div class="workline-top">
        <div style="min-width:0;">
          <div class="workline-title">${esc(row.muscle)} — ${esc(currentName)}</div>
          <div class="workline-sub">${esc(`${row.sets} sets x ${row.reps} reps`)}</div>
        </div>
        <div class="workline-controls">
          <select data-swap="${exIdx}">${options}</select>
        </div>
      </div>

      <div class="row3" style="margin-top:10px;">
        <input type="number" inputmode="decimal" placeholder="LBS" data-w="${exIdx}">
        <input type="number" inputmode="numeric" placeholder="REPS" data-r="${exIdx}">
        <button class="mini-btn" data-quick="${exIdx}">RECORD</button>
      </div>
    `;

    const sel = line.querySelector(`select[data-swap="${exIdx}"]`);
    sel.onchange = async () => {
      if(sel.value === "__ADD__"){
        const name = prompt("New exercise name:");
        if(!name) { sel.value = currentName; return; }
        const clean = name.trim();
        if(clean.length < 3){ sel.value = currentName; return; }
        const next = Array.from(new Set([...(currentUserData.exerciseLibrary || []), clean])).sort((a,b)=>a.localeCompare(b));
        await updateDoc(doc(db,"users", auth.currentUser.uid), { exerciseLibrary: next, updatedAt: serverTimestamp() });
        currentUserData.exerciseLibrary = next;
        buildManualLogger();
        renderTodayWorkoutLogger();
        return;
      }
      line.querySelector(".workline-title").textContent = `${row.muscle} — ${sel.value}`;
    };

    line.querySelector(`button[data-quick="${exIdx}"]`).onclick = async () => {
      const ex = sel.value;
      const w = Number(line.querySelector(`input[data-w="${exIdx}"]`).value);
      const r = Number(line.querySelector(`input[data-r="${exIdx}"]`).value);
      if(!w || !r) return toast("ENTER LBS + REPS.");

      await submitLog(ex, w, r, {
        source: "plan",
        planId: info.plan.id,
        planDayIndex: info.planIndex,
        muscle: row.muscle,
        prescription: `${row.sets}x${row.reps}`
      });

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
  $("builder-modal")?.classList.remove("hidden");
  setText("builder-warn","");
  if($("builder-name")) $("builder-name").value = "";
  if($("builder-days")) $("builder-days").value = "5";
  buildBuilderDays();
}
function closeBuilder(){ $("builder-modal")?.classList.add("hidden"); }

function buildBuilderDays(){
  const count = Number($("builder-days")?.value || 5);
  const wrap = $("builder-days-wrap");
  if(!wrap) return;
  wrap.innerHTML = "";

  for(let i=0;i<count;i++){
    const day = document.createElement("div");
    day.className = "builder-day";
    day.innerHTML = `
      <div class="builder-day-title">DAY_${i+1}</div>
      <div class="small-label">EXERCISES (ONE PER LINE)</div>
      <textarea data-day="${i}" placeholder="Bench Press&#10;DB Bench Press&#10;Lat Pulldown&#10;..."></textarea>
    `;
    wrap.appendChild(day);
  }
}

async function saveCustomSplit(){
  const name = $("builder-name")?.value.trim();
  const count = Number($("builder-days")?.value || 5);
  setText("builder-warn","");

  if(!name || name.length < 4){
    setText("builder-warn","NAME TOO SHORT.");
    return;
  }

  const days = [];
  for(let i=0;i<count;i++){
    const ta = document.querySelector(`textarea[data-day="${i}"]`);
    const lines = (ta?.value || "")
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 14);

    if(lines.length < 3){
      setText("builder-warn",`DAY_${i+1} NEEDS 3+ EXERCISES.`);
      return;
    }

    days.push({
      name: `DAY_${i+1} ${name.toUpperCase().replaceAll(" ","_")}`,
      exercises: lines.map(x => exRow("Custom", x, 3, "8–12"))
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
  closeBuilder();
  renderPlansIndex();
  toast("SPLIT_FORGED.");
}

/* =========================
   LOGGING + STATS
========================= */
function userDailyDoc(uid, dayKey){
  return doc(db, "users", uid, "dailyTotals", dayKey);
}

async function submitLog(exercise, weight, reps, meta={}){
  const uid = auth.currentUser.uid;
  const dk = todayKey();
  const volume = Number(weight) * Number(reps);

  await addDoc(collection(db,"logs"), {
    uid,
    dayKey: dk,
    exercise,
    weight,
    reps,
    volume,
    meta,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db,"users", uid), {
    carvingCount: increment(1),
    updatedAt: serverTimestamp()
  });
  currentUserData.carvingCount = (currentUserData.carvingCount || 0) + 1;
  setText("stat-count", String(currentUserData.carvingCount || 0));

  const rn = computeRankName(currentUserData.carvingCount);
  setText("user-rank", rn);
  setText("header-rank", `// ${rn}`);

  await updateDoc(doc(db,"users", uid), {
    lifetimeVolume: increment(volume),
    updatedAt: serverTimestamp()
  });
  currentUserData.lifetimeVolume = (currentUserData.lifetimeVolume || 0) + volume;

  if((currentUserData.lastLoggedDayKey || null) !== dk){
    await updateDoc(doc(db,"users", uid), {
      daysLoggedCount: increment(1),
      lastLoggedDayKey: dk,
      updatedAt: serverTimestamp()
    });
    currentUserData.daysLoggedCount = (currentUserData.daysLoggedCount || 0) + 1;
    currentUserData.lastLoggedDayKey = dk;
  }

  await setDoc(userDailyDoc(uid, dk), {
    uid,
    dayKey: dk,
    totalVolume: increment(volume),
    updatedAt: serverTimestamp()
  }, { merge:true });

  // auto-advance ONCE per day after first plan log that day
  if(meta?.source === "plan" && currentUserData.activePlan?.planId){
    const ap = currentUserData.activePlan;
    if(ap.lastAdvancedDayKey !== dk){
      const plan = planById(ap.planId, currentUserData);
      const nextIndex = plan
        ? (clamp(Number(ap.currentDayIndex ?? 0), 0, plan.days.length-1) + 1) % plan.days.length
        : Number(ap.currentDayIndex ?? 0);

      const nextAp = { ...ap, currentDayIndex: nextIndex, lastAdvancedDayKey: dk };
      await updateDoc(doc(db,"users", uid), { activePlan: nextAp, updatedAt: serverTimestamp() });
      currentUserData.activePlan = nextAp;

      renderActivePlanStatus();
      renderTodayWorkoutLogger();
      buildStartDaySelect();
    }
  }

  await updatePRsAndTrophies(exercise, weight, reps);

  if(!$("relic-vault-modal")?.classList.contains("hidden")){
    renderRelicVault();
  }
}

async function deleteLog(logId, logData){
  const uid = auth.currentUser.uid;
  await deleteDoc(doc(db,"logs", logId));

  await updateDoc(doc(db,"users", uid), {
    carvingCount: increment(-1),
    updatedAt: serverTimestamp()
  });

  const dk = logData.dayKey || todayKey();
  const vol = Number(logData.volume || (Number(logData.weight)*Number(logData.reps)) || 0);

  await setDoc(userDailyDoc(uid, dk), {
    uid,
    dayKey: dk,
    totalVolume: increment(-vol),
    updatedAt: serverTimestamp()
  }, { merge:true });

  currentUserData.carvingCount = Math.max(0, (currentUserData.carvingCount||0) - 1);
  setText("stat-count", String(currentUserData.carvingCount || 0));

  const rn = computeRankName(currentUserData.carvingCount);
  setText("user-rank", rn);
  setText("header-rank", `// ${rn}`);
}

/* =========================
   PR + TROPHIES
========================= */
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

  for(const t of TROPHIES){
    if(trophies[t.id]) continue;
    if(t.key !== exercise) continue;
    if(est >= t.min) trophies[t.id] = true;
  }

  await updateDoc(doc(db,"users", uid), { prs, trophies, updatedAt: serverTimestamp() });
  currentUserData.prs = prs;
  currentUserData.trophies = trophies;

  renderTrophies();
  loadPRUI();
}

/* =========================
   DAILY MASSGRAVE
========================= */
function loadDailyMassGrave(){
  const uid = auth.currentUser.uid;
  const dk = todayKey();

  if(unsubMassGrave) unsubMassGrave();
  unsubMassGrave = onSnapshot(userDailyDoc(uid, dk), (snap) => {
    const total = snap.exists() ? (snap.data().totalVolume || 0) : 0;
    setText("massgrave-value", String(Math.max(0, Math.round(total))));
  });
}

/* =========================
   MY LOGS
========================= */
function loadMyLogs(){
  const uid = auth.currentUser.uid;
  const wrap = $("my-logs");
  if(!wrap) return;

  if(unsubMyLogs) unsubMyLogs();

  const qy = query(
    collection(db,"logs"),
    where("uid","==", uid),
    orderBy("createdAt","desc"),
    limit(30)
  );

  unsubMyLogs = onSnapshot(qy, (snap) => {
    wrap.innerHTML = "";
    if(snap.empty){
      wrap.innerHTML = `<div class="index-row"><span class="dim">NO CARVINGS YET.</span></div>`;
      return;
    }

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>${esc(d.exercise)} <span class="dim">(${esc(d.dayKey || "")})</span></span>
        <span class="dim">${esc(d.weight)} x ${esc(d.reps)} = ${Math.round(Number(d.volume||0))}</span>
        <button class="mini-btn danger" style="margin-left:auto;" data-del="1">DEL</button>
      `;
      row.querySelector('button[data-del="1"]').onclick = async () => {
        if(!confirm("Delete this carving?")) return;
        await deleteLog(docSnap.id, d);
      };
      wrap.appendChild(row);
    });
  });
}

/* =========================
   PR UI
========================= */
function loadPRUI(){
  const wrap = $("prList");
  if(!wrap) return;
  const prs = currentUserData.prs || {};
  const entries = Object.entries(prs)
    .sort((a,b)=> (b[1].bestE1RM||0) - (a[1].bestE1RM||0))
    .slice(0, 50);

  wrap.innerHTML = "";
  if(!entries.length){
    wrap.innerHTML = `<div class="index-row"><span class="dim">NO PRS YET.</span></div>`;
    return;
  }

  entries.forEach(([ex, data]) => {
    const row = document.createElement("div");
    row.className = "index-row";
    row.innerHTML = `
      <span>${esc(ex)}</span>
      <span class="dim">e1RM ${esc(data.bestE1RM || 0)} | best ${esc(data.bestWeight || 0)} x ${esc(data.bestReps || 0)}</span>
    `;
    wrap.appendChild(row);
  });
}

/* =========================
   TROPHIES UI
========================= */
function renderTrophies(){
  const wrap = $("trophy-list");
  if(!wrap) return;
  const trophies = currentUserData.trophies || {};
  const got = Object.keys(trophies).filter(k => trophies[k]).length;
  setText("trophy-count", String(got));

  wrap.innerHTML = "";
  TROPHIES.forEach(t => {
    const row = document.createElement("div");
    row.className = "index-row";
    row.innerHTML = `
      <span>${esc(t.label)}</span>
      <span class="dim">${trophies[t.id] ? "CLAIMED" : `TARGET ${t.min}`}</span>
    `;
    wrap.appendChild(row);
  });
}

/* =========================
   FRIEND REQUESTS + FRIENDS LIST (NEW)
========================= */
function friendReqDocId(fromUid, toUid){
  return `${fromUid}_${toUid}`;
}

async function sendFriendRequest(toUid, toUsername="UNKNOWN"){
  const uid = auth.currentUser.uid;
  if(toUid === uid) return toast("CANNOT FRIEND SELF.");

  // already friends?
  const friends = currentUserData.friends || [];
  if(friends.includes(toUid)) return toast("ALREADY_FRIENDS.");

  // if they already sent you a request, accept it immediately
  const reverseId = friendReqDocId(toUid, uid);
  const reverseSnap = await getDoc(doc(db,"friendRequests", reverseId));
  if(reverseSnap.exists()){
    const r = reverseSnap.data();
    if(r.status === "pending"){
      await acceptFriendRequest(reverseId, toUid);
      toast("REQUEST_ACCEPTED.");
      return;
    }
  }

  const reqId = friendReqDocId(uid, toUid);
  const existing = await getDoc(doc(db,"friendRequests", reqId));
  if(existing.exists()){
    const d = existing.data();
    if(d.status === "pending") return toast("REQUEST_ALREADY_SENT.");
  }

  await setDoc(doc(db,"friendRequests", reqId), {
    fromUid: uid,
    fromUsername: currentUserData.username || "UNKNOWN",
    toUid,
    toUsername,
    status: "pending",
    createdAt: serverTimestamp()
  }, { merge:true });

  // update modal button feedback
  const btn = $("modal-friend-btn");
  if(btn && currentModalUid === toUid){
    btn.textContent = "REQUEST_SENT";
    btn.disabled = true;
    btn.classList.add("disabled");
  }

  toast("REQUEST_SENT.");
}

async function acceptFriendRequest(reqId, otherUid){
  const uid = auth.currentUser.uid;

  await updateDoc(doc(db,"friendRequests", reqId), {
    status: "accepted",
    respondedAt: serverTimestamp()
  });

  await updateDoc(doc(db,"users", uid), {
    friends: arrayUnion(otherUid),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db,"users", otherUid), {
    friends: arrayUnion(uid),
    updatedAt: serverTimestamp()
  });

  currentUserData.friends = Array.from(new Set([...(currentUserData.friends||[]), otherUid]));
  renderFriendsList();
}

async function declineFriendRequest(reqId){
  await updateDoc(doc(db,"friendRequests", reqId), {
    status: "declined",
    respondedAt: serverTimestamp()
  });
  toast("REQUEST_DECLINED.");
}

function setupFriendSystems(){
  listenFriendRequests();
  setupUserSearch();
  renderFriendsList();
}

function listenFriendRequests(){
  const uid = auth.currentUser.uid;

  if(unsubIncomingReq) unsubIncomingReq();
  if(unsubOutgoingReq) unsubOutgoingReq();

  const incomingWrap = $("incoming-requests");
  const outgoingWrap = $("outgoing-requests");

  const inQ = query(collection(db,"friendRequests"),
    where("toUid","==", uid),
    where("status","==","pending"),
    orderBy("createdAt","desc"),
    limit(25)
  );

  unsubIncomingReq = onSnapshot(inQ, (snap) => {
    if(!incomingWrap) return;
    incomingWrap.innerHTML = "";

    const count = snap.size || 0;
    setText("req-chip", String(count));

    if(snap.empty){
      incomingWrap.innerHTML = `<div class="index-row"><span class="dim">NO INCOMING REQUESTS.</span></div>`;
      return;
    }

    snap.forEach(s => {
      const r = s.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>${esc(r.fromUsername || "UNKNOWN")}</span>
        <div style="display:flex; gap:8px; margin-left:auto;">
          <button class="mini-btn" data-acc="1">ACCEPT</button>
          <button class="mini-btn danger" data-dec="1">DECLINE</button>
        </div>
      `;
      row.querySelector('[data-acc="1"]').onclick = () => acceptFriendRequest(s.id, r.fromUid);
      row.querySelector('[data-dec="1"]').onclick = () => declineFriendRequest(s.id);
      incomingWrap.appendChild(row);
    });
  });

  const outQ = query(collection(db,"friendRequests"),
    where("fromUid","==", uid),
    where("status","==","pending"),
    orderBy("createdAt","desc"),
    limit(25)
  );

  unsubOutgoingReq = onSnapshot(outQ, (snap) => {
    if(!outgoingWrap) return;
    outgoingWrap.innerHTML = "";

    if(snap.empty){
      outgoingWrap.innerHTML = `<div class="index-row"><span class="dim">NO OUTGOING REQUESTS.</span></div>`;
      return;
    }

    snap.forEach(s => {
      const r = s.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span>${esc(r.toUsername || "UNKNOWN")}</span>
        <span class="dim" style="margin-left:auto;">PENDING</span>
      `;
      outgoingWrap.appendChild(row);
    });
  });
}

function setupUserSearch(){
  const inp = $("userSearch");
  if(!inp) return;

  inp.oninput = async () => {
    const term = inp.value.trim();
    const out = $("search-results");
    if(!out) return;
    out.innerHTML = "";
    if(term.length < 2) return;

    const qy = query(
      collection(db,"users"),
      where("username", ">=", term),
      where("username", "<=", term + "\uf8ff"),
      limit(10)
    );

    const snap = await getDocs(qy);
    snap.forEach(s => {
      const u = s.data();
      if(u.uid === auth.currentUser.uid) return;

      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span style="cursor:pointer; color: rgba(0,255,65,0.85)">${esc(u.username || "UNKNOWN")}</span>
        <div style="display:flex; gap:8px; margin-left:auto;">
          <button class="mini-btn" data-view="1">VIEW</button>
          <button class="mini-btn" data-add="1">REQUEST</button>
        </div>
      `;
      row.querySelector('[data-view="1"]').onclick = () => openProfile(u.uid);
      row.querySelector('[data-add="1"]').onclick = () => sendFriendRequest(u.uid, u.username || "UNKNOWN");
      out.appendChild(row);
    });
  };
}

function renderFriendsList(){
  const wrap = $("friends-list");
  if(!wrap) return;

  const friends = currentUserData.friends || [];
  if(!friends.length){
    wrap.innerHTML = `<div class="index-row"><span class="dim">NO FRIENDS YET.</span></div>`;
    return;
  }

  // Show up to 20 (fetch each profile; simple + reliable for now)
  wrap.innerHTML = `<div class="index-row"><span class="dim">LOADING FRIENDS…</span></div>`;

  (async () => {
    const rows = [];
    for(const fid of friends.slice(0, 20)){
      const snap = await getDoc(doc(db,"users", fid));
      if(!snap.exists()) continue;
      const u = snap.data();
      rows.push(`
        <div class="index-row">
          <span style="cursor:pointer; color: rgba(0,255,65,0.85)" data-fuid="${esc(u.uid)}">${esc(u.username || "UNKNOWN")}</span>
          <span class="dim" style="margin-left:auto;">${esc(computeRankName(u.carvingCount || 0))}</span>
        </div>
      `);
    }
    wrap.innerHTML = rows.join("") || `<div class="index-row"><span class="dim">NO FRIENDS FOUND.</span></div>`;

    wrap.querySelectorAll("[data-fuid]").forEach(el=>{
      el.onclick = () => openProfile(el.getAttribute("data-fuid"));
    });
  })();
}

/* =========================
   FEED / LEADERBOARD (PLACEHOLDERS)
========================= */
async function loadLeaderboardStream(){
  const wrap = $("leaderboard");
  if(!wrap) return;

  const qy = query(collection(db,"users"), orderBy("carvingCount","desc"), limit(10));
  onSnapshot(qy, (snap) => {
    wrap.innerHTML = "";
    snap.forEach(s => {
      const u = s.data();
      const row = document.createElement("div");
      row.className = "index-row";
      row.innerHTML = `
        <span style="cursor:pointer; color: rgba(0,255,65,0.85)">${esc(u.username || "UNKNOWN")}</span>
        <span class="dim">${esc(u.carvingCount || 0)} carvings</span>
      `;
      row.onclick = () => openProfile(u.uid);
      wrap.appendChild(row);
    });
  });
}

async function loadFeedStream(){
  const wrap = $("feed-content");
  if(!wrap) return;
  wrap.innerHTML = `<div class="index-row"><span class="dim">FEED SYSTEM READY (hook your posts collection here).</span></div>`;
}

/* =========================
   PROFILE MODAL
========================= */
async function openProfile(uid){
  const snap = await getDoc(doc(db,"users", uid));
  if(!snap.exists()) return toast("PROFILE NOT FOUND.");
  const u = snap.data();

  currentModalUid = u.uid;
  currentModalUsername = u.username || "UNKNOWN";

  setText("modal-name", u.username || "UNKNOWN");
  setText("modal-rank", `RANK: ${computeRankName(u.carvingCount || 0)}`);
  setText("modal-stats", `CARVINGS: ${u.carvingCount || 0}`);

  renderAvatarInto($("modal-avatar"), u.avatar || "skull", u.uid);

  // modal friend button state
  const btn = $("modal-friend-btn");
  if(btn){
    btn.disabled = false;
    btn.classList.remove("disabled");

    const myUid = auth.currentUser.uid;
    const already = (currentUserData.friends || []).includes(u.uid);

    if(already){
      btn.textContent = "FRIENDS";
      btn.disabled = true;
      btn.classList.add("disabled");
    }else if(u.uid === myUid){
      btn.textContent = "THAT’S YOU";
      btn.disabled = true;
      btn.classList.add("disabled");
    }else{
      // check if pending request exists either direction
      const a = await getDoc(doc(db,"friendRequests", friendReqDocId(myUid, u.uid)));
      const b = await getDoc(doc(db,"friendRequests", friendReqDocId(u.uid, myUid)));
      const pendingSent = a.exists() && a.data().status === "pending";
      const pendingIncoming = b.exists() && b.data().status === "pending";

      if(pendingIncoming){
        btn.textContent = "OPEN FRIENDS TAB";
      }else if(pendingSent){
        btn.textContent = "REQUEST_SENT";
        btn.disabled = true;
        btn.classList.add("disabled");
      }else{
        btn.textContent = "ADD_FRIEND";
      }
    }
  }

  $("profile-modal")?.classList.remove("hidden");
}

/* =========================
   ADMIN PLACEHOLDERS
========================= */
async function purgeMyLogs(){ toast("PURGE LOGS NOT IMPLEMENTED YET (needs batch delete)."); }
async function purgeMyPosts(){ toast("PURGE POSTS NOT IMPLEMENTED YET (feed not wired)."); }

/* =========================
   STARTUP
========================= */
(function boot(){
  try{ hookCoreButtons(); }catch(e){ console.error("boot hook error:", e); }
})();
