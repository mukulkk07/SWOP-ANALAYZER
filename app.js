/* ==========================================================
   SWOP Career Path Analyzer — app.js
   Vanilla JS logic engine with:
     - Zero inline event handlers (all via addEventListener)
     - Consolidated CAREER_DATABASE with idealProfile per career
     - LocalStorage persistence
     - Shareable URL encoding
     - PDF export via html2pdf.js
     - Dynamic industry dropdown filtering
     - Tie-breaker sorting
     - Accessibility: aria-current, sr-only table
     - Floating slider tooltips
     - Loading spinner before results
   ========================================================== */

/* ─────────────────────────────────────────────
   0. CONSTANTS & STATE
   ───────────────────────────────────────────── */
const STORAGE_KEY = 'swop_saved_inputs';
let currentStep = 1;
let radarChartInstance = null;
let captchaAnswer = null;

/* Human-readable skill labels (order must match idealProfile arrays) */
const SKILL_LABELS = [
  'Logic', 'Coding', 'Design', 'Data', 'Networking',
  'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Adaptability'
];

/* Map of input element IDs → skill key used in scoring */
const SKILL_MAP = {
  'skill-logic':   { key: 'logic',   valId: 'val-logic' },
  'skill-coding':  { key: 'coding',  valId: 'val-coding' },
  'skill-design':  { key: 'design',  valId: 'val-design' },
  'skill-data':    { key: 'data',    valId: 'val-data' },
  'skill-network': { key: 'network', valId: 'val-network' },
  'skill-comm':    { key: 'comm',    valId: 'val-comm' },
  'skill-lead':    { key: 'lead',    valId: 'val-lead' },
  'skill-team':    { key: 'team',    valId: 'val-team' },
  'skill-problem': { key: 'problem', valId: 'val-problem' },
  'skill-adapt':   { key: 'adapt',   valId: 'val-adapt' }
};

/* Industry options with labels (single source of truth) */
const INDUSTRY_OPTIONS = [
  { value: 'technology',     label: '💻 Technology & Software' },
  { value: 'finance',        label: '📊 Finance & Fintech' },
  { value: 'healthcare',     label: '🏥 Healthcare & Biotech' },
  { value: 'design',         label: '🎨 Design & Media' },
  { value: 'education',      label: '📚 Education & EdTech' },
  { value: 'cybersecurity',  label: '🔒 Cybersecurity' }
];

/* ─────────────────────────────────────────────
   1. CAREER DATABASE (DRY — idealProfile consolidated)
   ───────────────────────────────────────────── */
