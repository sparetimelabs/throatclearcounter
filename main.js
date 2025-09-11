import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
const adOverlay = document.getElementById("adOverlay");
const closeAd = document.getElementById("closeAd");
const adImage = document.getElementById("adImage");

// === Settings ===
const TEST_MODE = false;  // set to false for real use, simply a tester to test functionality without locking out
const TEST_DAY = 2;      // Tuesday test condition 
let count = 0;
let sessionTimer;
let timeLeft = TEST_MODE ? 10 : 5400; // 10s test / 1.5h real

// === Helpers ===
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// === Firebase data segregation helpers ===
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

// === Fake Ad Overlay Logic ===
window.addEventListener("load", () => {
  adOverlay.style.display = "flex"; // fade in
});

// Close ad when clicking X
closeAd.addEventListener("click", () => {
  adOverlay.style.display = "none";
});

// Enlarge ad image
adImage.addEventListener("click", () => {
  adImage.classList.toggle("enlarged");
});

// === Countdown Timer ===
function startCountdown() {
  sessionTimer = setInterval(async () => {
    if (timeLeft <= 0) {
      clearInterval(sessionTimer);
      countBtn.disabled = true;
      timerDisplay.textContent = "Session Over";

      // === Send session count to Firestore ===
      const now = new Date();
      const dateStr = getLocalDateString(now);
      const weekNum = getWeekNumber(now);
      const year = now.getFullYear();
      const weekFolder = `week_${weekNum}_${year}`;

      const weekDocRef = doc(db, "throat_clears", weekFolder);
      const dailyCollectionRef = collection(weekDocRef, "days");
      const dailyDocRef = doc(dailyCollectionRef, dateStr);

      // store this session’s count separately in "sessions" subcollection
      const sessionDocRef = doc(collection(dailyDocRef, "sessions"));
      await setDoc(sessionDocRef, {
        count,
        timestamp: serverTimestamp()
      });

      // recompute median after saving
      await updateMedian(dailyDocRef);

      return;
    }
    timeLeft--;
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
  }, 1000);
}

// === Median Calculation ===
async function updateMedian(dailyDocRef) {
  const sessionsSnap = await getDocs(collection(dailyDocRef, "sessions"));
  const values = [];
  sessionsSnap.forEach(doc => values.push(doc.data().count));

  if (values.length === 0) return;

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  let median;
  if (values.length % 2 === 0) {
    median = (values[mid - 1] + values[mid]) / 2;
  } else {
    median = values[mid];
  }

  // save median into daily doc
  await setDoc(dailyDocRef, { median }, { merge: true });
}

// === Daily Math Quotes ===
const quotes = [
  "Mathematics is not about numbers, equations, or algorithms: it is about understanding. – William Paul Thurston",
  "Do not worry about your difficulties in mathematics; I assure you mine are greater. – Albert Einstein",
  "Pure mathematics is, in its way, the poetry of logical ideas. – Albert Einstein",
  "Mathematics is the language in which God has written the universe. – Galileo Galilei",
  "The only way to learn mathematics is to do mathematics. – Paul Halmos",
  "It always seems impossible until it’s done. – Nelson Mandela",
  "Go down deep enough into anything and you will find mathematics. – Dean Schlicter",
  "Success in math is about persistence, not genius.",
  "If no one told you today: you're doing amazing!",
  "Be kind to yourself today! You're trying and that's enough!",
  "Progress is progress. Keep at it!"
];

function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24
  );
  return quotes[dayOfYear % quotes.length];
}

document.getElementById("dailyQuote").textContent = getDailyQuote();

// === Easter Egg Logic ===
const easterEggs = {
  5: "Achievement unlocked: Sensitive ears 👂",
  10: "Double digits! 🎉",
  20: "Dedicated Listener Award 🏆",
  42: "The answer to life, the universe, and everything 🤖",
  69: "Nice. 😏",
  100: "You win. 🥇"
};

function showEasterEgg(message) {
  const popup = document.getElementById("easterEggPopup");
  const msg = document.getElementById("easterEggMessage");
  msg.textContent = message;

  popup.style.display = "block";
  popup.classList.add("show");

  // hide after 3 seconds
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.style.display = "none", 500);
  }, 3000);
}

// === Click Event: Increment Local Counter ===
countBtn.addEventListener("click", () => {
  count++;
  countDisplay.textContent = count;

  // Check for Easter Egg
  if (easterEggs[count]) {
    showEasterEgg(easterEggs[count]);
  }
});
