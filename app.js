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
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
  limit,
  getDocs,
  increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ---------------------------
   FIREBASE
---------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------------------
   DATA: Exercises
---------------------------- */
const EXERCISES = {
  Push: [
    "Bench Press","Incline DB Press","Overhead Press","Machine Press","Lateral Raises",
    "Cable Fly","Dips","Tricep Pushdown","Skull Crushers","Close-Grip Bench"
  ],
  Pull: [
    "Deadlift","RDL","Pull-Ups","Lat Pulldown","Barbell Row","Cable Row",
    "Chest-Supported Row","Face Pulls","Rear Delt Fly","EZ-Bar Curl","Hammer Curl"
  ],
  Legs: [
    "Back Squat","Front Squat","Hack Squat","Leg Press","RDL","Hip Thrust",
    "Ham Curl","Leg Extension","Bulgarian Split Squat","Lunges","Calf Raises",
    "Adduction Machine","Abduction Machine"
  ],
  Full: [
    "Squat","Bench Press","Deadlift","OHP","Pull-Ups","Barbell Row","Leg Press","Hip Thrust"
  ],
  Arms: [
    "EZ-Bar Curl","Incline DB Curl","Hammer Curl","Cable Curl",
    "Rope Pushdown","Skull Crushers","Overhead Cable Extension","Dips"
  ]
};

const ALL_EXERCISES = Array.from(new Set([
  ...EXERCISES.Push,
  ...EXERCISES.Pull,
  ...EXERCISES.Legs,
  ...EXERCISES.Full,
  ...EXERCISES.Arms
])).sort();

/* ---------------------------
   Ranks + Cards + Avatars
---------------------------- */
const RANKS = [
  { min: 0, name: "NEWBORN", cardUnlock: ["rust_flicker"], avatarUnlock: ["skull"] },
  { min: 15, name: "GRAVE_RUNNER", cardUnlock: ["crt_sweep"], avatarUnlock: ["wraith"] },
  { min: 50, name: "CRYPT_KNIGHT", cardUnlock: ["blood_burn"], avatarUnlock: ["reaper"] },
  { min: 120, name: "GRAVE_LORD", cardUnlock: ["void_rift"], avatarUnlock: ["horned"] },
  { min: 250, name: "IMMORTAL", cardUnlock: ["eclipse"], avatarUnlock: ["lich"] }
];

const CARD_STYLES = [
  { id: "rust_flicker", name: "RUST_FLICKER", desc: "Old iron + static pulse", pills: ["starter","animated"] },
  { id: "crt_sweep", name: "CRT_SWEEP", desc: "Green scan beam sweep", pills: ["rank-unlock","animated"] },
  { id: "blood_burn", name: "BLOOD_BURN", desc: "Heat shimmer + ember edge", pills: ["rank-unlock","animated"] },
  { id: "void_rift", name: "VOID_RIFT", desc: "Dark rift distort", pills: ["rank-unlock","animated"] },
  { id: "eclipse", name: "ECLIPSE", desc: "Rare eclipse halo", pills: ["max-rank","animated"] }
];

const TAGS = [
  { id:"rust", css:"tag-rust", label:"RUST" },
  { id:"crt", css:"tag-crt", label:"CRT" },
  { id:"blood", css:"tag-blood", label:"BLOOD" },
  { id:"void", css:"tag-void", label:"VOID" }
];

const AVATARS = [
  { id:"skull", glyph:"☠" },
  { id:"wraith", glyph:"⟁" },
  { id:"reaper", glyph:"⛧" },
  { id:"horned", glyph:"𖤐" },
  { id:"lich", glyph:"⚚" },
  { id:"sigil", glyph:"⟡" },
  { id:"fang", glyph:"⛓" },
  { id:"obelisk", glyph:"⌁" }
];

