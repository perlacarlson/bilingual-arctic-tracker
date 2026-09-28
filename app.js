/**
 * Bilingual Artic Tracker: Multi-Goal Session Engine
 * Built for Pediatric Clinic Sessions, PSU SOAP Documentation, & Longitudinal Reporting
 */

// ==========================================
// 1. STATE & DEFAULT CLINICAL GOALS
// ==========================================
const DEFAULT_GOALS = [
  {
    id: "goal_r",
    title: "/r/ Múltiple",
    desc: "Produce vibrante múltiple /r/ in word-initial position with 80% accuracy",
    blockQuota: 20
  },
  {
    id: "goal_fronting",
    title: "Velars /k, ɡ/ (Fronting)",
    desc: "Suppress velar fronting in contrastive word pairs (/k/ vs /t/) with 75% accuracy",
    blockQuota: 20
  },
  {
    id: "goal_coda_s",
    title: "Coda /s/ Retention",
    desc: "Maintain coda /s/ in multisyllabic words with minimal gestural cues",
    blockQuota: 15
  }
];

let sessionGoals = [];
let activeGoalId = "";
let currentLanguage = "Spanish Only";
let sessionTrials = [];

// DOM References
let goalTabStripEl;
let activeSoundDisplayEl;
let targetWordInputEl;
let clientIdInputEl;
let activeBlockTargetEl;
let progressBarFillEl;
let trialCountDisplayEl;
let overallAccEl;
let indAccEl;
let goalSummaryCardsEl;
let trialLedgerBodyEl;
let ledgerCountEl;
let soapOutputEl;
let goalModalEl;

// ==========================================
// 2. INITIALIZATION
// ==========================================
function init() {
  goalTabStripEl = document.getElementById("goal-tab-strip");
  activeSoundDisplayEl = document.getElementById("active-sound-display");
  targetWordInputEl = document.getElementById("target-word-input");
  clientIdInputEl = document.getElementById("client-id-input");
  activeBlockTargetEl = document.getElementById("active-block-target");
  progressBarFillEl = document.getElementById("progress-bar-fill");
  trialCountDisplayEl = document.getElementById("trial-count-display");
  overallAccEl = document.getElementById("overall-acc");
  indAccEl = document.getElementById("ind-acc");
  goalSummaryCardsEl = document.getElementById("goal-summary-cards");
  trialLedgerBodyEl = document.getElementById("trial-ledger-body");
  ledgerCountEl = document.getElementById("ledger-count");
  soapOutputEl = document.getElementById("soap-output");
  goalModalEl = document.getElementById("goal-modal");

  loadGoalsFromStorage();
  loadTrialsFromStorage();
  loadLanguageFromStorage();

  if (sessionGoals.length === 0) {
    sessionGoals = [...DEFAULT_GOALS];
    saveGoalsToStorage();
  }

  if (!activeGoalId || !sessionGoals.some(g => g.id === activeGoalId)) {
    activeGoalId = sessionGoals[0].id;
  }

  renderGoalTabs();
  syncActiveGoalInputs();
  calculateAndRender();
  renderLedger();

  if (clientIdInputEl) clientIdInputEl.addEventListener("input", calculateAndRender);
  if (activeSoundDisplayEl) activeSoundDisplayEl.addEventListener("input", updateCurrentGoalSound);

  window.addEventListener("keydown", handleKeyboardShortcuts);
}

// ==========================================
// 3. GOAL MANAGEMENT & TAB SWITCHING
// ==========================================
function renderGoalTabs() {
  if (!goalTabStripEl) return;
  goalTabStripEl.innerHTML = "";

  sessionGoals.forEach(goal => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `goal-tab ${goal.id === activeGoalId ? "active" : ""}`;
    tab.textContent = goal.title;
    tab.onclick = () => selectGoal(goal.id);
    goalTabStripEl.appendChild(tab);
  });
}

function selectGoal(goalId) {
  activeGoalId = goalId;
  renderGoalTabs();
  syncActiveGoalInputs();
  calculateAndRender();
}

function syncActiveGoalInputs() {
  const goal = sessionGoals.find(g => g.id === activeGoalId);
  if (!goal) return;

  if (activeSoundDisplayEl) activeSoundDisplayEl.value = goal.title;
  if (activeBlockTargetEl) activeBlockTargetEl.value = goal.blockQuota;
}

function updateActiveGoalBlockTarget(val) {
  const goal = sessionGoals.find(g => g.id === activeGoalId);
  if (goal) {
    goal.blockQuota = parseInt(val, 10) || 20;
    saveGoalsToStorage();
    calculateAndRender();
  }
}

