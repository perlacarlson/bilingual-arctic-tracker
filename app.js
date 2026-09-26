/**
 * Bilingual Articulation & Phonology Session Tracker
 * Designed for Pediatric Speech-Language Pathology Clinical Practicums & CF Practice
 */

// ==========================================
// 1. CLINICAL PRESETS (Bilingual Spanish/English)
// ==========================================
const PRESETS = {
  vibrante_multiple: [
    "ratón (initial /r/)",
    "rana (initial /r/)",
    "reloj (initial /r/)",
    "perro (medial /r/)",
    "carro (medial /r/)",
    "torre (medial /r/)"
  ],
  vibrante_simple: [
    "pera (intervocalic /ɾ/)",
    "cara (intervocalic /ɾ/)",
    "toro (intervocalic /ɾ/)",
    "brazo (cluster /bɾ/)",
    "tren (cluster /tɾ/)",
    "fruta (cluster /fɾ/)"
  ],
  velar_fronting: [
    "casa vs taza (/k/ vs /t/)",
    "capa vs tapa (/k/ vs /t/)",
    "coro vs toro (/k/ vs /t/)",
    "boca vs bota (/k/ vs /t/)",
    "cola vs tola (/k/ vs /t/)"
  ],
  coda_s: [
    "pasto (medial coda /s/)",
    "mosca (medial coda /s/)",
    "estrella (medial coda /s/)",
    "dos (final coda /s/)",
    "lápiz (final coda /s/)",
    "manos (final coda /s/)"
  ]
};

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
let targetWords = [];
let currentWordIndex = 0;
let sessionTrials = [];

// DOM Element References
let wordDisplayEl;
let totalCountEl;
let overallAccEl;
let indAccEl;
let soapOutputEl;
let targetListEl;
let targetCountBadgeEl;
let newWordInputEl;
let bulkWordsInputEl;
let clientIdInputEl;

// ==========================================
// 3. INITIALIZATION
// ==========================================
function init() {
  // Bind DOM Elements
  wordDisplayEl = document.getElementById("word-display");
  totalCountEl = document.getElementById("total-count");
  overallAccEl = document.getElementById("overall-acc");
  indAccEl = document.getElementById("ind-acc");
  soapOutputEl = document.getElementById("soap-output");
  targetListEl = document.getElementById("target-list");
  targetCountBadgeEl = document.getElementById("target-count-badge");
  newWordInputEl = document.getElementById("new-word-input");
  bulkWordsInputEl = document.getElementById("bulk-words-input");
  clientIdInputEl = document.getElementById("client-id-input");

  // Load Cached Data
  loadWordsFromStorage();
  loadTrialsFromStorage();

  // Seed default targets if sound bank is empty
  if (targetWords.length === 0) {
    targetWords = [...PRESETS.vibrante_multiple];
    saveWordsToStorage();
  }

  // Initial UI Render
  renderWordBank();
  updateTargetWordDisplay();
  calculateAndRender();

  // Event Listeners
  if (wordDisplayEl) {
    wordDisplayEl.addEventListener("click", cycleNextWord);
  }

  if (newWordInputEl) {
    newWordInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSingleWord();
    });
  }

  if (clientIdInputEl) {
    clientIdInputEl.addEventListener("input", calculateAndRender);
  }

  // Keyboard Shortcuts for external keyboards / laptops
  window.addEventListener("keydown", handleKeyboardShortcuts);
}

// ==========================================
// 4. WORD BANK MANAGEMENT ENGINE
// ==========================================
function renderWordBank() {
  if (!targetListEl || !targetCountBadgeEl) return;

  targetListEl.innerHTML = "";
  targetCountBadgeEl.textContent = targetWords.length;

  targetWords.forEach((word, index) => {
    const chip = document.createElement("li");
    chip.className = `word-chip ${index === currentWordIndex ? "active" : ""}`;

    const wordText = document.createElement("span");
    wordText.textContent = word;
    wordText.onclick = () => selectWord(index);

    const deleteBtn = document.createElement("span");
    deleteBtn.className = "chip-delete";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "Remove sound target";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteWord(index);
    };

    chip.appendChild(wordText);
    chip.appendChild(deleteBtn);
    targetListEl.appendChild(chip);
  });
}

function selectWord(index) {
  currentWordIndex = index;
  updateTargetWordDisplay();
  renderWordBank();
}

function cycleNextWord() {
  if (targetWords.length === 0) return;
  currentWordIndex = (currentWordIndex + 1) % targetWords.length;
  updateTargetWordDisplay();
  renderWordBank();
}

function prevWord() {
  if (targetWords.length === 0) return;
  currentWordIndex = (currentWordIndex - 1 + targetWords.length) % targetWords.length;
  updateTargetWordDisplay();
  renderWordBank();
}

function updateTargetWordDisplay() {
  if (!wordDisplayEl) return;
  if (targetWords.length === 0) {
    wordDisplayEl.textContent = "(No targets in deck)";
  } else {
    wordDisplayEl.textContent = targetWords[currentWordIndex];
  }
}