/* ---------------------------
   Built-in Splits (3–5+)
   Includes your worksheet split:
   Monday–Friday: Comp / LowerA / UpperPush / LowerB / UpperPull+Arms
   (From your uploaded worksheet) :contentReference[oaicite:0]{index=0}
---------------------------- */
const SPLIT_LIBRARY = [
  {
    id: "graveyard_5x",
    name: "GRAVEYARD_5X",
    desc: "M–F every muscle 2×/week (compound anchor).",
    days: [
      { name: "DAY_1 // FULL_COMPOUND", focus: "Full", exercises: ["Squat / Leg Press","Bench / Incline","Row / Pull-ups","Overhead Press","RDL / Deadlift","Curl or Pushdown"] },
      { name: "DAY_2 // LOWER_A (FULL_LEGS)", focus: "Legs", exercises: ["Squat / Hack Squat","Leg Press","Romanian Deadlift","Ham Curl","Hip Thrust","Adduction Machine","Abduction Machine"] },
      { name: "DAY_3 // UPPER_PUSH", focus: "Push", exercises: ["Bench / Incline Press","Fly Variation","OHP / Machine Press","Lateral Raises","Skull Crushers","Rope Pushdowns"] },
      { name: "DAY_4 // LOWER_B (POSTERIOR)", focus: "Legs", exercises: ["Deadlift / RDL","Hip Thrust","Bulgarian Split Squat","Leg Extension","Adduction Machine","Abduction Machine"] },
      { name: "DAY_5 // UPPER_PULL + ARMS", focus: "Pull", exercises: ["Pull-ups / Pulldowns","Barbell / Cable Rows","Face Pulls","EZ-Bar Curls","Hammer Curls","Close-Grip Bench / Dips"] }
    ],
    pills: ["M–F","2×/week","balanced","worksheet"]
  },
  {
    id: "iron_cult_ppl",
    name: "IRON_CULT_PPL",
    desc: "Push/Pull/Legs (repeat) for high volume.",
    days: [
      { name: "DAY_1 // PUSH", focus:"Push", exercises:["Bench Press","Incline DB Press","Overhead Press","Lateral Raises","Tricep Pushdown"] },
      { name: "DAY_2 // PULL", focus:"Pull", exercises:["Deadlift","Pull-Ups","Barbell Row","Face Pulls","EZ-Bar Curl"] },
      { name: "DAY_3 // LEGS", focus:"Legs", exercises:["Back Squat","Leg Press","RDL","Ham Curl","Calf Raises"] },
      { name: "DAY_4 // PUSH_II", focus:"Push", exercises:["Machine Press","Cable Fly","OHP","Lateral Raises","Skull Crushers"] },
      { name: "DAY_5 // PULL_II", focus:"Pull", exercises:["Lat Pulldown","Cable Row","Rear Delt Fly","Hammer Curl","Face Pulls"] },
      { name: "DAY_6 // LEGS_II", focus:"Legs", exercises:["Hack Squat","Lunges","Hip Thrust","Leg Extension","Abduction Machine"] }
    ],
    pills:["6-day","hypertrophy","classic"]
  },
  {
    id: "crypt_4day_upper_lower",
    name: "CRYPT_4DAY UL",
    desc: "Upper/Lower (x2) + recovery friendly.",
    days: [
      { name:"DAY_1 // UPPER_A", focus:"Push", exercises:["Bench Press","Barbell Row","OHP","Lat Pulldown","Tricep Pushdown"] },
      { name:"DAY_2 // LOWER_A", focus:"Legs", exercises:["Back Squat","RDL","Leg Press","Ham Curl","Calf Raises"] },
      { name:"DAY_3 // UPPER_B", focus:"Pull", exercises:["Incline DB Press","Cable Row","Lateral Raises","Pull-Ups","EZ-Bar Curl"] },
      { name:"DAY_4 // LOWER_B", focus:"Legs", exercises:["Deadlift","Hip Thrust","Lunges","Leg Extension","Adduction Machine"] }
    ],
    pills:["4-day","strength+size","easy"]
  },
  {
    id: "black_sun_5day_bro",
    name: "BLACK_SUN 5DAY",
    desc: "Body-part split w/ heavy compounds baked in.",
    days: [
      { name:"DAY_1 // CHEST+TRI", focus:"Push", exercises:["Bench Press","Incline DB Press","Cable Fly","Dips","Rope Pushdown"] },
      { name:"DAY_2 // BACK+BI", focus:"Pull", exercises:["Deadlift","Pull-Ups","Barbell Row","Face Pulls","Hammer Curl"] },
      { name:"DAY_3 // LEGS", focus:"Legs", exercises:["Back Squat","Leg Press","RDL","Ham Curl","Calf Raises"] },
      { name:"DAY_4 // SHOULDERS+ARMS", focus:"Arms", exercises:["OHP","Lateral Raises","Rear Delt Fly","EZ-Bar Curl","Skull Crushers"] },
      { name:"DAY_5 // POWER_COMPOUND", focus:"Full", exercises:["Squat","Bench Press","Deadlift","Pull-Ups","OHP"] }
    ],
    pills:["5-day","classic","fun"]
  },
  {
    id: "tomb_3day_fullbody",
    name: "TOMB_3DAY",
    desc: "3 days/week full-body for busy schedules.",
    days: [
      { name:"DAY_1 // FULL_A", focus:"Full", exercises:["Squat","Bench Press","Barbell Row","RDL","Lateral Raises"] },
      { name:"DAY_2 // FULL_B", focus:"Full", exercises:["Deadlift","Incline DB Press","Pull-Ups","Leg Press","Tricep Pushdown"] },
      { name:"DAY_3 // FULL_C", focus:"Full", exercises:["Front Squat","OHP","Cable Row","Hip Thrust","EZ-Bar Curl"] }
    ],
    pills:["3-day","efficient","strength"]
  }
];

/* ---------------------------
   Trophies for heavy lifts
---------------------------- */
const TROPHY_RULES = [
  { id:"SQUAT_315", label:"🏆 SQUAT_315", exerciseMatch:["Back Squat","Squat","Front Squat"], minWeight:315 },
  { id:"DEAD_405", label:"🏆 DEAD_405", exerciseMatch:["Deadlift"], minWeight:405 },
  { id:"BENCH_225", label:"🏆 BENCH_225", exerciseMatch:["Bench Press"], minWeight:225 },
  { id:"OHP_135", label:"🏆 OHP_135", exerciseMatch:["OHP","Overhead Press"], minWeight:135 }
];

/* ---------------------------
   State
---------------------------- */
let currentUser = null;
let currentUserData = null;
let selectedTagCss = "tag-rust";
let selectedAvatarId = "skull";
let selectedSplitId = null;
let selectedCardStyle = "rust_flicker";

/* ---------------------------
   Helpers
---------------------------- */
const el = (id) => document.getElementById(id);
const todayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
};
const safe = (s) => String(s ?? "").replace(/[<>&"]/g, (c)=>({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]));

/* ---------------------------
   AUTH STATE
---------------------------- */
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!user) {
    el("auth-screen").classList.remove("hidden");
    el("registration-screen").classList.add("hidden");
    el("app").classList.add("hidden");
    return;
  }

  // load user doc
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    // new auth user but no profile doc yet
    showRegistration();
    return;
  }

  currentUserData = snap.data();

  el("auth-screen").classList.add("hidden");
  el("registration-screen").classList.add("hidden");
  el("app").classList.remove("hidden");

  await initApp();
});

/* ---------------------------
   INIT APP
---------------------------- */
async function initApp(){
  renderUserCard();
  mountPickers();
  wireGlobalButtons();

  window.updateExercises();

  loadFeed();
  loadLeaderboard();
  loadQuickLogs();
  loadFriends();
  loadSplitLibrary();
  await loadActiveSplitAndRender();
  loadDailyMassgrave();

  // Default panel
  window.showTab("feed-panel");

  // Click header username to open profile
  el("header-callsign").onclick = () => window.openProfile(currentUser.uid);
  el("profileUsername").onclick = () => window.openProfile(currentUser.uid);

  // Admin box is claims-based (optional)
  await checkAdminClaims();
}

