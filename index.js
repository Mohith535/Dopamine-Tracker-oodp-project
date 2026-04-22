/* ═══════════════════════════════════════════
   Digital Habit & Dopamine Tracker
   Calendar-Based Frontend Logic
   ═══════════════════════════════════════════ */

// ── State ──────────────────────────────────
const SCORE_PER_HABIT = 10;
const STORAGE_KEY = 'dopamine_tracker_data';

let habits = [];                // Array of habit name strings
let records = {};               // { "2026-04-21": { completed: [true, false, ...] } }
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();     // 0-indexed
let selectedDate = null;        // "YYYY-MM-DD" string

// ── Persistence ────────────────────────────
function saveData() {
    const data = { habits, records };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.habits) habits = data.habits;
        if (data.records) records = data.records;
    } catch(e) {}
}

// ── DOM Refs ───────────────────────────────
const habitInput      = document.getElementById('habit-input');
const habitChips      = document.getElementById('habit-chips');
const calGrid         = document.getElementById('cal-grid');
const calLabel        = document.getElementById('cal-month-label');
const dayPanelEmpty   = document.getElementById('day-panel-empty');
const dayPanelContent = document.getElementById('day-panel-content');
const dayPanelDate    = document.getElementById('day-panel-date');
const dayPanelScore   = document.getElementById('day-panel-score');
const dayHabitList    = document.getElementById('day-habit-list');
const scoreValue      = document.getElementById('score-value');
const scoreStatus     = document.getElementById('score-status');
const streakCount     = document.getElementById('streak-count');
const bestScoreEl     = document.getElementById('best-score');
const totalDaysEl     = document.getElementById('total-days');
const feedbackIcon    = document.getElementById('feedback-icon');
const feedbackText    = document.getElementById('feedback-text');
const consistencyGrid = document.getElementById('consistency-grid');
const graphSummary    = document.getElementById('graph-summary');
const canvas          = document.getElementById('score-chart');
const ctx             = canvas.getContext('2d');

// ═══════════════════════════════════════════
// HABIT MANAGEMENT
// ═══════════════════════════════════════════

function addHabit() {
    const name = habitInput.value.trim();
    if (!name || habits.includes(name)) {
        habitInput.focus();
        habitInput.style.borderColor = '#ef4444';
        setTimeout(() => { habitInput.style.borderColor = ''; }, 600);
        return;
    }

    habits.push(name);
    habitInput.value = '';
    saveData();
    renderChips();
    renderCalendar();
    updateConsistency();

    // If a date is selected, refresh day panel
    if (selectedDate) openDayPanel(selectedDate);
}

function removeHabit(index) {
    habits.splice(index, 1);

    // Clean up records — remove the column for this habit
    for (const key in records) {
        records[key].completed.splice(index, 1);
    }
    saveData();

    renderChips();
    renderCalendar();
    updateConsistency();
    updateStats();
    if (selectedDate) openDayPanel(selectedDate);
}

function renderChips() {
    if (habits.length === 0) {
        habitChips.innerHTML = '';
        return;
    }

    habitChips.innerHTML = habits.map((name, i) =>
        `<span class="habit-chip">
            ${name}
            <span class="chip-remove" onclick="removeHabit(${i})">×</span>
        </span>`
    ).join('');
}

// Enter key to add
habitInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addHabit();
});

// ═══════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

