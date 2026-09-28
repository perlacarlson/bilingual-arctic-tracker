/**
 * Bilingual Artic & Phonology Session Tracker
 * Full Support for Sound-Only Tracking, Dynamic Trial Blocks, & Language Modes
 */

// ==========================================
// 1. STATE MANAGEMENT
// ==========================================
let currentLanguage = "Spanish Only";
let sessionTrials = [];

// DOM References
let targetSoundInputEl;
let targetWordInputEl;
let clientIdInputEl;
let targetTrialsInputEl;
let progressBarFillEl;
let trialCountDisplayEl;
let overallAccEl;
let indAccEl;
let soapOutputEl;
let trialLedgerBodyEl;
let ledgerCountEl;

// ==========================================
// 2. INITIALIZATION
// ==========================================
function init() {
  targetSoundInputEl = document.getElementById("target-sound-input");
  targetWordInputEl = document.getElementById("target-word-input");
  clientIdInputEl = document.getElementById("client-id-input");
  targetTrialsInputEl = document.getElementById("target-trials-input");
  progressBarFillEl = document.getElementById("progress-bar-fill");
  trialCountDisplayEl = document.getElementById("trial-count-display");
  overallAccEl = document.getElementById("overall-acc");
  indAccEl = document.getElementById("ind-acc");
  soapOutputEl = document.getElementById("soap-output");
  trialLedgerBodyEl = document.getElementById("trial-ledger-body");
  ledgerCountEl = document.getElementById("ledger-count");

  loadTrialsFromStorage();
  loadLanguageFromStorage();

  calculateAndRender();
  renderLedger();

  // Listeners for dynamic updates
  if (clientIdInputEl) clientIdInputEl.addEventListener("input", calculateAndRender);
  if (targetTrialsInputEl) targetTrialsInputEl.addEventListener("input", calculateAndRender);
  if (targetSoundInputEl) targetSoundInputEl.addEventListener("input", calculateAndRender);

  window.addEventListener("keydown", handleKeyboardShortcuts);
}

// ==========================================
// 3. LANGUAGE MODE & QUICK SOUNDS
// ==========================================
function setLanguageContext(langString) {
  currentLanguage = langString;
  localStorage.setItem("artic_current_lang", langString);

  document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.remove("active"));
  if (langString === "Spanish Only") document.getElementById("btn-lang-es")?.classList.add("active");
  if (langString === "English Only") document.getElementById("btn-lang-en")?.classList.add("active");
  if (langString === "Bilingual (Both)") document.getElementById("btn-lang-bi")?.classList.add("active");

  calculateAndRender();
}

function quickSelectSound(soundName) {
  if (targetSoundInputEl) {
    targetSoundInputEl.value = soundName;
    calculateAndRender();
  }
}

// ==========================================
// 4. LOGGING ENGINE (ZERO-WORD BLOCKERS)
// ==========================================
function logTrial(cueLevel) {
  // Grab active sound or provide default probe name
  let activeSound = targetSoundInputEl ? targetSoundInputEl.value.trim() : "";
  if (!activeSound) activeSound = "General Sound Probe";

  // Grab optional word (can be blank)
  const activeWord = targetWordInputEl ? targetWordInputEl.value.trim() : "";

  const trialRecord = {
    id: Date.now(),
    sound: activeSound,
    word: activeWord,
    lang: currentLanguage,
    cueLevel: cueLevel,
    isCorrect: cueLevel !== "err",
    timestamp: new Date().toISOString()
  };

  sessionTrials.push(trialRecord);
  saveTrialsToStorage();
  calculateAndRender();
  renderLedger();

  // Scroll ledger to latest entry
  const container = document.querySelector(".trial-ledger-scroll");
  if (container) container.scrollTop = container.scrollHeight;
}

function undoLast() {
  if (sessionTrials.length === 0) return;
  sessionTrials.pop();
  saveTrialsToStorage();
  calculateAndRender();
  renderLedger();
}

