/**
 * Co-Studymaxx — Vaia Inspired Study System with Cute Bomb Mascot
 * Core Logic, Mascot Reactions & Quiz Game Engine (Clean Vector Icons, No Emojis)
 */

// ==========================================
// 1. SOUND SYNTHESIZER (Web Audio API)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch (e) {}
  }

  urgentBeep() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {}
  }

  correct() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.18, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.3);
      });
    } catch (e) {}
  }

  wrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  explosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      noise.stop(this.ctx.currentTime + 0.55);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// ==========================================
// 2. SEED REVIEWERS (VAIA COURSE STYLE)
// ==========================================
const DEFAULT_REVIEWERS = [
  {
    id: "course-gen003",
    courseCode: "GEN 003",
    title: "Anatomy Midterms & Musculoskeletal System",
    subject: "Medicine & Health",
    desc: "Cranial nerves, chamber circulation, skeletal system, and nephron units.",
    timeLimit: 15,
    collaborator: "Ethan Villaseñor",
    progressPct: 45,
    stats: { timesPlayed: 6, bestScore: 2450, lastAccuracy: 90 },
    questions: [
      {
        id: "q1",
        question: "Which cranial nerve is responsible for the sensory innervation of the face?",
        options: ["Cranial Nerve V (Trigeminal)", "Cranial Nerve VII (Facial)", "Cranial Nerve X (Vagus)", "Cranial Nerve III (Oculomotor)"],
        correctIndex: 0,
        explanation: "The Trigeminal nerve (CN V) provides primary sensory sensation to the face, scalp, and oral cavity."
      },
      {
        id: "q2",
        question: "Which chamber of the human heart contracts to pump oxygenated blood into the aorta?",
        options: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle"],
        correctIndex: 3,
        explanation: "The left ventricle contracts with high pressure to deliver oxygenated blood to the body via the systemic aorta."
      },
      {
        id: "q3",
        question: "What is the longest and strongest bone in the human skeleton?",
        options: ["Tibia", "Femur", "Fibula", "Humerus"],
        correctIndex: 1,
        explanation: "The femur (thigh bone) is the longest and strongest bone in the human body."
      },
      {
        id: "q4",
        question: "Which tissue structure connects muscle directly to bone?",
        options: ["Ligament", "Tendon", "Cartilage", "Fascia"],
        correctIndex: 1,
        explanation: "Tendons attach muscle to bone, whereas ligaments connect bones to other bones."
      },
      {
        id: "q5",
        question: "What is the primary microscopic filtering unit of the human kidney?",
        options: ["Nephron", "Alveoli", "Glomerulus", "Loop of Henle"],
        correctIndex: 0,
        explanation: "The nephron is the functional unit responsible for filtering blood and forming urine."
      }
    ]
  },
  {
    id: "course-ite298",
    courseCode: "ITE 298",
    title: "Networking Ch. 3: OSI & IP Routing",
    subject: "Computer Science",
    desc: "Layer 1 to Layer 7 breakdown, TCP/IP handshakes, port numbers, and DNS resolution.",
    timeLimit: 15,
    collaborator: "Ethan Villaseñor",
    progressPct: 20,
    stats: { timesPlayed: 3, bestScore: 1800, lastAccuracy: 80 },
    questions: [
      {
        id: "nq1",
        question: "At which layer of the OSI model does packet routing and IP addressing operate?",
        options: ["Data Link Layer (Layer 2)", "Network Layer (Layer 3)", "Transport Layer (Layer 4)", "Session Layer (Layer 5)"],
        correctIndex: 1,
        explanation: "Layer 3 (Network Layer) is responsible for logical IP addressing and packet routing."
      },
      {
        id: "nq2",
        question: "What is the standard sequence of the TCP three-way connection handshake?",
        options: ["ACK -> SYN -> SYN-ACK", "SYN -> SYN-ACK -> ACK", "SYN -> ACK -> DATA", "HELLO -> ACK -> CONFIRM"],
        correctIndex: 1,
        explanation: "TCP initializes reliable connections via SYN (synchronize), SYN-ACK, and ACK (acknowledge)."
      },
      {
        id: "nq3",
        question: "Which port does HTTPS operate on for secure encrypted web traffic by default?",
        options: ["Port 80", "Port 22", "Port 443", "Port 8080"],
        correctIndex: 2,
        explanation: "Port 443 is the standard dedicated port for HTTPS (TLS/SSL)."
      },
      {
        id: "nq4",
        question: "Which protocol translates human-readable domain names into IP addresses?",
        options: ["DHCP", "DNS", "ARP", "NAT"],
        correctIndex: 1,
        explanation: "Domain Name System (DNS) translates human hostnames like google.com into numerical IP addresses."
      }
    ]
  },
  {
    id: "course-lto-rev",
    courseCode: "LTO - REVIEWER",
    title: "Driver Safety, Road Signs & Traffic Rules",
    subject: "General & Licensing",
    desc: "Regulatory signs, right of way rules, emergency protocols, and speed regulations.",
    timeLimit: 15,
    collaborator: "Ethan Villaseñor",
    progressPct: 0,
    stats: { timesPlayed: 1, bestScore: 1100, lastAccuracy: 70 },
    questions: [
      {
        id: "lq1",
        question: "What does an octagonal red sign with white lettering indicate?",
        options: ["Yield Right of Way", "Full Stop Required", "Speed Limit Warning", "Do Not Enter"],
        correctIndex: 1,
        explanation: "An octagonal red traffic sign universally indicates a mandatory full stop."
      },
      {
        id: "lq2",
        question: "When two vehicles reach an uncontrolled four-way intersection simultaneously, who has right of way?",
        options: ["The vehicle on the left", "The vehicle on the right", "The larger vehicle", "The faster vehicle"],
        correctIndex: 1,
        explanation: "The vehicle on the right always has the right of way in uncontrolled intersections."
      },
      {
        id: "lq3",
        question: "What does a flashing yellow traffic signal indicate to drivers?",
        options: ["Speed up before red", "Proceed with caution", "Come to a complete stop", "Pedestrian crossing only"],
        correctIndex: 1,
        explanation: "A flashing yellow light warns drivers to slow down and proceed with caution."
      }
    ]
  }
];

// Mascot Speech Quotes (Clean typography, no emojis)
const MASCOT_QUOTES = [
  "Hey Shen, here is what you need to focus on today!",
  "Don't let the fuse burn down without picking an answer.",
  "Studying in 15-minute countdown sessions boosts recall by 80%.",
  "Defuse questions before the timer runs out to lock in what you've learned.",
  "Ready to review lessons with your study circle?",
  "Click 'Start learning' on any subject card to begin your quiz."
];

