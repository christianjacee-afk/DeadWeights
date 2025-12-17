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
  updateDoc
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
   DATA: TAGS / AVATARS / RANKS
========================= */
const TAGS = [
  { id: "rust", css: "tag-rust", name: "RUST" },
  { id: "crt", css: "tag-crt", name: "CRT" },
  { id: "blood", css: "tag-blood", name: "BLOOD" },
  { id: "void", css: "tag-void", name: "VOID" }
];

const AVATARS = [
  "a-sigil-1","a-sigil-2","a-sigil-3","a-sigil-4",
  "a-sigil-5","a-sigil-6","a-sigil-7","a-sigil-8"
];

/** XP-based rank ladder (game-ish) */
const RANKS = [
  { minXP: 0,    id: "newborn",   name: "NEWBORN",    title: "FRESHLY_BURIED" },
  { minXP: 40,   id: "stalker",   name: "STALKER",    title: "YOU_HEAR_IT_BREATHING" },
  { minXP: 120,  id: "gravelord", name: "GRAVE_LORD", title: "CROWNED_IN_DUST" },
  { minXP: 260,  id: "immortal",  name: "IMMORTAL",   title: "THE_GRAVE_REMEMBERS" }
];

function getRankByXP(xp){
  const sorted = [...RANKS].sort((a,b)=>a.minXP-b.minXP);
  let r = sorted[0];
  for (const item of sorted) if ((xp||0) >= item.minXP) r = item;
  return r;
}

/* =========================
   DATA: EXERCISE LIBRARY (BIG)
========================= */
const EXERCISE_LIBRARY = {
  Push: [
    "Bench Press","Incline Bench Press","Decline Bench Press","DB Bench Press",
    "Incline DB Press","Overhead Press","Seated DB Shoulder Press","Arnold Press",
    "Lateral Raises","Cable Lateral Raises","Front Raises","Rear Delt Fly",
    "Dips","Tricep Pushdown","Overhead Tricep Extension","Skull Crushers",
    "Close-Grip Bench Press","Machine Chest Press","Pec Deck","Cable Fly"
  ],
  Pull: [
    "Deadlift","Rack Pull","Romanian Deadlift (Light)","Pull Ups","Chin Ups",
    "Lat Pulldown","Single-Arm Lat Pulldown","Barbell Row","Pendlay Row",
    "Seated Cable Row","Chest-Supported Row","T-Bar Row","Face Pulls",
    "Straight-Arm Pulldown","DB Row","Shrugs","Hammer Curls","EZ Bar Curls",
    "Incline DB Curls","Cable Curls","Preacher Curls","Reverse Curls"
  ],
  Legs: [
    "Back Squat","Front Squat","Hack Squat","Leg Press","Bulgarian Split Squat",
    "Walking Lunges","Reverse Lunges","RDLs","Good Mornings","Leg Curl",
    "Seated Leg Curl","Leg Extensions","Hip Thrust","Glute Bridge","Cable Kickbacks",
    "Calf Raises","Seated Calf Raises","Adductors","Abductors","Step Ups"
  ],
  Core: [
    "Hanging Leg Raises","Cable Crunch","Ab Wheel","Plank","Side Plank",
    "Dead Bug","Pallof Press","Russian Twists"
  ],
  Conditioning: [
    "Incline Treadmill Walk","Rowing Machine","Assault Bike","Jump Rope",
    "Sled Push","Kettlebell Swings","Burpees"
  ]
};