function renderUserCard(){
  el("header-callsign").innerText = currentUserData.username || "SUBJECT";
  el("profileUsername").innerText = currentUserData.username || "SUBJECT";

  const carvings = Number(currentUserData.carvingCount || 0);
  const rank = RANKS.filter(r => carvings >= r.min).pop() || RANKS[0];
  el("user-rank").innerText = rank.name;

  // tag pill
  const tagObj = TAGS.find(t => t.css === (currentUserData.tagCss || "tag-rust")) || TAGS[0];
  el("user-grave-tag").className = "grave-tag-pill";
  el("user-grave-tag").innerText = tagObj.label;

  // trophies line
  const trophies = (currentUserData.trophies || []);
  el("user-trophies").innerText = trophies.length ? trophies.join("  ") : "—";

  // stats
  el("stat-count").innerText = String(carvings);
}

function mountPickers(){
  // TAG PICKERS
  const sPicker = el("settings-tag-picker");
  const iPicker = el("initial-tag-picker");
  const tagHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" data-tag="${t.css}"></div>`).join("");

  if (sPicker) sPicker.innerHTML = tagHTML;
  if (iPicker) iPicker.innerHTML = tagHTML;

  // Avatar pickers
  const aInit = el("initial-avatar-picker");
  const aSet = el("settings-avatar-picker");

  const avatarHTML = AVATARS.map(a => `
    <div class="avatar-opt" data-avid="${a.id}">
      <div class="avatar">
        <div class="mask"></div>
        <div class="glyph">${safe(a.glyph)}</div>
      </div>
    </div>
  `).join("");

  if (aInit) aInit.innerHTML = avatarHTML;
  if (aSet) aSet.innerHTML = avatarHTML;

  // Card styles
  const cs = el("settings-card-picker");
  if (cs){
    cs.innerHTML = CARD_STYLES.map(c => `
      <div class="split-card" data-card="${c.id}">
        <div class="split-name">${safe(c.name)}</div>
        <div class="split-desc">${safe(c.desc)}</div>
        <div class="split-tags">
          ${c.pills.map(p => `<span class="pill">${safe(p)}</span>`).join("")}
        </div>
      </div>
    `).join("");
  }

  // Activate current visuals
  selectedTagCss = currentUserData.tagCss || "tag-rust";
  selectedAvatarId = currentUserData.avatarId || "skull";
  selectedCardStyle = currentUserData.cardStyle || "rust_flicker";

  // Render avatar on card
  renderAvatar(el("user-avatar"), selectedAvatarId);

  // Click handlers (delegation)
  document.body.addEventListener("click", (e) => {
    const tag = e.target.closest(".tag-opt");
    if (tag){
      const css = tag.getAttribute("data-tag");
      selectedTagCss = css;
      // highlight in its grid
      [...tag.parentElement.querySelectorAll(".tag-opt")].forEach(x => x.classList.remove("active"));
      tag.classList.add("active");
    }

    const av = e.target.closest(".avatar-opt");
    if (av){
      const id = av.getAttribute("data-avid");
      selectedAvatarId = id;
      [...av.parentElement.querySelectorAll(".avatar-opt")].forEach(x => x.classList.remove("active"));
      av.classList.add("active");
    }

    const card = e.target.closest("[data-card]");
    if (card){
      selectedCardStyle = card.getAttribute("data-card");
      [...card.parentElement.querySelectorAll("[data-card]")].forEach(x => x.classList.remove("active"));
      card.classList.add("active");
    }
  });

  // mark active selections visually
  setTimeout(() => {
    // tags
    document.querySelectorAll(`.tag-opt[data-tag="${CSS.escape(selectedTagCss)}"]`).forEach(x => x.classList.add("active"));
    // avatars
    document.querySelectorAll(`.avatar-opt[data-avid="${CSS.escape(selectedAvatarId)}"]`).forEach(x => x.classList.add("active"));
    // cards
    document.querySelectorAll(`[data-card="${CSS.escape(selectedCardStyle)}"]`).forEach(x => x.classList.add("active"));
  }, 0);
}

function renderAvatar(container, avatarId){
  if (!container) return;
  const a = AVATARS.find(x => x.id === avatarId) || AVATARS[0];
  container.innerHTML = `
    <div class="mask"></div>
    <div class="glyph">${safe(a.glyph)}</div>
  `;
}

function wireGlobalButtons(){
  // login/reg wiring
  el("showRegBtn").onclick = showRegistration;
  el("returnLoginBtn").onclick = showAuth;

  el("loginBtn").onclick = async () => {
    const email = el("email").value.trim();
    const pass = el("password").value;
    try{
      await signInWithEmailAndPassword(auth, email, pass);
    }catch(err){
      alert(`LOGIN_FAILED: ${err.message}`);
    }
  };

  el("nextStepBtn").onclick = () => {
    const email = el("reg-email").value.trim();
    const pass = el("reg-pass").value;
    const conf = el("reg-confirm").value;
    if (!email || !pass) return alert("MISSING_FIELDS");
    if (pass.length < 6) return alert("PASSCODE_TOO_SHORT (min 6)");
    if (pass !== conf) return alert("PASSCODES_DO_NOT_MATCH");
    el("reg-step-1").classList.add("hidden");
    el("reg-step-2").classList.remove("hidden");
  };

  el("finalizeRegBtn").onclick = finalizeRegistration;

  // feed post
  el("postStatusBtn").onclick = postStatus;

  // logout
  el("logoutBtn").onclick = () => window.signOutNow();
}

window.signOutNow = async () => {
  await signOut(auth);
  location.reload();
};