function addSingleWord() {
  if (!newWordInputEl) return;
  const val = newWordInputEl.value.trim();
  if (!val) return;

  targetWords.push(val);
  newWordInputEl.value = "";
  saveWordsToStorage();
  renderWordBank();

  if (targetWords.length === 1) {
    selectWord(0);
  }
}

function addBulkWords() {
  if (!bulkWordsInputEl) return;
  const raw = bulkWordsInputEl.value;
  if (!raw.trim()) return;

  const entries = raw
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (entries.length > 0) {
    targetWords.push(...entries);
    bulkWordsInputEl.value = "";
    saveWordsToStorage();
    renderWordBank();
  }
}

function deleteWord(index) {
  targetWords.splice(index, 1);
  if (currentWordIndex >= targetWords.length) {
    currentWordIndex = Math.max(0, targetWords.length - 1);
  }
  saveWordsToStorage();
  updateTargetWordDisplay();
  renderWordBank();
}

function clearAllWords() {
  if (targetWords.length === 0) return;
  if (!confirm("Clear all targets from this sound deck?")) return;

  targetWords = [];
  currentWordIndex = 0;
  saveWordsToStorage();
  updateTargetWordDisplay();
  renderWordBank();
}

function loadPreset(presetKey) {
  if (!PRESETS[presetKey]) return;
  targetWords = [...PRESETS[presetKey]];
  currentWordIndex = 0;
  saveWordsToStorage();
  updateTargetWordDisplay();
  renderWordBank();
}

// ==========================================
// 5. SESSION TRIAL LOGGING
// ==========================================
function logTrial(cueLevel) {
  if (targetWords.length === 0) {
    alert("Please add at least one target word to the deck before logging trials.");
    return;
  }

  const currentWord = targetWords[currentWordIndex];

  const trialRecord = {
    id: Date.now(),
    word: currentWord,
    cueLevel: cueLevel, // 'ind', 'low', 'mod', 'max', 'err'
    isCorrect: cueLevel !== "err",
    timestamp: new Date().toISOString()
  };

  sessionTrials.push(trialRecord);
  saveTrialsToStorage();
  calculateAndRender();
}

function undoLast() {
  if (sessionTrials.length === 0) return;
  sessionTrials.pop();
  saveTrialsToStorage();
  calculateAndRender();
}

function resetSession() {
  if (sessionTrials.length === 0 && (!clientIdInputEl || !clientIdInputEl.value)) return;
  if (confirm("Reset current session data and clear client info?")) {
    sessionTrials = [];
    if (clientIdInputEl) clientIdInputEl.value = "";
    saveTrialsToStorage();
    calculateAndRender();
  }
}

// ==========================================
// 6. CLINICAL METRICS & SOAP COMPILER
// ==========================================
function calculateAndRender() {
  const total = sessionTrials.length;

  if (total === 0) {
    if (totalCountEl) totalCountEl.textContent = "0";
    if (overallAccEl) overallAccEl.textContent = "0%";
    if (indAccEl) indAccEl.textContent = "0%";
    if (soapOutputEl) soapOutputEl.value = "No trials logged for current session.";
    return;
  }

  // Count cueing levels
  let indCount = 0;
  let lowCount = 0;
  let modCount = 0;
  let maxCount = 0;
  let errCount = 0;

  sessionTrials.forEach((t) => {
    switch (t.cueLevel) {
      case "ind": indCount++; break;
      case "low": lowCount++; break;
      case "mod": modCount++; break;
      case "max": maxCount++; break;
      case "err": errCount++; break;
    }
  });

  const correctTotal = indCount + lowCount + modCount + maxCount;
  const overallAccPct = Math.round((correctTotal / total) * 100);
  const indAccPct = Math.round((indCount / total) * 100);

  // Update Metrics Dashboard
  if (totalCountEl) totalCountEl.textContent = total;
  if (overallAccEl) overallAccEl.textContent = `${overallAccPct}%`;
  if (indAccEl) indAccEl.textContent = `${indAccPct}%`;

  // Itemized accuracy per stimulus
  const wordSummaryMap = {};
  sessionTrials.forEach((t) => {
    if (!wordSummaryMap[t.word]) {
      wordSummaryMap[t.word] = { total: 0, correct: 0, ind: 0 };
    }
    wordSummaryMap[t.word].total++;
    if (t.isCorrect) wordSummaryMap[t.word].correct++;
    if (t.cueLevel === "ind") wordSummaryMap[t.word].ind++;
  });

  const stimulusDetails = Object.keys(wordSummaryMap)
    .map((w) => {
      const item = wordSummaryMap[w];
      const pct = Math.round((item.correct / item.total) * 100);
      return `${w}: ${item.correct}/${item.total} (${pct}%, Ind: ${item.ind})`;
    })
    .join("; ");

  // Identify Client Subject
  const rawId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const clientSubject = rawId ? `Client ${rawId}` : "Client";

  // Build Objective (O) Statement formatted for clinical documentation
  const soapString = `Objective: ${clientSubject} completed ${total} articulation/phonology trials targeting bilingual speech goals. Overall stimulus accuracy was ${overallAccPct}% (${correctTotal}/${total}), with ${indAccPct}% independent mastery (${indCount}/${total}). Cue Hierarchy Breakdown: Independent: ${indCount} (${Math.round((indCount / total) * 100)}%), Low/Min: ${lowCount} (${Math.round((lowCount / total) * 100)}%), Moderate: ${modCount} (${Math.round((modCount / total) * 100)}%), Maximal: ${maxCount} (${Math.round((maxCount / total) * 100)}%), Errors: ${errCount} (${Math.round((errCount / total) * 100)}%). Target Breakdown: ${stimulusDetails}.`;

  if (soapOutputEl) {
    soapOutputEl.value = soapString;
  }
}

