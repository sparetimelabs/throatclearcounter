// === Firebase Import ===
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { 
  getFirestore, collection, doc, setDoc, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { 
  getAuth, signInAnonymously 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// === Firebase Config ===
/*
API keys are meant to be shown, server side auth and security has been implemented. 
*/
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
const auth = getAuth();
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
// Toggle this ON for short testing flows
const TEST_MODE = false;   // <<< SET to true for testing
const TEST_START_DELAY = 5; // seconds until "lecture starts" in TEST_MODE
const SESSION_DURATION = TEST_MODE ? 10 : 4800; // 10s test / 1h20 real
let count = 0;
let sessionTimer;
let timeLeft = SESSION_DURATION;

signInAnonymously(auth)
.then(() => console.log("Signed in anon"))
.catch(err => console.error(err));

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
  if (TEST_MODE) return true; // always lecture day in testing
  const day = date.getDay();
  return day === 2 || day === 4; // Tue or Thu
}

// === Overlay Countdown (handles real + test) ===
function updateCountdown() {
  const countdownEl = document.getElementById("countdown");
  const now = new Date();
  let diff;

  if (TEST_MODE) {
    diff = TEST_START_DELAY * 1000 - (now - window._testStartTime);
  } else {
    const lectureDays = [2, 4]; // Tue, Thu
    const today = now.getDay();
    let nextLecture = new Date(now);
    let daysToAdd = 0;

    for (let i = 0; i <= 7; i++) {
      const checkDay = (today + i) % 7;
      if (lectureDays.includes(checkDay)) {
        if (i === 0 && now.getHours() >= 14) continue; // skip if past 2pm today
        daysToAdd = i;
        break;
      }
    }

    nextLecture.setDate(now.getDate() + daysToAdd);
    nextLecture.setHours(14, 0, 0, 0); // 2:00 PM
    diff = nextLecture - now;
  }

  if (diff <= 0) {
    // Fade out overlay
    overlay.style.transition = "opacity 1s ease";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
      disclaimerScreen.style.display = "block";
    }, 1000);
    return;
  }

  // Calculate time pieces
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds / (60 * 60)) % 24);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const seconds = totalSeconds % 60;

  // Decide format
  // Shows up as 4 days 4 hours? Calculation is wrong
  if (days > 0) {
    // Show in "X days, Y hours"
    countdownEl.textContent = `${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    // Show as HH:MM:SS
    countdownEl.textContent = 
      `${hours.toString().padStart(2,"0")}:${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
  }
}

// === Start Session ===
startBtn.addEventListener("click", () => {
  if (!isLectureDay() && !TEST_MODE) {
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
  adOverlay.style.display = "flex"; 
  if (TEST_MODE) {
    window._testStartTime = new Date();
    overlay.style.display = "flex";
  } else if (!isLectureDay()) {
    overlay.style.display = "flex";
    counterScreen.style.display = "none";
    disclaimerScreen.style.display = "none";
  }
  setInterval(updateCountdown, 1000);
  updateCountdown();
});

closeAd.addEventListener("click", () => adOverlay.style.display = "none");
adImage.addEventListener("click", () => adImage.classList.toggle("enlarged"));

// === Countdown Timer (session) ===
function startCountdown() {
  sessionTimer = setInterval(async () => {
    if (timeLeft <= 0) {
      clearInterval(sessionTimer);
      countBtn.disabled = true;
      timerDisplay.textContent = "Session Over";

      // Save to Firestore
      const now = new Date();
      const dateStr = getLocalDateString(now);
      const weekNum = getWeekNumber(now);
      const year = now.getFullYear();
      const weekFolder = `week_${weekNum}_${year}`;

      const weekDocRef = doc(db, "throat_clears", weekFolder);
      const dailyCollectionRef = collection(weekDocRef, "days");
      const dailyDocRef = doc(dailyCollectionRef, dateStr);

      const sessionDocRef = doc(collection(dailyDocRef, "sessions"));
      await setDoc(sessionDocRef, { count, timestamp: serverTimestamp() });

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
/*
Suppose that the sessions subcollection has counts in a 1 dimensional array: 

[5, 8, 3, 7]

The function sorts this array using the values.sort() function.
A compare function is also added:

(a, b) => a - b.

If the result is negative, a comes before b. 
If its zero, they are equal (i.e. order unchaged). 
If its positive, b comes before a: 

[3, 5, 7, 8]

Since this array has an even number of integer elements, the median is found by getting the sum of "middle two" 
and dividing by two: 

(5+7)/ 2 = 12/2 = 6
*/


async function updateMedian(dailyDocRef) {
  const sessionsSnap = await getDocs(collection(dailyDocRef, "sessions"));
  const values = [];
  sessionsSnap.forEach(doc => values.push(doc.data().count));

  if (values.length === 0) return;

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];

  await setDoc(dailyDocRef, { median }, { merge: true });
}

// === Daily Math Quotes ===
const quotes = [
  "Mathematics is not about numbers, equations, or algorithms: it is about understanding. – William Thurston",
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

// === Easter Eggs ===
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

  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.style.display = "none", 500);
  }, 3000);
}

// === Counting (button + spacebar) ===
function incrementCount() {
  count++;
  countDisplay.textContent = count;
  if (easterEggs[count]) showEasterEgg(easterEggs[count]);
}

countBtn.addEventListener("click", incrementCount);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !countBtn.disabled) {
    e.preventDefault();
    incrementCount();
  }
});
