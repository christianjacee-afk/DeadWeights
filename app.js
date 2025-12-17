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

const EXERCISE_INDEX = [
    "Bench Press", "Incline Bench", "Decline Bench", "Dumbbell Flys", "Pushups", "Dips",
    "Back Squat", "Front Squat", "Hack Squat", "Leg Press", "Leg Extensions", "Leg Curls",
    "Deadlift", "Romanian Deadlift", "Sumo Deadlift", "Good Mornings", "Hip Thrusts",
    "Overhead Press", "Lateral Raises", "Front Raises", "Face Pulls", "Shrugs",
    "Pull Ups", "Lat Pulldowns", "Seated Rows", "Bent Over Rows", "T-Bar Rows",
    "Bicep Curls", "Hammer Curls", "Preacher Curls", "Tricep Pushdowns", "Skull Crushers",
    "Plank", "Leg Raises", "Cable Crunches", "CUSTOM"
];

const PREMADE_PLANS = [
  { id: "5day", name: "GRAVE_SPECIALIST (5-Day)", routine: { 1: "Mon: Full Body Compound", 2: "Tue: Lower A (Quads/Hams)", 3: "Wed: Upper Push", 4: "Thu: Lower B (Deadlift/Glutes)", 5: "Fri: Upper Pull" }},
  { id: "3day", name: "REVENANT (3-Day)", routine: { 1: "A: Squat/Bench/Row", 2: "B: DL/OHP/Pullups", 3: "C: Leg Press/Incline/Curls" }},
  { id: "phul", name: "POWER_HYPER (4-Day)", routine: { 1: "Upper Power", 2: "Lower Power", 3: "Upper Hyper", 4: "Lower Hyper" }}
];

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || !snap.data().username) {
      document.getElementById("username-screen").style.display = "flex";
    } else {
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("profileUsername").innerText = snap.data().username;
      initApp();
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

function initApp() {
  populateExercises(); loadFeed(); renderVault(); loadMyLogs(); loadPRs(); updateLogContext();
}

function populateExercises() {
    const sel = document.getElementById("exerciseSelect");
    sel.innerHTML = EXERCISE_INDEX.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

// LOGIN / SIGNUP
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
    await setDoc(doc(db, "users", auth.currentUser.uid), { username: name, email: auth.currentUser.email }, { merge: true });
    location.reload();
  }
};
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.reload());

// NAVIGATION
document.querySelectorAll(".nav-links a").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    const target = link.getAttribute("data-show");
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  };
});

// BULLETINS
document.getElementById("postStatusBtn").onclick = async () => {
  const text = document.getElementById("statusText").value;
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (text) {
    await addDoc(collection(db, "posts"), {
      uid: auth.currentUser.uid,
      username: userSnap.data().username,
      text,
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
      const post = d.data();
      const isOwner = post.uid === auth.currentUser.uid;
      const postDiv = document.createElement("div");
      postDiv.className = "scene-box bulletin";
      postDiv.innerHTML = `
        <div class="scene-header-sub">${post.username} 
            ${!isOwner ? `<button onclick="window.addFriend('${post.uid}', '${post.username}')" class="scene-mini-btn">ADD</button>` : ''}
        </div>
        <div class="scene-body">
          <p>${post.text}</p>
          ${isOwner ? `<button onclick="window.deleteItem('posts', '${d.id}')" class="scene-mini-btn delete-btn">DELETE</button>` : ''}
        </div>
      `;
      feed.appendChild(postDiv);
    });
  });
}

// FRIENDS
window.addFriend = async (friendId, friendName) => {
    await setDoc(doc(db, "users", auth.currentUser.uid, "friends", friendId), { 
        username: friendName, 
        timestamp: serverTimestamp() 
    });
    alert(`Following ${friendName}`);
};

// LOGGING
document.getElementById("postBtn").onclick = async () => {
  const ex = document.getElementById("exerciseSelect").value === "CUSTOM" ? document.getElementById("customExercise").value : document.getElementById("exerciseSelect").value;
  const w = document.getElementById("weightInput").value;
  const r = document.getElementById("repsInput").value;
  if (w && r) {
    await addDoc(collection(db, "logs"), {
      uid: auth.currentUser.uid,
      exercise: ex, weight: w, reps: r,
      timestamp: serverTimestamp()
    });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: ex, value: `${w} LBS` });
  }
};

function loadMyLogs() {
  onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), orderBy("timestamp", "desc")), snap => {
    const list = document.getElementById("my-logs-list");
    list.innerHTML = "";
    snap.forEach(d => {
      list.innerHTML += `<div class="log-item"><b>${d.data().exercise}</b>: ${d.data().weight}lbs x ${d.data().reps} 
      <a href="#" onclick="window.deleteItem('logs', '${d.id}')" class="del-x">[x]</a></div>`;
    });
  });
}

async function updateLogContext() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const plan = userSnap.data().activePlan;
  const tip = document.getElementById("plan-integration-tip");
  if (plan) {
    const day = new Date().getDay();
    const work = plan.routine[day] || "Rest Day";
    tip.innerHTML = `<div class="scene-tip"><b>TODAY'S MISSION:</b> ${work}</div>`;
  }
}

function renderVault() {
  const list = document.getElementById("premade-list");
  list.innerHTML = "";
  PREMADE_PLANS.forEach(p => {
    list.innerHTML += `<div class="scene-plan-card">
        <b>${p.name}</b>
        <button onclick="window.setPlan('${p.id}')" class="scene-mini-btn">ACTIVATE</button>
    </div>`;
  });
}

window.setPlan = async (id) => {
    const p = PREMADE_PLANS.find(x => x.id === id);
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: p }, { merge: true });
    updateLogContext();
};

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
      const list = document.getElementById("prList"); list.innerHTML = "";
      snap.forEach(d => { list.innerHTML += `<p class="pr-row">>> ${d.data().lift}: ${d.data().value}</p>`; });
    });
}

window.deleteItem = async (col, id) => { if(confirm("KILL THIS POST?")) await deleteDoc(doc(db, col, id)); };

document.getElementById("exerciseSelect").onchange = (e) => {
  document.getElementById("customExercise").classList.toggle("hidden", e.target.value !== "CUSTOM");
};
