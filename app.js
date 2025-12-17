import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, query, orderBy, onSnapshot, where, limit, getDocs, serverTimestamp,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ===========================
   FIREBASE CONFIG
=========================== */
const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
window.auth = auth;

/* ===========================
   DATA: EXERCISES (LARGE INDEX)
=========================== */
const EXLIB = {
  Chest: ["Bench Press", "Incline Barbell Press", "Incline DB Press", "DB Bench", "Chest Fly (Cable)", "Chest Fly (DB)", "Push Ups", "Dips (Chest)"],
  Shoulders: ["Overhead Press", "DB Shoulder Press", "Arnold Press", "Lateral Raises", "Cable Laterals", "Rear Delt Fly", "Face Pulls", "Upright Row (Light)"],
  Triceps: ["Tricep Pushdown", "Overhead Tricep Extension", "Skull Crushers", "Close Grip Bench", "Dips (Tri)", "Rope Pushdown"],
  Back: ["Deadlift", "Rack Pull", "Barbell Row", "DB Row", "Chest Supported Row", "Lat Pulldown", "Pull Ups", "Seated Cable Row", "Straight Arm Pulldown"],
  Biceps: ["Bicep Curls", "Incline DB Curls", "Hammer Curls", "Preacher Curl", "Cable Curl", "EZ Bar Curl"],
  Legs: ["Back Squat", "Front Squat", "Leg Press", "Hack Squat", "RDL", "Good Mornings (Light)", "Leg Extensions", "Leg Curl", "Walking Lunges", "Calf Raises", "Hip Thrust"],
  Core: ["Hanging Leg Raises", "Cable Crunch", "Plank", "Ab Wheel", "Russian Twist", "Dead Bug"],
  Conditioning: ["Row Machine", "Bike", "Incline Walk", "Sled Push", "Stairmaster"]
};

const ALL_EXERCISES = Object.values(EXLIB).flat();

