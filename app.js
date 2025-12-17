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
  { 
    id: "5day", 
    name: "GRAVE_SPECIALIST (5-Day)", 
    days: 5, 
    description: "Full Monday-Friday Routine.", 
    routine: { 
      1: "MON: Squat/Leg Press, Bench/Incline, Row/Pull-ups, OHP, RDL/Deadlift", 
      2: "TUE: Squat/Hack Squat, Leg Press, RDL, Ham Curl, Hip Thrust, Add/Abd", 
      3: "WED: Bench/Incline, Flys, OHP, Lateral Raises, Triceps", 
      4: "THU: Deadlift, Lunges, Leg Extension, Calves", 
      5: "FRI: Lat Pulls, Rows, Face Pulls, Bicep Curls" 
    }
  },
  { id: "3day", name: "REVENANT (3-Day)", days: 3, description: "Full Body focus.", routine: { 1: "Squat/Bench/Row", 2: "DL/OHP/Pullups", 3: "Leg Press/Incline/Lat Pull" }}
];

onAuthStateChanged(auth, async user => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists() || !userSnap.data().username) {
      document.getElementById("username-screen").style.display = "flex";
    } else {
      document.getElementById("username-screen").style.display = "none";
      document.getElementById("profileUsername").innerText = `TAG: ${userSnap.data().username}`;
      finishLogin();
    }
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    document.getElementById("username-screen").style.display = "none";
  }
});

function finishLogin() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  loadFeed(); loadPRs(); renderVault(); syncActivePlan();
}

window.saveUsername = async () => {
  const name = document.getElementById("usernameInput").value;
  if(!name) return;
  await setDoc(doc(db, "users", auth.currentUser.uid), { username: name, email: auth.currentUser.email }, { merge: true });
  location.reload(); 
};

window.login = async () => {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  try { await signInWithEmailAndPassword(auth, e, p); } catch(err) { document.getElementById("auth-msg").innerText = "AUTH_ERROR: " + err.code; }
};

window.signup = async () => {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  try { await createUserWithEmailAndPassword(auth, e, p); } catch(err) { document.getElementById("auth-msg").innerText = "SIGNUP_ERROR: " + err.code; }
};

window.togglePassword = () => {
  const p = document.getElementById("password");
  p.type = p.type === "password" ? "text" : "password";
};

window.resetPassword = async () => {
  const email = document.getElementById("email").value;
  if (email) {
      await sendPasswordResetEmail(auth, email);
      document.getElementById("auth-msg").innerText = "RESET_LINK_SENT";
  }
};

window.logout = () => signOut(auth).then(() => location.reload());

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
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const username = userSnap.data()?.username || "Unknown";

    await addDoc(collection(db, "posts"), { 
        text: `KILLED: ${exercise} | ${weight} LBS x ${reps}`, 
        username: username, 
        timestamp: new Date() 
    });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: exercise, value: `${weight} LBS` });
    window.show('feed');
};

function renderVault() {
    const list = document.getElementById("premade-list");
    list.innerHTML = "";
    PREMADE_PLANS.forEach(p => {
        list.innerHTML += `<div class="plan-card" style="margin-bottom:15px; border:1px solid #333; padding:10px;">
            <h4 style="color:#00ff41;">${p.name}</h4>
            <p style="font-size:12px; color:#666;">${p.description}</p>
            <button onclick="window.activatePlan('${p.id}')" style="height:30px; font-size:12px; padding:0;">ACTIVATE</button>
        </div>`;
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
    if (!plan) {
        display.innerHTML = "<p style='color:#444;'>NO ACTIVE PROTOCOL.</p>";
        return;
    }
    display.innerHTML = `<h4 style="color:#ff00ea;">${plan.name}</h4><table class="plan-table" style="width:100%;">`;
    Object.entries(plan.routine).forEach(([day, work]) => {
        display.innerHTML += `<tr><td style="color:#ff00ea; width:60px; vertical-align:top;">DAY ${day}</td><td style="color:#00ff41; padding-bottom:10px;">${work}</td></tr>`;
    });
    display.innerHTML += `</table>`;
}

function loadFeed() {
    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), snap => {
        const feed = document.getElementById("feed"); feed.innerHTML = "";
        snap.forEach(d => { 
          const data = d.data(); 
          feed.innerHTML += `<div class="post" style="border-bottom:1px solid #222; margin-bottom:10px;"><small style="color:#ff00ea;">> ${data.username || 'ANONYMOUS'}</small><pre style="margin:5px 0; color:#00ff41;">${data.text}</pre></div>`; 
        });
    });
}

function loadPRs() {
    onSnapshot(query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid)), snap => {
        const list = document.getElementById("prList"); list.innerHTML = "";
        snap.forEach(d => { const data = d.data(); list.innerHTML += `<p style="margin:5px 0;">> ${data.lift}: ${data.value}</p>`; });
    });
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

document.getElementById("signupBtn").addEventListener("click", window.signup);
