// DEADWEIGHTS // THE_GRAVE

// Single-page app for GitHub Pages + Firebase (Auth + Firestore)

// Safari-friendly: no build step, ES modules only.

 

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {

 getAuth,

 onAuthStateChanged,

 createUserWithEmailAndPassword,

 signInWithEmailAndPassword,

 signOut

} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

 

import {

 getFirestore,

 doc,

 getDoc,

 setDoc,

 updateDoc,

 collection,

 addDoc,

 getDocs,

 query,

 where,

 orderBy,

 limit

} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

 

/* =========================

  FIREBASE

========================= */

const firebaseConfig = {

 apiKey: "AIzaSyAAjEYc7dMgi4FTfh3mD7gaq34g_5ppNTI",

 authDomain: "deadweights-365c6.firebaseapp.com",

 projectId: "deadweights-365c6",

 appId: "1:727970628768:web:3dfd719731f6632e88f5c5"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

 

/* =========================

  GRAVEFIVE (exact worksheet) + 3–7 day splits

========================= */

const BUILT_IN_PLANS = [

 {

   id: "gravefive_hybrid_5",

   name: "GRAVEFIVE // 5-DAY",

   vibe: "Monday–Friday. Every muscle 2× / week. Auto-rotates if you miss days.",

   days: [

     {

       name:"MONDAY – FULL BODY COMPOUND",

       category:"Full Body",

       exercises:[

         "Quads — Squat / Leg Press — 3 — 5–8",

         "Chest — Bench / Incline — 3 — 5–8",

         "Back — Row / Pull-ups — 3 — 6–10",

         "Shoulders — Overhead Press — 2 — 6–8",

         "Ham/Glutes — RDL / Deadlift — 2 — 6–8",

         "Arms — Curl or Pushdown (opt) — 2 — 10–12"

       ]

     },

     {

       name:"TUESDAY – LOWER A (FULL LEGS)",

       category:"Legs",

       exercises:[

         "Quads — Squat / Hack Squat — 4 — 6–8",

         "Quads — Leg Press — 3 — 10",

         "Hamstrings — Romanian Deadlift — 4 — 8",

         "Hamstrings — Ham Curl — 3 — 12",

         "Glutes — Hip Thrust — 3 — 10",

         "Adductors — Adduction Machine — 3 — 15",

         "Abductors — Abduction Machine — 3 — 15"

       ]

     },

     {

       name:"WEDNESDAY – UPPER PUSH",

       category:"Push",

       exercises:[

         "Chest — Bench / Incline Press — 4 — 6–8",

         "Chest — Fly Variation — 3 — 12",

         "Shoulders — OHP / Machine Press — 3 — 8",

         "Shoulders — Lateral Raises — 4 — 12–15",

         "Triceps — Skull Crushers — 3 — 10",

         "Triceps — Rope Pushdowns — 3 — 12"

       ]

     },

     {

       name:"THURSDAY – LOWER B (POSTERIOR)",

       category:"Legs",

       exercises:[

         "Ham/Glutes — Deadlift / RDL — 4 — 6",

         "Glutes — Hip Thrust — 3 — 8",

         "Quads — Bulgarian Split Squat — 3 — 8",

         "Quads — Leg Extension — 3 — 15",

         "Adductors — Adduction Machine — 2 — 15",

         "Abductors — Abduction Machine — 2 — 15"

       ]

     },

     {

       name:"FRIDAY – UPPER PULL + ARMS",

       category:"Pull",

       exercises:[

         "Back — Pull-ups / Pulldowns — 4 — 8–10",

         "Back — Barbell / Cable Rows — 3 — 8–10",

         "Rear Delts — Face Pulls — 3 — 15",

         "Biceps — EZ-Bar Curls — 4 — 8–10",

         "Biceps — Hammer Curls — 3 — 10–12",

         "Triceps — Close-Grip Bench / Dips — 3 — 6–8"

       ]

     }

   ]

 }

];

 

/* =========================

  DOM helpers

========================= */

const $ = (id)=>document.getElementById(id);

const todayISO = ()=> new Date().toISOString().slice(0,10);

 

function setScreen(id){

 ["auth-screen","registration-screen","app","avatar-builder-screen"].forEach(x=>$(x)?.classList.add("hidden"));

 $(id)?.classList.remove("hidden");

}

 

/* =========================

  State

========================= */

let currentUser = null;

let userDoc = null;

 

const LS_ACTIVE = "dw_activePlanState_v2";

let activePlanState = null; // { planId, currentIndex, lastCompletedISO }

let activePlan = null;

 

function loadLocal(key, fallback){

 try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch{ return fallback; }

}

function saveLocal(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

 

function getAllPlans(){ return BUILT_IN_PLANS; }

 

function parseRow(row){

 const parts = row.split("—").map(x=>x.trim());

 if(parts.length<4) return null;

 return { muscle:parts[0], exercise:parts[1], sets:parts[2], reps:parts.slice(3).join(" — ") };

}

 

/* =========================

  Auth bindings

========================= */

$("loginBtn")?.addEventListener("click", async ()=>{

 const email = $("email")?.value?.trim();

 const pass  = $("password")?.value;

 $("auth-warn").textContent="";

 if(!email || !pass) return $("auth-warn").textContent="MISSING CREDENTIALS.";

 try{

   await signInWithEmailAndPassword(auth, email, pass);

 }catch(e){

   $("auth-warn").textContent=(e?.message||"LOGIN FAILED").toUpperCase();

 }

});

 

$("showRegBtn")?.addEventListener("click", ()=> setScreen("registration-screen"));

$("returnToLoginBtn")?.addEventListener("click", ()=> setScreen("auth-screen"));

 

$("nextStepBtn")?.addEventListener("click", async ()=>{

 const em = $("reg-email").value.trim();

 const pw = $("reg-pass").value.trim();

 const c  = $("reg-confirm").value.trim();

 $("reg-warn").textContent="";

 if(!em || !pw) return $("reg-warn").textContent="EMAIL/PASSCODE REQUIRED.";

 if(pw.length<6) return $("reg-warn").textContent="PASSCODE MUST BE 6+ CHARS.";

 if(pw!==c) return $("reg-warn").textContent="PASSCODES DO NOT MATCH.";

 try{

   const cred = await createUserWithEmailAndPassword(auth, em, pw);

   await setDoc(doc(db,"users",cred.user.uid), {

     uid: cred.user.uid,

     email: em,

     username: "SUBJECT",

     createdAt: new Date().toISOString(),

     prs:{},

     trophies:{},

     activePlan:null,

     customAvatar:null,

     avatar:"skull"

   }, { merge:true });

   $("reg-status-chip").textContent="STAGE_2";

   $("reg-step-1").classList.add("hidden");

   $("reg-step-2").classList.remove("hidden");

 }catch(e){

   $("reg-warn").textContent=(e?.message||"REG FAILED").toUpperCase();

 }

});

 

$("finalizeRegBtn")?.addEventListener("click", async ()=>{

 const u = auth.currentUser;

 if(!u) return;

 const callsign = $("reg-username").value.trim();

 if(!callsign || callsign.length<3) return $("reg-warn").textContent="CALLSIGN 3+ CHARS.";

 try{

   await updateDoc(doc(db,"users",u.uid), { username: callsign, updatedAt: new Date().toISOString() });

   setScreen("app");

 }catch(e){

   $("reg-warn").textContent=(e?.message||"FINALIZE FAILED").toUpperCase();

 }

});

 

$("logoutBtn")?.addEventListener("click", async ()=>{ await signOut(auth); });

 

/* =========================

  Plans UI

========================= */

function renderPlanIndex(){

 const wrap = $("plan-index");

 if(!wrap) return;

 const plans = getAllPlans();

 wrap.innerHTML = plans.map(p=>`

   <div class="plan-card" data-pid="${p.id}">

     <div class="plan-name">${p.name}</div>

     <div class="plan-sub">${p.vibe||""}</div>

   </div>

 `).join("");

 wrap.querySelectorAll("[data-pid]").forEach(el=>{

   el.addEventListener("click", ()=>{

     const pid = el.getAttribute("data-pid");

     const plan = plans.find(x=>x.id===pid);

     if(!plan) return;

     activatePlan(plan, 0);

     wrap.querySelectorAll(".plan-card").forEach(x=>x.classList.remove("active"));

     el.classList.add("active");

   });

 });

}

 

function activatePlan(plan, startIndex){

 activePlan = plan;

 activePlanState = { planId: plan.id, currentIndex:startIndex, lastCompletedISO:null };

 saveLocal(LS_ACTIVE, activePlanState);

 $("active-split-label").textContent = plan.name;

 renderToday();

}

 

function hydrateActivePlan(){

 activePlanState = loadLocal(LS_ACTIVE, null);

 const plans = getAllPlans();

 if(activePlanState?.planId){

   activePlan = plans.find(p=>p.id===activePlanState.planId) || null;

 }

}

 

function renderActivePlanStatus(){

 const box = $("active-plan-readout");

 const chip = $("active-day-chip");

 if(!box || !chip) return;

 if(!activePlan || !activePlanState){

   box.innerHTML = "<div class='tiny-warn'>NO_ACTIVE_SPLIT</div>";

   chip.textContent="DAY_?";

   return;

 }

 const idx = activePlanState.currentIndex ?? 0;

 chip.textContent = `DAY_${idx+1}`;

 const day = activePlan.days[idx];

 box.innerHTML = `

   <div class="day-badge">

     <div class="dname">${day.name}</div>

     <div class="dlist">${day.exercises.map(x=>{

       const p=parseRow(x);

       return p ? `${p.muscle} — ${p.exercise} <span class="dim">(${p.sets}×${p.reps})</span>` : x;

     }).join("<br>")}</div>

   </div>

   <div class="btn-row" style="margin-top:10px;">

     <button id="markCompleteBtn" class="mini-btn">MARK_COMPLETE</button>

   </div>

 `;

 $("markCompleteBtn")?.addEventListener("click", finishTodayWorkout);

}

 

function finishTodayWorkout(){

 if(!activePlan || !activePlanState) return;

 activePlanState.currentIndex = (activePlanState.currentIndex + 1) % activePlan.days.length;

 activePlanState.lastCompletedISO = todayISO();

 saveLocal(LS_ACTIVE, activePlanState);

 renderActivePlanStatus();

 renderToday();

}

 

/* =========================

  Today logger (per exercise, per set)

========================= */

async function savePlannedSet(exIndex){

 if(!currentUser) return;

 if(!activePlan || !activePlanState) return;

 

 const idx = activePlanState.currentIndex ?? 0;

 const day = activePlan.days[idx];

 const row = day.exercises[exIndex];

 const p = parseRow(row);

 

 const setNum = Number($("setNum_"+exIndex)?.value || 1);

 const w = Number($("setW_"+exIndex)?.value || 0);

 const reps = Number($("setR_"+exIndex)?.value || 0);

 

 if(!reps) return alert("Enter reps.");

 if(!w) return alert("Enter weight.");

 

 const log = {

   uid: currentUser.uid,

   ts: new Date().toISOString(),

   isoDate: todayISO(),

   planId: activePlan.id,

   planDayIndex: idx,

   planDayName: day.name,

   muscle: p?.muscle || null,

   exercise: p?.exercise || row,

   setsTarget: p?.sets || null,

   repsTarget: p?.reps || null,

   setNum,

   weight: w,

   reps

 };

 

 await addDoc(collection(db,"logs"), log);

 $("savedSets_"+exIndex).textContent = `Saved set ${setNum}: ${w} lbs × ${reps} reps`;

 await loadDailyMassGrave();

}

 

function renderToday(){

 const sub = $("logger-sub");

 const wrap = $("today-exercises");

 if(!sub || !wrap) return;

 

 if(!activePlan || !activePlanState){

   sub.textContent = "Activate a split to load today.";

   wrap.innerHTML = "";

   renderActivePlanStatus();

   return;

 }

 

 const idx = activePlanState.currentIndex ?? 0;

 const day = activePlan.days[idx];

 sub.textContent = day.name;

 

 wrap.innerHTML = day.exercises.map((row,i)=>{

   const p = parseRow(row);

   const title = p ? `${p.muscle} — ${p.exercise}` : row;

   const meta  = p ? `${p.sets} sets • ${p.reps} reps` : "";

   return `

     <div class="today-card">

       <div class="workline-top">

         <div>

           <div class="workline-title">${title}</div>

           <div class="logger-sub">${meta}</div>

         </div>

         <button class="mini-btn" data-toggle="${i}">LOG_SETS</button>

       </div>

 

       <div class="hidden" id="setsBox_${i}">

         <div class="sets-grid">

           <input type="number" inputmode="numeric" placeholder="SET#" min="1" id="setNum_${i}">

           <input type="number" inputmode="decimal" placeholder="LBS" id="setW_${i}">

           <input type="number" inputmode="numeric" placeholder="REPS" id="setR_${i}">

           <button class="mini-btn" data-save="${i}">SAVE</button>

         </div>

         <div class="logger-sub" id="savedSets_${i}"></div>

       </div>

     </div>

   `;

 }).join("");

 

 wrap.querySelectorAll("[data-toggle]").forEach(btn=>{

   btn.addEventListener("click", ()=>{

     const i = Number(btn.getAttribute("data-toggle"));

     $("setsBox_"+i)?.classList.toggle("hidden");

   });

 });

 wrap.querySelectorAll("[data-save]").forEach(btn=>{

   btn.addEventListener("click", ()=>savePlannedSet(Number(btn.getAttribute("data-save"))));

 });

 

 renderActivePlanStatus();

}

 

/* =========================

  MassGrave (PER USER) - daily volume

========================= */

async function loadDailyMassGrave(){

 if(!currentUser) return;

 const day = todayISO();

 const qy = query(collection(db,"logs"), where("uid","==",currentUser.uid), where("isoDate","==",day));

 const snap = await getDocs(qy);

 let vol = 0;

 snap.forEach(d=>{

   const x = d.data();

   const w = Number(x.weight||0);

   const r = Number(x.reps||0);

   vol += (w*r);

 });

 $("massgrave-value").textContent = String(vol);

 const sub = document.querySelector(".massgrave-sub");

 if(sub) sub.textContent = "Total volume lifted today (you)";

}

 

/* =========================

  Avatar Forge (light version)

========================= */

$("openAvatarForgeBtn")?.addEventListener("click", ()=> setScreen("avatar-builder-screen"));

$("closeAvatarForgeBtn")?.addEventListener("click", ()=> setScreen("app"));

 

/* =========================

  Nav tabs

========================= */

document.querySelectorAll(".mini-btn[data-tab]").forEach(btn=>{

 btn.addEventListener("click", ()=>{

   const tab = btn.getAttribute("data-tab");

   ["feed-panel","plans-panel","friends-panel","settings-panel"].forEach(id=>$(id)?.classList.add("hidden"));

   $(tab)?.classList.remove("hidden");

 });

});

 

/* =========================

  Auth state

========================= */

onAuthStateChanged(auth, async (u)=>{

 currentUser = u || null;

 if(!currentUser){

   setScreen("auth-screen");

   return;

 }

 const snap = await getDoc(doc(db,"users",currentUser.uid));

 userDoc = snap.exists()?snap.data():null;

 setScreen("app");

 

 hydrateActivePlan();

 renderPlanIndex();

 renderToday();

 await loadDailyMassGrave();

 

 if(userDoc?.username){

   $("header-callsign").textContent=userDoc.username;

   $("profileUsername").textContent=userDoc.username;

 }

});

 