// ==========================================
// 3. APPLICATION STATE
// ==========================================
// 3. DETERMINISTIC GRADING (Levenshtein Distance, Zero AI)
// ==========================================
function levenshtein(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isAnswerCorrect(userAns, storedAns) {
  const u = userAns.toLowerCase().trim();
  const s = storedAns.toLowerCase().trim();
  if (u === s) return true;
  // Non-AI Typo tolerance (Levenshtein <= 2 for words >= 5 characters)
  if (s.length >= 5 && levenshtein(u, s) <= 2) return true;
  return false;
}

// ==========================================
// 3.1 CLIENT-SIDE MOCK API (OFFLINE / UI ONLY)
// ==========================================
class ApiClient {
  static async checkAuth() {
    try {
      const user = JSON.parse(localStorage.getItem('costudymaxx_vaia_user'));
      if (user) return { success: true, authenticated: true, user };
    } catch (e) {}
    return { success: false, authenticated: false };
  }

  static async login(username, password) {
    const user = {
      id: 'usr_' + Date.now(),
      username: username || 'costudymaxx',
      email: (username || 'costudymaxx').includes('@') ? username : `${username || 'costudymaxx'}@phinamed.com`
    };
    try {
      localStorage.setItem('costudymaxx_vaia_user', JSON.stringify(user));
    } catch (e) {}
    return { success: true, user };
  }

  static async register(username, password) {
    const user = {
      id: 'usr_' + Date.now(),
      username: username || 'newuser',
      email: (username || 'newuser').includes('@') ? username : `${username || 'newuser'}@phinamed.com`
    };
    try {
      localStorage.setItem('costudymaxx_vaia_user', JSON.stringify(user));
    } catch (e) {}
    return { success: true, user };
  }

  static async logout() {
    try {
      localStorage.removeItem('costudymaxx_vaia_user');
    } catch (e) {}
    return { success: true };
  }

  static async getReviewers(subject = null) {
    let reviewers = [];
    try {
      const saved = localStorage.getItem('costudymaxx_vaia_reviewers');
      if (saved) reviewers = JSON.parse(saved);
    } catch (e) {}
    if (!reviewers || reviewers.length === 0) {
      reviewers = [...(typeof DEFAULT_REVIEWERS !== 'undefined' ? DEFAULT_REVIEWERS : [])];
    }
    if (subject) {
      reviewers = reviewers.filter(r => (r.subject || '').toLowerCase() === subject.toLowerCase());
    }
    return { success: true, reviewers };
  }

  static async startQuiz(reviewerId, lives = 3) {
    return { success: true, session_id: 'session_' + Date.now() };
  }

  static async submitQuizAnswer(data) {
    return { success: true };
  }

  static async finishQuiz(data) {
    return { success: true };
  }

  // Document UI Mock methods
  static async uploadDocument(formData) {
    return { success: true, document: { id: 'doc_' + Date.now(), title: 'Sample Upload' } };
  }
  static async getDocuments() {
    return { success: true, documents: [] };
  }
  static async getDocument(id) {
    return { success: true, document: null };
  }
  static async deleteDocument(id) {
    return { success: true };
  }
  static async updateDocumentPages(docId, pageCount) {
    return { success: true };
  }
  static getDocumentServeUrl(id) {
    return '';
  }

  // Highlight UI Mock methods
  static async createHighlight(data) {
    return { success: true, highlight: { id: 'hl_' + Date.now(), ...data } };
  }
  static async getHighlights(docId) {
    return { success: true, highlights: [] };
  }
  static async deleteHighlight(id) {
    return { success: true };
  }
}

// ==========================================
// 3.2 APPLICATION STATE
// ==========================================
class AppState {
  constructor() {
    this.currentUser = null;
    this.reviewers = [];
    this.activeReviewer = null;
    this.currentQuoteIndex = 0;

    this.gameSession = {
      reviewer: null,
      questions: [],
      currentIndex: 0,
      score: 0,
      lives: 3,
      streak: 0,
      bestStreak: 0,
      answersLog: [],
      timerDuration: 15,
      timerRemaining: 15,
      timerInterval: null
    };

    this.loadData();
  }

  async loadData() {
    // 1. Verify active session
    const authRes = await ApiClient.checkAuth();
    if (authRes && authRes.success && authRes.authenticated && authRes.user) {
      this.currentUser = authRes.user;
      this.saveUser(authRes.user);
    } else {
      this.currentUser = null;
      localStorage.removeItem('costudymaxx_vaia_user');
    }

    // Reflect login state in UI and body class
    if (this.currentUser) {
      document.body.classList.remove('logged-out');
      if (window.UI) {
        UI.updateUserDisplay();
        UI.showScreen('desk-screen');
      }
    } else {
      document.body.classList.add('logged-out');
      if (window.UI) {
        UI.showScreen('auth-screen');
      }
    }

    // 2. Load reviewers (localStorage / defaults)
    const revRes = await ApiClient.getReviewers();
    if (revRes && revRes.success && Array.isArray(revRes.reviewers) && revRes.reviewers.length > 0) {
      this.reviewers = revRes.reviewers;
    } else {
      const savedRev = localStorage.getItem('costudymaxx_vaia_reviewers');
      if (savedRev) {
        try { this.reviewers = JSON.parse(savedRev); } catch(e) {}
      } else {
        this.reviewers = [...DEFAULT_REVIEWERS];
        this.saveReviewers();
      }
    }

    if (window.UI) {
      UI.renderLibraryReviewers();
    }
  }

  saveReviewers() {
    try {
      localStorage.setItem('costudymaxx_vaia_reviewers', JSON.stringify(this.reviewers));
    } catch (e) {}
  }

  saveUser(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem('costudymaxx_vaia_user', JSON.stringify(user));
        document.body.classList.remove('logged-out');
      } else {
        localStorage.removeItem('costudymaxx_vaia_user');
        document.body.classList.add('logged-out');
      }
    } catch (e) {}
  }
}

const state = new AppState();

