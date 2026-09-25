// --- CLINICAL PRESETS FOR BILINGUAL SPANISH ---
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

// --- APP STATE ---
let targetWords = [];
let currentWordIndex = 0;
let sessionTrials = [];

// DOM References
const wordDisplayEl = document.getElementById("word-display");
const totalCountEl = document.getElementById("total-count");
const overallAccEl = document.getElementById("overall-acc");
const indAccEl = document.getElementById("ind-acc");
const soapOutputEl = document.getElementById("soap-output");
const targetListEl = document.getElementById("target-list");
const targetCountBadgeEl = document.getElementById("target-count-badge");
const newWordInputEl = document.getElementById("new-word-input");
const bulkWordsInputEl = document.getElementById("bulk-words-input");

// --- INITIALIZATION ---
function init() {
  loadWordsFromStorage();
  loadTrialsFromStorage();
  
  if (targetWords.length === 0) {
    targetWords = [...PRESETS.vibrante_multiple];
    saveWordsToStorage();
  }

  renderWordBank();
  updateTargetWordDisplay();
  calculateAndRender();

  // Allow clicking target word on banner to cycle
  wordDisplayEl.addEventListener("click", cycleNextWord);

  // Enter key trigger for single input
  newWordInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addSingleWord();
  });

  // Global fast-keys
  window.addEventListener("keydown", handleKeyboardShortcuts);
}

// --- WORD BANK MANAGEMENT ---
function renderWordBank() {
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
  if (targetWords.length === 0) {
    wordDisplayEl.textContent = "(No targets in deck)";
  } else {
    wordDisplayEl.textContent = targetWords[currentWordIndex];
  }
}

function addSingleWord() {
  const val = newWordInputEl.value.trim();
  if (!val) return;
  targetWords.push(val);
  newWordInputEl.value = "";
  saveWordsToStorage();
  renderWordBank();
  if (targetWords.length === 1) selectWord(0);
}