/* ===========================
   BUILT-IN SPLITS (5)
   Each split has "cycleDays": list of sessions.
=========================== */
const SPLITS = [
  {
    id: "necrotic_ppl_6",
    name: "NECROTIC_PPL // 6-DAY (PPL x2)",
    description: "Classic Push/Pull/Legs repeated. Brutal volume, fast rank climb.",
    cycleDays: [
      { label: "PUSH_I", focus: "Push", exercises: ["Bench Press", "Overhead Press", "Incline DB Press", "Lateral Raises", "Tricep Pushdown", "Dips (Tri)"] },
      { label: "PULL_I", focus: "Pull", exercises: ["Deadlift", "Pull Ups", "Barbell Row", "Lat Pulldown", "Face Pulls", "Bicep Curls"] },
      { label: "LEGS_I", focus: "Legs", exercises: ["Back Squat", "Leg Press", "RDL", "Leg Extensions", "Leg Curl", "Calf Raises"] },
      { label: "PUSH_II", focus: "Push", exercises: ["Incline Barbell Press", "DB Bench", "Arnold Press", "Cable Laterals", "Skull Crushers", "Rope Pushdown"] },
      { label: "PULL_II", focus: "Pull", exercises: ["Rack Pull", "Chest Supported Row", "Seated Cable Row", "Straight Arm Pulldown", "Hammer Curls", "Preacher Curl"] },
      { label: "LEGS_II", focus: "Legs", exercises: ["Front Squat", "Hack Squat", "Hip Thrust", "Walking Lunges", "Leg Curl", "Calf Raises"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Plank", "Cable Crunch"] }
    ]
  },
  {
    id: "grave_5x",
    name: "GRAVE_5X // MON–FRI (2x/week MUSCLE)",
    description: "5-day schedule built for consistency. Double-hit most muscle groups weekly.",
    cycleDays: [
      { label: "MON // PUSH+QUADS", focus: "Hybrid", exercises: ["Bench Press", "Incline DB Press", "Overhead Press", "Back Squat", "Leg Extensions", "Tricep Pushdown"] },
      { label: "TUE // PULL+HAMS", focus: "Hybrid", exercises: ["Deadlift", "Barbell Row", "Lat Pulldown", "RDL", "Leg Curl", "Bicep Curls"] },
      { label: "WED // SHOULDERS+ARMS", focus: "Upper", exercises: ["Arnold Press", "Lateral Raises", "Rear Delt Fly", "Skull Crushers", "Hammer Curls", "Face Pulls"] },
      { label: "THU // COMPOUND_RITUAL", focus: "Compound", exercises: ["Back Squat", "Bench Press", "Barbell Row", "Overhead Press", "Hanging Leg Raises", "Calf Raises"] },
      { label: "FRI // LEGS+BACK_FINISH", focus: "Lower/Back", exercises: ["Leg Press", "Hack Squat", "Chest Supported Row", "Seated Cable Row", "Walking Lunges", "Cable Crunch"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Plank", "Row Machine"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Dead Bug", "Bike"] }
    ]
  },
  {
    id: "warlord_ul_4",
    name: "WARLORD_UL // 4-DAY (UPPER/LOWER)",
    description: "Simple, heavy, effective. Great for strength focus.",
    cycleDays: [
      { label: "UPPER_I", focus: "Upper", exercises: ["Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown", "Tricep Pushdown", "Bicep Curls"] },
      { label: "LOWER_I", focus: "Lower", exercises: ["Back Squat", "RDL", "Leg Press", "Leg Curl", "Calf Raises", "Cable Crunch"] },
      { label: "REST", focus: "Recovery", exercises: ["Bike", "Plank", "Incline Walk"] },
      { label: "UPPER_II", focus: "Upper", exercises: ["Incline Barbell Press", "Chest Supported Row", "Arnold Press", "Pull Ups", "Skull Crushers", "Hammer Curls"] },
      { label: "LOWER_II", focus: "Lower", exercises: ["Front Squat", "Hip Thrust", "Hack Squat", "Walking Lunges", "Calf Raises", "Hanging Leg Raises"] },
      { label: "REST", focus: "Recovery", exercises: ["Row Machine", "Dead Bug", "Plank"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Cable Crunch", "Bike"] }
    ]
  },
  {
    id: "hypertrophy_hell_5",
    name: "HYPERTROPHY_HELL // 5-DAY (BRO-SPLIT EVOLVED)",
    description: "Big pump, big volume, controlled chaos.",
    cycleDays: [
      { label: "CHEST+TRI", focus: "Upper", exercises: ["Bench Press", "Incline DB Press", "Chest Fly (Cable)", "Dips (Chest)", "Tricep Pushdown", "Overhead Tricep Extension"] },
      { label: "BACK+BI", focus: "Upper", exercises: ["Barbell Row", "Lat Pulldown", "Seated Cable Row", "Straight Arm Pulldown", "EZ Bar Curl", "Incline DB Curls"] },
      { label: "LEGS", focus: "Lower", exercises: ["Back Squat", "Leg Press", "RDL", "Leg Extensions", "Leg Curl", "Calf Raises"] },
      { label: "SHOULDERS+CORE", focus: "Upper", exercises: ["Overhead Press", "Lateral Raises", "Rear Delt Fly", "Face Pulls", "Cable Crunch", "Plank"] },
      { label: "ARMS+CONDITION", focus: "Mixed", exercises: ["Skull Crushers", "Rope Pushdown", "Hammer Curls", "Preacher Curl", "Row Machine", "Stairmaster"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Dead Bug", "Bike"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Plank", "Bike"] }
    ]
  },
  {
    id: "minimalist_3",
    name: "MINIMALIST_MASSACRE // 3-DAY (FULL BODY)",
    description: "Low days, high impact. Perfect for busy weeks.",
    cycleDays: [
      { label: "FULL_BODY_I", focus: "Full", exercises: ["Back Squat", "Bench Press", "Barbell Row", "Lateral Raises", "Bicep Curls", "Tricep Pushdown"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Plank", "Bike"] },
      { label: "FULL_BODY_II", focus: "Full", exercises: ["Front Squat", "Incline Barbell Press", "Pull Ups", "RDL", "Hammer Curls", "Skull Crushers"] },
      { label: "REST", focus: "Recovery", exercises: ["Row Machine", "Dead Bug", "Bike"] },
      { label: "FULL_BODY_III", focus: "Full", exercises: ["Leg Press", "DB Bench", "Lat Pulldown", "Hip Thrust", "Cable Curl", "Overhead Tricep Extension"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Plank", "Bike"] },
      { label: "REST", focus: "Recovery", exercises: ["Incline Walk", "Cable Crunch", "Bike"] }
    ]
  }
];

/* ===========================
   RANKS + CALLING CARD UNLOCKS
=========================== */
const RANKS = [
  { min: 0,   name: "NEWBORN",      card: "tag-rust",  avatarUnlock: 0 },
  { min: 15,  name: "STALKER",      card: "tag-crt",   avatarUnlock: 1 },
  { min: 45,  name: "CRYPT_WALKER", card: "tag-blood", avatarUnlock: 2 },
  { min: 90,  name: "GRAVE_LORD",   card: "tag-void",  avatarUnlock: 3 },
  { min: 160, name: "IMMORTAL",     card: "tag-void",  avatarUnlock: 5 }
];

const TAGS = [
  { id: "rust", css: "tag-rust", label: "RUST" },
  { id: "crt", css: "tag-crt", label: "CRT" },
  { id: "blood", css: "tag-blood", label: "BLOOD" },
  { id: "void", css: "tag-void", label: "VOID" }
];

const AVATARS = ["a0","a1","a2","a3","a4","a5"];

/* Heavy lift trophies */
const TROPHY_RULES = [
  { key: "DL_315", label: "DEADLIFT_315", exercise: "Deadlift", min: 315 },
  { key: "DL_405", label: "DEADLIFT_405", exercise: "Deadlift", min: 405 },
  { key: "SQ_315", label: "SQUAT_315", exercise: "Back Squat", min: 315 },
  { key: "BP_225", label: "BENCH_225", exercise: "Bench Press", min: 225 },
  { key: "OHP_135", label: "OHP_135", exercise: "Overhead Press", min: 135 }
];

/* ===========================
   STATE
=========================== */
let currentUserData = null;
let selectedTagCss = "tag-rust";
let selectedAvatarClass = "a0";
let tempCreatedUser = null; // for registration step 1 -> step 2

/* ===========================
   HELPERS
=========================== */
function $(id){ return document.getElementById(id); }

function showError(id, msg){
  const el = $(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideError(id){
  const el = $(id);
  el.classList.add("hidden");
  el.textContent = "";
}

function sanitizeName(name){
  return (name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 18)
    .toUpperCase() || "CADAVER";
}

function getRankFor(count){
  const c = Number(count || 0);
  return RANKS.filter(r => c >= r.min).pop() || RANKS[0];
}

function dayName(d){
  return ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][d];
}

function getLocalDateKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

/* Compute "cycle day index" given plan startDateKey */
function computeCycleIndex(startDateKey){
  const [sy, sm, sd] = startDateKey.split("-").map(Number);
  const start = new Date(sy, sm-1, sd);
  const now = new Date();
  start.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diffDays = Math.floor((now - start) / (1000*60*60*24));
  return diffDays < 0 ? 0 : diffDays;
}

function splitById(id){
  return SPLITS.find(s => s.id === id) || SPLITS[0];
}

/* ===========================
   AUTH STATE
=========================== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    $("auth-screen").classList.remove("hidden");
    $("registration-screen").classList.add("hidden");
    $("app").classList.add("hidden");
    return;
  }

  // Load user doc
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    // user exists in auth but no profile doc yet
    showRegistration();
    return;
  }

  currentUserData = snap.data();
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  initApp();
});

/* ===========================
   INIT APP
=========================== */
function initApp(){
  // Header / profile card
  const rank = getRankFor(currentUserData.carvingCount || 0);
  $("header-callsign").textContent = currentUserData.username || "CADAVER";
  $("header-rank").textContent = rank.name;

  $("profileUsername").textContent = currentUserData.username || "CADAVER";
  $("user-rank").textContent = rank.name;

  const tagCss = currentUserData.tag || rank.card || "tag-rust";
  $("user-grave-tag").className = `grave-tag ${tagCss}`;
  $("user-tag-text").textContent = (tagCss || "tag-rust").replace("tag-","").toUpperCase();

  const avatar = currentUserData.avatar || "a0";
  $("user-avatar").className = `avatar-shell ${avatar}`;

  // Trophies
  renderTrophies(currentUserData.trophies || {});

  // Settings pickers
  $("settings-tag-picker").innerHTML = TAGS.map(t => `
    <div class="tag-opt ${t.css}" data-css="${t.css}" title="${t.label}"></div>
  `).join("");
  $("settings-tag-picker").querySelectorAll(".tag-opt").forEach(el=>{
    el.onclick = () => {
      $("settings-tag-picker").querySelectorAll(".tag-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      selectedTagCss = el.dataset.css;
    };
    if (el.dataset.css === tagCss) { el.classList.add("active"); selectedTagCss = tagCss; }
  });

  $("settings-avatar-picker").innerHTML = AVATARS.map(a => `
    <div class="avatar-opt" data-a="${a}">
      <div class="avatar-shell ${a}" style="position:relative; left:0; width:100%; height:100%; border-radius:16px;"></div>
    </div>
  `).join("");
  $("settings-avatar-picker").querySelectorAll(".avatar-opt").forEach(el=>{
    el.onclick = () => {
      $("settings-avatar-picker").querySelectorAll(".avatar-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      selectedAvatarClass = el.dataset.a;
    };
    if (el.dataset.a === avatar) { el.classList.add("active"); selectedAvatarClass = avatar; }
  });

  // Plans UI
  bootPlansUI();

  // Logging
  bootLoggingUI();

  // Feed / leaderboard / friends
  loadFeed();
  loadLeaderboard();
  loadLogsIndex();
  bootFriendsUI();

  // Admin UI (simple: relies on user doc field isAdmin === true)
  // NOTE: You should set this manually in Firestore for your UID if you want admin console.
  if (currentUserData.isAdmin === true) {
    const box = $("admin-console");
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="micro">ADMIN: YOU CAN MODERATE POSTS BY ID (ADVANCED). BASIC USERS CAN ONLY DELETE THEIR OWN POSTS.</div>
    `;
  } else {
    $("admin-console").classList.add("hidden");
  }

  // Default tab
  window.showTab = (id) => {
    ["feed-panel","friends-panel","plans-panel","settings-panel"].forEach(p => $(p).classList.add("hidden"));
    $(id).classList.remove("hidden");
  };
}

/* ===========================
   REGISTRATION FLOW
=========================== */
function showAuth(){
  $("registration-screen").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
}
function showRegistration(){
  $("auth-screen").classList.add("hidden");
  $("registration-screen").classList.remove("hidden");
}
window.showAuth = showAuth;
window.showRegistration = showRegistration;

function bootRegistrationPickers(){
  // tag picker
  $("initial-tag-picker").innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" data-css="${t.css}" title="${t.label}"></div>`).join("");
  $("initial-tag-picker").querySelectorAll(".tag-opt").forEach(el=>{
    el.onclick = () => {
      $("initial-tag-picker").querySelectorAll(".tag-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      selectedTagCss = el.dataset.css;
    };
  });
  // default
  $("initial-tag-picker").querySelector(`[data-css="${selectedTagCss}"]`)?.classList.add("active");

  // avatar picker
  $("avatar-picker").innerHTML = AVATARS.map(a => `
    <div class="avatar-opt" data-a="${a}">
      <div class="avatar-shell ${a}" style="position:relative; left:0; width:100%; height:100%; border-radius:16px;"></div>
    </div>
  `).join("");
  $("avatar-picker").querySelectorAll(".avatar-opt").forEach(el=>{
    el.onclick = () => {
      $("avatar-picker").querySelectorAll(".avatar-opt").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      selectedAvatarClass = el.dataset.a;
    };
  });
  $("avatar-picker").querySelector(`[data-a="${selectedAvatarClass}"]`)?.classList.add("active");

  // plan picker
  $("reg-plan").innerHTML = SPLITS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  // start mode
  $("reg-startmode").onchange = () => {
    if ($("reg-startmode").value === "custom") $("reg-customday").classList.remove("hidden");
    else $("reg-customday").classList.add("hidden");
  };
}

/* ===========================
   FRIENDS + SEARCH + PROFILES
=========================== */
function bootFriendsUI(){
  const input = $("userSearch");
  input.oninput = async () => {
    const q = input.value.trim();
    const out = $("search-results");
    out.innerHTML = "";
    if (q.length < 2) return;

    // Search by username prefix-ish (simple contains by pulling limited set)
    const snap = await getDocs(query(collection(db,"users"), orderBy("username"), limit(30)));
    const matches = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => (u.username||"").toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);

    out.innerHTML = matches.map(u => `
      <div class="index-row">
        <span>${u.username}</span>
        <div style="display:flex; gap:8px;">
          <button class="mini-btn" onclick="window.openProfile('${u.id}')">VIEW</button>
          <button class="mini-btn" onclick="window.addFriend('${u.id}')">BIND</button>
        </div>
      </div>
    `).join("");
  };

  loadFriends();
}

function loadFriends(){
  const list = $("friends-list");
  list.innerHTML = "";
  const friends = currentUserData.friends || [];
  if (!friends.length) {
    list.innerHTML = `<div class="micro">NO COVEN YET. SEARCH AND BIND.</div>`;
    return;
  }
  friends.forEach(async fId => {
    const fSnap = await getDoc(doc(db,"users",fId));
    if (!fSnap.exists()) return;
    const f = fSnap.data();
    list.innerHTML += `
      <div class="index-row">
        <span>${f.username}</span>
        <div style="display:flex; gap:8px;">
          <button class="mini-btn" onclick="window.openProfile('${fId}')">VIEW</button>
          <button class="mini-btn danger" onclick="window.removeFriend('${fId}')">SEVER</button>
        </div>
      </div>
    `;
  });
}

window.addFriend = async (targetUid) => {
  if (!targetUid || targetUid === auth.currentUser.uid) return;
  await updateDoc(doc(db,"users",auth.currentUser.uid), { friends: arrayUnion(targetUid) });
  currentUserData.friends = [...(currentUserData.friends||[]), targetUid];
  loadFriends();
};

window.removeFriend = async (targetUid) => {
  await updateDoc(doc(db,"users",auth.currentUser.uid), { friends: arrayRemove(targetUid) });
  currentUserData.friends = (currentUserData.friends||[]).filter(x=>x!==targetUid);
  loadFriends();
};

window.openProfile = async (uid) => {
  const snap = await getDoc(doc(db,"users",uid));
  if (!snap.exists()) return;
  const u = snap.data();
  const count = Number(u.carvingCount||0);
  const rank = getRankFor(count);
  const tagCss = u.tag || rank.card || "tag-rust";
  const avatar = u.avatar || "a0";

  $("pm-title").textContent = `PROFILE // ${u.username || "CADAVER"}`;
  $("pm-body").innerHTML = `
    <div class="pm-hero">
      <div class="avatar-shell ${avatar}"></div>
      <div>
        <div class="pm-name">${u.username || "CADAVER"}</div>
        <div class="pm-sub">RANK: <b>${rank.name}</b> // CARVINGS: <b>${count}</b> // TAG: <b>${tagCss.replace("tag-","").toUpperCase()}</b></div>
      </div>
    </div>

    <div class="grave-tag ${tagCss}" style="height:110px; border-radius:16px; margin-bottom:14px;">
      <span class="tag-text">CALLING_CARD</span>
      <div class="tag-sheen"></div>
    </div>

    <div class="divider"></div>

    <div class="small-label">TROPHIES</div>
    <div class="trophy-row">
      ${
        Object.values(u.trophies||{}).filter(Boolean).length
        ? Object.entries(u.trophies||{}).filter(([k,v])=>v).map(([k,v])=>`<span class="trophy">${k}</span>`).join("")
        : `<div class="micro">NO TROPHIES YET.</div>`
      }
    </div>
  `;

  $("profile-modal").classList.remove("hidden");
};

window.closeProfile = () => $("profile-modal").classList.add("hidden");

/* ===========================
   FEED (with delete own posts)
=========================== */
function loadFeed(){
  onSnapshot(query(collection(db,"posts"), orderBy("timestamp","desc"), limit(25)), snap => {
    const feed = $("feed-content");
    feed.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      const isMine = p.uid === auth.currentUser.uid;
      feed.innerHTML += `
        <div class="grave-box post">
          <div class="grave-header-sub">
            <div class="post-meta">
              <span><b>${p.username || "CADAVER"}</b></span>
              <span class="micro">${p.timestamp?.toDate().toLocaleString() || ""}</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="mini-btn" onclick="window.openProfile('${p.uid}')">PROFILE</button>
              ${isMine ? `<button class="mini-btn danger" onclick="window.deletePost('${d.id}')">DELETE</button>` : ""}
            </div>
          </div>
          <div class="grave-body"><p>${escapeHTML(p.text || "")}</p></div>

          <div class="comment-section" id="comments-${d.id}"></div>
          <div class="comment-input-wrap">
            <input id="in-${d.id}" placeholder="REPLY...">
            <button class="mini-btn" onclick="window.postComment('${d.id}')">SEND</button>
          </div>
        </div>
      `;
      loadComments(d.id);
    });
  });
}

function loadComments(postId){
  onSnapshot(query(collection(db,`posts/${postId}/comments`), orderBy("timestamp","asc"), limit(50)), snap => {
    const box = $(`comments-${postId}`);
    if (!box) return;
    box.innerHTML = "";
    snap.forEach(c => {
      const data = c.data();
      box.innerHTML += `<div class="comment"><b>${escapeHTML(data.username||"CADAVER")}:</b> ${escapeHTML(data.text||"")}</div>`;
    });
  });
}

window.postComment = async (postId) => {
  const input = $(`in-${postId}`);
  const text = (input?.value || "").trim();
  if (!text) return;

  await addDoc(collection(db,`posts/${postId}/comments`), {
    uid: auth.currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  input.value = "";
};

window.deletePost = async (postId) => {
  // rules enforce: only owner can delete
  await deleteDoc(doc(db,"posts",postId));
};

function escapeHTML(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ===========================
   LEADERBOARD
=========================== */
function loadLeaderboard(){
  onSnapshot(query(collection(db,"users"), orderBy("carvingCount","desc"), limit(7)), snap => {
    $("leaderboard").innerHTML = snap.docs.map((d,i)=>{
      const u = d.data();
      return `<div class="index-row"><span>#${i+1} ${u.username || "CADAVER"}</span><span>${u.carvingCount || 0}</span></div>`;
    }).join("");
  });
}

/* ===========================
   PLANS / SPLITS
=========================== */
function bootPlansUI(){
  // plan picker list
  $("plan-picker").innerHTML = SPLITS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  // start-mode toggle
  $("start-mode").onchange = () => {
    if ($("start-mode").value === "custom") $("custom-start-day").classList.remove("hidden");
    else $("custom-start-day").classList.add("hidden");
  };

  // Activate plan button
  $("activate-plan-btn").onclick = async () => {
    const planId = $("plan-picker").value;
    const mode = $("start-mode").value;

    const today = new Date();
    let startDateKey = getLocalDateKey(today);

    if (mode === "custom") {
      // Adjust start date so that "cycle day 0" matches chosen weekday
      const desired = Number($("custom-start-day").value);
      const current = today.getDay();
      const diff = desired - current;
      const adjusted = new Date(today);
      adjusted.setDate(today.getDate() + diff);
      startDateKey = getLocalDateKey(adjusted);
    }

    await updateDoc(doc(db,"users",auth.currentUser.uid), {
      activePlanId: planId,
      planStartDate: startDateKey
    });

    currentUserData.activePlanId = planId;
    currentUserData.planStartDate = startDateKey;

    renderTodayWorkout();
    bootLoggingUI();
  };

  // builder
  $("open-builder-btn").onclick = () => toggleBuilder();

  // render today
  renderTodayWorkout();

  // also populate reg plan picker (when needed)
  if ($("reg-plan")) {
    $("reg-plan").innerHTML = SPLITS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }
}

function renderTodayWorkout(){
  const planId = currentUserData.activePlanId || SPLITS[0].id;
  const start = currentUserData.planStartDate || getLocalDateKey(new Date());
  const split = splitById(planId);

  const idx = computeCycleIndex(start);
  const cycle = split.cycleDays;
  const dayIdx = idx % cycle.length;
  const today = cycle[dayIdx];

  $("today-label").textContent = `ACTIVE_SPLIT: ${split.name} // START: ${start} // TODAY: ${today.label}`;
  $("today-workout").innerHTML = `
    <div class="micro">FOCUS: ${today.focus}</div>
    <div class="divider"></div>
    ${today.exercises.map((e, i)=>`<div class="index-row"><span>${String(i+1).padStart(2,"0")} // ${e}</span><span class="micro">LOG IT →</span></div>`).join("")}
  `;
}

/* ===========================
   CUSTOM SPLIT BUILDER (simple)
=========================== */
function toggleBuilder(){
  const wrap = $("builder-wrap");
  wrap.classList.toggle("hidden");
  if (!wrap.classList.contains("hidden")) buildBuilderUI();
}

function buildBuilderUI(){
  const wrap = $("builder-wrap");
  wrap.innerHTML = `
    <div class="divider"></div>
    <div class="small-label">CUSTOM_SPLIT_BUILDER</div>
    <input id="cs-name" placeholder="SPLIT_NAME (E.G. BONEGRIND_5DAY)">
    <div class="micro">Add up to 7 days. Each day can have up to 10 exercises.</div>

    <div id="cs-days"></div>
    <button class="grave-btn-alt" id="cs-add-day">ADD_DAY</button>
    <button class="grave-btn" id="cs-save">SAVE_CUSTOM_SPLIT</button>
    <div id="cs-msg" class="micro"></div>
  `;

  const daysBox = $("cs-days");
  let dayCount = 0;

  const addDay = () => {
    if (dayCount >= 7) return;
    const d = dayCount++;
    const dayId = `cs-day-${d}`;
    daysBox.insertAdjacentHTML("beforeend", `
      <div class="grave-box inset" style="margin-top:12px;">
        <div class="grave-header">DAY_${d+1}</div>
        <div class="grave-body">
          <input id="${dayId}-label" placeholder="LABEL (E.G. PUSH_I)">
          <div class="select-wrap">
            <select id="${dayId}-ex" multiple size="8"></select>
          </div>
          <div class="micro">Hold CTRL/CMD to pick multiple exercises (ordered logging happens via the selected list order).</div>
        </div>
      </div>
    `);
    const sel = $( `${dayId}-ex` );
    sel.innerHTML = ALL_EXERCISES.map(e => `<option value="${e}">${e}</option>`).join("");
  };

  $("cs-add-day").onclick = addDay;
  addDay(); addDay(); // start with 2

  $("cs-save").onclick = async () => {
    const name = sanitizeName($("cs-name").value);
    if (!name || name.length < 3) { $("cs-msg").textContent = "NAME_REQUIRED"; return; }

    const days = [];
    for (let i=0; i<dayCount; i++){
      const label = sanitizeName($(`cs-day-${i}-label`)?.value || `DAY_${i+1}`);
      const sel = $(`cs-day-${i}-ex`);
      const ex = Array.from(sel.selectedOptions).map(o=>o.value).slice(0,10);
      if (!ex.length) continue;
      days.push({ label, focus: "CUSTOM", exercises: ex });
    }

    if (!days.length) { $("cs-msg").textContent = "ADD_EXERCISES"; return; }

    const ref = doc(db, "customSplits", `${auth.currentUser.uid}_${Date.now()}`);
    await setDoc(ref, {
      uid: auth.currentUser.uid,
      name: name,
      createdAt: serverTimestamp(),
      cycleDays: days
    });

    $("cs-msg").textContent = "SAVED. (CUSTOM SPLITS VIEW EXTENSION CAN BE ADDED NEXT)";
  };
}

/* ===========================
   LOGGING STATION (per-session dropdown)
=========================== */
function bootLoggingUI(){
  // Determine today's session list from active plan
  const planId = currentUserData.activePlanId || SPLITS[0].id;
  const start = currentUserData.planStartDate || getLocalDateKey(new Date());
  const split = splitById(planId);

  const idx = computeCycleIndex(start);
  const cycle = split.cycleDays;
  const dayIdx = idx % cycle.length;
  const today = cycle[dayIdx];

  // Session picker: allow logging any day in cycle too
  const sessionSelect = $("log-session");
  sessionSelect.innerHTML = split.cycleDays.map((d,i)=>`<option value="${i}">${String(i+1).padStart(2,"0")} // ${d.label}</option>`).join("");
  sessionSelect.value = String(dayIdx);

  const refreshExerciseDropdown = () => {
    const i = Number(sessionSelect.value);
    const day = split.cycleDays[i];
    $("log-ex").innerHTML = (day.exercises || []).map(e => `<option value="${e}">${e}</option>`).join("");
    $("log-hint").textContent = `SESSION: ${day.label} // FOCUS: ${day.focus}`;
  };

  sessionSelect.onchange = refreshExerciseDropdown;
  refreshExerciseDropdown();

  $("recordBtn").onclick = async () => {
    const ex = $("log-ex").value;
    const w = Number($("log-w").value);
    const r = Number($("log-r").value);

    if (!ex || !w || !r) { $("log-hint").textContent = "MISSING_VALUES"; return; }

    // write log
    await addDoc(collection(db,"logs"), {
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      planId,
      sessionIndex: Number(sessionSelect.value),
      sessionLabel: split.cycleDays[Number(sessionSelect.value)].label,
      exercise: ex,
      weight: w,
      reps: r,
      timestamp: serverTimestamp()
    });

    // bump carvingCount
    const newCount = Number(currentUserData.carvingCount || 0) + 1;
    currentUserData.carvingCount = newCount;

    // PR update
    const prs = currentUserData.prs || {};
    const prev = Number(prs[ex] || 0);
    if (w > prev) prs[ex] = w;

    // trophy update
    const trophies = currentUserData.trophies || {};
    for (const t of TROPHY_RULES){
      if (t.exercise === ex && w >= t.min) trophies[t.key] = true;
    }

    // rank-based unlocks (optional auto-tag suggestion)
    const rank = getRankFor(newCount);

    await updateDoc(doc(db,"users",auth.currentUser.uid), {
      carvingCount: newCount,
      prs,
      trophies
    });

    currentUserData.prs = prs;
    currentUserData.trophies = trophies;

    $("log-w").value = "";
    $("log-r").value = "";

    // refresh UI pieces that depend on count/trophies
    $("stat-count").textContent = String(newCount);
    $("user-rank").textContent = rank.name;
    $("header-rank").textContent = rank.name;
    renderTrophies(trophies);
  };
}

function renderTrophies(trophies){
  const row = $("trophy-row");
  const earned = Object.entries(trophies || {}).filter(([k,v])=>v);
  if (!earned.length){
    row.innerHTML = `<span class="micro">NO TROPHIES YET. EARN THEM.</span>`;
    return;
  }
  row.innerHTML = earned.map(([k]) => `<span class="trophy">${k}</span>`).join("");
}

/* ===========================
   LOG INDEX (recent + delete own)
=========================== */
function loadLogsIndex(){
  onSnapshot(
    query(collection(db,"logs"), where("uid","==",auth.currentUser.uid), orderBy("timestamp","desc"), limit(16)),
    snap => {
      $("prList").innerHTML = snap.docs.map(d => {
        const x = d.data();
        return `
          <div class="index-row">
            <span>${x.exercise} — <b>${x.weight}</b>LBS x ${x.reps} <span class="micro">(${x.sessionLabel || ""})</span></span>
            <button class="mini-btn danger" onclick="window.deleteLog('${d.id}')">X</button>
          </div>
        `;
      }).join("") || `<div class="micro">NO LOGS YET.</div>`;

      $("stat-count").textContent = String(currentUserData.carvingCount || 0);
    }
  );
}

window.deleteLog = async (logId) => {
  await deleteDoc(doc(db,"logs",logId));
};

/* ===========================
   SETTINGS ACTIONS
=========================== */
window.updateUsername = async () => {
  const newName = sanitizeName($("new-username").value);
  if (!newName) return;
  await updateDoc(doc(db,"users",auth.currentUser.uid), { username: newName });
  currentUserData.username = newName;
  $("profileUsername").textContent = newName;
  $("header-callsign").textContent = newName;
  alert("IDENTITY_UPDATED");
};

window.updateGraveTag = async () => {
  await updateDoc(doc(db,"users",auth.currentUser.uid), { tag: selectedTagCss });
  currentUserData.tag = selectedTagCss;
  $("user-grave-tag").className = `grave-tag ${selectedTagCss}`;
  $("user-tag-text").textContent = selectedTagCss.replace("tag-","").toUpperCase();
  alert("VISUALS_RECONFIGURED");
};

window.updateAvatar = async () => {
  await updateDoc(doc(db,"users",auth.currentUser.uid), { avatar: selectedAvatarClass });
  currentUserData.avatar = selectedAvatarClass;
  $("user-avatar").className = `avatar-shell ${selectedAvatarClass}`;
  alert("AVATAR_UPDATED");
};

/* ===========================
   DOM CONTENT LOADED: HOOKS
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  // AUTH
  $("loginBtn").onclick = async () => {
    hideError("login-error");
    try {
      await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
    } catch (e) {
      showError("login-error", e?.message || "LOGIN_FAILED");
    }
  };

  // ✅ FIXED: new user button was doing nothing
  $("showRegBtn").onclick = () => {
    // reset reg
    $("reg-step-1").classList.remove("hidden");
    $("reg-step-2").classList.add("hidden");
    hideError("reg-error-1"); hideError("reg-error-2");
    showRegistration();
    bootRegistrationPickers();
  };

  $("returnToLoginBtn").onclick = () => showAuth();

  // REG step1
  $("nextStepBtn").onclick = async () => {
    hideError("reg-error-1");
    const email = $("reg-email").value.trim();
    const pass = $("reg-pass").value;
    const conf = $("reg-confirm").value;

    if (!email || !pass) return showError("reg-error-1","EMAIL_AND_PASS_REQUIRED");
    if (pass !== conf) return showError("reg-error-1","PASSCODES_DO_NOT_MATCH");
    if (pass.length < 6) return showError("reg-error-1","PASSCODE_TOO_SHORT (MIN 6)");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      tempCreatedUser = cred.user;

      $("reg-step-1").classList.add("hidden");
      $("reg-step-2").classList.remove("hidden");

      bootRegistrationPickers();

      $("reg-startmode").onchange = () => {
        if ($("reg-startmode").value === "custom") $("reg-customday").classList.remove("hidden");
        else $("reg-customday").classList.add("hidden");
      };
    } catch (e) {
      showError("reg-error-1", e?.message || "REGISTRATION_FAILED");
    }
  };

  // REG finalize
  $("finalizeRegBtn").onclick = async () => {
    hideError("reg-error-2");
    try {
      const user = auth.currentUser || tempCreatedUser;
      if (!user) return showError("reg-error-2","AUTH_MISSING");

      const username = sanitizeName($("reg-username").value);
      const planId = $("reg-plan").value || SPLITS[0].id;

      const mode = $("reg-startmode").value;
      const today = new Date();
      let startDateKey = getLocalDateKey(today);

      if (mode === "custom") {
        const desired = Number($("reg-customday").value);
        const current = today.getDay();
        const diff = desired - current;
        const adjusted = new Date(today);
        adjusted.setDate(today.getDate() + diff);
        startDateKey = getLocalDateKey(adjusted);
      }

      await setDoc(doc(db,"users",user.uid), {
        uid: user.uid,
        email: user.email,
        username,
        tag: selectedTagCss,
        avatar: selectedAvatarClass,
        carvingCount: 0,
        prs: {},
        trophies: {},
        friends: [],
        isAdmin: false, // set true manually for your admin UID if desired
        activePlanId: planId,
        planStartDate: startDateKey,
        createdAt: serverTimestamp()
      });

      // After this, auth state listener loads app
    } catch (e) {
      showError("reg-error-2", e?.message || "FINALIZE_FAILED");
    }
  };

  // POST
  $("postStatusBtn").onclick = async () => {
    const text = ($("statusText").value || "").trim();
    if (!text) return;

    await addDoc(collection(db,"posts"), {
      uid: auth.currentUser.uid,
      username: currentUserData.username,
      text,
      timestamp: serverTimestamp()
    });

    $("statusText").value = "";
  };

  // LOGOUT
  $("logoutBtn").onclick = () => signOut(auth);
});