/* =========================
   DATA: PLAN INDEX (3–6 day, goals)
   Each plan includes day templates, categories, and recommended exercise pools
========================= */
const PLAN_INDEX = [
  {
    id: "ppl_5",
    name: "PPL // 5-DAY (HYBRID)",
    days: 5,
    goal: ["balanced","hypertrophy","strength"],
    tags: ["PUSH","PULL","LEGS","UPPER","LOWER"],
    description:
`A 5-day Push/Pull/Legs hybrid that hits everything 2x weekly without frying you.
- Day1 PUSH (strength bias)
- Day2 PULL (strength bias)
- Day3 LEGS (strength bias)
- Day4 UPPER (volume)
- Day5 LOWER (volume)
Rest: weekend or as needed.`,
    splitDays: [
      { label:"DAY_1 PUSH", blocks:[{cat:"Push", picks:["Bench Press","Overhead Press","Incline DB Press","Lateral Raises","Tricep Pushdown"]},{cat:"Core", picks:["Cable Crunch","Plank"]}] },
      { label:"DAY_2 PULL", blocks:[{cat:"Pull", picks:["Deadlift","Barbell Row","Lat Pulldown","Face Pulls","EZ Bar Curls"]},{cat:"Core", picks:["Hanging Leg Raises"]}] },
      { label:"DAY_3 LEGS", blocks:[{cat:"Legs", picks:["Back Squat","RDLs","Leg Press","Leg Curl","Calf Raises"]}] },
      { label:"DAY_4 UPPER", blocks:[{cat:"Push", picks:["DB Bench Press","Cable Fly","Arnold Press","Lateral Raises","Skull Crushers"]},{cat:"Pull", picks:["Seated Cable Row","Pull Ups","Face Pulls","Hammer Curls"]}] },
      { label:"DAY_5 LOWER", blocks:[{cat:"Legs", picks:["Front Squat","Hip Thrust","Leg Extensions","Seated Leg Curl","Calf Raises"]},{cat:"Conditioning", picks:["Incline Treadmill Walk"]}] }
    ]
  },
  {
    id:"ul_4",
    name:"UPPER/LOWER // 4-DAY (STRENGTH)",
    days:4,
    goal:["strength","balanced"],
    tags:["UPPER","LOWER","COMPOUND"],
    description:
`Classic 4-day Upper/Lower built for strength progression.
- Upper A / Lower A / Upper B / Lower B
Use heavier compounds first, then accessories.`,
    splitDays:[
      { label:"UPPER_A", blocks:[{cat:"Push", picks:["Bench Press","Overhead Press","Dips"]},{cat:"Pull", picks:["Barbell Row","Lat Pulldown","Face Pulls"]},{cat:"Core", picks:["Pallof Press"]}] },
      { label:"LOWER_A", blocks:[{cat:"Legs", picks:["Back Squat","RDLs","Leg Press","Calf Raises"]}] },
      { label:"UPPER_B", blocks:[{cat:"Push", picks:["Incline Bench Press","Seated DB Shoulder Press","Tricep Pushdown"]},{cat:"Pull", picks:["Pull Ups","Seated Cable Row","EZ Bar Curls"]}] },
      { label:"LOWER_B", blocks:[{cat:"Legs", picks:["Front Squat","Hip Thrust","Leg Curl","Leg Extensions"]},{cat:"Conditioning", picks:["Rowing Machine"]}] }
    ]
  },
  {
    id:"fb_3",
    name:"FULL BODY // 3-DAY (BUSY BUT DEADLY)",
    days:3,
    goal:["balanced","strength","hypertrophy"],
    tags:["FULL_BODY","EFFICIENT"],
    description:
`3 days, full-body each day. Great if life is chaos.
Each session: 1 push, 1 pull, 1 legs, 1 core/conditioning.`,
    splitDays:[
      { label:"FULL_BODY_A", blocks:[{cat:"Push", picks:["Bench Press"]},{cat:"Pull", picks:["Barbell Row"]},{cat:"Legs", picks:["Back Squat"]},{cat:"Core", picks:["Plank"]}] },
      { label:"FULL_BODY_B", blocks:[{cat:"Push", picks:["Overhead Press"]},{cat:"Pull", picks:["Lat Pulldown"]},{cat:"Legs", picks:["Leg Press"]},{cat:"Core", picks:["Cable Crunch"]}] },
      { label:"FULL_BODY_C", blocks:[{cat:"Push", picks:["Incline DB Press"]},{cat:"Pull", picks:["Deadlift"]},{cat:"Legs", picks:["RDLs"]},{cat:"Conditioning", picks:["Assault Bike"]}] }
    ]
  },
  {
    id:"bro_5",
    name:"BRO-SPLIT // 5-DAY (HYPERTROPHY)",
    days:5,
    goal:["hypertrophy"],
    tags:["CHEST","BACK","LEGS","SHOULDERS","ARMS"],
    description:
`Old-school 5-day bro split for pure size.
Not as “2x weekly” as PPL, but brutal volume and pump.`,
    splitDays:[
      { label:"CHEST", blocks:[{cat:"Push", picks:["Bench Press","Incline DB Press","Cable Fly","Pec Deck"]},{cat:"Core", picks:["Ab Wheel"]}] },
      { label:"BACK", blocks:[{cat:"Pull", picks:["Deadlift","Pull Ups","Seated Cable Row","Face Pulls"]}] },
      { label:"LEGS", blocks:[{cat:"Legs", picks:["Back Squat","Leg Press","Leg Curl","Calf Raises"]}] },
      { label:"SHOULDERS", blocks:[{cat:"Push", picks:["Overhead Press","Arnold Press","Lateral Raises","Rear Delt Fly"]}] },
      { label:"ARMS", blocks:[{cat:"Pull", picks:["EZ Bar Curls","Incline DB Curls","Hammer Curls"]},{cat:"Push", picks:["Tricep Pushdown","Skull Crushers","Overhead Tricep Extension"]}] }
    ]
  },
  {
    id:"cut_4",
    name:"CUT_PROTOCOL // 4-DAY (CONDITIONING)",
    days:4,
    goal:["cut","balanced"],
    tags:["LIFT","CONDITION","RECOVER"],
    description:
`4-day split with built-in conditioning finishers.
Good if you want to lean out while keeping strength.`,
    splitDays:[
      { label:"UPPER+COND", blocks:[{cat:"Push", picks:["DB Bench Press","Overhead Press"]},{cat:"Pull", picks:["Lat Pulldown","Face Pulls"]},{cat:"Conditioning", picks:["Rowing Machine","Jump Rope"]}] },
      { label:"LOWER+COND", blocks:[{cat:"Legs", picks:["Front Squat","RDLs","Leg Extensions"]},{cat:"Conditioning", picks:["Assault Bike"]}] },
      { label:"UPPER+COND_B", blocks:[{cat:"Push", picks:["Incline DB Press","Lateral Raises"]},{cat:"Pull", picks:["Seated Cable Row","Hammer Curls"]},{cat:"Conditioning", picks:["Sled Push"]}] },
      { label:"LOWER+COND_B", blocks:[{cat:"Legs", picks:["Leg Press","Hip Thrust","Leg Curl","Calf Raises"]},{cat:"Conditioning", picks:["Incline Treadmill Walk"]}] }
    ]
  }
];

/* =========================
   STATE
========================= */
let currentUser = null;          // auth user
let currentUserData = null;      // users/{uid}
let selectedTagCss = "tag-rust";
let selectedAvatarCss = "a-sigil-1";
let selectedPlanId = null;       // active plan id
let regDraft = { email:"", pass:"", username:"", tag:"tag-rust", avatar:"a-sigil-1", planId:null, isPrivate:false };

let unsubFeed = null;
let unsubLeaderboard = null;
let unsubPRs = null;
let unsubLogs = null;

