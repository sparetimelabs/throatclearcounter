import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyD3bBrwXPncpMjpxVSYNeDiRhtwMD8Gr1I",
  authDomain: "throat-clear-counter.firebaseapp.com",
  projectId: "throat-clear-counter",
  storageBucket: "throat-clear-counter.appspot.com",
  messagingSenderId: "417577982859",
  appId: "1:417577982859:web:58f4d58fafedaec8aaad8e",
  measurementId: "G-WWR8QGZ6GQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === DOM Elements ===
const disclaimerScreen = document.getElementById("disclaimerScreen");
const counterScreen = document.getElementById("counterScreen");
const startBtn = document.getElementById("startSessionBtn");
const countBtn = document.getElementById("countBtn");
const countDisplay = document.getElementById("count");
const timerDisplay = document.getElementById("timer");
const overlay = document.getElementById("notLectureDayOverlay");

// === Settings ===
const TEST_MODE = false;  // set to true for testing
const TEST_DAY = 2;        // used if TEST_MODE true, 2=Tuesday
let count = 0;
let sessionTimer;
let timeLeft = TEST_MODE ? 10 : 5400; // 10 sec test / 1.5h real

// === Helpers ===
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekNumber(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function isLectureDay(date = new Date()) {
  const day = date.getDay();
  if (TEST_MODE) return TEST_DAY === 2 || TEST_DAY === 4;
  return day === 2 || day === 4;
}

// === Overlay check ===
if (!isLectureDay()) {
  overlay.style.display = "flex";
  counterScreen.style.display = "none";
  disclaimerScreen.style.display = "none";
} else {
  overlay.style.display = "none";
  counterScreen.style.display = "none"; // only show after disclaimer
}

// === Start Session ===
startBtn.addEventListener("click", () => {
  if (!isLectureDay()) {
    alert("This app only works on Tuesdays and Thursdays.");
    return;
  }

  disclaimerScreen.style.display = "none";
  counterScreen.style.display = "block";
  countBtn.disabled = false;

  startCountdown();
});

// === Countdown Timer ===
function startCountdown() {
  sessionTimer = setInterval(async () => {
    if (timeLeft <= 0) {
      clearInterval(sessionTimer);
      countBtn.disabled = true;
      timerDisplay.textContent = "Session Over";

      // === Send total count to Firestore once ===
      const now = new Date();
      const dateStr = getLocalDateString(now);
      const weekNum = getWeekNumber(now);
      const year = now.getFullYear();
      const weekFolder = `week_${weekNum}_${year}`;

      const weekDocRef = doc(db, "throat_clears", weekFolder);
      const dailyDocRef = doc(collection(weekDocRef, "days"), dateStr);

      await setDoc(dailyDocRef, {
        date: dateStr,
        count: increment(count),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      return;
    }
    timeLeft--;
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
  }, 1000);
}

// === Click Event: Increment Local Counter ===
countBtn.addEventListener("click", () => {
  count++;
  countDisplay.textContent = count;
});