window.showTab = (id) => {
  ["feed-panel","plans-panel","profile-panel","friends-panel","settings-panel"].forEach(p => el(p).classList.add("hidden"));
  el(id).classList.remove("hidden");
};

window.scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

function showAuth(){
  el("registration-screen").classList.add("hidden");
  el("auth-screen").classList.remove("hidden");
}
function showRegistration(){
  el("auth-screen").classList.add("hidden");
  el("registration-screen").classList.remove("hidden");
  el("reg-step-1").classList.remove("hidden");
  el("reg-step-2").classList.add("hidden");
}

/* ---------------------------
   REGISTRATION FLOW
---------------------------- */
async function finalizeRegistration(){
  const email = el("reg-email").value.trim();
  const pass = el("reg-pass").value;
  const username = el("reg-username").value.trim();

  if (!username) return alert("CALLSIGN_REQUIRED");

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    const userDoc = {
      uid: cred.user.uid,
      username,
      createdAt: serverTimestamp(),

      tagCss: selectedTagCss || "tag-rust",
      avatarId: selectedAvatarId || "skull",
      cardStyle: "rust_flicker",

      carvingCount: 0,
      trophies: [],
      friends: [],

      activeSplit: null, // { splitId, startIndex, activatedAt }
      prCount: 0,
      lastLogDay: null,
      streak: 0
    };

    await setDoc(doc(db, "users", cred.user.uid), userDoc);
    alert("ENTITY_FORGED");
    location.reload();
  }catch(err){
    alert(`REGISTRATION_FAILED: ${err.message}`);
  }
}

/* ---------------------------
   SETTINGS
---------------------------- */
window.updateUsername = async () => {
  const newName = el("new-username").value.trim();
  if (!newName) return;
  await updateDoc(doc(db,"users", currentUser.uid), { username: newName });
  currentUserData.username = newName;
  renderUserCard();
  alert("IDENTITY_UPDATED");
};

window.updateGraveTag = async () => {
  await updateDoc(doc(db,"users", currentUser.uid), { tagCss: selectedTagCss });
  currentUserData.tagCss = selectedTagCss;
  renderUserCard();
  alert("TAG_EQUIPPED");
};

window.updateAvatar = async () => {
  await updateDoc(doc(db,"users", currentUser.uid), { avatarId: selectedAvatarId });
  currentUserData.avatarId = selectedAvatarId;
  renderAvatar(el("user-avatar"), selectedAvatarId);
  alert("AVATAR_EQUIPPED");
};

window.saveCardStyle = async () => {
  // enforce unlock based on rank
  const carvings = Number(currentUserData.carvingCount || 0);
  const rank = RANKS.filter(r => carvings >= r.min).pop() || RANKS[0];
  const unlocked = new Set();
  RANKS.forEach(r => { if (carvings >= r.min) (r.cardUnlock||[]).forEach(x => unlocked.add(x)); });

  if (!unlocked.has(selectedCardStyle)) {
    alert(`LOCKED_BY_RANK // CURRENT: ${rank.name}`);
    return;
  }

  await updateDoc(doc(db,"users", currentUser.uid), { cardStyle: selectedCardStyle });
  currentUserData.cardStyle = selectedCardStyle;
  alert("CARD_EQUIPPED");
};

window.previewCard = () => {
  alert(`EQUIPPED_CARD: ${currentUserData.cardStyle || "rust_flicker"}\nSELECTED: ${selectedCardStyle}`);
};

/* ---------------------------
   FEED + COMMENTS + DELETE OWN POSTS
---------------------------- */
async function postStatus(){
  const text = el("statusText").value.trim();
  if (!text) return;

  await addDoc(collection(db,"posts"), {
    uid: currentUser.uid,
    username: currentUserData.username,
    avatarId: currentUserData.avatarId || "skull",
    tagCss: currentUserData.tagCss || "tag-rust",
    text,
    timestamp: serverTimestamp()
  });

  el("statusText").value = "";
}

function loadFeed(){
  const qy = query(collection(db,"posts"), orderBy("timestamp","desc"), limit(30));
  onSnapshot(qy, (snap) => {
    const feed = el("feed-content");
    feed.innerHTML = "";

    snap.forEach(d => {
      const p = d.data();
      const isMine = (p.uid === currentUser.uid);

      feed.innerHTML += `
        <div class="grave-box post">
          <div class="grave-header-sub">
            <span class="clickable" onclick="window.openProfile('${p.uid}')">${safe(p.username)}</span>
            <span style="float:right; font-size:10px;">
              ${p.timestamp?.toDate ? p.timestamp.toDate().toLocaleString() : ""}
            </span>
          </div>
          <div class="grave-body">
            <div class="row" style="justify-content:space-between;">
              <div class="row" style="gap:12px;">
                <div class="avatar avatar-small" id="post-av-${d.id}"></div>
                <span class="grave-tag-pill">${safe((TAGS.find(t=>t.css===p.tagCss)||TAGS[0]).label)}</span>
              </div>
              ${isMine ? `<button class="mini-btn danger" onclick="window.deletePost('${d.id}')">DELETE</button>` : ``}
            </div>
            <p style="margin-top:12px; color:#e9e9e9;">${safe(p.text)}</p>
          </div>

          <div class="comment-section" id="comments-${d.id}"></div>
          <div class="comment-input-wrap">
            <input id="in-${d.id}" placeholder="REPLY...">
            <button class="mini-btn" onclick="window.postComment('${d.id}')">SEND</button>
          </div>
        </div>
      `;

      // render avatar
      setTimeout(() => renderAvatar(el(`post-av-${d.id}`), p.avatarId || "skull"), 0);
      loadComments(d.id);
    });
  });
}

window.deletePost = async (postId) => {
  const postRef = doc(db,"posts", postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) return;
  if (snap.data().uid !== currentUser.uid) return alert("DENIED");

  // delete comments subcollection (client-side sweep)
  const cs = await getDocs(collection(db, `posts/${postId}/comments`));
  for (const c of cs.docs){
    await deleteDoc(doc(db, `posts/${postId}/comments`, c.id));
  }

  await deleteDoc(postRef);
  alert("POST_DELETED");
};

