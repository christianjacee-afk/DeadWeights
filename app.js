import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  storageBucket: "deadweights-365c6.firebasestorage.app",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence);

const PREMADE_PLANS = [
  { id: "5day", name: "IRON_CORPS (5-Day)", routine: { 1: ["Squat", "Bench", "Row", "OHP"], 2: ["Leg Press", "RDL", "Ham Curl", "Hip Thrust"], 3: ["Incline", "Lateral Raise", "Triceps"], 4: ["Deadlift", "Lunges", "Calves"], 5: ["Pullups", "Rows", "Curls"] }},
  { id: "3day", name: "REVENANT (3-Day)", routine: { 1: ["Squat", "Bench", "Row"], 2: ["Deadlift", "OHP", "Pullups"], 3: ["Leg Press", "Incline", "Curls"] }}
];

const AVATARS = ["💀", "⚙️", "🏋️", "☣️", "⛓️", "🛡️", "🔥", "🦾"];
let selectedAvatar = "💀";

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || !snap.data().username) {
      showSetup();
    } else {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("profileUsername").innerText = snap.data().username;
      document.getElementById("user-pfp-display").innerText = snap.data().pfp || "💀";
      initApp();
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

function showSetup() {
    document.getElementById("username-screen").style.display = "flex";
    const grid = document.getElementById("pfp-grid");
    grid.innerHTML = AVATARS.map(a => `<div class="pfp-opt" onclick="window.pickPFP('${a}', this)">${a}</div>`).join('');
}

window.pickPFP = (a, el) => {
    selectedAvatar = a;
    document.querySelectorAll('.pfp-opt').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
};

function initApp() {
  loadFeed(); renderVault(); loadMyLogs(); loadPRs(); updateActiveSession(); loadRequests(); loadFriends();
}

// AUTH
document.getElementById("loginBtn").onclick = async () => {
  try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } 
  catch(e) { document.getElementById("auth-msg").innerText = e.code; }
};
document.getElementById("signupBtn").onclick = async () => {
  try { await createUserWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } 
  catch(e) { document.getElementById("auth-msg").innerText = e.code; }
};
document.getElementById("saveUserBtn").onclick = async () => {
  const name = document.getElementById("usernameInput").value;
  if (name) {
    await setDoc(doc(db, "users", auth.currentUser.uid), { username: name, pfp: selectedAvatar, email: auth.currentUser.email }, { merge: true });
    location.reload();
  }
};
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());

// NAVIGATION
document.querySelectorAll(".nav-links a").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(link.getAttribute("data-show")).classList.remove("hidden");
  };
});

// NETWORK / FRIENDS
async function loadFriends() {
    onSnapshot(collection(db, "users", auth.currentUser.uid, "friends"), snap => {
        const list = document.getElementById("friends-list");
        list.innerHTML = "";
        snap.forEach(d => {
            list.innerHTML += `<div class="friend-row">${d.data().pfp || '👤'} ${d.data().username}</div>`;
        });
        loadFeed(); // Reload feed to show friends' posts
    });
}

window.sendRequest = async (toUid, toName) => {
    if (toUid === auth.currentUser.uid) return alert("YOU CANNOT ADD YOURSELF.");
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    await setDoc(doc(db, "users", toUid, "requests", auth.currentUser.uid), {
        fromName: userSnap.data().username,
        fromPfp: userSnap.data().pfp || "💀",
        timestamp: serverTimestamp()
    });
    alert("REQUEST_TRANSMITTED");
};

function loadRequests() {
    onSnapshot(collection(db, "users", auth.currentUser.uid, "requests"), snap => {
        const list = document.getElementById("request-list");
        const box = document.getElementById("req-box");
        list.innerHTML = "";
        if (snap.empty) return box.classList.add("hidden");
        box.classList.remove("hidden");
        snap.forEach(d => {
            const r = d.data();
            list.innerHTML += `<div class="req-row">${r.fromName} <button onclick="window.acceptReq('${d.id}', '${r.fromName}', '${r.fromPfp}')">ACCEPT</button></div>`;
        });
    });
}

