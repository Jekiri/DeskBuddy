// DeskBuddy Core Logic

let level = 1, gained = 0, lost = 0, cooldownTime = 0;
let pressCount = { productive: 0, survived: 0, break: 0, bulk: 0 };
let decayTimer = null, warningTimer = null, cooldownTimer = null;
let onBreak = false, onBulk = false, cooldownActive = false;
let pausedCooldownTime = 0;
let breakStartTime = 0, bulkStartTime = 0;
let pausedBulkTime = 0;
let bulkTimerInterval = null;
const bulkMinTime = 5 * 60;

const petEl = document.getElementById('pet');
const flavorEl = document.getElementById('flavor');
const bulkTimerDisplay = document.getElementById('bulkTimerDisplay');
const resetPopup = document.getElementById('resetPopup');
const bulkPopup = document.getElementById('bulkConfirmPopup');
const breakPopup = document.getElementById('breakConfirmPopup');
const savePopup = document.getElementById('savePopup');

const statEls = {
	level: document.getElementById('statLevel'),
	gained: document.getElementById('statGained'),
	lost: document.getElementById('statLost'),
	prod: document.getElementById('statProd'),
	surv: document.getElementById('statSurv'),
	bulk: document.getElementById('statBulk'),
	break: document.getElementById('statBreak'),
	cool: document.getElementById('statCooldown'),
	icon: document.getElementById('statBuddyIcon')
};

const buttons = {
	prod: document.getElementById('productiveBtn'),
	surv: document.getElementById('survivedBtn'),
	bulk: document.getElementById('bulkBtn'),
	break: document.getElementById('breakBtn')
};

const saveCodeOutput = document.getElementById('saveCodeOutput');
const copyCodeBtn = document.getElementById('copyCodeBtn');

const evolutionStages = [
	{ level: 1, icon: "assets/egg.png" },
	{ level: 5, icon: "assets/1.gif" },
	{ level: 10, icon: "assets/2.gif" },
	{ level: 20, icon: "assets/3.gif" },
	{ level: 30, icon: "assets/4.gif" },
	{ level: 50, icon: "assets/5.gif" },
	{ level: 100, icon: "assets/6.gif" },
	{ level: 200, icon: "assets/7.gif" },
	{ level: 300, icon: "assets/8.gif" },
	{ level: 400, icon: "assets/9.gif" },
	{ level: 500, icon: "assets/10.gif" }
];

function updatePet() {
	let icon = evolutionStages[0].icon;
	for (let stage of evolutionStages) {
		if (level >= stage.level) icon = stage.icon;
	}
	petEl.src = icon;
	statEls.icon.innerHTML = `<img src="${icon}" alt="Buddy" style="height: 1.5rem;" />`;
	statEls.level.textContent = level;
}

function updateStats() {
	statEls.gained.textContent = gained;
	statEls.lost.textContent = lost;
	statEls.prod.textContent = pressCount.productive;
	statEls.surv.textContent = pressCount.survived;
	statEls.bulk.textContent = pressCount.bulk;
	statEls.break.textContent = pressCount.break;
	statEls.cool.textContent = cooldownActive ? (pausedCooldownTime ? "Paused" : formatTime(cooldownTime)) : "None";
}