const CAREER_DATABASE = [
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    emoji: '🖥️',
    description: 'Build robust server-side systems, APIs, and database architectures powering modern apps.',
    industries: ['technology', 'finance', 'cybersecurity'],
    growth: '22% (Much faster than average)',
    growthNumeric: 22,
    avgSalary: '$92,000 – $145,000',
    salaryMid: 118500,
    keySkills: ['Logic', 'Coding', 'Problem Solving'],
    idealProfile: [9, 9, 3, 6, 7, 5, 4, 6, 8, 5],
    score: function (s) {
      return clamp(s.logic * 4 + s.coding * 4 + s.data * 1.5 + s.problem * 2 + s.network * 1.5 - s.design * 0.5 + industryBonus(s.industries, this.industries) * 8);
    }
  },
  {
    id: 'frontend-developer',
    title: 'Frontend / UI Developer',
    emoji: '🎨',
    description: 'Craft beautiful, responsive user interfaces that delight millions of users daily.',
    industries: ['technology', 'design', 'education'],
    growth: '18% (Faster than average)',
    growthNumeric: 18,
    avgSalary: '$78,000 – $130,000',
    salaryMid: 104000,
    keySkills: ['Design', 'Coding', 'Communication'],
    idealProfile: [6, 8, 9, 4, 3, 7, 4, 7, 7, 6],
    score: function (s) {
      return clamp(s.design * 4 + s.coding * 3.5 + s.comm * 2 + s.problem * 1.5 + s.adapt * 1 - s.network * 0.3 + industryBonus(s.industries, this.industries) * 8);
    }
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    emoji: '📈',
    description: 'Extract insights from complex datasets using statistical models and machine learning.',
    industries: ['technology', 'finance', 'healthcare'],
    growth: '35% (Much faster than average)',
    growthNumeric: 35,
    avgSalary: '$95,000 – $160,000',
    salaryMid: 127500,
    keySkills: ['Data Analysis', 'Logic', 'Coding'],
    idealProfile: [8, 7, 3, 10, 4, 6, 4, 5, 8, 5],
    score: function (s) {
      return clamp(s.data * 4.5 + s.logic * 3 + s.coding * 2.5 + s.problem * 2 + s.comm * 0.8 - s.design * 0.3 + industryBonus(s.industries, this.industries) * 8);
    }
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    emoji: '🔒',
    description: 'Protect organizations from cyber threats through risk assessment, monitoring, and incident response.',
    industries: ['cybersecurity', 'technology', 'finance'],
    growth: '32% (Much faster than average)',
    growthNumeric: 32,
    avgSalary: '$85,000 – $140,000',
    salaryMid: 112500,
    keySkills: ['Networking', 'Logic', 'Problem Solving'],
    idealProfile: [8, 6, 2, 5, 10, 5, 5, 6, 9, 7],
    score: function (s) {
      return clamp(s.network * 4.5 + s.logic * 3 + s.problem * 3 + s.coding * 1.5 + s.adapt * 1 + industryBonus(s.industries, this.industries) * 10);
    }
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    emoji: '📋',
    description: 'Drive product strategy, coordinate cross-functional teams, and ship features users love.',
    industries: ['technology', 'finance', 'education', 'healthcare'],
    growth: '12% (Above average)',
    growthNumeric: 12,
    avgSalary: '$100,000 – $165,000',
    salaryMid: 132500,
    keySkills: ['Leadership', 'Communication', 'Logic'],
    idealProfile: [7, 4, 5, 5, 4, 9, 9, 8, 8, 8],
    score: function (s) {
      return clamp(s.lead * 4 + s.comm * 4 + s.problem * 2.5 + s.logic * 1.5 + s.team * 2 + s.adapt * 1 - s.coding * 0.2 + industryBonus(s.industries, this.industries) * 6);
    }
  },
  {
    id: 'ux-researcher',
    title: 'UX Researcher',
    emoji: '🔬',
    description: 'Understand user behavior through research, testing, and data-driven design decisions.',
    industries: ['design', 'technology', 'education', 'healthcare'],
    growth: '16% (Faster than average)',
    growthNumeric: 16,
    avgSalary: '$75,000 – $125,000',
    salaryMid: 100000,
    keySkills: ['Communication', 'Design', 'Data Analysis'],
    idealProfile: [5, 3, 8, 7, 3, 9, 4, 7, 7, 7],
    score: function (s) {
      return clamp(s.comm * 3.5 + s.design * 3 + s.data * 2.5 + s.problem * 2 + s.team * 1.5 + s.adapt * 1.5 + industryBonus(s.industries, this.industries) * 7);
    }
  },
  {
    id: 'cloud-architect',
    title: 'Cloud / DevOps Engineer',
    emoji: '☁️',
    description: 'Design and manage scalable cloud infrastructure, CI/CD pipelines, and system reliability.',
    industries: ['technology', 'cybersecurity', 'finance'],
    growth: '28% (Much faster than average)',
    growthNumeric: 28,
    avgSalary: '$100,000 – $155,000',
    salaryMid: 127500,
    keySkills: ['Networking', 'Coding', 'Logic'],
    idealProfile: [8, 8, 3, 5, 9, 5, 5, 6, 8, 6],
    score: function (s) {
      return clamp(s.network * 4 + s.coding * 3 + s.logic * 3 + s.problem * 2.5 + s.adapt * 1 + industryBonus(s.industries, this.industries) * 8);
    }
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI / ML Engineer',
    emoji: '🤖',
    description: 'Build intelligent systems using deep learning, NLP, and computer vision models at scale.',
    industries: ['technology', 'healthcare', 'finance'],
    growth: '40% (Explosive growth)',
    growthNumeric: 40,
    avgSalary: '$110,000 – $180,000',
    salaryMid: 145000,
    keySkills: ['Data Analysis', 'Coding', 'Logic'],
    idealProfile: [9, 9, 2, 10, 5, 5, 4, 5, 9, 6],
    score: function (s) {
      return clamp(s.data * 4 + s.coding * 4 + s.logic * 3.5 + s.problem * 2 + s.adapt * 0.8 + industryBonus(s.industries, this.industries) * 8);
    }
  },
  {
    id: 'technical-writer',
    title: 'Technical Writer',
    emoji: '✍️',
    description: 'Translate complex technical concepts into clear, user-friendly documentation and guides.',
    industries: ['technology', 'education', 'healthcare'],
    growth: '10% (Average)',
    growthNumeric: 10,
    avgSalary: '$62,000 – $105,000',
    salaryMid: 83500,
    keySkills: ['Communication', 'Adaptability', 'Teamwork'],
    idealProfile: [5, 4, 4, 4, 3, 10, 3, 7, 5, 8],
    score: function (s) {
      return clamp(s.comm * 5 + s.adapt * 2.5 + s.team * 2 + s.problem * 1.5 + s.logic * 1 + s.coding * 0.5 - s.lead * 0.3 + industryBonus(s.industries, this.industries) * 6);
    }
  },
  {
    id: 'health-informatics',
    title: 'Health Informatics Specialist',
    emoji: '🏥',
    description: 'Bridge healthcare and technology by managing medical data systems and EHR platforms.',
    industries: ['healthcare', 'technology', 'education'],
    growth: '17% (Faster than average)',
    growthNumeric: 17,
    avgSalary: '$72,000 – $115,000',
    salaryMid: 93500,
    keySkills: ['Data Analysis', 'Communication', 'Networking'],
    idealProfile: [5, 4, 3, 8, 7, 8, 5, 7, 6, 7],
    score: function (s) {
      return clamp(s.data * 3.5 + s.comm * 3 + s.network * 2.5 + s.problem * 2 + s.team * 1.5 + s.adapt * 1 + industryBonus(s.industries, this.industries) * 9);
    }
  }
];


/* ─────────────────────────────────────────────
   2. HELPER FUNCTIONS
   ───────────────────────────────────────────── */

/** Clamp a value between 0 and 100 */
function clamp(val) {
  return Math.max(0, Math.min(100, Math.round(val)));
}

/** Calculate industry alignment bonus */
function industryBonus(userIndustries, careerIndustries) {
  let bonus = 0;
  if (careerIndustries.includes(userIndustries.primary)) bonus += 1.5;
  if (careerIndustries.includes(userIndustries.secondary)) bonus += 0.8;
  return bonus;
}

/** Gather all user inputs from the DOM */
function gatherInputs() {
  return {
    logic:   parseInt(document.getElementById('skill-logic').value),
    coding:  parseInt(document.getElementById('skill-coding').value),
    design:  parseInt(document.getElementById('skill-design').value),
    data:    parseInt(document.getElementById('skill-data').value),
    network: parseInt(document.getElementById('skill-network').value),
    comm:    parseInt(document.getElementById('skill-comm').value),
    lead:    parseInt(document.getElementById('skill-lead').value),
    team:    parseInt(document.getElementById('skill-team').value),
    problem: parseInt(document.getElementById('skill-problem').value),
    adapt:   parseInt(document.getElementById('skill-adapt').value),
    industries: {
      primary:   document.getElementById('interest-primary').value,
      secondary: document.getElementById('interest-secondary').value
    },
    name: document.getElementById('student-name').value.trim() || 'Student'
  };
}


