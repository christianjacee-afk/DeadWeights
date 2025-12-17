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
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  deleteDoc,
  serverTimestamp,
  limit,
  getDocs,
  updateDoc,
  increment
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

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

/* =========================
   GAME / APP DATA
========================= */

// Big exercise library (used by QUICK LOG)
const EXERCISES = {
  Push: ["Bench Press","Incline Press","Incline DB Press","Overhead Press","Machine Press","Lateral Raises","Cable Fly","Dips","Skull Crushers","Rope Pushdown"],
  Pull: ["Deadlift","RDL","Pull Ups","Lat Pulldown","Chest-Supported Row","Barbell Row","Cable Row","Face Pulls","Rear Delt Fly","EZ-Bar Curl","Hammer Curl"],
  Legs: ["Back Squat","Hack Squat","Leg Press","Bulgarian Split Squat","Leg Extension","Ham Curl","Hip Thrust","Calf Raises","Lunges","Adduction Machine","Abduction Machine"]
};

// Calling cards (animated css skins)
const CALLING_CARDS = [
  { id:"rust",  css:"card-rust",  name:"RUSTWROUGHT" },
  { id:"crt",   css:"card-crt",   name:"CRT_VEIN" },
  { id:"blood", css:"card-blood", name:"BLOOD_SEAL" },
  { id:"void",  css:"card-void",  name:"VOIDPRINT" },
  { id:"neon",  css:"card-neon",  name:"NEON_GRAVE" },
  { id:"ember", css:"card-ember", name:"EMBER_FANG" }
];

// Grave tags (small banner)
const TAGS = [
  { id:"rust",  css:"tag-rust" },
  { id:"crt",   css:"tag-crt"  },
  { id:"blood", css:"tag-blood"},
  { id:"void",  css:"tag-void" }
];

// Rank thresholds (XP based)
const RANKS = [
  { min:0,    name:"NEWBORN",     next:100 },
  { min:100,  name:"STALKER",     next:350 },
  { min:350,  name:"CRYPT_RUNNER",next:800 },
  { min:800,  name:"GRAVE_LORD",  next:1500 },
  { min:1500, name:"IMMORTAL",    next:999999 }
];

// Workout Plan Index (includes your M–F plan)
const PLANS = [
  {
    id: "mf_every_muscle_2x",
    name: "MON–FRI // EVERY MUSCLE 2×",
    desc: "Your worksheet plan. Full-body Monday + Lower A/B + Push + Pull/Arms. (DeadWeights canonical.)",
    days: [
      {
        day: "MONDAY",
        title: "FULL BODY COMPOUND",
        items: [
          { ex:"Squat / Leg Press", target:"3× 5–8" },
          { ex:"Bench / Incline", target:"3× 5–8" },
          { ex:"Row / Pull-ups", target:"3× 6–10" },
          { ex:"Overhead Press", target:"2× 6–8" },
          { ex:"RDL / Deadlift", target:"2× 6–8" },
          { ex:"Curl or Pushdown (opt)", target:"2× 10–12" }
        ]
      },
      {
        day: "TUESDAY",
        title: "LOWER A (FULL LEGS)",
        items: [
          { ex:"Squat / Hack Squat", target:"4× 6–8" },
          { ex:"Leg Press", target:"3× 10" },
          { ex:"Romanian Deadlift", target:"4× 8" },
          { ex:"Ham Curl", target:"3× 12" },
          { ex:"Hip Thrust", target:"3× 10" },
          { ex:"Adduction Machine", target:"3× 15" },
          { ex:"Abduction Machine", target:"3× 15" }
        ]
      },
      {
        day: "WEDNESDAY",
        title: "UPPER PUSH",
        items: [
          { ex:"Bench / Incline Press", target:"4× 6–8" },
          { ex:"Fly Variation", target:"3× 12" },
          { ex:"OHP / Machine Press", target:"3× 8" },
          { ex:"Lateral Raises", target:"4× 12–15" },
          { ex:"Skull Crushers", target:"3× 10" },
          { ex:"Rope Pushdowns", target:"3× 12" }
        ]
      },
      {
        day: "THURSDAY",
        title: "LOWER B (POSTERIOR)",
        items: [
          { ex:"Deadlift / RDL", target:"4× 6" },
          { ex:"Hip Thrust", target:"3× 8" },
          { ex:"Bulgarian Split Squat", target:"3× 8" },
          { ex:"Leg Extension", target:"3× 15" },
          { ex:"Adduction Machine", target:"2× 15" },
          { ex:"Abduction Machine", target:"2× 15" }
        ]
      },
      {
        day: "FRIDAY",
        title: "UPPER PULL + ARMS",
        items: [
          { ex:"Pull-ups / Pulldowns", target:"4× 8–10" },
          { ex:"Barbell / Cable Rows", target:"3× 8–10" },
          { ex:"Face Pulls", target:"3× 15" },
          { ex:"EZ-Bar Curls", target:"4× 8–10" },
          { ex:"Hammer Curls", target:"3× 10–12" },
          { ex:"Close-Grip Bench / Dips", target:"3× 6–8" }
        ]
      }
    ]
  },
  {
    id: "dw_minimal_3day",
    name: "3-DAY // MINIMAL CURSE",
    desc: "For chaotic weeks. Still tracks XP + PRs. Not your main, but it’s there.",
    days: [
      { day:"DAY 1", title:"FULL BODY A", items:[{ex:"Squat",target:"3×5"},{ex:"Bench",target:"3×5"},{ex:"Row",target:"3×8"}] },
      { day:"DAY 2", title:"FULL BODY B", items:[{ex:"Deadlift",target:"3×3"},{ex:"Press",target:"3×5"},{ex:"Pulldown",target:"3×10"}] },
      { day:"DAY 3", title:"FULL BODY C", items:[{ex:"Leg Press",target:"3×10"},{ex:"Incline",target:"3×8"},{ex:"Face Pulls",target:"3×15"}] }
    ]
  }
];

