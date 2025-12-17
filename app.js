import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const RANKS = [
    { min: 0, name: "NEWBORN" },
    { min: 10, name: "STALKER" },
    { min: 50, name: "GRAVE_LORD" },
    { min: 100, name: "IMMORTAL" }
];

const TAGS = [{ id: "rust", css: "tag-rust" }, { id: "crt", css: "tag-crt" }, { id: "blood", css: "tag-blood" }];
let selectedTag = "tag-rust";

// --- CORE AUTH LOGIC ---
onAuthStateChanged(auth, async user => {
  const appEl = document.getElementById("app");
  const authEl = document.getElementById("auth-screen");
  const regEl = document.getElementById("registration-screen");

  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      appEl.classList.remove("hidden");
      authEl.classList.add("hidden");
      regEl.classList.add("hidden");
      initApp(snap.data());
    } else {
      // User exists in Auth but not in Firestore (incomplete reg)
      showRegistration();
    }
  } else {
    authEl.classList.remove("hidden");
    appEl.classList.add("hidden");
  }
});

function initApp(userData) {
  const callsignEl = document.getElementById("header-callsign");
  const profileNameEl = document.getElementById("profileUsername");
  const tagEl = document.getElementById("user-grave-tag");
  const rankEl = document.getElementById("user-rank");

  if(callsignEl) callsignEl.innerText = userData.username;
  if(profileNameEl) profileNameEl.innerText = userData.username;
  if(tagEl) tagEl.className = `grave-tag ${userData.tag || 'tag-rust'}`;
  
  // Calculate Rank
  const count = userData.carvingCount || 0;
  const rank = RANKS.filter(r => count >= r.min).pop();
  if(rankEl) rankEl.innerText = rank.name;

  if(userData.role === 'admin') document.getElementById("admin-panel")?.classList.remove("hidden");
  
  loadFeed(); loadLeaderboard(); loadPRs(); updateLoggingUI();
}

// --- REGISTRATION & LOGIN HANDLERS ---
const showRegistration = () => {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("registration-screen").classList.remove("hidden");
    const picker = document.getElementById("initial-tag-picker");
    if(picker) {
        picker.innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" onclick="window.pickTag('${t.css}', this)"></div>`).join('');
    }
};

// Globalize functions for HTML onclicks
window.showAuth = () => {
    document.getElementById("registration-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
};

window.pickTag = (css, el) => {
    selectedTag = css;
    document.querySelectorAll('.tag-opt').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
};

// Attach Listeners safely
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("showRegBtn").onclick = showRegistration;
    
    document.getElementById("nextStepBtn").onclick = () => {
        const p1 = document.getElementById("reg-pass").value;
        const p2 = document.getElementById("reg-confirm").value;
        if(p1 === p2 && p1.length > 5) {
            document.getElementById("reg-step-1").classList.add("hidden");
            document.getElementById("reg-step-2").classList.remove("hidden");
        } else { alert("PASSCODES_MUST_MATCH_AND_BE_6+_CHARS"); }
    };

    document.getElementById("finalizeRegBtn").onclick = async () => {
        const email = document.getElementById("reg-email").value;
        const pass = document.getElementById("reg-pass").value;
        const user = document.getElementById("reg-username").value;
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                username: user, tag: selectedTag, role: 'user', carvingCount: 0, timestamp: serverTimestamp()
            });
        } catch(e) { alert(e.message); }
    };

    document.getElementById("loginBtn").onclick = async () => {
        const e = document.getElementById("email").value;
        const p = document.getElementById("password").value;
        try { await signInWithEmailAndPassword(auth, e, p); }
        catch(err) { document.getElementById("auth-msg").innerText = "RESURRECTION_FAILED"; }
    };

    document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());
    
    document.getElementById("postStatusBtn").onclick = async () => {
        const t = document.getElementById("statusText").value;
        if(t) {
            await addDoc(collection(db, "posts"), { 
                uid: auth.currentUser.uid, 
                username: document.getElementById("header-callsign").innerText, 
                text: t, timestamp: serverTimestamp() 
            });
            document.getElementById("statusText").value = "";
        }
    };
});

// --- LOGGING SYSTEM ---
function updateLoggingUI() {
    const ui = document.getElementById("logging-ui");
    if(!ui) return;
    ui.innerHTML = `
        <div class="log-form">
            <input id="log-ex" placeholder="EXERCISE_NAME">
            <div class="row" style="display:flex; gap:10px;">
                <input id="log-w" type="number" placeholder="LBS">
                <input id="log-r" type="number" placeholder="REPS">
            </div>
            <button id="submitLogBtn" class="grave-btn">RECORD_CARVING</button>
        </div>
    `;
    document.getElementById("submitLogBtn").onclick = window.submitLog;
}

window.submitLog = async () => {
    const ex = document.getElementById("log-ex").value;
    const w = document.getElementById("log-w").value;
    const r = document.getElementById("log-r").value;
    if(ex && w && r) {
        await addDoc(collection(db, "logs"), {
            uid: auth.currentUser.uid, exercise: ex, weight: w, reps: r, timestamp: serverTimestamp()
        });
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        const newCount = (snap.data().carvingCount || 0) + 1;
        await setDoc(userRef, { carvingCount: newCount }, { merge: true });
        alert("CARVING_SAVED");
        document.getElementById("log-ex").value = "";
        document.getElementById("log-w").value = "";
        document.getElementById("log-r").value = "";
    }
};

// --- FEED & DATA ---
function loadFeed() {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)), snap => {
        const feed = document.getElementById("feed-content");
        if(!feed) return;
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            feed.innerHTML += `
              <div class="grave-box post">
                <div class="grave-header-sub" style="font-size:10px; color:#444; padding:5px; border-bottom:1px solid #111;">
                    ${p.username} ${p.uid === auth.currentUser.uid ? `<button onclick="window.deleteItem('posts', '${d.id}')" class="mini-btn" style="float:right">X</button>` : ''}
                </div>
                <div class="grave-body" style="padding:10px;"><p style="margin:0">${p.text}</p></div>
              </div>`;
        });
    });
}

function loadLeaderboard() {
    onSnapshot(query(collection(db, "users"), orderBy("carvingCount", "desc"), limit(5)), snap => {
        const lb = document.getElementById("leaderboard");
        if(!lb) return;
        lb.innerHTML = "";
        snap.forEach((d, i) => {
            lb.innerHTML += `<div class="lb-row" style="font-size:11px; padding:5px; border-bottom:1px solid #111;">
                #${i+1} ${d.data().username} — [${d.data().carvingCount || 0}]
            </div>`;
        });
    });
}

function loadPRs() {
    onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), limit(10)), snap => {
        const list = document.getElementById("prList");
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(d => {
            list.innerHTML += `<div style="font-size:11px; margin-bottom:5px;">>> ${d.data().exercise}: ${d.data().weight} LBS</div>`;
        });
        document.getElementById("stat-count").innerText = snap.size;
    });
}

// --- UI TABS ---
window.showTab = (tabId) => {
    document.getElementById("feed-panel").classList.add("hidden");
    document.getElementById("settings-panel").classList.add("hidden");
    document.getElementById(tabId).classList.remove("hidden");
};

window.deleteItem = async (col, id) => { if(confirm("ERASE?")) await deleteDoc(doc(db, col, id)); };
