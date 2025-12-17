import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

const PREMADE_PLANS = [
  { id: "3day", name: "THE REVENANT (3-Day)", days: 3, description: "Full Body focus for maximum recovery.", routine: { 1: "Squat, Bench, Row", 2: "Deadlift, OHP, Pullups", 3: "Leg Press, Incline Press, Lat Pull" }},
  { id: "4day", name: "PHUL_GHOST (4-Day)", days: 4, description: "Upper/Lower Split for power and size.", routine: { 1: "Upper Power", 2: "Lower Power", 3: "Upper Hypertrophy", 4: "Lower Hypertrophy" }},
  { id: "5day", name: "GRAVE_SPECIALIST (5-Day)", days: 5, description: "Your custom worksheet protocol.", routine: { 1: "Full Body Compound", 2: "Lower A (Full Legs)", 3: "Upper Push", 4: "Lower B (Posterior)", 5: "Upper Pull + Arms" }},
  { id: "6day", name: "HELL_BOUND (6-Day)", days: 6, description: "PPL (Push/Pull/Legs) x2 for the obsessed.", routine: { 1: "Push", 2: "Pull", 3: "Legs", 4: "Push", 5: "Pull", 6: "Legs" }},
  { id: "7day", name: "NO_REST_REMAINING (7-Day)", days: 7, description: "Total body annihilation with active recovery.", routine: { 1: "Push", 2: "Pull", 3: "Legs", 4: "Active Recov", 5: "Upper", 6: "Lower", 7: "Active Recov" }}
];

onAuthStateChanged(auth, async user => {
  if (user) {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    loadFeed(); loadPRs(); renderVault(); syncActivePlan();
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

function renderVault() {
    const list = document.getElementById("premade-list");
    list.innerHTML = "";
    PREMADE_PLANS.forEach(p => {
        list.innerHTML += `
            <div class="plan-card">
                <h4>${p.name}</h4>
                <small>${p.description}</small>
                <button onclick="window.activatePlan('${p.id}')" style="margin-top:5px; height: 30px; padding: 0;">ACTIVATE</button>
            </div>`;
    });
}

window.activatePlan = async (id) => {
    const plan = PREMADE_PLANS.find(p => p.id === id);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { activePlan: plan });
    alert("PROTOCOL ACTIVATED.");
    syncActivePlan();
    window.show('active-plan');
};

async function syncActivePlan() {
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const plan = userSnap.data()?.activePlan;
    const display = document.getElementById("active-plan-display");
    if (!plan) return;
    display.innerHTML = `<h4>${plan.name}</h4><table class="plan-table">`;
    Object.entries(plan.routine).forEach(([day, work]) => {
        display.innerHTML += `<tr><td>DAY ${day}</td><td>${work}</td></tr>`;
    });
    display.innerHTML += `</table>`;
}

window.show = (id) => {
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    if (id === 'builder') renderBuilderFields();
};

function renderBuilderFields() {
    const days = document.getElementById("newPlanDays").value || 3;
    const container = document.getElementById("day-inputs");
    container.innerHTML = "";
    for(let i=1; i<=days; i++) {
        container.innerHTML += `<input id="day-${i}" placeholder="DAY ${i} MOVEMENTS (e.g. Squat, Bench)">`;
    }
}

window.saveCustomPlan = async () => {
    const name = document.getElementById("newPlanName").value;
    const dayCount = document.getElementById("newPlanDays").value;
    const routine = {};
    for(let i=1; i<=dayCount; i++) {
        routine[i] = document.getElementById(`day-${i}`).value;
    }
    const customPlan = { name, days: dayCount, routine };
    await updateDoc(doc(db, "users", auth.currentUser.uid), { activePlan: customPlan });
    alert("CUSTOM PROTOCOL SEALED.");
    syncActivePlan();
    window.show('active-plan');
};

// ... Original Login/Post/PR functions remain the same as previous update ...
window.login = async () => {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  try { await signInWithEmailAndPassword(auth, e, p); } catch(err) { alert("ACCESS DENIED."); }
};
window.logout = () => signOut(auth);
window.postWorkout = async () => {
    const select = document.getElementById("exerciseSelect");
    const weight = document.getElementById("weightInput").value;
    const reps = document.getElementById("repsInput").value;
    const exercise = select.value === "CUSTOM" ? document.getElementById("customExercise").value : select.value;
    await addDoc(collection(db, "posts"), { text: `KILLED: ${exercise} | ${weight} LBS x ${reps}`, userEmail: auth.currentUser.email, timestamp: new Date() });
    await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift: exercise, value: `${weight} LBS` });
    window.show('feed');
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
window.toggleCustomExercise = () => document.getElementById("customExercise").classList.toggle("hidden", document.getElementById("exerciseSelect").value !== "CUSTOM");
document.getElementById("signupBtn").addEventListener("click", async () => {
    const e = document.getElementById("email").value; const p = document.getElementById("password").value;
    await createUserWithEmailAndPassword(auth, e, p);
    await setDoc(doc(db, "users", auth.currentUser.uid), { email: e, role: "user" });
});