function addBulkWords() {
  const raw = bulkWordsInputEl.value;
  if (!raw.trim()) return;

  // Split by comma or newline
  const entries = raw
    .split(/[\n,]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

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
  if (!confirm("Are you sure you want to clear all targets from this sound deck?")) return;
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

// --- LOGGING ENGINE ---
function logTrial(cueLevel) {
  if (targetWords.length === 0) {
    alert("Please add at least one target word to the sound deck before logging trials.");
    return;
  }

  const currentWord = targetWords[currentWordIndex];
  
  const trialRecord = {
    id: Date.now(),
    word: currentWord,
    cueLevel: cueLevel,
    isCorrect: cueLevel !== 'err',
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
  if (sessionTrials.length === 0) return;
  if (confirm("Reset current session data?")) {
    sessionTrials = [];
    saveTrialsToStorage();
    calculateAndRender();
  }
}

// --- SOAP NOTE CALCULATION & EXPORT ---
function calculateAndRender() {
  const total = sessionTrials.length;

  if (total === 0) {
    totalCountEl.textContent = "0";
    overallAccEl.textContent = "0%";
    indAccEl.textContent = "0%";
    soapOutputEl.value = "No trials logged for current session.";
    return;
  }

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

  totalCountEl.textContent = total;
  overallAccEl.textContent = `${overallAccPct}%`;
  indAccEl.textContent = `${indAccPct}%`;

  // Itemized breakdown
  const wordSummaryMap = {};
  sessionTrials.forEach(t => {
    if (!wordSummaryMap[t.word]) {
      wordSummaryMap[t.word] = { total: 0, correct: 0, ind: 0 };
    }
    wordSummaryMap[t.word].total++;
    if (t.isCorrect) wordSummaryMap[t.word].correct++;
    if (t.cueLevel === 'ind') wordSummaryMap[t.word].ind++;
  });

  const stimulusDetails = Object.keys(wordSummaryMap)
    .map(w => `${w}: ${wordSummaryMap[w].correct}/${wordSummaryMap[w].total} (${Math.round((wordSummaryMap[w].correct / wordSummaryMap[w].total) * 100)}%, Ind: ${wordSummaryMap[w].ind})`)
    .join("; ");

  const soapString = `Objective: Client completed ${total} articulation/phonology trials targeting bilingual speech goals. Overall stimulus accuracy: ${overallAccPct}% (${correctTotal}/${total}), with ${indAccPct}% independent mastery (${indCount}/${total}). Cue Hierarchy: Independent: ${indCount} (${Math.round((indCount / total) * 100)}%), Low/Min: ${lowCount} (${Math.round((lowCount / total) * 100)}%), Moderate: ${modCount} (${Math.round((modCount / total) * 100)}%), Maximal: ${maxCount} (${Math.round((maxCount / total) * 100)}%), Errors: ${errCount} (${Math.round((errCount / total) * 100)}%). Target Breakdown: ${stimulusDetails}.`;

  soapOutputEl.value = soapString;
}

function copySoapNote() {
  if (sessionTrials.length === 0) return;
  navigator.clipboard.writeText(soapOutputEl.value).then(() => {
    alert("SOAP Objective note copied to clipboard!");
  });
}

// --- STORAGE PERSISTENCE ---
function saveWordsToStorage() {
  localStorage.setItem("artic_custom_deck", JSON.stringify(targetWords));
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
  localStorage.setItem("artic_tracker_trials", JSON.stringify(sessionTrials));
}

function loadTrialsFromStorage() {
  try {
    const cached = localStorage.getItem("artic_tracker_trials");
    if (cached) sessionTrials = JSON.parse(cached);
  } catch (e) {
    sessionTrials = [];
  }
}

// --- KEYBOARD ACCESSIBILITY ---
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

// --- CLINICAL CSV EXPORT ENGINE ---
function exportToCSV() {
  if (sessionTrials.length === 0) {
    alert("No trials logged in this session to export.");
    return;
  }

  // Clinical label mappings for clean documentation
  const cueLabels = {
    ind: "Independent",
    low: "Low / Minimal Cue",
    mod: "Moderate Cue",
    max: "Maximal Cue",
    err: "Incorrect / Error"
  };

  // 1. Define CSV Column Headers
  const headers = [
    "Trial #",
    "Timestamp (ISO)",
    "Time (Local)",
    "Target Stimulus",
    "Cue Level",
    "Scoring Result",
    "Numeric Accuracy (0/1)"
  ];

  // 2. Format trial rows
  const rows = sessionTrials.map((t, index) => {
    const trialDate = new Date(t.timestamp);
    const localTime = trialDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Sanitize any quotes or commas in word names
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

  // 3. Add Session Summary Header at the top
  const total = sessionTrials.length;
  const correctTotal = sessionTrials.filter(t => t.isCorrect).length;
  const indTotal = sessionTrials.filter(t => t.cueLevel === 'ind').length;
  const overallPct = Math.round((correctTotal / total) * 100);
  const indPct = Math.round((indTotal / total) * 100);

  const summaryRows = [
    `# BILINGUAL ARTICULATION & PHONOLOGY TRIAL LOG`,
    `# Session Date,${new Date().toLocaleDateString()}`,
    `# Total Trials,${total}`,
    `# Overall Accuracy,${overallPct}% (${correctTotal}/${total})`,
    `# Independent Mastery,${indPct}% (${indTotal}/${total})`,
    `#` // Blank spacer line
  ];

  // 4. Combine with UTF-8 BOM (\uFEFF) to preserve Spanish characters in Excel
  const csvContent = "\uFEFF" + [
    summaryRows.join("\n"),
    headers.join(","),
    rows.join("\n")
  ].join("\n");

  // 5. Generate ISO-based timestamp for filename (e.g., Artic_Trials_2026-09-25_143022.csv)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  const fileName = `Artic_Trials_${dateStr}_${timeStr}.csv`;

  // 6. Trigger Browser File Download
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
}

window.addEventListener("DOMContentLoaded", init);