function renderCalendar() {
    calLabel.textContent = `${MONTHS[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = formatDate(today);

    let html = '';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDate(new Date(currentYear, currentMonth, d));
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        const rec = records[dateStr];

        let cls = 'cal-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';

        if (rec) {
            const score = calcScore(dateStr);
            const maxScore = habits.length * SCORE_PER_HABIT;
            const pct = maxScore > 0 ? score / maxScore : 0;
            cls += pct >= 0.5 ? ' has-data' : ' has-data has-data-low';
        }

        html += `<div class="${cls}" onclick="selectDate('${dateStr}')">${d}</div>`;
    }

    calGrid.innerHTML = html;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
    selectedDate = null;
    closeDayPanel();
    renderCalendar();
    drawGraph();
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    openDayPanel(dateStr);
}

function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateDisplay(dateStr) {
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ═══════════════════════════════════════════
// DAY PANEL
// ═══════════════════════════════════════════

function openDayPanel(dateStr) {
    dayPanelEmpty.style.display = 'none';
    dayPanelContent.style.display = 'flex';
    dayPanelDate.textContent = formatDateDisplay(dateStr);

    // Ensure record exists
    if (!records[dateStr]) {
        records[dateStr] = { completed: new Array(habits.length).fill(false) };
    }

    // Pad if new habits were added
    const rec = records[dateStr].completed;
    while (rec.length < habits.length) rec.push(false);

    renderDayHabits(dateStr);
    updateDayScore(dateStr);
}

function closeDayPanel() {
    dayPanelEmpty.style.display = 'flex';
    dayPanelContent.style.display = 'none';
}

function renderDayHabits(dateStr) {
    if (habits.length === 0) {
        dayHabitList.innerHTML = '<li class="text-muted" style="padding:12px;text-align:center;">Add habits first</li>';
        return;
    }

    const rec = records[dateStr].completed;
    dayHabitList.innerHTML = habits.map((name, i) => {
        const checked = rec[i] ? 'checked' : '';
        return `<li class="day-habit-item ${checked}" onclick="toggleHabit('${dateStr}', ${i})">
            <div class="habit-checkbox">✓</div>
            <span class="habit-name-text">${name}</span>
            <span class="habit-pts">${rec[i] ? '+' + SCORE_PER_HABIT : '0'}</span>
        </li>`;
    }).join('');
}

function toggleHabit(dateStr, index) {
    records[dateStr].completed[index] = !records[dateStr].completed[index];
    saveData();
    renderDayHabits(dateStr);
    updateDayScore(dateStr);
}

function updateDayScore(dateStr) {
    const score = calcScore(dateStr);
    dayPanelScore.textContent = score + ' pts';
}

// ═══════════════════════════════════════════
// SAVE DAY
// ═══════════════════════════════════════════

function saveDay() {
    if (!selectedDate || habits.length === 0) return;

    // Record is already saved via toggleHabit — this is a confirmation action
    const score = calcScore(selectedDate);

    // Update today's display if saving for today
    animateScore(score);
    updateStatusBadge(score);
    updateFeedback(score);
    updateStats();
    updateConsistency();
    renderCalendar();
    drawGraph();
    saveData();
}

// ═══════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════

function calcScore(dateStr) {
    const rec = records[dateStr];
    if (!rec) return 0;
    let total = 0;
    for (let i = 0; i < rec.completed.length && i < habits.length; i++) {
        if (rec.completed[i]) total += SCORE_PER_HABIT;
    }
    return total;
}

function animateScore(target) {
    const start = parseInt(scoreValue.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();

    function step(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        scoreValue.textContent = Math.round(start + (target - start) * ease);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function updateStatusBadge(score) {
    const max = habits.length * SCORE_PER_HABIT;
    const pct = max > 0 ? score / max : 0;

    let text, cls;
    if (pct >= 0.8)      { text = 'Productive';  cls = 'status-good'; }
    else if (pct >= 0.4) { text = 'Average';      cls = 'status-warn'; }
    else                 { text = 'Low Activity'; cls = 'status-bad'; }

    scoreStatus.textContent = text;
    scoreStatus.className = 'status-badge ' + cls;
}

function updateFeedback(score) {
    const max = habits.length * SCORE_PER_HABIT;
    const pct = max > 0 ? score / max : 0;

    if (pct >= 0.8) {
        feedbackIcon.textContent = '🔥';
        feedbackText.textContent = 'Excellent discipline! Your focus is razor-sharp today. Keep building momentum.';
    } else if (pct >= 0.4) {
        feedbackIcon.textContent = '⚡';
        feedbackText.textContent = 'Decent effort, but there\'s room to grow. Try completing one more habit tomorrow.';
    } else {
        feedbackIcon.textContent = '⚠️';
        feedbackText.textContent = 'Low activity detected. Reset your environment, remove distractions, and try again.';
    }
}

// ═══════════════════════════════════════════
// STATS (Streak, Best, Total)
// ═══════════════════════════════════════════

function updateStats() {
    const dates = Object.keys(records).sort();
    if (dates.length === 0) {
        streakCount.textContent = '0';
        bestScoreEl.textContent = '0';
        totalDaysEl.textContent = '0';
        return;
    }

    // Total days
    const activeDays = dates.filter(d => {
        return records[d].completed.some(v => v);
    });
    totalDaysEl.textContent = activeDays.length;

    // Best score
    let best = 0;
    for (const d of dates) {
        const s = calcScore(d);
        if (s > best) best = s;
    }
    bestScoreEl.textContent = best;

    // Current streak (consecutive days from today going backward)
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = formatDate(d);
        if (records[ds] && records[ds].completed.some(v => v)) {
            streak++;
        } else if (i > 0) {
            break; // don't break on today if not tracked yet
        }
    }
    streakCount.textContent = streak;
}

// ═══════════════════════════════════════════
// CONSISTENCY
// ═══════════════════════════════════════════

function updateConsistency() {
    if (habits.length === 0) {
        consistencyGrid.innerHTML = '<p class="text-muted">Add habits and track days to see consistency.</p>';
        return;
    }

    // Count total days with any data in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const isCurrentMonth = (today.getFullYear() === currentYear && today.getMonth() === currentMonth);
    const maxDays = isCurrentMonth ? todayDate : daysInMonth;

    let html = '';
    habits.forEach((name, i) => {
        let completed = 0;
        let currentStreak = 0;
        let maxStreak = 0;
        let tempStreak = 0;

        for (let d = 1; d <= maxDays; d++) {
            const ds = formatDate(new Date(currentYear, currentMonth, d));
            const rec = records[ds];
            const done = rec && i < rec.completed.length && rec.completed[i];

            if (done) {
                completed++;
                tempStreak++;
                if (tempStreak > maxStreak) maxStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }

        // Current streak (from latest day going backward)
        for (let d = maxDays; d >= 1; d--) {
            const ds = formatDate(new Date(currentYear, currentMonth, d));
            const rec = records[ds];
            const done = rec && i < rec.completed.length && rec.completed[i];
            if (done) currentStreak++;
            else break;
        }

        const pct = maxDays > 0 ? Math.round((completed / maxDays) * 100) : 0;

        html += `<div class="consistency-item">
            <span class="consistency-name">${name}</span>
            <div class="consistency-bar-track">
                <div class="consistency-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="consistency-pct">${pct}%</span>
            <span class="consistency-streak">🔥 ${maxStreak}d best</span>
        </div>`;
    });

    consistencyGrid.innerHTML = html;
}

// ═══════════════════════════════════════════
// GRAPH — Monthly Score Line Chart
// ═══════════════════════════════════════════

function drawGraph() {
    const dpr = window.devicePixelRatio || 1;
    const wrapper = canvas.parentElement;
    const w = wrapper.clientWidth - 32;
    const h = 260;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 28, right: 20, bottom: 36, left: 40 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Gather data for the displayed month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const scores = [];
    let totalScore = 0;
    let daysWithData = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const ds = formatDate(new Date(currentYear, currentMonth, d));
        const rec = records[ds];
        if (rec && rec.completed.some(v => v)) {
            const s = calcScore(ds);
            scores.push({ day: d, score: s });
            totalScore += s;
            daysWithData++;
        }
    }

    // Update summary
    const avg = daysWithData > 0 ? Math.round(totalScore / daysWithData) : 0;
    graphSummary.textContent = daysWithData > 0
        ? `${daysWithData} days tracked · Avg: ${avg} pts`
        : '';

    if (scores.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data for this month yet', w / 2, h / 2);
        return;
    }

    const maxScore = Math.max(...scores.map(s => s.score), 10);

    function px(dayNum, val) {
        const x = pad.left + ((dayNum - 1) / (daysInMonth - 1)) * plotW;
        const y = pad.top + plotH - (val / maxScore) * plotH;
        return { x, y };
    }

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (i / 4) * plotH;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();

        const val = Math.round(maxScore - (i / 4) * maxScore);
        ctx.fillStyle = '#475569';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, pad.left - 8, y + 4);
    }

    // X-axis labels (every 5th day)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    for (let d = 1; d <= daysInMonth; d += 5) {
        const { x } = px(d, 0);
        ctx.fillText(d, x, h - 10);
    }
    // Always show last day
    const { x: lastLabelX } = px(daysInMonth, 0);
    ctx.fillText(daysInMonth, lastLabelX, h - 10);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, 'rgba(56,189,248,0.2)');
    grad.addColorStop(1, 'rgba(56,189,248,0.0)');

    ctx.beginPath();
    scores.forEach((s, i) => {
        const { x, y } = px(s.day, s.score);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    const lastPt = px(scores[scores.length - 1].day, scores[scores.length - 1].score);
    const firstPt = px(scores[0].day, scores[0].score);
    ctx.lineTo(lastPt.x, pad.top + plotH);
    ctx.lineTo(firstPt.x, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    scores.forEach((s, i) => {
        const { x, y } = px(s.day, s.score);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Points + labels
    scores.forEach(s => {
        const { x, y } = px(s.day, s.score);

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.15)';
        ctx.fill();

        // Point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.score, x, y - 14);
    });
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

loadData();
renderChips();
renderCalendar();
updateConsistency();
updateStats();
drawGraph();

// Show today's score if data exists
const todayKey = formatDate(new Date());
if (records[todayKey]) {
    const todayScore = calcScore(todayKey);
    animateScore(todayScore);
    updateStatusBadge(todayScore);
    updateFeedback(todayScore);
}

window.addEventListener('resize', drawGraph);