/* =========================
   STATE
========================= */
let currentUser = null;
let currentUserData = null;
let isAdmin = false;

let selectedTagCss = "tag-rust";
let selectedCardCss = "card-rust";
let activePlanId = null;

/* =========================
   SMALL HELPERS
========================= */
const $ = (id) => document.getElementById(id);

function safeText(str){
  return String(str ?? "").replace(/[<>&]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]));
}

function rankFromXP(xp){
  const r = RANKS.filter(rk => xp >= rk.min).slice(-1)[0] || RANKS[0];
  const next = r.next;
  return { name:r.name, min:r.min, next };
}

// Epley est 1RM
function est1RM(weight, reps){
  const w = Number(weight || 0);
  const r = Number(reps || 0);
  if (!w || !r) return 0;
  return Math.round(w * (1 + (r/30)));
}

function todayLabel(){
  // local day name
  const d = new Date();
  return ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][d.getDay()];
}

function setError(elId, msg){
  const el = $(elId);
  if (el) el.textContent = msg || "";
}

/* =========================
   UI: SCREENS + TABS
========================= */
function showAuth(){
  $("registration-screen").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
}
function showRegistration(){
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.remove("hidden");
}

function showTab(tabId){
  ["feed-panel","plans-panel","friends-panel","settings-panel"].forEach(id => $(id).classList.add("hidden"));
  $(tabId).classList.remove("hidden");
}

/* =========================
   AUTH FLOW
========================= */
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!user){
    currentUserData = null;
    isAdmin = false;
    $("app").classList.add("hidden");
    $("auth-screen").classList.remove("hidden");
    $("registration-screen").classList.add("hidden");
    return;
  }

  // fetch user doc
  const uRef = doc(db, "users", user.uid);
  const snap = await getDoc(uRef);

  if (!snap.exists()){
    // New user hit auth first (rare) -> force registration step 2
    showRegistration();
    $("reg-step-1").classList.remove("hidden");
    $("reg-step-2").classList.add("hidden");
    $("app").classList.add("hidden");
    return;
  }

  currentUserData = snap.data();

  // SAFE admin: only by custom claims, not stored in Firestore by client.
  const token = await user.getIdTokenResult(true);
  isAdmin = !!token.claims.admin;

  // Boot app
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  initApp();
});