function loadComments(postId){
  const cq = query(collection(db, `posts/${postId}/comments`), orderBy("timestamp","asc"), limit(50));
  onSnapshot(cq, (snap) => {
    const box = el(`comments-${postId}`);
    if (!box) return;
    box.innerHTML = "";
    snap.forEach(c => {
      const cd = c.data();
      box.innerHTML += `<div class="comment"><b class="clickable" onclick="window.openProfile('${cd.uid || ""}')">${safe(cd.username)}:</b> ${safe(cd.text)}</div>`;
    });
  });
}

window.postComment = async (postId) => {
  const input = el(`in-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, `posts/${postId}/comments`), {
    uid: currentUser.uid,
    username: currentUserData.username,
    text,
    timestamp: serverTimestamp()
  });

  input.value = "";
};

/* ---------------------------
   LEADERBOARD
---------------------------- */
function loadLeaderboard(){
  const qy = query(collection(db,"users"), orderBy("carvingCount","desc"), limit(7));
  onSnapshot(qy, (snap) => {
    const lb = el("leaderboard");
    lb.innerHTML = snap.docs.map((d,i)=>{
      const u = d.data();
      return `<div class="lb-row">#${i+1} <span class="clickable" onclick="window.openProfile('${d.id}')">${safe(u.username)}</span> [${u.carvingCount || 0}]</div>`;
    }).join("");
  });
}

/* ---------------------------
   FRIENDS: search/add/remove
---------------------------- */
function loadFriends(){
  const list = el("friends-list");
  if(!list) return;

  const myFriends = new Set(currentUserData.friends || []);
  list.innerHTML = myFriends.size ? "" : `<div class="small-label">NO_COVEN_MEMBERS_YET</div>`;

  myFriends.forEach(async (fid) => {
    const fsnap = await getDoc(doc(db,"users", fid));
    if (!fsnap.exists()) return;
    const u = fsnap.data();
    list.innerHTML += `
      <div class="index-row">
        <span class="clickable" onclick="window.openProfile('${fid}')">${safe(u.username)}</span>
        <button class="mini-btn danger" onclick="window.removeFriend('${fid}')">SEVER</button>
      </div>
    `;
  });

  // search typing
  const search = el("userSearch");
  const results = el("search-results");
  if (!search || !results) return;

  search.oninput = async () => {
    const term = search.value.trim().toLowerCase();
    results.innerHTML = "";
    if (term.length < 2) return;

    // naive search: read top N users and filter client-side (simple + rules-friendly)
    const snap = await getDocs(query(collection(db,"users"), orderBy("carvingCount","desc"), limit(30)));
    const filtered = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .filter(u => (u.username||"").toLowerCase().includes(term))
      .slice(0, 10);

    filtered.forEach(u => {
      const isMe = (u.id === currentUser.uid);
      const isFriend = myFriends.has(u.id);
      results.innerHTML += `
        <div class="index-row">
          <span class="clickable" onclick="window.openProfile('${u.id}')">${safe(u.username)}</span>
          ${isMe ? `<span class="pill">YOU</span>` :
            isFriend ? `<span class="pill">COVEN</span>` :
            `<button class="mini-btn" onclick="window.addFriend('${u.id}')">BIND</button>`
          }
        </div>
      `;
    });
  };
}

window.addFriend = async (targetUid) => {
  if (targetUid === currentUser.uid) return;
  const friends = new Set(currentUserData.friends || []);
  friends.add(targetUid);
  await updateDoc(doc(db,"users", currentUser.uid), { friends: Array.from(friends) });
  currentUserData.friends = Array.from(friends);
  alert("CONNECTION_ESTABLISHED");
  loadFriends();
};

window.removeFriend = async (targetUid) => {
  const friends = new Set(currentUserData.friends || []);
  friends.delete(targetUid);
  await updateDoc(doc(db,"users", currentUser.uid), { friends: Array.from(friends) });
  currentUserData.friends = Array.from(friends);
  alert("CONNECTION_SEVERED");
  loadFriends();
};

/* ---------------------------
   QUICK LOGGING + AUTO PR + TROPHIES + STREAK + MASSGRAVE
---------------------------- */
window.updateExercises = () => {
  const cat = el("log-category").value;
  const exSelect = el("log-ex");
  const list = EXERCISES[cat] || ALL_EXERCISES;
  exSelect.innerHTML = list.map(e => `<option value="${safe(e)}">${safe(e)}</option>`).join("");
};

window.submitQuickLog = async () => {
  const exercise = el("log-ex").value;
  const weight = Number(el("log-w").value || 0);
  const reps = Number(el("log-r").value || 0);
  if (!exercise || !weight || !reps) return alert("MISSING_LOG_FIELDS");

  await submitLogEntry({ exercise, weight, reps, source:"quick" });

  el("log-w").value = "";
  el("log-r").value = "";
};

