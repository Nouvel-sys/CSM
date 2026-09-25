const { useState, useEffect, useRef, useMemo } = React;

// ========================================================
// 1. SOUND SYNTHESIZER (Web Audio API - Pure Client-Side)
// ========================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
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
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) { }
  }
  correct() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.07);
        osc.stop(this.ctx.currentTime + idx * 0.07 + 0.16);
      });
    } catch (e) { }
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
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch (e) { }
  }
  detonation() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.45);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      noise.stop(this.ctx.currentTime + 0.45);
    } catch (e) { }
  }
}

const sound = new SoundEngine();

// ========================================================
// 2. VECTOR ICONS (Strictly Zero Emojis)
// ========================================================
const IconHome = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const IconLibrary = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconBomb = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="14" r="7" />
    <path d="M12 7V4" />
    <path d="M9 4h6" />
    <circle cx="16" cy="3" r="1" fill="currentColor" />
  </svg>
);

const IconUser = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLogout = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconPlus = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconShare = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconArrowLeft = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconClose = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconChevronDown = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconSpeaker = ({ muted }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    {muted ? (
      <React.Fragment>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </React.Fragment>
    ) : (
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    )}
  </svg>
);

const IconPdf = () => (
  <svg className="w-6 h-7 shrink-0" viewBox="0 0 24 28" fill="none">
    <path d="M3 1C1.89543 1 1 1.89543 1 3V25C1 26.1046 1.89543 27 3 27H21C22.1046 27 23 26.1046 23 25V8.5L15.5 1H3Z" stroke="#222222" strokeWidth="2" strokeLinejoin="round" />
    <path d="M15 1V8.5H23" stroke="#222222" strokeWidth="2" strokeLinejoin="round" />
    <text x="4" y="20" fontFamily="Helvetica, Arial, sans-serif" fontSize="7.5" fontWeight="900" fill="#222222" letterSpacing="-0.4">PDF</text>
  </svg>
);

const IconFlame = () => (
  <svg className="w-4 h-4 text-[#f04824]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1012 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
  </svg>
);

const IconUpload = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconSparkles = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  </svg>
);

const IconCards = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="14" height="15" rx="2" />
    <path d="M7 5V3a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2h-2" />
  </svg>
);

const MiniBombIcon = ({ active }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${active
    ? 'bg-[#2a1309] border border-[#f04824] shadow-[0_0_12px_rgba(240,72,36,0.4)] text-[#f04824]'
    : 'bg-[#181818] border border-[#333333] text-[#444444]'
    }`}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="14" r="7" fill={active ? "#f04824" : "#242424"} stroke={active ? "#ff6b4a" : "#444444"} strokeWidth="1.5" />
      <path d="M12 7V4" stroke={active ? "#ff8c37" : "#555555"} strokeWidth="2" />
      <path d="M9 4h6" stroke={active ? "#ff8c37" : "#555555"} strokeWidth="2" />
    </svg>
  </div>
);

// ========================================================
// 3. INITIAL MOCK DECKS (With Full BombCards in State)
// ========================================================
const INITIAL_DECKS = [
  {
    id: 'deck-2',
    code: 'ITE 292 B1',
    title: 'ITE 292 B1',
    subject: 'Information Technology',
    owner: 'Gavin Dave',
    lastModified: 'Sep 13, 2026',
    category: 'Finals',
    section: 'recent',
    cards: [
      {
        id: 'c201',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Which SQL command removes all rows from a table without logging individual row deletions?',
        options: ['DELETE', 'TRUNCATE', 'DROP', 'REMOVE'],
        correctIndex: 1,
        correctAnswer: 'TRUNCATE',
        hint: 'DDL Fast Erase'
      },
      {
        id: 'c202',
        type: 'IDENTIFICATION',
        prompt: 'What normal form eliminates transitive functional dependencies?',
        correctAnswer: '3NF',
        alternates: '3nf, third normal form',
        hint: '3 Letters'
      },
      {
        id: 'c203',
        type: 'MULTIPLE_CHOICE',
        prompt: 'What ACID property ensures all transactions are either completely committed or fully aborted?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correctIndex: 0,
        correctAnswer: 'Atomicity',
        hint: 'All-or-nothing'
      }
    ],
    documents: [
      { id: 'd201', title: 'ITE 292 B1 M1 - Normalization Rules.pdf' },
      { id: 'd202', title: 'ITE 292 B1 M2 - SQL Joins Visualized.pdf' },
      { id: 'd203', title: 'ITE 292 B1 M3 - Indexing Strategies.pdf' }
    ]
  },
  {
    id: 'deck-3',
    code: 'ITE 083',
    title: 'ITE 083',
    subject: 'Information Technology',
    owner: 'Gavin Dave',
    lastModified: 'Sep 10, 2026',
    category: 'Midterms',
    section: 'older',
    cards: [
      {
        id: 'c301',
        type: 'IDENTIFICATION',
        prompt: 'What HTTP status code represents an unauthorized access error?',
        correctAnswer: '401',
        alternates: '401, 401 unauthorized',
        hint: '3 Digits'
      },
      {
        id: 'c302',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Which CSS property creates a responsive flexbox layout container?',
        options: ['display: flex', 'float: left', 'position: relative', 'display: grid'],
        correctIndex: 0,
        correctAnswer: 'display: flex',
        hint: 'Flex Container'
      }
    ],
    documents: [
      { id: 'd301', title: 'ITE 083 - DOM Manipulation & Events.pdf' }
    ]
  },
  {
    id: 'deck-1',
    code: 'ITE 001',
    title: 'ITE 001',
    subject: 'Networking & Telecommunications',
    owner: 'Gavin Dave',
    lastModified: 'Sep 14, 2026',
    category: 'Midterms',
    section: 'older',
    cards: [
      {
        id: 'c1',
        type: 'MULTIPLE_CHOICE',
        prompt: 'What protocol operates on Port 443?',
        options: ['HTTP', 'HTTPS', 'FTP', 'SSH'],
        correctIndex: 1,
        correctAnswer: 'HTTPS',
        hint: 'Secure Web Browsing'
      },
      {
        id: 'c2',
        type: 'IDENTIFICATION',
        prompt: 'Identify the topology where all nodes connect directly to a central switch.',
        correctAnswer: 'Star',
        alternates: 'star, star topology',
        hint: '4 Letters'
      }
    ],
    documents: [
      { id: 'd1', title: 'ITE 001 - Ch 1 & 2 OSI Model Notes.pdf' }
    ]
  }
];

// ========================================================
// 4. MAIN APP CONTAINER & STATE CONTROLLER
// ========================================================
function PdfStudyViewer({ document, pageNumber, onPageCount, highlights, onSelection }) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [stageWidth, setStageWidth] = useState(760);
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  useEffect(() => {
    let current = true;
    let task = null;
    setPdf(null); setLoadError(''); setPageSize({ width: 0, height: 0 });
    if (!document?.url) return () => { current = false; };
    setLoading(true);
    (async () => {
      try {
        const pdfjsLib = window.pdfjsLib || await window.pdfjsReady;
        if (!current) return;
        if (!pdfjsLib) throw new Error('The PDF text tools could not load. Check your connection and try again.');
        task = pdfjsLib.getDocument({ url: document.url, withCredentials: true });
        const value = await task.promise;
        if (current) { setPdf(value); onPageCount(value.numPages); }
      } catch (error) { if (current) setLoadError(error?.message || 'This PDF could not be opened.'); }
      finally { if (current) setLoading(false); }
    })();
    return () => { current = false; task?.destroy(); };
  }, [document?.url]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !window.ResizeObserver) return;
    const observer = new ResizeObserver(entries => setStageWidth(Math.max(320, entries[0].contentRect.width - 44)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [document?.url]);

  useEffect(() => {
    let current = true;
    let renderTask = null;
    let textTask = null;
    const render = async () => {
      if (!pdf || !canvasRef.current || !textLayerRef.current) return;
      setLoading(true); setLoadError('');
      try {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.65, stageWidth / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        const layer = textLayerRef.current;
        layer.innerHTML = ''; layer.style.width = `${viewport.width}px`; layer.style.height = `${viewport.height}px`;
        setPageSize({ width: viewport.width, height: viewport.height });
        renderTask = page.render({ canvasContext: context, viewport, transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0] });
        await renderTask.promise;
        if (!current) return;
        const textContent = await page.getTextContent();
        textTask = new window.pdfjsLib.TextLayer({ textContentSource: textContent, container: layer, viewport });
        await textTask.render();
      } catch (error) {
        if (current && error?.name !== 'RenderingCancelledException') setLoadError(error?.message || 'This page could not be rendered.');
      } finally { if (current) setLoading(false); }
    };
    render();
    return () => { current = false; renderTask?.cancel(); textTask?.cancel?.(); };
  }, [pdf, pageNumber, stageWidth, highlights]);

  const captureSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!text || !range || !textLayerRef.current?.contains(range.commonAncestorContainer)) return;
    const paper = paperRef.current?.getBoundingClientRect();
    if (!paper?.width || !paper?.height) return;
    const rectangles = Array.from(range.getClientRects()).map(rect => ({
      x: Math.max(0, (rect.left - paper.left) / paper.width),
      y: Math.max(0, (rect.top - paper.top) / paper.height),
      width: Math.min(rect.width / paper.width, 1),
      height: Math.min(rect.height / paper.height, 1)
    })).filter(rect => rect.width > 0 && rect.height > 0);
    if (rectangles.length) onSelection({ text, page: pageNumber, selection: rectangles });
  };

  return (
    <div className="csm-pdf-stage" ref={stageRef} onMouseUp={captureSelection} onKeyUp={captureSelection}>
      {!document && <div className="csm-pdf-empty"><span className="csm-pdf-empty-icon">PDF</span><strong>Choose a reviewer PDF to begin</strong><p>Open a saved document from your Library. Select text to save it as a note or build a Bombcard.</p></div>}
      {document && loading && <div className="csm-pdf-loading"><span className="csm-spinner" />Loading page…</div>}
      {document && loadError && <div className="csm-pdf-load-error"><strong>We couldn’t display this PDF</strong><p>{loadError}</p><a href={document.url} target="_blank" rel="noreferrer">Open the PDF in a new tab</a></div>}
      {document && !loadError && <div className="csm-pdf-paper-wrap" style={{ minHeight: Math.max(420, pageSize.height + 36) }}>
        <div className="csm-pdf-paper" ref={paperRef} style={{ width: pageSize.width || 'auto', height: pageSize.height || 'auto' }}>
          <canvas ref={canvasRef} aria-hidden="true" />
          <div className="csm-pdf-saved-marks" aria-hidden="true">{highlights.filter(item => Number(item.page) === Number(pageNumber)).flatMap(item => (item.selection || []).map((rect, index) => <i key={`${item.id}-${index}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, backgroundColor: item.color }} />))}</div>
          <div className="textLayer csm-pdf-text-layer" ref={textLayerRef} aria-label={`Selectable PDF page ${pageNumber}`} />
        </div>
      </div>}
    </div>
  );
}