/* =========================
   INIT APP
========================= */
function initApp(){
  // Load picks
  activePlanId = currentUserData.activePlanId || PLANS[0].id;
  selectedTagCss = currentUserData.tagCss || "tag-rust";
  selectedCardCss = currentUserData.cardCss || "card-rust";

  // header/profile
  $("header-callsign").textContent = currentUserData.username || "SUBJECT";
  $("profileUsername").textContent = currentUserData.username || "SUBJECT";

  // calling card
  const card = $("user-calling-card");
  card.className = `calling-card ${selectedCardCss}`;

  // tag
  const tag = $("user-grave-tag");
  tag.className = `grave-tag ${selectedTagCss}`;

  // rank/XP
  const xp = Number(currentUserData.xp || 0);
  const r = rankFromXP(xp);
  $("user-rank").textContent = r.name;
  $("stat-xp").textContent = xp;

  const span = Math.max(1, (r.next - r.min));
  const pct = Math.min(100, Math.max(0, ((xp - r.min) / span) * 100));
  $("xp-fill").style.width = `${pct}%`;
  $("xp-now").textContent = xp;
  $("xp-next").textContent = r.next;

  // Admin UI
  if (isAdmin){
    $("admin-panel").classList.remove("hidden");
  } else {
    $("admin-panel").classList.add("hidden");
  }

  // Pickers
  renderTagPickers();
  renderCardPickers();

  // Plans
  renderPlans();
  setupDayPicker();
  syncPlanUI();

  // Quick log dropdowns
  initQuickLog();

  // listeners
  wireAppListeners();

  // Live content
  loadFeed();
  loadLeaderboard();
  loadPRs();
  loadFriends();
}

/* =========================
   REGISTRATION
========================= */
async function doCreateAccountStep1(){
  setError("reg-error","");
  const email = $("reg-email").value.trim();
  const pass = $("reg-pass").value;
  const confirm = $("reg-confirm").value;

  if (!email || !pass) return setError("reg-error","EMAIL + PASSCODE REQUIRED.");
  if (pass.length < 6) return setError("reg-error","PASSCODE MUST BE 6+ CHARS.");
  if (pass !== confirm) return setError("reg-error","PASSCODES DO NOT MATCH.");

  try{
    await createUserWithEmailAndPassword(auth, email, pass);
    // Go to step 2
    $("reg-step-1").classList.add("hidden");
    $("reg-step-2").classList.remove("hidden");
  }catch(e){
    setError("reg-error", e.message || "REGISTRATION FAILED.");
  }
}

async function finalizeRegistration(){
  setError("reg2-error","");
  const username = $("reg-username").value.trim();
  if (!username) return setError("reg2-error","CALLSIGN REQUIRED.");

  if (!auth.currentUser) return setError("reg2-error","AUTH LOST. RETURN TO LOGIN.");

  const uRef = doc(db, "users", auth.currentUser.uid);

  try{
    await setDoc(uRef, {
      uid: auth.currentUser.uid,
      username,
      tagCss: selectedTagCss,
      cardCss: selectedCardCss,
      xp: 0,
      friends: [],
      activePlanId: PLANS[0].id,
      createdAt: serverTimestamp()
    }, { merge:true });

    // done; onAuthStateChanged will boot app
  }catch(e){
    setError("reg2-error", e.message || "FINALIZE FAILED.");
  }
}

/* =========================
   PICKERS
========================= */
function renderTagPickers(){
  const mk = (targetId) => {
    const wrap = $(targetId);
    if (!wrap) return;
    wrap.innerHTML = TAGS.map(t => `
      <div class="tag-opt ${t.css} ${t.css===selectedTagCss ? "active":""}" data-tag="${t.css}"></div>
    `).join("");

    wrap.querySelectorAll(".tag-opt").forEach(el => {
      el.addEventListener("click", () => {
        selectedTagCss = el.dataset.tag;
        wrap.querySelectorAll(".tag-opt").forEach(x => x.classList.remove("active"));
        el.classList.add("active");
      });
    });
  };

  mk("initial-tag-picker");
  mk("settings-tag-picker");
}

