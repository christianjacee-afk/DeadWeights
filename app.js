// Firebase modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",
  authDomain: "deadweights-365c6.firebaseapp.com",
  databaseURL: "https://deadweights-365c6-default-rtdb.firebaseio.com",
  projectId: "deadweights-365c6",
  storageBucket: "deadweights-365c6.firebasestorage.app",
  messagingSenderId: "727970628768",
  appId: "1:727970628768:web:3dfd719731f6632e88f5c5",
  measurementId: "G-LDDZ5HEB8K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app");
const msg = document.getElementById("auth-msg");

let currentUserRole = "user";

// Auth state
onAuthStateChanged(auth, async user => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { email: user.email, role: "user" });
      currentUserRole = "user";
    } else {
      currentUserRole = userSnap.data().role;
    }

    loadFeed();
    loadWorkoutPlans();
    loadPRs();

    document.getElementById("profileEmail").innerText = user.email;

    if (currentUserRole === "admin") {
      document.getElementById("admin-panel").classList.remove("hidden");
    }
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

// Admin secret key
const SECRET_ADMIN_KEY = "MYSECRET123"; // <-- change this to your key

// SIGNUP
async function signup() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;
  const codeVal = document.getElementById("invite").value;
  const adminKeyVal = document.getElementById("adminKey").value;

  const inviteRef = doc(db, "invites", codeVal);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists() || inviteSnap.data().used) {
    msg.innerText = "Invalid invite code";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
    await updateDoc(inviteRef, { used: true });

    const role = (adminKeyVal === SECRET_ADMIN_KEY) ? "admin" : "user";
    await setDoc(doc(db, "users", userCred.user.uid), { email: emailVal, role });

  } catch(e) {
    msg.innerText = e.message;
  }
}

// LOGIN
async function login() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, emailVal, passwordVal);
  } catch(e) {
    msg.innerText = e.message;
  }
}

// LOGOUT
function logout() {
  signOut(auth);
}

// Show panel
function show(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// POST WORKOUT
async function postWorkout() {
  const text = document.getElementById("workoutText").value;
  if (!text) return;
  await addDoc(collection(db, "posts"), {
    text,
    uid: auth.currentUser.uid,
    timestamp: new Date(),
    likes: [],
    comments: []
  });
  document.getElementById("workoutText").value = "";
}

// LOAD FEED
function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, snap => {
    const feed = document.getElementById("feed");
    feed.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const liked = d.likes.includes(auth.currentUser.uid);
      let commentsHTML = "";
      if (d.comments) {
        d.comments.forEach(c => commentsHTML += `<p style="margin-left:12px;">${c.user}: ${c.text}</p>`);
      }
      feed.innerHTML += `
        <div class="post">
          <p>${d.text}</p>
          <button onclick="toggleLike('${docSnap.id}')">${liked ? '💚' : '♡'} Like</button>
          <input id="comment-${docSnap.id}" placeholder="Comment...">
          <button onclick="addComment('${docSnap.id}')">Post Comment</button>
          ${commentsHTML}
        </div>
      `;
    });
  });
}

// TOGGLE LIKE
async function toggleLike(postId) {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const likes = postSnap.data().likes || [];
  const uid = auth.currentUser.uid;
  if (likes.includes(uid)) {
    await updateDoc(postRef, { likes: likes.filter(u => u !== uid) });
  } else {
    await updateDoc(postRef, { likes: arrayUnion(uid) });
  }
}

// ADD COMMENT
async function addComment(postId) {
  const input = document.getElementById(`comment-${postId}`);
  const text = input.value;
  if (!text) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { comments: arrayUnion({ user: auth.currentUser.email, text }) });
  input.value = "";
}

// PRs
async function savePR() {
  const lift = document.getElementById("prName").value;
  const value = document.getElementById("prValue").value;
  if (!lift || !value) return;
  await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift, value });
}

function loadPRs() {
  const q = query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid));
  onSnapshot(q, snap => {
    const prList = document.getElementById("prList");
    prList.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      prList.innerHTML += `<p>${d.lift}: ${d.value}</p>`;
    });
  });
}

// Workout Plans
async function loadWorkoutPlans() {
  const snap = await getDocs(collection(db, "workoutPlans"));
  const container = document.getElementById("plans");
  if (!container) return;
  container.innerHTML = "";
  snap.forEach(docSnap => {
    const d = docSnap.data();
    container.innerHTML += `<p>${d.name} ${d.isPreset ? '(Preset)' : ''}</p>`;
  });
}

async function createPresetPlan() {
  const name = document.getElementById("planName").value;
  if (!name) return;
  await addDoc(collection(db, "workoutPlans"), { name, exercises: [], createdBy: auth.currentUser.uid, isPreset: true });
  document.getElementById("planName").value = "";
}

// Expose functions globally for Safari
window.signup = signup;
window.login = login;
window.logout = logout;
window.show = show;
window.postWorkout = postWorkout;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.savePR = savePR;
window.createPresetPlan = createPresetPlan;