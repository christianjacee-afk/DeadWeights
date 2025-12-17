// Firebase modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, where, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Your Firebase config
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

    const userRef = doc
    window.signup = signup;
window.login = login;
window.logout = logout;
window.show = show;
window.postWorkout = postWorkout;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.savePR = savePR;
window.createPresetPlan = createPresetPlan;