function renderCardPickers(){
  const mk = (targetId) => {
    const wrap = $(targetId);
    if (!wrap) return;

    wrap.innerHTML = CALLING_CARDS.map(c => `
      <div class="card-opt ${c.css===selectedCardCss ? "active":""}" data-card="${c.css}">
        <div class="calling-card ${c.css}">
          <div class="card-sigil"></div>
          <div class="card-title">
            <span class="card-name">${c.name}</span>
            <span class="card-sub">CALLING_CARD</span>
          </div>
        </div>
      </div>
    `).join("");

    wrap.querySelectorAll(".card-opt").forEach(el => {
      el.addEventListener("click", () => {
        selectedCardCss = el.dataset.card;
        wrap.querySelectorAll(".card-opt").forEach(x => x.classList.remove("active"));
        el.classList.add("active");
      });
    });
  };

  mk("initial-card-picker");
  mk("settings-card-picker");
}

/* =========================
   FEED (POSTS + COMMENTS + DELETE)
========================= */
function loadFeed(){
  const feed = $("feed-content");
  onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(30)), (snap) => {
    feed.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      const mine = (p.uid === auth.currentUser.uid);
      const dateStr = p.timestamp?.toDate ? p.timestamp.toDate().toLocaleString() : "";

      feed.innerHTML += `
        <div class="grave-box post" data-postid="${d.id}">
          <div class="grave-header-sub">
            <div>
              <span style="color:#ddd; letter-spacing:2px;">${safeText(p.username || "UNKNOWN")}</span>
              <span class="post-meta"> // ${safeText(dateStr)}</span>
            </div>
            <div class="row-right">
              ${mine || isAdmin ? `<button class="mini-btn danger delPostBtn" data-id="${d.id}">DELETE</button>` : ""}
            </div>
          </div>

          <div class="post-body">${safeText(p.text || "")}</div>

          <div class="comment-section" id="comments-${d.id}"></div>
          <div class="comment-input-wrap">
            <input id="in-${d.id}" placeholder="REPLY...">
            <button class="mini-btn sendCommentBtn" data-id="${d.id}">SEND</button>
          </div>
        </div>
      `;

      loadComments(d.id);
    });

    // bind delete + comment send
    feed.querySelectorAll(".delPostBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await deletePost(id);
      });
    });

    feed.querySelectorAll(".sendCommentBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.id;
        await postComment(postId);
      });
    });
  });
}

function loadComments(postId){
  onSnapshot(query(collection(db, `posts/${postId}/comments`), orderBy("timestamp", "asc"), limit(50)), (snap) => {
    const box = $(`comments-${postId}`);
    if (!box) return;
    box.innerHTML = "";
    snap.forEach(c => {
      const cd = c.data();
      box.innerHTML += `<div class="comment"><b>${safeText(cd.username || "UNKNOWN")}:</b> ${safeText(cd.text || "")}</div>`;
    });
  });
}

