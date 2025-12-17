import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, serverTimestamp, limit, getDocs, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- PRELOADED DATA ---
const EXERCISES = {
    Push: ["Bench Press", "Incline DB Press", "Overhead Press", "Lateral Raises", "Tricep Pushdown", "Dips"],
    Pull: ["Deadlifts", "Pull Ups", "Barbell Rows", "Lat Pulldown", "Face Pulls", "Bicep Curls"],
    Legs: ["Back Squats", "Leg Press", "RDLs", "Leg Extensions", "Calf Raises", "Lunges"]
};

const RANKS = [{min:0, name:"NEWBORN"}, {min:10, name:"STALKER"}, {min:50, name:"GRAVE_LORD"}, {min:100, name:"IMMORTAL"}];
const TAGS = [{id:"rust", css:"tag-rust"}, {id:"crt", css:"tag-crt"}, {id:"blood", css:"tag-blood"}, {id:"void", css:"tag-void"}];

let currentUserData = null;

// --- 1. CORE AUTH & INIT ---
onAuthStateChanged(auth, async user => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            currentUserData = snap.data();
            document.getElementById("app").classList.remove("hidden");
            document.getElementById("auth-screen").classList.add("hidden");
            initApp();
        } else { window.showRegistration(); }
    } else {
        document.getElementById("auth-screen").classList.remove("hidden");
        document.getElementById("app").classList.add("hidden");
    }
});

function initApp() {
    document.getElementById("header-callsign").innerText = currentUserData.username;
    document.getElementById("profileUsername").innerText = currentUserData.username;
    document.getElementById("user-grave-tag").className = `grave-tag ${currentUserData.tag || 'tag-rust'}`;
    
    const rank = RANKS.filter(r => (currentUserData.carvingCount || 0) >= r.min).pop();
    document.getElementById("user-rank").innerText = rank.name;

    window.updateExercises();
    loadFeed();
    loadLeaderboard();
    loadPRs();
    loadFriends();
    
    const sPicker = document.getElementById("settings-tag-picker");
    if(sPicker) sPicker.innerHTML = TAGS.map(t => `<div class="tag-opt ${t.css}" onclick="window.pickTag('${t.css}', this)"></div>`).join('');
}

// --- 2. SOCIAL & FRIENDS ---
const loadFriends = () => {
    const list = document.getElementById("friends-list");
    if(!list || !currentUserData.friends) return;
    list.innerHTML = "";
    currentUserData.friends.forEach(async fId => {
        const fSnap = await getDoc(doc(db, "users", fId));
        if(fSnap.exists()) {
            list.innerHTML += `<div class="index-row"><span>${fSnap.data().username}</span><button class="mini-btn danger" onclick="window.removeFriend('${fId}')">SEVER</button></div>`;
        }
    });
};

window.addFriend = async (targetUid) => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(targetUid) });
    alert("CONNECTION_ESTABLISHED");
    location.reload();
};

window.removeFriend = async (targetUid) => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayRemove(targetUid) });
    location.reload();
};

// --- 3. FEED & COMMENTS ---
const loadFeed = () => {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)), snap => {
        const feed = document.getElementById("feed-content");
        feed.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            feed.innerHTML += `
              <div class="grave-box post">
                <div class="grave-header-sub">${p.username} <span style="float:right; font-size:8px;">${p.timestamp?.toDate().toLocaleDateString() || ''}</span></div>
                <div class="grave-body"><p>${p.text}</p></div>
                <div class="comment-section" id="comments-${d.id}"></div>
                <div class="comment-input-wrap">
                    <input id="in-${d.id}" placeholder="REPLY...">
                    <button class="mini-btn" onclick="window.postComment('${d.id}')">SEND</button>
                </div>
              </div>`;
            loadComments(d.id);
        });
    });
};

const loadComments = (postId) => {
    onSnapshot(query(collection(db, `posts/${postId}/comments`), orderBy("timestamp", "asc")), snap => {
        const cBox = document.getElementById(`comments-${postId}`);
        if(!cBox) return;
        cBox.innerHTML = "";
        snap.forEach(c => {
            cBox.innerHTML += `<div class="comment"><b>${c.data().username}:</b> ${c.data().text}</div>`;
        });
    });
};

window.postComment = async (postId) => {
    const text = document.getElementById(`in-${postId}`).value;
    if(!text) return;
    await addDoc(collection(db, `posts/${postId}/comments`), {
        username: currentUserData.username, text, timestamp: serverTimestamp()
    });
    document.getElementById(`in-${postId}`).value = "";
};

// --- 4. WORKOUT LOGGING ---
window.updateExercises = () => {
    const cat = document.getElementById("log-category").value;
    const exSelect = document.getElementById("log-ex");
    exSelect.innerHTML = EXERCISES[cat].map(e => `<option value="${e}">${e}</option>`).join('');
};

window.submitLog = async () => {
    const ex = document.getElementById("log-ex").value;
    const w = document.getElementById("log-w").value;
    const r = document.getElementById("log-r").value;
    if(w && r) {
        await addDoc(collection(db, "logs"), { uid: auth.currentUser.uid, exercise: ex, weight: w, reps: r, timestamp: serverTimestamp() });
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { carvingCount: (currentUserData.carvingCount || 0) + 1 });
    }
};

// --- 5. SETTINGS ---
window.updateUsername = async () => {
    const newName = document.getElementById("new-username").value;
    if(newName) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { username: newName });
        alert("IDENTITY_UPDATED");
        location.reload();
    }
};

window.updateGraveTag = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { tag: window.selectedTag });
    alert("VISUALS_RECONFIGURED");
    location.reload();
};

// Helper loaders
const loadLeaderboard = () => {
    onSnapshot(query(collection(db, "users"), orderBy("carvingCount", "desc"), limit(5)), snap => {
        const lb = document.getElementById("leaderboard");
        lb.innerHTML = snap.docs.map((d, i) => `<div class="lb-row">#${i+1} ${d.data().username} [${d.data().carvingCount || 0}]</div>`).join('');
    });
};

const loadPRs = () => {
    onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), orderBy("timestamp", "desc"), limit(10)), snap => {
        document.getElementById("prList").innerHTML = snap.docs.map(d => `<div class="index-row"><span>${d.data().exercise} ${d.data().weight}LBS</span><button onclick="window.deleteItem('logs','${d.id}')" class="mini-btn danger">X</button></div>`).join('');
        document.getElementById("stat-count").innerText = snap.size;
    });
};

// UI Toggling
window.showTab = (id) => {
    ["feed-panel", "friends-panel", "settings-panel"].forEach(p => document.getElementById(p).classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
};

window.showAuth = () => { document.getElementById("registration-screen").classList.add("hidden"); document.getElementById("auth-screen").classList.remove("hidden"); };
window.showRegistration = () => { document.getElementById("auth-screen").classList.add("hidden"); document.getElementById("registration-screen").classList.remove("hidden"); };

// Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("postStatusBtn").onclick = async () => {
        const text = document.getElementById("statusText").value;
        if(text) await addDoc(collection(db, "posts"), { uid: auth.currentUser.uid, username: currentUserData.username, text, timestamp: serverTimestamp() });
        document.getElementById("statusText").value = "";
    };
    document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());
    document.getElementById("loginBtn").onclick = () => signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
});