/* ─────────────────────────────────────────────
   3. STEPPER NAVIGATION
   ───────────────────────────────────────────── */

function goToStep(step) {
  const prev = document.getElementById(`step-${currentStep}`);
  if (prev) prev.classList.remove('active');
  currentStep = step;
  const next = document.getElementById(`step-${currentStep}`);
  if (next) next.classList.add('active');
  updateStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepper() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) continue;

    /* Remove previous aria-current from all dots */
    dot.removeAttribute('aria-current');

    if (i < currentStep) {
      /* Completed step */
      dot.className = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white transition-all duration-300';
      dot.innerHTML = '✓';
    } else if (i === currentStep) {
      /* Active step — add aria-current for accessibility */
      dot.className = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-all duration-300';
      dot.innerHTML = i;
      dot.setAttribute('aria-current', 'step');
    } else {
      /* Future step */
      dot.className = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-surface-700 text-gray-400 transition-all duration-300';
      dot.innerHTML = i;
    }
  }
  /* Progress lines */
  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById(`line-${i}`);
    if (line) line.style.width = (currentStep > i) ? '100%' : '0%';
  }
}


/* ─────────────────────────────────────────────
   4. SLIDER TOOLTIP POSITIONING
   ───────────────────────────────────────────── */

/**
 * Positions the floating tooltip above the slider thumb.
 * Called on input events for every range slider.
 */
function positionTooltip(slider) {
  const wrapper = slider.closest('.slider-wrapper');
  if (!wrapper) return;
  const tooltip = wrapper.querySelector('.slider-tooltip');
  if (!tooltip) return;

  const val = parseInt(slider.value);
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const pct = (val - min) / (max - min);
  const sliderWidth = slider.offsetWidth;
  const thumbOffset = 11; /* half of 22px thumb */
  const left = thumbOffset + pct * (sliderWidth - 2 * thumbOffset);

  tooltip.style.left = `${left}px`;
  tooltip.textContent = val;
}


/* ─────────────────────────────────────────────
   5. INDUSTRY DROPDOWN FILTERING
   ───────────────────────────────────────────── */

/**
 * When Primary Interest changes, disable the same option in the
 * Secondary Interest dropdown (and vice-versa) so the user cannot
 * select the same industry for both.
 */
function syncIndustryDropdowns() {
  const primaryEl   = document.getElementById('interest-primary');
  const secondaryEl = document.getElementById('interest-secondary');
  if (!primaryEl || !secondaryEl) return;

  const primaryVal = primaryEl.value;

  /* Re-enable all options first */
  Array.from(secondaryEl.options).forEach(opt => {
    opt.disabled = false;
    opt.style.display = '';
  });

  /* Disable the matching option in secondary */
  const matchOpt = secondaryEl.querySelector(`option[value="${primaryVal}"]`);
  if (matchOpt) {
    matchOpt.disabled = true;
    /* If currently selected, move to next available */
    if (secondaryEl.value === primaryVal) {
      const firstAvailable = Array.from(secondaryEl.options).find(o => !o.disabled);
      if (firstAvailable) secondaryEl.value = firstAvailable.value;
    }
  }
  saveToLocalStorage();
}


/* ─────────────────────────────────────────────
   6. FORM VALIDATION
   ───────────────────────────────────────────── */

function validateNameField() {
  const nameInput = document.getElementById('student-name');
  const errorMsg  = document.getElementById('name-error');
  if (!nameInput) return false;

  const name = nameInput.value.trim();
  if (name.length === 0) {
    nameInput.classList.add('input-error');
    if (errorMsg) errorMsg.classList.add('visible');
    nameInput.focus();
    return false;
  }
  nameInput.classList.remove('input-error');
  if (errorMsg) errorMsg.classList.remove('visible');
  return true;
}


/* ─────────────────────────────────────────────
   6b. MATH CAPTCHA — GENERATE & VALIDATE
   ───────────────────────────────────────────── */

/**
 * Generates a random addition or subtraction problem.
 * Ensures the result is always a non-negative integer to
 * avoid confusing users with negative answers.
 */
function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1; /* 1–20 */
  const b = Math.floor(Math.random() * 10) + 1; /* 1–10 */
  const isAddition = Math.random() > 0.5;

  let question, answer;
  if (isAddition) {
    question = `${a} + ${b}`;
    answer = a + b;
  } else {
    /* Ensure non-negative result: always subtract smaller from larger */
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    question = `${big} − ${small}`;
    answer = big - small;
  }

  captchaAnswer = answer;

  const questionEl = document.getElementById('captcha-question');
  if (questionEl) questionEl.textContent = `What is ${question}?`;

  /* Clear previous user input and error state */
  const answerInput = document.getElementById('captcha-answer');
  if (answerInput) {
    answerInput.value = '';
    answerInput.classList.remove('input-error');
  }
  const errorEl = document.getElementById('captcha-error');
  if (errorEl) errorEl.classList.remove('visible');
}