async function postComment(postId){
  const input = $(`in-${postId}`);
  const text = (input?.value || "").trim();
  if (!text) return;

  await addDoc(collection(db, `posts/${postId}/comments`), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  input.value = "";
}

async function deletePost(postId){
  // Firestore rules must enforce: owner or admin.
  await deleteDoc(doc(db, "posts", postId));
}

async function createPost(){
  const text = $("statusText").value.trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  $("statusText").value = "";
}

/* =========================
   LEADERBOARD
========================= */
function loadLeaderboard(){
  onSnapshot(query(collection(db, "users"), orderBy("xp", "desc"), limit(7)), (snap) => {
    const lb = $("leaderboard");
    lb.innerHTML = snap.docs.map((d, i) => {
      const u = d.data();
      return `<div class="index-row"><span>#${i+1} ${safeText(u.username || "UNKNOWN")}</span><span>${Number(u.xp || 0)} XP</span></div>`;
    }).join("");
  });
}

/* =========================
   PLANS UI
========================= */
function renderPlans(){
  const grid = $("plan-grid");
  grid.innerHTML = PLANS.map(p => `
    <div class="plan-card ${p.id===activePlanId ? "active":""}" data-plan="${p.id}">
      <div class="plan-title">${safeText(p.name)}</div>
      <div class="plan-sub">${safeText(p.desc)}</div>
    </div>
  `).join("");

  grid.querySelectorAll(".plan-card").forEach(card => {
    card.addEventListener("click", async () => {
      activePlanId = card.dataset.plan;
      grid.querySelectorAll(".plan-card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      await updateDoc(doc(db, "users", auth.currentUser.uid), { activePlanId });
      currentUserData.activePlanId = activePlanId;
      setupDayPicker();
      syncPlanUI();
    });
  });
}

function setupDayPicker(){
  const plan = PLANS.find(p => p.id === (activePlanId || PLANS[0].id)) || PLANS[0];
  const dp = $("day-picker");
  dp.innerHTML = plan.days.map((d, idx) => `<option value="${idx}">${d.day} // ${d.title}</option>`).join("");

  // default to today if matches
  const t = todayLabel();
  const todayIndex = plan.days.findIndex(d => d.day === t);
  dp.value = String(todayIndex >= 0 ? todayIndex : 0);

  dp.onchange = () => syncPlanExercisePicker();
  syncPlanExercisePicker();
}

function syncPlanExercisePicker(){
  const plan = PLANS.find(p => p.id === (activePlanId || PLANS[0].id)) || PLANS[0];
  const dayIdx = Number($("day-picker").value || 0);
  const day = plan.days[dayIdx] || plan.days[0];
  const exSel = $("plan-ex-picker");

  exSel.innerHTML = day.items.map(i => `<option value="${safeText(i.ex)}">${safeText(i.ex)} (${safeText(i.target)})</option>`).join("");
}

function syncPlanUI(){
  const plan = PLANS.find(p => p.id === (activePlanId || PLANS[0].id)) || PLANS[0];
  $("active-plan-name").textContent = plan.name;

  // show today's workout list
  const t = todayLabel();
  const d = plan.days.find(x => x.day === t) || plan.days[0];

  $("today-workout").innerHTML = `
    <div class="small-label">${safeText(d.day)} // ${safeText(d.title)}</div>
    ${d.items.map(i => `<div class="index-row"><span>${safeText(i.ex)}</span><span>${safeText(i.target)}</span></div>`).join("")}
  `;
}

/* =========================
   LOGGING + PR SYSTEM
========================= */
async function submitLog({ exercise, sets, reps, weight, source="plan" }){
  const ex = (exercise || "").trim();
  const s = Number(sets || 0);
  const r = Number(reps || 0);
  const w = Number(weight || 0);

  if (!ex || !s || !r) return alert("SETS + REPS + EXERCISE REQUIRED.");

  // Save log
  await addDoc(collection(db, "logs"), {
    uid: auth.currentUser.uid,
    exercise: ex,
    sets: s,
    reps: r,
    weight: w,
    source,
    planId: activePlanId || null,
    dayLabel: todayLabel(),
    timestamp: serverTimestamp()
  });

  // XP gain (simple + game-feel)
  // base = 5, plus volume weight
  const xpGain = Math.max(5, Math.round((s * r * Math.max(w, 1)) / 50));
  await updateDoc(doc(db, "users", auth.currentUser.uid), { xp: increment(xpGain) });

  // Auto PR (best weight and best est1RM per exercise)
  const prRef = doc(db, "users", auth.currentUser.uid, "prs", ex);
  const prSnap = await getDoc(prRef);
  const this1RM = est1RM(w, r);

  if (!prSnap.exists()){
    await setDoc(prRef, {
      exercise: ex,
      bestWeight: w || 0,
      bestEst1RM: this1RM || 0,
      bestRepsAtBestWeight: r,
      updatedAt: serverTimestamp()
    });
  } else {
    const cur = prSnap.data();
    const updates = {};
    if ((w || 0) > Number(cur.bestWeight || 0)){
      updates.bestWeight = w || 0;
      updates.bestRepsAtBestWeight = r;
    }
    if ((this1RM || 0) > Number(cur.bestEst1RM || 0)){
      updates.bestEst1RM = this1RM || 0;
    }
    if (Object.keys(updates).length){
      updates.updatedAt = serverTimestamp();
      await updateDoc(prRef, updates);
    }
  }

  // reflect locally after a moment (live listeners update most UI)
}

function loadPRs(){
  onSnapshot(query(collection(db, "users", auth.currentUser.uid, "prs"), orderBy("bestEst1RM", "desc"), limit(50)), (snap) => {
    const list = $("prList");
    list.innerHTML = "";
    snap.forEach(d => {
      const pr = d.data();
      list.innerHTML += `
        <div class="index-row">
          <span>${safeText(pr.exercise)}</span>
          <span class="row-right">
            <span>${Number(pr.bestWeight || 0)} LBS</span>
            <span style="color:#666;">|</span>
            <span>${Number(pr.bestEst1RM || 0)} 1RM</span>
          </span>
        </div>
      `;
    });
  });

  // also set carving count = # of logs (fast estimate via query)
  onSnapshot(query(collection(db, "logs"), where("uid","==",auth.currentUser.uid), orderBy("timestamp","desc"), limit(200)), (snap) => {
    $("stat-count").textContent = snap.size;
  });

  // keep user doc live too (rank bar updates)
  onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
    if (!snap.exists()) return;
    currentUserData = snap.data();
    const xp = Number(currentUserData.xp || 0);
    const r = rankFromXP(xp);
    $("user-rank").textContent = r.name;
    $("stat-xp").textContent = xp;

    const span = Math.max(1, (r.next - r.min));
    const pct = Math.min(100, Math.max(0, ((xp - r.min) / span) * 100));
    $("xp-fill").style.width = `${pct}%`;
    $("xp-now").textContent = xp;
    $("xp-next").textContent = r.next;
  });
}

