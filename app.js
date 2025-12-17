import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
  { id: "5day", name: "GRAVE_SPECIALIST (5-Day)", routine: { 1: "MON: Squat, Bench, Row, OHP", 2: "TUE: Lower A (Legs)", 3: "WED: Upper Push", 4: "THU: Lower B", 5: "FRI: Upper Pull" }},
  { id: "3day", name: "REVENANT (3-Day)", routine: { 1: "Full Body A", 2: "Full Body B", 3: "Full Body C" }}
];

// UI ELEMENTS
const authMsg = document.getElementById("auth-msg");

// AUTH OBSERVER
onAuthStateChanged(auth, async user => {
  if (user) {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists() || !userSnap.data().username) {
      document.getElementById("username-screen").style.display = "flex";
    } else {
      document.getElementById("username-screen").style.display = "none";
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("profileUsername").innerText = `TAG: ${userSnap.data().username}`;
      loadFeed(); loadPRs(); renderVault(); syncActivePlan();
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

// LOGIN / SIGNUP LOGIC
document.getElementById("loginBtn").onclick = async () => {
  authMsg.innerText = "LOGGING IN...";
  try {
    await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
  } catch (e) { authMsg.innerText = "ERROR: " + e.code; }
};

document.getElementById("signupBtn").onclick = async () => {
  authMsg.innerText = "CREATING ACCOUNT...";
  try {
    await createUserWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
  } catch (e) { authMsg.innerText = "ERROR: " + e.code; }
};

document.getElementById("peekBtn").onclick = () => {
  const p = document.getElementById("password");
  p.type = p.type === "password" ? "text" : "password";
};

document.getElementById("resetBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  if (email) {
    await sendPasswordResetEmail(auth, email);
    authMsg.innerText = "RESET EMAIL SENT.";
  } else { authMsg.innerText = "ENTER EMAIL FIRST."; }
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
document.querySelectorAll("nav button[data-show]").forEach(btn => {
  btn.onclick = () => {
    const target = btn.getAttribute("data-show");
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
    if (target === 'builder') renderBuilderFields();
  };
});

// WORKOUT LOGIC
document.getElementById("exerciseSelect").onchange = (e) => {
  document.getElementById("customExercise").classList.toggle("hidden", e.target.value !== "CUSTOM");
};

document.getElementById("postBtn").onclick = async () => {
  const ex = document.getElementById("exerciseSelect").value === "CUSTOM" ? document.getElementById("customExercise").value : document.getElementById("exerciseSelect").value;
  const w = document.getElementById("weightInput").value;
  const r = document.getElementById("repsInput").value;
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  
  if (w && r) {
    await addDoc(collection(db, "posts"), { text: `KILLED: ${ex} | ${w} LBS x ${r}`, username: userSnap.data().username, timestamp: new Date() });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: ex, value: `${w} LBS` });
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("feed").classList.remove("hidden");
  }
};

// VAULT & PLANS
function renderVault() {
  const list = document.getElementById("premade-list");
  list.innerHTML = "";
  PREMADE_PLANS.forEach(p => {
    const div = document.createElement("div");
    div.className = "plan-card";
    div.innerHTML = `<h4>${p.name}</h4><button class="act-btn" data-id="${p.id}">ACTIVATE</button>`;
    div.querySelector(".act-btn").onclick = () => activatePlan(p.id);
    list.appendChild(div);
  });
}

async function activatePlan(id) {
  const plan = PREMADE_PLANS.find(p => p.id === id);
  await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: plan }, { merge: true });
  syncActivePlan();
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById("active-plan").classList.remove("hidden");
}

async function syncActivePlan() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const plan = userSnap.data()?.activePlan;
  const display = document.getElementById("active-plan-display");
  if (!plan) return;
  display.innerHTML = `<h4>${plan.name}</h4><table style="width:100%;">`;
  Object.entries(plan.routine).forEach(([day, work]) => {
    display.innerHTML += `<tr><td style="color:#ff00ea; width:60px;">DAY ${day}</td><td>${work}</td></tr>`;
  });
  display.innerHTML += `</table>`;
}

function loadFeed() {
  onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), snap => {
    const feed = document.getElementById("feed"); feed.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      feed.innerHTML += `<div class="post"><small>> ${data.username}</small><pre>${data.text}</pre></div>`;
    });
  });
}

function loadPRs() {
  onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
    const list = document.getElementById("prList"); list.innerHTML = "";
    snap.forEach(d => { list.innerHTML += `<p>> ${d.data().lift}: ${d.data().value}</p>`; });
  });
}

document.getElementById("goToBuilderBtn").onclick = () => {
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("builder").classList.remove("hidden");
    renderBuilderFields();
};

function renderBuilderFields() {
    const days = document.getElementById("newPlanDays").value || 3;
    const container = document.getElementById("day-inputs");
    container.innerHTML = "";
    for(let i=1; i<=days; i++) {
        const inp = document.createElement("input");
        inp.id = `day-${i}`;
        inp.placeholder = `DAY ${i} EXERCISES`;
        container.appendChild(inp);
    }
}

document.getElementById("saveCustomBtn").onclick = async () => {
    const routine = {};
    const days = document.getElementById("newPlanDays").value || 3;
    for(let i=1; i<=days; i++) { routine[i] = document.getElementById(`day-${i}`).value; }
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: { name: document.getElementById("newPlanName").value, routine } }, { merge: true });
    syncActivePlan();
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("active-plan").classList.remove("hidden");
};
