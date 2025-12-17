// 🔥 PASTE YOUR FIREBASE CONFIG HERE
firebase.initializeApp({
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_APP.firebaseapp.com",
  projectId: "YOUR_APP",
});

const auth = firebase.auth();
const db = firebase.firestore();

const authScreen = document.getElementById("auth-screen");
const app = document.getElementById("app");
const msg = document.getElementById("auth-msg");

auth.onAuthStateChanged(user => {
  if (user) {
    authScreen.classList.add("hidden");
    app.classList.remove("hidden");
    loadFeed();
    document.getElementById("profileEmail").innerText = user.email;
  } else {
    authScreen.classList.remove("hidden");
    app.classList.add("hidden");
  }
});

function signup() {
  const email = email.value;
  const password = password.value;
  const code = invite.value;

  db.collection("invites").doc(code).get().then(doc => {
    if (!doc.exists || doc.data().used) {
      msg.innerText = "Invalid invite code";
      return;
    }

    auth.createUserWithEmailAndPassword(email, password).then(() => {
      doc.ref.update({ used: true });
    });
  });
}

function login() {
  auth.signInWithEmailAndPassword(email.value, password.value)
    .catch(e => msg.innerText = e.message);
}

function logout() {
  auth.signOut();
}

function show(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function postWorkout() {
  db.collection("posts").add({
    text: workoutText.value,
    uid: auth.currentUser.uid,
    time: firebase.firestore.FieldValue.serverTimestamp()
  });
  workoutText.value = "";
}

function loadFeed() {
  db.collection("posts").orderBy("time", "desc")
    .onSnapshot(snap => {
      feed.innerHTML = "";
      snap.forEach(doc => {
        const d = doc.data();
        feed.innerHTML += `<p>> ${d.text}</p>`;
      });
    });
}

function savePR() {
  db.collection("prs").add({
    uid: auth.currentUser.uid,
    lift: prName.value,
    value: prValue.value
  });
}

