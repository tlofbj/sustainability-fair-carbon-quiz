'use strict';

// ─────────────────────────────────────────────────
// Name Generator
// ─────────────────────────────────────────────────
const ADJECTIVES = [
  'Ancient', 'Brave', 'Cosmic', 'Daring', 'Electric',
  'Fearless', 'Gentle', 'Humble', 'Infinite', 'Jolly',
  'Keen', 'Lunar', 'Mighty', 'Noble', 'Organic',
  'Patient', 'Quiet', 'Radiant', 'Solar', 'Timeless',
  'Vibrant', 'Wandering', 'Xenial', 'Yearning', 'Zealous',
  'Brilliant', 'Calm', 'Distant', 'Earnest', 'Fantastic',
];

const NOUNS = [
  'Albatross', 'Beaver', 'Crane', 'Dolphin', 'Egret',
  'Falcon', 'Gecko', 'Heron', 'Ibis', 'Jaguar',
  'Kestrel', 'Lynx', 'Manta', 'Narwhal', 'Osprey',
  'Puffin', 'Quokka', 'Raven', 'Sparrow', 'Turtle',
  'Uakari', 'Vole', 'Whale', 'Xerus', 'Yak',
  'Finch', 'Otter', 'Panda', 'Robin', 'Swift',
];

function randomName() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

// ─────────────────────────────────────────────────
// Corporate Emissions Data (Final Boss)
// Sources: Company 2023 sustainability reports / CDP disclosures
// Annual figures in million tonnes CO₂e (Mt CO₂e), Scope 1+2+3
// ─────────────────────────────────────────────────
const FINAL_BOSSES = [
  { name: 'Shell',       industry: 'Oil & Gas',     annual_mt: 1204,   year: 2023 },
  { name: 'Chevron',     industry: 'Oil & Gas',     annual_mt: 745,    year: 2023 },
  { name: 'ExxonMobil',  industry: 'Oil & Gas',     annual_mt: 728,    year: 2023 },
  { name: 'Walmart',     industry: 'Retail',        annual_mt: 643.8,  year: 2023 },
  { name: 'Amazon',      industry: 'Tech / Retail', annual_mt: 68.82,  year: 2023 },
  { name: "McDonald's",  industry: 'Fast Food',     annual_mt: 60.46,  year: 2024 },
  { name: 'Apple',       industry: 'Technology',    annual_mt: 16.1,   year: 2023 },
  { name: 'H&M Group',   industry: 'Fashion',       annual_mt: 8.59,   year: 2023 },
];

// ─────────────────────────────────────────────────
// Quiz State
// ─────────────────────────────────────────────────
const state = {
  currentQuestion: 0,
  answers:         [],   // computed kg CO₂e/day per question (null = unanswered)
  selectedOptions: [],   // raw option.co2e for choice questions (for re-render highlight)
  numericInputs:   [],   // raw numeric input values (for re-render pre-fill)
  householdSize:   3,    // default; updated by household_size question
  name:       '',
  classYear:  '',
  email:      '',
  dailyCo2e:  null,
  tier:       '',
  rank:       null,
};

// ─────────────────────────────────────────────────
// Screen Management
// ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n, decimals = 1) {
  return Number(n).toFixed(decimals);
}

function fmtNumber(n) {
  return Number(n).toLocaleString('en-US');
}

function tierClass(tier) {
  return tier.toLowerCase().replace(/ /g, '-');
}

