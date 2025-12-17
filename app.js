import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where, arrayUnion, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAILS = ["christianjacee@gmail.com"];
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app");
const msg = document.getElementById("auth-msg");

let currentUserRole = "user";

// Check login status
onAuthStateChanged(auth, async user => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    document.getElementById("user-display").innerText = user.email;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const role = ADMIN_EMAILS.includes(user.email) ? "admin" : "user";
      await setDoc(userRef, { email: user.email, role });
      currentUserRole = role;
    } else {
      currentUserRole = userSnap.data().role;
    }

    // Show Admin button in nav ONLY if admin
    if (currentUserRole === "admin") {
      document.getElementById("nav-admin").classList.remove("hidden");
    }

    loadFeed();
    loadWorkoutPlans();
    loadPRs();
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

async function signup() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;
  if (!emailVal || !passwordVal) { msg.innerText = "CREDENTIALS REQUIRED"; return; }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
    const role = ADMIN_EMAILS.includes(emailVal) ? "admin" : "user";
    await setDoc(doc(db, "users", userCred.user.uid), { email: emailVal, role });
    msg.innerText = "ACCESS GRANTED. ENTERING...";
  } catch(e) {
    msg.innerText = "ERROR: " + e.message;
  }
}

async function login() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;
  if (!emailVal || !passwordVal) { msg.innerText = "CREDENTIALS REQUIRED"; return; }

  try {
    await signInWithEmailAndPassword(auth, emailVal, passwordVal);
  } catch(e) {
    msg.innerText = "ERROR: " + e.message;
  }
}

function logout() { signOut(auth); }

function show(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function postWorkout() {
  const text = document.getElementById("workoutText").value;
  if (!text) return;
  await addDoc(collection(db, "posts"), {
    text,
    uid: auth.currentUser.uid,
    userEmail: auth.currentUser.email,
    timestamp: new Date(),
    likes: [],
    comments: []
  });
  document.getElementById("workoutText").value = "";
  show('feed');
}

function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, snap => {
    const feed = document.getElementById("feed");
    feed.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const liked = (d.likes || []).includes(auth.currentUser.uid);
      let commentsHTML = "";
      if (d.comments) {
        d.comments.forEach(c => commentsHTML += `<p style="font-size:0.8em; color:#0f0; margin: 4px 0 0 10px;">> ${c.user}: ${c.text}</p>`);
      }
      feed.innerHTML += `
        <div class="post">
          <small style="color: #0f0; opacity: 0.6;">${d.userEmail}</small>
          <p>${d.text}</p>
          <button onclick="window.toggleLike('${docSnap.id}')">${liked ? '💚' : '♡'} LIKE</button>
          <input id="comment-${docSnap.id}" placeholder="Type comment..." style="width: 50%; font-size: 0.8em;">
          <button onclick="window.addComment('${docSnap.id}')">SEND</button>
          <div style="text-align: left;">${commentsHTML}</div>
        </div>
      `;
    });
  });
}

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

async function addComment(postId) {
  const input = document.getElementById(`comment-${postId}`);
  if (!input.value) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { comments: arrayUnion({ user: auth.currentUser.email, text: input.value }) });
  input.value = "";
}

async function savePR() {
  const lift = document.getElementById("prName").value;
  const value = document.getElementById("prValue").value;
  if (!lift || !value) return;
  await addDoc(collection(db, "prs"), { uid: auth.currentUser.uid, lift, value });
  document.getElementById("prName").value = "";
  document.getElementById("prValue").value = "";
}

function loadPRs() {
  const q = query(collection(db, "prs"), where("uid", "==", auth.currentUser.uid));
  onSnapshot(q, snap => {
    const prList = document.getElementById("prList");
    prList.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      prList.innerHTML += `<p>> ${d.lift}: ${d.value}</p>`;
    });
  });
}

async function loadWorkoutPlans() {
  const snap = await getDocs(collection(db, "workoutPlans"));
  const container = document.getElementById("plans");
  if (!container) return;
  container.innerHTML = "";
  snap.forEach(docSnap => {
    const d = docSnap.data();
    container.innerHTML += `<p>[PLN] ${d.name}</p>`;
  });
}

async function createPresetPlan() {
  const name = document.getElementById("planName").value;
  if (!name) return;
  await addDoc(collection(db, "workoutPlans"), { name, exercises: [], createdBy: auth.currentUser.uid, isPreset: true });
  document.getElementById("planName").value = "";
  loadWorkoutPlans();
}

window.login = login;
window.signup = signup;
window.logout = logout;
window.show = show;
window.postWorkout = postWorkout;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.savePR = savePR;
window.createPresetPlan = createPresetPlan;

document.getElementById("signupBtn").addEventListener("click", signup);