/** Validates the user's CAPTCHA answer. Returns true if correct. */
function validateCaptcha() {
  const answerInput = document.getElementById('captcha-answer');
  const errorEl     = document.getElementById('captcha-error');
  if (!answerInput) return false;

  const userAnswer = answerInput.value.trim();

  if (userAnswer === '' || parseInt(userAnswer, 10) !== captchaAnswer) {
    /* Regenerate the question inline (avoid calling generateCaptcha which resets DOM state) */
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const isAddition = Math.random() > 0.5;
    let question;
    if (isAddition) {
      question = `${a} + ${b}`;
      captchaAnswer = a + b;
    } else {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      question = `${big} \u2212 ${small}`;
      captchaAnswer = big - small;
    }
    const questionEl = document.getElementById('captcha-question');
    if (questionEl) questionEl.textContent = `What is ${question}?`;

    /* Show error state — keep the user's answer visible for context */
    answerInput.classList.add('input-error');
    if (errorEl) errorEl.classList.add('visible');
    answerInput.focus();
    return false;
  }

  /* Correct — clear error state */
  answerInput.classList.remove('input-error');
  if (errorEl) errorEl.classList.remove('visible');
  return true;
}


/* ─────────────────────────────────────────────
   7. LOCAL STORAGE — SAVE & RESTORE
   ───────────────────────────────────────────── */

function saveToLocalStorage() {
  const data = {};
  /* Save all slider values */
  Object.keys(SKILL_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  /* Save dropdowns and name */
  const primary   = document.getElementById('interest-primary');
  const secondary = document.getElementById('interest-secondary');
  const nameField = document.getElementById('student-name');
  if (primary)   data['interest-primary']   = primary.value;
  if (secondary) data['interest-secondary'] = secondary.value;
  if (nameField) data['student-name']       = nameField.value;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* localStorage may be unavailable in private mode — fail gracefully */
  }
}

function restoreFromLocalStorage() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return;
  }
  if (!data) return;

  /* Restore sliders */
  Object.keys(SKILL_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el && data[id] !== undefined) {
      el.value = data[id];
      /* Update the displayed number */
      const valEl = document.getElementById(SKILL_MAP[id].valId);
      if (valEl) valEl.textContent = data[id];
    }
  });
  /* Restore dropdowns */
  const primary   = document.getElementById('interest-primary');
  const secondary = document.getElementById('interest-secondary');
  const nameField = document.getElementById('student-name');
  if (primary   && data['interest-primary'])   primary.value   = data['interest-primary'];
  if (secondary && data['interest-secondary']) secondary.value = data['interest-secondary'];
  if (nameField && data['student-name'])       nameField.value = data['student-name'];

  /* Sync dropdowns after restore */
  syncIndustryDropdowns();
}


/* ─────────────────────────────────────────────
   8. SHAREABLE URL
   ───────────────────────────────────────────── */

/**
 * Encodes the user's current inputs into URL search params.
 * Format: ?l=9&c=8&d=3&da=7&n=5&cm=7&le=4&t=6&p=8&a=5&pi=technology&si=finance&nm=Arjun
 */