function formatSeconds(s) {
  if (s < 1)    return 'less than a second';
  if (s < 60)   return `about ${Math.round(s)} second${Math.round(s) !== 1 ? 's' : ''}`;
  if (s < 3600) return `about ${Math.round(s / 60)} minute${Math.round(s / 60) !== 1 ? 's' : ''}`;
  const hrs = Math.round(s / 3600);
  return `about ${hrs} hour${hrs !== 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────
// Earth Color (CO₂e → RGB)
// ─────────────────────────────────────────────────
function getEarthColor(dailyCo2e) {
  // Gradient: green (0) → yellow (5) → orange (12) → red (20+)
  let r, g, b;

  if (dailyCo2e < 5) {
    // Green to yellow
    const t = dailyCo2e / 5;
    r = Math.round(22 + (234 - 22) * t);    // #16 → #EA
    g = Math.round(163 + (88 - 163) * t);   // #A3 → #58
    b = Math.round(74 + (8 - 74) * t);      // #4A → #08
  } else if (dailyCo2e < 12) {
    // Yellow to orange
    const t = (dailyCo2e - 5) / 7;
    r = 234;                                 // #EA stays
    g = Math.round(88 - (8 - 88) * t);      // #58 → #08
    b = Math.round(8 + (12 - 8) * t);       // #08 → #0C
  } else {
    // Orange to red
    const t = Math.min(1, (dailyCo2e - 12) / 8);
    r = Math.round(234 + (220 - 234) * t);  // #EA → #DC
    g = Math.round(8 - (8 * t));            // #08 → #00
    b = Math.round(12 - (12 * t));          // #0C → #00
  }

  return `rgb(${r}, ${g}, ${b})`;
}

// ─────────────────────────────────────────────────
// Earth SVG — 8×8 pixelated sphere, rotates
// ─────────────────────────────────────────────────
function createEarthSvg(dailyCo2e) {
  const color = getEarthColor(dailyCo2e);
  const size = 80;
  const blockSize = size / 8;
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;

  // Create 8×8 grid of blocks, only show those inside a circle
  let blocks = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * blockSize;
      const y = row * blockSize;
      const blockCx = x + blockSize / 2;
      const blockCy = y + blockSize / 2;
      const distToCx = Math.sqrt((blockCx - cx) ** 2 + (blockCy - cy) ** 2);

      // Only render blocks inside the circle (with slight tolerance for anti-alias)
      if (distToCx < r) {
        blocks += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" fill="${color}" stroke="none"/>`;
      }
    }
  }

  return `
    <svg class="earth-animation" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <style>
          @keyframes earthRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .earth-animation { animation: earthRotate 20s linear infinite; transform-origin: 50% 50%; }
        </style>
      </defs>
      ${blocks}
    </svg>
  `;
}