/* =========================
   HELPERS
========================= */
function $(id){ return document.getElementById(id); }
function safeText(s){ return String(s||"").replace(/[<>&"]/g, c=>({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;" }[c])); }

function setScreen(screen){
  const screens = ["auth-screen","registration-screen","app"];
  screens.forEach(s => $(s).classList.add("hidden"));
  $(screen).classList.remove("hidden");
}

function setActiveTab(panelId){
  const panels = ["feed-panel","plans-panel","friends-panel","settings-panel"];
  panels.forEach(p => $(p).classList.add("hidden"));
  $(panelId).classList.remove("hidden");
}

function deriveXPUpdate({didLog=false, didPost=false, didComment=false}){
  // Game-ish: logs worth more, posts/comments smaller
  let delta = 0;
  if (didLog) delta += 5;
  if (didPost) delta += 2;
  if (didComment) delta += 1;
  return delta;
}

function epley1RM(weight, reps){
  const w = Number(weight||0);
  const r = Number(reps||0);
  if (!w || !r) return 0;
  // Epley: 1RM = w * (1 + r/30)
  return Math.round(w * (1 + r / 30));
}

function getPlanById(id){
  return PLAN_INDEX.find(p => p.id === id) || null;
}

function userIsAdmin(){
  return !!(currentUserData && currentUserData.isAdmin === true);
}

/* =========================
   AUTH + BOOT
========================= */
onAuthStateChanged(auth, async (user) => {
  // cleanup listeners on user swap
  if (!user){
    currentUser = null;
    currentUserData = null;
    teardownLive();
    setScreen("auth-screen");
    return;
  }

  currentUser = user;
  const uref = doc(db, "users", user.uid);
  const snap = await getDoc(uref);

  if (!snap.exists()){
    // no profile doc => send to registration
    setScreen("registration-screen");
    showRegStep(1);
    seedRegPickers();
    return;
  }

  currentUserData = snap.data();
  setScreen("app");
  initAppUI();
  initLive();
});

function teardownLive(){
  if (unsubFeed) unsubFeed();
  if (unsubLeaderboard) unsubLeaderboard();
  if (unsubPRs) unsubPRs();
  if (unsubLogs) unsubLogs();
  unsubFeed = unsubLeaderboard = unsubPRs = unsubLogs = null;
}

/* =========================
   REGISTRATION FLOW
========================= */
function showRegStep(n){
  $("reg-step-1").classList.toggle("hidden", n !== 1);
  $("reg-step-2").classList.toggle("hidden", n !== 2);
  $("reg-step-3").classList.toggle("hidden", n !== 3);
  $("reg-hint").innerText = `STEP_${n}/3`;
}

