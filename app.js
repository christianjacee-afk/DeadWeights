import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
  { id: "5day", name: "GRAVE_SPECIALIST (5-Day)", routine: { 1: "Squat, Bench, Row, OHP, RDL", 2: "Squat, Leg Press, RDL, Ham Curl", 3: "Incline, Flys, Lateral Raises, Triceps", 4: "Deadlift, Lunges, Leg Ext, Calves", 5: "Lat Pulls, Rows, Face Pulls, Curls" }},
  { id: "3day", name: "REVENANT (3-Day)", routine: { 1: "Squat/Bench/Row", 2: "DL/OHP/Pullups", 3: "Leg Press/Incline" }}
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
  loadFeed(); renderVault(); loadMyLogs(); loadPRs(); updateLogContext();
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
document.querySelectorAll(".ms-nav-list a").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    const target = link.getAttribute("data-show");
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  };
});

// FEED & COMMENTS
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
      postDiv.className = "ms-box post";
      postDiv.innerHTML = `
        <div class="ms-header-sub">${post.username} <span class="ms-date">posted</span></div>
        <div class="ms-body">
          <p id="post-text-${d.id}">${post.text}</p>
          ${isOwner ? `<button onclick="window.editPost('${d.id}')" class="ms-small-btn">Edit</button> <button onclick="window.deleteItem('posts', '${d.id}')" class="ms-small-btn">Delete</button>` : ''}
        </div>
      `;
      feed.appendChild(postDiv);
    });
  });
}

// LOGGING & PLAN INTEGRATION
async function updateLogContext() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const plan = userSnap.data().activePlan;
  const tip = document.getElementById("plan-integration-tip");
  if (plan) {
    const day = new Date().getDay(); // 1=Mon, 5=Fri
    const work = plan.routine[day] || "Rest Day or Recovery";
    tip.innerHTML = `<div class="ms-alert"><b>Today's Goal:</b> ${work}</div>`;
  } else {
    tip.innerHTML = `<p style="font-size:11px;">Pick a plan in the Vault to track daily goals.</p>`;
  }
}

document.getElementById("postBtn").onclick = async () => {
  const ex = document.getElementById("exerciseSelect").value === "CUSTOM" ? document.getElementById("customExercise").value : document.getElementById("exerciseSelect").value;
  const w = document.getElementById("weightInput").value;
  const r = document.getElementById("repsInput").value;
  if (w && r) {
    await addDoc(collection(db, "logs"), {
      uid: auth.currentUser.uid,
      exercise: ex,
      weight: w,
      reps: r,
      timestamp: serverTimestamp()
    });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: ex, value: `${w} Lbs` });
  }
};

function loadMyLogs() {
  onSnapshot(query(collection(db, "logs"), where("uid", "==", auth.currentUser.uid), orderBy("timestamp", "desc")), snap => {
    const list = document.getElementById("my-logs-list");
    list.innerHTML = "";
    snap.forEach(d => {
      list.innerHTML += `<div class="log-item"><b>${d.data().exercise}</b>: ${d.data().weight}lbs x ${d.data().reps} 
      <a href="#" onclick="window.deleteItem('logs', '${d.id}')" style="color:red; font-size:10px;">[x]</a></div>`;
    });
  });
}

function renderVault() {
  const list = document.getElementById("premade-list");
  list.innerHTML = "";
  PREMADE_PLANS.forEach(p => {
    const div = document.createElement("div");
    div.className = "ms-plan-item";
    div.innerHTML = `<b>${p.name}</b> <button class="ms-small-btn">Activate</button>`;
    div.querySelector("button").onclick = async () => {
      await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: p }, { merge: true });
      updateLogContext();
      alert("Plan Activated!");
    };
    list.appendChild(div);
  });
}

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
      const list = document.getElementById("prList"); list.innerHTML = "";
      snap.forEach(d => { list.innerHTML += `<p>• ${d.data().lift}: ${d.data().value}</p>`; });
    });
}

// EDIT / DELETE GLOBALS
window.deleteItem = async (col, id) => { if(confirm("Delete this?")) await deleteDoc(doc(db, col, id)); };
window.editPost = async (id) => {
  const newText = prompt("Edit your post:");
  if(newText) await updateDoc(doc(db, "posts", id), { text: newText });
};

window.toggleCustomExercise = () => {
  document.getElementById("customExercise").classList.toggle("hidden", document.getElementById("exerciseSelect").value !== "CUSTOM");
};
document.getElementById("exerciseSelect").onchange = window.toggleCustomExercise;