// ==========================================
// 4. UI CONTROLLER (VAIA LAYOUT)
// ==========================================
const UI = {
  // Screens
  get authScreen() { return document.getElementById('auth-screen'); },
  get deskScreen() { return document.getElementById('desk-screen'); },
  get libraryScreen() { return document.getElementById('library-screen'); },
  get documentScreen() { return document.getElementById('document-screen'); },
  get gameScreen() { return document.getElementById('game-screen'); },
  get resultsScreen() { return document.getElementById('results-screen'); },

  // Mascot & Hero
  get mascotBubble() { return document.getElementById('mascot-bubble'); },
  get mascotBubbleText() { return document.getElementById('mascot-bubble-text'); },
  get cuteMascotVisual() { return document.getElementById('cute-mascot-visual'); },
  get libraryCardsContainer() { return document.getElementById('library-cards-container'); },
  get librarySearchInput() { return document.getElementById('library-search-input'); },
  get libraryFilterChips() { return document.getElementById('library-filter-chips'); },
  get libraryEmptyState() { return document.getElementById('library-empty-state'); },

  // Topbar / Profile
  get userDisplayName() { return document.getElementById('user-display-name'); },
  get userInitials() { return document.getElementById('user-initials'); },

  // Game Elements
  get gameReviewerTitle() { return document.getElementById('game-reviewer-title'); },
  get gameQCounter() { return document.getElementById('game-q-counter'); },
  get gameQuestionText() { return document.getElementById('game-question-text'); },
  get gameScoreDisplay() { return document.getElementById('game-score-display'); },
  get clockSeconds() { return document.getElementById('clock-seconds'); },
  get clockMs() { return document.getElementById('clock-ms'); },
  get timerProgressFill() { return document.getElementById('timer-progress-fill'); },
  get gameAnswersGrid() { return document.getElementById('game-answers-grid'); },
  get quizMascotStage() { return document.getElementById('quiz-mascot-stage'); },
  get btnSoundToggle() { return document.getElementById('btn-sound-toggle'); },

  // Modals
  get modalReviewer() { return document.getElementById('modal-reviewer'); },
  get modalShare() { return document.getElementById('modal-share'); },
  get modalJoin() { return document.getElementById('modal-join-room'); },
  get builderQuestionsList() { return document.getElementById('builder-questions-list'); },
  get builderQCount() { return document.getElementById('builder-q-count'); },

  currentFilterSubject: 'all',
  currentSearchQuery: '',

  showScreen(screenId) {
    if (!state.currentUser && screenId !== 'auth-screen') {
      screenId = 'auth-screen';
    }

    [this.authScreen, this.deskScreen, this.libraryScreen, this.documentScreen, this.gameScreen, this.resultsScreen].forEach(s => {
      if (s) s.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active highlight on left sidebar navigation
    const sideHome = document.getElementById('side-btn-home');
    const sideLib = document.getElementById('side-btn-library');
    const sideCards = document.getElementById('side-btn-cards');
    [sideHome, sideLib, sideCards].forEach(b => b?.classList.remove('active'));

    if (screenId === 'desk-screen') {
      sideHome?.classList.add('active');
    } else if (screenId === 'library-screen') {
      sideLib?.classList.add('active');
    }
  },

  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  },

  updateUserDisplay() {
    if (state.currentUser) {
      const name = state.currentUser.username || state.currentUser.display_name || state.currentUser.firstName || 'Shen';
      this.userDisplayName.textContent = name;
      this.userInitials.textContent = name[0].toUpperCase();
      this.mascotBubbleText.textContent = `Hey ${name}, I'm Bomby! What are we studying today?`;
    }
  },

  renderLibraryReviewers(searchQuery = this.currentSearchQuery, filterSubject = this.currentFilterSubject) {
    this.currentSearchQuery = searchQuery;
    this.currentFilterSubject = filterSubject;

    const container = this.libraryCardsContainer;
    if (!container) return;
    container.innerHTML = '';

    const qLower = (searchQuery || '').toLowerCase().trim();

    // 1. Build distinct subject codes for chips
    const subjects = new Set();
    state.reviewers.forEach(r => {
      const code = (r.courseCode || r.subject || 'General').trim();
      if (code) subjects.add(code);
    });

    const chipsContainer = this.libraryFilterChips;
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.className = `lib-chip ${filterSubject === 'all' ? 'active' : ''}`;
      allBtn.textContent = `All Subjects (${state.reviewers.length})`;
      allBtn.onclick = () => this.renderLibraryReviewers(this.currentSearchQuery, 'all');
      chipsContainer.appendChild(allBtn);

      subjects.forEach(subj => {
        const count = state.reviewers.filter(r => (r.courseCode || r.subject || 'General').trim() === subj).length;
        const chip = document.createElement('button');
        chip.className = `lib-chip ${filterSubject === subj ? 'active' : ''}`;
        chip.textContent = `${subj} (${count})`;
        chip.onclick = () => this.renderLibraryReviewers(this.currentSearchQuery, subj);
        chipsContainer.appendChild(chip);
      });
    }

    // 2. Filter reviewers
    const filtered = state.reviewers.filter(r => {
      const subj = (r.courseCode || r.subject || 'General').trim();
      if (filterSubject !== 'all' && subj !== filterSubject) return false;

      if (!qLower) return true;

      const inTitle = (r.title || '').toLowerCase().includes(qLower);
      const inCode = (r.courseCode || '').toLowerCase().includes(qLower);
      const inDesc = (r.desc || '').toLowerCase().includes(qLower);
      const inQ = (r.questions || []).some(q => q.question.toLowerCase().includes(qLower) || (q.explanation && q.explanation.toLowerCase().includes(qLower)));

      return inTitle || inCode || inDesc || inQ;
    });

    // 3. Update Counters
    const totalQ = state.reviewers.reduce((acc, r) => acc + (r.questions?.length || 0), 0);
    const libRevCount = document.getElementById('lib-total-reviewers');
    const libQCount = document.getElementById('lib-total-questions');
    if (libRevCount) libRevCount.textContent = `${state.reviewers.length} Reviewer${state.reviewers.length === 1 ? '' : 's'}`;
    if (libQCount) libQCount.textContent = `${totalQ} Questions`;

    const previewText = document.getElementById('home-library-preview-text');
    if (previewText) {
      previewText.textContent = `${state.reviewers.length} study decks ready (${totalQ} questions total). Practice flashcards or launch countdown quizzes.`;
    }

    // 4. Empty state toggle
    const emptyState = this.libraryEmptyState;
    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
    }

    // 5. Render Cards
    filtered.forEach((rev) => {
      const card = document.createElement('div');
      card.className = 'subject-card';

      const qCount = (rev.questions || []).length;
      const progress = rev.progressPct || 0;

      card.innerHTML = `
        <div class="subject-card-header">
          <div class="subject-title-wrap" onclick="Game.startSession('${rev.id}')">
            <span class="subject-title">${escapeHtml(rev.courseCode || rev.subject)} &gt;</span>
            <span class="subject-chevron">›</span>
            ${rev.collaborator ? `
              <span class="collab-badge-cream">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${escapeHtml(rev.collaborator)}
              </span>
            ` : ''}
          </div>
          <div class="subject-meta-status">
            <span>${qCount} questions</span>
            <span>${progress}% mastered</span>
            <button class="btn-task-action-icon" title="Share" onclick="UI.openShareModal('${rev.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </button>
            <button class="btn-task-action-icon" title="Edit" onclick="UI.openReviewerModal('${rev.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="btn-task-action-icon" title="Delete Reviewer" onclick="UI.deleteReviewer('${rev.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        <div class="subject-progress-track">
          <div class="subject-progress-fill ${progress > 50 ? 'orange' : ''}" style="width: ${progress}%;"></div>
        </div>

        <div class="subject-tasks-list">
          <!-- Task 1: Start Learning Countdown Quiz -->
          <div class="task-row-item">
            <div class="task-row-left">
              <div class="task-type-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M12 2v3"/><path d="M10 2h4"/></svg>
              </div>
              <div>
                <div>Review ${qCount} questions in <b>${escapeHtml(rev.title)}</b></div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${rev.timeLimit || 15}s countdown per question</div>
              </div>
            </div>
            <div class="task-row-actions">
              <button class="btn-start-learning" onclick="Game.startSession('${rev.id}')">
                <span>Start learning</span>
              </button>
            </div>
          </div>

          <!-- Task 2: Study Notes & Cards -->
          <div class="task-row-item">
            <div class="task-row-left">
              <div class="task-type-icon orange">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div>
                <div>Learn ${qCount} flashcards in "${escapeHtml(rev.title.split('&')[0])}"</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(rev.desc || 'Comprehensive study notes')}</div>
              </div>
            </div>
            <div class="task-row-actions">
              <button class="btn-task-action-icon" onclick="UI.openReviewerModal('${rev.id}')" title="View details">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  },

  cycleMascotQuote() {
    state.currentQuoteIndex = (state.currentQuoteIndex + 1) % MASCOT_QUOTES.length;
    this.mascotBubbleText.textContent = MASCOT_QUOTES[state.currentQuoteIndex];

    this.cuteMascotVisual.classList.add('celebrate');
    setTimeout(() => this.cuteMascotVisual.classList.remove('celebrate'), 650);
  },

  // Auth Tabs (Frames 1 & 2)
  setAuthTab(mode) {
    const tabIn = document.getElementById('tab-sign-in');
    const tabCr = document.getElementById('tab-create');
    const formIn = document.getElementById('form-container-signin');
    const formCr = document.getElementById('form-container-create');
    const heroTitle = document.getElementById('auth-hero-title');
    const heroDesc = document.getElementById('auth-hero-desc');
    const check1 = document.getElementById('auth-check-1');
    const check2 = document.getElementById('auth-check-2');
    const check3 = document.getElementById('auth-check-3');

    if (mode === 'signin') {
      tabIn?.classList.add('active');
      tabCr?.classList.remove('active');
      if (formIn) formIn.style.display = 'block';
      if (formCr) formCr.style.display = 'none';

      if (heroTitle) heroTitle.textContent = "Master Your Material";
      if (heroDesc) heroDesc.textContent = "Join thousand of students creating interactive reviewers and competing in high-stakes Bomb-Style study sessions.";
      if (check1) check1.textContent = "Bomb Style Gameplay";
      if (check2) check2.textContent = "Collaborative Reviews";
      if (check3) check3.textContent = "Data Driven Insights";
    } else {
      tabCr?.classList.add('active');
      tabIn?.classList.remove('active');
      if (formCr) formCr.style.display = 'block';
      if (formIn) formIn.style.display = 'none';

      if (heroTitle) heroTitle.textContent = "Elevate your game with study precision.";
      if (heroDesc) heroDesc.textContent = "Build question sets, invite your study circle, and master tough topics before the timer runs out.";
      if (check1) check1.textContent = "Fast Reviewer";
      if (check2) check2.textContent = "Live Quiz Rooms";
      if (check3) check3.textContent = "Shared Progress";
    }
  },

  // Reviewer Builder Modal
  openReviewerModal(reviewerId = null) {
    const editIdInput = document.getElementById('edit-reviewer-id');
    const titleInput = document.getElementById('rev-input-title');
    const subjectInput = document.getElementById('rev-input-subject');
    const timeSelect = document.getElementById('rev-input-time');
    const descInput = document.getElementById('rev-input-desc');
    const modalTitle = document.getElementById('modal-reviewer-title');

    this.builderQuestionsList.innerHTML = '';

    if (reviewerId) {
      const rev = state.reviewers.find(r => r.id === reviewerId);
      if (rev) {
        editIdInput.value = rev.id;
        modalTitle.textContent = "Edit Reviewer: " + (rev.courseCode || rev.title);
        titleInput.value = rev.title;
        subjectInput.value = rev.courseCode || rev.subject || '';
        timeSelect.value = rev.timeLimit || 15;
        descInput.value = rev.desc || '';

        (rev.questions || []).forEach((q, idx) => {
          this.appendQuestionBuilderItem(q, idx + 1);
        });
      }
    } else {
      editIdInput.value = '';
      modalTitle.textContent = "Create New Reviewer";
      titleInput.value = '';
      subjectInput.value = '';
      timeSelect.value = '15';
      descInput.value = '';

      this.appendQuestionBuilderItem(null, 1);
      this.appendQuestionBuilderItem(null, 2);
    }

    this.updateBuilderQuestionCount();
    this.modalReviewer.classList.add('active');
  },

  closeReviewerModal() {
    this.modalReviewer.classList.remove('active');
  },

  appendQuestionBuilderItem(qData = null, index = 1) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.padding = '14px';

    const qText = qData ? qData.question : '';
    const options = qData?.options || ['', '', '', ''];
    const correctIdx = qData ? qData.correctIndex : 0;
    const explanation = qData?.explanation || '';

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 0.8rem; font-weight: 800; color: var(--hunter-green);">Question #<span class="q-num-text">${index}</span></span>
        <button type="button" class="btn-task-action-icon" onclick="this.closest('.subject-card').remove(); UI.updateBuilderQuestionCount();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <input type="text" class="builder-q-text" placeholder="Enter question..." value="${escapeHtml(qText)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-cream); border-radius: 6px; margin-bottom: 10px;" required>

      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
        ${[0, 1, 2, 3].map(i => `
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="radio" name="radio-${Date.now()}-${Math.random()}" value="${i}" ${correctIdx === i ? 'checked' : ''} style="accent-color: var(--hunter-green);">
            <input type="text" class="builder-opt-input" placeholder="Option ${String.fromCharCode(65 + i)}" value="${escapeHtml(options[i] || '')}" style="flex: 1; padding: 6px 10px; border: 1px solid var(--border-cream); border-radius: 6px;" required>
          </div>
        `).join('')}
      </div>

      <input type="text" class="builder-explanation" placeholder="Explanation or study note..." value="${escapeHtml(explanation)}" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border-cream); border-radius: 6px; font-size: 0.85rem;">
    `;

    this.builderQuestionsList.appendChild(card);
    this.updateBuilderQuestionCount();
  },

  updateBuilderQuestionCount() {
    const count = this.builderQuestionsList.querySelectorAll('.subject-card').length;
    this.builderQCount.textContent = count;
    this.builderQuestionsList.querySelectorAll('.q-num-text').forEach((p, idx) => p.textContent = idx + 1);
  },

  saveReviewerFromModal() {
    const id = document.getElementById('edit-reviewer-id').value;
    const title = document.getElementById('rev-input-title').value.trim();
    const subject = document.getElementById('rev-input-subject').value.trim() || 'General';
    const timeLimit = parseInt(document.getElementById('rev-input-time').value, 10) || 15;
    const desc = document.getElementById('rev-input-desc').value.trim();

    if (!title) {
      document.getElementById('rev-input-title')?.focus();
      this.showToast("Please enter a title for your reviewer.");
      return;
    }

    const cards = this.builderQuestionsList.querySelectorAll('.subject-card');
    if (cards.length === 0) {
      this.showToast("Please add at least one question before saving.");
      return;
    }

    const questions = [];
    cards.forEach((card, idx) => {
      const qText = card.querySelector('.builder-q-text').value.trim();
      const optInputs = card.querySelectorAll('.builder-opt-input');
      const radios = card.querySelectorAll('input[type="radio"]');
      const expl = card.querySelector('.builder-explanation').value.trim();

      if (!qText) return;

      const options = [];
      let correctIndex = 0;
      optInputs.forEach((opt, oIdx) => {
        options.push(opt.value.trim() || `Option ${String.fromCharCode(65 + oIdx)}`);
      });
      radios.forEach((r, rIdx) => {
        if (r.checked) correctIndex = rIdx;
      });

      questions.push({
        id: 'q_' + Date.now() + '_' + idx,
        question: qText,
        options,
        correctIndex,
        explanation: expl
      });
    });

    if (id) {
      const existing = state.reviewers.find(r => r.id === id);
      if (existing) {
        existing.title = title;
        existing.courseCode = subject;
        existing.timeLimit = timeLimit;
        existing.desc = desc;
        existing.questions = questions;
      }
      this.showToast('Reviewer updated successfully');
    } else {
      state.reviewers.unshift({
        id: 'course_' + Date.now(),
        courseCode: subject,
        title,
        subject: 'General Study',
        timeLimit,
        desc,
        collaborator: state.currentUser?.firstName || 'Shen',
        progressPct: 0,
        stats: { timesPlayed: 0, bestScore: 0, lastAccuracy: 0 },
        questions
      });
      this.showToast('New reviewer created');
    }

    state.saveReviewers();
    this.closeReviewerModal();
    this.renderLibraryReviewers();
  },

  openShareModal(reviewerId) {
    const rev = state.reviewers.find(r => r.id === reviewerId);
    if (!rev) return;
    state.activeReviewer = rev;

    document.getElementById('modal-share-title').textContent = `Share ${rev.courseCode || rev.title}`;
    document.getElementById('share-link-input').value = `${window.location.origin}${window.location.pathname}#study=${rev.id}`;
    document.getElementById('share-room-code-tag').textContent = 'MAXX-' + Math.floor(1000 + Math.random() * 9000);
    this.modalShare.classList.add('active');
  },

  closeShareModal() {
    this.modalShare.classList.remove('active');
  },

  deleteReviewer(reviewerId) {
    const rev = state.reviewers.find(r => r.id === reviewerId);
    if (!rev) return;
    if (confirm(`Delete reviewer "${rev.title}"? This cannot be undone.`)) {
      state.reviewers = state.reviewers.filter(r => r.id !== reviewerId);
      state.saveReviewers();
      this.renderLibraryReviewers();
      this.showToast(`Deleted "${rev.title}"`);
    }
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

// ==========================================
// 5. BOMB QUIZ ENGINE
// ==========================================
const Game = {
  startSession(reviewerId, onlyMissed = false) {
    const rev = state.reviewers.find(r => r.id === reviewerId);
    if (!rev || !rev.questions || rev.questions.length === 0) {
      UI.showToast("This reviewer has no questions yet. Click Edit to add questions.");
      return;
    }

    let questionsToPlay = [...rev.questions];
    if (onlyMissed && state.gameSession.answersLog.length > 0) {
      const missedIds = state.gameSession.answersLog.filter(a => !a.isCorrect).map(a => a.questionId);
      questionsToPlay = rev.questions.filter(q => missedIds.includes(q.id));
      if (questionsToPlay.length === 0) questionsToPlay = [...rev.questions];
    }

    questionsToPlay.sort(() => Math.random() - 0.5);

    state.gameSession = {
      reviewer: rev,
      questions: questionsToPlay,
      currentIndex: 0,
      score: 0,
      lives: 3,
      streak: 0,
      bestStreak: 0,
      answersLog: [],
      timerDuration: rev.timeLimit || 15,
      timerRemaining: rev.timeLimit || 15,
      timerInterval: null
    };

    UI.gameReviewerTitle.textContent = rev.courseCode ? `${rev.courseCode}: ${rev.title}` : rev.title;
    this.updateLivesDisplay();
    this.updateScoreDisplay();

    UI.showScreen('game-screen');
    this.loadQuestion(0);
  },

  loadQuestion(index) {
    const session = state.gameSession;
    if (index >= session.questions.length || session.lives <= 0) {
      this.endGame();
      return;
    }

    session.currentIndex = index;
    const q = session.questions[index];

    UI.gameQCounter.textContent = `Question ${index + 1} of ${session.questions.length}`;
    UI.quizMascotStage.classList.remove('danger');
    UI.clockSeconds.parentElement.classList.remove('danger');
    UI.timerProgressFill.classList.remove('danger');

    const mouth = document.getElementById('quiz-mascot-mouth');
    if (mouth) mouth.setAttribute('d', 'M 74 98 Q 80 104 86 98');

    UI.gameQuestionText.textContent = q.question;

    const grid = UI.gameAnswersGrid;
    grid.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.dataset.idx = optIdx;
      btn.innerHTML = `
        <span class="opt-letter-tag">${letters[optIdx]}</span>
        <span>${escapeHtml(optText)}</span>
      `;
      btn.onclick = () => this.handleAnswer(optIdx);
      grid.appendChild(btn);
    });

    this.startCountdown();
  },

  startCountdown() {
    clearInterval(state.gameSession.timerInterval);
    const session = state.gameSession;
    session.timerRemaining = session.timerDuration;
    this.renderClock(session.timerRemaining);

    const startTime = Date.now();
    const totalMs = session.timerDuration * 1000;

    session.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, totalMs - elapsed);
      session.timerRemaining = remainingMs / 1000;

      this.renderClock(session.timerRemaining);

      if (session.timerRemaining <= 4.0 && session.timerRemaining > 0) {
        UI.quizMascotStage.classList.add('danger');
        UI.clockSeconds.parentElement.classList.add('danger');
        UI.timerProgressFill.classList.add('danger');

        const mouth = document.getElementById('quiz-mascot-mouth');
        if (mouth) mouth.setAttribute('d', 'M 76 96 Q 80 106 84 96 Z');

        if (Math.floor(remainingMs / 250) % 2 === 0) sfx.urgentBeep();
      } else {
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 50) / 1000)) {
          sfx.tick();
        }
      }

      if (remainingMs <= 0) {
        clearInterval(session.timerInterval);
        this.handleTimeout();
      }
    }, 50);
  },

  renderClock(seconds) {
    const sec = Math.floor(seconds);
    const dec = Math.floor((seconds - sec) * 10);
    UI.clockSeconds.textContent = sec < 10 ? '0' + sec : sec;
    UI.clockMs.textContent = dec;

    const pct = Math.max(0, Math.min(100, (seconds / state.gameSession.timerDuration) * 100));
    UI.timerProgressFill.style.width = pct + '%';
  },

  handleAnswer(selectedIdx) {
    clearInterval(state.gameSession.timerInterval);
    const session = state.gameSession;
    const q = session.questions[session.currentIndex];
    
    const userSelectedText = (q.options && q.options[selectedIdx]) ? q.options[selectedIdx] : (q.options ? q.options[0] : '');
    const correctText = (q.options && q.options[q.correctIndex]) ? q.options[q.correctIndex] : (q.answer_text || q.answer || '');
    const isCorrect = (selectedIdx === q.correctIndex) || isAnswerCorrect(userSelectedText, correctText);

    // Record quiz answer
    ApiClient.submitQuizAnswer({
      question_id: q.question_id || q.id,
      user_answer: userSelectedText,
      time_taken_seconds: session.timerDuration - session.timerRemaining,
      time_limit_seconds: session.timerDuration
    });

    const buttons = UI.gameAnswersGrid.querySelectorAll('.quiz-opt-btn');
    buttons.forEach(btn => btn.disabled = true);

    const chosenBtn = buttons[selectedIdx];
    const correctBtn = buttons[q.correctIndex];

    session.answersLog.push({
      questionId: q.id || q.question_id,
      question: q.question || q.question_text,
      options: q.options,
      userChoice: selectedIdx,
      correctChoice: q.correctIndex,
      isCorrect,
      explanation: q.explanation
    });

    if (isCorrect) {
      sfx.correct();
      if (chosenBtn) chosenBtn.classList.add('correct');

      const mascot = document.getElementById('game-mascot-visual');
      if (mascot) {
        mascot.classList.add('celebrate');
        setTimeout(() => mascot.classList.remove('celebrate'), 600);
      }

      session.streak += 1;
      if (session.streak > session.bestStreak) session.bestStreak = session.streak;
      const points = 100 + Math.round(session.timerRemaining * 20) + (session.streak * 25);
      session.score += points;
      this.updateScoreDisplay();

      UI.showToast(`Defused! +${points} PTS`);

      setTimeout(() => this.loadQuestion(session.currentIndex + 1), 1000);
    } else {
      sfx.wrong();
      sfx.explosion();

      if (chosenBtn) chosenBtn.classList.add('wrong');
      if (correctBtn) correctBtn.classList.add('correct');

      session.streak = 0;
      session.lives -= 1;
      this.updateLivesDisplay();

      UI.showToast(`Detonated! -1 Life remaining`);

      setTimeout(() => {
        if (session.lives <= 0) {
          this.endGame();
        } else {
          this.loadQuestion(session.currentIndex + 1);
        }
      }, 1400);
    }
  },

  handleTimeout() {
    const session = state.gameSession;
    const q = session.questions[session.currentIndex];

    sfx.explosion();
    const buttons = UI.gameAnswersGrid.querySelectorAll('.quiz-opt-btn');
    buttons.forEach(btn => btn.disabled = true);
    if (buttons[q.correctIndex]) buttons[q.correctIndex].classList.add('correct');

    session.answersLog.push({
      questionId: q.id,
      question: q.question,
      options: q.options,
      userChoice: -1,
      correctChoice: q.correctIndex,
      isCorrect: false,
      explanation: q.explanation
    });

    session.streak = 0;
    session.lives -= 1;
    this.updateLivesDisplay();

    UI.showToast(`Time's up! Bomb detonated!`);

    setTimeout(() => {
      if (session.lives <= 0) {
        this.endGame();
      } else {
        this.loadQuestion(session.currentIndex + 1);
      }
    }, 1400);
  },

  updateLivesDisplay() {
    const lives = state.gameSession.lives;
    for (let i = 1; i <= 3; i++) {
      const heart = document.getElementById(`life-${i}`);
      if (heart) {
        if (i <= lives) {
          heart.classList.remove('lost');
        } else {
          heart.classList.add('lost');
        }
      }
    }
  },

  updateScoreDisplay() {
    UI.gameScoreDisplay.textContent = state.gameSession.score.toString().padStart(4, '0');
  },

  endGame() {
    clearInterval(state.gameSession.timerInterval);
    const session = state.gameSession;
    const totalQ = session.answersLog.length;
    const correctQ = session.answersLog.filter(a => a.isCorrect).length;
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

    if (session.reviewer) {
      session.reviewer.progressPct = Math.min(100, (session.reviewer.progressPct || 0) + 20);
      session.reviewer.stats = session.reviewer.stats || {};
      session.reviewer.stats.timesPlayed = (session.reviewer.stats.timesPlayed || 0) + 1;
      if (session.score > (session.reviewer.stats.bestScore || 0)) {
        session.reviewer.stats.bestScore = session.score;
      }
      state.saveReviewers();
      UI.renderVaiaCourseCards();
    }

    document.getElementById('res-score').textContent = session.score.toLocaleString();
    document.getElementById('res-accuracy').textContent = accuracy + '%';
    document.getElementById('res-defused').textContent = `${correctQ}/${totalQ}`;

    const missed = totalQ - correctQ;
    const btnRetryMissed = document.getElementById('btn-retry-missed');
    if (missed > 0) {
      btnRetryMissed.style.display = 'inline-flex';
      btnRetryMissed.textContent = `Retry ${missed} Missed`;
      btnRetryMissed.onclick = () => Game.startSession(session.reviewer.id, true);
    } else {
      btnRetryMissed.style.display = 'none';
    }

    const list = document.getElementById('results-breakdown-list');
    list.innerHTML = '';
    session.answersLog.forEach((log, idx) => {
      const item = document.createElement('div');
      item.className = 'subject-card';
      item.style.padding = '16px';
      item.style.borderLeft = log.isCorrect ? '4px solid #2D6A4F' : '4px solid #D90429';

      const userAns = log.userChoice === -1 ? 'Timed Out (No choice made)' : log.options[log.userChoice];
      const correctAns = log.options[log.correctChoice];

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 0.95rem; color: var(--hunter-green);">Q${idx + 1}: ${escapeHtml(log.question)}</strong>
          <span style="font-weight: 800; font-size: 0.8rem; color: ${log.isCorrect ? '#2D6A4F' : '#D90429'};">
            ${log.isCorrect ? 'Defused' : 'Detonated'}
          </span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-muted); display: flex; gap: 20px;">
          <span>Your answer: <b>${escapeHtml(userAns)}</b></span>
          ${!log.isCorrect ? `<span style="color: #2D6A4F;">Correct: <b>${escapeHtml(correctAns)}</b></span>` : ''}
        </div>
        ${log.explanation ? `<div style="font-size: 0.8rem; color: var(--text-light); margin-top: 6px;">Note: ${escapeHtml(log.explanation)}</div>` : ''}
      `;
      list.appendChild(item);
    });

    UI.showScreen('results-screen');
  }
};

// ==========================================
// 5.5 BOMBY CHATBOT CONTROLLER
// ==========================================
const BombyChat = {
  messages: [],
  hasInitialized: false,

  init() {
    if (!this.hasInitialized) {
      const name = state.currentUser?.username || state.currentUser?.display_name || 'Shen';
      this.messages = [
        {
          sender: 'bomby',
          text: `Welcome back, <b>${escapeHtml(name)}</b>. Ask concept questions from your notes, request a timed quiz, or review study techniques.`,
          time: 'Just now'
        }
      ];
      this.hasInitialized = true;
    }
    this.renderMessages();
    this.bindEvents();
  },

  renderMessages() {
    const container = document.getElementById('bomby-messages-stream');
    if (!container) return;
    container.innerHTML = '';

    this.messages.forEach(msg => {
      const row = document.createElement('div');
      row.className = `chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bomby-row'}`;

      if (msg.sender === 'bomby') {
        row.innerHTML = `
          <div class="chat-avatar-small">
            <svg viewBox="0 0 160 160" width="18" height="18">
              <circle cx="80" cy="94" r="50" fill="#1B332A" />
              <rect x="70" y="36" width="20" height="9" rx="3" fill="#BC6C25" />
              <path d="M 80 40 Q 95 20 110 24" fill="none" stroke="#DDA15E" stroke-width="4" />
              <circle cx="110" cy="24" r="7" fill="#F3722C" />
              <circle cx="65" cy="89" r="4.5" fill="#FFF" />
              <circle cx="95" cy="89" r="4.5" fill="#FFF" />
            </svg>
          </div>
          <div class="chat-bubble bomby">
            <div>${msg.text}</div>
            ${msg.actionCard ? msg.actionCard : ''}
            <div class="chat-bubble-time">${msg.time}</div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="chat-bubble user">
            <div>${escapeHtml(msg.text)}</div>
            <div class="chat-bubble-time">${msg.time}</div>
          </div>
        `;
      }
      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  },

  addMessage(sender, text, actionCard = null) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.messages.push({ sender, text, actionCard, time: now });
    this.renderMessages();
  },

  setTyping(isTyping) {
    const indicator = document.getElementById('bomby-typing-indicator');
    if (indicator) indicator.style.display = isTyping ? 'flex' : 'none';
    const stream = document.getElementById('bomby-messages-stream');
    if (stream && isTyping) stream.scrollTop = stream.scrollHeight;
  },

  handleUserMessage(rawText) {
    const text = rawText.trim();
    if (!text) return;

    this.addMessage('user', text);
    this.setTyping(true);

    if (UI.cuteMascotVisual) {
      UI.cuteMascotVisual.classList.add('celebrate');
      setTimeout(() => UI.cuteMascotVisual.classList.remove('celebrate'), 650);
    }
    sfx.tick();

    setTimeout(() => {
      this.setTyping(false);
      this.generateResponse(text);
    }, 550);
  },

  generateResponse(query) {
    const qLower = query.toLowerCase();

    // 1. Check if user wants a quiz / test / countdown
    const isQuizIntent = ['quiz', 'test', 'drill', 'countdown', 'play', 'speed', 'practice'].some(w => qLower.includes(w));
    
    // Check for matching reviewer by title or subject code
    const matchingReviewer = state.reviewers.find(r => {
      const t = (r.title || '').toLowerCase();
      const s = (r.courseCode || r.subject || '').toLowerCase();
      const d = (r.desc || '').toLowerCase();
      return t.includes(qLower) || qLower.includes(t) || s.includes(qLower) || qLower.includes(s) || (qLower.split(' ').some(w => w.length > 3 && (t.includes(w) || s.includes(w) || d.includes(w))));
    }) || (isQuizIntent ? state.reviewers[0] : null);

    if (isQuizIntent && matchingReviewer) {
      const qCount = (matchingReviewer.questions || []).length;
      const sampleQ = matchingReviewer.questions?.[0]?.question || "Ready for question 1?";
      const actionHtml = `
        <div class="inchat-action-card">
          <div class="inchat-action-card-header">
            <span>READY TO STUDY</span>
            <span>${matchingReviewer.timeLimit || 15}s Countdown</span>
          </div>
          <div class="inchat-card-title">${escapeHtml(matchingReviewer.courseCode ? matchingReviewer.courseCode + ': ' + matchingReviewer.title : matchingReviewer.title)}</div>
          <div class="inchat-card-meta">${qCount} Questions · First up: "${escapeHtml(sampleQ)}"</div>
          <div class="inchat-action-btn-row">
            <button class="btn-inchat-quiz" onclick="Game.startSession('${matchingReviewer.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Launch Countdown Game
            </button>
            <button class="btn-pill-subtle" onclick="UI.showScreen('library-screen')" style="padding: 5px 14px; font-size: 0.8rem;">
              View in Library
            </button>
          </div>
        </div>
      `;
      this.addMessage(
        'bomby',
        `I pulled up <b>${escapeHtml(matchingReviewer.title)}</b>. Here is a study session ready to launch:`,
        actionHtml
      );
      if (UI.mascotBubbleText) {
        UI.mascotBubbleText.textContent = `Bomby: Loaded ${matchingReviewer.title} for quiz practice.`;
      }
      return;
    }

    // 2. Explanation / Concept lookup in existing notes
    if (['explain', 'what is', 'define', 'meaning', 'how does', 'tell me about', 'concept'].some(w => qLower.includes(w))) {
      let foundConcept = null;
      for (const rev of state.reviewers) {
        for (const q of (rev.questions || [])) {
          if (q.question.toLowerCase().includes(qLower) || (q.explanation && q.explanation.toLowerCase().includes(qLower))) {
            foundConcept = { rev, q };
            break;
          }
        }
        if (foundConcept) break;
      }

      if (foundConcept) {
        const { rev, q } = foundConcept;
        const correctOpt = q.options[q.correctIndex] || '';
        this.addMessage(
          'bomby',
          `From your <b>${escapeHtml(rev.title)}</b> notes:<br><br><b>Question:</b> ${escapeHtml(q.question)}<br><br><b>Key Takeaway:</b> <i>${escapeHtml(correctOpt)}</i>.<br>${q.explanation ? `<br><b>Study Note:</b> ${escapeHtml(q.explanation)}` : ''}`
        );
        return;
      } else {
        this.addMessage(
          'bomby',
          `Here is a structured study technique:<br><br><b>The Feynman Technique:</b> Explain the concept in simple terms as if teaching someone new to the topic. Any point where you struggle to explain simply reveals the exact gap to review in your notes.<br><br>You can create a quick question set for this by clicking the <b>+</b> button at the bottom-right.`
        );
        return;
      }
    }

    // 3. Study Tips / Advice
    if (['tip', 'advice', 'help', 'focus', 'tired', 'memorize', 'technique'].some(w => qLower.includes(w))) {
      const tips = [
        "<b>Active Recall:</b> Testing yourself with timed questions strengthens retrieval pathways far more effectively than passive rereading.",
        "<b>Pacing:</b> In the countdown quiz, trust your initial comprehension to avoid losing seconds on the timer.",
        "<b>Spaced Sessions:</b> Complete two countdown review sessions, take a 5-minute break, then retry missed questions for optimal retention.",
        "<b>Self-Explanation:</b> Articulate the reasoning for difficult questions out loud before beginning the quiz."
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      this.addMessage('bomby', `<b>Study Tip:</b><br><br>${randomTip}`);
      return;
    }

    // 3.5 Room / Multiplayer intent (Locked for future update)
    if (['room', 'room code', 'create room', 'join room', 'multiplayer', 'lobby'].some(w => qLower.includes(w))) {
      this.addMessage('bomby', `<b>Study Rooms & Room Codes</b> are locked for a future update. You can create custom reviewers and practice solo in Countdown Quiz mode anytime.`);
      return;
    }

    // 4. Create Reviewer intent
    if (['create', 'add reviewer', 'new deck', 'make reviewer', 'new flashcard'].some(w => qLower.includes(w))) {
      this.addMessage('bomby', `Opening the Reviewer Creator for you now! Add your question & answer pairs to start quizzing.`);
      setTimeout(() => UI.openReviewerModal(), 400);
      return;
    }

    // 5. Library Navigation intent
    if (['library', 'all reviewers', 'decks', 'view sets', 'courses'].some(w => qLower.includes(w))) {
      this.addMessage('bomby', `Taking you to your <b>Review Library</b> where all ${state.reviewers.length} study decks are stored!`);
      setTimeout(() => UI.showScreen('library-screen'), 400);
      return;
    }

    // 6. Default engaging companion response
    const name = state.currentUser?.username || 'Shen';
    const randomDeck = state.reviewers[Math.floor(Math.random() * state.reviewers.length)];
    this.addMessage(
      'bomby',
      `Got it, ${escapeHtml(name)}! I'm tracking your study materials. You can ask me to quiz you on <b>${escapeHtml(randomDeck?.title || 'your decks')}</b>, explain a difficult concept, or jump directly into your <b>Review Library</b>!`,
      randomDeck ? `
        <div class="inchat-action-card">
          <div class="inchat-action-card-header">
            <span>SUGGESTED REVIEW</span>
            <span>${randomDeck.questions?.length || 0} Questions</span>
          </div>
          <div class="inchat-card-title">${escapeHtml(randomDeck.title)}</div>
          <div class="inchat-action-btn-row">
            <button class="btn-inchat-quiz" onclick="Game.startSession('${randomDeck.id}')">
              Quiz Me on This
            </button>
          </div>
        </div>
      ` : null
    );
  },

  bindEvents() {
    // Quick prompt chips
    document.querySelectorAll('.chip-prompt-btn').forEach(btn => {
      btn.onclick = () => {
        const prompt = btn.dataset.prompt;
        if (prompt) this.handleUserMessage(prompt);
      };
    });

    // Form submit
    const form = document.getElementById('bomby-chat-form');
    const input = document.getElementById('bomby-chat-input');
    if (form && input) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          input.value = '';
          this.handleUserMessage(val);
        }
      };
    }

    // Clear chat
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
      this.hasInitialized = false;
      this.init();
      UI.showToast('Chat cleared');
    });

    // Jump to library button from Home Desk
    document.getElementById('btn-goto-library')?.addEventListener('click', () => {
      UI.showScreen('library-screen');
    });
  }
};