function App() {
  // Navigation: 'home' | 'library' | 'game' | 'arena' | 'account'
  const requestedScreen = new URLSearchParams(window.location.search).get('screen');
  const [activeTab, setActiveTab] = useState(['home', 'library', 'flashcards', 'creator', 'highlighter', 'game', 'arena', 'account'].includes(requestedScreen) ? requestedScreen : 'home');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [changeConfirmation, setChangeConfirmation] = useState(null);
  const defaultProfile = { displayName: 'Gavin Dave', username: 'gavin_dave', avatar: 'ember', nameChangedAt: null };
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...(window.CSM?.initial?.profile || {}) }));
  const [profileNameDraft, setProfileNameDraft] = useState(() => profile.displayName);
  const [profileClock, setProfileClock] = useState(Date.now());
  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState('');
  const [newPasswordDraft, setNewPasswordDraft] = useState('');
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState('');
  const [accountSection, setAccountSection] = useState('profile');
  const [chatMessages, setChatMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Hi, I’m MAXX! Choose any topic below for instant guidance on your reviewers, flashcards, or Bomb Mode:' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('csm-chat-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('csm-chat-collapsed', String(chatCollapsed));
    } catch { }
  }, [chatCollapsed]);

  const [decks, setDecks] = useState(() => window.CSM?.initial?.decks || []);
  const [accountStats, setAccountStats] = useState(() => window.CSM?.initial?.stats || {});
  const [studyProgress, setStudyProgress] = useState(() => window.CSM?.initial?.studyProgress || []);
  const [arenaSessions, setArenaSessions] = useState(() => window.CSM?.initial?.sessions || []);
  const [recentActivities, setRecentActivities] = useState(() => {
    if (window.CSM?.initial) return window.CSM.initial.activities || [];
    const defaultActivities = [
      { id: 'activity-1', material: 'ITE 292 B1', mode: 'Reviewer library', accuracy: '—', status: 'Viewed', timestamp: Date.now() - 2 * 60 * 60 * 1000, deckId: 'deck-2', screen: 'library' },
      { id: 'activity-2', material: 'ITE 083', mode: 'Reviewer library', accuracy: '—', status: 'Viewed', timestamp: Date.now() - 24 * 60 * 60 * 1000, deckId: 'deck-3', screen: 'library' },
      { id: 'activity-3', material: 'ITE 001', mode: 'Reviewer library', accuracy: '—', status: 'Viewed', timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000, deckId: 'deck-1', screen: 'library' }
    ];
    try {
      const savedActivities = window.localStorage.getItem('csm-recent-activities');
      const parsedActivities = savedActivities ? JSON.parse(savedActivities) : null;
      return Array.isArray(parsedActivities) ? parsedActivities.filter(activity => activity.screen === 'library') : defaultActivities;
    } catch (error) {
      return defaultActivities;
    }
  });

  const refreshWorkspace = async () => {
    const data = await CSM.api('workspace');
    setProfile(data.profile); setDecks(data.decks); setRecentActivities(data.activities);
    setAccountStats(data.stats); setStudyProgress(data.studyProgress); setArenaSessions(data.sessions);
    return data;
  };

  // --- Library Workshop State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySubjectFilter, setLibrarySubjectFilter] = useState('All subjects');
  const [filterPill, setFilterPill] = useState('All');
  const [selectedDeckForFolderView, setSelectedDeckForFolderView] = useState(null); // When clicking folder
  const [isDeckEditorOpen, setIsDeckEditorOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);

  // Add Material Popup State (VAIA Hierarchy + CSM Design Premise)
  const [isAddMaterialPopupOpen, setIsAddMaterialPopupOpen] = useState(false);
  const [targetDeckForAddMaterial, setTargetDeckForAddMaterial] = useState(null);
  const [isDraggingAddMaterialFile, setIsDraggingAddMaterialFile] = useState(false);
  const addMaterialFileInputRef = useRef(null);

  // Deck Editor Form State
  const [editorCode, setEditorCode] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorCards, setEditorCards] = useState([]);
  const [editorDocuments, setEditorDocuments] = useState([]);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  // New Question sub-form inside editor
  const [newQType, setNewQType] = useState('MULTIPLE_CHOICE');
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQHint, setNewQHint] = useState('');
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrectIndex, setNewQCorrectIndex] = useState(0);
  const [newQAnswer, setNewQAnswer] = useState('');
  const [newQAlternates, setNewQAlternates] = useState('');

  // --- Dedicated Create Bombcards Page Form State ---
  const [creatorTargetDeckId, setCreatorTargetDeckId] = useState(() => window.CSM?.initial?.decks?.[0]?.id || '');
  const [creatorType, setCreatorType] = useState('MULTIPLE_CHOICE');
  const [creatorPrompt, setCreatorPrompt] = useState('');
  const [creatorHint, setCreatorHint] = useState('');
  const [creatorOptions, setCreatorOptions] = useState(['', '', '', '']);
  const [creatorCorrectIndex, setCreatorCorrectIndex] = useState(0);
  const [creatorAnswer, setCreatorAnswer] = useState('');
  const [creatorAlternates, setCreatorAlternates] = useState('');

  const handleSaveBombcard = async () => {
    if (!creatorPrompt.trim()) {
      triggerToast('Please enter a question prompt.');
      return;
    }
    if (creatorType === 'MULTIPLE_CHOICE') {
      const filledOptions = creatorOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        triggerToast('Please provide at least 2 multiple choice options.');
        return;
      }
      if (!creatorOptions[creatorCorrectIndex]?.trim()) {
        triggerToast('The designated correct option cannot be blank.');
        return;
      }
    } else {
      if (!creatorAnswer.trim()) {
        triggerToast('Please enter the correct answer.');
        return;
      }
    }

    const targetDeck = decks.find(d => d.id === creatorTargetDeckId) || decks[0];
    if (!targetDeck) return;

    const newCard = {
      id: 'c-' + Date.now(),
      type: creatorType,
      prompt: creatorPrompt.trim(),
      hint: creatorHint.trim() || undefined,
      ...(creatorType === 'MULTIPLE_CHOICE' ? {
        options: creatorOptions.map((opt, i) => opt.trim() || `Option ${i + 1}`),
        correctIndex: creatorCorrectIndex,
        correctAnswer: creatorOptions[creatorCorrectIndex]?.trim() || 'Correct'
      } : {
        correctAnswer: creatorAnswer.trim(),
        alternates: creatorAlternates.trim() || undefined
      })
    };

    try {
      await CSM.api('cards', 'POST', { ...newCard, deckId: targetDeck.id });
      await refreshWorkspace();
    } catch (error) { triggerToast(error.message); return; }

    recordActivity({
      material: targetDeck.code || targetDeck.title,
      mode: 'Bombcard Creation',
      deckId: targetDeck.id,
      screen: 'creator',
      status: 'Card added'
    });

    triggerToast(`Bombcard added to ${targetDeck.code || targetDeck.title}!`);
    setCreatorPrompt('');
    setCreatorHint('');
    setCreatorOptions(['', '', '', '']);
    setCreatorAnswer('');
    setCreatorAlternates('');
  };

  // --- Bombstyle Arena State Controller ---
      const [bombstylePhase, setBombstylePhase] = useState('select_deck'); // 'select_deck' | 'configure' | 'gameplay' | 'results' | 'review_missed'
      const [bombstyleDeckId, setBombstyleDeckId] = useState(() => window.CSM?.initial?.decks?.[0]?.id || '');
      const [bombstyleDifficulty, setBombstyleDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'
      const [bombstyleQueue, setBombstyleQueue] = useState([]);
      const [bombstyleIndex, setBombstyleIndex] = useState(0);
      const [bombstyleRevealed, setBombstyleRevealed] = useState(false);
      const [bombstyleTimeRemaining, setBombstyleTimeRemaining] = useState(45);
      const [bombstyleStreak, setBombstyleStreak] = useState(0);
      const [bombstyleMaxStreak, setBombstyleMaxStreak] = useState(0);
      const [bombstyleCorrectCount, setBombstyleCorrectCount] = useState(0);
      const [bombstyleHistory, setBombstyleHistory] = useState([]);
      const [bombstyleMissedCards, setBombstyleMissedCards] = useState([]);
      const [bombstyleStartTime, setBombstyleStartTime] = useState(null);
      const [bombstyleDurationSeconds, setBombstyleDurationSeconds] = useState(0);
      const [bombstyleSessionId, setBombstyleSessionId] = useState(null);
      const [bombstyleFeedback, setBombstyleFeedback] = useState(null); // 'defused' | 'exploded' | null
      const [bombstyleTimerHelpOpen, setBombstyleTimerHelpOpen] = useState(false);
      const [bombstyleExitModalOpen, setBombstyleExitModalOpen] = useState(false);
      const [shareToast, setShareToast] = useState('');
  const [selectedDeckIds, setSelectedDeckIds] = useState(() => [window.CSM?.initial?.decks?.[0]?.id].filter(Boolean));
      const [soundMuted, setSoundMuted] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#f5a23a');
  const [highlights, setHighlights] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfSelection, setPdfSelection] = useState(null);
  const [pdfCardComposerOpen, setPdfCardComposerOpen] = useState(false);
  const [pdfSelectionRole, setPdfSelectionRole] = useState('question');
  const [pdfCounterpart, setPdfCounterpart] = useState('');
  const [pdfSaving, setPdfSaving] = useState(false);

  useEffect(() => {
    const closeDeckMenuOnOutsideClick = (event) => {
      if (!event.target.closest('.csm-deck-actions')) {
        setOpenDeckMenuId(null);
      }
      if (!event.target.closest('.csm-material-actions')) {
        setOpenMaterialMenuId(null);
      }
      if (!event.target.closest('.csm-profile-wrap')) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDeckMenuOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeDeckMenuOnOutsideClick);
  }, []);

  const arenaTimerRef = useRef(null);
  const idInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const chatReplyTimerRef = useRef(null);

  // --- Stats Computation ---
  const totalReviewers = decks.length;
  const totalBombCards = useMemo(() => decks.reduce((acc, d) => acc + d.cards.length, 0), [decks]);
  const totalDocuments = useMemo(() => decks.reduce((acc, d) => acc + (d.documents?.length || 0), 0), [decks]);
  const formatTrend = value => `${Number(value) < 0 ? '\u2193' : '\u2191'} ${Math.abs(Number(value) || 0)}%`;
  const activityChart = Array.isArray(accountStats.activityChart) ? accountStats.activityChart : [];
  const activityChartMax = Math.max(1, ...activityChart.flatMap(day => [Number(day.current) || 0, Number(day.previous) || 0]));
  const activeFlashcardDeck = useMemo(() => decks.find(d => d.id === selectedDeckIds[0]) || decks[0], [decks, selectedDeckIds]);
  const flashcards = activeFlashcardDeck?.cards || [];
  const activeFlashcard = flashcards[flashcardIndex] || flashcards[0];
  const flipFlashcard = () => {
    if (!flashcardFlipped && activeFlashcard?.id) CSM.api('study/progress', 'POST', { bombcardId: activeFlashcard.id, result: 'seen' }).then(() => CSM.api('study/progress').then(setStudyProgress)).catch(error => console.warn('Study progress was not saved:', error));
    setFlashcardFlipped(value => !value);
  };
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = profile.displayName || defaultProfile.displayName;
  const displayFirstName = displayName.trim().split(/\s+/)[0] || 'there';
  const profileInitials = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'GD';
  const nameCooldownDuration = 7 * 24 * 60 * 60 * 1000;
  const nameCooldownRemaining = profile.nameChangedAt ? Math.max(0, profile.nameChangedAt + nameCooldownDuration - profileClock) : 0;
  const nameCooldownDays = Math.ceil(nameCooldownRemaining / (24 * 60 * 60 * 1000));
  const avatarOptions = [
    { id: 'ember', label: 'Ember', initials: profileInitials, background: 'linear-gradient(145deg, #f47c59, #ed4e2d)' },
    { id: 'ocean', label: 'Ocean', initials: profileInitials, background: 'linear-gradient(145deg, #5c8fe8, #243f86)' },
    { id: 'mint', label: 'Mint', initials: profileInitials, background: 'linear-gradient(145deg, #61c7a0, #247d68)' },
    { id: 'violet', label: 'Violet', initials: profileInitials, background: 'linear-gradient(145deg, #a580e8, #5b3c9a)' },
    { id: 'sunset', label: 'Sunset', initials: profileInitials, background: 'linear-gradient(145deg, #f3bd56, #c85b30)' },
    { id: 'slate', label: 'Slate', initials: profileInitials, background: 'linear-gradient(145deg, #718096, #263246)' }
  ];
  const currentAvatar = avatarOptions.find(avatar => avatar.id === profile.avatar) || avatarOptions[0];
  const accountSectionDetails = {
    profile: { title: 'Your profile', description: 'Manage how you appear in Co-StudyMaxx and keep your account ready for study.' },
    security: { title: 'Security', description: 'Manage password access and account security settings.' },
    privacy: { title: 'Privacy & policy', description: 'Review how your local profile and study activity are handled.' }
  }[accountSection] || { title: 'Your profile', description: 'Manage how you appear in Co-StudyMaxx and keep your account ready for study.' };

  useEffect(() => {
    setProfileNameDraft(profile.displayName || defaultProfile.displayName);
  }, [profile.displayName]);

  useEffect(() => {
    const profileClockTimer = window.setInterval(() => setProfileClock(Date.now()), 60000);
    return () => window.clearInterval(profileClockTimer);
  }, []);

  const recordActivity = ({ material, mode, accuracy = '—', status = 'In progress', deckId = null, screen = 'library' }) => {
    if (!['library', 'flashcards', 'highlighter', 'game', 'creator'].includes(screen)) return;
    CSM.api('activity', 'POST', { material, mode, status, deckId, screen })
      .then(() => refreshWorkspace()).catch(error => console.warn('Could not save study activity:', error));
  };

  const formatActivityTime = (timestamp) => {
    const elapsed = Math.max(0, Date.now() - Number(timestamp));
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (elapsed < minute) return 'Just now';
    if (elapsed < hour) return `${Math.floor(elapsed / minute)} min ago`;
    if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
    if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d ago`;
    return new Date(Number(timestamp)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openRecentActivity = (activity) => {
    if (activity.deckId) {
      const activityDeck = decks.find(deck => deck.id === activity.deckId);
      setSelectedDeckIds([activity.deckId]);
      if (activity.screen === 'library') setSelectedDeckForFolderView(activityDeck || null);
    }
    setActiveTab(activity.screen || 'library');
  };

  // --- Detail View States (Synced with decks) ---
  const [showAllBombcards, setShowAllBombcards] = useState(false);

  const currentSelectedDeck = useMemo(() => {
    if (!selectedDeckForFolderView) return null;
    return decks.find(d => d.id === selectedDeckForFolderView.id) || selectedDeckForFolderView;
  }, [decks, selectedDeckForFolderView]);

  const visibleCards = useMemo(() => {
    if (!currentSelectedDeck || !currentSelectedDeck.cards) return [];
    if (showAllBombcards) return currentSelectedDeck.cards;
    return currentSelectedDeck.cards.slice(0, 3);
  }, [currentSelectedDeck, showAllBombcards]);

  const handleSelectDeckForDetail = (deck) => {
    setSelectedDeckForFolderView(deck);
    setShowAllBombcards(false);
    recordActivity({ material: deck.code || deck.title, mode: 'Reviewer library', deckId: deck.id, screen: 'library' });
    setActiveTab('library');
  };

  // --- Folder Info Modal State (Edits Name & Description Only, NOT Content) ---
  const [folderInfoModalOpen, setFolderInfoModalOpen] = useState(false);
  const [targetFolderForEdit, setTargetFolderForEdit] = useState(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderDescInput, setFolderDescInput] = useState('');
  const [openDeckMenuId, setOpenDeckMenuId] = useState(null);
  const [openMaterialMenuId, setOpenMaterialMenuId] = useState(null);
  const [revealedLibraryCards, setRevealedLibraryCards] = useState([]);
  const [deleteDeckTarget, setDeleteDeckTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Section collapsing states
  const [collapseRecent, setCollapseRecent] = useState(false);
  const [collapseOlder, setCollapseOlder] = useState(false);

  const handleOpenEditFolderInfo = (deck, e) => {
    if (e) e.stopPropagation();
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(deck);
    setFolderNameInput(deck.code || deck.title);
    setFolderDescInput(deck.subject || '');
    setFolderInfoModalOpen(true);
  };

  const handleOpenCreateFolderInfo = () => {
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(null);
    setFolderNameInput('');
    setFolderDescInput('');
    setFolderInfoModalOpen(true);
  };

  const handleSaveFolderInfo = async (e) => {
    if (e) e.preventDefault();
    if (!folderNameInput.trim()) {
      triggerToast('Please enter a deck title');
      return;
    }

    try {
    const savedDeck = await CSM.api('decks', targetFolderForEdit ? 'PATCH' : 'POST', {
      ...(targetFolderForEdit ? { id: targetFolderForEdit.id } : {}),
      title: folderNameInput.trim(), subject: folderDescInput.trim(), category: targetFolderForEdit?.category || 'Recent'
    });
    await refreshWorkspace();
    if (targetFolderForEdit) {
      // Edit ONLY folder name & description (NOT content)
      triggerToast(`Updated folder "${folderNameInput.trim()}"`);
      showChangeConfirmation('Deck updated', `Your changes to "${folderNameInput.trim()}" were saved.`);
    } else {
      // Create new folder
      setSelectedDeckIds(prev => [...prev, savedDeck.id]);
      triggerToast(`Created new folder "${folderNameInput.trim()}"`);
      showChangeConfirmation('Deck created', `"${folderNameInput.trim()}" is ready for your study materials.`);
    }

    setFolderInfoModalOpen(false);
    setTargetFolderForEdit(null);
    } catch (error) { triggerToast(error.message); }
  };

  const handleDeleteFolder = (deckId, e) => {
    if (e) e.stopPropagation();
    const target = decks.find(d => d.id === deckId);
    setOpenDeckMenuId(null);
    setDeleteDeckTarget(target || { id: deckId, code: 'this deck', title: 'this deck' });
  };

  const handleRemoveDocument = (deckId, docId) => {
    const deck = decks.find(item => item.id === deckId);
    const document = deck?.documents?.find(item => item.id === docId);
    if (!document) return;
    setOpenMaterialMenuId(null);
    requestDeleteConfirmation({
      title: `Remove "${document.title}"?`,
      message: 'This PDF will be removed from the reviewer. You can upload it again later if needed.',
      confirmLabel: 'Remove PDF',
      action: async () => {
        try { await CSM.api('documents', 'DELETE', { id: docId }); await refreshWorkspace(); }
        catch (error) { triggerToast(error.message); return; }
        triggerToast('Document removed from this reviewer');
        showChangeConfirmation('PDF removed', 'The document was removed from this reviewer.');
      }
    });
  };

  const handleOpenDeckStudy = (deck, mode = 'flashcards') => {
    setSelectedDeckIds([deck.id]);
    setSelectedDeckForFolderView(null);
    recordActivity({ material: deck.code || deck.title, mode: mode === 'game' ? 'BombStyle quiz' : 'Flashcards', deckId: deck.id, screen: mode, status: 'In progress' });
    setActiveTab(mode);
  };

  const handleOpenDocument = (deck, document) => {
    setSelectedDeckIds([deck.id]);
    setActiveDocument({ ...document, deckId: deck.id });
    setHighlights([]);
    setPdfPage(1); setPdfPageCount(0); setPdfSelection(null); setPdfCardComposerOpen(false); setPdfCounterpart('');
    CSM.api('highlights&documentId=' + encodeURIComponent(document.id)).then(setHighlights).catch(error => triggerToast(error.message));
    recordActivity({ material: document.title, mode: 'PDF Tools', deckId: deck.id, screen: 'highlighter', status: 'In progress' });
    setActiveTab('highlighter');
    triggerToast(`Opening "${document.title}"...`);
  };

  const handleOpenAccount = () => {
    setSelectedDeckForFolderView(null);
    setAccountSection('profile');
    setActiveTab('account');
  };

  const handleOpenLibrary = () => {
    recordActivity({ material: 'Reviewer Library', mode: 'Library overview', screen: 'library', status: 'Viewed' });
    setSelectedDeckForFolderView(null);
    setActiveTab('library');
  };

  const handleOpenGameMode = (preselectedDeckId = null) => {
    if (preselectedDeckId) {
      setBombstyleDeckId(preselectedDeckId);
      setBombstylePhase('configure');
    } else {
      setBombstylePhase('select_deck');
    }
    recordActivity({ material: 'Bombstyle Arena', mode: 'Pressure Recall', deckId: preselectedDeckId || null, screen: 'arena', status: 'Viewed' });
    setActiveTab('arena');
  };

  const toggleLibraryCardAnswer = (cardId) => {
    setRevealedLibraryCards(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
  };

  const confirmDeleteFolder = async () => {
    if (!deleteDeckTarget) return;
    const deckId = deleteDeckTarget.id;
    const name = deleteDeckTarget.code || deleteDeckTarget.title || 'this deck';
    try { await CSM.api('decks', 'DELETE', { id: deckId }); await refreshWorkspace(); }
    catch (error) { triggerToast(error.message); return; }
    setSelectedDeckIds(prev => prev.filter(id => id !== deckId));
    if (selectedDeckForFolderView && selectedDeckForFolderView.id === deckId) {
      setSelectedDeckForFolderView(null);
    }
    setDeleteDeckTarget(null);
    triggerToast(`Deleted deck "${name}"`);
    showChangeConfirmation('Deck deleted', `"${name}" and its materials were removed.`);
  };

  const DeckCardActions = ({ deck }) => {
    const isOpen = openDeckMenuId === deck.id;
    return (
      <div className="csm-deck-actions">
        <button
          type="button"
          className="csm-deck-menu-trigger"
          aria-label={`Actions for ${deck.code || deck.title}`}
          aria-expanded={isOpen}
          onClick={(e) => { e.stopPropagation(); setOpenDeckMenuId(isOpen ? null : deck.id); }}
        >•••</button>
        {isOpen && (
          <div className="csm-deck-menu" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={(e) => handleOpenEditFolderInfo(deck, e)}><IconEdit /> Edit</button>
            <button type="button" className="danger" onClick={(e) => handleDeleteFolder(deck.id, e)}><IconTrash /> Delete</button>
          </div>
        )}
      </div>
    );
  };

  // Filtered Decks for Library
  const visibleDecks = useMemo(() => {
    return decks.filter(d => {
      const q = searchQuery.toLowerCase();
      const matchesSubject = librarySubjectFilter === 'All subjects' || (d.subject || 'Information Technology') === librarySubjectFilter;
      return matchesSubject && ((d.title || '').toLowerCase().includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        (d.subject || '').toLowerCase().includes(q));
    });
  }, [decks, searchQuery, librarySubjectFilter]);

  const librarySubjectOptions = useMemo(() => {
    return ['All subjects', ...Array.from(new Set(decks.map(deck => deck.subject || 'Information Technology')))];
  }, [decks]);

  const recentDecks = useMemo(() => {
    return visibleDecks.filter(d => d.section === 'recent' || d.id === 'deck-2');
  }, [visibleDecks]);

  const olderDecks = useMemo(() => {
    return visibleDecks.filter(d => d.section === 'older' || (d.id !== 'deck-2' && d.section !== 'recent'));
  }, [visibleDecks]);

  // (Old game lobby summary helpers removed for Bombstyle)

  // Notification Toast Helper
  const triggerToast = (msg) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(''), 3000);
  };

  const showChangeConfirmation = (title, message) => {
    setChangeConfirmation({ title, message });
  };

  const persistProfile = async (nextProfile) => {
    try { const saved = await CSM.api('profile', 'PATCH', { displayName: nextProfile.displayName, avatar: nextProfile.avatar }); setProfile(saved); return saved; }
    catch (error) { triggerToast(error.message); return null; }
  };

  const handleSaveDisplayName = async (event) => {
    event.preventDefault();
    const nextName = profileNameDraft.trim();
    if (!nextName) {
      triggerToast('Please enter a display name');
      return;
    }
    if (nameCooldownRemaining > 0) {
      triggerToast(`You can change your display name again in ${nameCooldownDays} day${nameCooldownDays === 1 ? '' : 's'}`);
      return;
    }
    if (nextName === displayName) {
      triggerToast('Your display name is already up to date');
      return;
    }
    if (!await persistProfile({ ...profile, displayName: nextName })) return;
    showChangeConfirmation('Display name updated', `Your name is now "${nextName}". You can change it again in 7 days.`);
  };

  const handleChooseAvatar = async (avatarId) => {
    if (avatarId === profile.avatar) return;
    const avatar = avatarOptions.find(item => item.id === avatarId);
    if (!await persistProfile({ ...profile, avatar: avatarId })) return;
    showChangeConfirmation('Avatar updated', `${avatar?.label || 'Your new avatar'} is now set on your profile.`);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPasswordDraft.length < 8 || newPasswordDraft.length > 72) return triggerToast('Use a password between 8 and 72 characters.');
    if (newPasswordDraft !== confirmPasswordDraft) return triggerToast('The new passwords do not match.');
    try {
      await CSM.api('auth/password', 'POST', { currentPassword: currentPasswordDraft, newPassword: newPasswordDraft });
      setPasswordResetModalOpen(false); setCurrentPasswordDraft(''); setNewPasswordDraft(''); setConfirmPasswordDraft('');
      triggerToast('Password updated.');
    } catch (error) { triggerToast(error.message); }
  };

  const FIXED_CHAT_TOPICS = [
    {
      id: 'review-today',
      title: 'What should I review today?',
      getAnswer: (deckName, count) => count
        ? `Start with ${deckName}. It has ${count} Bombcard${count === 1 ? '' : 's'} ready for a focused review session.`
        : 'Open your Library and add a few Bombcards first. I’ll help you choose a focused session once your deck has cards.',
      actionLabel: 'Open Flashcards',
      actionTab: 'flashcards'
    },
    {
      id: 'weakest-topics',
      title: 'Show my weakest topics',
      getAnswer: () => `Your saved Arena accuracy is ${accountStats.accuracy || 0}%. Focus on missed Bombcards in your recent sessions, then practice the cards you find challenging.`,
      actionLabel: 'Review Cards',
      actionTab: 'flashcards'
    },
    {
      id: 'bomb-mode',
      title: 'How does BombStyle mode work?',
      getAnswer: () => 'Bombstyle gives the whole round one countdown. Correct answers add 8 seconds; wrong answers subtract 5 seconds.',
      actionLabel: 'Enter Bomb Mode',
      actionTab: 'game'
    },
    {
      id: 'create-cards',
      title: 'How do I create new Bombcards?',
      getAnswer: () => 'You can build cards manually in Create Flashcards, or open the PDF Study Tool to highlight document excerpts and convert them directly into flashcards.',
      actionLabel: 'Create Flashcards',
      actionTab: 'creator'
    },
    {
      id: 'share-reviewer',
      title: 'How do I share my reviewer?',
      getAnswer: () => 'In the Reviewer Library, each deck has an actions menu (...) where you can edit, export, duplicate, or share your study materials.',
      actionLabel: 'Open Library',
      actionTab: 'library'
    }
  ];

  const handleSelectChatTopic = (topic) => {
    if (chatTyping) return;
    const currentDeck = activeFlashcardDeck || decks[0];
    const currentDeckName = currentDeck?.code || currentDeck?.title || 'your reviewer';
    const currentCardCount = currentDeck?.cards?.length || 0;
    const answerText = topic.getAnswer(currentDeckName, currentCardCount);

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: topic.title };
    setChatMessages(prev => [...prev, userMessage]);
    setChatTyping(true);

    window.clearTimeout(chatReplyTimerRef.current);
    chatReplyTimerRef.current = window.setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: answerText,
          actionLabel: topic.actionLabel,
          actionTab: topic.actionTab
        }
      ]);
      setChatTyping(false);
    }, 320);
  };

  const handleChatReset = () => {
    window.clearTimeout(chatReplyTimerRef.current);
    setChatTyping(false);
    setChatMessages([
      { id: `welcome-${Date.now()}`, role: 'assistant', text: 'Hi, I’m MAXX! Choose any topic below for instant guidance on your reviewers, flashcards, or Bomb Mode:' }
    ]);
    triggerToast('MAXX chat restarted');
  };

  useEffect(() => {
    if (!chatBodyRef.current) return;
    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [chatMessages, chatTyping]);

      useEffect(() => {
        if (!bombstyleExitModalOpen) return;
        const handleExitModalKeyDown = (event) => {
          if (event.key === 'Escape') setBombstyleExitModalOpen(false);
        };
        document.addEventListener('keydown', handleExitModalKeyDown);
        return () => document.removeEventListener('keydown', handleExitModalKeyDown);
      }, [bombstyleExitModalOpen]);

  const requestDeleteConfirmation = ({ title, message, confirmLabel = 'Delete', action }) => {
    setDeleteConfirmation({ title, message, confirmLabel, action });
  };

  const confirmDeleteAction = () => {
    if (!deleteConfirmation) return;
    const action = deleteConfirmation.action;
    setDeleteConfirmation(null);
    if (action) action();
  };

  const handleClearHighlights = () => {
    if (!highlights.length) {
      triggerToast('There are no highlights to clear');
      return;
    }
    requestDeleteConfirmation({
      title: 'Clear all highlights?',
      message: 'This will remove every saved highlight from the current study page.',
      confirmLabel: 'Clear highlights',
      action: () => {
        CSM.api('highlights', 'DELETE', { documentId: activeDocument?.id }).then(() => { setHighlights([]); showChangeConfirmation('Highlights cleared', 'All saved highlights were removed from this study page.'); }).catch(error => triggerToast(error.message));
      }
    });
  };

  const handleRemoveHighlight = (highlightId) => {
    const highlight = highlights.find(item => item.id === highlightId);
    requestDeleteConfirmation({
      title: 'Delete this highlight?',
      message: `The saved note${highlight?.text ? ` “${highlight.text}”` : ''} will be removed.`,
      confirmLabel: 'Delete highlight',
      action: () => {
        CSM.api('highlights', 'DELETE', { documentId: activeDocument?.id, id: highlightId }).then(() => { setHighlights(list => list.filter(note => note.id !== highlightId)); showChangeConfirmation('Highlight deleted', 'The saved highlight was removed.'); }).catch(error => triggerToast(error.message));
      }
    });
  };

  const handlePdfTextSelection = (selection) => {
    setPdfSelection(selection);
    setPdfSelectionRole('question');
    setPdfCounterpart('');
    setPdfCardComposerOpen(false);
  };

  const savePdfSelection = async () => {
    if (!activeDocument || !pdfSelection) return triggerToast('Select some PDF text first.');
    setPdfSaving(true);
    try {
      const note = await CSM.api('highlights', 'POST', {
        documentId: activeDocument.id, text: pdfSelection.text, page: pdfSelection.page,
        color: highlightColor, purpose: 'note', selection: pdfSelection.selection
      });
      setHighlights(items => [...items, note]);
      setPdfSelection(null); setPdfCardComposerOpen(false); window.getSelection()?.removeAllRanges();
      triggerToast('PDF highlight saved.');
    } catch (error) { triggerToast(error.message); }
    finally { setPdfSaving(false); }
  };

  const createPdfBombcard = async () => {
    if (!activeDocument || !pdfSelection) return triggerToast('Select some PDF text first.');
    if (!pdfCounterpart.trim()) return triggerToast(pdfSelectionRole === 'question' ? 'Add the answer for this question.' : 'Add the question for this answer.');
    setPdfSaving(true);
    try {
      const result = await CSM.api('highlights/card', 'POST', {
        documentId: activeDocument.id, text: pdfSelection.text, page: pdfSelection.page,
        color: highlightColor, purpose: pdfSelectionRole, selection: pdfSelection.selection,
        counterpart: pdfCounterpart.trim()
      });
      setHighlights(items => [...items, result.highlight]);
      setPdfSelection(null); setPdfCardComposerOpen(false); setPdfCounterpart(''); window.getSelection()?.removeAllRanges();
      try { await refreshWorkspace(); } catch (refreshError) { console.warn('The new Bombcard was saved, but the reviewer list could not refresh:', refreshError); }
      const reviewerName = decks.find(deck => deck.id === activeDocument.deckId)?.title || 'your reviewer';
      triggerToast(`Bombcard created in ${reviewerName}.`);
    } catch (error) { triggerToast(error.message); }
    finally { setPdfSaving(false); }
  };

  // ========================================================
  // 5. LIBRARY WORKSHOP ACTIONS (Pure Authoring & Editing)
  // ========================================================
  // Add Material Popup Actions (VAIA Hierarchy + CSM Design Premise)
  const handleOpenAddMaterialPopup = (deck, e) => {
    if (e) e.stopPropagation();
    setTargetDeckForAddMaterial(deck);
    setIsAddMaterialPopupOpen(true);
  };

  const handleAddMaterialDirectUpload = async (filesToUpload) => {
    const files = Array.from(filesToUpload || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      triggerToast('Please upload PDF files');
      return;
    }
    const target = targetDeckForAddMaterial || currentSelectedDeck;
    if (!target) return;

    try {
      for (const file of files) await CSM.upload(target.id, file);
      await refreshWorkspace();
    } catch (error) { triggerToast(error.message); return; }

    triggerToast(`Uploaded ${files.length} document${files.length > 1 ? 's' : ''} to ${target.code || target.title}`);
    showChangeConfirmation('PDF uploaded', `${files.length} document${files.length > 1 ? 's were' : ' was'} added to "${target.code || target.title}".`);
    setIsAddMaterialPopupOpen(false);
    if (addMaterialFileInputRef.current) addMaterialFileInputRef.current.value = '';
  };

  const handleChooseManualCreation = () => {
    const target = targetDeckForAddMaterial || currentSelectedDeck || decks[0];
    if (target) {
      setSelectedDeckIds([target.id]);
      setCreatorTargetDeckId(target.id);
    }
    setIsAddMaterialPopupOpen(false);
    setActiveTab('creator');
  };
  const handleOpenCreateDeck = () => {
    setEditingDeck(null);
    setEditorCode('ITE ' + Math.floor(100 + Math.random() * 900));
    setEditorTitle('');
    setEditorSubject('Information Technology');
    setEditorCards([]);
    resetNewQForm();
    setIsDeckEditorOpen(true);
  };

  const handleOpenEditDeck = (deck, e) => {
    if (e) e.stopPropagation();
    setEditingDeck(deck);
    setEditorCode(deck.code || '');
    setEditorTitle(deck.title || '');
    setEditorSubject(deck.subject || '');
    setEditorCards([...(deck.cards || [])]);
    setEditorDocuments([...(deck.documents || [])]);
    resetNewQForm();
    setIsDeckEditorOpen(true);
  };

  const handlePdfUpload = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) return;
    const newDocs = files.map(file => ({
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: file.name, file
    }));
    setEditorDocuments(prev => [...prev, ...newDocs]);
    triggerToast(`Imported ${files.length} PDF file${files.length > 1 ? 's' : ''}`);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleRemoveDocFromEditor = (docId) => {
    const document = editorDocuments.find(item => item.id === docId);
    requestDeleteConfirmation({
      title: `Remove "${document?.title || 'this PDF'}"?`,
      message: 'This document will be removed from the current reviewer draft.',
      confirmLabel: 'Remove PDF',
      action: () => {
        setEditorDocuments(prev => prev.filter(d => d.id !== docId));
        triggerToast('PDF removed from the draft');
      }
    });
  };

  const handleDeleteDeck = (deckId, e) => {
    if (e) e.stopPropagation();
    const target = decks.find(deck => deck.id === deckId);
    setDeleteDeckTarget(target || { id: deckId, code: 'this deck', title: 'this deck' });
  };

  const handleShareDeck = (deck, e) => {
    if (e) e.stopPropagation();
    const code = `${deck.code.replace(/\s+/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    navigator.clipboard?.writeText(code);
    triggerToast(`Share code copied to clipboard: ${code}`);
  };

  const resetNewQForm = () => {
    setNewQPrompt('');
    setNewQHint('');
    setNewQOptions(['', '', '', '']);
    setNewQCorrectIndex(0);
    setNewQAnswer('');
    setNewQAlternates('');
  };

  const handleAddQuestionToEditor = (e) => {
    e.preventDefault();
    if (!newQPrompt.trim()) return;

    let cardObj = {
      id: 'card-' + Date.now(),
      type: newQType,
      prompt: newQPrompt.trim(),
      hint: newQHint.trim() || (newQType === 'MULTIPLE_CHOICE' ? 'Knowledge Check' : 'Identification')
    };

    if (newQType === 'MULTIPLE_CHOICE') {
      const filledOptions = newQOptions.map((opt, i) => opt.trim() || `Option ${i + 1}`);
      cardObj.options = filledOptions;
      cardObj.correctIndex = newQCorrectIndex;
      cardObj.correctAnswer = filledOptions[newQCorrectIndex];
    } else {
      cardObj.correctAnswer = newQAnswer.trim() || 'Answer';
      cardObj.alternates = newQAlternates.trim() || cardObj.correctAnswer.toLowerCase();
    }

    setEditorCards(prev => [...prev, cardObj]);
    resetNewQForm();
    triggerToast('BombCard appended to deck list');
  };

  const handleRemoveCardFromEditor = (cardId) => {
    const card = editorCards.find(item => item.id === cardId);
    requestDeleteConfirmation({
      title: 'Delete this Bombcard?',
      message: `This ${card?.type === 'MULTIPLE_CHOICE' ? 'multiple-choice' : 'identification'} card will be removed from the current draft.`,
      confirmLabel: 'Delete card',
      action: () => {
        setEditorCards(prev => prev.filter(c => c.id !== cardId));
        triggerToast('Bombcard removed from the draft');
      }
    });
  };

  const handleSaveDeck = async () => {
    const title = (editorTitle || editorCode || 'New Reviewer').trim();
    try {
      const saved = await CSM.api('decks', editingDeck ? 'PATCH' : 'POST', {
        ...(editingDeck ? { id: editingDeck.id } : {}), title,
        subject: editorSubject || 'Information Technology', category: editingDeck?.category || 'Recent', cards: editorCards
      });
      const savedDocs = new Set(editorDocuments.filter(doc => !doc.file).map(doc => doc.id));
      if (editingDeck) for (const doc of editingDeck.documents || []) {
        if (!savedDocs.has(doc.id)) await CSM.api('documents', 'DELETE', { id: doc.id });
      }
      for (const doc of editorDocuments) if (doc.file) await CSM.upload(saved.id, doc.file);
      await refreshWorkspace();
      triggerToast(editingDeck ? `Saved materials for "${title}"` : 'Created new reviewer materials');
      showChangeConfirmation(editingDeck ? 'Materials saved' : 'Reviewer created', `"${title}" is ready for your study materials.`);
      setIsDeckEditorOpen(false);
    } catch (error) { triggerToast(error.message); }
  };

  // ========================================================
      // 6. BOMBSTYLE ARENA GAME ENGINE
      // ========================================================
      const bombstyleTimerRef = useRef(null);
      const bombstyleAnswerSubmittedRef = useRef(false);

      const bombstyleActiveDeck = useMemo(() => {
        return decks.find(d => d.id === bombstyleDeckId) || decks[0];
      }, [decks, bombstyleDeckId]);

      const bombstyleAvailableCards = useMemo(() => {
        return bombstyleActiveDeck?.cards || [];
      }, [bombstyleActiveDeck]);

      const activeBombstyleCard = bombstyleQueue[bombstyleIndex] || null;
      const BOMBSTYLE_DIFFICULTIES = {
        easy: { label: 'Easy', seconds: 60, timeLabel: '1 minute' },
        normal: { label: 'Normal', seconds: 45, timeLabel: '45 seconds' },
        hard: { label: 'Hard', seconds: 30, timeLabel: '30 seconds' }
      };
      const selectedBombstyleDifficulty = BOMBSTYLE_DIFFICULTIES[bombstyleDifficulty] || BOMBSTYLE_DIFFICULTIES.normal;
      const isBombDanger = bombstyleTimeRemaining <= 5.0 && bombstylePhase === 'gameplay' && !bombstyleFeedback;
      const bombTimerPercent = Math.max(0, Math.min(100, (bombstyleTimeRemaining / (selectedBombstyleDifficulty.seconds || 45)) * 100));

      const handleSelectBombstyleDeck = (deckId) => {
        setBombstyleDeckId(deckId);
        setBombstylePhase('configure');
      };

      const handleSetDifficulty = (diff) => {
        if (BOMBSTYLE_DIFFICULTIES[diff]) setBombstyleDifficulty(diff);
      };

      const handleStartBombstyle = async (customCardQueue = null) => {
        const deck = bombstyleActiveDeck;
        let cardsToUse = customCardQueue ? [...customCardQueue] : (deck ? [...(deck.cards || [])] : []);

        if (cardsToUse.length === 0) {
          triggerToast('Selected deck does not contain any Bombcards yet.');
          return;
        }

        try {
        const session = await CSM.api('arena/start', 'POST', { deckId: deck.id, difficulty: bombstyleDifficulty });
        setBombstyleSessionId(session.id);
        cardsToUse = session.queue || cardsToUse;

        setBombstyleQueue(cardsToUse);
        setBombstyleIndex(0);
        setBombstyleRevealed(false);
        bombstyleAnswerSubmittedRef.current = false;
        setBombstyleTimeRemaining(selectedBombstyleDifficulty.seconds);
        setBombstyleStreak(0);
        setBombstyleMaxStreak(0);
        setBombstyleCorrectCount(0);
        setBombstyleHistory([]);
        setBombstyleMissedCards([]);
        setBombstyleFeedback(null);
        setBombstyleStartTime(Date.now());
        setBombstylePhase('gameplay');
        setActiveTab('arena');

        recordActivity({
          material: deck?.code || deck?.title || 'Bombstyle',
          mode: 'Bombstyle Arena',
          deckId: deck?.id || null,
          screen: 'arena',
          status: 'In progress'
        });
        } catch (error) { triggerToast(error.message); }
      };

      useEffect(() => {
        CSM.api('arena/active').then(session => {
          if (!session || session.status !== 'active') return;
          setBombstyleSessionId(session.id); setBombstyleDeckId(session.deckId); setBombstyleDifficulty(session.difficulty);
          const restoredQueue = session.queue || [];
          setBombstyleQueue(restoredQueue); setBombstyleIndex(session.index || 0);
          const restoredAnswers = (session.answers || []).map(answer => ({ ...(restoredQueue[answer.position] || {}), result: answer.result }));
          setBombstyleHistory(restoredAnswers); setBombstyleMissedCards(restoredAnswers.filter(answer => answer.result !== 'correct'));
          setBombstyleTimeRemaining(session.remainingMs / 1000); setBombstyleStreak(session.streak || 0);
          setBombstyleMaxStreak(session.maxStreak || 0); setBombstyleCorrectCount(session.correct || 0);
          setBombstyleStartTime(Date.now() - (session.durationMs || 0)); setBombstylePhase('gameplay'); setActiveTab('arena');
          setBombstyleExitModalOpen(!!session.paused);
        }).catch(error => console.warn('Could not restore the active Arena session:', error));
      }, []);

      // Countdown Timer for Bombstyle
      useEffect(() => {
        if (activeTab !== 'arena' || bombstylePhase !== 'gameplay' || bombstyleExitModalOpen) {
          if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
          return;
        }

        if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
        bombstyleTimerRef.current = setInterval(() => {
          setBombstyleTimeRemaining(prev => {
            if (prev <= 0.1) {
              clearInterval(bombstyleTimerRef.current);
              handleBombstyleTimeout();
              return 0;
            }
            // Brief warning ticks when the session timer is nearly out.
            if (prev <= 5.0 && Math.round(prev * 10) % 10 === 0) {
              sound.tick();
            }
            return Math.max(0, +(prev - 0.1).toFixed(1));
          });
        }, 100);

        return () => {
          if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
        };
      }, [activeTab, bombstylePhase, bombstyleIndex, bombstyleFeedback, bombstyleExitModalOpen, selectedBombstyleDifficulty.seconds]);

      const handleBombstyleReveal = () => {
        if (bombstyleRevealed || bombstyleFeedback) return;
        setBombstyleRevealed(true);
      };

      const handleBombstyleDecision = async (knewIt) => {
        if (bombstyleFeedback || !activeBombstyleCard || bombstyleAnswerSubmittedRef.current) return;
        bombstyleAnswerSubmittedRef.current = true;
        let serverResult;
        try { serverResult = await CSM.api('arena/answer', 'POST', { id: bombstyleSessionId, position: bombstyleIndex, result: knewIt ? 'correct' : 'wrong' }); }
        catch (error) { bombstyleAnswerSubmittedRef.current = false; triggerToast(error.message); return; }
        setBombstyleTimeRemaining(Math.max(0, serverResult.remainingMs / 1000));

        if (knewIt) {
          sound.correct();
          setBombstyleFeedback('defused');
          const nextStreak = bombstyleStreak + 1;
          setBombstyleStreak(nextStreak);
          if (nextStreak > bombstyleMaxStreak) setBombstyleMaxStreak(nextStreak);
          setBombstyleCorrectCount(c => c + 1);
          setBombstyleHistory(prev => [
            ...prev,
            {
              id: activeBombstyleCard.id,
              prompt: activeBombstyleCard.prompt,
              correctAnswer: activeBombstyleCard.correctAnswer,
              result: 'defused'
            }
          ]);

          setTimeout(() => serverResult.status === 'active' ? advanceBombstyleCard() : finishBombstyleSession(), 600);
        } else {
          sound.wrong();
          sound.detonation();
          setBombstyleFeedback('exploded');
          const nextTime = Math.max(0, serverResult.remainingMs / 1000);
          setBombstyleStreak(0);
          setBombstyleHistory(prev => [
            ...prev,
            {
              id: activeBombstyleCard.id,
              prompt: activeBombstyleCard.prompt,
              correctAnswer: activeBombstyleCard.correctAnswer,
              result: 'exploded'
            }
          ]);
          setBombstyleMissedCards(prev => [...prev, { ...activeBombstyleCard, resultReason: 'did_not_know' }]);

          setTimeout(() => {
            if (serverResult.status !== 'active' || nextTime <= 0) {
              finishBombstyleSession();
            } else {
              advanceBombstyleCard();
            }
          }, 700);
        }
      };

      const handleBombstyleTimeout = async () => {
        if (bombstyleFeedback || !activeBombstyleCard || bombstyleAnswerSubmittedRef.current) return;
        bombstyleAnswerSubmittedRef.current = true;
        sound.wrong();
        sound.detonation();
        let serverResult;
        try { serverResult = bombstyleSessionId ? await CSM.api('arena/session&id=' + bombstyleSessionId) : null; }
        catch (error) { console.warn(error); }
        setBombstyleFeedback('exploded'); setBombstyleRevealed(true); setBombstyleTimeRemaining(0);
        setBombstyleStreak(0);
        setBombstyleHistory(prev => [
          ...prev,
          {
            id: activeBombstyleCard.id,
            prompt: activeBombstyleCard.prompt,
            correctAnswer: activeBombstyleCard.correctAnswer,
            result: 'timeout'
          }
        ]);
        setBombstyleMissedCards(prev => [...prev, { ...activeBombstyleCard, resultReason: 'timed_out' }]);

        setTimeout(() => {
          finishBombstyleSession();
        }, 800);
      };

      const advanceBombstyleCard = () => {
        setBombstyleFeedback(null);
        setBombstyleRevealed(false);
        bombstyleAnswerSubmittedRef.current = false;
        if (bombstyleIndex + 1 < bombstyleQueue.length) {
          setBombstyleIndex(i => i + 1);
        } else {
          finishBombstyleSession();
        }
      };

      const finishBombstyleSession = () => {
        if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
        const duration = bombstyleStartTime ? Math.round((Date.now() - bombstyleStartTime) / 1000) : 0;
        setBombstyleDurationSeconds(duration);
        setBombstyleFeedback(null);
        setBombstylePhase('results');
        refreshWorkspace().catch(error => console.warn('Could not refresh Arena results:', error));
      };

      const handleStudyMissedDeck = () => {
        setSelectedDeckIds([bombstyleDeckId]);
        setSelectedDeckForFolderView(null);
        setActiveTab('flashcards');
      };

      // Keyboard Controls for Bombstyle & Flashcards
      useEffect(() => {
        const handleKeyDown = (e) => {
          const tag = e.target?.tagName?.toLowerCase();
          if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

          if (activeTab === 'arena') {
            if (bombstylePhase === 'gameplay' && !bombstyleFeedback) {
              if (e.key === 'Escape') {
                CSM.api('arena/pause', 'POST', { id: bombstyleSessionId }).catch(() => {});
                setBombstyleExitModalOpen(true);
                return;
              }
              if (!bombstyleRevealed) {
                if (e.code === 'Space') {
                  e.preventDefault();
                  handleBombstyleReveal();
                }
              } else {
                if (e.key === '1' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  handleBombstyleDecision(true);
                } else if (e.key === '2' || e.key === 'e' || e.key === 'E' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  handleBombstyleDecision(false);
                }
              }
            }
          }

          if (activeTab === 'flashcards') {
            if (e.code === 'Space') {
              e.preventDefault();
              flipFlashcard();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setFlashcardIndex(idx => Math.max(0, idx - 1));
              setFlashcardFlipped(false);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setFlashcardIndex(idx => Math.min(Math.max((flashcards.length || 1) - 1, 0), idx + 1));
              setFlashcardFlipped(false);
            }
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [activeTab, bombstylePhase, bombstyleRevealed, bombstyleFeedback, activeBombstyleCard, flashcards.length]);

      const renderLibraryDeckCard = (deck) => {
    const cardCount = deck.cards?.length || 0;
    const documentCount = deck.documents?.length || 0;
    const totalMaterials = cardCount + documentCount;
    return (
      <article
        key={deck.id}
        className="csm-library-deck-card"
        onClick={() => handleSelectDeckForDetail(deck)}
      >
        <div className="csm-library-deck-card-top">
          <span className="csm-library-deck-icon"><IconCards /></span>
          <DeckCardActions deck={deck} />
        </div>
        <div className="csm-library-deck-card-copy">
          <h3>{deck.code || deck.title}</h3>
          <p>{deck.subject || 'Information Technology'}</p>
          <span>{totalMaterials} material{totalMaterials === 1 ? '' : 's'}</span>
        </div>
        <div className="csm-library-deck-card-footer">
          <span><IconUser /> By you</span>
          <strong>Open deck <span>→</span></strong>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell w-full h-full flex items-stretch overflow-hidden">

      {/* ========================================================
              LEFT CAPSULE SIDEBAR
              ======================================================== */}
      <nav className={`w-14 min-w-[56px] bg-[#141922] py-4 flex flex-col items-center justify-between shadow-2xl flex-shrink-0 z-20 ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 csm-sidebar-logo flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
            onClick={() => { if (sidebarExpanded) setActiveTab('home'); else setSidebarExpanded(true); }}
            title={sidebarExpanded ? 'Co-StudyMaxx Home' : 'Open sidebar'}
            aria-label={sidebarExpanded ? 'Co-StudyMaxx Home' : 'Open sidebar'}
          >
            <img
              src="csm-sidebar-logo.png"
              alt="Co-StudyMaxx Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
            <svg className="csm-sidebar-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M14 8l4 4-4 4" /></svg>
            <span className="csm-sidebar-wordmark">Co-StudyMaxx</span>
          </div>

          {/* Navigation Tabs (MAIN Category) */}
          <div className="flex flex-col items-center gap-2 mt-2 w-full">
            <span className="csm-sidebar-category">MAIN</span>
            <span className="csm-sidebar-divider" />

            {/* 1. Home Dashboard */}
            <button
              onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('home'); }}
              data-tooltip="Overview"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'home'
                ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              title="Home Dashboard"
            >
              <IconHome />
              <span className="csm-sidebar-label">Home</span>
            </button>

            {/* 2. Reviewer Library (Parent with Nested Child Items) */}
            <div className="w-full flex flex-col items-center">
              <button
                onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                data-tooltip="Reviewer Library"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'library'
                  ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]'
                  : ['flashcards', 'creator', 'highlighter'].includes(activeTab)
                    ? 'text-white bg-white/10 font-bold border border-white/15'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                title="Reviewer Library (Authoring & Management)"
              >
                <IconLibrary />
                <span className="csm-sidebar-label">Library</span>
              </button>

              {/* Nested Navigation: Study & Create Bombcards (Revealed when Library is active) */}
              {['library', 'flashcards', 'creator'].includes(activeTab) && (
                <div className="csm-sidebar-subnav animate-fadeIn">
                  {/* 2a. Study Mini Sidebar */}
                  <button
                    type="button"
                    onClick={() => { setSelectedDeckForFolderView(null); setFlashcardIndex(0); setFlashcardFlipped(false); setActiveTab('flashcards'); }}
                    data-tooltip="Study"
                    className={`csm-sidebar-subitem flex items-center transition-all ${activeTab === 'flashcards' ? 'active' : ''}`}
                    title="Study (Review Bombcards)"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                      <path d="M6 10h10" />
                    </svg>
                    <span className="csm-sidebar-label">Study</span>
                  </button>

                  {/* 2b. Create Bombcards Mini Sidebar */}
                  <button
                    type="button"
                    onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('creator'); }}
                    data-tooltip="Create Bombcards"
                    className={`csm-sidebar-subitem flex items-center transition-all ${activeTab === 'creator' ? 'active' : ''}`}
                    title="Create Bombcards"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                    <span className="csm-sidebar-label">Create Bombcards</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Game Mode Section (Launch Lobby) */}
            <button
              onClick={() => { setSelectedDeckForFolderView(null); setBombstylePhase('select_deck'); setActiveTab('arena'); }}
              data-tooltip="Arena"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'game' || activeTab === 'arena'
                ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              title="Arena (Bombstyle Recall)"
            >
              <IconCards className="w-6 h-6" />
              <span className="csm-sidebar-label">Arena</span>
            </button>

            {/* ACCOUNT Category — placed below Arena */}
            <span className="csm-sidebar-category" style={{ marginTop: '8px' }}>ACCOUNT</span>
            <span className="csm-sidebar-divider" />

            {/* Profile Settings */}
            <button
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'account' ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              title="Account Profile"
              data-tooltip="Profile Settings"
              onClick={handleOpenAccount}
            >
              <IconUser />
              <span className="csm-sidebar-label">Profile</span>
            </button>
          </div>
        </div>

        {/* Sidebar Collapse/Expand Toggle — bottom of nav */}
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            data-tooltip={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarExpanded(v => !v)}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarExpanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 3v18" />
              <path d="m15 9-3 3 3 3" />
            </svg>
            <span className="csm-sidebar-label">
              {sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            </span>
          </button>
        </div>
      </nav>

      {/* ========================================================
              MAIN LIGHT CANVAS SHELL
              ======================================================== */}
      <main className="flex-1 bg-[#f6f8fb] border-l border-[#dce5ee] overflow-hidden flex flex-col relative">

        {/* Unified fintech-inspired application header - hidden during active arena drill */}
        <header className="csm-topbar">
            <div className="csm-topbar-context">
              <span className="csm-topbar-workspace">Workspace</span>
              <span className="csm-topbar-sep">/</span>
              <span className="csm-topbar-current">
                {activeTab === 'home' && 'Overview'}
                {activeTab === 'library' && (selectedDeckForFolderView ? (currentSelectedDeck?.code || currentSelectedDeck?.title) : 'Reviewer Library')}
                {activeTab === 'flashcards' && (
                  <>
                    <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}>Reviewer Library</span>
                    <span className="csm-topbar-sep">/</span>
                    <span className="text-slate-900 font-extrabold">Study</span>
                  </>
                )}
                {activeTab === 'creator' && (
                  <>
                    <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}>Reviewer Library</span>
                    <span className="csm-topbar-sep">/</span>
                    <span className="text-slate-900 font-extrabold">Create Bombcards</span>
                  </>
                )}
                {activeTab === 'highlighter' && 'PDF Study Tool'}
                {(activeTab === 'arena' || activeTab === 'game') && (
                      <>
                        <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setBombstylePhase('select_deck')}>Arena</span>
                        <span className="csm-topbar-sep">/</span>
                        <span className="text-slate-900 font-extrabold cursor-pointer hover:text-slate-700 transition-colors" onClick={() => setBombstylePhase('select_deck')}>Bombstyle</span>
                        {bombstylePhase === 'configure' && (
                          <>
                            <span className="csm-topbar-sep">/</span>
                            <span className="text-slate-500 font-medium">{bombstyleActiveDeck?.code || 'Configure'}</span>
                          </>
                        )}
                        {bombstylePhase === 'gameplay' && bombstyleActiveDeck && (
                          <>
                            <span className="csm-topbar-sep">/</span>
                            <span className="text-slate-500 font-medium">{bombstyleActiveDeck.code}</span>
                          </>
                        )}
                        {bombstylePhase === 'results' && (
                          <>
                            <span className="csm-topbar-sep">/</span>
                            <span className="text-slate-500 font-medium">Results</span>
                          </>
                        )}
                        {bombstylePhase === 'review_missed' && (
                          <>
                            <span className="csm-topbar-sep">/</span>
                            <span className="text-slate-500 font-medium">Missed Cards</span>
                          </>
                        )}
                      </>
                    )}
                {activeTab === 'account' && 'Account Settings'}
              </span>
            </div>
            <div className="csm-top-actions">
              {activeTab === 'home' && (
                <button
                  className={`csm-icon-button ${!chatCollapsed ? 'text-[#f04824] bg-orange-50/80 border-[#f04824]/30' : ''}`}
                  type="button"
                  aria-label={chatCollapsed ? 'Open MAXX Assistant' : 'Collapse MAXX Assistant'}
                  title={chatCollapsed ? 'Open MAXX Assistant' : 'Collapse MAXX Assistant'}
                  onClick={() => setChatCollapsed(prev => !prev)}
                >
                  <img src="csm-sidebar-logo.png" alt="MAXX" className="w-4 h-4 object-contain" />
                </button>
              )}
              <div className="csm-notifications-wrap">
                <button className={`csm-icon-button csm-notification ${notifications.length ? '' : 'is-empty'}`} type="button" aria-label="Notifications" aria-expanded={notificationsOpen} title="Notifications" onClick={() => setNotificationsOpen(value => !value)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                </button>
                {notificationsOpen && (
                  <div className="csm-notifications-panel" role="dialog" aria-label="Notifications panel">
                    <div className="csm-notifications-header"><strong>Notifications</strong><span>{notifications.length ? `${notifications.length} unread` : 'All caught up'}</span></div>
                    <div className="csm-notifications-empty"><span className="csm-notifications-empty-icon">✓</span><strong>No notifications</strong><p>You’re all caught up. New study updates will appear here.</p></div>
                    <div className="csm-notifications-actions"><button type="button" onClick={() => triggerToast(notifications.length ? 'Notifications marked as read' : 'No notifications to mark as read')}>Mark all as read</button><button type="button" onClick={() => { if (!notifications.length) { triggerToast('No notifications to clear'); return; } requestDeleteConfirmation({ title: 'Clear all notifications?', message: 'Every notification will be permanently removed from this list.', confirmLabel: 'Clear notifications', action: () => { setNotifications([]); triggerToast('Notifications cleared'); } }); }}>Clear all</button></div>
                  </div>
                )}
              </div>
              <div className="csm-profile-wrap relative">
                <button
                  className="csm-profile cursor-pointer"
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen(v => !v)}
                >
                  <span className="csm-profile-avatar" style={{ background: currentAvatar.background }}>{currentAvatar.initials}</span>
                  <span className="csm-profile-copy"><strong>{displayName}</strong><small>@{profile.username || defaultProfile.username}</small></span>
                  <svg className={`transition-transform duration-200 ${accountMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {accountMenuOpen && (
                  <div className="csm-account-dropdown animate-fadeIn" role="menu">
                    <div className="csm-account-dropdown-user">
                      <p>{displayName}</p>
                      <span>@{profile.username || defaultProfile.username}</span>
                    </div>
                    <button
                      type="button"
                      className="csm-account-dropdown-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        handleOpenAccount();
                      }}
                    >
                      <IconUser />
                      <span>Profile Settings</span>
                    </button>
                    <div className="csm-account-dropdown-divider" />
                    <button
                      type="button"
                      className="csm-account-dropdown-item danger"
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        try { await CSM.api('auth/logout', 'POST', {}); window.location.replace('login.html?mode=signin'); }
                        catch (error) { triggerToast(error.message); }
                      }}
                    >
                      <IconLogout />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

        {/* Floating Toast Notification */}
        {shareToast && (
          <div className="absolute top-4 right-4 z-50 bg-[#181818] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 csm-toast-animate">
            <span className="w-2 h-2 rounded-full bg-[#f04824]"></span>
            {shareToast}
          </div>
        )}

        {/* ========================================================
                VIEW A: HOME DASHBOARD
                ======================================================== */}
        {activeTab === 'home' && (
          <div className="flex h-full overflow-hidden relative">

            {/* Dashboard Content Container (Static and unaffected by chatbot popup) */}
            <div className="home-dashboard-content flex-1 w-full overflow-y-auto custom-scroll">

              {/* Header */}
              <div className="home-dashboard-header">
                <span className="home-dashboard-eyebrow">OVERVIEW</span>
                <h1 className="home-dashboard-title">{greeting}, {displayFirstName}</h1>
                <p className="home-dashboard-subtitle">Stay on top of your reviewers, practice progress, and study streak.</p>
              </div>

              {/* Statistic Cards Row */}
              <div className="home-stat-grid">
                <div
                  onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                  className="home-stat-card"
                >
                  <span className="home-stat-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7.5h6l1.7 2H21v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <path d="M3 7.5V5a2 2 0 0 1 2-2h4l1.7 2H19a2 2 0 0 1 2 2v2.5" />
                    </svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">TOTAL DECKS</span>
                    <span className="home-stat-value">{totalReviewers}</span>
                    <span className="home-stat-description"><b className="csm-trend up">{formatTrend(accountStats.decksTrend)}</b> this month</span>
                  </span>
                </div>
                <div
                  onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                  className="home-stat-card cards-stat"
                >
                  <span className="home-stat-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="4" width="11" height="14" rx="2" transform="rotate(-12 5 4)" />
                      <rect x="9" y="6" width="11" height="14" rx="2" transform="rotate(12 9 6)" />
                    </svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">TOTAL BOMBCARDS</span>
                    <span className="home-stat-value">{totalBombCards}</span>
                    <span className="home-stat-description"><b className="csm-trend up">{formatTrend(accountStats.cardsTrend)}</b> across your sets</span>
                  </span>
                </div>
                <div className="home-stat-card" onClick={() => setActiveTab('flashcards')}>
                  <span className="home-stat-icon csm-stat-streak" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a8 8 0 0 0 5.8-13.7C16.4 6 14.5 4.4 14 2c-3 2-4.2 4.2-3.4 6.3A4.6 4.6 0 0 0 7.5 12c0 1.3.6 2.5 1.5 3.4" /><path d="M12 21c-2.8 0-5-1.8-5-4.2 0-1.5.8-2.7 2.2-3.6.1 2.1 1.4 3.5 3.2 3.5 1.4 0 2.5-1 2.5-2.5 1.3 1.1 2.1 2.4 2.1 3.8 0 1.7-1.3 3-3 3Z" /></svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">STUDY STREAK</span>
                    <span className="home-stat-value">{accountStats.studyDays || 0} days</span>
                    <span className="home-stat-description"><b className="csm-trend up">{accountStats.studyBestDays || 0} days</b> personal best</span>
                  </span>
                </div>
                <div className="home-stat-card" onClick={() => setActiveTab('flashcards')}>
                  <span className="home-stat-icon csm-stat-accuracy" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">AVG. ACCURACY</span>
                    <span className="home-stat-value">{accountStats.accuracy || 0}%</span>
                    <span className="home-stat-description"><b className={`csm-trend ${(accountStats.accuracyTrend || 0) < 0 ? 'down' : 'up'}`}>{formatTrend(accountStats.accuracyTrend)}</b> than last week</span>
                  </span>
                </div>
              </div>

              <div className="csm-home-grid">
                <section className="csm-chart-card">
                  <div className="csm-card-heading"><div><span className="csm-kicker">PROGRESS</span><h2>Study activity</h2></div><div className="csm-chart-legend"><span><i className="legend-dark" />This week</span><span><i className="legend-orange" />Last week</span></div></div>
                  <div className="csm-chart" aria-label="Study activity by day">
                    {activityChart.map(({ day, current = 0, previous = 0 }) => <div className="csm-chart-column" key={day}><div className="csm-bars"><span className="csm-bar previous" style={{ height: previous ? `${Math.max(7, previous / activityChartMax * 100)}%` : 0, display: previous ? 'block' : 'none' }} /><span className="csm-bar current" style={{ height: current ? `${Math.max(7, current / activityChartMax * 100)}%` : 0, display: current ? 'block' : 'none' }} /></div><small>{day}</small></div>)}
                  </div>
                </section>
                <section className="csm-detail-card">
                  <div className="csm-card-heading"><div><span className="csm-kicker">FOCUS PLAN</span><h2>Study streak</h2></div><span className="csm-detail-menu">•••</span></div>
                  <div className="csm-progress-ring"><strong>{accountStats.studyDays || 0}</strong><small>days</small></div>
                  <div className="csm-progress-track"><span style={{ width: `${Math.min(100, (accountStats.studyDays || 0) * 10)}%` }} /></div>
                  <div className="csm-progress-labels"><span>3 days to goal</span><b>10 day goal</b></div>
                  <p className="csm-card-note">Keep your momentum going. A short review today protects your streak.</p>
                </section>
              </div>

              <section className="csm-deck-row-card">
                <div className="csm-card-heading"><div><span className="csm-kicker">YOUR DECKS</span><h2>Pick up where you left off</h2></div><button type="button" className="csm-outline-button" onClick={() => setActiveTab('library')}>View all <span>→</span></button></div>
                <div className="csm-deck-row">{decks.map(deck => <button type="button" className="csm-deck-tile" key={deck.id} onClick={() => { setSelectedDeckIds([deck.id]); setActiveTab('flashcards'); }}><span className="csm-deck-tile-icon">▦</span><span><strong>{deck.code}</strong><small>{deck.cards?.length || 0} cards · {deck.subject}</small></span><span className="csm-deck-tile-arrow">→</span></button>)}</div>
              </section>

              <section className="csm-activity-card">
                <div className="csm-card-heading"><div><span className="csm-kicker">ACTIVITY</span><h2>Recent study sessions</h2></div><button type="button" className="csm-outline-button" onClick={() => setActiveTab('library')}>View library <span>→</span></button></div>
                <div className="csm-table-wrap"><table className="csm-table"><thead><tr><th><input type="checkbox" aria-label="Select all sessions" /></th><th>Material</th><th>Mode</th><th>Accuracy</th><th>Status</th><th>Last studied</th><th /></tr></thead><tbody>
                  {recentActivities.slice(0, 8).map(activity => [activity.material, activity.mode, activity.accuracy || '—', activity.status, formatActivityTime(activity.timestamp), activity.deckId || activity.id]).map(([name, mode, accuracy, status, date, id]) => <tr key={id}><td><input type="checkbox" aria-label={`Select ${name}`} /></td><td><button className="csm-table-material" type="button" onClick={() => openRecentActivity(recentActivities.find(item => item.id === id) || recentActivities[0])}><span className="csm-material-icon">▦</span><strong>{name}</strong></button></td><td>{mode}</td><td><strong>{accuracy}</strong></td><td><span className={`csm-status ${status === 'Completed' ? 'done' : status === 'In progress' ? 'progress' : 'review'}`}><i />{status}</span></td><td>{date}</td><td><button type="button" className="csm-row-menu" aria-label={`More actions for ${name}`}>•••</button></td></tr>)}
                </tbody></table></div>
              </section>

              <section className="csm-live-activity-card">
                <div className="csm-live-activity-heading"><div><span className="csm-kicker">ACTIVITY</span><h2>Recent Activity</h2><p>Your latest accessed study areas appear here.</p></div><button type="button" className="csm-outline-button" onClick={handleOpenLibrary}>View library <span>-&gt;</span></button></div>
                <div className="csm-live-activity-list">
                  {recentActivities.length ? recentActivities.slice(0, 4).map(activity => <button key={activity.id} type="button" className="csm-live-activity-row" onClick={() => openRecentActivity(activity)}><span className="csm-live-activity-icon">{activity.mode === 'PDF Tools' ? 'PDF' : activity.mode === 'Profile' ? 'ME' : activity.mode === 'BombStyle quiz' || activity.mode === 'BombStyle lobby' ? 'BS' : 'FC'}</span><span className="csm-live-activity-copy"><strong>{activity.material}</strong><small>{activity.mode} · {formatActivityTime(activity.timestamp)}</small></span><span className="csm-live-activity-status">{activity.status}</span><span className="csm-live-activity-arrow">-&gt;</span></button>) : <div className="csm-live-activity-empty">No activity has been recorded yet.</div>}
                </div>
              </section>

              {/* Study Tools */}
              <section className="home-tools-section">
                <h2 className="home-tools-heading">Your Study Tools</h2>
                <p className="home-tools-subtitle">Everything you need to create, study, and improve.</p>
                <div className="home-tools-grid">
                  <article className="home-tool-card" onClick={handleOpenLibrary}>
                    <span className="home-tool-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </span>
                    <h3 className="home-tool-title">Reviewer Library</h3>
                    <p className="home-tool-description">Create, edit, and manage<br />your reviewers and PDF materials.</p>
                    <button className="home-tool-button" type="button" onClick={handleOpenLibrary}>
                      <span>Open Library</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 12h15" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </button>
                  </article>

                  <article className="home-tool-card bomb-tool" onClick={handleOpenGameMode}>
                    <span className="home-tool-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="4" width="11" height="14" rx="2" transform="rotate(-12 5 4)" />
                        <rect x="9" y="6" width="11" height="14" rx="2" transform="rotate(12 9 6)" />
                      </svg>
                    </span>
                    <h3 className="home-tool-title">Bombstyle Arena</h3>
                    <p className="home-tool-description">Pressure-based recall.<br />One countdown for the entire round.</p>
                    <button className="home-tool-button" type="button" onClick={handleOpenGameMode}>
                      <span>Enter Arena</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 12h15" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </button>
                  </article>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="home-recent-card">
                <h2 className="home-recent-heading">Recent Activity</h2>
                <p className="home-recent-subtitle">Pick up where you left off.</p>
                <div className="home-recent-divider" />
                <div className="home-recent-row">
                  <span className="home-activity-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3h7l4 4v14H7z" />
                      <path d="M14 3v5h4M10 12h5M10 15h5M10 18h3" />
                    </svg>
                  </span>
                  <span className="home-activity-copy">
                    <span className="home-activity-title">ITE 292 B1</span>
                    <span className="home-activity-meta">Last studied 2 hours ago · 3 cards</span>
                  </span>
                  <button className="home-activity-button" type="button" onClick={() => setActiveTab('library')}>
                    <span>Continue</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12h15" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Study Assistant Panel */}
            <div className={`home-chat-panel flex flex-col shrink-0 hidden md:flex ${chatCollapsed ? 'is-collapsed' : ''}`}>

              {/* Assistant Header */}
              <div className="home-chat-header">
                <img src="csm-sidebar-logo.png" alt="Co-StudyMaxx Chat Bot" className="home-chat-avatar" />
                <div className="home-chat-heading">
                  <h3 className="home-chat-title">MAXX</h3>
                  <span className="home-chat-powered">Powered by Co-StudyMaxx</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="home-chat-reset" type="button" aria-label="Restart chat" title="Restart chat" onClick={handleChatReset}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 11a8 8 0 0 0-14.8-4L3 9" />
                      <path d="M3 4v5h5" />
                      <path d="M4 13a8 8 0 0 0 14.8 4L21 15" />
                    </svg>
                  </button>
                  <button className="home-chat-collapse" type="button" aria-label="Collapse assistant" title="Collapse assistant" onClick={() => setChatCollapsed(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat / Conversation Area */}
              <div className="home-chat-body flex-1 overflow-y-auto custom-scroll" aria-label="Chat conversation area" ref={chatBodyRef}>
                <div className="home-chat-messages">
                  {chatMessages.map(message => (
                    <div key={message.id} className={`home-chat-message ${message.role === 'user' ? 'user' : 'assistant'}`}>
                      <span>{message.text}</span>
                      {message.role === 'assistant' && message.actionLabel && (
                        <button
                          type="button"
                          className="home-chat-action-btn"
                          onClick={() => {
                            if (message.actionTab === 'game') handleOpenGameMode();
                            else setActiveTab(message.actionTab);
                          }}
                        >
                          <span>{message.actionLabel}</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {chatTyping && <div className="home-chat-message assistant home-chat-typing"><span><i /> <i /> <i /></span></div>}
                </div>
              </div>

              {/* Fixed Questions Footer - No Free Typing */}
              <div className="home-chat-footer">
                <div className="home-chat-footer-label">
                  <span>CHOOSE A TOPIC</span>
                  <span className="home-chat-footer-badge">Fixed Q&A</span>
                </div>
                <div className="home-chat-fixed-list custom-scroll" role="list">
                  {FIXED_CHAT_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      className="home-chat-fixed-btn"
                      type="button"
                      onClick={() => handleSelectChatTopic(topic)}
                      disabled={chatTyping}
                    >
                      <span className="home-chat-fixed-bullet">●</span>
                      <span className="home-chat-fixed-text">{topic.title}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m9 5 7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Floating Launcher Button when collapsed */}
            {chatCollapsed && (
              <button
                type="button"
                className="home-chat-launcher"
                onClick={() => setChatCollapsed(false)}
                title="Open MAXX Assistant"
                aria-label="Open MAXX Assistant"
              >
                <img src="csm-sidebar-logo.png" alt="MAXX" />
                <span>Ask MAXX</span>
                <span className="launcher-dot"></span>
              </button>
            )}

          </div>
        )}

        {activeTab === 'account' && (
          <div className="csm-screen csm-account-screen custom-scroll">
            <div className="csm-page-head">
              <div><span className="csm-kicker">ACCOUNT SETTINGS</span><h1>{accountSectionDetails.title}</h1><p>{accountSectionDetails.description}</p></div>
              <div className="csm-page-actions"><button type="button" className="csm-secondary-button" onClick={() => setActiveTab('home')}>Back to dashboard</button></div>
            </div>

            <div className="csm-account-tabs" role="tablist" aria-label="Account sections">
              {[
                ['profile', 'Profile'],
                ['security', 'Security'],
                ['privacy', 'Privacy & policy']
              ].map(([sectionId, label]) => (
                <button key={sectionId} type="button" role="tab" aria-selected={accountSection === sectionId} className={accountSection === sectionId ? 'active' : ''} onClick={() => setAccountSection(sectionId)}>{label}</button>
              ))}
            </div>

            <div className={`csm-account-layout account-section-${accountSection}`}>
              <section className="csm-account-card csm-account-summary">
                <div className="csm-account-summary-top"><span className="csm-account-avatar-large" style={{ background: currentAvatar.background }}>{currentAvatar.initials}</span><div><span className="csm-kicker">STUDY PROFILE</span><h2>{displayName}</h2><p>@{profile.username || defaultProfile.username}</p></div></div>
                <div className="csm-account-summary-note"><span>Private study profile</span><p>Your profile, reviewers, and study progress are saved to your account and follow you across devices.</p></div>
                <div className="csm-account-summary-stats"><div><strong>{totalReviewers}</strong><span>reviewers</span></div><div><strong>{totalBombCards}</strong><span>Bombcards</span></div><div><strong>{totalDocuments}</strong><span>PDF notes</span></div></div>
              </section>

              <section className="csm-account-card csm-account-identity-card">
                <div className="csm-account-card-heading"><div><span className="csm-kicker">IDENTITY</span><h2>Display name</h2></div><span className="csm-account-status">Visible to classmates</span></div>
                <div className="csm-account-username-row"><span>Username</span><strong>@{profile.username || defaultProfile.username}</strong></div>
                <form className="csm-account-name-form" onSubmit={handleSaveDisplayName}>
                  <label className="csm-account-field">Name<input type="text" value={profileNameDraft} onChange={(event) => setProfileNameDraft(event.target.value)} maxLength="40" aria-describedby="display-name-help" /></label>
                  <button type="submit" className="csm-primary-button" disabled={nameCooldownRemaining > 0 || !profileNameDraft.trim() || profileNameDraft.trim() === displayName}>Save name</button>
                </form>
                <div id="display-name-help" className={`csm-account-help ${nameCooldownRemaining > 0 ? 'is-locked' : ''}`}>{nameCooldownRemaining > 0 ? `Name changes are locked for ${nameCooldownDays} more day${nameCooldownDays === 1 ? '' : 's'}.` : 'You can change your display name once every 7 days.'}</div>
              </section>

              <section className="csm-account-card csm-account-avatar-card">
                <div className="csm-account-card-heading"><div><span className="csm-kicker">PROFILE IMAGE</span><h2>Choose an avatar</h2></div><span className="csm-account-status">Preset collection</span></div>
                <div className="csm-account-avatar-grid">{avatarOptions.map(avatar => <button key={avatar.id} type="button" className={`csm-account-avatar-option ${profile.avatar === avatar.id ? 'selected' : ''}`} onClick={() => handleChooseAvatar(avatar.id)} aria-label={`Use ${avatar.label} avatar`} aria-pressed={profile.avatar === avatar.id}><span style={{ background: avatar.background }}>{avatar.initials}</span><small>{avatar.label}</small></button>)}</div>
                <p className="csm-account-help">Choose one of the pre-made avatars. A database-backed upload option can be added later.</p>
              </section>

              <section className="csm-account-card csm-account-security-card">
                <div className="csm-account-card-heading"><div><span className="csm-kicker">SECURITY</span><h2>Password</h2></div><span className="csm-account-placeholder-badge">Protected</span></div>
                <div className="csm-account-security-row"><span className="csm-account-security-icon">•••</span><div><strong>Change your password</strong><p>Verify your current password to set a new one. Email recovery is not configured.</p></div><button type="button" className="csm-secondary-button" onClick={() => setPasswordResetModalOpen(true)}>Change password</button></div>
              </section>
              <section className="csm-account-card csm-account-policy-card">
                <div className="csm-account-card-heading"><div><span className="csm-kicker">PRIVACY &amp; POLICY</span><h2>Your data in Co-StudyMaxx</h2></div><span className="csm-account-placeholder-badge">Account data</span></div>
                <div className="csm-policy-list">
                  <div className="csm-policy-item"><strong>Account data</strong><p>Your account, profile, reviewer content, uploaded materials, and study results are stored in the private workspace database. Chat panel collapse remains a browser-only preference.</p></div>
                  <div className="csm-policy-item"><strong>Study activity</strong><p>The Home activity list only records the Library materials you open so you can return to your latest study work.</p></div>
                  <div className="csm-policy-item"><strong>Future policy links</strong><p>Privacy policy, terms, account deletion, and data export links will be connected here when the backend is ready.</p></div>
                </div>
                <div className="csm-policy-actions"><button type="button" className="csm-secondary-button" onClick={() => triggerToast('Privacy policy is not configured yet.')}>View privacy policy</button><button type="button" className="csm-secondary-button" onClick={async () => { try { CSM.download(await CSM.api('account/export'), 'co-studymaxx-export.json'); } catch (error) { triggerToast(error.message); } }}>Export my data</button></div>
              </section>
            </div>
          </div>
        )}

        {/* ========================================================
                VIEW B: REVIEWER LIBRARY (Pure Creation & Management)
                ======================================================== */}
        {activeTab === 'library' && (
          <div className="csm-library-screen custom-scroll">
            <div className="csm-library-header">
              <div>
                <span className="csm-kicker">YOUR STUDY DESK</span>
                <h1>Reviewer Library</h1>
                <p>Build focused reviewers, keep your notes together, and pick up where you left off.</p>
              </div>
              <div className="csm-library-header-actions">
                <button type="button" className="csm-primary-button" onClick={handleOpenCreateFolderInfo}><IconPlus /> New deck</button>
              </div>
            </div>

            <div className="csm-library-overview">
              <div className="csm-library-overview-card"><span><IconLibrary /></span><div><small>Total decks</small><strong>{totalReviewers}</strong></div></div>
              <div className="csm-library-overview-card"><span><IconCards /></span><div><small>Bombcards</small><strong>{totalBombCards}</strong></div></div>
              <div className="csm-library-overview-card"><span><IconPdf /></span><div><small>PDF notes</small><strong>{totalDocuments}</strong></div></div>
            </div>

            {selectedDeckForFolderView && currentSelectedDeck ? (
              <div className="csm-library-detail animate-fadeIn">
                <div className="csm-library-detail-header">
                  <div className="csm-library-detail-heading">
                    <button type="button" className="csm-library-back" onClick={() => setSelectedDeckForFolderView(null)} title="Back to Reviewer Library" aria-label="Back to Reviewer Library"><IconArrowLeft /></button>
                    <div>
                      <span className="csm-kicker">REVIEWER DECK</span>
                      <h1>{currentSelectedDeck.code || currentSelectedDeck.title}</h1>
                      <p>{currentSelectedDeck.subject || 'Information Technology'} · Updated {currentSelectedDeck.lastModified || 'recently'}</p>
                    </div>
                  </div>
                  <div className="csm-library-detail-actions">
                    <DeckCardActions deck={currentSelectedDeck} />
                    <button type="button" className="csm-secondary-button" onClick={() => handleOpenDeckStudy(currentSelectedDeck)}>Study deck</button>
                    <button type="button" className="csm-primary-button" onClick={() => handleOpenDeckStudy(currentSelectedDeck, 'game')}>Play Bomb Mode <span>→</span></button>
                  </div>
                </div>

                <div className="csm-library-detail-stats">
                  <div className="csm-library-detail-stat accent"><small>Bombcards</small><strong>{currentSelectedDeck.cards?.length || 0}</strong></div>
                  <div className="csm-library-detail-stat"><small>PDF notes</small><strong>{currentSelectedDeck.documents?.length || 0}</strong></div>
                  <div className="csm-library-detail-stat"><small>Study status</small><strong>{currentSelectedDeck.cards?.length ? 'Ready' : 'Needs cards'}</strong></div>
                </div>

                <section className="csm-library-content-section">
                  <div className="csm-library-section-heading">
                    <div className="csm-library-section-heading-left"><span className="csm-kicker">PRACTICE SET</span><span className="csm-library-count-pill">{currentSelectedDeck.cards?.length || 0} cards</span></div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeckIds([currentSelectedDeck.id]);
                          setCreatorTargetDeckId(currentSelectedDeck.id);
                          setActiveTab('creator');
                        }}
                      >
                        <IconPlus /> Create Bombcards
                      </button>
                      {currentSelectedDeck.cards?.length > 3 && (
                        <button type="button" onClick={() => setShowAllBombcards(prev => !prev)}>
                          {showAllBombcards ? 'Show less' : 'Show all'}
                        </button>
                      )}
                    </div>
                  </div>
                  {(!currentSelectedDeck.cards || currentSelectedDeck.cards.length === 0) ? (
                    <div className="csm-library-empty">
                      <strong>Your Bombcard set is empty</strong>
                      <p>Add your first question manually or explore reviewer tools to start building this set.</p>
                      <button
                        type="button"
                        className="csm-primary-button"
                        onClick={() => {
                          setSelectedDeckIds([currentSelectedDeck.id]);
                          setCreatorTargetDeckId(currentSelectedDeck.id);
                          setActiveTab('creator');
                        }}
                      >
                        <IconPlus /> Create Bombcards
                      </button>
                    </div>
                  ) : (
                    <div className="csm-library-bombcard-grid">
                      {visibleCards.map((card, idx) => {
                        const cardId = card.id || `${currentSelectedDeck.id}-card-${idx}`;
                        const isRevealed = revealedLibraryCards.includes(cardId);
                        const materialMenuOpen = openMaterialMenuId === cardId;
                        return (
                          <article key={cardId} className={`csm-library-bombcard ${isRevealed ? 'revealed' : ''}`}>
                            <div className="csm-library-bombcard-top">
                              <span>{currentSelectedDeck.code || currentSelectedDeck.title} · M{idx + 1}</span>
                              <div className="csm-material-actions">
                                <button
                                  type="button"
                                  className="csm-material-menu-trigger"
                                  aria-label={`Card options for ${idx + 1}`}
                                  aria-expanded={materialMenuOpen}
                                  onClick={() => setOpenMaterialMenuId(materialMenuOpen ? null : cardId)}
                                >
                                  •••
                                </button>
                                {materialMenuOpen && (
                                  <div className="csm-material-menu">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toggleLibraryCardAnswer(cardId);
                                        setOpenMaterialMenuId(null);
                                      }}
                                    >
                                      {isRevealed ? 'Hide answer' : 'Reveal answer'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMaterialMenuId(null);
                                        setSelectedDeckIds([currentSelectedDeck.id]);
                                        setCreatorTargetDeckId(currentSelectedDeck.id);
                                        setActiveTab('creator');
                                      }}
                                    >
                                      <IconEdit /> Create cards
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="csm-library-bombcard-prompt">{card.prompt}</p>
                            {isRevealed && <p className="csm-library-bombcard-answer">{card.correctAnswer || 'Answer not saved yet.'}</p>}
                            <div className="csm-library-bombcard-footer"><small>{card.type === 'MULTIPLE_CHOICE' ? 'Multiple choice' : 'Identification'}</small><button type="button" className="csm-library-reveal" onClick={() => toggleLibraryCardAnswer(cardId)}>{isRevealed ? 'Hide answer' : 'Reveal answer'}</button></div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="csm-library-content-section">
                  <div className="csm-library-section-heading"><div className="csm-library-section-heading-left"><span className="csm-kicker">REFERENCE NOTES</span><span className="csm-library-count-pill">{currentSelectedDeck.documents?.length || 0} PDFs</span></div><button type="button" onClick={(e) => handleOpenAddMaterialPopup(currentSelectedDeck, e)}><IconPlus /> Add PDF</button></div>
                  <div className="csm-library-documents">
                    {(!currentSelectedDeck.documents || currentSelectedDeck.documents.length === 0) ? (
                      <div className="csm-library-empty-row">No documents attached yet. Upload lecture notes or slides to keep them beside this reviewer.</div>
                    ) : currentSelectedDeck.documents.map((doc) => {
                      const docMenuId = `doc-${doc.id}`;
                      const documentMenuOpen = openMaterialMenuId === docMenuId;
                      return (
                        <div key={doc.id} className="csm-library-document">
                          <div className="csm-library-document-main"><span className="csm-library-document-icon">PDF</span><div className="csm-library-document-copy"><button type="button" onClick={() => handleOpenDocument(currentSelectedDeck, doc)}>{doc.title}</button><small>PDF reference · Click to open in PDF Tools</small></div></div>
                          <div className="csm-material-actions"><button type="button" className="csm-material-menu-trigger" aria-label={`Document options for ${doc.title}`} aria-expanded={documentMenuOpen} onClick={() => setOpenMaterialMenuId(documentMenuOpen ? null : docMenuId)}>•••</button>{documentMenuOpen && <div className="csm-material-menu"><button type="button" onClick={() => { setOpenMaterialMenuId(null); handleOpenDocument(currentSelectedDeck, doc); }}>Open PDF tools</button><button type="button" className="danger" onClick={() => handleRemoveDocument(currentSelectedDeck.id, doc.id)}><IconTrash /> Remove PDF</button></div>}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : (
              <div className="csm-library-main animate-fadeIn">
                <div className="csm-library-toolbar">
                  <label className="csm-library-search"><IconSearch /><input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search decks by title or subject" aria-label="Search decks by title or subject" /></label>
                  <label className="csm-library-filter"><span>Filter</span><select value={librarySubjectFilter} onChange={(e) => setLibrarySubjectFilter(e.target.value)} aria-label="Filter decks by subject">{librarySubjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                </div>

                <section className="csm-library-list-section">
                  <div className="csm-library-section-heading"><div><h2>Recently updated</h2><span>{recentDecks.length} deck{recentDecks.length === 1 ? '' : 's'} · last 7 days</span></div><button type="button" onClick={() => setCollapseRecent(prev => !prev)}>{collapseRecent ? 'Show section' : 'Collapse section'}</button></div>
                  {!collapseRecent && (recentDecks.length ? <div className="csm-library-deck-grid">{recentDecks.map(renderLibraryDeckCard)}</div> : <div className="csm-library-empty"><strong>{olderDecks.length ? 'No recently updated decks' : 'No decks match your search'}</strong><p>{olderDecks.length ? 'Your matching reviewers are listed below.' : 'Try another title or subject, or create a fresh reviewer.'}</p><button type="button" className="csm-primary-button" onClick={handleOpenCreateFolderInfo}><IconPlus /> Add a deck</button></div>)}
                </section>

                {olderDecks.length > 0 && <section className="csm-library-list-section mt-6">
                  <div className="csm-library-section-heading"><div><h2>More reviewers</h2><span>{olderDecks.length} deck{olderDecks.length === 1 ? '' : 's'} · older than a week</span></div><button type="button" onClick={() => setCollapseOlder(prev => !prev)}>{collapseOlder ? 'Show section' : 'Collapse section'}</button></div>
                  {!collapseOlder && <div className="csm-library-deck-grid">{olderDecks.map(renderLibraryDeckCard)}</div>}
                </section>}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
                VIEW B2: STUDY (Active Review of Bombcards)
                ======================================================== */}
        {activeTab === 'flashcards' && (
          <div className="csm-screen csm-flashcards-screen custom-scroll">
            <div className="csm-page-head">
              <div>
                <span className="csm-kicker">ACTIVE REVIEW</span>
                <h1>Study Bombcards</h1>
                <p>Recall first, reveal the answer when you’re ready. Focus on understanding before moving forward.</p>
              </div>
              <div className="csm-page-actions">
                <button
                  type="button"
                  className="csm-secondary-button"
                  onClick={() => {
                    setCreatorTargetDeckId(activeFlashcardDeck?.id || decks[0]?.id);
                    setActiveTab('creator');
                  }}
                >
                  <IconPlus className="w-3.5 h-3.5 mr-1.5 text-[#f04824]" /> Create Bombcards
                </button>
                <button type="button" className="csm-primary-button" onClick={() => handleOpenGameMode(activeFlashcardDeck?.id)}>
                  Play Bombstyle <span>→</span>
                </button>
              </div>
            </div>
            <div className="csm-viewer-toolbar">
              <label>
                Reviewing deck
                <select
                  value={activeFlashcardDeck?.id || ''}
                  onChange={(e) => {
                    setSelectedDeckIds([e.target.value]);
                    setFlashcardIndex(0);
                    setFlashcardFlipped(false);
                  }}
                >
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>
                      {deck.code} — {deck.title || deck.subject} ({deck.cards?.length || 0} cards)
                    </option>
                  ))}
                </select>
              </label>
              <span className="csm-viewer-progress">
                Card {flashcards.length ? Math.min(flashcardIndex + 1, flashcards.length) : 0} of {flashcards.length}
              </span>
            </div>
            <div className="csm-viewer-layout">
              <section className="csm-flashcard-panel">
                <div className="csm-flashcard-progress">
                  <span style={{ width: `${flashcards.length ? ((flashcardIndex + 1) / flashcards.length) * 100 : 0}%` }} />
                </div>
                {flashcards.length > 0 ? (
                  <button
                    type="button"
                    className={`csm-flashcard ${flashcardFlipped ? 'is-flipped' : ''}`}
                    onClick={flipFlashcard}
                    aria-label="Flip flashcard"
                  >
                    <span className="csm-flashcard-side-label">{flashcardFlipped ? 'ANSWER' : 'PROMPT'}</span>
                    <strong>{flashcardFlipped ? (activeFlashcard?.correctAnswer || 'No answer saved yet') : (activeFlashcard?.prompt || 'No cards in this deck yet.')}</strong>
                    {flashcardFlipped && activeFlashcard?.explanation && <p>{activeFlashcard.explanation}</p>}
                    <small>{flashcardFlipped ? 'Click or press Space to see prompt' : 'Click or press Space to reveal answer'} &bull; &larr; &rarr; to navigate</small>
                  </button>
                ) : (
                  <div className="csm-flashcard flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#f04824] flex items-center justify-center mb-3">
                      <IconCards className="w-6 h-6" />
                    </div>
                    <strong className="text-lg text-slate-800">No Bombcards in this deck yet</strong>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Add your first question to start studying this reviewer.</p>
                    <button
                      type="button"
                      className="csm-primary-button"
                      onClick={() => {
                        setCreatorTargetDeckId(activeFlashcardDeck?.id || decks[0]?.id);
                        setActiveTab('creator');
                      }}
                    >
                      <IconPlus className="w-3.5 h-3.5 mr-1" /> Create Bombcards
                    </button>
                  </div>
                )}
                <div className="csm-viewer-controls">
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() => { setFlashcardIndex(index => Math.max(0, index - 1)); setFlashcardFlipped(false); }}
                    disabled={flashcardIndex === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="csm-primary-button"
                    onClick={() => { setFlashcardIndex(index => Math.min(Math.max(flashcards.length - 1, 0), index + 1)); setFlashcardFlipped(false); }}
                    disabled={!flashcards.length || flashcardIndex >= flashcards.length - 1}
                  >
                    Next card →
                  </button>
                </div>
              </section>
              <aside className="csm-review-summary">
                <span className="csm-kicker">SESSION SUMMARY</span>
                <h2>{activeFlashcardDeck?.code || 'Your deck'}</h2>
                <div className="csm-summary-stat"><strong>{flashcards.length}</strong><span>cards in deck</span></div>
                <div className="csm-summary-stat"><strong>{accountStats.accuracy || 0}%</strong><span>average accuracy</span></div>
                <div className="csm-summary-stat"><strong>3</strong><span>missed to revisit</span></div>
                <button type="button" className="csm-text-button" onClick={() => setActiveTab('game')}>Practice missed cards <span>→</span></button>
              </aside>
            </div>
          </div>
        )}

        {/* ========================================================
                VIEW B3: CREATE BOMBCARDS (Dedicated Full Page Experience)
                ======================================================== */}
        {activeTab === 'creator' && (() => {
          const currentTargetDeck = decks.find(d => d.id === creatorTargetDeckId) || decks[0];
          const deckCards = currentTargetDeck?.cards || [];
          return (
            <div className="csm-screen csm-creator-screen custom-scroll">
              {/* Page Header */}
              <div className="csm-page-head">
                <div>
                  <span className="csm-kicker">BOMBCARD AUTHORING</span>
                  <h1>Create Bombcards</h1>
                  <p>Draft new study questions manually or prepare materials for your reviewer decks.</p>
                </div>
                <div className="csm-page-actions">
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                  >
                    Back to Library
                  </button>
                  <button
                    type="button"
                    className="csm-primary-button"
                    onClick={() => setActiveTab('flashcards')}
                  >
                    Go to Study <span>→</span>
                  </button>
                </div>
              </div>

              {/* Creation Options Header Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Option A: Create Bombcards Manually (ACTIVE & AVAILABLE) */}
                <div className="bg-white p-5 rounded-2xl border-2 border-[#f04824] shadow-sm flex items-start gap-4 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#f04824] border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <IconCards className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-extrabold text-slate-900">Create Bombcards Manually</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#f04824]">Active Mode</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Write custom questions, correct answers, and optional hints directly into your selected reviewer deck.
                    </p>
                  </div>
                </div>

                {/* Option B: Generate AI Bombcards (COMING SOON / DISABLED) */}
                <div className="bg-white/70 p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-4 relative overflow-hidden select-none cursor-not-allowed">
                  <div className="opacity-35 blur-[1.2px] flex items-start gap-4 w-full pointer-events-none">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center flex-shrink-0">
                      <IconSparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-extrabold text-slate-900">Generate AI Bombcards</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Automatically extract key question-and-answer pairs from uploaded lecture notes and PDFs.
                      </p>
                    </div>
                  </div>
                  {/* Prominent Coming Soon badge overlay */}
                  <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md border border-slate-700/40 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Creation Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Authoring Form */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#f04824] uppercase tracking-wider block">MANUAL AUTHORING</span>
                      <h2 className="text-base font-extrabold text-slate-900">Card Specifications</h2>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">
                      Deck: <b className="text-slate-800">{currentTargetDeck?.code || 'None'}</b>
                    </span>
                  </div>

                  {/* 1. Target Deck Selection */}
                  <label className="block mb-4">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">Target Reviewer Deck *</span>
                    <select
                      value={creatorTargetDeckId}
                      onChange={(e) => setCreatorTargetDeckId(e.target.value)}
                      className="w-full h-10 px-3.5 bg-[#f8f9fa] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#f04824] focus:bg-white transition-all cursor-pointer"
                    >
                      {decks.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.title || d.subject} ({d.cards?.length || 0} cards)
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* 2. Format Toggle */}
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">Question Format</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCreatorType('MULTIPLE_CHOICE')}
                        className={`h-8 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${creatorType === 'MULTIPLE_CHOICE'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-[#f8f9fa] text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Multiple Choice
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatorType('IDENTIFICATION')}
                        className={`h-8 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${creatorType === 'IDENTIFICATION'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-[#f8f9fa] text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Identification
                      </button>
                    </div>
                  </div>

                  {/* 3. Question Prompt */}
                  <label className="block mb-4">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">Question Prompt *</span>
                    <textarea
                      value={creatorPrompt}
                      onChange={(e) => setCreatorPrompt(e.target.value)}
                      placeholder="e.g. Which SQL command removes all rows from a table without logging individual row deletions?"
                      rows="3"
                      className="w-full p-3.5 bg-[#f8f9fa] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#f04824] focus:bg-white resize-none transition-all leading-relaxed"
                    />
                  </label>

                  {/* 4. Answer Area */}
                  {creatorType === 'MULTIPLE_CHOICE' ? (
                    <div className="mb-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Answer Options *</span>
                        <span className="text-[11px] text-slate-400 font-medium">Select radio to set the correct answer</span>
                      </div>
                      {creatorOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="creatorRadioCorrect"
                            checked={creatorCorrectIndex === idx}
                            onChange={() => setCreatorCorrectIndex(idx)}
                            className="w-4 h-4 text-[#f04824] accent-[#f04824] cursor-pointer"
                            title="Designate as correct answer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...creatorOptions];
                              updated[idx] = e.target.value;
                              setCreatorOptions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}${idx === creatorCorrectIndex ? ' (Correct Answer)' : ''}`}
                            className={`flex-1 h-9 px-3 bg-[#f8f9fa] border rounded-xl text-xs text-slate-800 outline-none focus:bg-white transition-all ${creatorCorrectIndex === idx
                              ? 'border-[#f04824] bg-orange-50/20 font-bold'
                              : 'border-slate-200 focus:border-slate-400'
                              }`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 space-y-3">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-700 block mb-1.5">Correct Answer *</span>
                        <input
                          type="text"
                          value={creatorAnswer}
                          onChange={(e) => setCreatorAnswer(e.target.value)}
                          placeholder="e.g. TRUNCATE"
                          className="w-full h-9 px-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#f04824] focus:bg-white transition-all"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 block mb-1.5">Accepted Alternates (Optional)</span>
                        <input
                          type="text"
                          value={creatorAlternates}
                          onChange={(e) => setCreatorAlternates(e.target.value)}
                          placeholder="e.g. truncate, TRUNCATE TABLE"
                          className="w-full h-9 px-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                        />
                      </label>
                    </div>
                  )}

                  {/* 5. Optional Hint */}
                  <label className="block mb-6">
                    <span className="text-xs font-bold text-slate-500 block mb-1.5">Study Hint / Tag (Optional)</span>
                    <input
                      type="text"
                      value={creatorHint}
                      onChange={(e) => setCreatorHint(e.target.value)}
                      placeholder="e.g. DDL Command, Fast Erase, Chapter 2"
                      className="w-full h-9 px-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </label>

                  {/* Form Actions Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatorPrompt('');
                        setCreatorHint('');
                        setCreatorOptions(['', '', '', '']);
                        setCreatorAnswer('');
                        setCreatorAlternates('');
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Clear fields
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBombcard}
                      className="csm-primary-button"
                    >
                      <IconPlus /> Add Bombcard
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Card Preview & Existing Cards in Deck */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Live Card Preview */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <span className="text-[10px] font-extrabold text-[#f04824] uppercase tracking-wider">LIVE PREVIEW</span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {creatorType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Identification'}
                      </span>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-[#fbfcfd] to-[#f4f7fb] border border-slate-200/90 rounded-xl min-h-[160px] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {currentTargetDeck?.code || 'Deck'} • Question Preview
                        </span>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">
                          {creatorPrompt.trim() || 'Your question prompt will appear here as you type...'}
                        </p>
                        {creatorHint.trim() && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Hint: {creatorHint}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200/80">
                        <span className="text-[10px] font-bold text-[#f04824] uppercase tracking-wider block mb-1">
                          Correct Answer
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                          {creatorType === 'MULTIPLE_CHOICE'
                            ? (creatorOptions[creatorCorrectIndex]?.trim() || `Option ${String.fromCharCode(65 + creatorCorrectIndex)} (Designated)`)
                            : (creatorAnswer.trim() || 'Answer not specified yet')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cards in Deck Overview */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <IconCards className="w-4 h-4 text-slate-600" />
                        <h3 className="text-xs font-extrabold text-slate-900">
                          Cards in {currentTargetDeck?.code}
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-[#f04824] bg-orange-50 px-2 py-0.5 rounded-full">
                        {deckCards.length} cards
                      </span>
                    </div>
                    {deckCards.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center">
                        No cards in this deck yet. Use the form to add your first card!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1">
                        {deckCards.map((card, idx) => (
                          <div
                            key={card.id || idx}
                            className="p-2.5 bg-[#f8f9fa] border border-slate-200/80 rounded-xl text-xs flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-slate-400 block">
                                #{idx + 1} • {card.type === 'MULTIPLE_CHOICE' ? 'MCQ' : 'ID'}
                              </span>
                              <p className="font-semibold text-slate-800 truncate mt-0.5">{card.prompt}</p>
                            </div>
                            <span className="text-[10px] font-extrabold text-[#f04824] bg-white border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                              {card.correctAnswer || 'Answer'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeckIds([currentTargetDeck.id]);
                          setActiveTab('flashcards');
                        }}
                        className="text-xs font-extrabold text-[#f04824] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Review deck in Study</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================
                VIEW B4: PDF HIGHLIGHTER
                ======================================================== */}
        {activeTab === 'highlighter' && (
          <div className="csm-screen csm-highlighter-screen custom-scroll">
            <div className="csm-page-head csm-pdf-page-head"><div><span className="csm-kicker">PDF STUDY TOOL</span><h1>Highlight your notes</h1><p>Select a passage, save it as a study note, or turn it into a Bombcard.</p></div><div className="csm-page-actions"><button type="button" className="csm-secondary-button" onClick={() => setActiveTab('library')}>Back to library</button></div></div>
            <div className="csm-highlighter-layout">
              <section className="csm-pdf-card">
                <div className="csm-pdf-toolbar">
                  <div className="csm-pdf-document-title"><strong>{activeDocument?.title || 'Choose a PDF to study'}</strong><span>{activeDocument ? `${decks.find(deck => deck.id === activeDocument.deckId)?.title || 'Your reviewer'} · private to your account` : 'Choose from your saved reviewer documents'}</span></div>
                  <div className="csm-pdf-tools">
                    {!activeDocument && <select className="csm-pdf-document-select" value="" aria-label="Choose a PDF" onChange={event => { const found = decks.flatMap(deck => (deck.documents || []).map(document => ({ deck, document }))).find(item => item.document.id === event.target.value); if (found) handleOpenDocument(found.deck, found.document); }}><option value="">Choose PDF…</option>{decks.flatMap(deck => (deck.documents || []).map(document => <option key={document.id} value={document.id}>{document.title} · {deck.title}</option>))}</select>}
                    {['#f5a23a', '#8dc7ef', '#a8d8a8'].map((color, index) => <button key={color} type="button" className={`csm-pdf-color ${highlightColor === color ? 'active' : ''}`} onClick={() => setHighlightColor(color)} aria-label={['Orange', 'Blue', 'Green'][index] + ' highlight color'} aria-pressed={highlightColor === color} style={{ '--swatch': color }} />)}
                    {activeDocument && <a className="csm-pdf-open-link" href={activeDocument.url} target="_blank" rel="noreferrer">Open PDF ↗</a>}
                  </div>
                </div>
                <div className="csm-pdf-instructions"><span className="csm-pdf-instructions-icon">✦</span><span>Drag across text in the page. Then choose whether to save a note or make a question-and-answer Bombcard.</span></div>
                <PdfStudyViewer document={activeDocument} pageNumber={pdfPage} onPageCount={setPdfPageCount} highlights={highlights} onSelection={handlePdfTextSelection} />
                <div className="csm-pdf-pagination"><button type="button" className="csm-secondary-button" onClick={() => setPdfPage(page => Math.max(1, page - 1))} disabled={!activeDocument || pdfPage <= 1}>← Previous</button><label>Page <input type="number" min="1" max={pdfPageCount || 1} value={pdfPage} onChange={event => { const page = Number(event.target.value); if (Number.isInteger(page) && page > 0 && page <= pdfPageCount) setPdfPage(page); }} disabled={!activeDocument || !pdfPageCount} /> <span>of {pdfPageCount || '—'}</span></label><button type="button" className="csm-secondary-button" onClick={() => setPdfPage(page => Math.min(pdfPageCount, page + 1))} disabled={!activeDocument || !pdfPageCount || pdfPage >= pdfPageCount}>Next →</button></div>
              </section>
              <aside className="csm-highlights-card csm-pdf-notes-panel">
                <div className="csm-pdf-notes-heading"><div><span className="csm-kicker">YOUR PDF NOTES</span><h2>{highlights.length} saved {highlights.length === 1 ? 'highlight' : 'highlights'}</h2></div><button type="button" className="csm-row-menu" onClick={handleClearHighlights} aria-label="Clear all highlights" disabled={!activeDocument || !highlights.length}>Clear</button></div>
                {pdfSelection && <section className="csm-pdf-selection-card"><div className="csm-pdf-selection-label"><span className="csm-selection-dot" style={{ background: highlightColor }} />SELECTED TEXT · PAGE {pdfSelection.page}</div><blockquote>“{pdfSelection.text}”</blockquote><div className="csm-pdf-selection-actions"><button type="button" className="csm-secondary-button" onClick={savePdfSelection} disabled={pdfSaving}>Save highlight</button><button type="button" className="csm-primary-button" onClick={() => { setPdfCardComposerOpen(value => !value); setPdfCounterpart(''); }} disabled={pdfSaving}>{pdfCardComposerOpen ? 'Close card form' : 'Make a Bombcard'}</button></div>
                  {pdfCardComposerOpen && <div className="csm-pdf-card-composer"><strong>Use this excerpt as the…</strong><div className="csm-pdf-role-switch" role="group" aria-label="Choose how to use selected text"><button type="button" className={pdfSelectionRole === 'question' ? 'active' : ''} onClick={() => { setPdfSelectionRole('question'); setPdfCounterpart(''); }}>Question</button><button type="button" className={pdfSelectionRole === 'answer' ? 'active' : ''} onClick={() => { setPdfSelectionRole('answer'); setPdfCounterpart(''); }}>Answer</button></div><label htmlFor="pdf-card-counterpart">{pdfSelectionRole === 'question' ? 'Write the answer' : 'Write the question'}</label><textarea id="pdf-card-counterpart" rows="3" maxLength="10000" value={pdfCounterpart} onChange={event => setPdfCounterpart(event.target.value)} placeholder={pdfSelectionRole === 'question' ? 'Enter the correct answer…' : 'Enter a question for this answer…'} /><small>This creates an Identification Bombcard in the reviewer that contains this PDF.</small><button type="button" className="csm-primary-button csm-pdf-create-card" onClick={createPdfBombcard} disabled={pdfSaving || !pdfCounterpart.trim()}>{pdfSaving ? 'Saving…' : 'Create Bombcard'}</button></div>}
                </section>}
                {!pdfSelection && <div className="csm-pdf-selection-empty"><span>✦</span><strong>Select text in the PDF</strong><p>Your selection will appear here. Save it as a color highlight or use it to create a question-and-answer Bombcard.</p></div>}
                <div className="csm-pdf-saved-list">{highlights.map(item => <article key={item.id} className="csm-pdf-saved-item"><div className="csm-pdf-saved-item-top"><span className="csm-pdf-note-tag" style={{ '--swatch': item.color }}>{item.purpose === 'question' ? 'Question card' : item.purpose === 'answer' ? 'Answer card' : 'Study note'}</span><button type="button" className="csm-row-menu" onClick={() => handleRemoveHighlight(item.id)} aria-label={`Delete highlight ${item.id}`}>×</button></div><p>{item.text}</p><button type="button" className="csm-pdf-page-jump" onClick={() => setPdfPage(Number(item.page) || 1)}>Go to page {item.page}{item.cardId ? ' · linked Bombcard' : ''}</button></article>)}</div>
                {!!highlights.length && <button type="button" className="csm-add-highlight" onClick={handleClearHighlights}>Clear all saved highlights</button>}
              </aside>
            </div>
          </div>
        )}

        {/* ========================================================
                VIEW C: BOMBSTYLE ARENA (CO-STUDYMAXX SYSTEM-CONSISTENT)
                ======================================================== */}
            {(activeTab === 'arena' || activeTab === 'game') && (
              <div className="csm-screen csm-arena-screen custom-scroll">

                {/* PHASE 1: DECK SELECTION HUB */}
                {bombstylePhase === 'select_deck' && (
                  <div>
                    <div className="csm-page-head">
                      <div>
                        <span className="csm-kicker">ARENA • BOMBSTYLE</span>
                        <h1>Bombstyle Arena</h1>
                        <p>Test your Bombcards under pressure. Active recall and one countdown for the whole round. Choose a deck to start.</p>
                      </div>
                    </div>

                    {/* Arena High-Level Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#f04824] flex items-center justify-center font-bold">
                          <IconCards className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Ready Decks</span>
                          <span className="text-xl font-extrabold text-slate-900 leading-none">{decks.filter(d => d.cards && d.cards.length > 0).length} Decks</span>
                        </div>
                      </div>

                      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-[#f04824] text-white flex items-center justify-center font-bold shadow-sm">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Playable Cards</span>
                          <span className="text-xl font-extrabold text-slate-900 leading-none">{decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0)} Bombcards</span>
                        </div>
                      </div>

                      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 21a6 6 0 0 0 6-6c0-2.1-1.1-4.1-3.2-6.1.1 1.8-.7 3-1.8 3.9.2-3.6-1.8-6.2-4.3-8.8.2 3.3-2.7 5.4-2.7 9A6 6 0 0 0 12 21Z" />
                            <path d="M12 17.5a2.5 2.5 0 0 0 2.5-2.5c0-.6-.2-1.2-.6-1.7-.2.8-.7 1.3-1.3 1.7-.1-1.1-.7-1.9-1.5-2.6.1 1.1-.8 1.8-.8 2.9a2.5 2.5 0 0 0 1.7 2.2Z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Best Streak</span>
                          <span className="text-xl font-extrabold text-slate-900 leading-none">{bombstyleMaxStreak}x Recall</span>
                        </div>
                      </div>

                      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Time Pressure</span>
                          <span className="text-xl font-extrabold text-slate-900 leading-none">10s – 30s</span>
                        </div>
                      </div>
                    </div>

                    <div className="csm-arena-deck-grid">
                      {decks.map(deck => {
                        const cardCount = deck.cards ? deck.cards.length : 0;
                        const hasCards = cardCount > 0;
                        const isSelected = bombstyleDeckId === deck.id;

                        return (
                          <div
                            key={deck.id}
                            className={`csm-arena-deck-card ${isSelected ? 'is-selected' : ''} ${!hasCards ? 'is-disabled' : ''}`}
                            onClick={() => {
                              if (!hasCards) {
                                triggerToast('This deck has no Bombcards. Create cards in Library first!');
                                return;
                              }
                              handleSelectBombstyleDeck(deck.id);
                            }}
                          >
                            <div>
                              <div className="csm-arena-deck-top">
                                <span className="csm-arena-deck-code">{deck.code || deck.title}</span>
                                <span className={`csm-arena-deck-badge ${hasCards ? 'has-cards' : ''}`}>
                                  {cardCount} {cardCount === 1 ? 'Bombcard' : 'Bombcards'}
                                </span>
                              </div>
                              <p className="csm-arena-deck-subject">{deck.subject || 'General Studies'}</p>
                            </div>

                            <div className="csm-arena-deck-bottom">
                              <span className="csm-arena-deck-meta">
                                {deck.category || 'Deck'} &bull; {deck.cards?.length || 0} items
                              </span>
                              <span className="csm-arena-deck-action">
                                {hasCards ? 'Select Deck →' : 'No cards yet'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PHASE 2: SESSION CONFIGURATION */}
                {bombstylePhase === 'configure' && (
                  <div className="csm-bombstyle-config">
                    <header className="csm-bombstyle-config-head">
                      <span className="csm-kicker">SESSION SETUP</span>
                      <h1>Build your challenge.</h1>
                      <p>Your deck. Your pace. A little pressure.</p>
                    </header>

                    <div className="csm-bombstyle-config-layout">
                      <section className="csm-bombstyle-settings-card" aria-labelledby="bombstyle-difficulty-title">
                        <div className="csm-bombstyle-selected-deck">
                          <span className="csm-bombstyle-deck-icon"><IconCards className="w-7 h-7" /></span>
                          <div className="csm-bombstyle-deck-copy">
                            <span>Selected Deck</span>
                            <strong>{bombstyleActiveDeck?.code || bombstyleActiveDeck?.title || 'Your deck'}</strong>
                            <small>{bombstyleAvailableCards.length} Bombcards available</small>
                          </div>
                          <button type="button" className="csm-bombstyle-change-deck" onClick={() => setBombstylePhase('select_deck')}>
                            Change deck
                          </button>
                        </div>

                        <div className="csm-bombstyle-difficulty-heading">
                          <span className="csm-bombstyle-step">01</span>
                          <div>
                            <h2 id="bombstyle-difficulty-title">Pick your difficulty</h2>
                            <p>Choose your starting time. The countdown runs for the whole round.</p>
                          </div>
                        </div>

                        <div className="csm-bombstyle-difficulty-grid" role="radiogroup" aria-label="Difficulty">
                          {Object.entries(BOMBSTYLE_DIFFICULTIES).map(([key, difficulty]) => {
                            const isSelected = bombstyleDifficulty === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                className={`csm-bombstyle-difficulty-card ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => handleSetDifficulty(key)}
                              >
                                <span className="csm-bombstyle-difficulty-icon" aria-hidden="true">
                                  {key === 'easy' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4C11 4 5 7 5 14c0 3 2 5 5 5 7 0 10-6 10-15Z"/><path d="M4 21c3-5 6-8 11-11"/></svg>}
                                  {key === 'normal' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>}
                                  {key === 'hard' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>}
                                </span>
                                <strong>{difficulty.label}</strong>
                                <span>{difficulty.timeLabel}</span>
                                {isSelected && <span className="csm-bombstyle-selected-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span>}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className="csm-bombstyle-timer-toggle"
                          aria-expanded={bombstyleTimerHelpOpen}
                          aria-controls="bombstyle-timer-explanation"
                          onClick={() => setBombstyleTimerHelpOpen(open => !open)}
                        >
                          <span className="csm-bombstyle-info-icon" aria-hidden="true">i</span>
                          <span>How the timer works</span>
                          <svg className="csm-bombstyle-toggle-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>

                        <div id="bombstyle-timer-explanation" className={`csm-bombstyle-timer-explanation ${bombstyleTimerHelpOpen ? 'is-open' : ''}`} aria-hidden={!bombstyleTimerHelpOpen}>
                          <div className="csm-bombstyle-explanation-inner">
                            <h3>Keep your bomb ticking</h3>
                            <p>Correct answers add 8 seconds to your remaining time. Wrong answers subtract 5 seconds.</p>
                            <div className="csm-bombstyle-timer-effects">
                              <div><span className="csm-bombstyle-effect-icon is-correct"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></span><span><small>Correct answer</small><strong>+8 seconds</strong></span></div>
                              <div><span className="csm-bombstyle-effect-icon is-wrong"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18" /></svg></span><span><small>Wrong answer</small><strong>&minus;5 seconds</strong></span></div>
                            </div>
                          </div>
                        </div>
                        <p className="csm-bombstyle-one-timer">One timer for the entire round.</p>
                      </section>

                      <aside className="csm-bombstyle-summary-card" aria-labelledby="bombstyle-summary-title">
                        <div className="csm-bombstyle-illustration">
                          <img src="csm-mascot.png" alt="Friendly bomb mascot" />
                        </div>
                        <h2 id="bombstyle-summary-title">Ready when you are.</h2>
                        <p className="csm-bombstyle-summary-subtitle">Here&rsquo;s your game plan.</p>
                        <div className="csm-bombstyle-summary-list">
                          <div><span className="csm-bombstyle-summary-icon"><IconSparkles /></span><span>Difficulty</span><strong>{selectedBombstyleDifficulty.label}</strong></div>
                          <div><span className="csm-bombstyle-summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" /></svg></span><span>Starting time</span><strong>{selectedBombstyleDifficulty.timeLabel}</strong></div>
                          <div><span className="csm-bombstyle-summary-icon is-positive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 8v8M8 12h8" /></svg></span><span>Correct answer</span><strong>+8 seconds</strong></div>
                          <div><span className="csm-bombstyle-summary-icon is-negative"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 12h8" /></svg></span><span>Wrong answer</span><strong>&minus;5 seconds</strong></div>
                        </div>
                        <button type="button" className="csm-bombstyle-start-button" disabled={bombstyleAvailableCards.length === 0} onClick={() => handleStartBombstyle()}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 8 6-8 6V6Z" /></svg>
                          Start Bombstyle
                        </button>
                        <button type="button" className="csm-bombstyle-cancel-button" onClick={() => setBombstylePhase('select_deck')}>Cancel</button>
                      </aside>
                    </div>
                  </div>
                )}

                {/* PHASE 3: GAMEPLAY SCREEN */}
                {bombstylePhase === 'gameplay' && (
                  <div className="csm-arena-gameplay-wrap">
                    {/* Top HUD */}
                    <header className="csm-arena-hud">
                      {/* Left: Exit & Deck Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          className="csm-secondary-button"
                          style={{ height: '34px', width: '34px', padding: 0 }}
                          title="Exit Run to Arena Hub"
                          onClick={async () => { try { await CSM.api('arena/pause', 'POST', { id: bombstyleSessionId }); } catch (_) {} setBombstyleExitModalOpen(true); }}
                        >
                          <IconArrowLeft />
                        </button>
                        <div>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, display: 'block', lineHeight: 1 }}>DECK</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#090d14' }}>
                            {bombstyleActiveDeck?.code || bombstyleActiveDeck?.title}
                          </span>
                        </div>
                      </div>

                      {/* Center: Card Progress */}
                      <div style={{ textAlign: 'center' }}>
                        <span className="csm-arena-hud-progress">
                          {bombstyleIndex + 1} / {bombstyleQueue.length} BOMBCARDS
                        </span>
                      </div>

                      {/* Right: Sound & Streak */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          className="csm-secondary-button"
                          style={{ height: '34px', width: '34px', padding: 0 }}
                          onClick={() => setSoundMuted(sound.toggleMute())}
                          title={soundMuted ? 'Unmute' : 'Mute'}
                        >
                          <IconSpeaker muted={soundMuted} />
                        </button>

                        {/* Streak Badge */}
                        <div className={`csm-arena-streak-badge ${bombstyleStreak >= 3 ? 'streak-hot' : ''}`}>
                          🔥 STREAK ×{bombstyleStreak}
                        </div>

                      </div>
                    </header>

                    {/* Central Stage */}
                    <div className="csm-arena-stage-center relative">
                      {/* Micro Feedback Popup */}
                      {bombstyleFeedback === 'defused' && (
                        <div className="bombstyle-feedback-pill defused">
                          ⚡ DEFUSED!
                        </div>
                      )}
                      {bombstyleFeedback === 'exploded' && (
                        <div className="bombstyle-feedback-pill exploded">
                          💥 EXPLODED!
                        </div>
                      )}

                      {/* Animated SVG Bomb Mascot */}
                      <div className={`relative transition-transform duration-150 ${isBombDanger ? 'animate-shake-danger' : ''}`}>
                        {/* Glow Aura */}
                        <div className={`absolute -inset-8 rounded-full blur-2xl transition-opacity duration-300 pointer-events-none ${isBombDanger ? 'bg-red-500/25 opacity-100' : 'bg-[#f04824]/10 opacity-50'}`} />

                        <svg width="150" height="150" viewBox="0 0 200 200" className="relative z-10 drop-shadow-xl">
                          <defs>
                            <radialGradient id="bsBombBody" cx="35%" cy="35%" r="65%">
                              <stop offset="0%" stopColor="#2e2a28" />
                              <stop offset="45%" stopColor="#141110" />
                              <stop offset="100%" stopColor="#050403" />
                            </radialGradient>
                            <radialGradient id="bsBombDangerBody" cx="35%" cy="35%" r="65%">
                              <stop offset="0%" stopColor="#4a1515" />
                              <stop offset="50%" stopColor="#240808" />
                              <stop offset="100%" stopColor="#0a0202" />
                            </radialGradient>
                            <radialGradient id="bsBombDefusedBody" cx="35%" cy="35%" r="65%">
                              <stop offset="0%" stopColor="#14532d" />
                              <stop offset="50%" stopColor="#052e16" />
                              <stop offset="100%" stopColor="#021a0c" />
                            </radialGradient>
                            <radialGradient id="bsSpark" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="40%" stopColor="#fef08a" />
                              <stop offset="80%" stopColor="#f04824" />
                              <stop offset="100%" stopColor="transparent" />
                            </radialGradient>
                          </defs>

                          {/* Fuse */}
                          <path
                            d="M 100 42 C 100 25, 125 32, 132 15"
                            fill="none"
                            stroke={bombstyleFeedback === 'defused' ? '#10b981' : isBombDanger ? '#ef4444' : '#ca8a04'}
                            strokeWidth="6"
                            strokeLinecap="round"
                          />

                          {/* Fuse Spark */}
                          {bombstyleFeedback !== 'defused' && (
                            <g transform="translate(132, 15)">
                              <circle cx="0" cy="0" r="10" fill="url(#bsSpark)" className="animate-spark-pulse" />
                              <path d="M 0 -12 L 0 -4 M 0 4 L 0 12 M -12 0 L -4 0 M 4 0 L 12 0" stroke={isBombDanger ? "#f87171" : "#fef08a"} strokeWidth="2.5" strokeLinecap="round" />
                              <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                            </g>
                          )}

                          {/* Cap & Horns */}
                          <rect x="86" y="38" width="28" height="12" rx="4" fill="#3f3f46" stroke="#18181b" strokeWidth="2" />
                          <path d="M 52 75 C 38 48, 48 30, 68 46 C 60 56, 56 68, 52 75 Z" fill="#ffffff" stroke="#262626" strokeWidth="2.5" />
                          <path d="M 148 75 C 162 48, 152 30, 132 46 C 140 56, 144 68, 148 75 Z" fill="#ffffff" stroke="#262626" strokeWidth="2.5" />

                          {/* Sphere */}
                          <circle
                            cx="100"
                            cy="116"
                            r="74"
                            fill={bombstyleFeedback === 'defused' ? 'url(#bsBombDefusedBody)' : isBombDanger ? 'url(#bsBombDangerBody)' : 'url(#bsBombBody)'}
                            stroke={bombstyleFeedback === 'defused' ? '#10b981' : isBombDanger ? '#ef4444' : '#2e2a28'}
                            strokeWidth="3.5"
                          />

                          {/* Eyes & Mouth Expression */}
                          {bombstyleFeedback === 'defused' ? (
                            <g fill="#22c55e">
                              <circle cx="82" cy="108" r="8" />
                              <circle cx="118" cy="108" r="8" />
                              <path d="M 82 128 Q 100 148 118 128" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
                            </g>
                          ) : isBombDanger ? (
                            <g fill="#ef4444">
                              <circle cx="82" cy="108" r="8" />
                              <circle cx="118" cy="108" r="8" />
                              <circle cx="82" cy="108" r="3" fill="#ffffff" />
                              <circle cx="118" cy="108" r="3" fill="#ffffff" />
                              <path d="M 80 136 Q 90 126 100 136 T 120 136" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                            </g>
                          ) : (
                            <g>
                              <circle cx="82" cy="108" r="7.5" fill="#ffffff" />
                              <circle cx="118" cy="108" r="7.5" fill="#ffffff" />
                              <circle cx="84" cy="107" r="2.5" fill="#0f0d0c" />
                              <circle cx="120" cy="107" r="2.5" fill="#0f0d0c" />
                              <rect x="85" y="130" width="30" height="10" rx="5" fill="#242220" stroke="#3d3835" strokeWidth="1.5" />
                              <line x1="95" y1="130" x2="95" y2="140" stroke="#3d3835" strokeWidth="1.5" />
                              <line x1="105" y1="130" x2="105" y2="140" stroke="#3d3835" strokeWidth="1.5" />
                            </g>
                          )}
                        </svg>
                      </div>

                      {/* Session Timer Progress Bar */}
                      <div className="csm-arena-timer-box">
                        <div className={`csm-arena-timer-text ${isBombDanger ? 'danger' : ''}`}>
                          {bombstyleTimeRemaining.toFixed(1)}s
                        </div>
                        <div className="csm-arena-timer-bar">
                          <div
                            className={`csm-arena-timer-fill ${isBombDanger ? 'danger' : ''}`}
                            style={{ width: `${bombTimerPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Question Card (Consistent High Contrast) */}
                      {activeBombstyleCard && (
                        <div className="csm-arena-question-card">
                          <div className="csm-arena-question-kicker">
                            QUESTION #{bombstyleIndex + 1} {activeBombstyleCard.hint ? `• ${activeBombstyleCard.hint}` : ''}
                          </div>
                          <div className="csm-arena-question-prompt">
                            {activeBombstyleCard.prompt}
                          </div>
                        </div>
                      )}

                      {/* Answer Box (Shown when Revealed) */}
                      {bombstyleRevealed && activeBombstyleCard && (
                        <div className="csm-arena-answer-box">
                          <div className="csm-arena-answer-label">CORRECT ANSWER</div>
                          <div className="csm-arena-answer-content">
                            {activeBombstyleCard.correctAnswer}
                          </div>
                          {activeBombstyleCard.explanation && (
                            <div className="csm-arena-answer-explanation">
                              {activeBombstyleCard.explanation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action / Decision Zone */}
                      <div className="csm-arena-controls-zone">
                        {!bombstyleRevealed ? (
                          <button
                            type="button"
                            className="csm-arena-reveal-btn"
                            onClick={handleBombstyleReveal}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            REVEAL ANSWER &nbsp;<span style={{ fontSize: '12px', opacity: 0.85 }}>(Space)</span>
                          </button>
                        ) : (
                          <div className="csm-arena-decision-grid">
                            <button
                              type="button"
                              className="csm-arena-defuse-btn"
                              disabled={bombstyleFeedback !== null}
                              onClick={() => handleBombstyleDecision(true)}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              I KNEW IT [Defuse]
                            </button>
                            <button
                              type="button"
                              className="csm-arena-explode-btn"
                              disabled={bombstyleFeedback !== null}
                              onClick={() => handleBombstyleDecision(false)}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              I DIDN'T KNOW [Boom]
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PHASE 4: RESULTS SCREEN */}
                {bombstylePhase === 'results' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="csm-arena-results-card">
                      <div className={`csm-arena-results-icon ${bombstyleTimeRemaining > 0 ? 'complete' : 'detonated'}`}>
                        {bombstyleTimeRemaining > 0 ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="7"/><path d="M12 7V4"/><path d="M9 4h6"/></svg>
                        )}
                      </div>

                      <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#090d14', margin: '0' }}>
                        {bombstyleTimeRemaining > 0 ? 'BOMBSTYLE COMPLETE' : 'SESSION DETONATED'}
                      </h2>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '8px auto 0', maxWidth: '480px' }}>
                        {bombstyleTimeRemaining > 0
                          ? 'Outstanding recall! You defused the cards and beat the countdown.'
                          : 'The countdown reached zero under pressure. Review your missed cards below to lock in the concepts.'}
                      </p>

                      {/* Stats Grid */}
                      <div className="csm-arena-stats-grid">
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">DEFUSED</span>
                          <span className="csm-arena-stat-val" style={{ color: '#10b981' }}>
                            {bombstyleCorrectCount} / {bombstyleQueue.length}
                          </span>
                        </div>
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">ACCURACY</span>
                          <span className="csm-arena-stat-val" style={{ color: '#090d14' }}>
                            {Math.round((bombstyleCorrectCount / (bombstyleQueue.length || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">BEST STREAK</span>
                          <span className="csm-arena-stat-val" style={{ color: '#f04824' }}>
                            {bombstyleMaxStreak}x
                          </span>
                        </div>
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">EXPLOSIONS</span>
                          <span className="csm-arena-stat-val" style={{ color: '#ef4444' }}>
                            {bombstyleQueue.length - bombstyleCorrectCount}
                          </span>
                        </div>
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">TIME SPENT</span>
                          <span className="csm-arena-stat-val" style={{ color: '#334155' }}>
                            {Math.floor(bombstyleDurationSeconds / 60)}m {bombstyleDurationSeconds % 60}s
                          </span>
                        </div>
                        <div className="csm-arena-stat-cell">
                          <span className="csm-arena-stat-label">MISSED CARDS</span>
                          <span className="csm-arena-stat-val" style={{ color: '#f59e0b' }}>
                            {bombstyleMissedCards.length}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {bombstyleMissedCards.length > 0 && (
                          <button
                            type="button"
                            className="csm-arena-primary-btn"
                            style={{ background: '#f59e0b', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' }}
                            onClick={() => setBombstylePhase('review_missed')}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            REVIEW MISSED CARDS ({bombstyleMissedCards.length})
                          </button>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            className="csm-arena-primary-btn"
                            onClick={() => handleStartBombstyle()}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            PLAY AGAIN
                          </button>
                          <button
                            type="button"
                            className="csm-arena-secondary-btn"
                            onClick={() => setBombstylePhase('select_deck')}
                          >
                            BACK TO ARENA
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PHASE 5: MISSED CARD REVIEW */}
                {bombstylePhase === 'review_missed' && (
                  <div>
                    <div className="csm-page-head">
                      <div>
                        <span className="csm-kicker">POST-SESSION LEARNING</span>
                        <h1>Missed Bombcards ({bombstyleMissedCards.length})</h1>
                        <p>
                          These are the cards you missed during the pressure run for {bombstyleActiveDeck?.code || 'this deck'}. Review them below, then jump to Study to commit them to memory.
                        </p>
                      </div>
                      <div className="csm-page-actions">
                        <button
                          type="button"
                          className="csm-primary-button"
                          onClick={handleStudyMissedDeck}
                        >
                          <IconCards /> STUDY THIS DECK IN LIBRARY
                        </button>
                        <button
                          type="button"
                          className="csm-secondary-button"
                          onClick={() => handleStartBombstyle(bombstyleMissedCards)}
                        >
                          RETRY MISSED IN BOMBSTYLE
                        </button>
                        <button
                          type="button"
                          className="csm-secondary-button"
                          onClick={() => setBombstylePhase('results')}
                        >
                          Back to Results
                        </button>
                      </div>
                    </div>

                    {/* Cards List */}
                    <div className="csm-arena-missed-list">
                      {bombstyleMissedCards.map((card, idx) => (
                        <div key={card.id || idx} className="csm-arena-missed-item">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              CARD #{idx + 1} {card.hint ? `• ${card.hint}` : ''}
                            </span>
                            <span className="csm-arena-missed-tag">
                              {card.resultReason === 'timed_out' ? '⏰ Timed Out' : '❌ Failed Recall'}
                            </span>
                          </div>
                          <div className="csm-arena-missed-prompt">
                            {card.prompt}
                          </div>
                          <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>Correct Answer</span>
                            <div className="csm-arena-missed-answer">
                              {card.correctAnswer}
                            </div>
                            {card.explanation && (
                              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                {card.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
</main>

      {bombstyleExitModalOpen && (
        <div className="csm-modal-backdrop csm-bombstyle-exit-backdrop" role="presentation" onClick={async () => { try { await CSM.api('arena/resume', 'POST', { id: bombstyleSessionId }); } catch (_) {} setBombstyleExitModalOpen(false); }}>
          <div className="csm-bombstyle-exit-modal" role="dialog" aria-modal="true" aria-labelledby="bombstyle-exit-title" aria-describedby="bombstyle-exit-description" onClick={(event) => event.stopPropagation()}>
            <div className="csm-bombstyle-exit-icon" aria-hidden="true"><IconArrowLeft /></div>
            <span className="csm-kicker">LEAVE SESSION?</span>
            <h2 id="bombstyle-exit-title">Exit Bombstyle?</h2>
            <p id="bombstyle-exit-description">Your answers are saved. Exit this session and return to the Arena?</p>
            <div className="csm-bombstyle-exit-actions">
              <button type="button" className="csm-secondary-button" autoFocus onClick={async () => { try { await CSM.api('arena/resume', 'POST', { id: bombstyleSessionId }); } catch (_) {} setBombstyleExitModalOpen(false); }}>Cancel</button>
              <button
                type="button"
                className="csm-danger-button"
                onClick={async () => {
                  try { await CSM.api('arena/abandon', 'POST', { id: bombstyleSessionId }); await refreshWorkspace(); } catch (error) { triggerToast(error.message); }
                  setBombstyleExitModalOpen(false);
                  setBombstyleFeedback(null);
                  setBombstyleRevealed(false);
                  bombstyleAnswerSubmittedRef.current = false;
                  setBombstylePhase('select_deck');
                }}
              >
                Exit session
              </button>
            </div>
          </div>
        </div>
      )}

      {folderInfoModalOpen && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setFolderInfoModalOpen(false)}>
          <form className="csm-deck-form-modal" role="dialog" aria-modal="true" aria-labelledby="deck-form-title" onSubmit={handleSaveFolderInfo} onClick={(e) => e.stopPropagation()}>
            <div className="csm-form-modal-header">
              <div><span className="csm-kicker">{targetFolderForEdit ? 'EDIT DECK' : 'NEW DECK'}</span><h2 id="deck-form-title">{targetFolderForEdit ? 'Edit deck details' : 'Add a deck'}</h2></div>
              <button type="button" className="csm-form-modal-close" onClick={() => setFolderInfoModalOpen(false)} aria-label="Close">×</button>
            </div>
            <p className="csm-form-modal-help">Keep your study materials organized by title and subject.</p>
            <label className="csm-modal-field">Deck title<input autoFocus type="text" value={folderNameInput} onChange={(e) => setFolderNameInput(e.target.value)} placeholder="e.g. ITE 292 B1" required /></label>
            <label className="csm-modal-field">Subject<input type="text" value={folderDescInput} onChange={(e) => setFolderDescInput(e.target.value)} placeholder="e.g. Information Technology" /></label>
            <div className="csm-delete-actions"><button type="button" className="csm-secondary-button" onClick={() => setFolderInfoModalOpen(false)}>Cancel</button><button type="submit" className="csm-primary-button">{targetFolderForEdit ? 'Save changes' : 'Add deck'}</button></div>
          </form>
        </div>
      )}

      {deleteDeckTarget && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setDeleteDeckTarget(null)}>
          <div className="csm-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-deck-title" onClick={(e) => e.stopPropagation()}>
            <div className="csm-delete-icon"><IconTrash /></div>
            <span className="csm-kicker">DELETE DECK</span>
            <h2 id="delete-deck-title">Delete “{deleteDeckTarget.code || deleteDeckTarget.title}”?</h2>
            <p>This will permanently remove the deck and its cards. This action cannot be undone.</p>
            <div className="csm-delete-actions">
              <button type="button" className="csm-secondary-button" onClick={() => setDeleteDeckTarget(null)}>Cancel</button>
              <button type="button" className="csm-danger-button" onClick={confirmDeleteFolder}>Delete deck</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setDeleteConfirmation(null)}>
          <div className="csm-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title" onClick={(e) => e.stopPropagation()}>
            <div className="csm-delete-icon"><IconTrash /></div>
            <span className="csm-kicker">CONFIRM DELETION</span>
            <h2 id="delete-confirmation-title">{deleteConfirmation.title}</h2>
            <p>{deleteConfirmation.message}</p>
            <div className="csm-delete-actions"><button type="button" className="csm-secondary-button" onClick={() => setDeleteConfirmation(null)}>Cancel</button><button type="button" className="csm-danger-button" onClick={confirmDeleteAction}>{deleteConfirmation.confirmLabel}</button></div>
          </div>
        </div>
      )}

      {changeConfirmation && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setChangeConfirmation(null)}>
          <div className="csm-change-modal" role="dialog" aria-modal="true" aria-labelledby="change-confirmation-title" onClick={(e) => e.stopPropagation()}>
            <div className="csm-change-icon" aria-hidden="true">✓</div>
            <span className="csm-kicker">CHANGE CONFIRMED</span>
            <h2 id="change-confirmation-title">{changeConfirmation.title}</h2>
            <p>{changeConfirmation.message}</p>
            <button type="button" className="csm-primary-button" onClick={() => setChangeConfirmation(null)}>Done</button>
          </div>
        </div>
      )}

      {passwordResetModalOpen && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setPasswordResetModalOpen(false)}>
          <form className="csm-password-modal" role="dialog" aria-modal="true" aria-labelledby="password-reset-title" onSubmit={handleChangePassword} onClick={(e) => e.stopPropagation()}>
            <div className="csm-password-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg></div>
            <span className="csm-kicker">PASSWORD RESET</span>
            <h2 id="password-reset-title">Change password</h2>
            <p>Confirm your current password, then choose a new one.</p>
            <input className="csm-password-input" type="password" autoComplete="current-password" aria-label="Current password" required minLength={8} maxLength={72} placeholder="Current password" value={currentPasswordDraft} onChange={event => setCurrentPasswordDraft(event.target.value)} />
            <input className="csm-password-input" type="password" autoComplete="new-password" aria-label="New password (8–72 characters)" required minLength={8} maxLength={72} placeholder="New password (8–72 characters)" value={newPasswordDraft} onChange={event => setNewPasswordDraft(event.target.value)} />
            <input className="csm-password-input" type="password" autoComplete="new-password" aria-label="Confirm new password" required minLength={8} maxLength={72} placeholder="Confirm new password" value={confirmPasswordDraft} onChange={event => setConfirmPasswordDraft(event.target.value)} />
            <div className="csm-password-actions">
              <button type="submit" className="csm-primary-button">Update password</button>
              <button type="button" className="csm-secondary-button" onClick={() => setPasswordResetModalOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
              POPUP: ADD MATERIAL (VAIA Hierarchy + CSM Design Premise)
              ======================================================== */}
      {isAddMaterialPopupOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddMaterialPopupOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-[26px] p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold text-[#f04824] uppercase tracking-wider block">ADD MATERIAL</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {targetDeckForAddMaterial ? (targetDeckForAddMaterial.code || targetDeckForAddMaterial.title) : 'Reviewer Materials'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddMaterialPopupOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer text-xl"
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={addMaterialFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => handleAddMaterialDirectUpload(e.target.files)}
              className="hidden"
            />

            {/* 1. Primary Upload / Drag File Area */}
            <div className="mt-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingAddMaterialFile(true); }}
                onDragLeave={() => setIsDraggingAddMaterialFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingAddMaterialFile(false);
                  handleAddMaterialDirectUpload(e.dataTransfer.files);
                }}
                onClick={() => addMaterialFileInputRef.current?.click()}
                className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center ${isDraggingAddMaterialFile
                  ? 'border-[#f04824] bg-orange-50/60 shadow-inner'
                  : 'border-slate-300/80 bg-[#f8f9fa] hover:bg-[#fff9f8] hover:border-[#f04824]/50'
                  }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#f04824] mb-3">
                  <IconUpload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Drag or upload file here</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supported format — PDF documents & lecture slides
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addMaterialFileInputRef.current?.click();
                  }}
                  className="mt-4 h-9 px-5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold rounded-full inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <IconUpload className="w-3.5 h-3.5 text-[#f04824]" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Divider with 'OR' */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 border-t border-slate-200/90" />
              <span className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">OR</span>
              <div className="flex-1 border-t border-slate-200/90" />
            </div>

            {/* 2 & 3. Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 2: Create Bombcards Manually */}
              <div
                onClick={handleChooseManualCreation}
                className="bg-[#f8f9fa] hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 group-hover:bg-[#f04824] transition-colors shadow-sm">
                  <IconCards className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-[#f04824] transition-colors">
                    Create Bombcards Manually
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Create your own Bombcards
                  </p>
                </div>
              </div>

              {/* Option 3: Generate AI Bombcards (COMING SOON / DISABLED) */}
              <div
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="bg-[#f8f9fa] border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden select-none cursor-not-allowed group"
                title="Coming soon"
              >
                {/* Visually blurred / reduced emphasis content */}
                <div className="opacity-35 blur-[1.5px] flex flex-col pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-600 flex items-center justify-center mb-3">
                    <IconSparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Generate AI Bombcards
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Generate flashcards with AI
                    </p>
                  </div>
                </div>

                {/* Prominent COMING SOON Badge Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                  <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md border border-slate-700/30">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
              DRAWER / MODAL: BOMBCARD & DECK AUTHORING WORKSHOP
              ======================================================== */}
      {isDeckEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-[26px] p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-[#f04824] uppercase tracking-wider block">ADD MATERIAL</span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingDeck ? (editingDeck.code || editingDeck.title) : 'Reviewer Materials'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target Folder: <span className="font-semibold text-slate-700">{editingDeck?.code} - {editingDeck?.title || editingDeck?.subject}</span>
                </p>
              </div>
              <button
                onClick={() => setIsDeckEditorOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Body Form */}
            <div className="flex-1 overflow-y-auto custom-scroll py-4 space-y-5 pr-1">

              {/* Section 1: Import PDFs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <IconPdf />
                    <span className="text-xs font-bold text-slate-800">
                      Import PDFs ({editorDocuments.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="h-7 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <IconPlus className="w-3 h-3 text-[#f04824]" />
                    <span>Browse PDF</span>
                  </button>
                </div>

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handlePdfUpload}
                  className="hidden"
                />

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                  onDragLeave={() => setIsDraggingPdf(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(false);
                    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
                    if (files.length > 0) {
                      const newDocs = files.map(file => ({
                        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        title: file.name, file
                      }));
                      setEditorDocuments(prev => [...prev, ...newDocs]);
                      triggerToast(`Imported ${files.length} PDF file${files.length > 1 ? 's' : ''}`);
                    } else {
                      triggerToast('Please drop PDF files only');
                    }
                  }}
                  onClick={() => pdfInputRef.current?.click()}
                  className={`p-5 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${isDraggingPdf ? 'border-[#f04824] bg-orange-50/50' : 'border-slate-300/80 bg-white/70 hover:bg-white hover:border-[#f04824]/50'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-xs font-bold text-slate-700 mt-1">Click to browse or drag & drop PDF files</p>
                    <p className="text-[11px] text-slate-400">Attach lecture modules, handouts, or notes</p>
                  </div>
                </div>

                {/* Attached PDFs List */}
                {editorDocuments.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto custom-scroll pr-1">
                    {editorDocuments.map(doc => (
                      <div key={doc.id} className="p-2.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <IconPdf />
                          <span className="font-bold text-slate-800 truncate">{doc.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocFromEditor(doc.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors"
                          title="Remove PDF"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-Form: Add New BombCard */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-[#f04824] uppercase tracking-wider block mb-2">
                  + Add Question Pair (BombCard)
                </span>

                {/* Question Type Toggle */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setNewQType('MULTIPLE_CHOICE')}
                    className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === 'MULTIPLE_CHOICE' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewQType('IDENTIFICATION')}
                    className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === 'IDENTIFICATION' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                  >
                    Identification
                  </button>
                </div>

                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={newQPrompt}
                    onChange={(e) => setNewQPrompt(e.target.value)}
                    placeholder="Enter Question / Prompt..."
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                  />

                  <input
                    type="text"
                    value={newQHint}
                    onChange={(e) => setNewQHint(e.target.value)}
                    placeholder="Optional Hint / Module Tag (e.g. 4 Letters, Chapter 1)..."
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                  />

                  {/* Mode A: MCQ 4 Options with Radio Key */}
                  {newQType === 'MULTIPLE_CHOICE' ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-medium text-slate-500 block">Select radio to designate the correct answer:</span>
                      {newQOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctKey"
                            checked={newQCorrectIndex === i}
                            onChange={() => setNewQCorrectIndex(i)}
                            className="w-4 h-4 text-[#f04824] focus:ring-[#f04824] cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-400 w-4">{String.fromCharCode(65 + i)}</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const copy = [...newQOptions];
                              copy[i] = e.target.value;
                              setNewQOptions(copy);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Mode B: Identification Single & Alternates */
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">Target Answer:</label>
                        <input
                          type="text"
                          value={newQAnswer}
                          onChange={(e) => setNewQAnswer(e.target.value)}
                          placeholder="e.g. Star"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">Alternate acceptable answers (comma-separated):</label>
                        <input
                          type="text"
                          value={newQAlternates}
                          onChange={(e) => setNewQAlternates(e.target.value)}
                          placeholder="e.g. star, star topology"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddQuestionToEditor}
                    className="mt-2 h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    + Append Card to Deck
                  </button>
                </div>
              </div>

              {/* Existing BombCards in this Deck */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Questions in this Deck ({editorCards.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                  {editorCards.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No cards added yet.</div>
                  ) : (
                    editorCards.map((c, idx) => (
                      <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <span className="font-bold text-slate-900 block">Q{idx + 1}: {c.prompt}</span>
                          <span className="text-[11px] text-slate-500 ">
                            Ans: {c.correctAnswer} &bull; Type: {c.type === 'MULTIPLE_CHOICE' ? 'MCQ' : 'ID'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveCardFromEditor(c.id)}
                          className="text-rose-500 hover:text-rose-700 font-bold p-1"
                          title="Remove Card"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeckEditorOpen(false)}
                className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeck}
                className="h-10 px-5 bg-[#f04824] hover:bg-[#e03e1b] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Save Materials
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

CSM.api('auth/session').then(async session => {
  if (!session.authenticated) { window.location.replace('login.html?mode=signin'); return; }
  CSM.initial = await CSM.api('workspace');
  ReactDOM.render(<App />, document.getElementById('root'));
}).catch(error => {
  const root = document.getElementById('root');
  root.innerHTML = `<div style="margin:auto;padding:24px;max-width:560px;background:white;border:1px solid #dbe3ee;border-radius:16px;color:#18233a;font:16px system-ui"><h2>Workspace unavailable</h2><p>${String(error.message || 'Could not load your account data.').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p><button onclick="location.href='login.html'">Back to sign in</button></div>`;
});