function updateCurrentGoalSound(e) {
  const goal = sessionGoals.find(g => g.id === activeGoalId);
  if (goal) {
    goal.title = e.target.value.trim() || "Sound Target";
    saveGoalsToStorage();
    renderGoalTabs();
    calculateAndRender();
  }
}

// Modal Management
function openGoalEditor() {
  renderModalGoalList();
  if (goalModalEl) goalModalEl.showModal();
}

function closeGoalEditor() {
  if (goalModalEl) goalModalEl.close();
}

function renderModalGoalList() {
  const container = document.getElementById("modal-goals-container");
  if (!container) return;
  container.innerHTML = "";

  sessionGoals.forEach((goal, index) => {
    const item = document.createElement("div");
    item.className = "modal-goal-item";
    item.innerHTML = `
      <div>
        <strong style="color:#0284c7;">${goal.title}</strong> (${goal.blockQuota} trials)
        <div style="font-size:0.75rem; color:#64748b;">${goal.desc}</div>
      </div>
      <button type="button" class="ledger-del-btn" onclick="deleteGoal('${goal.id}')">&times;</button>
    `;
    container.appendChild(item);
  });
}

function addNewGoal() {
  const title = document.getElementById("new-goal-title")?.value.trim();
  const desc = document.getElementById("new-goal-desc")?.value.trim() || title;
  const quota = parseInt(document.getElementById("new-goal-quota")?.value, 10) || 20;

  if (!title) {
    alert("Please enter a target sound or goal title.");
    return;
  }

  const newGoal = {
    id: `goal_${Date.now()}`,
    title: title,
    desc: desc,
    blockQuota: quota
  };

  sessionGoals.push(newGoal);
  saveGoalsToStorage();
  renderGoalTabs();
  renderModalGoalList();

  document.getElementById("new-goal-title").value = "";
  document.getElementById("new-goal-desc").value = "";
}

function deleteGoal(goalId) {
  if (sessionGoals.length <= 1) {
    alert("You must keep at least one active goal in the session.");
    return;
  }
  sessionGoals = sessionGoals.filter(g => g.id !== goalId);
  if (activeGoalId === goalId) {
    activeGoalId = sessionGoals[0].id;
  }
  saveGoalsToStorage();
  renderGoalTabs();
  syncActiveGoalInputs();
  renderModalGoalList();
  calculateAndRender();
}

// ==========================================
// 4. LANGUAGE CONTEXT
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