function resetSession() {
  if (sessionTrials.length === 0 && (!clientIdInputEl || !clientIdInputEl.value)) return;
  if (confirm("Reset current session data and clear client info?")) {
    sessionTrials = [];
    if (clientIdInputEl) clientIdInputEl.value = "";
    saveTrialsToStorage();
    calculateAndRender();
    renderLedger();
  }
}

// ==========================================
// 5. RETROACTIVE IN-PLACE EDITING
// ==========================================
function updateTrialSound(index, newSound) {
  if (sessionTrials[index]) {
    sessionTrials[index].sound = newSound.trim() || "General Sound";
    saveTrialsToStorage();
    calculateAndRender();
  }
}

function updateTrialWord(index, newWord) {
  if (sessionTrials[index]) {
    sessionTrials[index].word = newWord.trim();
    saveTrialsToStorage();
    calculateAndRender();
  }
}

function updateTrialCue(index, newCue) {
  if (sessionTrials[index]) {
    sessionTrials[index].cueLevel = newCue;
    sessionTrials[index].isCorrect = newCue !== "err";
    saveTrialsToStorage();
    calculateAndRender();
  }
}

function deleteSingleTrial(index) {
  sessionTrials.splice(index, 1);
  saveTrialsToStorage();
  calculateAndRender();
  renderLedger();
}

function renderLedger() {
  if (!trialLedgerBodyEl || !ledgerCountEl) return;
  ledgerCountEl.textContent = sessionTrials.length;

  if (sessionTrials.length === 0) {
    trialLedgerBodyEl.innerHTML = `<tr><td colspan="6" class="empty-ledger-msg">No trials recorded yet.</td></tr>`;
    return;
  }

  trialLedgerBodyEl.innerHTML = "";

  sessionTrials.forEach((trial, index) => {
    const tr = document.createElement("tr");

    // #
    const tdNum = document.createElement("td");
    tdNum.textContent = index + 1;
    tr.appendChild(tdNum);

    // Target Sound (Editable)
    const tdSound = document.createElement("td");
    const inputSound = document.createElement("input");
    inputSound.type = "text";
    inputSound.className = "ledger-cell-input";
    inputSound.value = trial.sound || "";
    inputSound.placeholder = "Sound";
    inputSound.onchange = (e) => updateTrialSound(index, e.target.value);
    tdSound.appendChild(inputSound);
    tr.appendChild(tdSound);

    // Stimulus Word (Editable)
    const tdWord = document.createElement("td");
    const inputWord = document.createElement("input");
    inputWord.type = "text";
    inputWord.className = "ledger-cell-input";
    inputWord.value = trial.word || "";
    inputWord.placeholder = "(sound only)";
    inputWord.onchange = (e) => updateTrialWord(index, e.target.value);
    tdWord.appendChild(inputWord);
    tr.appendChild(tdWord);

    // Language Badge
    const tdLang = document.createElement("td");
    const langCode = trial.lang.includes("Spanish") ? "ES" : (trial.lang.includes("English") ? "EN" : "BI");
    tdLang.innerHTML = `<span style="font-size:0.68rem; font-weight:700; color:#0284c7;">${langCode}</span>`;
    tr.appendChild(tdLang);

    // Cue Select
    const tdCue = document.createElement("td");
    const selectCue = document.createElement("select");
    selectCue.className = "ledger-cue-select";
    selectCue.innerHTML = `
      <option value="ind" ${trial.cueLevel === 'ind' ? 'selected' : ''}>+ Ind</option>
      <option value="low" ${trial.cueLevel === 'low' ? 'selected' : ''}>+ Low</option>
      <option value="mod" ${trial.cueLevel === 'mod' ? 'selected' : ''}>+ Mod</option>
      <option value="max" ${trial.cueLevel === 'max' ? 'selected' : ''}>+ Max</option>
      <option value="err" ${trial.cueLevel === 'err' ? 'selected' : ''}>- Inc</option>
    `;
    selectCue.onchange = (e) => updateTrialCue(index, e.target.value);
    tdCue.appendChild(selectCue);
    tr.appendChild(tdCue);

    // Delete Button
    const tdAction = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "ledger-del-btn";
    delBtn.innerHTML = "&times;";
    delBtn.title = "Delete trial";
    delBtn.onclick = () => deleteSingleTrial(index);
    tdAction.appendChild(delBtn);
    tr.appendChild(tdAction);

    trialLedgerBodyEl.appendChild(tr);
  });
}

