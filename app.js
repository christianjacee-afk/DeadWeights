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

const TAGS = [
    { id: "rust", css: "tag-rust", label: "OXIDIZED" },
    { id: "crt", css: "tag-crt", label: "SYSTEM_ERR" },
    { id: "blood", css: "tag-blood", label: "HAEMORRHAGE" },
    { id: "void", css: "tag-void", label: "VACUUM" }
];
let selectedTag = "tag-rust";
let currentUserRole = "user";

// --- 1. DATA LOADING ---

const loadFeed = () => {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25)), snap => {
        const feed = document.getElementById("feed-content");
        if(!feed) return;
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const isAdmin = currentUserRole === "admin";
            const isOwner = p.uid === auth.currentUser?.uid;
            feed.innerHTML += `
              <div class="grave-box post">
                <div class="grave-header-sub">
                    ${p.username} 
                    ${(isOwner || isAdmin) ? `<button onclick="window.deleteItem('posts', '${d.id}')" class="mini-btn danger" style="float:right">ERASE</button>` : ''}
                </div>
                <div class="grave-body"><p>${p.text}</p></div>
              </div>`;
        });
    });
};

const loadLeaderboard = () => {
    onSnapshot(query(collection(db, "users"), orderBy("carvingCount", "desc"), limit(5)), snap => {
        const lb = document.getElementById("leaderboard");
        if(!lb) return;
        lb.innerHTML = "";
        snap.forEach((d, i) => {
            lb.innerHTML += `<div class="lb-row">#${i+1} ${d.data().username} — [${d.data().carvingCount || 0}]</div>`;
        });
    });
};

const loadPRs = () => {
    onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), orderBy("timestamp", "desc"), limit(30)), snap => {
        const list = document.getElementById("prList");
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(d => {
            const data = d.data();
            list.innerHTML += `
            <div class="index-row">
                <span>${data.exercise}: ${data.weight}LBS</span>
                <button onclick="window.deleteLog('${d.id}')" class="mini-btn">X</button>
            </div>`;
        });
        document.getElementById("stat-count").innerText = snap.size;
    });
};

// --- 2. CORE LOGIC ---

function initApp(userData) {
  currentUserRole = userData.role || "user";
  document.getElementById("header-callsign").innerText = userData.username;
  document.getElementById("profileUsername").innerText = userData.username;
  document.getElementById("user-grave-tag").className = `grave-tag ${userData.tag || 'tag-rust'}`;
  
  const rank = RANKS.filter(r => (userData.carvingCount || 0) >= r.min).pop();
  document.getElementById("user-rank").innerText = rank ? rank.name : "NEWBORN";

  if(userData.role === 'admin') document.getElementById("admin-panel").classList.remove("hidden");
  
  // Load settings tag picker
  const sPicker = document.getElementById("settings-tag-picker");
  if(sPicker) sPicker.innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" onclick="window.pickTag('${t.css}', this)"></div>`).join('');

  loadFeed(); loadLeaderboard(); loadPRs(); updateLoggingUI();
}

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("auth-screen").classList.add("hidden");
      initApp(snap.data());
    } else { window.showRegistration(); }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

// --- 3. WINDOW FUNCTIONS ---

window.showTab = (tabId) => {
    document.getElementById("feed-panel").classList.add("hidden");
    document.getElementById("settings-panel").classList.add("hidden");
    document.getElementById(tabId).classList.remove("hidden");
};

window.pickTag = (css, el) => {
    selectedTag = css;
    document.querySelectorAll('.tag-opt').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
};

window.updateGraveTag = async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), { tag: selectedTag }, { merge: true });
    document.getElementById("user-grave-tag").className = `grave-tag ${selectedTag}`;
    alert("TAG_RECONFIGURED");
};

window.submitLog = async () => {
    const ex = document.getElementById("log-ex").value;
    const w = document.getElementById("log-w").value;
    const r = document.getElementById("log-r").value;
    if(ex && w && r) {
        await addDoc(collection(db, "logs"), { uid: auth.currentUser.uid, exercise: ex, weight: w, reps: r, timestamp: serverTimestamp() });
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        await setDoc(userRef, { carvingCount: (snap.data().carvingCount || 0) + 1 }, { merge: true });
        document.getElementById("log-ex").value = "";
    }
};

window.deleteLog = async (id) => {
    if(confirm("PURGE_ENTRY?")) {
        await deleteDoc(doc(db, "logs", id));
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        await setDoc(userRef, { carvingCount: Math.max(0, (snap.data().carvingCount || 1) - 1) }, { merge: true });
    }
};

window.deleteItem = async (col, id) => { if(confirm("ERASE?")) await deleteDoc(doc(db, col, id)); };

function updateLoggingUI() {
    document.getElementById("logging-ui").innerHTML = `
        <input id="log-ex" placeholder="EXERCISE">
        <div style="display:flex; gap:10px;">
            <input id="log-w" type="number" placeholder="LBS">
            <input id="log-r" type="number" placeholder="REPS">
        </div>
        <button id="sLog" class="grave-btn">LOG_CARVING</button>`;
    document.getElementById("sLog").onclick = window.submitLog;
}

// --- 4. AUTH HANDLERS ---
window.showRegistration = () => {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("registration-screen").classList.remove("hidden");
    document.getElementById("initial-tag-picker").innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" onclick="window.pickTag('${t.css}', this)"></div>`).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("loginBtn").onclick = async () => {
        try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); }
        catch(e) { alert("FAIL_TO_ARISE"); }
    };
    document.getElementById("showRegBtn").onclick = window.showRegistration;
    document.getElementById("nextStepBtn").onclick = () => {
        if(document.getElementById("reg-pass").value === document.getElementById("reg-confirm").value) {
            document.getElementById("reg-step-1").classList.add("hidden");
            document.getElementById("reg-step-2").classList.remove("hidden");
        }
    };
    document.getElementById("finalizeRegBtn").onclick = async () => {
        const res = await createUserWithEmailAndPassword(auth, document.getElementById("reg-email").value, document.getElementById("reg-pass").value);
        await setDoc(doc(db, "users", res.user.uid), { username: document.getElementById("reg-username").value, tag: selectedTag, role: 'user', carvingCount: 0 });
    };
    document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());
    document.getElementById("postStatusBtn").onclick = async () => {
        const text = document.getElementById("statusText").value;
        if(text) await addDoc(collection(db, "posts"), { uid: auth.currentUser.uid, username: document.getElementById("header-callsign").innerText, text, timestamp: serverTimestamp() });
        document.getElementById("statusText").value = "";
    };
});