async function submitLogEntry({ exercise, weight, reps, source }){
  const volume = weight * reps;

  // create log
  await addDoc(collection(db,"logs"), {
    uid: currentUser.uid,
    username: currentUserData.username,
    exercise,
    weight,
    reps,
    volume,
    source,
    timestamp: serverTimestamp(),
    dayKey: todayKey()
  });

  // update user carve count
  const newCarvings = Number(currentUserData.carvingCount || 0) + 1;

  // streak update
  const tkey = todayKey();
  const last = currentUserData.lastLogDay;
  let streak = Number(currentUserData.streak || 0);
  if (!last) streak = 1;
  else {
    const lastDate = new Date(last + "T00:00:00");
    const today = new Date(tkey + "T00:00:00");
    const diffDays = Math.round((today - lastDate) / (1000*60*60*24));
    if (diffDays === 0) { /* same day */ }
    else if (diffDays === 1) streak += 1;
    else streak = 1;
  }

  // trophies
  const trophies = new Set(currentUserData.trophies || []);
  TROPHY_RULES.forEach(rule => {
    const match = rule.exerciseMatch.some(m => exercise.toLowerCase().includes(m.toLowerCase()));
    if (match && weight >= rule.minWeight) trophies.add(rule.label);
  });

  // update user doc
  await updateDoc(doc(db,"users", currentUser.uid), {
    carvingCount: newCarvings,
    lastLogDay: tkey,
    streak,
    trophies: Array.from(trophies)
  });

  currentUserData.carvingCount = newCarvings;
  currentUserData.lastLogDay = tkey;
  currentUserData.streak = streak;
  currentUserData.trophies = Array.from(trophies);

  // PR tracking (per-exercise best weight)
  await updatePersonalRecords(exercise, weight, reps, volume);

  // MASSGRAVE global daily total (volume)
  await updateDoc(doc(db,"massgrave", tkey), {
    dayKey: tkey,
    totalVolume: increment(volume),
    totalSets: increment(1),
    updatedAt: serverTimestamp()
  }).catch(async () => {
    // doc may not exist
    await setDoc(doc(db,"massgrave", tkey), {
      dayKey: tkey,
      totalVolume: volume,
      totalSets: 1,
      updatedAt: serverTimestamp()
    });
  });

  // refresh UI
  renderUserCard();
  el("stat-streak").innerText = String(streak);
  loadDailyMassgrave();
}

async function updatePersonalRecords(exercise, weight, reps, volume){
  // PR doc: prs/{uid}_{exerciseSlug}
  const slug = `${currentUser.uid}__${exercise}`.toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0, 120);
  const prRef = doc(db,"prs", slug);
  const snap = await getDoc(prRef);

  let updated = false;
  if (!snap.exists()){
    await setDoc(prRef, {
      uid: currentUser.uid,
      exercise,
      bestWeight: weight,
      bestRepsAtBestWeight: reps,
      bestVolumeEntry: volume,
      updatedAt: serverTimestamp()
    });
    updated = true;
  } else {
    const pr = snap.data();
    const bestWeight = Number(pr.bestWeight || 0);
    const bestVol = Number(pr.bestVolumeEntry || 0);

    const patch = {};
    if (weight > bestWeight){
      patch.bestWeight = weight;
      patch.bestRepsAtBestWeight = reps;
      updated = true;
    }
    if (volume > bestVol){
      patch.bestVolumeEntry = volume;
      updated = true;
    }
    if (updated){
      patch.updatedAt = serverTimestamp();
      await updateDoc(prRef, patch);
    }
  }

  if (updated){
    // increment prCount sometimes (simple approximation: count later)
    // We'll recompute PR count on panel load instead of trusting increments.
  }
}

/* Quick logs list (right column) */
function loadQuickLogs(){
  const qy = query(collection(db,"logs"), where("uid","==", currentUser.uid), orderBy("timestamp","desc"), limit(14));
  onSnapshot(qy, (snap) => {
    const list = el("prList");
    list.innerHTML = snap.docs.map(d => {
      const x = d.data();
      return `
        <div class="index-row">
          <span>${safe(x.exercise)} — <b>${x.weight}</b> x ${x.reps}</span>
          <button class="mini-btn danger" onclick="window.deleteLog('${d.id}')">X</button>
        </div>
      `;
    }).join("");

    el("stat-count").innerText = String(currentUserData.carvingCount || 0);
  });
}

window.deleteLog = async (logId) => {
  const ref = doc(db,"logs", logId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().uid !== currentUser.uid) return alert("DENIED");
  await deleteDoc(ref);
  alert("LOG_DELETED");
};

/* ---------------------------
   MASSGRAVE DAILY DISPLAY
---------------------------- */
function loadDailyMassgrave(){
  const ref = doc(db,"massgrave", todayKey());
  onSnapshot(ref, (snap) => {
    const vol = snap.exists() ? Number(snap.data().totalVolume || 0) : 0;
    el("massgrave-today").innerText = Math.round(vol).toLocaleString();
  });
}

/* ---------------------------
   SPLITS: library, activate, render today, swap exercises
---------------------------- */
function loadSplitLibrary(){
  const grid = el("split-library");
  grid.innerHTML = SPLIT_LIBRARY.map(s => `
    <div class="split-card" data-split="${s.id}">
      <div class="split-name">${safe(s.name)}</div>
      <div class="split-desc">${safe(s.desc)}</div>
      <div class="split-tags">${(s.pills||[]).map(p=>`<span class="pill">${safe(p)}</span>`).join("")}</div>
    </div>
  `).join("");

  grid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-split]");
    if (!card) return;
    selectedSplitId = card.getAttribute("data-split");
    [...grid.querySelectorAll("[data-split]")].forEach(x => x.classList.remove("active"));
    card.classList.add("active");
    renderActiveSplitCardPreview(selectedSplitId);
  });

  // preselect active split if exists
  const active = currentUserData.activeSplit?.splitId;
  if (active){
    selectedSplitId = active;
    const card = grid.querySelector(`[data-split="${CSS.escape(active)}"]`);
    if (card) card.classList.add("active");
    renderActiveSplitCardPreview(active);
  } else {
    // default
    selectedSplitId = SPLIT_LIBRARY[0].id;
    const card = grid.querySelector(`[data-split="${CSS.escape(selectedSplitId)}"]`);
    if (card) card.classList.add("active");
    renderActiveSplitCardPreview(selectedSplitId);
  }

  // auto start day initial
  window.setAutoStartDay();
}