function buildShareableURL() {
  const s = gatherInputs();
  const params = new URLSearchParams({
    l: s.logic, c: s.coding, d: s.design, da: s.data, n: s.network,
    cm: s.comm, le: s.lead, t: s.team, p: s.problem, a: s.adapt,
    pi: s.industries.primary, si: s.industries.secondary, nm: s.name
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/** Loads inputs from URL params if present, then auto-runs analysis */
function loadFromURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('l')) return false; /* No shared data */

  const mapping = {
    l: 'skill-logic', c: 'skill-coding', d: 'skill-design',
    da: 'skill-data', n: 'skill-network', cm: 'skill-comm',
    le: 'skill-lead', t: 'skill-team', p: 'skill-problem', a: 'skill-adapt'
  };

  Object.entries(mapping).forEach(([param, id]) => {
    const val = params.get(param);
    const el  = document.getElementById(id);
    if (val && el) {
      el.value = val;
      const valEl = document.getElementById(SKILL_MAP[id].valId);
      if (valEl) valEl.textContent = val;
    }
  });

  const primary   = document.getElementById('interest-primary');
  const secondary = document.getElementById('interest-secondary');
  const nameField = document.getElementById('student-name');
  if (params.get('pi') && primary)   primary.value   = params.get('pi');
  if (params.get('si') && secondary) secondary.value = params.get('si');
  if (params.get('nm') && nameField) nameField.value = params.get('nm');

  syncIndustryDropdowns();
  return true;
}

/** Copy shareable URL to clipboard and show a toast */
function shareResults() {
  const url = buildShareableURL();
  navigator.clipboard.writeText(url).then(() => {
    showToast('✅ Shareable link copied to clipboard!');
  }).catch(() => {
    /* Fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Shareable link copied to clipboard!');
  });
}


/* ─────────────────────────────────────────────
   9. TOAST NOTIFICATION
   ───────────────────────────────────────────── */

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}


/* ─────────────────────────────────────────────
   10. MAIN ANALYSIS ENGINE
   ───────────────────────────────────────────── */

function analyzeCareer() {
  /* ── Validate name ── */
  if (!validateNameField()) return;

  /* ── Validate CAPTCHA ── */
  if (!validateCaptcha()) return;

  const skills = gatherInputs();

  /* ── Score every career ── */
  const results = CAREER_DATABASE.map(career => ({
    ...career,
    fitScore: career.score(skills)
  }));

  /**
   * ── Tie-breaker sort ──
   * Primary:   fitScore (desc)
   * Secondary: salaryMid (desc) — higher-paying career wins ties
   * Tertiary:  growthNumeric (desc) — faster-growing career wins remaining ties
   */
  results.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (b.salaryMid !== a.salaryMid) return b.salaryMid - a.salaryMid;
    return b.growthNumeric - a.growthNumeric;
  });

  /* ── Show loading spinner for 1.5s ── */
  const loadingEl = document.getElementById('loading-overlay');
  const resultsEl = document.getElementById('results-content');

  goToStep(4);

  if (loadingEl && resultsEl) {
    loadingEl.classList.add('active');
    resultsEl.style.display = 'none';

    setTimeout(() => {
      loadingEl.classList.remove('active');
      resultsEl.style.display = 'block';
      renderDashboard(skills, results);
    }, 1500);
  } else {
    renderDashboard(skills, results);
  }
}


/* ─────────────────────────────────────────────
   11. DASHBOARD RENDERER
   ───────────────────────────────────────────── */

function renderDashboard(skills, results) {
  /* ── Greeting ── */
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = `Here's your personalized SWOP analysis, ${skills.name}.`;

  /* ── Build radar chart ── */
  const userData = [
    skills.logic, skills.coding, skills.design, skills.data, skills.network,
    skills.comm, skills.lead, skills.team, skills.problem, skills.adapt
  ];
  const topCareer = results[0];
  const idealData = topCareer.idealProfile || [5,5,5,5,5,5,5,5,5,5];

  if (radarChartInstance) radarChartInstance.destroy();

  const ctx = document.getElementById('radarChart');
  if (ctx) {
    radarChartInstance = new Chart(ctx.getContext('2d'), {
      type: 'radar',
      data: {
        labels: SKILL_LABELS,
        datasets: [
          {
            label: 'Your Profile',
            data: userData,
            backgroundColor: 'rgba(52, 120, 255, 0.2)',
            borderColor: 'rgba(52, 120, 255, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(52, 120, 255, 1)',
            pointRadius: 4
          },
          {
            label: `Ideal: ${topCareer.title}`,
            data: idealData,
            backgroundColor: 'rgba(168, 85, 247, 0.12)',
            borderColor: 'rgba(168, 85, 247, 0.7)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointBackgroundColor: 'rgba(168, 85, 247, 0.7)',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: { stepSize: 2, color: '#9ca3af', backdropColor: 'transparent', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' },
            angleLines: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { color: '#d1d5db', font: { size: 11, weight: '500' } }
          }
        },
        plugins: {
          legend: { labels: { color: '#d1d5db', usePointStyle: true, padding: 16, font: { size: 12 } } }
        }
      }
    });
  }

  /* ── Screen-reader accessible table (hidden visually) ── */
  const srTable = document.getElementById('sr-chart-table');
  if (srTable) {
    let rows = '';
    SKILL_LABELS.forEach((label, i) => {
      rows += `<tr><td>${label}</td><td>${userData[i]}</td><td>${idealData[i]}</td></tr>`;
    });
    srTable.querySelector('tbody').innerHTML = rows;
  }

  /* ── SWOP Summary Cards ── */
  const allSkillValues = [
    { name: 'Logic',           val: skills.logic },
    { name: 'Coding',          val: skills.coding },
    { name: 'Design',          val: skills.design },
    { name: 'Data Analysis',   val: skills.data },
    { name: 'Networking',      val: skills.network },
    { name: 'Communication',   val: skills.comm },
    { name: 'Leadership',      val: skills.lead },
    { name: 'Teamwork',        val: skills.team },
    { name: 'Problem Solving', val: skills.problem },
    { name: 'Adaptability',    val: skills.adapt }
  ];
  allSkillValues.sort((a, b) => b.val - a.val);

  const strengths  = allSkillValues.slice(0, 3).map(s => s.name);
  const weaknesses = allSkillValues.slice(-2).map(s => s.name);

  const swopEl = document.getElementById('swopSummary');
  if (swopEl) {
    swopEl.innerHTML = `
      <div class="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-green-400 font-semibold mb-1">Strengths</div>
        <div class="text-sm font-bold text-green-300">${strengths.join(', ')}</div>
      </div>
      <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">Weaknesses</div>
        <div class="text-sm font-bold text-red-300">${weaknesses.join(', ')}</div>
      </div>
      <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1">Opportunities</div>
        <div class="text-sm font-bold text-amber-300">${results[0].growth}</div>
      </div>
      <div class="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-brand-400 font-semibold mb-1">Projection</div>
        <div class="text-sm font-bold text-brand-300">${results[0].title}</div>
      </div>`;
  }

  /* ── Career Projection Cards (top 2) ── */
  const cardsEl = document.getElementById('careerCards');
  if (cardsEl) {
    const top2 = results.slice(0, 2);
    let cardsHTML = '';
    top2.forEach((career, idx) => {
      const rank = idx === 0 ? '🥇' : '🥈';
      const barColor = idx === 0
        ? 'bg-gradient-to-r from-brand-500 to-purple-500'
        : 'bg-gradient-to-r from-cyan-500 to-brand-500';
      cardsHTML += `
        <div class="proj-card glass rounded-2xl p-5 border border-white/5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl">${career.emoji}</span>
              <div>
                <div class="text-xs text-gray-400 font-medium">${rank} #${idx + 1} Match</div>
                <h4 class="text-lg font-bold">${career.title}</h4>
              </div>
            </div>
            <span class="text-2xl font-black bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">${career.fitScore}%</span>
          </div>
          <p class="text-gray-400 text-sm mb-3">${career.description}</p>
          <div class="w-full h-2 bg-surface-700 rounded-full overflow-hidden mb-3">
            <div class="${barColor} h-full rounded-full transition-all duration-700" style="width:${career.fitScore}%"></div>
          </div>
          <div class="flex flex-wrap gap-3 text-xs text-gray-400">
            <span>📈 Growth: <strong class="text-gray-200">${career.growth}</strong></span>
            <span>💰 Salary: <strong class="text-gray-200">${career.avgSalary}</strong></span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${career.keySkills.map(sk => `<span class="badge-shimmer text-[11px] text-gray-300 px-2.5 py-1 rounded-full">${sk}</span>`).join('')}
          </div>
        </div>`;
    });
    cardsEl.innerHTML = cardsHTML;
  }

  /* ── Skill Badges ── */
  const badgesEl = document.getElementById('skillBadges');
  if (badgesEl) {
    const skillLabels = {
      logic: 'Logic', coding: 'Coding', design: 'Design', data: 'Data Analysis',
      network: 'Networking', comm: 'Communication', lead: 'Leadership',
      team: 'Teamwork', problem: 'Problem Solving', adapt: 'Adaptability'
    };
    let badgesHTML = '';
    for (const [key, label] of Object.entries(skillLabels)) {
      const val = skills[key];
      let tier, tierColor;
      if (val >= 8) {
        tier = 'Expert';
        tierColor = 'text-green-400 border-green-500/30 bg-green-500/10';
      } else if (val >= 5) {
        tier = 'Skilled';
        tierColor = 'text-brand-400 border-brand-500/30 bg-brand-500/10';
      } else {
        tier = 'Developing';
        tierColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      }
      badgesHTML += `<span class="${tierColor} text-[11px] font-medium px-3 py-1.5 rounded-full border">${label}: ${val}/10 · ${tier}</span>`;
    }
    badgesEl.innerHTML = badgesHTML;
  }
}


/* ─────────────────────────────────────────────
   12. PDF EXPORT (via html2pdf.js)
   ───────────────────────────────────────────── */

function buildPDFReportNode(skills, results) {
  const container = document.createElement('div');
  container.id = 'pdf-report-container';

  const topCareer = results[0];
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Helper for skill bars
  const allSkillValues = [
    { name: 'Logic',           val: skills.logic },
    { name: 'Coding',          val: skills.coding },
    { name: 'Design',          val: skills.design },
    { name: 'Data Analysis',   val: skills.data },
    { name: 'Networking',      val: skills.network },
    { name: 'Communication',   val: skills.comm },
    { name: 'Leadership',      val: skills.lead },
    { name: 'Teamwork',        val: skills.team },
    { name: 'Problem Solving', val: skills.problem },
    { name: 'Adaptability',    val: skills.adapt }
  ];
  allSkillValues.sort((a, b) => b.val - a.val);
  const strengths  = allSkillValues.slice(0, 3).map(s => s.name);
  const weaknesses = allSkillValues.slice(-2).map(s => s.name);

  // Helper for generating skill row HTML
  const generateSkillRows = (skillsArray) => {
    return skillsArray.map(s => `
      <div class="pdf-skill-row">
        <div class="pdf-skill-name">${s.name}</div>
        <div class="pdf-skill-bar-bg">
          <div class="pdf-skill-bar-fill bg-brand-500" style="width: ${s.val * 10}%"></div>
        </div>
        <div class="pdf-skill-val">${s.val}/10</div>
      </div>
    `).join('');
  };

  container.innerHTML = `
    <!-- PAGE 1: COVER -->
    <div class="pdf-page pdf-cover">
      <div class="pdf-cover-logo">🧭</div>
      <div class="pdf-title">SWOP Analyzer</div>
      <div class="pdf-subtitle">Career Path Assessment Report</div>
      
      <div class="pdf-cover-name">${skills.name}</div>
      <div class="pdf-cover-date">${dateStr}</div>

      <div class="pdf-card" style="width: 80%; margin: 40px auto; text-align: left;">
        <h3 class="pdf-h3 text-center mb-4 border-b border-white/10 pb-2">Executive Summary</h3>
        <div class="pdf-grid-2">
          <div>
            <strong class="text-green-400 block mb-1">Top Strengths</strong>
            <span class="text-gray-300 text-sm">${strengths.join(', ')}</span>
          </div>
          <div>
            <strong class="text-red-400 block mb-1">Areas to Develop</strong>
            <span class="text-gray-300 text-sm">${weaknesses.join(', ')}</span>
          </div>
          <div>
            <strong class="text-amber-400 block mb-1">Market Opportunity</strong>
            <span class="text-gray-300 text-sm">${topCareer.growth}</span>
          </div>
          <div>
            <strong class="text-brand-400 block mb-1">Top Career Match</strong>
            <span class="text-gray-300 text-sm">${topCareer.title}</span>
          </div>
        </div>
      </div>
      <div class="pdf-footer">
        <span>SWOP Analyzer Report</span>
        <span>Page 1 of 5</span>
      </div>
    </div>
    <div class="html2pdf__page-break"></div>

    <!-- PAGE 2: RADAR CHART -->
    <div class="pdf-page">
      <h2 class="pdf-h2">Skill Profile Analysis</h2>
      <p class="pdf-text mb-6">A comparative breakdown of your skills against the ideal profile for a <strong>${topCareer.title}</strong>.</p>
      
      <div class="pdf-card" style="display: flex; justify-content: center; align-items: center; min-height: 500px;">
        <!-- Chart image will be injected here -->
        <img id="pdf-chart-img" style="max-width: 100%; height: auto;" />
      </div>

      <div class="pdf-footer">
        <span>SWOP Analyzer Report</span>
        <span>Page 2 of 5</span>
      </div>
    </div>
    <div class="html2pdf__page-break"></div>

    <!-- PAGE 3: TOP MATCHES -->
    <div class="pdf-page">
      <h2 class="pdf-h2">Top Career Matches</h2>
      <p class="pdf-text mb-6">Based on your SWOP analysis, here are the optimal career paths that align with your profile.</p>
      
      ${results.slice(0, 4).map((career, idx) => `
        <div class="pdf-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <span style="font-size: 24px; margin-right: 10px;">${career.emoji}</span>
              <span style="font-size: 14px; color: #9ca3af;">Match #${idx + 1}</span>
              <h3 class="pdf-h3" style="margin: 4px 0 0 0;">${career.title}</h3>
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #599fff;">${career.fitScore}%</div>
          </div>
          <p class="pdf-text mb-4" style="color: #9ca3af;">${career.description}</p>
          <div class="pdf-grid-2 mb-3">
            <div class="pdf-text">📈 Growth: <strong>${career.growth}</strong></div>
            <div class="pdf-text">💰 Salary: <strong>${career.avgSalary}</strong></div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${career.keySkills.map(sk => `<span style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 99px; font-size: 11px; color: #d1d5db;">${sk}</span>`).join('')}
          </div>
        </div>
      `).join('')}

      <div class="pdf-footer">
        <span>SWOP Analyzer Report</span>
        <span>Page 3 of 5</span>
      </div>
    </div>
    <div class="html2pdf__page-break"></div>

    <!-- PAGE 4: SKILL ASSESSMENT SUMMARY -->
    <div class="pdf-page">
      <h2 class="pdf-h2">Skill Assessment Summary</h2>
      <p class="pdf-text mb-6">Detailed breakdown of your self-assessed technical and soft skills.</p>
      
      <div class="pdf-grid-2 gap-6">
        <div class="pdf-card">
          <h3 class="pdf-h3 text-center mb-6">Technical Skills</h3>
          ${generateSkillRows([
            { name: 'Logic / Analytics', val: skills.logic },
            { name: 'Programming',       val: skills.coding },
            { name: 'Design',            val: skills.design },
            { name: 'Data / Math',       val: skills.data },
            { name: 'Networking',        val: skills.network }
          ].sort((a,b) => b.val - a.val))}
        </div>
        <div class="pdf-card">
          <h3 class="pdf-h3 text-center mb-6">Soft Skills</h3>
          ${generateSkillRows([
            { name: 'Communication',   val: skills.comm },
            { name: 'Leadership',      val: skills.lead },
            { name: 'Teamwork',        val: skills.team },
            { name: 'Problem Solving', val: skills.problem },
            { name: 'Adaptability',    val: skills.adapt }
          ].sort((a,b) => b.val - a.val))}
        </div>
      </div>

      <div class="pdf-footer">
        <span>SWOP Analyzer Report</span>
        <span>Page 4 of 5</span>
      </div>
    </div>
    <div class="html2pdf__page-break"></div>

    <!-- PAGE 5: RECOMMENDATIONS -->
    <div class="pdf-page">
      <h2 class="pdf-h2">Strategic Recommendations</h2>
      <p class="pdf-text mb-6">Actionable steps to bridge the gap between your current profile and your ideal career path.</p>
      
      <div class="pdf-card mb-6">
        <h3 class="pdf-h3" style="color: #a855f7;">Focus Areas</h3>
        <p class="pdf-text">Based on your profile, you should prioritize developing your <strong>${weaknesses.join(' and ')}</strong>. Improving these areas will significantly increase your fit score for top-tier roles in the ${skills.industries.primary} industry.</p>
      </div>

      <div class="pdf-card mb-6">
        <h3 class="pdf-h3" style="color: #3478ff;">Next Steps</h3>
        <ul style="list-style-type: disc; padding-left: 20px; color: #d1d5db; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 8px;">Leverage your strengths in <strong>${strengths[0]}</strong> to take on new projects.</li>
          <li style="margin-bottom: 8px;">Consider certifications or courses relevant to <strong>${topCareer.title}</strong>.</li>
          <li style="margin-bottom: 8px;">Network with professionals in the <strong>${skills.industries.secondary}</strong> space, your secondary interest.</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: auto; padding-bottom: 40px;">
        <div style="font-size: 24px; margin-bottom: 10px;">🚀</div>
        <div style="font-size: 16px; font-weight: bold; color: #ffffff;">Keep growing and building your future!</div>
      </div>

      <div class="pdf-footer">
        <span>SWOP Analyzer Report</span>
        <span>Page 5 of 5</span>
      </div>
    </div>
  `;

  return container;
}

function downloadPDF() {
  if (typeof html2pdf === 'undefined') {
    showToast('⚠️ PDF library still loading. Please try again in a moment.');
    return;
  }
  
  if (!document.getElementById('results-content') || document.getElementById('results-content').style.display === 'none') {
    showToast('⚠️ No results to export. Please run the analysis first.');
    return;
  }

  showToast('📄 Preparing high-quality PDF…');

  const skills = gatherInputs();
  // Recalculate results since they aren't stored globally
  const results = CAREER_DATABASE.map(career => ({
    ...career,
    fitScore: career.score(skills)
  }));
  results.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (b.salaryMid !== a.salaryMid) return b.salaryMid - a.salaryMid;
    return b.growthNumeric - a.growthNumeric;
  });

  // Build the hidden PDF DOM
  const pdfContainer = buildPDFReportNode(skills, results);
  document.body.appendChild(pdfContainer);

  // Generate high-res static chart image
  const topCareer = results[0];
  const userData = [
    skills.logic, skills.coding, skills.design, skills.data, skills.network,
    skills.comm, skills.lead, skills.team, skills.problem, skills.adapt
  ];
  const idealData = topCareer.idealProfile || [5,5,5,5,5,5,5,5,5,5];

  // Create a hidden canvas for the chart
  const canvasContainer = document.createElement('div');
  canvasContainer.style.width = '600px';
  canvasContainer.style.height = '600px';
  canvasContainer.style.position = 'absolute';
  canvasContainer.style.left = '-9999px';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  canvasContainer.appendChild(canvas);
  document.body.appendChild(canvasContainer);

  const pdfChart = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: SKILL_LABELS,
      datasets: [
        {
          label: 'Your Profile',
          data: userData,
          backgroundColor: 'rgba(52, 120, 255, 0.2)',
          borderColor: 'rgba(52, 120, 255, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(52, 120, 255, 1)',
          pointRadius: 4
        },
        {
          label: `Ideal: ${topCareer.title}`,
          data: idealData,
          backgroundColor: 'rgba(168, 85, 247, 0.12)',
          borderColor: 'rgba(168, 85, 247, 0.7)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointBackgroundColor: 'rgba(168, 85, 247, 0.7)',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: false, // Must be false for explicit sizing
      animation: false,  // CRITICAL: disable animation so it renders instantly
      devicePixelRatio: 3, // High-res canvas rendering
      scales: {
        r: {
          beginAtZero: true,
          max: 10,
          ticks: { stepSize: 2, color: '#9ca3af', backdropColor: 'transparent', font: { size: 14 } },
          grid: { color: 'rgba(255,255,255,0.1)' },
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#ffffff', font: { size: 16, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { labels: { color: '#ffffff', usePointStyle: true, padding: 20, font: { size: 16 } } }
      }
    }
  });

  // Convert rendered chart to base64 and set to image
  const imgData = pdfChart.toBase64Image();
  const imgEl = document.getElementById('pdf-chart-img');
  imgEl.src = imgData;

  // Cleanup temporary chart
  pdfChart.destroy();
  document.body.removeChild(canvasContainer);

  // html2pdf configuration
  const opt = {
    margin:      0, // Using CSS padding inside .pdf-page instead
    filename:    `SWOP_Report_${skills.name.replace(/\s+/g, '_')}.pdf`,
    image:       { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 3, useCORS: true, letterRendering: true, backgroundColor: '#11111b' },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:   { mode: ['css', 'legacy'] }
  };

  html2pdf().set(opt).from(pdfContainer).save().then(() => {
    // Cleanup hidden PDF DOM
    document.body.removeChild(pdfContainer);
    showToast('✅ PDF Report downloaded successfully!');
  }).catch((err) => {
    document.body.removeChild(pdfContainer);
    showToast('❌ Error generating PDF.');
    console.error(err);
  });
}