function formatTime(seconds) {
	return `⏳ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function startDecayTimer() {
	clearTimeout(decayTimer);
	clearTimeout(warningTimer);
	if (onBreak || onBulk) return;
	warningTimer = setTimeout(() => flavorEl.textContent = "⚠️ DeskBuddy is losing motivation...", 12 * 60 * 1000);
	decayTimer = setTimeout(() => {
		if (level > 1) {
			level--;
			lost++;
			updatePet();
			flavorEl.textContent = "😞 DeskBuddy lost motivation...";
		}
		startDecayTimer();
	}, 15 * 60 * 1000);
}

function showFloatMsg(msg) {
	const div = document.createElement('div');
	div.className = "float-msg";
	div.innerText = msg;
	document.body.appendChild(div);
	setTimeout(() => div.remove(), 2000);
}

function showResetPopup() {
	document.querySelector(".stats-panel").style.display = "none";
	resetPopup.classList.remove("hidden");
	document.getElementById('resetInput').value = "";
}

function hideResetPopup() {
	resetPopup.classList.add("hidden");
	document.querySelector(".stats-panel").style.display = "flex";
}

function confirmReset() {
	if (document.getElementById('resetInput').value.trim().toLowerCase() === "reset") {
		location.reload();
	} else {
		flavorEl.textContent = "❌ You must type 'reset' to confirm.";
	}
}

function interact(type) {
	if (cooldownActive && !onBreak) return showFloatMsg("On cooldown!");
	if (onBreak) return showFloatMsg("Buttons are currently paused! – Are you on break?");
	if (onBulk && Date.now() - bulkStartTime < bulkMinTime * 1000) {
		if (!['productive', 'survived'].includes(type)) return;
		return bulkPopup.classList.remove("hidden");
	}
	if (onBulk) {
		onBulk = false;
		pressCount.bulk++;
		level = Math.min(500, level + 5);
		gained += 5;
		buttons.bulk.innerText = "📦 Bulk Task";
		bulkTimerDisplay.textContent = "";
		clearInterval(bulkTimerInterval);
		updatePet();
		startCooldown();
		startDecayTimer();
		updateStats();
		flavorEl.textContent = "📦 Bulk task complete!";
		hideSaveCode();
		return;
	}
	let reward = 0;
	if (type === "productive") { reward = 1; pressCount.productive++; }
	if (type === "survived") { reward = 2; pressCount.survived++; }
	level = Math.min(500, level + reward);
	gained += reward;
	updatePet();
	resetButtonState();
	startCooldown();
	startDecayTimer();
	updateStats();
	flavorEl.textContent = type === "productive" ? "🎯 Nice! Staying focused." : "💥 You survived the chaos!";
	hideSaveCode();
}

function startCooldown() {
	if (cooldownTimer) clearInterval(cooldownTimer);
	cooldownTime = 180;
	cooldownActive = true;
	updateCooldownText();
	cooldownTimer = setInterval(() => {
		if (onBreak) return;
		cooldownTime--;
		updateCooldownText();
		if (cooldownTime <= 0) {
			clearInterval(cooldownTimer);
			cooldownActive = false;
			resetButtonState();
		}
	}, 1000);
}

function resumeCooldown() {
	if (cooldownTimer) clearInterval(cooldownTimer);
	cooldownActive = true;
	updateCooldownText();
	cooldownTimer = setInterval(() => {
		if (onBreak) return;
		cooldownTime--;
		updateCooldownText();
		if (cooldownTime <= 0) {
			clearInterval(cooldownTimer);
			cooldownActive = false;
			resetButtonState();
		}
	}, 1000);
}

function updateCooldownText() {
	const showCountdown = cooldownActive && cooldownTime > 0 && !onBreak;
	const text = onBreak ? "Paused" : formatTime(cooldownTime);

	['prod', 'surv', 'bulk'].forEach(key => {
		if (showCountdown) {
			buttons[key].innerText = text;
		} else {
			if (key === 'prod') buttons[key].innerText = "✅ That Was Productive";
			if (key === 'surv') buttons[key].innerText = "💀 Barely Survived That";
			if (key === 'bulk') buttons[key].innerText = onBulk ? "✔️ Bulk Task Done" : "📦 Bulk Task";
		}
		buttons[key].disabled = onBreak || (cooldownActive && cooldownTime > 0);
	});
	updateStats();
}

function resetButtonState() {
	buttons.prod.innerText = "✅ That Was Productive";
	buttons.surv.innerText = "💀 Barely Survived That";
	buttons.bulk.innerText = onBulk ? "✔️ Bulk Task Done" : "📦 Bulk Task";
	['prod', 'surv', 'bulk'].forEach(key => buttons[key].disabled = false);
	updateStats();
}

function startBulk() {
	if (cooldownActive && !onBreak) return showFloatMsg("On cooldown!");
	if (onBreak) return showFloatMsg("Buttons are currently paused! – Are you on break?");
	if (onBulk) {
		if (Date.now() - bulkStartTime < bulkMinTime * 1000) {
			bulkPopup.classList.remove("hidden");
			updateBulkTimeDisplay();
			return;
		} else {
			interact("bulk");
		}
	} else {
		onBulk = true;
		bulkStartTime = Date.now();
		pausedBulkTime = 0;
		buttons.bulk.innerText = "✔️ Bulk Task Done";
		flavorEl.textContent = "📦 Bulk task in progress... decay paused.";
		startDecayTimer();
		updateBulkTimeDisplay();
		bulkTimerInterval = setInterval(() => {
			if (!onBulk || onBreak) return;
			updateBulkTimeDisplay();
		}, 1000);
	}
}

function updateBulkTimeDisplay() {
	const remaining = Math.max(0, bulkMinTime - Math.floor((Date.now() - bulkStartTime) / 1000));
	bulkTimerDisplay.textContent = `⏳ Bulk Time Remaining: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
	document.getElementById("bulkTimeRemaining").innerText = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
}