window.acceptReq = async (id, name, pfp) => {
    await setDoc(doc(db, "users", auth.currentUser.uid, "friends", id), { username: name, pfp: pfp });
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "requests", id));
};

// FEED (Friends + Self Only)
async function loadFeed() {
    const friendSnap = await getDoc(collection(db, "users", auth.currentUser.uid, "friends"));
    let allowedUids = [auth.currentUser.uid];
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), snap => {
        const feed = document.getElementById("feed-content");
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const isOwner = p.uid === auth.currentUser.uid;
            feed.innerHTML += `
              <div class="grit-box post anim-fade">
                <div class="grit-header-sub">${p.username} 
                    ${!isOwner ? `<button onclick="window.sendRequest('${p.uid}', '${p.username}')" class="mini-btn">ADD</button>` : `<button onclick="window.deleteItem('posts', '${d.id}')" class="mini-btn del">X</button>`}
                </div>
                <div class="grit-body"><p>${p.text}</p></div>
              </div>`;
        });
    });
}

document.getElementById("postStatusBtn").onclick = async () => {
    const t = document.getElementById("statusText").value;
    const u = await getDoc(doc(db, "users", auth.currentUser.uid));
    if(t) {
        await addDoc(collection(db, "posts"), { uid: auth.currentUser.uid, username: u.data().username, text: t, timestamp: serverTimestamp() });
        document.getElementById("statusText").value = "";
    }
};

// LOGGING & PLAN INTEGRATION
async function updateActiveSession() {
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const plan = userSnap.data().activePlan;
    const ui = document.getElementById("active-session-ui");
    if (!plan) return;
    
    const day = new Date().getDay() || 7; // Sunday=7
    const exercises = plan.routine[day] || [];
    
    ui.innerHTML = `<h3>${plan.name} - DAY ${day}</h3>`;
    if (exercises.length === 0) ui.innerHTML += `<p>RECOVERY DAY</p>`;
    
    exercises.forEach(ex => {
        ui.innerHTML += `
          <div class="session-row">
            <span>${ex}</span>
            <input id="w-${ex}" type="number" placeholder="LBS">
            <input id="r-${ex}" type="number" placeholder="REPS">
            <button onclick="window.logSet('${ex}')">SAVE</button>
          </div>`;
    });
}

window.logSet = async (ex) => {
    const w = document.getElementById(`w-${ex}`).value;
    const r = document.getElementById(`r-${ex}`).value;
    if(w && r) {
        await addDoc(collection(db, "logs"), { uid: auth.currentUser.uid, exercise: ex, weight: w, reps: r, timestamp: serverTimestamp() });
        await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: ex, value: `${w} LBS` });
        alert(`${ex} RECORDED`);
    }
};

function renderVault() {
    const list = document.getElementById("premade-list");
    list.innerHTML = PREMADE_PLANS.map(p => `
        <div class="plan-card">
            <b>${p.name}</b>
            <button onclick="window.setPlan('${p.id}')" class="grit-btn">ACTIVATE</button>
        </div>`).join('');
}

window.setPlan = async (id) => {
    const p = PREMADE_PLANS.find(x => x.id === id);
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: p }, { merge: true });
    updateActiveSession();
    alert("PROTOCOL_INITIALIZED");
};

function loadMyLogs() {
    onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), orderBy("timestamp", "desc")), snap => {
        const list = document.getElementById("my-logs-list");
        list.innerHTML = "";
        snap.forEach(d => {
            list.innerHTML += `<div class="log-item">${d.data().exercise}: ${d.data().weight}lbs x ${d.data().reps}</div>`;
        });
    });
}

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
        const list = document.getElementById("prList"); list.innerHTML = "";
        snap.forEach(d => { list.innerHTML += `<p>>> ${d.data().lift}: ${d.data().value}</p>`; });
    });
}

window.deleteItem = async (col, id) => { if(confirm("CONFIRM_DELETE?")) await deleteDoc(doc(db, col, id)); };
