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

const TAGS = [
    { id: "rust", css: "tag-rust" },
    { id: "crt", css: "tag-crt" },
    { id: "blood", css: "tag-blood" }
];

let selectedTag = "tag-rust";

// AUTH STATE
onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("registration-screen").classList.add("hidden");
      initApp(snap.data());
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
  }
});

function initApp(userData) {
  document.getElementById("header-callsign").innerText = userData.username;
  document.getElementById("profileUsername").innerText = userData.username;
  document.getElementById("user-grave-tag").className = `grave-tag ${userData.tag || 'tag-rust'}`;
  if(userData.role === 'admin') document.getElementById("admin-panel").classList.remove("hidden");
  
  loadFeed(); loadLeaderboard(); loadPRs(); updateLoggingUI();
}

// REGISTRATION FLOW
document.getElementById("showRegBtn").onclick = () => {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("registration-screen").classList.remove("hidden");
    const picker = document.getElementById("initial-tag-picker");
    picker.innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" onclick="window.pickTag('${t.css}', this)"></div>`).join('');
};

document.getElementById("nextStepBtn").onclick = () => {
    const p1 = document.getElementById("reg-pass").value;
    const p2 = document.getElementById("reg-confirm").value;
    if(p1 === p2 && p1.length > 5) {
        document.getElementById("reg-step-1").classList.add("hidden");
        document.getElementById("reg-step-2").classList.remove("hidden");
    } else { alert("PASSCODES_DO_NOT_MATCH_OR_TOO_SHORT"); }
};

window.pickTag = (css, el) => {
    selectedTag = css;
    document.querySelectorAll('.tag-opt').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
};

document.getElementById("finalizeRegBtn").onclick = async () => {
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-pass").value;
    const user = document.getElementById("reg-username").value;
    if(!user) return;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", res.user.uid), {
            username: user, tag: selectedTag, role: 'user', carvingCount: 0, timestamp: serverTimestamp()
        });
    } catch(e) { alert(e.code); }
};

// LOGGING SYSTEM
function updateLoggingUI() {
    const ui = document.getElementById("logging-ui");
    ui.innerHTML = `
        <div class="log-form">
            <input id="log-ex" placeholder="EXERCISE_NAME">
            <div class="row">
                <input id="log-w" type="number" placeholder="LBS">
                <input id="log-r" type="number" placeholder="REPS">
            </div>
            <button onclick="window.submitLog()" class="grave-btn">RECORD_CARVING</button>
        </div>
    `;
}

window.submitLog = async () => {
    const ex = document.getElementById("log-ex").value;
    const w = document.getElementById("log-w").value;
    const r = document.getElementById("log-r").value;
    if(ex && w && r) {
        await addDoc(collection(db, "logs"), {
            uid: auth.currentUser.uid,
            username: document.getElementById("header-callsign").innerText,
            exercise: ex, weight: w, reps: r, timestamp: serverTimestamp()
        });
        // Update user count
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        await setDoc(userRef, { carvingCount: (snap.data().carvingCount || 0) + 1 }, { merge: true });
        alert("CARVING_SAVED");
        document.getElementById("log-ex").value = "";
    }
};

// FEED & LEADERBOARD
function loadFeed() {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)), snap => {
        const feed = document.getElementById("feed-content");
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            feed.innerHTML += `
              <div class="grave-box post">
                <div class="grave-header-sub">${p.username} 
                    ${p.uid === auth.currentUser.uid ? `<button onclick="window.deleteItem('posts', '${d.id}')" class="mini-btn">X</button>` : ''}
                </div>
                <div class="grave-body"><p>${p.text}</p></div>
              </div>`;
        });
    });
}

function loadLeaderboard() {
    onSnapshot(query(collection(db, "users"), orderBy("carvingCount", "desc"), limit(5)), snap => {
        const lb = document.getElementById("leaderboard");
        lb.innerHTML = "";
        snap.forEach((d, i) => {
            lb.innerHTML += `<div class="lb-row">#${i+1} ${d.data().username} - [${d.data().carvingCount || 0}]</div>`;
        });
    });
}

// UI NAVIGATION
window.showTab = (tabId) => {
    document.getElementById("feed-panel").classList.add("hidden");
    document.getElementById("settings-panel").classList.add("hidden");
    document.getElementById(tabId).classList.remove("hidden");
};

// HELPERS
document.getElementById("loginBtn").onclick = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); }
    catch(e) { document.getElementById("auth-msg").innerText = "FAILURE_TO_ARISE"; }
};
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());
window.deleteItem = async (col, id) => { if(confirm("ERASE?")) await deleteDoc(doc(db, col, id)); };