function confirmBulkExit() {
	bulkPopup.classList.add("hidden");
	onBulk = false;
	clearInterval(bulkTimerInterval);
	bulkTimerDisplay.textContent = "";
	buttons.bulk.innerText = "📦 Bulk Task";
	flavorEl.textContent = "Bulk mode exited early – no reward.";
	startDecayTimer();
	resetButtonState();
}

function cancelBulkExit() {
	bulkPopup.classList.add("hidden");
}

function toggleBreak() {
	if (!onBreak) {
		onBreak = true;
		breakStartTime = Date.now();
		buttons.break.innerText = "🔙 Back From Break";
		flavorEl.textContent = "On break – decay & cooldown paused.";
		clearTimeout(decayTimer);
		clearTimeout(warningTimer);
		pausedCooldownTime = cooldownTime;
		if (onBulk) {
			pausedBulkTime = Date.now() - bulkStartTime;
			clearInterval(bulkTimerInterval);
		}
		updateCooldownText();
		updateStats();
	} else {
		const breakTime = (Date.now() - breakStartTime) / 1000;
		if (breakTime < 600) {
			breakPopup.classList.remove("hidden");
			updateBreakTimeDisplay();
			const interval = setInterval(() => {
				if (!onBreak || breakPopup.classList.contains("hidden")) return clearInterval(interval);
				updateBreakTimeDisplay();
			}, 1000);
			return;
		}
		exitBreak(true);
	}
}

function updateBreakTimeDisplay() {
	const remaining = Math.max(0, 600 - Math.floor((Date.now() - breakStartTime) / 1000));
	document.getElementById("breakTimeRemaining").innerText = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
}

function confirmBreakExit() {
	breakPopup.classList.add("hidden");
	exitBreak(false);
}

function cancelBreakExit() {
	breakPopup.classList.add("hidden");
}

function exitBreak(resetCooldown) {
	onBreak = false;
	buttons.break.innerText = "☕ Break Time";
	flavorEl.textContent = "Back to work!";
	startDecayTimer();

	if (resetCooldown) {
		pressCount.break++;
		if (pausedCooldownTime > 0) {
			cooldownTime = pausedCooldownTime;
			resumeCooldown();
		} else {
			cooldownActive = false;
			resetButtonState();
		}
	}

	if (onBulk && pausedBulkTime > 0) {
		bulkStartTime = Date.now() - pausedBulkTime;
		pausedBulkTime = 0;
		bulkTimerInterval = setInterval(() => {
			if (!onBulk || onBreak) return;
			updateBulkTimeDisplay();
		}, 1000);
	}

	updateCooldownText();
	updateStats();
}

function toggleStats() {
	const panel = document.getElementById('statsPanel');
	panel.style.display = panel.style.display === "flex" ? "none" : "flex";
	updateStats();
}

function openSaveRestore() {
	document.getElementById('statsPanel').style.display = "none";
	savePopup.classList.remove("hidden");
	hideSaveCode();
}

function closeSaveRestore() {
	savePopup.classList.add("hidden");
	document.getElementById('statsPanel').style.display = "flex";
	hideSaveCode();
}

function showSaveCode() {
	const r = () => Math.random().toString(36).substring(2, 6).toUpperCase();
	const encoded = btoa(level.toString()).replace(/=/g, "");
	const code = `${r()}-${r()}-${r()}-${encoded}`;
	saveCodeOutput.textContent = code;
	copyCodeBtn.style.display = "inline-block";
	copyCodeBtn.setAttribute("data-code", code);
}

function copySaveCode() {
	navigator.clipboard.writeText(copyCodeBtn.getAttribute("data-code"));
	flavorEl.textContent = "✅ Save code copied!";
}

function hideSaveCode() {
	saveCodeOutput.textContent = "";
	copyCodeBtn.style.display = "none";
}

function confirmLoadCode() {
	const code = document.getElementById("loadInput").value.trim();
	const success = tryLoad(code);
	if (success) {
		flavorEl.textContent = "🔄 Buddy restored!";
		updatePet();
		updateStats();
		startDecayTimer();
		closeSaveRestore();
	} else {
		flavorEl.textContent = "❌ Invalid save code.";
	}
}

function tryLoad(code) {
	const parts = code.trim().split("-");
	if (parts.length < 4) return false;

	try {
		const encoded = parts[3];
		const decoded = atob(encoded);
		const newLevel = parseInt(decoded);
		if (!isNaN(newLevel) && newLevel >= 1 && newLevel <= 500) {
			level = newLevel;
			return true;
		}
	} catch (e) {
		console.error("Restore failed:", e);
	}
	return false;
}

updatePet();
updateStats();
startDecayTimer();
