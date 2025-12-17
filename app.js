import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence);

const CARDS = [
    { id: "ghost", name: "GHOST_OPERATOR", css: "card-ghost" },
    { id: "hazard", name: "BIO_HAZARD", css: "card-hazard" },
    { id: "void", name: "VOID_WALKER", css: "card-void" },
    { id: "neon", name: "NEON_STREAK", css: "card-neon" }
];

const PREMADE_PLANS = [
  { id: "5day", name: "GRAVE_SPECIALIST", routine: { 1: ["Squat", "Bench", "Row"], 2: ["Leg Press", "RDL", "Ham Curl"], 3: ["Incline", "Lateral Raise", "Triceps"], 4: ["Deadlift", "Lunges", "Calves"], 5: ["Pullups", "Rows", "Curls"] }},
  { id: "3day", name: "REVENANT", routine: { 1: ["Squat", "Bench", "Row"], 2: ["Deadlift", "OHP", "Pullups"], 3: ["Leg Press", "Incline", "Curls"] }}
];

let selectedCard = "card-ghost";

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || !snap.data().username) {
      showSetup();
    } else {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("profileUsername").innerText = snap.data().username;
      document.getElementById("header-callsign").innerText = snap.data().username;
      document.getElementById("user-calling-card").className = `calling-card ${snap.data().card || 'card-ghost'}`;
      initApp();
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

function showSetup() {
    document.getElementById("username-screen").style.display = "flex";
    const picker = document.getElementById("card-picker");
    picker.innerHTML = CARDS.map(c => `<div class="card-opt ${c.css}" onclick="window.pickCard('${c.css}', this)">${c.name}</div>`).join('');
}

window.pickCard = (css, el) => {
    selectedCard = css;
    document.querySelectorAll('.card-opt').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
};

function initApp() {
  loadFeed(); renderVault(); loadPRs(); updateActiveSession(); loadRequests(); loadFriends();
}

// AUTH
document.getElementById("loginBtn").onclick = async () => {
  try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } 
  catch(e) { document.getElementById("auth-msg").innerText = "LOGIN_FAILED"; }
};
document.getElementById("signupBtn").onclick = async () => {
  try { await createUserWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } 
  catch(e) { document.getElementById("auth-msg").innerText = "SIGNUP_FAILED"; }
};
document.getElementById("saveUserBtn").onclick = async () => {
  const name = document.getElementById("usernameInput").value;
  if (name) {
    await setDoc(doc(db, "users", auth.currentUser.uid), { username: name, card: selectedCard, email: auth.currentUser.email }, { merge: true });
    location.reload();
  }
};
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());

// NETWORK
window.sendRequest = async (toUid, toName) => {
    if (toUid === auth.currentUser.uid) return;
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    await setDoc(doc(db, "users", toUid, "requests", auth.currentUser.uid), { fromName: userSnap.data().username, timestamp: serverTimestamp() });
    alert("REQUEST_SENT");
};

function loadRequests() {
    onSnapshot(collection(db, "users", auth.currentUser.uid, "requests"), snap => {
        const list = document.getElementById("request-list");
        const box = document.getElementById("req-box");
        list.innerHTML = "";
        if (snap.empty) return box.classList.add("hidden");
        box.classList.remove("hidden");
        snap.forEach(d => {
            list.innerHTML += `<div class="req-row">${d.data().fromName} <button onclick="window.acceptReq('${d.id}', '${d.data().fromName}')">ACCEPT</button></div>`;
        });
    });
}

window.acceptReq = async (id, name) => {
    await setDoc(doc(db, "users", auth.currentUser.uid, "friends", id), { username: name });
    await setDoc(doc(db, "users", id, "friends", auth.currentUser.uid), { username: document.getElementById("header-callsign").innerText });
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "requests", id));
};

async function loadFriends() {
    onSnapshot(collection(db, "users", auth.currentUser.uid, "friends"), snap => {
        const list = document.getElementById("friends-list");
        list.innerHTML = snap.empty ? "STAY_ALONE" : "";
        snap.forEach(d => { list.innerHTML += `<div class="friend-row">> ${d.data().username}</div>`; });
    });
}