window.setAutoStartDay = () => {
  // Map weekday to day index; for 5-day splits, weekday 1..5 -> 0..4
  const d = new Date();
  const weekday = d.getDay(); // 0 Sun .. 6 Sat

  // default: Monday => day1
  let idx = 0;
  if (weekday === 1) idx = 0;
  else if (weekday === 2) idx = 1;
  else if (weekday === 3) idx = 2;
  else if (weekday === 4) idx = 3;
  else if (weekday === 5) idx = 4;
  else idx = 0;

  el("start-day").value = String(idx);
};

function renderActiveSplitCardPreview(splitId){
  const box = el("active-split-card");
  const split = SPLIT_LIBRARY.find(s => s.id === splitId);
  if (!split){
    box.innerHTML = `<div class="small-label">NO_SPLIT_SELECTED</div>`;
    return;
  }

  box.innerHTML = `
    <div class="split-name">${safe(split.name)}</div>
    <div class="split-desc">${safe(split.desc)}</div>
    <div class="divider"></div>
    <div class="small-label">DAYS:</div>
    ${split.days.map((d,i)=>`<div class="index-row"><span>${safe(d.name)}</span><span class="pill">${safe(d.focus)}</span></div>`).join("")}
  `;
}

window.activateSelectedSplit = async () => {
  if (!selectedSplitId) return alert("SELECT_SPLIT_FIRST");
  const startIndex = Number(el("start-day").value || 0);

  await updateDoc(doc(db,"users", currentUser.uid), {
    activeSplit: { splitId: selectedSplitId, startIndex, activatedAt: serverTimestamp() }
  });

  currentUserData.activeSplit = { splitId: selectedSplitId, startIndex };
  alert("SPLIT_ACTIVATED");
  await loadActiveSplitAndRender();
};

async function loadActiveSplitAndRender(){
  const active = currentUserData.activeSplit;
  const box = el("active-split-card");

  if (!active){
    box.innerHTML = `<div class="small-label">NO_ACTIVE_SPLIT</div><div class="tiny-hint">Pick a split → choose start day → ACTIVATE.</div>`;
    el("today-plan").innerHTML = `<div class="small-label">NO_ACTIVE_SPLIT</div>`;
    el("pr-index").innerHTML = `<div class="small-label">NO_DATA</div>`;
    el("stat-prs").innerText = "0";
    return;
  }

  const split = SPLIT_LIBRARY.find(s => s.id === active.splitId);
  if (!split){
    box.innerHTML = `<div class="small-label">ACTIVE_SPLIT_MISSING</div>`;
    return;
  }

  // Calculate today's day index based on activation startIndex and weekday progression
  // Simple logic: for plans <= 5 days, map Mon–Fri into sequential days starting from chosen startIndex
  const weekday = new Date().getDay(); // 0..6
  const weekdayIndex = (weekday === 0) ? 6 : weekday - 1; // Mon=0..Sun=6
  const planLen = split.days.length;

  // Day offset within week using weekdayIndex; then rotate by startIndex
  const rotated = (weekdayIndex + active.startIndex) % planLen;
  const todayDay = split.days[rotated];

  // store per-user per-split swaps in userSplits/{uid}/splits/{splitId}
  const userSplitRef = doc(db, `userSplits/${currentUser.uid}/splits/${split.id}`);
  const userSplitSnap = await getDoc(userSplitRef);
  const swaps = userSplitSnap.exists() ? (userSplitSnap.data().swaps || {}) : {}; // { "DAY_1 // ...": ["ex1","ex2"...] }

  // render active card
  box.innerHTML = `
    <div class="split-name">${safe(split.name)} <span class="pill">ACTIVE</span></div>
    <div class="split-desc">${safe(split.desc)}</div>
    <div class="split-tags">${split.pills.map(p=>`<span class="pill">${safe(p)}</span>`).join("")}</div>
    <div class="divider"></div>
    <div class="small-label">TODAY:</div>
    <div class="index-row"><span>${safe(todayDay.name)}</span><span class="pill">${safe(todayDay.focus)}</span></div>
    <div class="tiny-hint">Change start day anytime by re-activating.</div>
  `;

  // render today logging terminal with dropdowns + swap ability
  const baseList = todayDay.exercises;
  const swappedList = swaps[todayDay.name] || baseList;

  el("today-plan").innerHTML = `
    <div class="today-item">
      <div class="today-title">
        <b>${safe(todayDay.name)}</b>
        <button class="mini-btn" onclick="window.saveTodaySwaps('${safe(todayDay.name)}')">SAVE_SWAPS</button>
      </div>

      ${swappedList.map((ex, idx) => {
        const exOptions = ALL_EXERCISES.map(opt => `
          <option value="${safe(opt)}" ${opt === ex ? "selected" : ""}>${safe(opt)}</option>
        `).join("");
        return `
          <div class="exercise-row">
            <div>
              <small>EX_${idx+1}</small>
              <select class="select" data-swap="${safe(todayDay.name)}" data-idx="${idx}">
                ${exOptions}
              </select>
            </div>
            <input type="number" class="w" placeholder="LBS" min="0" step="5">
            <input type="number" class="r" placeholder="REPS" min="0" step="1">
            <button class="mini-btn" onclick="window.logSplitLine(this)">LOG</button>
          </div>
        `;
      }).join("")}

      <div class="divider"></div>
      <button class="grave-btn" onclick="window.logAllSplitLines('${safe(todayDay.name)}')">LOG_ALL_ENTRIES</button>
    </div>
  `;

  // Load PR index panel
  loadPRIndex();
}

window.saveTodaySwaps = async (dayName) => {
  const selects = [...document.querySelectorAll(`select[data-swap="${CSS.escape(dayName)}"]`)];
  const list = selects.map(s => s.value);

  const active = currentUserData.activeSplit;
  if (!active) return;

  const userSplitRef = doc(db, `userSplits/${currentUser.uid}/splits/${active.splitId}`);
  const snap = await getDoc(userSplitRef);
  const swaps = snap.exists() ? (snap.data().swaps || {}) : {};
  swaps[dayName] = list;

  if (!snap.exists()){
    await setDoc(userSplitRef, { splitId: active.splitId, swaps, updatedAt: serverTimestamp() });
  } else {
    await updateDoc(userSplitRef, { swaps, updatedAt: serverTimestamp() });
  }
  alert("SWAPS_SAVED");
};