/* =========================
   QUICK LOG
========================= */
function initQuickLog(){
  const catSel = $("quick-cat");
  const exSel = $("quick-ex");

  catSel.innerHTML = Object.keys(EXERCISES).map(k => `<option value="${k}">${k}</option>`).join("");

  const sync = () => {
    const cat = catSel.value;
    exSel.innerHTML = EXERCISES[cat].map(e => `<option value="${safeText(e)}">${safeText(e)}</option>`).join("");
  };
  catSel.onchange = sync;
  sync();
}

/* =========================
   FRIENDS
========================= */
function loadFriends(){
  const list = $("friends-list");
  list.innerHTML = "";

  const friends = currentUserData.friends || [];
  if (!friends.length){
    list.innerHTML = `<div class="small-text">NO COVEN MEMBERS. SEARCH + ADD.</div>`;
    return;
  }

  friends.forEach(async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    list.innerHTML += `
      <div class="index-row">
        <span>${safeText(u.username || "UNKNOWN")}</span>
        <div class="row-right">
          <button class="mini-btn danger" data-remove="${uid}">SEVER</button>
        </div>
      </div>
    `;

    list.querySelectorAll("[data-remove]").forEach(btn => {
      btn.onclick = async () => {
        const targetUid = btn.getAttribute("data-remove");
        await updateDoc(doc(db,"users",auth.currentUser.uid), {
          friends: (currentUserData.friends || []).filter(x => x !== targetUid)
        });
        // reload local
        currentUserData.friends = (currentUserData.friends || []).filter(x => x !== targetUid);
        loadFriends();
      };
    });
  });
}

async function searchUsersByUsername(prefix){
  const results = $("search-results");
  results.innerHTML = "";
  const term = prefix.trim();
  if (term.length < 2){
    results.innerHTML = `<div class="small-text">TYPE 2+ CHARS.</div>`;
    return;
  }

  // Simple username match using range query
  const end = term + "\uf8ff";
  const qy = query(
    collection(db, "users"),
    where("username", ">=", term),
    where("username", "<=", end),
    limit(10)
  );

  const snap = await getDocs(qy);
  if (snap.empty){
    results.innerHTML = `<div class="small-text">NO MATCHES.</div>`;
    return;
  }

  snap.forEach(d => {
    const u = d.data();
    const already = (currentUserData.friends || []).includes(d.id);
    const isMe = (d.id === auth.currentUser.uid);

    results.innerHTML += `
      <div class="index-row">
        <span>${safeText(u.username || "UNKNOWN")}</span>
        <div class="row-right">
          ${isMe ? `<span style="color:#666;">(YOU)</span>` : `
            <button class="mini-btn ${already ? "danger":""}" data-add="${d.id}" ${already ? "disabled":""}>
              ${already ? "IN_COVEN" : "ADD"}
            </button>
          `}
        </div>
      </div>
    `;
  });

  results.querySelectorAll("[data-add]").forEach(btn => {
    btn.onclick = async () => {
      const targetUid = btn.getAttribute("data-add");
      const next = Array.from(new Set([...(currentUserData.friends || []), targetUid]));
      await updateDoc(doc(db,"users",auth.currentUser.uid), { friends: next });
      currentUserData.friends = next;
      btn.textContent = "IN_COVEN";
      btn.disabled = true;
      btn.classList.add("danger");
      loadFriends();
    };
  });
}