/* ─────────────────────────────────────────────
   13. INITIALIZATION — DOMContentLoaded
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Attach slider event listeners ── */
  Object.entries(SKILL_MAP).forEach(([inputId, meta]) => {
    const slider = document.getElementById(inputId);
    const valDisplay = document.getElementById(meta.valId);
    if (!slider || !valDisplay) return;

    slider.addEventListener('input', function () {
      valDisplay.textContent = this.value;
      positionTooltip(this);
      saveToLocalStorage();
    });

    /* Initial tooltip position */
    requestAnimationFrame(() => positionTooltip(slider));
  });

  /* ── Industry dropdown listeners ── */
  const primarySelect   = document.getElementById('interest-primary');
  const secondarySelect = document.getElementById('interest-secondary');
  if (primarySelect) {
    primarySelect.addEventListener('change', function () {
      syncIndustryDropdowns();
      saveToLocalStorage();
    });
  }
  if (secondarySelect) {
    secondarySelect.addEventListener('change', function () {
      saveToLocalStorage();
    });
  }

  /* ── Name field listeners ── */
  const nameField = document.getElementById('student-name');
  if (nameField) {
    nameField.addEventListener('input', function () {
      /* Clear error state as user types */
      this.classList.remove('input-error');
      const errorMsg = document.getElementById('name-error');
      if (errorMsg) errorMsg.classList.remove('visible');
      saveToLocalStorage();
    });
  }

  /* ── CAPTCHA input listener (clear error on typing) ── */
  const captchaInput = document.getElementById('captcha-answer');
  if (captchaInput) {
    captchaInput.addEventListener('input', function () {
      this.classList.remove('input-error');
      const captchaErr = document.getElementById('captcha-error');
      if (captchaErr) captchaErr.classList.remove('visible');
    });
  }

  /* ── Navigation button listeners (replacing inline onclick) ── */
  /* Step 1 → 2 */
  const btnStep1Next = document.getElementById('btn-step1-next');
  if (btnStep1Next) btnStep1Next.addEventListener('click', () => goToStep(2));

  /* Step 2 → 1 (back) */
  const btnStep2Back = document.getElementById('btn-step2-back');
  if (btnStep2Back) btnStep2Back.addEventListener('click', () => goToStep(1));

  /* Step 2 → 3 */
  const btnStep2Next = document.getElementById('btn-step2-next');
  if (btnStep2Next) btnStep2Next.addEventListener('click', () => goToStep(3));

  /* Step 3 → 2 (back) */
  const btnStep3Back = document.getElementById('btn-step3-back');
  if (btnStep3Back) btnStep3Back.addEventListener('click', () => goToStep(2));

  /* Step 3 → analyze */
  const btnAnalyze = document.getElementById('btn-analyze');
  if (btnAnalyze) btnAnalyze.addEventListener('click', analyzeCareer);

  /* Step 4 → retake */
  const btnRetake = document.getElementById('btn-retake');
  if (btnRetake) btnRetake.addEventListener('click', () => goToStep(1));

  /* Step 4 → PDF download */
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) btnDownload.addEventListener('click', downloadPDF);

  /* Step 4 → share */
  const btnShare = document.getElementById('btn-share');
  if (btnShare) btnShare.addEventListener('click', shareResults);

  /* ── Check for shared URL params first, then localStorage ── */
  const hasURLData = loadFromURLParams();
  if (hasURLData) {
    /* Auto-run analysis for shared links */
    analyzeCareer();
  } else {
    restoreFromLocalStorage();
  }

  /* ── Initial industry sync ── */
  syncIndustryDropdowns();

  /* ── Generate initial CAPTCHA ── */
  generateCaptcha();

  /* ── Reposition tooltips on window resize ── */
  window.addEventListener('resize', function () {
    Object.keys(SKILL_MAP).forEach(id => {
      const slider = document.getElementById(id);
      if (slider) positionTooltip(slider);
    });
  });
});
