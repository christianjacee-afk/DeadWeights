import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Keep user logged in even after closing the browser
setPersistence(auth, browserLocalPersistence);

const PREMADE_PLANS = [
  { 
    id: "5day", 
    name: "GRAVE_SPECIALIST (5-Day)", 
    days: 5, 
    description: "Your Monday-Friday custom worksheet.", 
    routine: { 
      1: "MON: Squat/Leg Press, Bench/Incline, Row/Pull-ups, OHP, RDL/Deadlift", 
      2: "TUE: Squat/Hack Squat, Leg Press, RDL, Ham Curl, Hip Thrust, Add/Abd Machines", 
      3: "WED: Bench/Incline, Flys, OHP, Lateral Raises, Skull Crushers, Rope Pushdowns", 
      4: "THU: Deadlift, Lunges, Leg Extension, Seated Calf, Standing Calf", 
      5: "FRI: Lat Pulls, Rows, Face Pulls, Bicep Curls, Hammer Curls" 
    }
  },
  { id: "3day", name: "REVENANT (3-Day)", days: 3, description: "Full Body focus.", routine: { 1: "Squat/Bench/Row", 2: "DL/OHP/Pullups", 3: "Leg Press/Incline/Lat Pull" }},
  { id: "6day", name: "HELL_BOUND (6-Day)", days: 6, description: "PPL Intensity.", routine: { 1: "Push", 2: "Pull", 3: "Legs", 4: "Push", 5: "Pull", 6: "Legs" }}
];

// Auth Observer
onAuthStateChanged(auth, async user => {
  const authScreen = document.getElementById("auth-screen");
  const appScreen = document.getElementById("app");
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    document.getElementById("profileEmail").innerText = user.email;
    loadFeed(); loadPRs(); renderVault(); syncActivePlan();
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

// LOGIN FUNCTION
window.login = async () => {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  const msg = document.getElementById("auth-msg");
  msg.innerText = "VERIFYING ID...";
  try { 
    await signInWithEmailAndPassword(auth, e, p); 
  } catch(err) { 
    msg.innerText = "ERROR: " + err.code.replace('auth/', '').replace(/-/g, ' '); 
  }
};

// SIGNUP FUNCTION
window.signup = async () => {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  const msg = document.getElementById("auth-msg");
  if(!e || !p) { msg.innerText = "INPUTS REQUIRED."; return; }
  msg.innerText = "CREATING RECORD...";
  try { 
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    await setDoc(doc(db, "users", cred.user.uid), { email: e, role: "user" });
  } catch(err) { 
    msg.innerText = "ERROR: " + err.code.replace('auth/', '').replace(/-/g, ' '); 
  }
};

// PASSWORD PEEK
window.togglePassword = () => {
    const p = document.getElementById("password");
    p.type = p.type === "password" ? "text" : "password";
};

// PASSWORD RESET
window.resetPassword = async () => {
    const email = document.getElementById("email").value;
    const msg = document.getElementById("auth-msg");
    if (!email) { msg.innerText = "ENTER EMAIL FIRST."; return; }
    try {
        await sendPasswordResetEmail(auth, email);
        msg.innerText = "RESET LINK SENT TO EMAIL.";
    } catch (err) {
        msg.innerText = "ERROR: " + err.code.replace('auth/', '').replace(/-/g, ' ');
    }
};

window.logout = () => signOut(auth);

window.show = (id) => {
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    if (id === 'builder') renderBuilderFields();
};

window.toggleCustomExercise = () => document.getElementById("customExercise").classList.toggle("hidden", document.getElementById("exerciseSelect").value !== "CUSTOM");

window.postWorkout = async () => {
    const exercise = document.getElementById("exerciseSelect").value === "CUSTOM" ? document.getElementById("customExercise").value : document.getElementById("exerciseSelect").value;
    const weight = document.getElementById("weightInput").value;
    const reps = document.getElementById("repsInput").value;
    if(!weight || !reps) return;
    await addDoc(collection(db, "posts"), { 
        text: `KILLED: ${exercise} | ${weight} LBS x ${reps}`, 
        userEmail: auth.currentUser.email, 
        timestamp: new Date() 
    });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: exercise, value: `${weight} LBS` });
    window.show('feed');
};

function renderVault() {
    const list = document.getElementById("premade-list");
    list.innerHTML = "";
    PREMADE_PLANS.forEach(p => {
        list.innerHTML += `<div class="plan-card"><h4>${p.name}</h4><small>${p.description}</small><button onclick="window.activatePlan('${p.id}')" style="margin-top:5px; height: 30px; font-size:12px;">ACTIVATE</button></div>`;
    });
}

window.activatePlan = async (id) => {
    const plan = PREMADE_PLANS.find(p => p.id === id);
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: plan }, { merge: true });
    syncActivePlan(); window.show('active-plan');
};

async function syncActivePlan() {
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const plan = userSnap.data()?.activePlan;
    const display = document.getElementById("active-plan-display");
    if (!plan) return;
    display.innerHTML = `<h4>${plan.name}</h4><table class="plan-table">`;
    Object.entries(plan.routine).forEach(([day, work]) => {
        display.innerHTML += `<tr><td style="color:#ff00ea; width:60px;">DAY ${day}</td><td>${work}</td></tr>`;
    });
    display.innerHTML += `</table>`;
}

function renderBuilderFields() {
    const days = document.getElementById("newPlanDays").value || 3;
    const container = document.getElementById("day-inputs");
    container.innerHTML = "";
    for(let i=1; i<=days; i++) { container.innerHTML += `<input id="day-${i}" placeholder="DAY ${i} EXERCISES">`; }
}

window.saveCustomPlan = async () => {
    const name = document.getElementById("newPlanName").value;
    const dayCount = document.getElementById("newPlanDays").value;
    const routine = {};
    for(let i=1; i<=dayCount; i++) { routine[i] = document.getElementById(`day-${i}`).value; }
    await setDoc(doc(db, "users", auth.currentUser.uid), { activePlan: { name, routine } }, { merge: true });
    syncActivePlan(); window.show('active-plan');
};

function loadFeed() {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), snap => {
        const feed = document.getElementById("feed"); feed.innerHTML = "";
        snap.forEach(d => { const data = d.data(); feed.innerHTML += `<div class="post"><small>${data.userEmail}</small><pre>${data.text}</pre></div>`; });
    });
}

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
        const list = document.getElementById("prList"); list.innerHTML = "";
        snap.forEach(d => { const data = d.data(); list.innerHTML += `<p>> ${data.lift}: ${data.value}</p>`; });
    });
}

document.getElementById("signupBtn").addEventListener("click", window.signup);