// ==========================================
// 5. SESSION TRIAL ENGINE
// ==========================================
function logTrial(cueLevel) {
  const currentGoal = sessionGoals.find(g => g.id === activeGoalId) || {
    id: "default",
    title: "General Target",
    desc: "General articulation"
  };

  const soundName = activeSoundDisplayEl ? activeSoundDisplayEl.value.trim() : currentGoal.title;
  const wordName = targetWordInputEl ? targetWordInputEl.value.trim() : "";

  const trialRecord = {
    id: Date.now(),
    goalId: currentGoal.id,
    goalTitle: currentGoal.title,
    sound: soundName,
    word: wordName,
    lang: currentLanguage,
    cueLevel: cueLevel,
    isCorrect: cueLevel !== "err",
    timestamp: new Date().toISOString()
  };

  sessionTrials.push(trialRecord);
  saveTrialsToStorage();
  calculateAndRender();
  renderLedger();

  const scrollContainer = document.querySelector(".trial-ledger-scroll");
  if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
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
// 6. MULTI-GOAL CALCULATIONS & SOAP FORMATTER
// ==========================================
function calculateAndRender() {
  const currentGoal = sessionGoals.find(g => g.id === activeGoalId);
  const activeQuota = currentGoal ? currentGoal.blockQuota : 20;

  // Filter trials for the currently active tab
  const activeGoalTrials = sessionTrials.filter(t => t.goalId === activeGoalId);
  const activeTotal = activeGoalTrials.length;

  // Progress Bar for Active Goal
  const progressPct = Math.min(100, Math.round((activeTotal / activeQuota) * 100));
  if (progressBarFillEl) progressBarFillEl.style.width = `${progressPct}%`;
  if (trialCountDisplayEl) trialCountDisplayEl.textContent = `${activeTotal} / ${activeQuota}`;

  // Active Goal Accuracies
  if (activeTotal === 0) {
    if (overallAccEl) overallAccEl.textContent = "0%";
    if (indAccEl) indAccEl.textContent = "0%";
  } else {
    const correctCount = activeGoalTrials.filter(t => t.isCorrect).length;
    const indCount = activeGoalTrials.filter(t => t.cueLevel === "ind").length;
    if (overallAccEl) overallAccEl.textContent = `${Math.round((correctCount / activeTotal) * 100)}%`;
    if (indAccEl) indAccEl.textContent = `${Math.round((indCount / activeTotal) * 100)}%`;
  }

  // Render Cumulative Summary Cards for ALL Goals
  renderMultiGoalSummaryCards();

  // Generate Supervisor-Ready SOAP Objective Statement
  generateMultiGoalSoapNote();
}

function renderMultiGoalSummaryCards() {
  if (!goalSummaryCardsEl) return;
  goalSummaryCardsEl.innerHTML = "";

  sessionGoals.forEach(goal => {
    const trials = sessionTrials.filter(t => t.goalId === goal.id);
    const count = trials.length;
    const correct = trials.filter(t => t.isCorrect).length;
    const ind = trials.filter(t => t.cueLevel === "ind").length;

    const accPct = count > 0 ? Math.round((correct / count) * 100) : 0;
    const indPct = count > 0 ? Math.round((ind / count) * 100) : 0;

    const row = document.createElement("div");
    row.className = "goal-overview-row";
    row.innerHTML = `
      <div>
        <span class="goal-overview-title">${goal.title}</span>: 
        <span>${count}/${goal.blockQuota} trials</span>
      </div>
      <div class="goal-overview-stats">
        ${accPct}% Overall | ${indPct}% Ind
      </div>
    `;
    goalSummaryCardsEl.appendChild(row);
  });
}

function generateMultiGoalSoapNote() {
  if (!soapOutputEl) return;

  const totalAllTrials = sessionTrials.length;
  if (totalAllTrials === 0) {
    soapOutputEl.value = "No trials logged for current session.";
    return;
  }

  const rawId = clientIdInputEl ? clientIdInputEl.value.trim() : "";
  const clientSubject = rawId ? `Client ${rawId}` : "Client";

  // Build goal-by-goal narrative breakdown
  const goalNarratives = sessionGoals.map(goal => {
    const trials = sessionTrials.filter(t => t.goalId === goal.id);
    if (trials.length === 0) return null;

    const total = trials.length;
    const correct = trials.filter(t => t.isCorrect).length;
    const ind = trials.filter(t => t.cueLevel === "ind").length;
    const low = trials.filter(t => t.cueLevel === "low").length;
    const mod = trials.filter(t => t.cueLevel === "mod").length;
    const max = trials.filter(t => t.cueLevel === "max").length;
    const err = trials.filter(t => t.cueLevel === "err").length;

    const accPct = Math.round((correct / total) * 100);
    const indPct = Math.round((ind / total) * 100);

    // Itemized words
    const wordCounts = {};
    trials.forEach(t => {
      const key = t.word ? t.word : t.sound;
      wordCounts[key] = (wordCounts[key] || 0) + (t.isCorrect ? 1 : 0);
    });
    const stimulusBreakdown = Object.keys(wordCounts)
      .map(k => `${k} (${wordCounts[k]} correct)`)
      .join(", ");

    return `${goal.title}: completed ${total} trials with ${accPct}% accuracy (${correct}/${total}) and ${indPct}% independent mastery. Prompt hierarchy: Ind: ${ind}, Min: ${low}, Mod: ${mod}, Max: ${max}, Errors: ${err}. Targets addressed: ${stimulusBreakdown || 'General probes'}.`;
  }).filter(Boolean);

  const soapString = `Objective: ${clientSubject} participated in speech-language therapy addressing ${sessionGoals.length} articulation/phonological targets within a ${currentLanguage} context (${totalAllTrials} total session trials).\n\n` + goalNarratives.join("\n\n");

  soapOutputEl.value = soapString;
}

function copySoapNote() {
  if (sessionTrials.length === 0 || !soapOutputEl) return;
  navigator.clipboard.writeText(soapOutputEl.value).then(() => {
    alert("SOAP Objective note copied to clipboard!");
  });
}

// ==========================================
// 7. SESSION LEDGER (Retroactive Editing)
// ==========================================
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

    // Goal Tag
    const tdGoal = document.createElement("td");
    tdGoal.innerHTML = `<span style="font-weight:700; color:#0284c7; font-size:0.7rem;">${trial.goalTitle}</span>`;
    tr.appendChild(tdGoal);

    // Target Sound
    const tdSound = document.createElement("td");
    const inputSound = document.createElement("input");
    inputSound.type = "text";
    inputSound.className = "ledger-cell-input";
    inputSound.value = trial.sound || "";
    inputSound.onchange = (e) => {
      trial.sound = e.target.value.trim();
      saveTrialsToStorage();
      calculateAndRender();
    };
    tdSound.appendChild(inputSound);
    tr.appendChild(tdSound);

    // Word
    const tdWord = document.createElement("td");
    const inputWord = document.createElement("input");
    inputWord.type = "text";
    inputWord.className = "ledger-cell-input";
    inputWord.value = trial.word || "";
    inputWord.placeholder = "(sound only)";
    inputWord.onchange = (e) => {
      trial.word = e.target.value.trim();
      saveTrialsToStorage();
      calculateAndRender();
    };
    tdWord.appendChild(inputWord);
    tr.appendChild(tdWord);

    // Cue
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
    selectCue.onchange = (e) => {
      trial.cueLevel = e.target.value;
      trial.isCorrect = e.target.value !== "err";
      saveTrialsToStorage();
      calculateAndRender();
    };
    tdCue.appendChild(selectCue);
    tr.appendChild(tdCue);

    // Delete
    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "ledger-del-btn";
    delBtn.innerHTML = "&times;";
    delBtn.onclick = () => {
      sessionTrials.splice(index, 1);
      saveTrialsToStorage();
      calculateAndRender();
      renderLedger();
    };
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    trialLedgerBodyEl.appendChild(tr);
  });
}