window.logSplitLine = async (btn) => {
  const row = btn.closest(".exercise-row");
  const sel = row.querySelector("select");
  const w = Number(row.querySelector(".w").value || 0);
  const r = Number(row.querySelector(".r").value || 0);

  if (!sel.value || !w || !r) return alert("MISSING_FIELDS");
  await submitLogEntry({ exercise: sel.value, weight:w, reps:r, source:"split" });

  row.querySelector(".w").value = "";
  row.querySelector(".r").value = "";
};

window.logAllSplitLines = async (dayName) => {
  const rows = [...el("today-plan").querySelectorAll(".exercise-row")];
  let any = false;

  for (const row of rows){
    const ex = row.querySelector("select").value;
    const w = Number(row.querySelector(".w").value || 0);
    const r = Number(row.querySelector(".r").value || 0);
    if (ex && w && r){
      any = true;
      await submitLogEntry({ exercise: ex, weight:w, reps:r, source:"split" });
      row.querySelector(".w").value = "";
      row.querySelector(".r").value = "";
    }
  }

  if (!any) alert("NO_FILLED_ENTRIES");
};

/* PR index panel */
function loadPRIndex(){
  const qy = query(collection(db,"prs"), where("uid","==", currentUser.uid), orderBy("updatedAt","desc"), limit(30));
  onSnapshot(qy, (snap) => {
    el("stat-prs").innerText = String(snap.size);

    el("pr-index").innerHTML = snap.docs.map(d => {
      const p = d.data();
      return `
        <div class="index-row">
          <span>${safe(p.exercise)} — <b>${p.bestWeight || 0}</b> (best) — vol <b>${p.bestVolumeEntry || 0}</b></span>
          <span class="pill">PR</span>
        </div>
      `;
    }).join("") || `<div class="small-label">NO_PRS_YET</div>`;
  });
}

/* ---------------------------
   PROFILE PAGES
---------------------------- */
window.openProfile = async (uid) => {
  window.showTab("profile-panel");
  const uref = doc(db,"users", uid);
  const usnap = await getDoc(uref);
  if (!usnap.exists()){
    el("profile-view").innerHTML = `<div class="small-label">ENTITY_NOT_FOUND</div>`;
    return;
  }
  const u = usnap.data();
  el("profile-view").innerHTML = `
    <div class="avatar profile-big-avatar" id="profile-av"></div>
    <div>
      <div class="split-name">${safe(u.username)}</div>
      <div class="split-desc">CARVINGS: <b>${u.carvingCount || 0}</b> • STREAK: <b>${u.streak || 0}</b></div>
      <div style="margin-top:8px;">
        <span class="grave-tag-pill">${safe((TAGS.find(t=>t.css===u.tagCss)||TAGS[0]).label)}</span>
        <span class="pill">${safe((RANKS.filter(r=> (u.carvingCount||0) >= r.min).pop()||RANKS[0]).name)}</span>
      </div>
      <div style="margin-top:10px; color:#ddd; font-size:12px;">
        TROPHIES: ${(u.trophies && u.trophies.length) ? safe(u.trophies.join("  ")) : "—"}
      </div>
    </div>
  `;
  renderAvatar(el("profile-av"), u.avatarId || "skull");

  // logs
  onSnapshot(query(collection(db,"logs"), where("uid","==", uid), orderBy("timestamp","desc"), limit(20)), (snap) => {
    el("profile-logs").innerHTML = snap.docs.map(d => {
      const x = d.data();
      return `<div class="index-row"><span>${safe(x.exercise)} — <b>${x.weight}</b> x ${x.reps}</span><span class="pill">${safe(x.dayKey || "")}</span></div>`;
    }).join("") || `<div class="small-label">NO_LOGS</div>`;
  });

  // posts
  onSnapshot(query(collection(db,"posts"), where("uid","==", uid), orderBy("timestamp","desc"), limit(10)), (snap) => {
    el("profile-posts").innerHTML = snap.docs.map(d => {
      const p = d.data();
      const mine = (uid === currentUser.uid);
      return `
        <div class="grave-box post">
          <div class="grave-header-sub">${safe(p.username)} <span style="float:right; font-size:10px;">${p.timestamp?.toDate ? p.timestamp.toDate().toLocaleString() : ""}</span></div>
          <div class="grave-body">
            <p style="color:#e9e9e9;">${safe(p.text)}</p>
            ${mine ? `<button class="mini-btn danger" onclick="window.deletePost('${d.id}')">DELETE</button>` : ""}
          </div>
        </div>
      `;
    }).join("") || `<div class="small-label">NO_POSTS</div>`;
  });
};

/* ---------------------------
   ADMIN (OPTIONAL)
   This is claims-based. If you don't set claims, admin box stays hidden.
---------------------------- */
async function checkAdminClaims(){
  try{
    const token = await auth.currentUser.getIdTokenResult(true);
    const isAdmin = !!token.claims.admin;
    if (isAdmin) el("admin-box").classList.remove("hidden");
  }catch(_){
    // ignore
  }
}

window.adminRebuildTemplates = async () => {
  alert("ADMIN: Templates are client-baked in this version. (Optional: migrate to Firestore templates.)");
};

window.adminNukeMyData = async () => {
  alert("ADMIN: Not implemented (danger). Keep your Firestore rules strict.");
};

/* ---------------------------
   Split Builder (basic stub)
   (Still “fully functional” app without it, but button exists)
---------------------------- */
window.openSplitBuilder = () => {
  alert("FORGE_SPLIT: coming next. (This build focuses on fully working built-in splits + swap/log system.)");
};