function seedRegPickers(){
  // tags
  const tagWrap = $("initial-tag-picker");
  tagWrap.innerHTML = TAGS.map(t => `
    <div class="tag-opt ${t.css} ${t.css===selectedTagCss ? "active":""}"
         data-tag="${t.css}"></div>
  `).join("");

  tagWrap.querySelectorAll(".tag-opt").forEach(el=>{
    el.onclick = () => {
      selectedTagCss = el.dataset.tag;
      tagWrap.querySelectorAll(".tag-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      regDraft.tag = selectedTagCss;
    };
  });

  // avatars
  const avWrap = $("avatar-picker");
  avWrap.innerHTML = AVATARS.map(a => `
    <div class="avatar-opt ${a===selectedAvatarCss ? "active":""}" data-av="${a}">
      <div class="avatar ${a}"></div>
    </div>
  `).join("");
  avWrap.querySelectorAll(".avatar-opt").forEach(el=>{
    el.onclick = () => {
      selectedAvatarCss = el.dataset.av;
      avWrap.querySelectorAll(".avatar-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      regDraft.avatar = selectedAvatarCss;
    };
  });

  // plan picker (start plan)
  const planWrap = $("plan-picker");
  planWrap.innerHTML = PLAN_INDEX.map(p => `
    <div class="plan-card" data-plan="${p.id}">
      <h3>${safeText(p.name)}</h3>
      <div class="meta">${p.days}_DAYS // GOALS: ${p.goal.map(g=>g.toUpperCase()).join(", ")}</div>
      <div class="chips">${p.tags.slice(0,5).map(t=>`<span class="chip">${safeText(t)}</span>`).join("")}</div>
    </div>
  `).join("");

  planWrap.querySelectorAll(".plan-card").forEach(el=>{
    el.onclick = () => {
      planWrap.querySelectorAll(".plan-card").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      regDraft.planId = el.dataset.plan;
    };
  });
}

/* =========================
   APP INIT
========================= */
function initAppUI(){
  // header
  $("header-callsign").innerText = currentUserData.username || "SUBJECT";
  $("profileUsername").innerText = currentUserData.username || "SUBJECT";

  // tag + avatar + card
  const tagCss = currentUserData.tag || "tag-rust";
  $("user-grave-tag").className = `grave-tag mini-tag ${tagCss}`;
  $("profile-avatar").className = `avatar ${currentUserData.avatar || "a-sigil-1"}`;

  // admin UI
  $("admin-badge").classList.toggle("hidden", !userIsAdmin());
  $("admin-panel").classList.toggle("hidden", !userIsAdmin());

  // UI toggles
  const ui = currentUserData.ui || { scanlines:true, glow:true, motion:true };
  $("toggle-scanlines").checked = ui.scanlines !== false;
  $("toggle-glow").checked = ui.glow !== false;
  $("toggle-motion").checked = ui.motion !== false;
  applyUiToggles(ui);

  // privacy
  $("toggle-private").checked = currentUserData.isPrivate === true;

  // settings pickers
  seedSettingsPickers();

  // active plan
  selectedPlanId = currentUserData.activePlanId || null;
  renderActivePlanUI();

  // tabs
  $("tabFeedBtn").onclick = () => setActiveTab("feed-panel");
  $("tabPlansBtn").onclick = () => setActiveTab("plans-panel");
  $("tabFriendsBtn").onclick = () => setActiveTab("friends-panel");
  $("tabSettingsBtn").onclick = () => setActiveTab("settings-panel");

  // buttons
  $("logoutBtn").onclick = () => signOut(auth);

  $("postStatusBtn").onclick = postStatus;
  $("recordBtn").onclick = submitLog;

  $("filterPlansBtn").onclick = () => renderPlanIndexFiltered();
  renderPlanIndexFiltered();

  // friends search
  $("userSearch").oninput = debounce(searchUsers, 250);

  // settings actions
  $("renameBtn").onclick = updateUsername;
  $("updateTagBtn").onclick = updateGraveTag;
  $("updateAvatarBtn").onclick = updateAvatar;
  $("saveUiBtn").onclick = saveUiSettings;
  $("savePrivacyBtn").onclick = savePrivacy;

  // admin actions
  if (userIsAdmin()){
    $("admin-post-announce").onclick = adminBroadcastAnnouncement;
    $("admin-find-user").onclick = adminFindUser;
    $("admin-reset-xp").onclick = adminResetXP;
    $("admin-toggle-admin").onclick = adminToggleAdmin;
  }

  // rank path display
  renderRankPath();
}

function seedSettingsPickers(){
  // tag picker
  const sPicker = $("settings-tag-picker");
  selectedTagCss = currentUserData.tag || "tag-rust";
  sPicker.innerHTML = TAGS.map(t => `
    <div class="tag-opt ${t.css} ${t.css===selectedTagCss ? "active":""}" data-tag="${t.css}"></div>
  `).join("");
  sPicker.querySelectorAll(".tag-opt").forEach(el=>{
    el.onclick = () => {
      selectedTagCss = el.dataset.tag;
      sPicker.querySelectorAll(".tag-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
    };
  });

  // avatar picker
  const aPicker = $("settings-avatar-picker");
  selectedAvatarCss = currentUserData.avatar || "a-sigil-1";
  aPicker.innerHTML = AVATARS.map(a => `
    <div class="avatar-opt ${a===selectedAvatarCss ? "active":""}" data-av="${a}">
      <div class="avatar ${a}"></div>
    </div>
  `).join("");
  aPicker.querySelectorAll(".avatar-opt").forEach(el=>{
    el.onclick = () => {
      selectedAvatarCss = el.dataset.av;
      aPicker.querySelectorAll(".avatar-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
    };
  });
}

function applyUiToggles(ui){
  document.body.classList.toggle("no-scanlines", ui.scanlines === false);
  document.body.classList.toggle("no-glow", ui.glow === false);
  document.body.classList.toggle("no-motion", ui.motion === false);
}

function renderRankPath(){
  const el = $("rank-path");
  const xp = Number(currentUserData.xp || 0);
  const lines = RANKS
    .slice()
    .sort((a,b)=>a.minXP-b.minXP)
    .map(r => {
      const hit = xp >= r.minXP ? "✓" : "…";
      return `<div class="lb-row">${hit} ${r.name} @ ${r.minXP}XP</div>`;
    })
    .join("");
  el.innerHTML = lines;
}

/* =========================
   LIVE LISTENERS
========================= */
function initLive(){
  // leaderboard
  unsubLeaderboard = onSnapshot(
    query(collection(db, "users"), orderBy("xp", "desc"), limit(7)),
    (snap) => {
      $("leaderboard").innerHTML = snap.docs.map((d,i)=>{
        const u = d.data();
        return `<div class="lb-row">#${i+1} ${safeText(u.username)} [XP:${Number(u.xp||0)}]</div>`;
      }).join("");
    }
  );

  // feed
  loadFeed();

  // logs + prs
  loadLogsAndPRs();

  // stats/cc refresh (in case xp changed)
  refreshCardAndStats();
}

function refreshCardAndStats(extra={}){
  const xp = Number(currentUserData.xp || 0);
  const carvings = Number(currentUserData.carvings || 0);
  const prs = Number(currentUserData.prCount || 0);

  $("stat-xp").innerText = String(xp);
  $("stat-carvings").innerText = String(carvings);
  $("stat-prs").innerText = String(prs);

  const rank = getRankByXP(xp);
  $("profile-rank-pill").innerText = rank.name;
  $("profile-title").innerText = rank.title;

  const cc = $("calling-card");
  cc.classList.remove("cc-rank-newborn","cc-rank-stalker","cc-rank-gravelord","cc-rank-immortal");
  cc.classList.add(`cc-rank-${rank.id}`);
}

/* =========================
   FEED + COMMENTS + DELETE OWN POSTS
========================= */
function loadFeed(){
  if (unsubFeed) unsubFeed();

  unsubFeed = onSnapshot(
    query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25)),
    (snap) => {
      const feed = $("feed-content");
      feed.innerHTML = "";

      snap.forEach(d => {
        const p = d.data();
        const isOwner = currentUser && p.uid === currentUser.uid;
        const canDelete = isOwner || userIsAdmin();

        const dateStr = p.timestamp?.toDate ? p.timestamp.toDate().toLocaleString() : "";
        const badge = p.isAnnouncement ? `<span class="chip" style="border-color:var(--blood);color:#fff;">ANNOUNCEMENT</span>` : "";
        const delBtn = canDelete ? `<button class="mini-btn danger" data-delpost="${d.id}">DELETE</button>` : "";

        feed.innerHTML += `
          <div class="grave-box post">
            <div class="grave-header-sub">
              <div class="post-meta">
                <span>${safeText(p.username || "UNKNOWN")}</span>
                ${badge}
              </div>
              <div class="post-actions">
                <span class="post-meta">${safeText(dateStr)}</span>
                ${delBtn}
              </div>
            </div>

            <div class="post-body">
              <p>${safeText(p.text)}</p>
            </div>

            <div class="comment-section" id="comments-${d.id}"></div>

            <div class="comment-input-wrap">
              <input id="in-${d.id}" placeholder="REPLY...">
              <button class="mini-btn" data-comment="${d.id}">SEND</button>
            </div>
          </div>
        `;

        loadComments(d.id);
      });

      // wire delete/comment buttons (re-render safe)
      feed.querySelectorAll("[data-delpost]").forEach(btn=>{
        btn.onclick = () => deletePost(btn.getAttribute("data-delpost"));
      });

      feed.querySelectorAll("[data-comment]").forEach(btn=>{
        btn.onclick = () => postComment(btn.getAttribute("data-comment"));
      });
    }
  );
}

function loadComments(postId){
  onSnapshot(
    query(collection(db, `posts/${postId}/comments`), orderBy("timestamp", "asc"), limit(50)),
    (snap) => {
      const box = $(`comments-${postId}`);
      if (!box) return;
      box.innerHTML = "";
      snap.forEach(c=>{
        const cd = c.data();
        box.innerHTML += `<div class="comment"><b>${safeText(cd.username || "???")}:</b> ${safeText(cd.text || "")}</div>`;
      });
    }
  );
}

async function postStatus(){
  const text = ($("statusText").value || "").trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    uid: currentUser.uid,
    username: currentUserData.username,
    text,
    isAnnouncement: false,
    timestamp: serverTimestamp()
  });

  $("statusText").value = "";

  // xp bump
  await bumpXP({ didPost:true });
}