/* =========================
   SETTINGS
========================= */
async function updateUsername(){
  const newName = $("new-username").value.trim();
  if (!newName) return alert("NEW_CALLSIGN REQUIRED.");
  await updateDoc(doc(db,"users",auth.currentUser.uid), { username: newName });
  $("new-username").value = "";
}

async function updateTag(){
  await updateDoc(doc(db,"users",auth.currentUser.uid), { tagCss: selectedTagCss });
  $("user-grave-tag").className = `grave-tag ${selectedTagCss}`;
}

async function updateCard(){
  await updateDoc(doc(db,"users",auth.currentUser.uid), { cardCss: selectedCardCss });
  $("user-calling-card").className = `calling-card ${selectedCardCss}`;
}

async function requestAccountPurge(){
  await addDoc(collection(db,"purge_requests"), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    email: auth.currentUser.email || null,
    timestamp: serverTimestamp()
  });
  alert("PURGE_REQUEST_SENT");
}

/* =========================
   ADMIN (SAFE)
========================= */
async function adminNukeMyLast20(){
  // Only visible for admins. Firestore rules should still enforce admin claim.
  const qy = query(collection(db,"posts"), where("uid","==",auth.currentUser.uid), orderBy("timestamp","desc"), limit(20));
  const snap = await getDocs(qy);
  const tasks = [];
  snap.forEach(d => tasks.push(deleteDoc(doc(db,"posts",d.id))));
  await Promise.all(tasks);
  alert("20 POSTS PURGED.");
}

/* =========================
   WIRING (DOM LISTENERS)
========================= */
let listenersWired = false;
function wireAppListeners(){
  if (listenersWired) return;
  listenersWired = true;

  // Tabs
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });

  // Auth
  $("showRegBtn").onclick = () => {
    setError("login-error","");
    showRegistration();
    $("reg-step-1").classList.remove("hidden");
    $("reg-step-2").classList.add("hidden");
  };

  $("returnToLoginBtn").onclick = () => {
    setError("reg-error","");
    setError("reg2-error","");
    showAuth();
  };

  $("loginBtn").onclick = async () => {
    setError("login-error","");
    const email = $("email").value.trim();
    const pass = $("password").value;
    if (!email || !pass) return setError("login-error","MISSING CREDENTIALS.");
    try{
      await signInWithEmailAndPassword(auth, email, pass);
    }catch(e){
      setError("login-error", e.message || "LOGIN FAILED.");
    }
  };

  // Registration
  $("nextStepBtn").onclick = doCreateAccountStep1;
  $("finalizeRegBtn").onclick = finalizeRegistration;

  // Posting
  $("postStatusBtn").onclick = createPost;

  // Logging (plan)
  $("submitLogBtn").onclick = async () => {
    const exercise = $("plan-ex-picker").value;
    const sets = $("log-sets").value;
    const reps = $("log-reps").value;
    const weight = $("log-w").value;

    await submitLog({ exercise, sets, reps, weight, source:"plan" });

    $("log-sets").value = "";
    $("log-reps").value = "";
    $("log-w").value = "";
  };

  // Quick Log
  $("quickLogBtn").onclick = async () => {
    const exercise = $("quick-ex").value;
    const sets = $("quick-sets").value;
    const reps = $("quick-reps").value;
    const weight = $("quick-w").value;

    await submitLog({ exercise, sets, reps, weight, source:"quick" });

    $("quick-sets").value = "";
    $("quick-reps").value = "";
    $("quick-w").value = "";
  };

  // Settings
  $("renameBtn").onclick = updateUsername;
  $("updateTagBtn").onclick = updateTag;
  $("updateCardBtn").onclick = updateCard;
  $("deleteAccountBtn").onclick = requestAccountPurge;

  // Logout
  $("logoutBtn").onclick = () => signOut(auth);

  // Friends search
  let t = null;
  $("userSearch").addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => searchUsersByUsername($("userSearch").value), 250);
  });

  // Admin
  $("admin-nuke-my-feed").onclick = adminNukeMyLast20;
}

/* =========================
   BOOTSTRAP AUTH SCREEN DEFAULT
========================= */
showAuth();
