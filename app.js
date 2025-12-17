import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where, arrayUnion, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  projectId: "deadweights-365c6",
  storageBucket: "deadweights-365c6.firebasestorage.app",
  messagingSenderId: "727970628768",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAILS = ["christianjacee@gmail.com"];
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app");
const msg = document.getElementById("auth-msg");

let currentUserRole = "user";

onAuthStateChanged(auth, async user => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    document.getElementById("profileEmail").innerText = user.email;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const role = ADMIN_EMAILS.includes(user.email) ? "admin" : "user";
      await setDoc(userRef, { email: user.email, role: role });
      currentUserRole = role;
    } else {
      currentUserRole = userSnap.data().role;
    }

    if (currentUserRole === "admin") document.getElementById("nav-admin").classList.remove("hidden");

    loadFeed();
    loadPRs();
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

// Helper: Show/Hide Custom Input
window.toggleCustomExercise = () => {
    const select = document.getElementById("exerciseSelect");
    const customInput = document.getElementById("customExercise");
    customInput.classList.toggle("hidden", select.value !== "CUSTOM");
};

async function postWorkout() {
    const select = document.getElementById("exerciseSelect");
    const custom = document.getElementById("customExercise");
    const weight = document.getElementById("weightInput").value;
    const reps = document.getElementById("repsInput").value;
    const notes = document.getElementById("workoutNotes").value;

    const exerciseName = select.value === "CUSTOM" ? custom.value : select.value;

    if (!exerciseName || !weight || !reps) {
        alert("Enter exercise, weight, and reps!");
        return;
    }

    const formattedText = `KILLED: ${exerciseName} | ${weight} LBS x ${reps} REPS \nNotes: ${notes}`;

    await addDoc(collection(db, "posts"), {
        text: formattedText,
        uid: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        timestamp: new Date(),
        likes: [],
        comments: []
    });

    // Also update PR automatically if it's a high weight (simplified logic)
    await addDoc(collection(db, "prs"), { 
        uid: auth.currentUser.uid, 
        lift: exerciseName, 
        value: `${weight} LBS` 
    });

    // Reset fields
    document.getElementById("weightInput").value = "";
    document.getElementById("repsInput").value = "";
    document.getElementById("workoutNotes").value = "";
    show('feed');
}

// REST OF THE LOGIC (Simplified for scope)
function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, snap => {
    const feed = document.getElementById("feed");
    feed.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      feed.innerHTML += `
        <div class="post">
          <small style="color: #ff00ea;">${d.userEmail}</small>
          <pre style="font-family: 'VT323'; color: #00ff41; white-space: pre-wrap;">${d.text}</pre>
          <button onclick="window.toggleLike('${docSnap.id}')">LIKE</button>
        </div>`;
    });
  });
}

function loadPRs() {
    const q = query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const list = document.getElementById("prList");
        list.innerHTML = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            list.innerHTML += `<p>> ${d.lift}: ${d.value}</p>`;
        });
    });
}

async function login() {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  try { await signInWithEmailAndPassword(auth, e, p); } catch(err) { msg.innerText = err.message; }
}

async function signup() {
  const e = document.getElementById("email").value;
  const p = document.getElementById("password").value;
  try { await createUserWithEmailAndPassword(auth, e, p); } catch(err) { msg.innerText = err.message; }
}

function logout() { signOut(auth); }

function show(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

window.login = login;
window.signup = signup;
window.logout = logout;
window.show = show;
window.postWorkout = postWorkout;
document.getElementById("signupBtn").addEventListener("click", signup);