// FEED
document.getElementById("postStatusBtn").onclick = async () => {
    const t = document.getElementById("statusText").value;
    if(t) {
        await addDoc(collection(db, "posts"), { 
            uid: auth.currentUser.uid, 
            username: document.getElementById("header-callsign").innerText, 
            text: t, 
            timestamp: serverTimestamp() 
        });
        document.getElementById("statusText").value = "";
    }
};

function loadFeed() {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), snap => {
        const feed = document.getElementById("feed-content");
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const isOwner = p.uid === auth.currentUser.uid;
            feed.innerHTML += `
              <div class="terminal-box post">
                <div class="terminal-header-sub">${p.username} 
                    ${!isOwner ? `<button onclick="window.sendRequest('${p.uid}', '${p.username}')" class="mini-btn">ADD</button>` : `<button onclick="window.deleteItem('posts', '${d.id}')" class="mini-btn">X</button>`}
                </div>
                <div class="terminal-body"><p>${p.text}</p></div>
              </div>`;
        });
    });
}

// LOGGING STATION
async function updateActiveSession() {
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const plan = userSnap.data().activePlan;
    const ui = document.getElementById("active-session-ui");
    
    if (!plan) {
        ui.innerHTML = `<p>NO_PLAN_SELECTED</p><button onclick="window.showVault()" class="terminal-btn">ACCESS_VAULT</button>
        <div class="divider"></div>
        <p>MANUAL_LOG:</p>
        <input id="manual-ex" placeholder="EXERCISE">
        <input id="manual-w" type="number" placeholder="LBS">
        <input id="manual-r" type="number" placeholder="REPS">
        <button onclick="window.logSet('manual')" class="terminal-btn">LOG_SINGLE</button>`;
        return;
    }
    
    const day = new Date().getDay();
    const exercises = plan.routine[day] || ["RECOVERY_DAY"];
    ui.innerHTML = `<h3>${plan.name} // DAY_${day}</h3>`;
    exercises.forEach(ex => {
        ui.innerHTML += `
          <div class="log-station-row">
            <label>${ex}</label>
            <div class="row">
                <input id="w-${ex}" type="number" placeholder="LBS">
                <input id="r-${ex}" type="number" placeholder="REPS">
                <button onclick="window.logSet('${ex}')">SAVE</button>
            </div>
          </div>`;
    });
}

window.logSet = async (ex) => {
    let exercise = ex;
    let w, r;
    if(ex === 'manual') {
        exercise = document.getElementById("manual-ex").value;
        w = document.getElementById("manual-w").value;
        r = document.getElementById("manual-r").value;
    } else {
        w = document.getElementById(`w-${ex}`).value;
        r = document.getElementById(`r-${ex}`).value;
    }
    if(w && r) {
        await addDoc(collection(db, "logs"), { uid: auth.currentUser.uid, exercise, weight: w, reps: r, timestamp: serverTimestamp() });
        await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: exercise, value: `${w} LBS` });
        alert("DATA_SAVED");
    }
};

window.showVault = () => document.getElementById("vault-modal").classList.remove("hidden");
window.closeVault = () => document.getElementById("vault-modal").classList.add("hidden");

function renderVault() {
    const list = document.getElementById("premade-list");
    list.innerHTML = PREMADE_PLANS.map(p => `
        <div class="vault-card">
            <b>${p.name}</b>
            <button onclick="window.setPlan('${p.id}')" class="terminal-btn">ACTIVATE</button>
        </div>`).join('');
}

window.setPlan = async (id) => {
    const p = PREMADE_PLANS.find(x => x.id === id);
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: p }, { merge: true });
    updateActiveSession();
    window.closeVault();
};

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
        const list = document.getElementById("prList"); list.innerHTML = "";
        snap.forEach(d => { list.innerHTML += `<div class="pr-row">>> ${d.data().lift}: ${d.data().value}</div>`; });
        document.getElementById("stat-count").innerText = snap.size;
    });
}

window.deleteItem = async (col, id) => { if(confirm("ERASE_DATA?")) await deleteDoc(doc(db, col, id)); };