// ==========================================
// 6. INITIALIZATION & EVENT HANDLERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash.startsWith('#study=')) {
    const rId = window.location.hash.replace('#study=', '');
    const found = state.reviewers.find(r => r.id === rId);
    if (found) {
      setTimeout(() => {
        UI.showToast(`Opened shared set: ${found.courseCode || found.title}`);
        Game.startSession(found.id);
      }, 400);
    }
  }

  // Mascot Speech Bubble click
  UI.mascotBubble?.addEventListener('click', () => UI.cycleMascotQuote());
  UI.cuteMascotVisual?.addEventListener('click', () => UI.cycleMascotQuote());

  // CSM Floating Capsule Sidebar Navigation
  document.getElementById('side-btn-home')?.addEventListener('click', () => {
    UI.showScreen('desk-screen');
  });
  document.getElementById('side-btn-library')?.addEventListener('click', () => {
    UI.showScreen('library-screen');
  });
  document.getElementById('side-btn-cards')?.addEventListener('click', () => {
    UI.showScreen('library-screen');
  });
  document.getElementById('btn-sidebar-logo')?.addEventListener('click', () => {
    UI.showScreen('desk-screen');
  });

  // Review Library Search & Filter Controls
  const libSearch = document.getElementById('library-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  if (libSearch) {
    libSearch.addEventListener('input', (e) => {
      const val = e.target.value;
      if (btnClearSearch) btnClearSearch.style.display = val ? 'block' : 'none';
      UI.renderLibraryReviewers(val, UI.currentFilterSubject);
    });
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (libSearch) libSearch.value = '';
      btnClearSearch.style.display = 'none';
      UI.renderLibraryReviewers('', UI.currentFilterSubject);
    });
  }
  document.getElementById('btn-empty-create')?.addEventListener('click', () => {
    UI.openReviewerModal();
  });
  document.getElementById('btn-floating-add')?.addEventListener('click', () => {
    UI.openReviewerModal();
  });

  // Auth Tabs (Frames 1 & 2)
  document.getElementById('tab-sign-in')?.addEventListener('click', () => UI.setAuthTab('signin'));
  document.getElementById('tab-create')?.addEventListener('click', () => UI.setAuthTab('create'));
  document.getElementById('link-to-register')?.addEventListener('click', () => UI.setAuthTab('create'));
  document.getElementById('link-to-signin')?.addEventListener('click', () => UI.setAuthTab('signin'));

  // Password Visibility Toggles
  const setupPasswordToggle = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const eyeOpen = btn.querySelector('.pw-eye-open');
      const eyeClosed = btn.querySelector('.pw-eye-closed');
      if (eyeOpen && eyeClosed) {
        eyeOpen.style.display = isPassword ? 'none' : 'block';
        eyeClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  };

  setupPasswordToggle('btn-toggle-signin-pw', 'signin-password');
  setupPasswordToggle('btn-toggle-reg-pw', 'reg-password');

  // Sign Out Handler (Sidebar Profile Card & Topbar fallback)
  const handleLogout = async () => {
    try { await ApiClient.logout(); } catch (e) {}
    state.saveUser(null);
    document.body.classList.add('logged-out');
    UI.showToast('Signed out successfully.');
    UI.showScreen('auth-screen');
  };
  document.getElementById('btn-sidebar-logout')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLogout();
  });
  document.getElementById('btn-topbar-logout')?.addEventListener('click', handleLogout);

  // Auth Error Banner & Input Highlighting Helpers
  const setAuthBannerError = (bannerId, inputs, message) => {
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.textContent = message;
      banner.style.display = 'block';
    }
    inputs.forEach(el => el?.classList.add('input-error'));
  };

  const clearAuthBannerError = (bannerId, inputs) => {
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.textContent = '';
      banner.style.display = 'none';
    }
    inputs.forEach(el => el?.classList.remove('input-error'));
  };

  const signinUserEl = document.getElementById('signin-username');
  const signinPassEl = document.getElementById('signin-password');
  const regUserEl = document.getElementById('reg-username');
  const regPassEl = document.getElementById('reg-password');

  [signinUserEl, signinPassEl].forEach(el => {
    el?.addEventListener('input', () => clearAuthBannerError('signin-error-banner', [signinUserEl, signinPassEl]));
  });

  [regUserEl, regPassEl].forEach(el => {
    el?.addEventListener('input', () => clearAuthBannerError('register-error-banner', [regUserEl, regPassEl]));
  });

  // Sign In submit (Strictly authenticated via database)
  document.getElementById('signin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthBannerError('signin-error-banner', [signinUserEl, signinPassEl]);

    const username = signinUserEl?.value.trim();
    const password = signinPassEl?.value || '';
    const submitBtn = document.getElementById('btn-submit-signin');

    if (!username || !password) {
      const msg = "Please enter both username and password.";
      setAuthBannerError('signin-error-banner', [!username ? signinUserEl : null, !password ? signinPassEl : null].filter(Boolean), msg);
      UI.showToast(msg);
      return;
    }

    const origBtnText = submitBtn ? submitBtn.textContent : 'Sign In';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying credentials...';
    }

    try {
      const res = await ApiClient.login(username, password);
      if (res && res.success && res.user) {
        clearAuthBannerError('signin-error-banner', [signinUserEl, signinPassEl]);
        state.saveUser(res.user);
        document.body.classList.remove('logged-out');
        UI.updateUserDisplay();
        UI.renderLibraryReviewers();
        BombyChat.init();
        UI.showToast(`Welcome back, ${state.currentUser.username}!`);
        UI.showScreen('desk-screen');
      } else {
        const errorMsg = res?.error || "Invalid username or password. Unregistered accounts cannot enter.";
        setAuthBannerError('signin-error-banner', [signinUserEl, signinPassEl], errorMsg);
        UI.showToast(errorMsg);
      }
    } catch (err) {
      const errorMsg = "Unable to reach database server. Please try again.";
      setAuthBannerError('signin-error-banner', [signinUserEl, signinPassEl], errorMsg);
      UI.showToast(errorMsg);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
  });

  // Register submit (Strictly registered into database)
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthBannerError('register-error-banner', [regUserEl, regPassEl]);

    const username = regUserEl?.value.trim();
    const password = regPassEl?.value || '';
    const submitBtn = document.getElementById('btn-submit-register');

    if (!username || !password) {
      const msg = "Please enter both username and password.";
      setAuthBannerError('register-error-banner', [!username ? regUserEl : null, !password ? regPassEl : null].filter(Boolean), msg);
      UI.showToast(msg);
      return;
    }

    if (username.length < 3) {
      const msg = "Username must be at least 3 characters.";
      setAuthBannerError('register-error-banner', [regUserEl], msg);
      UI.showToast(msg);
      return;
    }

    if (password.length < 4) {
      const msg = "Password must be at least 4 characters.";
      setAuthBannerError('register-error-banner', [regPassEl], msg);
      UI.showToast(msg);
      return;
    }

    const origBtnText = submitBtn ? submitBtn.textContent : 'Create Account';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    try {
      const res = await ApiClient.register(username, password);
      if (res && res.success && res.user) {
        clearAuthBannerError('register-error-banner', [regUserEl, regPassEl]);
        state.saveUser(res.user);
        document.body.classList.remove('logged-out');
        UI.updateUserDisplay();
        UI.renderLibraryReviewers();
        BombyChat.init();
        UI.showToast(`Account created for ${state.currentUser.username}! Welcome.`);
        UI.showScreen('desk-screen');
      } else {
        const errorMsg = res?.error || "Registration failed. Please choose another username.";
        setAuthBannerError('register-error-banner', [regUserEl], errorMsg);
        UI.showToast(errorMsg);
      }
    } catch (err) {
      const errorMsg = "Unable to reach database server. Please try again.";
      setAuthBannerError('register-error-banner', [regUserEl], errorMsg);
      UI.showToast(errorMsg);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
  });

  // Reviewer Creator Modal
  document.getElementById('btn-close-reviewer-modal')?.addEventListener('click', () => UI.closeReviewerModal());
  document.getElementById('btn-cancel-reviewer')?.addEventListener('click', () => UI.closeReviewerModal());
  document.getElementById('btn-add-question-builder')?.addEventListener('click', () => {
    UI.appendQuestionBuilderItem(null, UI.builderQuestionsList.querySelectorAll('.subject-card').length + 1);
  });
  document.getElementById('btn-save-reviewer')?.addEventListener('click', () => UI.saveReviewerFromModal());

  // Share Modal
  document.getElementById('btn-close-share-modal')?.addEventListener('click', () => UI.closeShareModal());
  document.getElementById('btn-dismiss-share')?.addEventListener('click', () => UI.closeShareModal());
  document.getElementById('btn-copy-share-link')?.addEventListener('click', () => {
    const input = document.getElementById('share-link-input');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => UI.showToast('Share link copied'));
  });
  document.getElementById('btn-copy-room-code')?.addEventListener('click', () => {
    const code = document.getElementById('share-room-code-tag').textContent.trim();
    navigator.clipboard.writeText(code).then(() => UI.showToast(`Code ${code} copied`));
  });
  document.getElementById('btn-start-room-game')?.addEventListener('click', () => {
    UI.showToast("Multiplayer Room Mode is locked for a future update.");
  });

  // Room Join Modal (Locked Feature Modal)
  document.getElementById('btn-close-join-modal')?.addEventListener('click', () => {
    document.getElementById('modal-join-room').classList.remove('active');
  });
  document.getElementById('btn-cancel-join')?.addEventListener('click', () => {
    document.getElementById('modal-join-room').classList.remove('active');
  });

  // Game HUD controls
  document.getElementById('btn-exit-game')?.addEventListener('click', () => {
    if (confirm("Exit current study session?")) {
      clearInterval(state.gameSession.timerInterval);
      UI.showScreen('desk-screen');
    }
  });

  UI.btnSoundToggle?.addEventListener('click', () => {
    const muted = sfx.toggleMute();
    const icon = document.getElementById('sound-icon-svg');
    if (icon) {
      if (muted) {
        icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
      } else {
        icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
      }
    }
    UI.showToast(muted ? 'Sound Muted' : 'Sound Active');
  });

  // Results Controls
  document.getElementById('btn-replay-all')?.addEventListener('click', () => {
    if (state.gameSession.reviewer) Game.startSession(state.gameSession.reviewer.id);
    else UI.showScreen('desk-screen');
  });
  document.getElementById('btn-back-to-desk')?.addEventListener('click', () => {
    UI.showScreen('desk-screen');
  });

  // Keyboard shortcuts (Escape for modals, 1-4 for answers)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.cream-modal-backdrop.active');
      if (activeModal) {
        activeModal.classList.remove('active');
      }
    }

    if (UI.gameScreen.classList.contains('active')) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const buttons = UI.gameAnswersGrid.querySelectorAll('.quiz-opt-btn');
        if (buttons[idx] && !buttons[idx].disabled) Game.handleAnswer(idx);
      }
    }
  });

  // Expose globally for inline onclick attributes
  window.UI = UI;
  window.Game = Game;
  window.state = state;
  window.BombyChat = BombyChat;

  // Initial render based on auth state
  if (state.currentUser) {
    document.body.classList.remove('logged-out');
    UI.updateUserDisplay();
    UI.renderLibraryReviewers();
    BombyChat.init();
    UI.showScreen('desk-screen');
  } else {
    document.body.classList.add('logged-out');
    UI.showScreen('auth-screen');
  }
});