function copySoapNote() {
  if (sessionTrials.length === 0 || !soapOutputEl) return;
  navigator.clipboard.writeText(soapOutputEl.value).then(() => {
    alert("SOAP Objective note copied to clipboard!");
  }).catch(() => {
    soapOutputEl.select();
    document.execCommand("copy");
    alert("SOAP Objective note copied to clipboard!");
  });
}

// ==========================================
// 7. CLINICAL CSV EXPORT ENGINE
// ==========================================
function exportToCSV() {
  if (sessionTrials.length === 0) {
    alert("No trials logged in this session to export.");
    return;
  }

  const cueLabels = {
    ind: "Independent",
    low: "Low / Minimal Cue",
    mod: "Moderate Cue",
    max: "Maximal Cue",
    err: "Incorrect / Error"
  };

  const rawClientId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const cleanClientId = rawClientId.replace(/[^a-zA-Z0-9_-]/g, "");
  const clientDisplay = cleanClientId || "De-identified";

  // Column Headers
  const headers = [
    "Trial #",
    "Timestamp (ISO)",
    "Time (Local)",
    "Target Stimulus",
    "Cue Level",
    "Scoring Result",
    "Numeric Accuracy (0/1)"
  ];

  // Data Rows
  const rows = sessionTrials.map((t, index) => {
    const trialDate = new Date(t.timestamp);
    const localTime = trialDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const cleanWord = `"${t.word.replace(/"/g, '""')}"`;
    const cleanCue = `"${cueLabels[t.cueLevel] || t.cueLevel}"`;
    const resultText = t.isCorrect ? "Correct" : "Incorrect";
    const binaryScore = t.isCorrect ? 1 : 0;

    return [
      index + 1,
      t.timestamp,
      `"${localTime}"`,
      cleanWord,
      cleanCue,
      resultText,
      binaryScore
    ].join(",");
  });

  // Session Summary Metadata Header
  const total = sessionTrials.length;
  const correctTotal = sessionTrials.filter((t) => t.isCorrect).length;
  const indTotal = sessionTrials.filter((t) => t.cueLevel === "ind").length;
  const overallPct = Math.round((correctTotal / total) * 100);
  const indPct = Math.round((indTotal / total) * 100);

  const summaryRows = [
    `# BILINGUAL ARTICULATION & PHONOLOGY TRIAL LOG`,
    `# Client Code / ID,${clientDisplay}`,
    `# Session Date,${new Date().toLocaleDateString()}`,
    `# Total Trials,${total}`,
    `# Overall Accuracy,${overallPct}% (${correctTotal}/${total})`,
    `# Independent Mastery,${indPct}% (${indTotal}/${total})`,
    `#`
  ];

  // Prepend \uFEFF (UTF-8 Byte Order Mark) for Excel Spanish accent integrity
  const csvContent = "\uFEFF" + [
    summaryRows.join("\n"),
    headers.join(","),
    rows.join("\n")
  ].join("\n");

  // Dynamic timestamped filename
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");

  const filePrefix = cleanClientId ? `Artic_Trials_${cleanClientId}` : `Artic_Trials`;
  const fileName = `${filePrefix}_${dateStr}_${timeStr}.csv`;

  // Trigger browser file download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// 8. STORAGE PERSISTENCE
// ==========================================
function saveWordsToStorage() {
  try {
    localStorage.setItem("artic_custom_deck", JSON.stringify(targetWords));
  } catch (e) {
    console.warn("Could not save sound deck to localStorage.", e);
  }
}

function loadWordsFromStorage() {
  try {
    const cached = localStorage.getItem("artic_custom_deck");
    if (cached) targetWords = JSON.parse(cached);
  } catch (e) {
    targetWords = [];
  }
}

function saveTrialsToStorage() {
  try {
    localStorage.setItem("artic_tracker_trials", JSON.stringify(sessionTrials));
  } catch (e) {
    console.warn("Could not save session trials to localStorage.", e);
  }
}

function loadTrialsFromStorage() {
  try {
    const cached = localStorage.getItem("artic_tracker_trials");
    if (cached) sessionTrials = JSON.parse(cached);
  } catch (e) {
    sessionTrials = [];
  }
}

// ==========================================
// 9. KEYBOARD SHORTCUTS
// ==========================================
function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.key) {
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
      e.preventDefault();
      cycleNextWord();
      break;
    case "ArrowLeft":
      e.preventDefault();
      prevWord();
      break;
  }
}

// Launch application on DOM ready
window.addEventListener("DOMContentLoaded", init);