async function postComment(postId){
  const input = $(`in-${postId}`);
  if (!input) return;
  const text = (input.value || "").trim();
  if (!text) return;

  await addDoc(collection(db, `posts/${postId}/comments`), {
    uid: currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  input.value = "";
  await bumpXP({ didComment:true });
}

async function deletePost(postId){
  // client-side check (real protection must be in Firestore rules)
  const pref = doc(db, "posts", postId);
  const snap = await getDoc(pref);
  if (!snap.exists()) return;

  const p = snap.data();
  const isOwner = p.uid === currentUser.uid;
  if (!isOwner && !userIsAdmin()){
    alert("ACCESS_DENIED");
    return;
  }

  await deleteDoc(pref);
  // comments subcollection not auto-deleted; leave it or add a Cloud Function later.
}

/* =========================
   WORKOUT PLANS (INDEX + ACTIVE)
========================= */
function renderPlanIndexFiltered(){
  const goal = $("plan-goal").value;
  const days = Number($("plan-days").value);

  const filtered = PLAN_INDEX.filter(p=>{
    const goalOk = p.goal.includes(goal) || (goal === "balanced" && p.goal.includes("balanced"));
    const daysOk = p.days === days;
    return goalOk && daysOk;
  });

  const wrap = $("plans-index");
  wrap.innerHTML = (filtered.length ? filtered : PLAN_INDEX).map(p => planCardHTML(p)).join("");

  wrap.querySelectorAll(".plan-card").forEach(el=>{
    el.onclick = async () => {
      const id = el.getAttribute("data-plan");
      await setActivePlan(id);
      wrap.querySelectorAll(".plan-card").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
    };
  });

  // mark active
  if (selectedPlanId){
    const activeEl = wrap.querySelector(`[data-plan="${selectedPlanId}"]`);
    if (activeEl) activeEl.classList.add("active");
  }
}

function planCardHTML(p){
  return `
    <div class="plan-card" data-plan="${p.id}">
      <h3>${safeText(p.name)}</h3>
      <div class="meta">${p.days}_DAYS // GOALS: ${p.goal.map(g=>g.toUpperCase()).join(", ")}</div>
      <div class="chips">${p.tags.slice(0,6).map(t=>`<span class="chip">${safeText(t)}</span>`).join("")}</div>
    </div>
  `;
}

async function setActivePlan(planId){
  const plan = getPlanById(planId);
  if (!plan) return;

  selectedPlanId = planId;
  await updateDoc(doc(db, "users", currentUser.uid), { activePlanId: planId });

  // local state refresh
  currentUserData.activePlanId = planId;
  renderActivePlanUI();
}

function renderActivePlanUI(){
  const plan = getPlanById(selectedPlanId);

  $("active-plan-pill").innerText = `ACTIVE: ${plan ? plan.name : "NONE"}`;
  $("log-context").innerText = `ACTIVE_SPLIT: ${plan ? plan.name : "NONE"}`;

  // render details
  $("active-plan-details").innerText = plan ? `${plan.description}\n\n${plan.splitDays.map(d=>{
    const blocks = d.blocks.map(b=>`- ${b.cat}: ${b.picks.join(", ")}`).join("\n");
    return `${d.label}\n${blocks}`;
  }).join("\n\n")}` : "SELECT_A_SPLIT_FROM_THE_INDEX.";

  // populate log day dropdown + categories/exercises
  const daySel = $("log-day");
  const catSel = $("log-category");
  const exSel = $("log-ex");

  if (!plan){
    daySel.innerHTML = `<option value="">NO_ACTIVE_SPLIT</option>`;
    catSel.innerHTML = `<option value="">SELECT_CATEGORY</option>`;
    exSel.innerHTML = `<option value="">SELECT_EXERCISE</option>`;
    return;
  }

  daySel.innerHTML = plan.splitDays.map((d, idx)=>`<option value="${idx}">${safeText(d.label)}</option>`).join("");
  daySel.onchange = () => populateLogSelectorsFromDay(plan);
  catSel.onchange = () => populateExercisesFromCategory();

  populateLogSelectorsFromDay(plan);
}

function populateLogSelectorsFromDay(plan){
  const dayIdx = Number($("log-day").value || 0);
  const day = plan.splitDays[dayIdx];
  const catSel = $("log-category");

  // categories for that day (blocks)
  const cats = day.blocks.map(b=>b.cat);
  catSel.innerHTML = cats.map(c=>`<option value="${safeText(c)}">${safeText(c)}</option>`).join("");

  // store day template picks for smarter exercise list
  catSel.dataset.dayIdx = String(dayIdx);
  populateExercisesFromCategory();
}

function populateExercisesFromCategory(){
  const plan = getPlanById(selectedPlanId);
  if (!plan) return;

  const dayIdx = Number($("log-category").dataset.dayIdx || 0);
  const day = plan.splitDays[dayIdx];
  const cat = $("log-category").value;

  const block = day.blocks.find(b=>b.cat === cat);
  const recommended = block ? block.picks : [];
  const library = EXERCISE_LIBRARY[cat] || [];
  const combined = [...new Set([...recommended, ...library])];

  $("log-ex").innerHTML = combined.map(e=>`<option value="${safeText(e)}">${safeText(e)}</option>`).join("");
}

/* =========================
   LOGGING + AUTO PRS
========================= */
function loadLogsAndPRs(){
  // recent logs
  if (unsubLogs) unsubLogs();
  unsubLogs = onSnapshot(
    query(
      collection(db, `users/${currentUser.uid}/logs`),
      orderBy("timestamp", "desc"),
      limit(20)
    ),
    (snap)=>{
      const wrap = $("logList");
      wrap.innerHTML = "";
      snap.forEach(d=>{
        const l = d.data();
        const dateStr = l.timestamp?.toDate ? l.timestamp.toDate().toLocaleDateString() : "";
        wrap.innerHTML += `
          <div class="index-row">
            <span>${safeText(l.exercise)} — ${safeText(l.weight)}LBS x ${safeText(l.reps)} (${safeText(dateStr)})</span>
            <button class="mini-btn danger" data-dellog="${d.id}">X</button>
          </div>
        `;
      });

      wrap.querySelectorAll("[data-dellog]").forEach(btn=>{
        btn.onclick = () => deleteLog(btn.getAttribute("data-dellog"));
      });
    }
  );

  // PRs
  if (unsubPRs) unsubPRs();
  unsubPRs = onSnapshot(
    query(
      collection(db, `users/${currentUser.uid}/prs`),
      orderBy("est1rm", "desc"),
      limit(40)
    ),
    (snap)=>{
      const wrap = $("prList");
      wrap.innerHTML = "";

      let count = 0;
      snap.forEach(d=>{
        const pr = d.data();
        count++;
        wrap.innerHTML += `
          <div class="index-row">
            <span>
              ${safeText(pr.exercise)} —
              <small>${safeText(pr.weight)}x${safeText(pr.reps)} | 1RM≈${safeText(pr.est1rm)}</small>
            </span>
            <button class="mini-btn danger" data-delpr="${d.id}">X</button>
          </div>
        `;
      });

      // stat
      currentUserData.prCount = count;
      $("stat-prs").innerText = String(count);

      wrap.querySelectorAll("[data-delpr]").forEach(btn=>{
        btn.onclick = () => deletePR(btn.getAttribute("data-delpr"));
      });
    }
  );
}

async function submitLog(){
  const plan = getPlanById(selectedPlanId);
  if (!plan){
    alert("NO_ACTIVE_SPLIT_SELECTED");
    return;
  }

  const dayIdx = Number($("log-day").value || 0);
  const dayLabel = plan.splitDays[dayIdx]?.label || "UNKNOWN_DAY";
  const category = $("log-category").value;
  const exercise = $("log-ex").value;

  const weight = Number(($("log-w").value || "").trim());
  const reps = Number(($("log-r").value || "").trim());
  const notes = ($("log-notes").value || "").trim();

  if (!exercise || !weight || !reps){
    alert("MISSING_FIELDS");
    return;
  }

  const est1rm = epley1RM(weight, reps);

  // write log
  await addDoc(collection(db, `users/${currentUser.uid}/logs`), {
    planId: selectedPlanId,
    dayLabel,
    category,
    exercise,
    weight,
    reps,
    est1rm,
    notes,
    timestamp: serverTimestamp()
  });

  // bump user stats
  currentUserData.carvings = Number(currentUserData.carvings || 0) + 1;

  // auto PR check (per exercise)
  await upsertPR({ exercise, weight, reps, est1rm });

  await updateDoc(doc(db, "users", currentUser.uid), {
    carvings: currentUserData.carvings
  });

  $("log-w").value = "";
  $("log-r").value = "";
  $("log-notes").value = "";

  await bumpXP({ didLog:true });

  refreshCardAndStats();
}

async function upsertPR({exercise, weight, reps, est1rm}){
  const prRef = doc(db, `users/${currentUser.uid}/prs`, slug(exercise));
  const snap = await getDoc(prRef);

  if (!snap.exists()){
    await setDoc(prRef, {
      exercise,
      weight,
      reps,
      est1rm,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return;
  }

  const existing = snap.data();
  const best = Number(existing.est1rm || 0);
  if (est1rm > best){
    await updateDoc(prRef, {
      weight,
      reps,
      est1rm,
      updatedAt: serverTimestamp()
    });
  }
}

async function deleteLog(logId){
  await deleteDoc(doc(db, `users/${currentUser.uid}/logs`, logId));
}

async function deletePR(prId){
  await deleteDoc(doc(db, `users/${currentUser.uid}/prs`, prId));
}

function slug(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,120);
}

/* =========================
   FRIENDS + SEARCH + ADD/REMOVE
========================= */
async function searchUsers(){
  const q = ($("userSearch").value || "").trim().toLowerCase();
  const box = $("search-results");
  box.innerHTML = "";
  if (!q || q.length < 2) return;

  // naive search: prefix match on usernameLower
  const qs = query(
    collection(db, "users"),
    where("usernameLower", ">=", q),
    where("usernameLower", "<=", q + "\uf8ff"),
    limit(10)
  );

  const snap = await getDocs(qs);
  const results = [];
  snap.forEach(d=>{
    const u = d.data();
    if (u.isPrivate === true) return;
    if (d.id === currentUser.uid) return;
    results.push({ uid:d.id, ...u });
  });

  if (!results.length){
    box.innerHTML = `<div class="tiny-muted">NO_MATCHES</div>`;
    return;
  }

  const myFriends = new Set((currentUserData.friends || []));
  box.innerHTML = results.map(u=>{
    const isFriend = myFriends.has(u.uid);
    const btn = isFriend
      ? `<button class="mini-btn danger" data-rmf="${u.uid}">SEVER</button>`
      : `<button class="mini-btn" data-addf="${u.uid}">BIND</button>`;
    return `
      <div class="index-row">
        <span>${safeText(u.username)} <small>XP:${Number(u.xp||0)}</small></span>
        ${btn}
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-addf]").forEach(b=> b.onclick = ()=> addFriend(b.getAttribute("data-addf")));
  box.querySelectorAll("[data-rmf]").forEach(b=> b.onclick = ()=> removeFriend(b.getAttribute("data-rmf")));
}

function loadFriendsList(){
  const list = $("friends-list");
  list.innerHTML = "";

  const ids = currentUserData.friends || [];
  if (!ids.length){
    list.innerHTML = `<div class="tiny-muted">NO_COVEN_MEMBERS</div>`;
    return;
  }

  ids.forEach(async uid=>{
    const snap = await getDoc(doc(db,"users",uid));
    if (!snap.exists()) return;
    const u = snap.data();
    list.innerHTML += `
      <div class="index-row">
        <span>${safeText(u.username)} <small>XP:${Number(u.xp||0)}</small></span>
        <button class="mini-btn danger" data-rmf="${uid}">SEVER</button>
      </div>
    `;
    list.querySelectorAll(`[data-rmf="${uid}"]`).forEach(b=>{
      b.onclick = ()=> removeFriend(uid);
    });
  });
}

async function addFriend(targetUid){
  const friends = new Set(currentUserData.friends || []);
  friends.add(targetUid);
  currentUserData.friends = [...friends];

  await updateDoc(doc(db,"users",currentUser.uid), { friends: currentUserData.friends });
  loadFriendsList();
}

async function removeFriend(targetUid){
  const friends = new Set(currentUserData.friends || []);
  friends.delete(targetUid);
  currentUserData.friends = [...friends];

  await updateDoc(doc(db,"users",currentUser.uid), { friends: currentUserData.friends });
  loadFriendsList();
}

/* =========================
   SETTINGS
========================= */
async function updateUsername(){
  const newName = ($("new-username").value || "").trim();
  if (!newName || newName.length < 3){
    alert("CALLSIGN_TOO_SHORT");
    return;
  }

  // quick uniqueness-ish check (optional)
  const qLower = newName.toLowerCase();
  const check = await getDocs(query(collection(db,"users"), where("usernameLower","==", qLower), limit(1)));
  if (!check.empty){
    const hitId = check.docs[0].id;
    if (hitId !== currentUser.uid){
      alert("CALLSIGN_TAKEN");
      return;
    }
  }

  await updateDoc(doc(db,"users",currentUser.uid), { username:newName, usernameLower:qLower });
  currentUserData.username = newName;
  currentUserData.usernameLower = qLower;

  $("header-callsign").innerText = newName;
  $("profileUsername").innerText = newName;
  alert("IDENTITY_UPDATED");
}

async function updateGraveTag(){
  await updateDoc(doc(db,"users",currentUser.uid), { tag: selectedTagCss });
  currentUserData.tag = selectedTagCss;
  $("user-grave-tag").className = `grave-tag mini-tag ${selectedTagCss}`;
  alert("VISUALS_RECONFIGURED");
}

async function updateAvatar(){
  await updateDoc(doc(db,"users",currentUser.uid), { avatar: selectedAvatarCss });
  currentUserData.avatar = selectedAvatarCss;
  $("profile-avatar").className = `avatar ${selectedAvatarCss}`;
  alert("SIGIL_BOUND");
}

async function saveUiSettings(){
  const ui = {
    scanlines: $("toggle-scanlines").checked,
    glow: $("toggle-glow").checked,
    motion: $("toggle-motion").checked
  };
  await updateDoc(doc(db,"users",currentUser.uid), { ui });
  currentUserData.ui = ui;
  applyUiToggles(ui);
  alert("UI_SAVED");
}

async function savePrivacy(){
  const isPrivate = $("toggle-private").checked === true;
  await updateDoc(doc(db,"users",currentUser.uid), { isPrivate });
  currentUserData.isPrivate = isPrivate;
  alert("PRIVACY_SAVED");
}

/* =========================
   ADMIN (CLIENT-SIDE UI — REAL SECURITY MUST BE RULES)
========================= */
let adminTargetUser = null;

async function adminBroadcastAnnouncement(){
  const text = ($("admin-announce").value || "").trim();
  if (!text) return;

  if (!userIsAdmin()){
    alert("ACCESS_DENIED");
    return;
  }

  await addDoc(collection(db,"posts"),{
    uid: currentUser.uid,
    username: currentUserData.username,
    text,
    isAnnouncement:true,
    timestamp: serverTimestamp()
  });

  $("admin-announce").value = "";
}

async function adminFindUser(){
  const name = ($("admin-user-lookup").value || "").trim().toLowerCase();
  const out = $("admin-user-result");
  out.innerText = "";
  adminTargetUser = null;

  if (!name) return;
  if (!userIsAdmin()) return alert("ACCESS_DENIED");

  const snap = await getDocs(query(collection(db,"users"), where("usernameLower","==", name), limit(1)));
  if (snap.empty){
    out.innerText = "NO_TARGET_FOUND";
    return;
  }
  const docHit = snap.docs[0];
  adminTargetUser = { uid: docHit.id, ...docHit.data() };
  out.innerText = `TARGET: ${adminTargetUser.username} | XP:${Number(adminTargetUser.xp||0)} | ADMIN:${adminTargetUser.isAdmin===true}`;
}

async function adminResetXP(){
  if (!userIsAdmin()) return alert("ACCESS_DENIED");
  if (!adminTargetUser) return alert("NO_TARGET_LOCKED");

  await updateDoc(doc(db,"users",adminTargetUser.uid), { xp:0 });
  $("admin-user-result").innerText = "XP_RESET";
}

async function adminToggleAdmin(){
  if (!userIsAdmin()) return alert("ACCESS_DENIED");
  if (!adminTargetUser) return alert("NO_TARGET_LOCKED");

  const newVal = !(adminTargetUser.isAdmin === true);
  await updateDoc(doc(db,"users",adminTargetUser.uid), { isAdmin: newVal });
  $("admin-user-result").innerText = `ADMIN_SET_TO_${newVal}`;
}

/* =========================
   XP BUMP (centralized)
========================= */
async function bumpXP(flags){
  const delta = deriveXPUpdate(flags);
  if (!delta) return;

  const xp = Number(currentUserData.xp || 0) + delta;
  currentUserData.xp = xp;

  await updateDoc(doc(db,"users",currentUser.uid), { xp });

  refreshCardAndStats();
  renderRankPath();
}

/* =========================
   AUTH SCREEN EVENTS
========================= */
$("loginBtn").onclick = async () => {
  const email = ($("email").value || "").trim();
  const pass = ($("password").value || "").trim();
  if (!email || !pass) return;
  await signInWithEmailAndPassword(auth, email, pass);
};

$("showRegBtn").onclick = () => {
  setScreen("registration-screen");
  showRegStep(1);
  seedRegPickers();
};

$("returnToLoginBtn").onclick = () => {
  setScreen("auth-screen");
};

/* Registration: Step buttons */
$("nextStepBtn").onclick = () => {
  const email = ($("reg-email").value || "").trim();
  const pass = ($("reg-pass").value || "").trim();
  const conf = ($("reg-confirm").value || "").trim();

  if (!email || !pass) return alert("MISSING_FIELDS");
  if (pass.length < 6) return alert("PASSCODE_TOO_SHORT");
  if (pass !== conf) return alert("PASSCODES_DO_NOT_MATCH");

  regDraft.email = email;
  regDraft.pass = pass;

  showRegStep(2);
};

$("toStep3Btn").onclick = () => {
  const uname = ($("reg-username").value || "").trim();
  if (!uname || uname.length < 3) return alert("CALLSIGN_TOO_SHORT");

  regDraft.username = uname;
  regDraft.usernameLower = uname.toLowerCase();
  regDraft.isPrivate = $("reg-private").checked === true;

  showRegStep(3);
};

$("finalizeRegBtn").onclick = async () => {
  if (!regDraft.planId) return alert("SELECT_A_SPLIT");

  // create auth user
  const cred = await createUserWithEmailAndPassword(auth, regDraft.email, regDraft.pass);
  const uid = cred.user.uid;

  const userDoc = {
    username: regDraft.username,
    usernameLower: regDraft.usernameLower,
    tag: regDraft.tag || "tag-rust",
    avatar: regDraft.avatar || "a-sigil-1",
    activePlanId: regDraft.planId,
    isPrivate: regDraft.isPrivate === true,
    isAdmin: false,        // set true manually in Firestore for your account
    friends: [],
    carvings: 0,
    xp: 0,
    prCount: 0,
    ui: { scanlines:true, glow:true, motion:true },
    createdAt: serverTimestamp()
  };

  await setDoc(doc(db,"users",uid), userDoc);

  // done: auth state listener will boot into app
};

/* =========================
   PLANS PANEL: keep right-side selectors synced
========================= */
function debounce(fn, ms){
  let t = null;
  return (...args)=>{
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), ms);
  };
}

/* Refresh friends list whenever entering friends tab */
const originalSetActiveTab = setActiveTab;
setActiveTab = (panelId) => {
  originalSetActiveTab(panelId);
  if (panelId === "friends-panel") loadFriendsList();
};

/* =========================
   SAFARI QUIRK: ensure DOM exists before wiring
   (we already run in module after DOM parse; ok)
========================= */