// ==========================================
// 8. CSV EXPORT ENGINE
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

  const headers = [
    "Trial #",
    "Timestamp (ISO)",
    "Time (Local)",
    "Goal Title",
    "Target Sound",
    "Stimulus Word",
    "Language Mode",
    "Cue Level",
    "Scoring Result",
    "Numeric Accuracy (0/1)"
  ];

  const rows = sessionTrials.map((t, index) => {
    const trialDate = new Date(t.timestamp);
    const localTime = trialDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return [
      index + 1,
      t.timestamp,
      `"${localTime}"`,
      `"${(t.goalTitle || '').replace(/"/g, '""')}"`,
      `"${(t.sound || '').replace(/"/g, '""')}"`,
      t.word ? `"${t.word.replace(/"/g, '""')}"` : '""',
      `"${t.lang}"`,
      `"${cueLabels[t.cueLevel] || t.cueLevel}"`,
      t.isCorrect ? "Correct" : "Incorrect",
      t.isCorrect ? 1 : 0
    ].join(",");
  });

  const total = sessionTrials.length;
  const correctTotal = sessionTrials.filter(t => t.isCorrect).length;
  const indTotal = sessionTrials.filter(t => t.cueLevel === "ind").length;
  const overallPct = Math.round((correctTotal / total) * 100);
  const indPct = Math.round((indTotal / total) * 100);

  const summaryRows = [
    `# BILINGUAL ARTICULATION & MULTI-GOAL TRIAL LOG`,
    `# Client Code / ID,${clientDisplay}`,
    `# Session Date,${new Date().toLocaleDateString()}`,
    `# Language Mode,${currentLanguage}`,
    `# Total Goals Tracked,${sessionGoals.length}`,
    `# Cumulative Trials,${total}`,
    `# Cumulative Accuracy,${overallPct}% (${correctTotal}/${total})`,
    `# Independent Mastery,${indPct}% (${indTotal}/${total})`,
    `#`
  ];

  return "\uFEFF" + [summaryRows.join("\n"), headers.join(","), rows.join("\n")].join("\n");
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
  const filePrefix = cleanClientId ? `MultiGoal_Trials_${cleanClientId}` : `MultiGoal_Trials`;
  const fileName = `${filePrefix}_${dateStr}_${timeStr}.csv`;

  const file = new File([csvContent], fileName, { type: "text/csv;charset=utf-8" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Multi-Goal Trial Log - ${cleanClientId || 'Session'}`,
        text: `Bilingual multi-goal trial data for ${cleanClientId || 'Client'} (${dateStr})`
      });
      return;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("Share sheet dismissed", err);
      else return;
    }
  }

  try {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (err) {
    alert("Download blocked. Please use Copy CSV below.");
  }
}

function copyRawCSV() {
  if (sessionTrials.length === 0) return;
  navigator.clipboard.writeText(generateCSVString()).then(() => {
    alert("Raw CSV copied to clipboard!");
  });
}

// ==========================================
// 9. LOCAL PERSISTENCE & FAST-KEYS
// ==========================================
function saveGoalsToStorage() {
  localStorage.setItem("artic_session_goals", JSON.stringify(sessionGoals));
}

function loadGoalsFromStorage() {
  try {
    const cached = localStorage.getItem("artic_session_goals");
    if (cached) sessionGoals = JSON.parse(cached);
  } catch (e) {
    sessionGoals = [];
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

function loadLanguageFromStorage() {
  const cachedLang = localStorage.getItem("artic_current_lang");
  if (cachedLang) setLanguageContext(cachedLang);
}

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