// --- BILINGUAL SOUND TARGETS ---
const DEFAULT_TARGETS = [
  "ratón (initial /r/)",
  "rana (initial /r/)",
  "perro (medial /r/)",
  "casa (initial /k/)",
  "taza (initial /t/)",
  "sapo (initial /s/)",
  "sol (coda /l/)",
  "flor (cluster /fl/)"
];

// --- APPLICATION STATE ---
let targetWords = [...DEFAULT_TARGETS];
let currentWordIndex = 0;
let sessionTrials = [];

// DOM References
const wordDisplayEl = document.getElementById("word-display");
const totalCountEl = document.getElementById("total-count");
const overallAccEl = document.getElementById("overall-acc");
const indAccEl = document.getElementById("ind-acc");
const soapOutputEl = document.getElementById("soap-output");

// --- INITIALIZATION ---
function init() {
  loadFromStorage();
  updateTargetWordDisplay();
  calculateAndRender();

  // Allow clicking target word to cycle through list
  wordDisplayEl.addEventListener("click", cycleNextWord);

  // Keyboard accessibility for desktop / external iPad keyboards
  window.addEventListener("keydown", handleKeyboardShortcuts);
}

// --- LOGGING ENGINE ---
function logTrial(cueLevel) {
  const currentWord = targetWords[currentWordIndex];
  
  const trialRecord = {
    id: Date.now(),
    word: currentWord,
    cueLevel: cueLevel, // 'ind', 'low', 'mod', 'max', 'err'
    isCorrect: cueLevel !== 'err',
    timestamp: new Date().toISOString()
  };

  sessionTrials.push(trialRecord);
  saveToStorage();
  calculateAndRender();
}

function undoLast() {
  if (sessionTrials.length === 0) return;
  sessionTrials.pop();
  saveToStorage();
  calculateAndRender();
}

function resetSession() {
  if (sessionTrials.length === 0) return;
  const confirmClear = confirm("Are you sure you want to reset this session data?");
  if (confirmClear) {
    sessionTrials = [];
    saveToStorage();
    calculateAndRender();
  }
}

function cycleNextWord() {
  currentWordIndex = (currentWordIndex + 1) % targetWords.length;
  updateTargetWordDisplay();
}

function updateTargetWordDisplay() {
  wordDisplayEl.textContent = targetWords[currentWordIndex];
}

// --- CLINICAL METRICS & SOAP GENERATION ---
function calculateAndRender() {
  const total = sessionTrials.length;

  if (total === 0) {
    totalCountEl.textContent = "0";
    overallAccEl.textContent = "0%";
    indAccEl.textContent = "0%";
    soapOutputEl.value = "No trials logged for current session.";
    return;
  }

  // Count instances across cue hierarchy
  let indCount = 0;
  let lowCount = 0;
  let modCount = 0;
  let maxCount = 0;
  let errCount = 0;

  sessionTrials.forEach(t => {
    switch (t.cueLevel) {
      case 'ind': indCount++; break;
      case 'low': lowCount++; break;
      case 'mod': modCount++; break;
      case 'max': maxCount++; break;
      case 'err': errCount++; break;
    }
  });

  const correctTotal = indCount + lowCount + modCount + maxCount;
  const overallAccPct = Math.round((correctTotal / total) * 100);
  const indAccPct = Math.round((indCount / total) * 100);

  // Update UI Counters
  totalCountEl.textContent = total;
  overallAccEl.textContent = `${overallAccPct}%`;
  indAccEl.textContent = `${indAccPct}%`;

  // Aggregate item-level accuracy
  const wordSummaryMap = {};
  sessionTrials.forEach(t => {
    if (!wordSummaryMap[t.word]) {
      wordSummaryMap[t.word] = { total: 0, correct: 0 };
    }
    wordSummaryMap[t.word].total++;
    if (t.isCorrect) wordSummaryMap[t.word].correct++;
  });

  const stimulusDetails = Object.keys(wordSummaryMap)
    .map(w => `${w}: ${wordSummaryMap[w].correct}/${wordSummaryMap[w].total} (${Math.round((wordSummaryMap[w].correct / wordSummaryMap[w].total) * 100)}%)`)
    .join(", ");

  // Compile Objective (O) Statement formatted for clinical EHR
  const soapString = `Objective: Client participated in ${total} articulation trials across structured speech activities. Overall stimulus accuracy was ${overallAccPct}% (${correctTotal}/${total}), with ${indAccPct}% independent mastery (${indCount}/${total}). Cueing breakdown: Independent: ${indCount} (${Math.round((indCount / total) * 100)}%), Low/Min: ${lowCount} (${Math.round((lowCount / total) * 100)}%), Moderate: ${modCount} (${Math.round((modCount / total) * 100)}%), Maximal: ${maxCount} (${Math.round((maxCount / total) * 100)}%), Incorrect: ${errCount} (${Math.round((errCount / total) * 100)}%). Target accuracy breakdown: ${stimulusDetails}.`;

  soapOutputEl.value = soapString;
}

// --- LOCAL STORAGE PERSISTENCE ---
function saveToStorage() {
  try {
    localStorage.setItem("artic_tracker_trials", JSON.stringify(sessionTrials));
  } catch (e) {
    console.warn("Storage quota exceeded or private mode enabled.", e);
  }
}

function loadFromStorage() {
  try {
    const cached = localStorage.getItem("artic_tracker_trials");
    if (cached) {
      sessionTrials = JSON.parse(cached);
    }
  } catch (e) {
    sessionTrials = [];
  }
}

// --- HARDWARE FAST-KEYS ---
function handleKeyboardShortcuts(event) {
  // Prevent shortcut firing when interacting with text inputs
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

  switch (event.key) {
    case "1": logTrial("ind"); break;
    case "2": logTrial("low"); break;
    case "3": logTrial("mod"); break;
    case "4": logTrial("max"); break;
    case "0":
    case "-": logTrial("err"); break;
    case "u":
    case "U": undoLast(); break;
    case " ":
    case "ArrowRight":
      event.preventDefault();
      cycleNextWord();
      break;
  }
}

// Launch application
window.addEventListener("DOMContentLoaded", init);