// ==========================================
// 6. METRICS & SOAP GENERATION
// ==========================================
function calculateAndRender() {
  const total = sessionTrials.length;
  const targetBlock = targetTrialsInputEl ? (parseInt(targetTrialsInputEl.value, 10) || 20) : 20;

  // Update Progress Bar
  const progressPct = Math.min(100, Math.round((total / targetBlock) * 100));
  if (progressBarFillEl) progressBarFillEl.style.width = `${progressPct}%`;
  if (trialCountDisplayEl) trialCountDisplayEl.textContent = `${total} / ${targetBlock}`;

  if (total === 0) {
    if (overallAccEl) overallAccEl.textContent = "0%";
    if (indAccEl) indAccEl.textContent = "0%";
    if (soapOutputEl) soapOutputEl.value = "No trials logged for current session.";
    return;
  }

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

  if (overallAccEl) overallAccEl.textContent = `${overallAccPct}%`;
  if (indAccEl) indAccEl.textContent = `${indAccPct}%`;

  // Aggregate by Target Sound
  const soundSummaryMap = {};
  sessionTrials.forEach((t) => {
    const key = t.word ? `${t.sound} ("${t.word}")` : t.sound;
    if (!soundSummaryMap[key]) {
      soundSummaryMap[key] = { total: 0, correct: 0, ind: 0 };
    }
    soundSummaryMap[key].total++;
    if (t.isCorrect) soundSummaryMap[key].correct++;
    if (t.cueLevel === "ind") soundSummaryMap[key].ind++;
  });

  const itemDetails = Object.keys(soundSummaryMap)
    .map((k) => {
      const item = soundSummaryMap[k];
      const pct = Math.round((item.correct / item.total) * 100);
      return `${k}: ${item.correct}/${item.total} (${pct}%, Ind: ${item.ind})`;
    })
    .join("; ");

  const rawId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const clientSubject = rawId ? `Client ${rawId}` : "Client";

  // Compile Objective Statement for Clinic EHR
  const soapString = `Objective: ${clientSubject} participated in a ${targetBlock}-trial target block (completed ${total} trials) in a ${currentLanguage} context. Overall stimulus accuracy was ${overallAccPct}% (${correctTotal}/${total}), with ${indAccPct}% independent mastery (${indCount}/${total}). Cueing Hierarchy Breakdown: Independent: ${indCount} (${Math.round((indCount / total) * 100)}%), Low/Min: ${lowCount} (${Math.round((lowCount / total) * 100)}%), Moderate: ${modCount} (${Math.round((modCount / total) * 100)}%), Maximal: ${maxCount} (${Math.round((maxCount / total) * 100)}%), Errors: ${errCount} (${Math.round((errCount / total) * 100)}%). Target Sound Breakdown: ${itemDetails}.`;

  if (soapOutputEl) soapOutputEl.value = soapString;
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
// 7. CSV EXPORT ENGINE
// ==========================================
function generateCSVString() {
  const cueLabels = {
    ind: "Independent",
    low: "Low / Minimal Cue",
    mod: "Moderate Cue",
    max: "Maximal Cue",
    err: "Incorrect / Error"
  };

  const rawClientId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const clientDisplay = rawClientId || "De-identified";
  const targetBlock = targetTrialsInputEl ? (parseInt(targetTrialsInputEl.value, 10) || 20) : 20;

  const headers = [
    "Trial #",
    "Timestamp (ISO)",
    "Time (Local)",
    "Target Sound",
    "Stimulus Word",
    "Language Context",
    "Cue Level",
    "Scoring Result",
    "Numeric Accuracy (0/1)"
  ];

  const rows = sessionTrials.map((t, index) => {
    const trialDate = new Date(t.timestamp);
    const localTime = trialDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const cleanSound = `"${t.sound.replace(/"/g, '""')}"`;
    const cleanWord = t.word ? `"${t.word.replace(/"/g, '""')}"` : '""';
    const cleanCue = `"${cueLabels[t.cueLevel] || t.cueLevel}"`;
    const cleanLang = `"${t.lang}"`;
    const resultText = t.isCorrect ? "Correct" : "Incorrect";
    const binaryScore = t.isCorrect ? 1 : 0;

    return [
      index + 1,
      t.timestamp,
      `"${localTime}"`,
      cleanSound,
      cleanWord,
      cleanLang,
      cleanCue,
      resultText,
      binaryScore
    ].join(",");
  });

  const total = sessionTrials.length;
  const correctTotal = sessionTrials.filter((t) => t.isCorrect).length;
  const indTotal = sessionTrials.filter((t) => t.cueLevel === "ind").length;
  const overallPct = Math.round((correctTotal / total) * 100);
  const indPct = Math.round((indTotal / total) * 100);

  const summaryRows = [
    `# BILINGUAL ARTICULATION & PHONOLOGY TRIAL LOG`,
    `# Client Code / ID,${clientDisplay}`,
    `# Session Date,${new Date().toLocaleDateString()}`,
    `# Language Mode,${currentLanguage}`,
    `# Target Trial Block,${targetBlock}`,
    `# Completed Trials,${total}`,
    `# Overall Accuracy,${overallPct}% (${correctTotal}/${total})`,
    `# Independent Mastery,${indPct}% (${indTotal}/${total})`,
    `#`
  ];

  return "\uFEFF" + [
    summaryRows.join("\n"),
    headers.join(","),
    rows.join("\n")
  ].join("\n");
}

async function exportToCSV() {
  if (sessionTrials.length === 0) {
    alert("No trials logged in this session to export.");
    return;
  }

  const csvContent = generateCSVString();
  const rawClientId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const cleanClientId = rawClientId.replace(/[^a-zA-Z0-9_-]/g, "");

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  const filePrefix = cleanClientId ? `Artic_Trials_${cleanClientId}` : `Artic_Trials`;
  const fileName = `${filePrefix}_${dateStr}_${timeStr}.csv`;

  // 1. Web Share API (iPad Safari)
  const file = new File([csvContent], fileName, { type: "text/csv;charset=utf-8" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Articulation Trial Data - ${cleanClientId || 'Session'}`,
        text: `Bilingual trial log for ${cleanClientId || 'Client'} (${dateStr})`
      });
      return;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Share sheet failed, falling back to download.", err);
      } else {
        return;
      }
    }
  }

  // 2. Blob Download (Desktop browsers)
  try {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 3000);
  } catch (err) {
    alert("Automatic download blocked. Please use 'Copy CSV' below.");
  }
}

function copyRawCSV() {
  if (sessionTrials.length === 0) {
    alert("No trials logged to copy.");
    return;
  }
  const csvContent = generateCSVString();
  navigator.clipboard.writeText(csvContent).then(() => {
    alert("Raw CSV data copied to clipboard! Paste directly into Google Sheets or Excel.");
  });
}

// ==========================================
// 8. STORAGE PERSISTENCE
// ==========================================
function saveTrialsToStorage() {
  try {
    localStorage.setItem("artic_tracker_trials", JSON.stringify(sessionTrials));
  } catch (e) {
    console.warn("Could not save trials to localStorage.", e);
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

function loadLanguageFromStorage() {
  const cachedLang = localStorage.getItem("artic_current_lang");
  if (cachedLang) setLanguageContext(cachedLang);
}

// ==========================================
// 9. FAST-KEYS
// ==========================================
function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

  switch (e.key) {
    case "1": logTrial("ind"); break;
    case "2": logTrial("low"); break;
    case "3": logTrial("mod"); break;
    case "4": logTrial("max"); break;
    case "0":
    case "-": logTrial("err"); break;
    case "u":
    case "U": undoLast(); break;
  }
}

window.addEventListener("DOMContentLoaded", init);