// ─────────────────────────────────────────────────
// Quiz Rendering
// ─────────────────────────────────────────────────
function renderQuestion() {
  const questions = window.QUIZ_QUESTIONS;
  const q         = questions[state.currentQuestion];
  const total     = questions.length;
  const isNumeric = q.type === 'numeric' || q.type === 'household_size';

  // Compute running CO₂e total (for Earth color)
  const runningCo2e = state.answers.reduce((sum, v) => sum + (v !== null ? v : 0), 0);

  // Progress bar
  const pct = (state.currentQuestion / total) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';

  // Counter + category pill
  document.getElementById('q-counter').textContent =
    `Question ${state.currentQuestion + 1} of ${total}`;
  document.getElementById('q-category').textContent = q.category;

  const area    = document.getElementById('question-area');
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');

  // ── Numeric / Household-size question ──────────────
  if (isNumeric) {
    const isHousehold = q.type === 'household_size';
    const minVal      = isHousehold ? 1 : 0;
    const currentRaw  = state.numericInputs[state.currentQuestion];

    area.innerHTML = `
      <div class="earth-container">
        ${createEarthSvg(runningCo2e)}
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      ${q.hint ? `<p class="question-hint">${escapeHtml(q.hint)}</p>` : ''}
      <div class="numeric-input-wrap">
        <input type="number"
               id="numeric-q-input"
               class="neo-number-input"
               min="${minVal}"
               max="${q.max || 999}"
               step="${isHousehold ? '1' : 'any'}"
               placeholder="${isHousehold ? '4' : '0'}"
               value="${(currentRaw !== null && currentRaw !== undefined) ? currentRaw : ''}">
        <span class="unit-label">${escapeHtml(q.unit_label || '')}</span>
      </div>
    `;

    const input = document.getElementById('numeric-q-input');

    // Default to disabled until a valid number is entered
    btnNext.disabled = (currentRaw === null || currentRaw === undefined);

    const handleInput = () => {
      const raw = input.value.trim();
      const v   = parseFloat(raw);

      if (raw === '' || isNaN(v) || v < minVal) {
        state.answers[state.currentQuestion]       = null;
        state.numericInputs[state.currentQuestion] = null;
        btnNext.disabled = true;
        return;
      }

      const clamped = Math.min(v, q.max || 9999);
      state.numericInputs[state.currentQuestion] = clamped;

      if (isHousehold) {
        const prev = state.householdSize;
        state.householdSize = Math.max(1, Math.round(clamped));
        state.answers[state.currentQuestion] = 0;

        // Silently recompute any already-answered household-divisor questions
        if (prev !== state.householdSize) {
          questions.forEach((qq, ii) => {
            if (qq.uses_household_divisor) {
              const raw = state.selectedOptions[ii];
              if (raw !== null && raw !== undefined) {
                state.answers[ii] = raw / Math.max(1, state.householdSize);
              }
            }
          });
        }
      } else {
        state.answers[state.currentQuestion] = clamped * (q.co2e_per_unit || 0);
      }

      btnNext.disabled = false;
    };

    input.addEventListener('input', handleInput);

    // Restore previous value on back-navigation
    if (currentRaw !== null && currentRaw !== undefined) {
      handleInput();
    }

    // Auto-focus the input field
    setTimeout(() => input.focus(), 60);

  // ── Choice question ────────────────────────────────
  } else {
    const selected = state.selectedOptions[state.currentQuestion]; // raw option co2e

    area.innerHTML = `
      <div class="earth-container">
        ${createEarthSvg(runningCo2e)}
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      <div class="options-list">
        ${q.options.map(opt => `
          <button class="option-btn ${selected === opt.co2e ? 'selected' : ''}"
                  data-co2e="${opt.co2e}">
            ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    `;

    area.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawCo2e = parseFloat(btn.dataset.co2e);
        state.selectedOptions[state.currentQuestion] = rawCo2e;
        state.answers[state.currentQuestion] = q.uses_household_divisor
          ? rawCo2e / Math.max(1, state.householdSize)
          : rawCo2e;
        renderQuestion();
      });
    });

    btnNext.disabled = selected === null || selected === undefined;
  }

  btnNext.textContent = state.currentQuestion === total - 1 ? 'Submit' : 'Next →';
  btnPrev.disabled    = state.currentQuestion === 0;
}

// ─────────────────────────────────────────────────
// Start Screen
// ─────────────────────────────────────────────────
function initStartScreen() {
  const nameInput = document.getElementById('input-name');
  if (!nameInput) return;

  nameInput.value = randomName();

  document.getElementById('btn-generate-name').addEventListener('click', () => {
    nameInput.value = randomName();
  });

  document.getElementById('input-class').addEventListener('change', e => {
    e.target.classList.remove('input-error');
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    const classInput = document.getElementById('input-class');
    const classVal   = classInput.value;
    if (!classVal) {
      classInput.classList.add('input-error');
      classInput.focus();
      return;
    }

    state.name      = nameInput.value || randomName();
    state.classYear = classVal;
    state.email     = document.getElementById('input-email').value.trim();

    const total = window.QUIZ_QUESTIONS.length;
    state.currentQuestion = 0;
    state.answers         = new Array(total).fill(null);
    state.selectedOptions = new Array(total).fill(null);
    state.numericInputs   = new Array(total).fill(null);
    state.householdSize   = 3; // reset to default

    showScreen('screen-quiz');
    renderQuestion();
  });
}

// ─────────────────────────────────────────────────
// Quiz Navigation
// ─────────────────────────────────────────────────
function initQuizNavigation() {
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  if (!btnNext) return;

  btnNext.addEventListener('click', () => {
    const total = window.QUIZ_QUESTIONS.length;
    if (state.currentQuestion < total - 1) {
      state.currentQuestion++;
      renderQuestion();
    } else {
      submitQuiz();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (state.currentQuestion > 0) {
      state.currentQuestion--;
      renderQuestion();
    }
  });
}

// ─────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────
async function submitQuiz() {
  const btnNext = document.getElementById('btn-next');
  btnNext.textContent = 'Submitting…';
  btnNext.disabled    = true;

  try {
    const res = await fetch('/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:       state.name,
        class_year: state.classYear,
        email:      state.email || undefined,
        answers:    state.answers,
      }),
    });
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    state.dailyCo2e = data.daily_co2e;
    state.tier      = data.tier;
    state.rank      = data.rank;

    renderResultScreen();
    showScreen('screen-result');
  } catch {
    btnNext.textContent = 'Submit';
    btnNext.disabled    = false;
    alert('Something went wrong — please try again.');
  }
}

// ─────────────────────────────────────────────────
// Result Screen
// ─────────────────────────────────────────────────
function renderResultScreen() {
  const dc = state.dailyCo2e;

  document.getElementById('result-name').textContent =
    `${state.name} '${state.classYear}`;

  const badge    = document.getElementById('result-tier');
  badge.textContent = state.tier;
  badge.className   = `tier-badge ${tierClass(state.tier)}`;

  document.getElementById('result-score').textContent = fmt(dc, 1);

  // Derived metrics — only keep the three clean ones
  const annualKg   = dc * 365;
  const annualT    = annualKg / 1000;
  const globalAvgT = 4.7;                      // tonnes/year global average
  const pct        = (annualT - globalAvgT) / globalAvgT * 100;
  const pctStr     = (pct >= 0 ? '+' : '') + Math.abs(Math.round(pct)) + '%';
  const vsStr      = pct >= 0
    ? `${pctStr} above global avg`
    : `${Math.abs(Math.round(pct))}% below global avg`;
  const trees = Math.round(annualKg / 24); // 1 tree absorbs ~24 kg CO₂/year

  const metrics = [
    { label: 'Annual CO₂e',        value: fmt(annualT, 1) + ' t', sub: 'tonnes per year'        },
    { label: 'vs. Global Average', value: pctStr,                  sub: vsStr                    },
    { label: 'Trees to Offset',    value: fmtNumber(trees),        sub: 'trees growing 1 year'   },
  ];

  document.getElementById('metrics-grid').innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(m.label)}</div>
      <div class="metric-value">${escapeHtml(m.value)}</div>
      <div class="metric-sub">${escapeHtml(m.sub)}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────
// Final Boss Screen
// ─────────────────────────────────────────────────
function renderFinalBossScreen() {
  const userAnnualKg = state.dailyCo2e * 365;

  const html = FINAL_BOSSES.map(corp => {
    const corpDailyKg = (corp.annual_mt * 1_000_000_000) / 365;
    const seconds     = (userAnnualKg / corpDailyKg) * 86400;
    const timeStr     = formatSeconds(seconds);
    const annualFmt   = corp.annual_mt >= 1000
      ? (corp.annual_mt / 1000).toFixed(2) + ' Gt'
      : corp.annual_mt + ' Mt';

    return `
      <div class="boss-card">
        <div class="boss-left">
          <div class="boss-name">${escapeHtml(corp.name)}</div>
          <div class="boss-industry">${escapeHtml(corp.industry)} · ${corp.year}</div>
          <div class="boss-time">Emits your annual footprint in <strong>${escapeHtml(timeStr)}</strong></div>
        </div>
        <div class="boss-right">
          <div class="boss-annual">${annualFmt}</div>
          <div class="boss-annual-label">CO₂e / year</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('boss-list').innerHTML = html;
}

// ─────────────────────────────────────────────────
// Actions Screen
// ─────────────────────────────────────────────────
function renderActionsScreen() {
  const questions = window.QUIZ_QUESTIONS;

  // Compute potential savings vs. the optimal answer for each question
  const savings = questions.map((q, i) => {
    if (q.type === 'household_size') {
      return { q, savings: 0 }; // not individually actionable
    }
    if (!q.type || q.type === 'choice') {
      const minCo2e = q.uses_household_divisor
        ? Math.min(...q.options.map(o => o.co2e)) / Math.max(1, state.householdSize)
        : Math.min(...q.options.map(o => o.co2e));
      const selected = state.answers[i] ?? minCo2e;
      return { q, savings: selected - minCo2e };
    }
    // numeric — minimum possible is 0
    return { q, savings: state.answers[i] ?? 0 };
  });

  // Top 3 by savings descending
  const top3 = savings
    .filter(s => s.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 3);

  const actions = top3.length > 0 ? top3 : savings.slice(0, 3);

  document.getElementById('action-list').innerHTML = actions.map(({ q }) => `
    <div class="action-card">
      <span class="action-category">${escapeHtml(q.category)}</span>
      <p class="action-text">${escapeHtml(q.action || '')}</p>
    </div>
  `).join('');

  // Organizations
  const orgs = (window.LOCAL_DATA?.organizations || []).slice(0, 3);
  document.getElementById('org-list').innerHTML = orgs.map(org => `
    <a class="org-card" href="${escapeHtml(org.url)}" target="_blank" rel="noopener">
      <span class="org-icon">${org.icon || '🌿'}</span>
      <div class="org-body">
        <div class="org-name">${escapeHtml(org.name)}</div>
        <div class="org-desc">${escapeHtml(org.description)}</div>
      </div>
      <span class="org-link-arrow">↗</span>
    </a>
  `).join('');

  // Bills
  const bills = (window.LOCAL_DATA?.bills || []).slice(0, 3);
  document.getElementById('bill-list').innerHTML = bills.map(bill => `
    <a class="bill-card" href="${escapeHtml(bill.url)}" target="_blank" rel="noopener">
      <span class="bill-icon">${bill.icon || '📋'}</span>
      <div class="bill-body">
        <div class="bill-number">${escapeHtml(bill.number)}</div>
        <div class="bill-title">${escapeHtml(bill.title)}</div>
        <div class="bill-desc">${escapeHtml(bill.description)}</div>
      </div>
      <span class="bill-link-arrow">↗</span>
    </a>
  `).join('');
}

// ─────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────
function resetQuiz() {
  state.currentQuestion = 0;
  state.answers         = [];
  state.selectedOptions = [];
  state.numericInputs   = [];
  state.householdSize   = 3;
  state.dailyCo2e       = null;
  state.tier            = '';
  state.rank            = null;

  const nameInput = document.getElementById('input-name');
  if (nameInput) nameInput.value = randomName();

  const classInput = document.getElementById('input-class');
  if (classInput) { classInput.selectedIndex = 0; classInput.classList.remove('input-error'); }

  const emailInput = document.getElementById('input-email');
  if (emailInput) emailInput.value = '';

  showScreen('screen-start');
}

// ─────────────────────────────────────────────────
// Scoreboard
// ─────────────────────────────────────────────────
async function initScoreboard() {
  const tbody = document.getElementById('scoreboard-body');
  if (!tbody) return;

  try {
    const res    = await fetch('/api/scores');
    const scores = await res.json();

    document.getElementById('scoreboard-loading').style.display = 'none';

    if (scores.length === 0) {
      document.getElementById('scoreboard-empty').style.display = 'block';
      return;
    }

    document.getElementById('scoreboard-table-wrap').style.display = 'block';

    scores.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      if      (idx === 0) tr.classList.add('top-1');
      else if (idx === 1) tr.classList.add('top-2');
      else if (idx === 2) tr.classList.add('top-3');

      let rankCell;
      if      (entry.rank === 1) rankCell = `<span class="rank-badge gold">1</span>`;
      else if (entry.rank === 2) rankCell = `<span class="rank-badge silver">2</span>`;
      else if (entry.rank === 3) rankCell = `<span class="rank-badge bronze">3</span>`;
      else                       rankCell = `<span class="rank-num">${entry.rank}</span>`;

      const tierBadge = `<span class="tier-badge ${tierClass(entry.tier)}">${escapeHtml(entry.tier)}</span>`;
      const earthCell = `<div class="scoreboard-earth">${createEarthSvg(entry.daily_co2e)}</div>`;

      tr.innerHTML = `
        <td>${rankCell}</td>
        <td>${earthCell}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td>'${escapeHtml(entry.class_year)}</td>
        <td><span class="co2e-value">${fmt(entry.daily_co2e, 1)}</span></td>
        <td>${tierBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    document.getElementById('scoreboard-loading').innerHTML =
      '<p>Failed to load scores. Please refresh the page.</p>';
  }
}

// ─────────────────────────────────────────────────
// Wire up cross-screen buttons
// ─────────────────────────────────────────────────
function initScreenButtons() {
  const wire = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  wire('btn-finalboss',   () => { renderFinalBossScreen(); showScreen('screen-finalboss'); });
  wire('btn-back-result', () => showScreen('screen-result'));
  wire('btn-actions',     () => { renderActionsScreen(); showScreen('screen-actions'); });
  wire('btn-back-boss',   () => showScreen('screen-finalboss'));
  wire('btn-retake',      resetQuiz);
  wire('btn-retake-2',    resetQuiz);
}

// ─────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStartScreen();
  initQuizNavigation();
  initScreenButtons();
  initScoreboard();
});
