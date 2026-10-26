const { useState, useEffect, useRef, useMemo } = React;

const canonicalDeckTitle = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const deckTitleKey = (value) => canonicalDeckTitle(value).toLocaleLowerCase();
const getCompactPageItems = (currentPage, pageCount) => {
  const page = Math.min(Math.max(1, currentPage), pageCount);
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => ({ type: 'page', value: index + 1 }));
  if (page <= 3) return [1, 2, 3, { type: 'ellipsis', key: 'end' }, pageCount].map(value => typeof value === 'number' ? { type: 'page', value } : value);
  if (page >= pageCount - 2) return [1, { type: 'ellipsis', key: 'start' }, pageCount - 2, pageCount - 1, pageCount].map(value => typeof value === 'number' ? { type: 'page', value } : value);
  return [1, { type: 'ellipsis', key: 'start' }, page - 1, page, page + 1, { type: 'ellipsis', key: 'end' }, pageCount].map(value => typeof value === 'number' ? { type: 'page', value } : value);
};

const createAiReviewerPdf = (reviewer, deckTitle) => {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const gutter = 24;
  const columnWidth = (pageWidth - margin * 2 - gutter) / 2;
  const leftX = margin;
  const rightX = margin + columnWidth + gutter;
  const dividerX = margin + columnWidth + gutter / 2;
  const topLimit = 96;
  const bottomLimit = 795;
  const cp1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
  const normalizeText = value => String(value ?? '').replace(/[\u2192]/g, '->').replace(/[\u2190]/g, '<-').replace(/[\u00d7]/g, 'x').replace(/[\u2264]/g, '<=').replace(/[\u2265]/g, '>=').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]/g, ' ');
  const pdfHex = value => `<${Array.from(normalizeText(value), character => {
    const code = cp1252[character] ?? character.charCodeAt(0);
    return code.toString(16).padStart(2, '0').toUpperCase();
  }).join('')}>`;
  const estimateWidth = (value, size, bold = false) => Array.from(normalizeText(value)).reduce((sum, character) => {
    const factor = ' il.,:;!\'|'.includes(character) ? .25 : 'MW@%&'.includes(character) ? .82 : 'frt()[]'.includes(character) ? .36 : character === ' ' ? .28 : .52;
    return sum + factor * size * (bold ? 1.035 : 1);
  }, 0);
  const wrapText = (value, size, width, bold = false) => {
    const words = normalizeText(value).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach(word => {
      if (estimateWidth(word, size, bold) > width) {
        if (line) { lines.push(line); line = ''; }
        let piece = '';
        Array.from(word).forEach(character => {
          if (piece && estimateWidth(piece + character, size, bold) > width) { lines.push(piece); piece = character; }
          else piece += character;
        });
        line = piece;
        return;
      }
      const nextLine = line ? `${line} ${word}` : word;
      if (line && estimateWidth(nextLine, size, bold) > width) { lines.push(line); line = word; }
      else line = nextLine;
    });
    if (line) lines.push(line);
    return lines;
  };
  const pages = [];
  let commands;
  let column = 0;
  let cursorY = topLimit;
  const drawText = (text, x, yFromTop, size, bold = false, color = '0.12 0.17 0.25') => {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${(pageHeight - yFromTop).toFixed(2)} Tm ${pdfHex(text)} Tj ET`);
  };
  const drawRule = (x1, y1, x2, y2, color = '0.86 0.89 0.93', width = .6) => {
    commands.push(`q ${color} RG ${width} w ${x1.toFixed(2)} ${(pageHeight - y1).toFixed(2)} m ${x2.toFixed(2)} ${(pageHeight - y2).toFixed(2)} l S Q`);
  };
  const startPage = () => {
    commands = [];
    pages.push(commands);
    drawText(reviewer.title || 'Study Reviewer', margin, 37, 17, true, '0.08 0.13 0.22');
    const titleLines = wrapText(deckTitle || 'Generated reviewer', margin, pageWidth - margin * 2 - 115, false);
    titleLines.slice(0, 2).forEach((line, index) => drawText(line, margin, 54 + index * 12, 9, false, '0.34 0.41 0.51'));
    drawText('AI-GENERATED', pageWidth - margin - 93, 38, 8, true, '0.42 0.31 0.62');
    drawText(new Date().toLocaleDateString(), pageWidth - margin - 93, 53, 8, false, '0.42 0.49 0.59');
    drawRule(margin, 72, pageWidth - margin, 72, '0.82 0.86 0.91', .8);
    drawRule(dividerX, 87, dividerX, 807, '0.86 0.89 0.93', .6);
    column = 0;
    cursorY = topLimit;
  };
  const advanceColumn = () => {
    if (column === 0) { column = 1; cursorY = topLimit; }
    else startPage();
  };
  const sectionsToRender = Array.isArray(reviewer.sections) ? reviewer.sections : [];
  startPage();
  sectionsToRender.forEach(section => {
    const textWidth = columnWidth - 2;
    const blocks = [{ text: section.heading, size: 10.2, bold: true, color: '0.42 0.31 0.62', gap: 0, leading: 14, kind: 'heading' }];
    (Array.isArray(section.blocks) ? section.blocks : []).forEach(block => {
      if (block.type === 'definition') {
        blocks.push({ text: block.term, size: 9.2, bold: true, color: '0.10 0.13 0.19', gap: 5, leading: 12 });
        blocks.push({ text: block.explanation, size: 9, bold: false, color: '0.12 0.15 0.20', gap: 1, leading: 12 });
      } else if (block.text) {
        const isBullet = block.type === 'bullet';
        const isTakeaway = block.type === 'key_takeaway';
        blocks.push({ text: `${isBullet ? '-  ' : ''}${block.text}`, size: 9, bold: isTakeaway, color: isTakeaway ? '0.10 0.13 0.19' : '0.12 0.15 0.20', gap: 4, leading: 12 });
      }
    });
    const prepared = blocks.map(block => ({ ...block, lines: wrapText(block.text, block.size, textWidth, block.bold) }));
    const blockHeight = prepared.reduce((height, block) => height + block.gap + block.lines.length * block.leading, 0) + 10;
    if (blockHeight <= bottomLimit - topLimit && cursorY + blockHeight > bottomLimit) advanceColumn();
    prepared.forEach(block => {
      cursorY += block.gap;
      block.lines.forEach(line => {
        if (cursorY + block.leading > bottomLimit) advanceColumn();
        const lineX = (column === 0 ? leftX : rightX) + (block.kind === 'heading' ? 0 : 4);
        drawText(line, lineX, cursorY + block.leading - 2, block.size, block.bold, block.color);
        cursorY += block.leading;
      });
    });
    cursorY += 7;
    drawRule(column === 0 ? leftX : rightX, cursorY, (column === 0 ? leftX : rightX) + columnWidth, cursorY, '0.91 0.93 0.96', .45);
    cursorY += 11;
  });
  pages.forEach((pageCommands, index) => {
    pageCommands.push(`BT /F1 8 Tf 0.48 0.54 0.62 rg 1 0 0 1 ${(pageWidth - margin - 42).toFixed(2)} 20 Tm ${pdfHex(`Page ${index + 1} of ${pages.length}`)} Tj ET`);
  });
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((pageCommands, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    const stream = `${pageCommands.join('\n')}\n`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });
  let pdf = '%PDF-1.4\n%CSM-PDF\n';
  const offsets = [0];
  for (let objectNumber = 1; objectNumber < objects.length; objectNumber++) {
    offsets[objectNumber] = pdf.length;
    pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let objectNumber = 1; objectNumber < objects.length; objectNumber++) pdf += `${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const safeTitle = String(deckTitle || 'generated-reviewer').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'generated-reviewer';
  return { blob, filename: `AI-generated-${safeTitle}-reviewer.pdf` };
};

const downloadAiReviewerPdf = (artifact) => {
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatAdminEventLabel = (value) => String(value ?? '').split('_').filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
const adminAvatarBackgrounds = {
  ember: 'linear-gradient(145deg, #f47c59, #ed4e2d)',
  ocean: 'linear-gradient(145deg, #5c8fe8, #243f86)',
  mint: 'linear-gradient(145deg, #61c7a0, #247d68)',
  violet: 'linear-gradient(145deg, #a580e8, #5b3c9a)',
  sunset: 'linear-gradient(145deg, #f3bd56, #c85b30)',
  slate: 'linear-gradient(145deg, #718096, #263246)'
};
const getAccountInitials = (account) => String(account.display_name || account.username || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
const commonPasswordSet = new Set(['12345678', '123456789', '1234567890', 'password', 'password1', 'password123', 'qwerty123', 'qwerty12345', '11111111', '00000000', '87654321', 'admin123', 'abc12345', 'iloveyou', 'letmein', 'welcome1', 'monkey123', 'dragon123', 'football1', 'baseball1']);
const isCommonPassword = (value) => commonPasswordSet.has(String(value ?? '').trim().toLowerCase());
const measurePasswordStrength = (value) => {
  const password = String(value ?? '');
  if (!password) return { strength: '', label: '', advice: '' };
  const common = isCommonPassword(password);
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (common) score = 0;
  const strength = common || password.length < 8 || score <= 2 ? 'weak' : score <= 4 ? 'fair' : score <= 6 ? 'good' : 'strong';
  const advice = common ? 'This password is commonly used. Choose a less predictable one.'
    : strength === 'weak' ? 'Try 12 or more characters and mix letters, numbers, or symbols.'
    : strength === 'fair' ? 'Add more length or another character type to strengthen it.'
    : strength === 'good' ? 'Good. A longer, less predictable passphrase can make it stronger.'
    : 'Strong password. Keep it unique to this account.';
  return { strength, label: strength[0].toUpperCase() + strength.slice(1), advice };
};
function PasswordStrengthIndicator({ password }) {
  const result = measurePasswordStrength(password);
  return (
    <div className={`csm-password-strength is-${result.strength}`} aria-live="polite">
      <div className="csm-password-strength-top"><span>Password strength</span><strong>{result.label}</strong></div>
      <div className="csm-password-strength-meter" aria-hidden="true"><span /><span /><span /><span /></div>
      <p>{result.advice}</p>
    </div>
  );
}
const readSidebarLockPreference = () => {
  try { return window.localStorage.getItem('csm-sidebar-locked') === '1'; }
  catch (error) { return false; }
};

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
  whistle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 0.62;
      const fundamental = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const fundamentalGain = this.ctx.createGain();
      const overtoneGain = this.ctx.createGain();
      fundamental.type = 'sine';
      overtone.type = 'sine';
      fundamental.frequency.setValueAtTime(1780, now);
      fundamental.frequency.exponentialRampToValueAtTime(1420, now + duration);
      overtone.frequency.setValueAtTime(3560, now);
      overtone.frequency.exponentialRampToValueAtTime(2840, now + duration);
      fundamentalGain.gain.setValueAtTime(0.0001, now);
      fundamentalGain.gain.linearRampToValueAtTime(0.042, now + 0.035);
      fundamentalGain.gain.setValueAtTime(0.042, now + 0.3);
      fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      overtoneGain.gain.setValueAtTime(0.0001, now);
      overtoneGain.gain.linearRampToValueAtTime(0.008, now + 0.04);
      overtoneGain.gain.setValueAtTime(0.008, now + 0.28);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      fundamental.connect(fundamentalGain);
      overtone.connect(overtoneGain);
      fundamentalGain.connect(this.ctx.destination);
      overtoneGain.connect(this.ctx.destination);
      fundamental.start(now);
      overtone.start(now);
      fundamental.stop(now + duration);
      overtone.stop(now + duration);

      const bufferLength = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferLength, this.ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) samples[i] = Math.random() * 2 - 1;
      const breath = this.ctx.createBufferSource();
      const breathFilter = this.ctx.createBiquadFilter();
      const breathGain = this.ctx.createGain();
      breath.buffer = buffer;
      breathFilter.type = 'bandpass';
      breathFilter.frequency.setValueAtTime(3400, now);
      breathFilter.Q.setValueAtTime(1.1, now);
      breathGain.gain.setValueAtTime(0.0001, now);
      breathGain.gain.linearRampToValueAtTime(0.002, now + 0.04);
      breathGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      breath.connect(breathFilter);
      breathFilter.connect(breathGain);
      breathGain.connect(this.ctx.destination);
      breath.start(now);
      breath.stop(now + duration);
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
  arenaCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.065 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.065);
        osc.stop(now + idx * 0.065 + 0.25);
      });
    } catch (e) { }
  }
  arenaWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [293.66, 220].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.05, now + idx * 0.12 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.19);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.2);
      });
    } catch (e) { }
  }
  detonation() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.36);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.36);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.065, now + 0.025);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start();
      noise.stop(now + 0.36);

      const pop = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      pop.type = 'sine';
      pop.frequency.setValueAtTime(360, now);
      pop.frequency.exponentialRampToValueAtTime(170, now + 0.22);
      popGain.gain.setValueAtTime(0.0001, now);
      popGain.gain.exponentialRampToValueAtTime(0.085, now + 0.018);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      pop.connect(popGain);
      popGain.connect(this.ctx.destination);
      pop.start(now);
      pop.stop(now + 0.26);
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


const IconUser = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const IconSearch = ({ className = "w-4 h-4 text-zinc-400" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

const IconDownload = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconRestore = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

const IconArrowLeft = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const IconClose = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconLock = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

const IconPdf = ({ className = "w-6 h-7 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 28" fill="none">
    <path d="M3 1C1.89543 1 1 1.89543 1 3V25C1 26.1046 1.89543 27 3 27H21C22.1046 27 23 26.1046 23 25V8.5L15.5 1H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M15 1V8.5H23" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <text x="4" y="20" fontFamily="Helvetica, Arial, sans-serif" fontSize="7.5" fontWeight="900" fill="currentColor" letterSpacing="-0.4">PDF</text>
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


const IconNotebook = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6.5" y="2.5" width="15" height="19" rx="2.5" />
    <path d="M10.5 8h7M10.5 12h7M10.5 16h5" />
    <path d="M3 6h5M3 10h5M3 14h5M3 18h5" />
  </svg>
);

const IconFileText = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);



const IconBulb = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const IconHighlighter = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 11-6 6v3h3l6-6" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

const IconPlay = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconTrophy = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
    <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
  </svg>
);




// ========================================================
// 3. PDF LEARNING WORKSPACE COMPONENTS
// ========================================================



function PdfStudyViewer({ document, pageNumber, onPageCount, highlights, onSelection, zoom = 1.0, onQuickAction }) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [stageWidth, setStageWidth] = useState(760);
  const [selectedText, setSelectedText] = useState('');
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    let current = true;
    let task = null;
    setPdf(null); setLoadError(''); setPageSize({ width: 0, height: 0 }); setSelectedText('');
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

  // Stage resize observer
  useEffect(() => {
    const node = stageRef.current;
    if (!node || !window.ResizeObserver) return;
    const observer = new ResizeObserver(entries => setStageWidth(Math.max(320, entries[0].contentRect.width - 44)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [document?.url]);

  // Background full document text extraction for search & AI context
  useEffect(() => {
    if (!pdf || !document?.id) return;
    let current = true;
    (async () => {
      try {
        const check = await CSM.api('documents/extract&documentId=' + encodeURIComponent(document.id));
        if (check?.extracted && check.pages?.length > 0) return;
        const extractedPages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (!current) break;
          const p = await pdf.getPage(i);
          const tc = await p.getTextContent();
          const txt = tc.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
          if (txt) {
            extractedPages.push({ page: i, text: txt });
          }
        }
        if (current && extractedPages.length > 0) {
          await CSM.api('documents/extract', 'POST', {
            documentId: document.id,
            pageCount: pdf.numPages,
            pages: extractedPages,
          });
        }
      } catch (err) {
        console.warn('PDF background text extraction:', err);
      }
    })();
    return () => { current = false; };
  }, [pdf, document?.id]);

  // Render current page with zoom scale & high-DPI support
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
        const scale = Math.min(3.0, Math.max(0.4, (stageWidth / baseViewport.width) * (zoom || 1.0)));
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
  }, [pdf, pageNumber, stageWidth, highlights, zoom]);

  const captureSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!text || !range || !textLayerRef.current?.contains(range.commonAncestorContainer)) {
      setSelectedText('');
      return;
    }
    const paper = paperRef.current?.getBoundingClientRect();
    if (!paper?.width || !paper?.height) return;
    const rectangles = Array.from(range.getClientRects()).map(rect => ({
      x: Math.max(0, (rect.left - paper.left) / paper.width),
      y: Math.max(0, (rect.top - paper.top) / paper.height),
      width: Math.min(rect.width / paper.width, 1),
      height: Math.min(rect.height / paper.height, 1)
    })).filter(rect => rect.width > 0 && rect.height > 0);
    if (rectangles.length) {
      setSelectedText(text);
      onSelection({ text, page: pageNumber, selection: rectangles });
    }
  };

  return (
    <div className="relative w-full">
      <div className="csm-pdf-stage" ref={stageRef} onMouseUp={captureSelection} onKeyUp={captureSelection}>
        {!document && <div className="csm-pdf-empty"><span className="csm-pdf-empty-icon">PDF</span><strong>Choose a reviewer PDF to begin</strong><p>Open a saved document from your Library. Highlight text with the Magic Marker to create flashcards, save notes, or mark key concepts.</p></div>}
        {document && loading && <div className="csm-pdf-loading"><span className="csm-spinner" />Loading page…</div>}
        {document && loadError && <div className="csm-pdf-load-error"><strong>We couldn’t display this PDF</strong><p>{loadError}</p><a href={document.url} target="_blank" rel="noreferrer">Open the PDF in a new tab</a></div>}
        {document && !loadError && <div className="csm-pdf-paper-wrap" style={{ minHeight: Math.max(420, pageSize.height + 36) }}>
          <div className="csm-pdf-paper relative" ref={paperRef} style={{ width: pageSize.width || 'auto', height: pageSize.height || 'auto' }}>
            <canvas ref={canvasRef} aria-hidden="true" />
            <div className="csm-pdf-saved-marks" aria-hidden="true">
              {highlights.filter(item => Number(item.page) === Number(pageNumber)).flatMap(item => (item.selection || []).map((rect, index) => (
                <i key={`${item.id}-${index}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, backgroundColor: item.color }} />
              )))}
            </div>
            <div className="textLayer csm-pdf-text-layer" ref={textLayerRef} aria-label={`Selectable PDF page ${pageNumber}`} />
          </div>
        </div>}
      </div>

      {/* Vaia Magic Marker Floating Bar */}
      {selectedText && onQuickAction && (
        <div
          style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl border border-slate-700/80 text-xs font-semibold whitespace-nowrap"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300 uppercase tracking-wider pl-1 pr-2.5 border-r border-slate-700/90 shrink-0">
            <IconHighlighter className="w-3.5 h-3.5 text-amber-400" />
            <span>Magic Marker</span>
          </div>

          <button
            type="button"
            onClick={() => onQuickAction('card', selectedText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-all text-xs font-bold cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Create study flashcard from this selection"
          >
            <IconCards className="w-3.5 h-3.5 text-white" />
            <span>Create Flashcard</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickAction('note', selectedText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all text-xs font-semibold cursor-pointer border border-slate-700 active:scale-95 shrink-0"
            title="Save selected text to document notes"
          >
            <IconFileText className="w-3.5 h-3.5 text-slate-300" />
            <span>Add to Notes</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/90 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-0.5">Highlight:</span>
            {[
              { color: '#f5a23a', label: 'Orange' },
              { color: '#8dc7ef', label: 'Blue' },
              { color: '#a8d8a8', label: 'Green' },
              { color: '#f472b6', label: 'Pink' }
            ].map(({ color, label }) => (
              <button
                key={color}
                type="button"
                onClick={() => onQuickAction('highlight', selectedText, color)}
                className="w-4 h-4 rounded-full border border-white/50 cursor-pointer hover:scale-125 transition-transform shadow-xs"
                style={{ backgroundColor: color }}
                title={`Highlight in ${label}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedText('');
              if (window.getSelection) window.getSelection().removeAllRanges();
            }}
            className="ml-1 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
            title="Dismiss selection"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function LearningWorkspaceSidebar({
  activeTab,
  setActiveTab,
  activeDocument,
  pdfPage,
  setPdfPage,
  pdfSelection,
  setPdfSelection,
  // AI assist
  aiThinking,
  aiAssistantResponse,
  setAiAssistantResponse,
  aiExplainLevel,
  setAiExplainLevel,
  onAiExplain,
  onAiSummarize,
  onAiQuestions,
  onAiNotes,
  onAiFlashcards,
  onAiAsk,
  // Notes
  documentNotes,
  documentNotesLoading,
  noteComposerOpen,
  setNoteComposerOpen,
  noteFormTitle,
  setNoteFormTitle,
  noteFormContent,
  setNoteFormContent,
  noteFormPage,
  setNoteFormPage,
  noteEditingId,
  setNoteEditingId,
  onSaveNote,
  onDeleteNote,
  // Flashcards
  studyDecks,
  activeStudyDeckId,
  setActiveStudyDeckId,
  onCreateStudyDeck,
  studyCards,
  studyCardsLoading,
  cardComposerOpen,
  setCardComposerOpen,
  cardFormQuestion,
  setCardFormQuestion,
  cardFormAnswer,
  setCardFormAnswer,
  cardFormExplanation,
  setCardFormExplanation,
  cardFormTags,
  setCardFormTags,
  cardFormSourcePage,
  setCardFormSourcePage,
  onSaveStudyCard,
  onDeleteStudyCard,
  onStartFlashcardReview,
  // Highlights
  highlights,
  highlightColor,
  setHighlightColor,
  savePdfSelection,
  createPdfBombcard,
  handleRemoveHighlight,
  handleClearHighlights,
  pdfSaving,
  pdfCardComposerOpen,
  setPdfCardComposerOpen,
  pdfSelectionRole,
  setPdfSelectionRole,
  pdfCounterpart,
  setPdfCounterpart,
  onOpenAiGenerator,
  triggerToast,
}) {
  const [notesFilter, setNotesFilter] = useState('');
  const [notesPageOnly, setNotesPageOnly] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckOpen, setNewDeckOpen] = useState(false);

  const activeDeck = (studyDecks || []).find(d => d.id === activeStudyDeckId) || studyDecks?.[0];

  // Filtered notes
  const filteredNotes = (documentNotes || []).filter(n => {
    if (notesPageOnly && Number(n.page_number) !== Number(pdfPage)) return false;
    if (notesFilter.trim()) {
      const q = notesFilter.toLowerCase();
      return (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Flashcards mastery breakdown
  const masteryStats = useMemo(() => {
    const total = (studyCards || []).length;
    let mastered = 0, known = 0, learning = 0, newCards = 0;
    (studyCards || []).forEach(c => {
      const st = c.review?.review_status || 'new';
      if (st === 'mastered') mastered++;
      else if (st === 'known') known++;
      else if (st === 'learning') learning++;
      else newCards++;
    });
    return { total, mastered, known, learning, newCards };
  }, [studyCards]);

  return (
    <aside className="csm-highlights-card csm-pdf-notes-panel flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* 3 Vaia-Style Study Rail Tabs Header */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'flashcards'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <IconCards className="w-4 h-4" />
          <span>Cards</span>
          {studyCards?.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'flashcards' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {studyCards.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'notes'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <IconFileText className="w-4 h-4" />
          <span>Notes</span>
          {documentNotes?.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'notes' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {documentNotes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'highlights'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <IconHighlighter className="w-4 h-4" />
          <span>Marks</span>
          {highlights?.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'highlights' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {highlights.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 2: Document Notes */}
      {activeTab === 'notes' && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          {/* Header & Note Creator Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Document Notes</h3>
              <p className="text-[10px] text-slate-500">Persisted study notes linked to this PDF</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNoteFormTitle(`Note on Page ${pdfPage}`);
                setNoteFormContent(pdfSelection ? `“${pdfSelection.text}”\n\n` : '');
                setNoteFormPage(pdfPage);
                setNoteEditingId(null);
                setNoteComposerOpen(true);
              }}
              className="py-1 px-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>+ Add Note</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={notesFilter}
              onChange={e => setNotesFilter(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setNotesPageOnly(!notesPageOnly)}
              className={`px-2 py-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${notesPageOnly ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
            >
              Page {pdfPage} only
            </button>
          </div>

          {/* Note Composer Modal / Inline Box */}
          {noteComposerOpen && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3 space-y-2.5 animate-fadeIn">
              <span className="text-[11px] font-extrabold text-purple-900 block">
                {noteEditingId ? 'Edit Document Note' : 'Create New Document Note'}
              </span>
              <input
                type="text"
                value={noteFormTitle}
                onChange={e => setNoteFormTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-bold"
              />
              <textarea
                rows="4"
                value={noteFormContent}
                onChange={e => setNoteFormContent(e.target.value)}
                placeholder="Write your notes, insights, or takeaways here..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <span>Linked to Page:</span>
                  <input
                    type="number"
                    min="1"
                    value={noteFormPage || 1}
                    onChange={e => setNoteFormPage(Number(e.target.value))}
                    className="w-12 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNoteComposerOpen(false)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!noteFormContent.trim()) return triggerToast('Note content cannot be empty.');
                      onSaveNote({
                        id: noteEditingId,
                        title: noteFormTitle.trim() || 'Untitled Note',
                        content: noteFormContent.trim(),
                        page: noteFormPage || pdfPage,
                      });
                      setNoteComposerOpen(false);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List */}
          {documentNotesLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading notes…</div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
              No notes found. Highlight text in the PDF with the Magic Marker to add notes, or click <strong>+ Add Note</strong> above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotes.map(note => (
                <article key={note.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5 group hover:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-xs truncate flex-1">{note.title}</span>
                    <div className="flex items-center gap-1">
                      {note.page_number && (
                        <button
                          type="button"
                          onClick={() => setPdfPage(Number(note.page_number))}
                          className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer"
                          title="Jump to this page in the PDF"
                        >
                          Page {note.page_number} ↗
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNoteEditingId(note.id);
                          setNoteFormTitle(note.title);
                          setNoteFormContent(note.content);
                          setNoteFormPage(note.page_number);
                          setNoteComposerOpen(true);
                        }}
                        className="text-slate-400 hover:text-purple-600 text-xs p-1 cursor-pointer"
                        title="Edit note"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="text-slate-400 hover:text-red-600 text-xs p-1 cursor-pointer"
                        title="Delete note"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Study Flashcards & Decks */}
      {activeTab === 'flashcards' && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          {/* Deck selector & Practice CTA */}
          <div className="space-y-2 bg-slate-50/80 border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Study Deck</span>
              <button
                type="button"
                onClick={() => setNewDeckOpen(!newDeckOpen)}
                className="text-[11px] text-purple-600 font-bold hover:underline cursor-pointer"
              >
                + New Deck
              </button>
            </div>

            {/* Deck dropdown */}
            {(studyDecks || []).length > 0 && (
              <select
                value={activeStudyDeckId || ''}
                onChange={e => setActiveStudyDeckId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-purple-500"
              >
                {(studyDecks || []).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.card_count || 0} cards)
                  </option>
                ))}
              </select>
            )}

            {/* New Deck Inline Form */}
            {newDeckOpen && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={e => setNewDeckTitle(e.target.value)}
                  placeholder="New deck name..."
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-xl bg-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newDeckTitle.trim()) return;
                    if (await onCreateStudyDeck(newDeckTitle)) {
                      setNewDeckTitle('');
                      setNewDeckOpen(false);
                    }
                  }}
                  className="px-2.5 py-1 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Create
                </button>
              </div>
            )}

            {/* Mastery breakdown bar */}
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>{masteryStats.total} Total Cards</span>
                <span className="text-emerald-700 font-extrabold">{masteryStats.mastered} Mastered</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div style={{ width: `${masteryStats.total ? (masteryStats.mastered / masteryStats.total) * 100 : 0}%` }} className="bg-emerald-500 h-full" title="Mastered" />
                <div style={{ width: `${masteryStats.total ? (masteryStats.known / masteryStats.total) * 100 : 0}%` }} className="bg-blue-500 h-full" title="Known" />
                <div style={{ width: `${masteryStats.total ? (masteryStats.learning / masteryStats.total) * 100 : 0}%` }} className="bg-amber-500 h-full" title="Learning" />
              </div>
            </div>

            {/* Big Launch Review Button */}
            <button
              type="button"
              onClick={() => onStartFlashcardReview(activeDeck)}
              disabled={!studyCards?.length}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <IconPlay className="w-3.5 h-3.5 fill-current" />
              <span>Practice Flashcards ({studyCards?.length || 0})</span>
            </button>
          </div>

          {/* Add Manual Card Toggle & AI Generator */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900">Deck Flashcards</span>
            <div className="flex items-center gap-1.5">
              {onOpenAiGenerator && (
                <button
                  type="button"
                  onClick={onOpenAiGenerator}
                  className="py-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 border border-purple-200"
                  title="Generate flashcards from document with AI"
                >
                  <IconSparkles className="w-3 h-3 text-purple-600" />
                  <span>Generate AI Cards</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCardFormQuestion(pdfSelection ? pdfSelection.text : '');
                  setCardFormAnswer('');
                  setCardFormExplanation('');
                  setCardFormTags('');
                  setCardFormSourcePage(pdfPage);
                  setCardComposerOpen(true);
                }}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                + Add Card
              </button>
            </div>
          </div>

          {/* Card Composer Box */}
          {cardComposerOpen && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 space-y-2 animate-fadeIn">
              <span className="text-[11px] font-extrabold text-purple-900 block">Create Flashcard</span>
              <input
                type="text"
                value={cardFormQuestion}
                onChange={e => setCardFormQuestion(e.target.value)}
                placeholder="Question / Front of card..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold"
              />
              <textarea
                rows="2"
                value={cardFormAnswer}
                onChange={e => setCardFormAnswer(e.target.value)}
                placeholder="Answer / Back of card..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                value={cardFormExplanation}
                onChange={e => setCardFormExplanation(e.target.value)}
                placeholder="Memory cue or explanation (optional)..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
              />
              <input
                type="text"
                value={cardFormTags}
                onChange={e => setCardFormTags(e.target.value)}
                placeholder="Tags (comma separated, e.g. Concept, Exam)..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-bold">Source: Page {cardFormSourcePage || pdfPage}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCardComposerOpen(false)}
                    className="px-2 py-1 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cardFormQuestion.trim() || !cardFormAnswer.trim()) return triggerToast('Please enter both question and answer.');
                      onSaveStudyCard({
                        deckId: activeStudyDeckId,
                        question: cardFormQuestion.trim(),
                        answer: cardFormAnswer.trim(),
                        explanation: cardFormExplanation.trim(),
                        tags: cardFormTags.split(',').map(t => t.trim()).filter(Boolean),
                        sourceDocumentId: activeDocument?.id,
                        sourcePage: cardFormSourcePage || pdfPage,
                      });
                      setCardComposerOpen(false);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save Card
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards List */}
          {studyCardsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading cards…</div>
          ) : (studyCards || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
              No flashcards in this deck yet. Highlight text in the PDF with the Magic Marker to create flashcards, or click <strong>+ Add Card</strong> above.
            </div>
          ) : (
            <div className="space-y-2">
              {studyCards.map(c => {
                const status = c.review?.review_status || 'new';
                const statusColor = status === 'mastered' ? 'bg-emerald-100 text-emerald-800' :
                  status === 'known' ? 'bg-blue-100 text-blue-800' :
                    status === 'learning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';

                return (
                  <article key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5 group">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs flex-1">{c.question}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                          {status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteStudyCard(c.id)}
                          className="text-slate-400 hover:text-red-600 text-xs p-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-purple-700 bg-purple-50/50 p-2 rounded-lg border border-purple-100/60">
                      {c.answer}
                    </div>
                    {c.explanation && <p className="text-[11px] text-slate-500 italic">{c.explanation}</p>}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).map((tag, tIdx) => (
                          <span key={tIdx} className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {c.source_page && (
                        <button
                          type="button"
                          onClick={() => setPdfPage(Number(c.source_page))}
                          className="text-purple-600 hover:underline font-bold cursor-pointer"
                        >
                          Page {c.source_page} ↗
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Color Highlights & Bombcard Maker (Preserved & Integrated) */}
      {activeTab === 'highlights' && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          <div className="csm-pdf-notes-heading flex items-center justify-between">
            <div>
              <span className="csm-kicker">MAGIC MARKERS</span>
              <h2 className="text-sm font-bold">{highlights.length} saved {highlights.length === 1 ? 'highlight' : 'highlights'}</h2>
            </div>
            <button
              type="button"
              className="csm-row-menu"
              onClick={handleClearHighlights}
              disabled={!activeDocument || !highlights.length}
            >
              Clear
            </button>
          </div>

          {pdfSelection ? (
            <section className="csm-pdf-selection-card">
              <div className="csm-pdf-selection-label">
                <span className="csm-selection-dot" style={{ background: highlightColor }} />
                SELECTED TEXT · PAGE {pdfSelection.page}
              </div>
              <blockquote>“{pdfSelection.text}”</blockquote>
              <div className="csm-pdf-selection-actions">
                <button type="button" className="csm-secondary-button" onClick={savePdfSelection} disabled={pdfSaving}>
                  Save highlight
                </button>
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => { setPdfCardComposerOpen(value => !value); setPdfCounterpart(''); }}
                  disabled={pdfSaving}
                >
                  {pdfCardComposerOpen ? 'Close card form' : 'Make a Bombcard'}
                </button>
              </div>
              {pdfCardComposerOpen && (
                <div className="csm-pdf-card-composer">
                  <strong>Use this excerpt as the…</strong>
                  <div className="csm-pdf-role-switch" role="group">
                    <button type="button" className={pdfSelectionRole === 'question' ? 'active' : ''} onClick={() => { setPdfSelectionRole('question'); setPdfCounterpart(''); }}>
                      Question
                    </button>
                    <button type="button" className={pdfSelectionRole === 'answer' ? 'active' : ''} onClick={() => { setPdfSelectionRole('answer'); setPdfCounterpart(''); }}>
                      Answer
                    </button>
                  </div>
                  <label htmlFor="pdf-card-counterpart">
                    {pdfSelectionRole === 'question' ? 'Write the answer' : 'Write the question'}
                  </label>
                  <textarea
                    id="pdf-card-counterpart"
                    rows="3"
                    maxLength="10000"
                    value={pdfCounterpart}
                    onChange={event => setPdfCounterpart(event.target.value)}
                    placeholder={pdfSelectionRole === 'question' ? 'Enter the correct answer…' : 'Enter a question for this answer…'}
                  />
                  <small>Creates an Identification Bombcard in your reviewer deck.</small>
                  <button
                    type="button"
                    className="csm-primary-button csm-pdf-create-card"
                    onClick={createPdfBombcard}
                    disabled={pdfSaving || !pdfCounterpart.trim()}
                  >
                    {pdfSaving ? 'Saving…' : 'Create Bombcard'}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="csm-pdf-selection-empty">
              <span><IconBulb className="w-3.5 h-3.5" /></span>
              <strong>Select text in the PDF</strong>
              <p>Your selection will appear here. Save it as a color highlight or use it to create a question-and-answer Bombcard.</p>
            </div>
          )}

          <div className="csm-pdf-saved-list space-y-2">
            {highlights.map(item => (
              <article key={item.id} className="csm-pdf-saved-item">
                <div className="csm-pdf-saved-item-top flex items-center justify-between">
                  <span className="csm-pdf-note-tag" style={{ '--swatch': item.color }}>
                    {item.purpose === 'question' ? 'Question card' : item.purpose === 'answer' ? 'Answer card' : 'Study note'}
                  </span>
                  <button type="button" className="csm-row-menu" onClick={() => handleRemoveHighlight(item.id)} title="Remove mark">
                    <IconClose className="w-3 h-3" />
                  </button>
                </div>
                <p>{item.text}</p>
                <button type="button" className="csm-pdf-page-jump text-purple-600 font-bold" onClick={() => setPdfPage(Number(item.page) || 1)}>
                  Go to page {item.page}{item.cardId ? ' · linked Bombcard' : ''}
                </button>
              </article>
            ))}
          </div>
          {!!highlights.length && (
            <button type="button" className="csm-add-highlight w-full mt-2" onClick={handleClearHighlights}>
              Clear all saved highlights
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function FlashcardReviewModal({ deck, cards, onClose, onFinish, onJumpToPage, triggerToast }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [completed, setCompleted] = useState(false);

  const total = cards?.length || 0;
  const card = cards?.[index];

  const handleRate = async (rating) => {
    if (!card) return;
    try {
      await CSM.api('study-cards/review', 'POST', { cardId: card.id, rating });
      setRatings(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

      if (index + 1 < total) {
        setIndex(index + 1);
        setFlipped(false);
      } else {
        setCompleted(true);
        if (onFinish) onFinish();
      }
    } catch (err) {
      triggerToast('Review progress not saved: ' + err.message);
    }
  };

  if (!card && !completed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block">Flashcard Study Session</span>
            <h3 className="font-black text-slate-900 text-base">{deck?.title || 'Review Deck'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
            title="Close review session"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {completed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
              <IconTrophy className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-black text-slate-900">Deck Review Complete!</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              You reviewed all {total} cards in this deck. Spaced repetition schedules have been updated!
            </p>
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto py-2">
              <div className="bg-red-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-red-600 block">{ratings.again}</span>
                <span className="text-[9px] text-red-500 uppercase font-black">Again</span>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-amber-600 block">{ratings.hard}</span>
                <span className="text-[9px] text-amber-500 uppercase font-black">Hard</span>
              </div>
              <div className="bg-blue-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-blue-600 block">{ratings.good}</span>
                <span className="text-[9px] text-blue-500 uppercase font-black">Good</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-emerald-600 block">{ratings.easy}</span>
                <span className="text-[9px] text-emerald-500 uppercase font-black">Easy</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setFlipped(false);
                  setCompleted(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-black text-xs text-white shadow-sm cursor-pointer"
              >
                Back to Document
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>Card {index + 1} of {total}</span>
                <span>{Math.round(((index) / total) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            {/* The Flashcard itself */}
            <div
              onClick={() => setFlipped(!flipped)}
              className="min-h-56 p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer flex flex-col justify-between shadow-xs select-none relative group"
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>{flipped ? 'Back • Answer' : 'Front • Question'}</span>
                {card.source_page && (
                  <span className="text-purple-600 font-bold">Page {card.source_page}</span>
                )}
              </div>

              <div className="my-auto py-4 text-center">
                {!flipped ? (
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">{card.question}</h4>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-base font-black text-purple-950 leading-snug">{card.answer}</h4>
                    {card.explanation && (
                      <p className="text-xs text-slate-600 italic mt-2">{card.explanation}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] font-bold text-slate-400">
                {!flipped ? 'Tap or click to reveal answer' : 'Choose your recall difficulty below'}
              </div>
            </div>

            {/* Rating Buttons */}
            {!flipped ? (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs transition-all shadow-sm cursor-pointer"
              >
                Reveal Answer (Space)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="py-2.5 px-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Again</span>
                    <span className="text-[9px] opacity-75">&lt;10m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('hard')}
                    className="py-2.5 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Hard</span>
                    <span className="text-[9px] opacity-75">1d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('good')}
                    className="py-2.5 px-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Good</span>
                    <span className="text-[9px] opacity-75">3d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('easy')}
                    className="py-2.5 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Easy</span>
                    <span className="text-[9px] opacity-75">6d</span>
                  </button>
                </div>
                {card.source_page && onJumpToPage && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToPage(Number(card.source_page));
                        onClose();
                      }}
                      className="text-[11px] text-purple-600 hover:underline font-bold cursor-pointer"
                    >
                      Jump to source on page {card.source_page} in PDF ↗
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function AdminReportArrivalNotice() {
  const [reportedDeckCount, setReportedDeckCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await CSM.api('notifications');
        const count = Number(result.unreadReportDeckCount) || 0;
        if (cancelled || count < 1) return;
        setReportedDeckCount(count);
        await CSM.api('notifications/read', 'PATCH', { type: 'deck_report_received' });
        window.dispatchEvent(new Event('csm:notifications-refresh'));
      } catch { /* The review queue still shows reports if notifications are unavailable. */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);
  if (!reportedDeckCount) return null;
  return ReactDOM.createPortal(<div className="csm-modal-backdrop csm-admin-report-backdrop" role="presentation">
    <section className="csm-admin-report-modal" role="dialog" aria-modal="true" aria-labelledby="csm-admin-report-title" aria-describedby="csm-admin-report-message">
      <span className="csm-admin-report-modal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h8"/></svg></span>
      <span className="csm-kicker">REVIEW QUEUE</span>
      <h2 id="csm-admin-report-title">While you were away</h2>
      <p id="csm-admin-report-message">{reportedDeckCount} {reportedDeckCount === 1 ? 'deck was' : 'decks were'} reported.</p>
      <button type="button" className="csm-primary-button" onClick={() => setReportedDeckCount(0)}>Got it!</button>
    </section>
  </div>, document.body);
}

function AdminHome({ profile, onOpenAdmin }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [reports, setReports] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const load = async () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    try { setDashboard(await CSM.api(`admin/dashboard&from=${from}&to=${to}`)); setError(''); }
    catch (requestError) { setError(requestError.message || 'Could not load workspace activity.'); }
    try { setReports((await CSM.api('admin/reports&status=open')).reports || []); setReviewError(''); }
    catch (requestError) { setReviewError(requestError.message || 'Could not load flagged reviews.'); }
  };
  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);
  return <div className="csm-screen custom-scroll csm-admin-screen csm-admin-home">
    <AdminReportArrivalNotice />
    <div className="csm-page-head csm-admin-page-head"><div><span className="csm-kicker">WORKSPACE OVERVIEW</span><h1>Good to see you, {profile?.displayName || profile?.username || 'Admin'}</h1><p>Monitor who is using Co-StudyMaxx and review activity across the workspace.</p></div><button type="button" className="csm-primary-button" onClick={onOpenAdmin}>Open admin console <IconArrowRight /></button></div>
    {error && <div className="csm-admin-alert is-error" role="alert">{error}</div>}
    {dashboard ? <>
      <div className="csm-admin-metrics">
        {[
          ['Total users', dashboard.totals.users, 'All registered accounts', 'users'],
          ['Active now', dashboard.totals.activeNow, 'Seen in the last 5 minutes', 'users'],
          ['Active last 30 days', dashboard.period.activeUsers, 'Distinct users with study activity', 'users'],
          ['Total decks', dashboard.totals.decks, 'Across all accounts', 'content'],
          ['PDF uploads', dashboard.period.uploads, 'Selected 30-day period', 'content'],
          ['Arena sessions', dashboard.period.sessions, 'Selected 30-day period', 'overview']
        ].map(([label, value, description, section]) => <button type="button" className={`csm-admin-metric csm-admin-metric-button ${label === 'Active now' ? 'is-live' : ''}`} key={label} onClick={() => onOpenAdmin(section)} aria-label={`${label}: ${value}. ${description}. Open ${section === 'users' ? 'user management' : section === 'content' ? 'deck moderation' : 'activity overview'}.`} title={`Open ${section === 'users' ? 'user management' : section === 'content' ? 'deck moderation' : 'activity overview'}`}><span>{label}</span><strong>{value}</strong><small>{description}</small></button>)}
      </div>
      <section className="csm-admin-card csm-admin-home-note"><span className="csm-kicker">LIVE ACCOUNT ACTIVITY</span><p>“Active now” counts accounts with a signed-in tab that contacted the server within five minutes. Period activity counts distinct users who generated study activity during the selected dates.</p></section>
    </> : !error && <div className="csm-admin-empty">Loading workspace totals…</div>}
    <section className="csm-admin-card csm-admin-home-reviews">
      <div className="csm-admin-card-head">
        <div><span className="csm-kicker">NEEDS ATTENTION</span><h2>Flagged reviews</h2></div>
        <div className="csm-admin-review-preview-actions"><span className="csm-admin-subtle">{reports ? `${reports.length} open` : 'Loading…'}</span><button type="button" className="csm-secondary-button" onClick={() => onOpenAdmin('reports')}>Open review queue <IconArrowRight /></button></div>
      </div>
      {reviewError ? <div className="csm-admin-alert is-error" role="alert">{reviewError}</div> : reports === null ? <div className="csm-admin-empty">Loading flagged reviews…</div> : reports.length ? <div className="csm-admin-report-list">{reports.slice(0, 3).map(report => <article className="csm-admin-report" key={report.id}>
        <div><span className="csm-admin-status is-locked">Open review</span><h3>{report.deckTitle}</h3><p>{report.subject || 'No subject'} · owner {report.owner} · reported by {report.flaggedBy || 'staff'}</p><blockquote>{report.reason}</blockquote><small>Reported {new Date(`${report.created_at}Z`).toLocaleString()}</small></div>
        <div className="csm-admin-row-actions"><button type="button" className="csm-secondary-button" onClick={() => onOpenAdmin('reports')}>Review in queue <IconArrowRight /></button></div>
      </article>)}</div> : <div className="csm-admin-review-preview-empty">No open flagged reviews.</div>}
      {reports?.length > 3 && <button type="button" className="csm-admin-review-preview-more" onClick={() => onOpenAdmin('reports')}>View all {reports.length} reviews</button>}
    </section>
  </div>;
}

function UserArchiveScreen({ onWorkspaceRefresh }) {
  const [decks, setDecks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const pageSize = 10;
  const load = async () => {
    setError('');
    try {
      const result = await CSM.api(`archive/decks&limit=${pageSize}&offset=${(page - 1) * pageSize}`);
      setDecks(result.decks || []);
      setTotal(Number(result.total) || 0);
    } catch (requestError) { setError(requestError.message || 'Could not load archived decks.'); }
  };
  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(''), 4600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);
  const act = async (deck, action) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await CSM.api(action === 'restore' ? 'archive/decks/restore' : 'archive/decks/permanent', action === 'restore' ? 'POST' : 'DELETE', { id: deck.id });
      setNotice(action === 'restore' ? 'Deck restored to your library.' : 'Deck permanently deleted.');
      if (action === 'delete') setDeleteTarget(null);
      if (action === 'restore') await onWorkspaceRefresh?.();
      if (decks.length === 1 && page > 1) setPage(current => current - 1); else await load();
    } catch (actionError) {
      const message = actionError.message || 'Could not update this archived deck.';
      if (action === 'delete') setDeleteError(message); else setError(message);
    }
    finally { setBusy(false); }
  };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = getCompactPageItems(page, pageCount);
  return <div className="csm-screen custom-scroll csm-user-archive">
    <div className="csm-page-head"><div><span className="csm-kicker">YOUR LIBRARY</span><h1>Recently deleted</h1><p>Decks stay here until you restore or permanently delete them.</p></div><span className="csm-archive-count">{total} {total === 1 ? 'deck' : 'decks'}</span></div>
    {error && <div className="csm-admin-alert is-error" role="alert">{error}</div>}{notice && <div className="csm-archive-notice-toast" role="status" aria-live="polite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg><span>{notice}</span></div>}
    <section className="csm-admin-card csm-archive-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">ARCHIVE</span><h2>Archived decks</h2></div></div>
      {decks.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Deck</th><th>Bombcards</th><th>PDFs</th><th>Deleted</th><th>Actions</th></tr></thead><tbody>{decks.map(deck => <tr key={deck.id}><td><strong>{deck.title}</strong><small>{deck.subject || 'No subject'}</small></td><td>{deck.card_count}</td><td>{deck.document_count}</td><td>{deck.deleted_at ? new Date(`${deck.deleted_at}Z`).toLocaleString() : '—'}</td><td><div className="csm-admin-row-actions"><button type="button" className="csm-secondary-button" disabled={busy} onClick={() => act(deck, 'restore')}><IconRestore />Restore</button><button type="button" className="csm-admin-deck-action is-danger csm-archive-delete" disabled={busy} onClick={() => { setDeleteError(''); setDeleteTarget(deck); }}><IconTrash />Delete</button></div></td></tr>)}</tbody></table></div> : <div className="csm-admin-empty">{error ? 'Archive could not be loaded.' : 'No recently deleted decks.'}</div>}
      {total > pageSize && <nav className="csm-admin-pagination" aria-label="Archived deck pages"><span className="csm-admin-pagination-summary">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} decks</span><div className="csm-admin-pagination-controls"><button type="button" className="csm-admin-page-button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>{pages.map(item => item.type === 'ellipsis' ? <span key={item.key} className="csm-admin-page-ellipsis">…</span> : <button type="button" key={item.value} className={`csm-admin-page-number ${item.value === page ? 'active' : ''}`} aria-current={item.value === page ? 'page' : undefined} onClick={() => setPage(item.value)}>{item.value}</button>)}<button type="button" className="csm-admin-page-button" disabled={page >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Next</button></div></nav>}
    </section>
    {deleteTarget && ReactDOM.createPortal(<div className="csm-modal-backdrop csm-admin-action-backdrop" role="presentation" onClick={() => !busy && setDeleteTarget(null)}>
      <section className="csm-admin-action-modal csm-archive-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="user-archive-delete-title" aria-describedby="user-archive-delete-description" onClick={event => event.stopPropagation()}>
        <div className="csm-admin-action-icon is-danger" aria-hidden="true"><IconTrash /></div>
        <span className="csm-kicker">PERMANENT DELETION</span>
        <h2 id="user-archive-delete-title">Delete “{deleteTarget.title}” permanently?</h2>
        <p id="user-archive-delete-description">This permanently deletes the deck and its attached PDFs. This action cannot be undone.</p>
        {deleteError && <div className="csm-admin-alert is-error" role="alert">{deleteError}</div>}
        <div className="csm-admin-flag-actions"><button type="button" className="csm-secondary-button" autoFocus disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="csm-admin-danger-button" disabled={busy} onClick={() => act(deleteTarget, 'delete')}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div>
      </section>
    </div>, document.body)}
  </div>;
}

function AdminArchiveScreen({ profile }) {
  const isSuper = profile?.role === 'superadmin';
  const [section, setSection] = useState('inactive-users');
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [inactivePage, setInactivePage] = useState(1);
  const [events, setEvents] = useState([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [hiddenDecks, setHiddenDecks] = useState([]);
  const [hiddenTotal, setHiddenTotal] = useState(0);
  const [hiddenPage, setHiddenPage] = useState(1);
  const [restoringDeckId, setRestoringDeckId] = useState(null);
  const [deletingHiddenDecks, setDeletingHiddenDecks] = useState(false);
  const [hiddenDeckDeleteTarget, setHiddenDeckDeleteTarget] = useState(null);
  const [hiddenDeckDeleteError, setHiddenDeckDeleteError] = useState('');
  const [selectedHiddenDeckIds, setSelectedHiddenDeckIds] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const pageSize = 10;
  const downloadArchiveCsv = async (route, filename, label) => {
    setExporting(true); setError(''); setNotice('');
    try {
      await CSM.downloadFile(route, filename);
      setNotice(`${label} downloaded as CSV.`);
    } catch (downloadError) {
      setError(downloadError.message || 'The CSV export could not be downloaded.');
    } finally { setExporting(false); }
  };
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError('');
      try {
        if (section === 'inactive-users') {
          const result = await CSM.api(`admin/archive/inactive-users&limit=${pageSize}&offset=${(inactivePage - 1) * pageSize}`);
          if (!cancelled) { setInactiveUsers(result.users || []); setInactiveTotal(Number(result.total) || 0); }
        } else if (section === 'hidden-decks') {
          const result = await CSM.api(`admin/archive/hidden-decks&limit=${pageSize}&offset=${(hiddenPage - 1) * pageSize}`);
          if (!cancelled) { setHiddenDecks(result.decks || []); setHiddenTotal(Number(result.total) || 0); }
        } else if (section === 'security-events' && isSuper) {
          const result = await CSM.api(`admin/archive/security-events&limit=${pageSize}&offset=${(eventPage - 1) * pageSize}`);
          if (!cancelled) { setEvents(result.events || []); setEventTotal(Number(result.total) || 0); }
        }
      } catch (requestError) { if (!cancelled) setError(requestError.message || 'Could not load archive data.'); }
    };
    load();
    return () => { cancelled = true; };
  }, [section, inactivePage, hiddenPage, eventPage, isSuper]);
  const requestHiddenDeckDeletion = ids => {
    const selectedIds = [...new Set(ids.map(String))];
    if (selectedIds.length) { setHiddenDeckDeleteError(''); setHiddenDeckDeleteTarget(selectedIds); }
  };
  const confirmHiddenDeckDeletion = async () => {
    const selectedIds = hiddenDeckDeleteTarget || [];
    if (!selectedIds.length || deletingHiddenDecks) return;
    setDeletingHiddenDecks(true); setError(''); setHiddenDeckDeleteError(''); setNotice('');
    try {
      const result = await CSM.api('admin/archive/hidden-decks/delete', 'DELETE', { ids: selectedIds });
      const deletedIds = new Set(selectedIds);
      setHiddenDecks(current => current.filter(deck => !deletedIds.has(String(deck.id))));
      setHiddenTotal(current => Math.max(0, current - (Number(result.deleted) || selectedIds.length)));
      setSelectedHiddenDeckIds(current => current.filter(id => !deletedIds.has(String(id))));
      setNotice(`${Number(result.deleted) || selectedIds.length} hidden ${selectedIds.length === 1 ? 'deck' : 'decks'} permanently deleted.`);
      if (selectedIds.length >= hiddenDecks.length && hiddenPage > 1) setHiddenPage(current => current - 1);
      setHiddenDeckDeleteTarget(null);
    } catch (deleteError) { setHiddenDeckDeleteError(deleteError.message || 'Could not permanently delete the selected decks.'); }
    finally { setDeletingHiddenDecks(false); }
  };
  const restoreHiddenDeck = async deck => {
    setRestoringDeckId(deck.id); setError(''); setNotice('');
    try {
      await CSM.api('admin/decks/visibility', 'PATCH', { deckId: deck.id, action: 'restore', reason: 'Restored from the hidden deck archive.' });
      setHiddenDecks(current => current.filter(item => String(item.id) !== String(deck.id)));
      setSelectedHiddenDeckIds(current => current.filter(id => String(id) !== String(deck.id)));
      setHiddenTotal(current => Math.max(0, current - 1));
      setNotice(`"${deck.title}" restored and returned to deck moderation.`);
      if (hiddenDecks.length === 1 && hiddenPage > 1) setHiddenPage(current => current - 1);
    } catch (restoreError) { setError(restoreError.message || 'Could not restore this deck.'); }
    finally { setRestoringDeckId(null); }
  };
  const pagination = (label, page, total, setPage) => {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize) return null;
    return <nav className="csm-admin-pagination" aria-label={`${label} pages`}><span className="csm-admin-pagination-summary">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} {label.toLowerCase()}</span><div className="csm-admin-pagination-controls"><button type="button" className="csm-admin-page-button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>{getCompactPageItems(page, pageCount).map(item => item.type === 'ellipsis' ? <span key={item.key} className="csm-admin-page-ellipsis">…</span> : <button type="button" key={item.value} className={`csm-admin-page-number ${item.value === page ? 'active' : ''}`} aria-current={item.value === page ? 'page' : undefined} onClick={() => setPage(item.value)}>{item.value}</button>)}<button type="button" className="csm-admin-page-button" disabled={page >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Next</button></div></nav>;
  };
  return <div className="csm-screen custom-scroll csm-admin-screen csm-standalone-archive">
    <div className="csm-page-head csm-admin-page-head"><div><span className="csm-kicker">WORKSPACE ADMINISTRATION</span><h1>Archive</h1><p>Review hidden decks, inactive accounts, and older security events.</p></div><span className={`csm-admin-role-pill ${isSuper ? 'is-super' : ''}`}>{isSuper ? 'Superadmin' : 'Admin'}</span></div>
    <div className="csm-admin-tabs csm-admin-archive-tabs" role="tablist" aria-label="Archive sections"><button type="button" role="tab" aria-selected={section === 'inactive-users'} className={section === 'inactive-users' ? 'active' : ''} onClick={() => { setSection('inactive-users'); setInactivePage(1); }}>Inactive users</button><button type="button" role="tab" aria-selected={section === 'hidden-decks'} className={section === 'hidden-decks' ? 'active' : ''} onClick={() => { setSection('hidden-decks'); setHiddenPage(1); }}>Hidden decks</button>{isSuper && <button type="button" role="tab" aria-selected={section === 'security-events'} className={section === 'security-events' ? 'active' : ''} onClick={() => { setSection('security-events'); setEventPage(1); }}>Security event log</button>}</div>
    {error && <div className="csm-admin-alert is-error" role="alert">{error}</div>}{notice && <div className="csm-admin-alert is-success" role="status">{notice}</div>}
    {section === 'inactive-users' && <div className="csm-admin-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">ACCOUNT ARCHIVE</span><h2>Inactive users</h2><small className="csm-admin-subtle">Accounts appear here after seven days without activity. They are excluded from the user directory and search, but can still sign in.</small></div><div className="csm-admin-content-tools"><span className="csm-archive-count">{inactiveTotal} accounts</span><button type="button" className="csm-secondary-button" disabled={exporting} onClick={() => downloadArchiveCsv('admin/archive/inactive-users/export', 'co-studymaxx-inactive-users.csv', 'Inactive users')}><IconDownload />{exporting ? 'Preparing CSV…' : 'Export CSV'}</button></div></div>{inactiveUsers.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Account</th><th>Role</th><th>Last active</th><th>Inactive for</th><th>Joined</th></tr></thead><tbody>{inactiveUsers.map(account => <tr key={account.id}><td><div className="csm-admin-account"><span className="csm-admin-avatar-wrap"><span className="csm-admin-avatar" style={{ background: adminAvatarBackgrounds[account.avatar] || adminAvatarBackgrounds.ember }} aria-hidden="true">{getAccountInitials(account)}</span></span><div><strong>{account.username}</strong><small>{account.email || 'No email on file'}</small></div></div></td><td><span className="csm-admin-status">{account.role}</span></td><td>{account.last_seen_at ? new Date(`${account.last_seen_at}Z`).toLocaleString() : '—'}</td><td>{account.inactive_days} days</td><td>{account.created_at ? new Date(`${account.created_at}Z`).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <div className="csm-admin-empty">{error ? 'Archive could not be loaded.' : 'No accounts have been inactive for seven days.'}</div>}{pagination('Inactive users', inactivePage, inactiveTotal, setInactivePage)}</div>}
    {section === 'hidden-decks' && <div className="csm-admin-card">
      <div className="csm-admin-card-head">
        <div><span className="csm-kicker">MODERATION ARCHIVE</span><h2>Hidden decks</h2><small className="csm-admin-subtle">Decks hidden by staff are kept here so they can be restored if needed.</small></div>
        <div className="csm-admin-content-tools">
          <span className="csm-archive-count">{hiddenTotal} decks</span>
          {selectedHiddenDeckIds.length > 0 && <button type="button" className="csm-admin-danger-button csm-archive-bulk-delete" disabled={deletingHiddenDecks || restoringDeckId !== null} onClick={() => requestHiddenDeckDeletion(selectedHiddenDeckIds)}><IconTrash />Delete selected ({selectedHiddenDeckIds.length})</button>}
        </div>
      </div>
      {hiddenDecks.length ? <div className="csm-admin-table-wrap csm-admin-hidden-decks-table-wrap"><table className="csm-admin-table csm-admin-hidden-decks-table"><thead><tr><th><label className="csm-admin-select-all"><input type="checkbox" aria-label="Select all hidden decks on this page" checked={hiddenDecks.length > 0 && hiddenDecks.every(deck => selectedHiddenDeckIds.includes(String(deck.id)))} onChange={event => setSelectedHiddenDeckIds(current => event.target.checked ? [...new Set([...current, ...hiddenDecks.map(deck => String(deck.id))])] : current.filter(id => !hiddenDecks.some(deck => String(deck.id) === String(id))))} />Deck</label></th><th>Owner</th><th>Cards / PDFs</th><th>Hidden</th><th>Actions</th></tr></thead><tbody>{hiddenDecks.map(deck => <tr key={deck.id}>
        <td><div className="csm-admin-hidden-deck-account"><input type="checkbox" aria-label={`Select ${deck.title}`} checked={selectedHiddenDeckIds.includes(String(deck.id))} onChange={event => setSelectedHiddenDeckIds(current => event.target.checked ? [...new Set([...current, String(deck.id)])] : current.filter(id => String(id) !== String(deck.id)))} /><div><strong>{deck.title}</strong><small>{deck.subject || 'No subject'}</small></div></div></td>
        <td>{deck.owner}</td><td>{deck.card_count} / {deck.document_count}</td><td>{deck.hidden_at ? new Date(`${deck.hidden_at}Z`).toLocaleString() : 'Not recorded'}</td>
        <td><div className="csm-admin-deck-menu"><details><summary className="csm-admin-deck-menu-trigger" aria-label={`Actions for ${deck.title}`} title="Deck actions"><svg className="csm-admin-user-more-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div className="csm-admin-deck-menu-popover"><button type="button" disabled={restoringDeckId !== null || deletingHiddenDecks} onClick={event => { event.currentTarget.closest('details').open = false; restoreHiddenDeck(deck); }}><svg className="csm-admin-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></svg>{restoringDeckId === deck.id ? 'Restoring...' : 'Restore deck'}</button><button type="button" className="is-danger" disabled={deletingHiddenDecks || restoringDeckId !== null} onClick={event => { event.currentTarget.closest('details').open = false; requestHiddenDeckDeletion([deck.id]); }}><IconTrash />Delete permanently</button></div></details></div></td>
      </tr>)}</tbody></table></div> : <div className="csm-admin-empty">{error ? 'Archive could not be loaded.' : 'No hidden decks.'}</div>}
      {pagination('Hidden decks', hiddenPage, hiddenTotal, setHiddenPage)}
    </div>}
    {section === 'security-events' && isSuper && <div className="csm-admin-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">SUPERADMIN ONLY</span><h2>Archived security events</h2><small className="csm-admin-subtle">The newest 100 events remain in Security log. Older events appear here.</small></div><div className="csm-admin-content-tools"><span className="csm-admin-subtle">IP addresses are one-way hashes.</span><button type="button" className="csm-secondary-button" disabled={exporting} onClick={() => downloadArchiveCsv('admin/archive/security-events/export', 'co-studymaxx-archived-security-events.csv', 'Archived security events')}><IconDownload />{exporting ? 'Preparing CSV…' : 'Export CSV'}</button></div></div>{events.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Target</th><th>IP fingerprint</th><th>Details</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{new Date(`${event.created_at}Z`).toLocaleString()}</td><td><span className="csm-admin-status csm-admin-security-event">{formatAdminEventLabel(event.event)}</span></td><td>{event.actor || 'System'}</td><td>{event.target || '—'}</td><td><code>{event.ip_hash ? event.ip_hash.slice(0, 16) : '—'}</code></td><td><code>{JSON.stringify(event.details || {})}</code></td></tr>)}</tbody></table></div> : <div className="csm-admin-empty">{error ? 'Archive could not be loaded.' : 'The event log has not exceeded ten pages yet.'}</div>}{pagination('Archived security events', eventPage, eventTotal, setEventPage)}</div>}
    {hiddenDeckDeleteTarget && <div className="csm-modal-backdrop csm-admin-action-backdrop" role="presentation" onClick={() => !deletingHiddenDecks && setHiddenDeckDeleteTarget(null)}>
      <section className="csm-admin-action-modal csm-archive-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="archive-delete-title" aria-describedby="archive-delete-description" onClick={event => event.stopPropagation()}>
        <div className="csm-admin-action-icon is-danger" aria-hidden="true"><IconTrash /></div>
        <span className="csm-kicker">PERMANENT DELETION</span>
        <h2 id="archive-delete-title">Delete {hiddenDeckDeleteTarget.length} hidden {hiddenDeckDeleteTarget.length === 1 ? 'deck' : 'decks'}?</h2>
        <p id="archive-delete-description">This permanently removes {hiddenDeckDeleteTarget.length === 1 ? 'this deck' : 'these decks'} and all attached PDFs from the workspace. This action cannot be undone.</p>
        {hiddenDeckDeleteError && <div className="csm-admin-alert is-error" role="alert">{hiddenDeckDeleteError}</div>}
        <div className="csm-admin-flag-actions"><button type="button" className="csm-secondary-button" autoFocus disabled={deletingHiddenDecks} onClick={() => setHiddenDeckDeleteTarget(null)}>Cancel</button><button type="button" className="csm-admin-danger-button" disabled={deletingHiddenDecks} onClick={confirmHiddenDeckDeletion}>{deletingHiddenDecks ? 'Deleting…' : 'Delete permanently'}</button></div>
      </section>
    </div>}
  </div>;
}

function AdminPanel({ profile }) {
  const isSuper = profile?.role === 'superadmin';
  const [section, setSection] = useState(() => {
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    return ['overview', 'content', 'reports', 'users'].includes(requestedSection) ? requestedSection : 'overview';
  });
  const [range, setRange] = useState(() => ({ from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }));
  const [activitySummaryPage, setActivitySummaryPage] = useState(1);
  const [dateFilterError, setDateFilterError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userProfileModal, setUserProfileModal] = useState(null);
  const [userProfileTab, setUserProfileTab] = useState('activity');
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState('');
  const [userProfileNotice, setUserProfileNotice] = useState('');
  const userProfileTriggerRef = useRef(null);
  const userProfileCloseRef = useRef(null);
  const [decks, setDecks] = useState([]);
  const [deckTotal, setDeckTotal] = useState(0);
  const [deckPage, setDeckPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [adminActionModal, setAdminActionModal] = useState(null);
  const [adminActionReason, setAdminActionReason] = useState('');
  const [adminActionPassword, setAdminActionPassword] = useState('');
  const [adminActionError, setAdminActionError] = useState('');
  const adminActionReasonRef = useRef(null);
  const adminActionPasswordRef = useRef(null);
  const adminActionConfirmRef = useRef(null);
  const adminActionTriggerRef = useRef(null);
  const [flagDeckTarget, setFlagDeckTarget] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagReasonError, setFlagReasonError] = useState('');
  const flagReasonRef = useRef(null);
  const flagTriggerRef = useRef(null);
  const [deckPreview, setDeckPreview] = useState(null);
  const [deckPreviewLoading, setDeckPreviewLoading] = useState(false);
  const [deckPreviewError, setDeckPreviewError] = useState('');
  const deckPreviewTriggerRef = useRef(null);
  const deckPreviewCloseRef = useRef(null);
  const deckPreviewRequestRef = useRef(0);
  const rangeInitializedRef = useRef(false);
  const rangeTouchedRef = useRef(false);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const applyWebsiteStartDate = summary => {
    if (rangeInitializedRef.current || rangeTouchedRef.current || !summary.startDate) return;
    rangeInitializedRef.current = true;
    setRange(current => ({ ...current, from: summary.startDate }));
  };

  const load = async (query = search, requestedDeckPage = deckPage, requestedUserPage = userPage, requestedEventPage = eventPage) => {
    setError('');
    try {
      if (section === 'overview') {
        const [summary, reviewData] = await Promise.all([
          CSM.api(`admin/dashboard&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
          CSM.api('admin/reports&status=open')
        ]);
        setDashboard(summary);
        applyWebsiteStartDate(summary);
        setReports(reviewData.reports || []);
      }
      if (section === 'users') {
        const result = await CSM.api(`admin/users&q=${encodeURIComponent(query)}&role=${encodeURIComponent(userRoleFilter)}&limit=10&offset=${(requestedUserPage - 1) * 10}`);
        setUsers(result.users || []);
        setUserTotal(Number(result.total) || 0);
      }
      if (section === 'content') {
        const result = await CSM.api(`admin/decks&q=${encodeURIComponent(query)}&limit=10&offset=${(requestedDeckPage - 1) * 10}`);
        const nextDecks = result.decks || [];
        setDecks(nextDecks);
        setDeckTotal(Number(result.total) || 0);
      }
      if (section === 'reports') setReports((await CSM.api('admin/reports&status=open')).reports || []);
      if (section === 'audit' && isSuper) {
        const result = await CSM.api(`admin/audit&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&limit=10&offset=${(requestedEventPage - 1) * 10}`);
        setEvents(result.events || []);
        setEventTotal(Number(result.total) || 0);
      }
      if (section === 'system' && isSuper) setSettings(await CSM.api('admin/settings'));
    } catch (requestError) { setError(requestError.message || 'Could not load administrator data.'); }
  };
  useEffect(() => { load(); }, [section, range.from, range.to, deckPage, userPage, userRoleFilter, eventPage]);
  useEffect(() => {
    if (section !== 'overview') return undefined;
    const interval = window.setInterval(async () => {
      try {
        const [summary, reviewData] = await Promise.all([
          CSM.api(`admin/dashboard&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
          CSM.api('admin/reports&status=open')
        ]);
        setDashboard(summary);
        applyWebsiteStartDate(summary);
        setReports(reviewData.reports || []);
      }
      catch { /* The current dashboard remains visible; the next refresh can recover. */ }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [section, range.from, range.to]);
  useEffect(() => {
    if (section !== 'users') return undefined;
    const interval = window.setInterval(async () => {
      try {
        const result = await CSM.api(`admin/users&q=${encodeURIComponent(search)}&role=${encodeURIComponent(userRoleFilter)}&limit=10&offset=${(userPage - 1) * 10}`);
        setUsers(result.users || []);
        setUserTotal(Number(result.total) || 0);
      } catch { /* Keep the last known status visible until the next refresh. */ }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [section, search, userPage, userRoleFilter]);

  const runAction = async (action, success) => {
    setBusy(true); setError(''); setNotice(null);
    try { await action(); setNotice(success); await load(); }
    catch (actionError) { setError(actionError.message || 'The action could not be completed.'); }
    finally { setBusy(false); }
  };
  const downloadAdminCsv = async (route, filename, successMessage) => {
    setBusy(true); setError(''); setNotice(null);
    try {
      await CSM.downloadFile(route, filename);
      setNotice(successMessage);
    } catch (downloadError) {
      setError(downloadError.message || 'The CSV export could not be downloaded.');
    } finally { setBusy(false); }
  };
  const requestAdminAction = (event, options) => {
    adminActionTriggerRef.current = event.currentTarget?.tagName === 'FORM' ? event.nativeEvent?.submitter : event.currentTarget;
    setAdminActionReason('');
    setAdminActionPassword('');
    setAdminActionError('');
    setAdminActionModal(options);
  };
  const viewAccountProfile = async (event, account) => {
    const menuDetails = event.currentTarget.closest('details');
    userProfileTriggerRef.current = menuDetails?.querySelector('summary') || event.currentTarget;
    if (menuDetails) menuDetails.open = false;
    setUserProfileTab('activity');
    setUserProfileError('');
    setUserProfileNotice('');
    setUserProfileLoading(true);
    setUserProfileModal({ account, data: null });
    try {
      const result = await CSM.api(`admin/users/profile&id=${encodeURIComponent(account.id)}`);
      setUserProfileModal({ account, data: result });
    } catch (profileError) { setUserProfileError(profileError.message || 'Could not load this account profile.'); }
    finally { setUserProfileLoading(false); }
  };
  const closeUserProfile = () => {
    if (busy) return;
    setUserProfileModal(null);
    setUserProfileError('');
  };
  const closeAdminActionModal = () => {
    if (busy) return;
    setAdminActionModal(null);
    setAdminActionReason('');
    setAdminActionPassword('');
    setAdminActionError('');
  };
  const submitAdminAction = async event => {
    event.preventDefault();
    if (!adminActionModal || busy) return;
    const reason = adminActionReason.trim();
    if (adminActionModal.requiresReason && !reason) {
      setAdminActionError('Enter a reason to continue.');
      adminActionReasonRef.current?.focus();
      return;
    }
    if (adminActionModal.requiresPassword && !adminActionPassword) {
      setAdminActionError('Enter your password to confirm this promotion.');
      adminActionPasswordRef.current?.focus();
      return;
    }
    const { action, success } = adminActionModal;
    if (adminActionModal.requiresPassword) {
      const password = adminActionPassword;
      setBusy(true); setError(''); setNotice(null); setAdminActionError('');
      try {
        await action(reason.slice(0, 1000), password);
        setAdminActionModal(null);
        setAdminActionPassword('');
        setNotice(success);
        await load();
      } catch (actionError) {
        setAdminActionPassword('');
        setAdminActionError(actionError.message || 'Password confirmation failed. Please try again.');
        window.setTimeout(() => adminActionPasswordRef.current?.focus(), 0);
      } finally { setBusy(false); }
      return;
    }
    setAdminActionModal(null);
    setAdminActionReason('');
    runAction(() => action(reason.slice(0, 1000)), success);
  };
  const closeFlagModal = () => {
    if (busy) return;
    setFlagDeckTarget(null);
    setFlagReason('');
    setFlagReasonError('');
  };
  const loadDeckPreview = async deck => {
    const requestId = ++deckPreviewRequestRef.current;
    setDeckPreview(deck);
    setDeckPreviewLoading(true);
    setDeckPreviewError('');
    try {
      const result = await CSM.api(`admin/decks/view&id=${encodeURIComponent(deck.id)}`);
      if (requestId === deckPreviewRequestRef.current) setDeckPreview({ ...result.deck, documents: result.documents || [] });
    } catch (requestError) {
      if (requestId === deckPreviewRequestRef.current) setDeckPreviewError(requestError.message || 'Could not load this deck preview.');
    } finally {
      if (requestId === deckPreviewRequestRef.current) setDeckPreviewLoading(false);
    }
  };
  const closeDeckPreview = () => {
    deckPreviewRequestRef.current++;
    setDeckPreview(null);
    setDeckPreviewLoading(false);
    setDeckPreviewError('');
  };
  const submitFlagReview = async event => {
    event.preventDefault();
    const reason = flagReason.trim();
    if (!reason) {
      setFlagReasonError('Enter a reason so the moderation team can review this deck.');
      flagReasonRef.current?.focus();
      return;
    }
    setBusy(true); setError(''); setNotice(null); setFlagReasonError('');
    try {
      await CSM.api('admin/decks/flag', 'POST', { deckId: flagDeckTarget.id, reason: reason.slice(0, 1000) });
      setNotice('Deck added to the review queue.');
      setFlagDeckTarget(null); setFlagReason('');
      await load();
    } catch (requestError) {
      setFlagReasonError(requestError.message || 'The deck could not be flagged. Please try again.');
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!flagDeckTarget) {
      flagTriggerRef.current?.focus();
      return undefined;
    }
    flagReasonRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        closeFlagModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flagDeckTarget, busy]);
  useEffect(() => {
    if (!adminActionModal) {
      adminActionTriggerRef.current?.focus();
      return undefined;
    }
    (adminActionModal.requiresReason ? adminActionReasonRef.current : adminActionModal.requiresPassword ? adminActionPasswordRef.current : adminActionConfirmRef.current)?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        closeAdminActionModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [adminActionModal, busy]);
  useEffect(() => {
    if (!deckPreview) {
      deckPreviewTriggerRef.current?.focus();
      return undefined;
    }
    deckPreviewCloseRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDeckPreview();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [Boolean(deckPreview)]);
  useEffect(() => {
    if (!userProfileModal) {
      userProfileTriggerRef.current?.focus();
      return undefined;
    }
    userProfileCloseRef.current?.focus();
    return undefined;
  }, [Boolean(userProfileModal)]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(deckTotal / 10));
    if (deckPage > lastPage) setDeckPage(lastPage);
  }, [deckPage, deckTotal]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(userTotal / 10));
    if (userPage > lastPage) setUserPage(lastPage);
  }, [userPage, userTotal]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(eventTotal / 10));
    if (eventPage > lastPage) setEventPage(lastPage);
  }, [eventPage, eventTotal]);
  const today = new Date();
  const maxAvailableDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const updateDateFilter = (field, value, resetEventPage) => {
    if (!value) {
      setDateFilterError('Choose a date to view the activity period.');
      return;
    }
    if (value > maxAvailableDate) {
      setDateFilterError('Future dates are not available yet. Choose today or an earlier date.');
      return;
    }
    if (field === 'from' && range.to && value > range.to) {
      setDateFilterError('The start date must be on or before the end date.');
      return;
    }
    if (field === 'to' && range.from && value < range.from) {
      setDateFilterError('The end date must be on or after the start date.');
      return;
    }
    setDateFilterError('');
    setActivitySummaryPage(1);
    rangeTouchedRef.current = true;
    rangeInitializedRef.current = true;
    if (resetEventPage) setEventPage(1);
    setRange(current => ({ ...current, [field]: value }));
  };
  const dateFilters = (label = 'Activity period', resetEventPage = false) => <div className="csm-admin-date-filter"><span>{label}</span><label>From<input type="date" max={range.to && range.to < maxAvailableDate ? range.to : maxAvailableDate} value={range.from} aria-invalid={dateFilterError ? 'true' : undefined} aria-describedby={dateFilterError ? 'admin-date-filter-error' : undefined} onChange={event => updateDateFilter('from', event.target.value, resetEventPage)} /></label><label>To<input type="date" min={range.from || undefined} max={maxAvailableDate} value={range.to} aria-invalid={dateFilterError ? 'true' : undefined} aria-describedby={dateFilterError ? 'admin-date-filter-error' : undefined} onChange={event => updateDateFilter('to', event.target.value, resetEventPage)} /></label>{dateFilterError && <span id="admin-date-filter-error" className="csm-admin-date-error" role="alert">{dateFilterError}</span>}</div>;
  const buildAdminPagination = (label, page, total, setPage) => {
    const pageCount = Math.max(1, Math.ceil(total / 10));
    const pageItems = getCompactPageItems(page, pageCount);
    return total > 10 && <nav className="csm-admin-pagination" aria-label={`${label} pages`}><span className="csm-admin-pagination-summary">Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total} {label.toLowerCase()}</span><div className="csm-admin-pagination-controls"><button type="button" className="csm-admin-page-button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>{pageItems.map(item => item.type === 'ellipsis' ? <span key={item.key} className="csm-admin-page-ellipsis" aria-hidden="true">…</span> : <button key={item.value} type="button" className={`csm-admin-page-number ${item.value === page ? 'active' : ''}`} aria-label={`Page ${item.value}`} aria-current={item.value === page ? 'page' : undefined} onClick={() => setPage(item.value)}>{item.value}</button>)}<button type="button" className="csm-admin-page-button" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button></div></nav>;
  };
  const deckPagination = buildAdminPagination('Decks', deckPage, deckTotal, setDeckPage);
  const userPagination = buildAdminPagination('Users', userPage, userTotal, setUserPage);
  const eventPagination = buildAdminPagination('Security events', eventPage, eventTotal, setEventPage);
  const activitySummaryRows = dashboard?.days?.slice((activitySummaryPage - 1) * 10, activitySummaryPage * 10) || [];
  const activitySummaryPagination = buildAdminPagination('Activity days', activitySummaryPage, dashboard?.days?.length || 0, setActivitySummaryPage);
  const sections = [['overview', 'Overview'], ['content', 'Content'], ['reports', 'Review queue'], ['users', 'Users'], ...(isSuper ? [['audit', 'Security log'], ['system', 'System']] : [])];

  return <div className="csm-screen custom-scroll csm-admin-screen">
    <AdminReportArrivalNotice />
    <div className="csm-page-head csm-admin-page-head"><div><span className="csm-kicker">WORKSPACE ADMINISTRATION</span><h1>Admin console</h1><p>Review app activity and manage accounts and study content.</p></div><span className={`csm-admin-role-pill ${isSuper ? 'is-super' : ''}`}>{isSuper ? 'Superadmin' : 'Admin'}</span></div>
    <div className="csm-admin-tabs" role="tablist" aria-label="Admin console sections">{sections.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={section === id} className={`${section === id ? 'active' : ''}${id === 'reports' && reports.length ? ' has-open-reports' : ''}`} onClick={() => { if (id === 'content') setDeckPage(1); if (id === 'users') setUserPage(1); if (id === 'audit') setEventPage(1); setSection(id); setNotice(null); setError(''); }}>{label}{id === 'reports' && reports.length > 0 && <span className="csm-admin-review-dot" aria-label={`${reports.length} open reports`} title={`${reports.length} open reports`} />}</button>)}</div>
    {error && <div className="csm-admin-alert is-error" role="alert">{error}</div>}{notice && <div className="csm-deck-visibility-toast" role="status" aria-live="polite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg><span>{notice}</span></div>}

    {section === 'overview' && <>
      {dateFilters()}
      {dashboard?.beforeLaunch && <div className="csm-admin-date-before-launch" role="status">No activity is available before the first account was registered on {dashboard.startDate}. Period metrics are shown as zero.</div>}
      {!dashboard && !error ? <div className="csm-admin-empty">Loading activity…</div> : dashboard && <>
        <div className="csm-admin-metrics">
          {[['Total users', dashboard.totals.users], ['Active now', dashboard.totals.activeNow], ['Active users (period)', dashboard.period.activeUsers], ['Total decks', dashboard.totals.decks], ['PDF uploads (period)', dashboard.period.uploads], ['Arena sessions (period)', dashboard.period.sessions], ['PDF storage', `${(dashboard.totals.storageBytes / 1048576).toFixed(1)} MB`]].map(([label, value]) => <article className={`csm-admin-metric ${label === 'Active now' ? 'is-live' : ''}`} key={label}><span>{label}</span><strong>{value}</strong>{label === 'Active now' && <small>Seen in the last 5 minutes</small>}</article>)}
        </div>
        <div className="csm-admin-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">SELECTED PERIOD</span><h2>Activity summary</h2></div><div className="csm-admin-content-tools"><span className="csm-admin-subtle">{dashboard.from} – {dashboard.to}</span><button type="button" className="csm-secondary-button" disabled={busy} onClick={() => downloadAdminCsv(`admin/dashboard/export&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, `co-studymaxx-activity-summary-${range.from}-to-${range.to}.csv`, 'CSV export started.')}><IconDownload />Export CSV</button></div></div>
          <div className="csm-admin-period-grid">{[['Active users', dashboard.period.activeUsers], ['New users', dashboard.period.newUsers], ['New decks', dashboard.period.newDecks], ['Documents uploaded', dashboard.period.uploads], ['Arena sessions', dashboard.period.sessions], ['Sessions completed', dashboard.period.completedSessions]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          {dashboard.days.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Date</th><th>Active users</th><th>Decks</th><th>Uploads</th><th>Arena sessions</th></tr></thead><tbody>{activitySummaryRows.map(day => <tr key={day.date}><td>{day.date}</td><td>{day.activeUsers}</td><td>{day.decks}</td><td>{day.uploads}</td><td>{day.arenaSessions}</td></tr>)}</tbody></table></div> : <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Date</th><th>Active users</th><th>Decks</th><th>Uploads</th><th>Arena sessions</th></tr></thead><tbody><tr><td>{dashboard.from === dashboard.to ? dashboard.from : 'Selected period'}</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></div>}
          {activitySummaryPagination}
        </div>
        <div className="csm-admin-card csm-admin-review-preview"><div className="csm-admin-card-head"><div><span className="csm-kicker">NEEDS ATTENTION</span><h2>Flagged review preview</h2></div><div className="csm-admin-review-preview-actions"><span className="csm-admin-subtle">{reports.length} open</span><button type="button" className="csm-secondary-button" onClick={() => setSection('reports')}>Open review queue</button></div></div>
          {reports.length ? <div className="csm-admin-report-list">{reports.slice(0, 3).map(report => <article className="csm-admin-report" key={report.id}><div><span className="csm-admin-status is-locked">Open review</span><h3>{report.deckTitle}</h3><p>{report.subject || 'No subject'} · owner {report.owner} · reported by {report.flaggedBy || 'staff'}</p><blockquote>{report.reason}</blockquote><small>Reported {new Date(`${report.created_at}Z`).toLocaleString()}</small></div></article>)}</div> : <div className="csm-admin-review-preview-empty">No open flagged reviews.</div>}
          {reports.length > 3 && <button type="button" className="csm-admin-review-preview-more" onClick={() => setSection('reports')}>View all {reports.length} reviews</button>}
        </div>
      </>}
    </>}

    {(section === 'users' || section === 'content') && <div className="csm-admin-card">
      <div className="csm-admin-card-head">
        <div>
          <span className="csm-kicker">{section === 'users' ? 'ACCOUNT DIRECTORY' : 'PRIVATE STUDY CONTENT'}</span>
          <h2>{section === 'users' ? 'User management' : 'Deck moderation'}</h2>
          {section === 'content' && <small className="csm-admin-subtle">Search or page through decks, then preview from a deck row.</small>}
        </div>
        <div className="csm-admin-content-tools">
          {section === 'users' ? <div className="csm-admin-user-tools">
            <div className="csm-admin-user-search-row">
              <select className="csm-admin-role-filter" aria-label="Filter users by role" value={userRoleFilter} onChange={event => { setUserRoleFilter(event.target.value); setUserPage(1); }}>
                <option value="all">All roles</option><option value="user">Users</option><option value="admin">Admins</option><option value="superadmin">Superadmins</option>
              </select>
              <form className="csm-admin-search" onSubmit={event => { event.preventDefault(); setUserPage(1); load(search, deckPage, 1); }}>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search username or email" aria-label="Search" />
                <button className="csm-secondary-button" type="submit">Search</button>
              </form>
            </div>
            <button type="button" className="csm-secondary-button" disabled={busy} onClick={() => downloadAdminCsv('admin/users/export', 'co-studymaxx-users.csv', 'User directory downloaded as CSV.')}><IconDownload />Export all users CSV</button>
          </div> : <div className="csm-admin-content-search-stack">
            <form className="csm-admin-search" onSubmit={event => { event.preventDefault(); setDeckPage(1); load(search, 1); }}>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search deck or owner" aria-label="Search" />
              <button className="csm-secondary-button" type="submit">Search</button>
            </form>
            <button type="button" className="csm-secondary-button" disabled={busy} onClick={() => downloadAdminCsv('admin/content/export', 'co-studymaxx-content.csv', 'Workspace content downloaded as CSV.')}><IconDownload />Export content CSV</button>
          </div>}
        </div>
      </div>
      {section === 'users' ? users.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Account</th><th>Role</th><th>Decks / PDFs</th><th>Last active</th><th>Status</th></tr></thead><tbody>{users.map(account => { const isCurrentSuperadmin = isSuper && account.username === profile?.username; return <tr key={account.id}><td><div className="csm-admin-account"><span className="csm-admin-avatar-wrap"><span className="csm-admin-avatar" style={{ background: adminAvatarBackgrounds[account.avatar] || adminAvatarBackgrounds.ember }} aria-hidden="true">{getAccountInitials(account)}</span>{account.is_active_now && <span className="csm-admin-online-dot" title="Online now" aria-label="Online now" />}</span><div><strong>{account.username}{isCurrentSuperadmin && <small className="csm-admin-self-label">You</small>}</strong><small>{account.email || 'No email on file'}</small></div></div></td><td>{isSuper ? isCurrentSuperadmin ? <span className="csm-admin-status" title="Your own superadmin role cannot be changed here">Superadmin</span> : <select aria-label={`Role for ${account.username}`} value={account.role} disabled={busy} onChange={event => { const role = event.target.value; if (role !== account.role) requestAdminAction(event, { title: role === 'superadmin' ? `Promote ${account.username} to superadmin?` : 'Update account role?', message: role === 'superadmin' ? `Promoting ${account.username} grants full superadmin privileges. Enter your current password to confirm.` : `Change ${account.username}'s role to ${role}?`, confirmLabel: role === 'superadmin' ? 'Promote to superadmin' : 'Update role', requiresPassword: role === 'superadmin', success: role === 'superadmin' ? `${account.username} promoted to superadmin.` : 'Account role updated.', action: (_reason, password) => CSM.api('admin/users/role', 'POST', { userId: account.id, role, ...(role === 'superadmin' ? { password } : {}) }) }); }}>{['user', 'admin', 'superadmin'].map(role => <option key={role}>{role}</option>)}</select> : <span className="csm-admin-status">{account.role}</span>}</td><td>{account.deck_count} / {account.document_count}</td><td>{account.last_active ? new Date(`${account.last_active}Z`).toLocaleDateString() : '—'}</td><td><div className="csm-admin-user-status-actions"><div className="csm-admin-user-status-main"><span className={`csm-admin-status ${account.banned_at ? 'is-locked' : account.locked_until && new Date(`${account.locked_until}Z`) > new Date() ? 'is-locked' : account.is_active_now ? 'is-active' : 'is-inactive'}`}>{account.banned_at ? 'Banned' : account.locked_until && new Date(`${account.locked_until}Z`) > new Date() ? `Locked until ${new Date(`${account.locked_until}Z`).toLocaleString()}` : account.is_active_now ? 'Active now' : 'Inactive'}</span>{!account.banned_at && account.locked_until && new Date(`${account.locked_until}Z`) > new Date() && <button type="button" className="csm-admin-account-action" disabled={busy} onClick={event => requestAdminAction(event, { title: `Unlock ${account.username}?`, message: 'This clears the temporary sign-in lock for this account.', confirmLabel: 'Unlock account', requiresReason: true, reasonLabel: 'Reason for unlocking', success: 'Account unlocked.', action: reason => CSM.api('admin/users/unlock', 'POST', { userId: account.id, reason }) })}>Unlock</button>}</div><div className="csm-admin-deck-menu"><details><summary className="csm-admin-deck-menu-trigger csm-admin-user-menu-trigger" aria-label={`Actions for ${account.username}`} title="Account actions"><svg className="csm-admin-user-more-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div className="csm-admin-deck-menu-popover csm-admin-user-menu-popover"><button type="button" onClick={event => { const details = event.currentTarget.closest('details'); userProfileTriggerRef.current = details.querySelector('summary'); details.open = false; viewAccountProfile(event, account); }}><IconUser />View profile</button></div></details></div></div></td></tr>})}</tbody></table></div> : <div className="csm-admin-empty">No accounts match this search.</div> : <>{decks.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table csm-admin-decks-table"><thead><tr><th>Deck</th><th>Owner</th><th>Cards / PDFs</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{decks.map(deck => <tr key={deck.id}><td><strong>{deck.title}</strong><small>{deck.subject || 'No subject'} · {deck.open_reports} open report(s)</small></td><td>{deck.owner}</td><td>{deck.card_count} / {deck.document_count}</td><td><span className={`csm-admin-status ${deck.moderation_status === 'hidden' ? 'is-locked' : ''}`}>{deck.moderation_status}</span></td><td><div className="csm-admin-deck-menu">
  <details>
    <summary className="csm-admin-deck-menu-trigger" aria-label={`Actions for ${deck.title}`} title="Deck actions"><svg className="csm-admin-user-more-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary>
    <div className="csm-admin-deck-menu-popover">
      <button type="button" disabled={busy || deckPreviewLoading} onClick={event => { const details = event.currentTarget.closest('details'); deckPreviewTriggerRef.current = details.querySelector('summary'); details.open = false; loadDeckPreview(deck); }}><svg className="csm-admin-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>{deckPreviewLoading && deckPreview?.id === deck.id ? 'Loading...' : 'View deck'}</button>
      <button type="button" disabled={busy} onClick={event => { const details = event.currentTarget.closest('details'); flagTriggerRef.current = details.querySelector('summary'); details.open = false; setFlagDeckTarget(deck); setFlagReason(''); setFlagReasonError(''); }}><svg className="csm-admin-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4c5-4 11 4 16 0v12c-5 4-11-4-16 0"/></svg>Flag for review</button>
      <button type="button" className={deck.moderation_status === 'hidden' ? 'is-restore' : 'is-danger'} disabled={busy} onClick={event => { const details = event.currentTarget.closest('details'); adminActionTriggerRef.current = details.querySelector('summary'); details.open = false; const action = deck.moderation_status === 'hidden' ? 'restore' : 'hide'; requestAdminAction(event, { title: `${action === 'hide' ? 'Hide' : 'Restore'} this deck?`, message: `${action === 'hide' ? 'The owner will lose access to' : 'Make visible to its owner'} \"${deck.title}\". The owner will receive a notification with your review note.`, confirmLabel: action === 'hide' ? 'Hide deck' : 'Restore deck', requiresReason: true, reasonLabel: 'Review note for the owner', success: `Deck ${action === 'hide' ? 'hidden' : 'restored'}.`, action: reason => CSM.api('admin/decks/visibility', 'PATCH', { deckId: deck.id, action, reason }) }); adminActionTriggerRef.current = details.querySelector('summary'); }}><svg className="csm-admin-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{deck.moderation_status === 'hidden' ? <><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></> : <><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.2 4.1"/><path d="M6.6 6.6C3.6 8.3 2 12 2 12s3.5 7 10 7c1 0 2-.2 2.9-.5"/></>}</svg>{deck.moderation_status === 'hidden' ? 'Restore' : 'Hide'}</button>
    </div>
  </details>
</div></td></tr>)}</tbody></table></div> : <div className="csm-admin-empty">No decks match this search.</div>}{deckPagination}</>}
    </div>}
    {section === 'users' && userPagination}

    {section === 'reports' && <div className="csm-admin-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">STAFF REVIEW QUEUE</span><h2>Flagged decks</h2></div><span className="csm-admin-subtle">Private content is only visible to its owner and authorized staff.</span></div>{reports.length ? <div className="csm-admin-report-list">{reports.map(report => <article className="csm-admin-report" key={report.id}><div><span className="csm-admin-status is-locked">Open review</span><h3>{report.deckTitle}</h3><p>{report.subject || 'No subject'} · owner {report.owner} · reported by {report.flaggedBy || 'staff'}</p><blockquote>{report.reason}</blockquote><small>Reported {new Date(`${report.created_at}Z`).toLocaleString()}</small></div><div className="csm-admin-row-actions"><button type="button" className="csm-secondary-button" disabled={busy} onClick={event => requestAdminAction(event, { title: 'Dismiss this report?', message: `This report will be closed without hiding “${report.deckTitle}”. The deck owner will be notified of the review outcome.`, confirmLabel: 'Dismiss report', requiresReason: true, reasonLabel: 'Review note for the owner', success: 'Report dismissed.', action: reason => CSM.api('admin/reports', 'PATCH', { id: Number(report.id), action: 'dismiss', reason }) })}>Dismiss</button><button type="button" className="csm-primary-button" disabled={busy} onClick={event => requestAdminAction(event, { title: 'Hide this deck?', message: `“${report.deckTitle}” will be hidden from its owner. They will receive a notification with your review note.`, confirmLabel: 'Hide deck', requiresReason: true, reasonLabel: 'Review note for the owner', success: 'Deck hidden and moderation action recorded.', action: reason => CSM.api('admin/reports', 'PATCH', { id: Number(report.id), action: 'hide', reason }) })}>Hide deck</button></div></article>)}</div> : <div className="csm-admin-empty">No decks are waiting for review.</div>}</div>}

    {section === 'audit' && isSuper && <>{dateFilters('Security event period', true)}<div className="csm-admin-card"><div className="csm-admin-card-head"><div><span className="csm-kicker">SUPERADMIN ONLY</span><h2>Security event log</h2></div><div className="csm-admin-content-tools"><span className="csm-admin-subtle">IP addresses are stored as one-way hashes.</span><button type="button" className="csm-secondary-button" disabled={busy} onClick={() => downloadAdminCsv(`admin/audit/export&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, `co-studymaxx-security-events-${range.from}-to-${range.to}.csv`, 'Security event log downloaded as CSV.')}><IconDownload />Export CSV</button></div></div>{events.length ? <div className="csm-admin-table-wrap"><table className="csm-admin-table"><thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Target</th><th>IP fingerprint</th><th>Non-sensitive details</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{new Date(`${event.created_at}Z`).toLocaleString()}</td><td><span className="csm-admin-status csm-admin-security-event">{formatAdminEventLabel(event.event)}</span></td><td>{event.actor || 'System'}</td><td>{event.target || '—'}</td><td><code>{event.ip_hash ? event.ip_hash.slice(0, 16) : '—'}</code></td><td><code>{JSON.stringify(event.details)}</code></td></tr>)}</tbody></table></div> : <div className="csm-admin-empty">No security events were recorded in this date range.</div>}</div>{eventPagination}</>}

    {section === 'system' && isSuper && <div className="csm-admin-system-grid">{settings && <>
      <section className="csm-admin-card"><span className="csm-kicker">SERVICE AVAILABILITY</span><h2>Maintenance mode</h2><p>When enabled, regular accounts cannot load or change workspace data. Administrators can continue working; sign-in and sign-out remain available.</p><div className="csm-admin-setting-row"><span className={`csm-admin-status ${settings.maintenanceMode ? 'is-locked' : ''}`}>{settings.maintenanceMode ? 'Enabled' : 'Disabled'}</span><button type="button" className={settings.maintenanceMode ? 'csm-secondary-button' : 'csm-primary-button'} disabled={busy} onClick={event => requestAdminAction(event, { title: `${settings.maintenanceMode ? 'Disable' : 'Enable'} maintenance mode?`, message: settings.maintenanceMode ? 'Regular users will be able to access the workspace again.' : 'Regular users will see the maintenance page. Admins and superadmins can continue working.', confirmLabel: settings.maintenanceMode ? 'Disable maintenance' : 'Enable maintenance', success: `Maintenance mode ${settings.maintenanceMode ? 'disabled' : 'enabled'}.`, action: async () => setSettings(await CSM.api('admin/settings', 'PATCH', { maintenanceMode: !settings.maintenanceMode })) })}>{settings.maintenanceMode ? 'Disable' : 'Enable'}</button></div></section>
      <section className="csm-admin-card"><span className="csm-kicker">DOCUMENT STORAGE</span><h2>Global PDF storage limit</h2><p>Limits the combined stored PDF size across all accounts. Existing files are retained if the limit is reduced.</p><form className="csm-admin-storage-form" onSubmit={event => { event.preventDefault(); const bytes = Math.round(Number(event.currentTarget.elements.storage.value) * 1048576); requestAdminAction(event, { title: 'Update the storage limit?', message: 'The new limit applies across all stored PDFs. Existing files will not be removed.', confirmLabel: 'Save storage limit', success: 'Storage limit updated.', action: async () => setSettings(await CSM.api('admin/settings', 'PATCH', { storageLimitBytes: bytes })) }); }}><label>Limit in MiB<input name="storage" type="number" min="1" max="1048576" step="1" defaultValue={Math.floor(settings.storageLimitBytes / 1048576)} /></label><div className="csm-admin-subtle">Currently used: {(settings.storageUsedBytes / 1048576).toFixed(1)} MiB</div><button type="submit" className="csm-secondary-button" disabled={busy}>Save limit</button></form></section>
      <section className="csm-admin-card csm-admin-danger-card"><span className="csm-kicker">SESSION SECURITY</span><h2>Sign out all users</h2><p>Revokes every active login on every device, including yours. Everyone must sign in again.</p><button type="button" className="csm-admin-danger-button" disabled={busy} onClick={event => requestAdminAction(event, { title: 'Sign out every user?', message: 'This revokes every active login on every device, including yours. Everyone will need to sign in again.', confirmLabel: 'Clear all sessions', danger: true, success: 'All sessions cleared.', action: async () => { const result = await CSM.api('admin/sessions/clear', 'POST', { confirm: true }); setNotice(`${result.sessionsRemoved} sessions cleared; ${result.accountsInvalidated} accounts must sign in again.`); setTimeout(() => location.replace('login.html?mode=signin&reason=session_ended'), 1200); } })}>Clear all sessions</button></section>
    </>}</div>}

    {(userProfileModal || flagDeckTarget || adminActionModal || deckPreview) && ReactDOM.createPortal(<>
      {userProfileModal && <div className="csm-modal-backdrop csm-admin-profile-backdrop" role="presentation" onClick={closeUserProfile}>
        <section className="csm-admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-profile-title" onClick={event => event.stopPropagation()}>
          <header className="csm-admin-profile-header"><div className="csm-admin-profile-identity"><span className="csm-admin-avatar" style={{ background: adminAvatarBackgrounds[userProfileModal.data?.account?.avatar || userProfileModal.account.avatar] || adminAvatarBackgrounds.ember }} aria-hidden="true">{getAccountInitials(userProfileModal.data?.account || userProfileModal.account)}</span><div><span className="csm-kicker">USER PROFILE</span><h2 id="admin-user-profile-title">{userProfileModal.data?.account?.display_name || userProfileModal.account.display_name || userProfileModal.account.username}</h2><p>@{userProfileModal.account.username} · {userProfileModal.data?.account?.email || userProfileModal.account.email || 'No email on file'}</p></div></div><button ref={userProfileCloseRef} type="button" className="csm-admin-preview-close" onClick={closeUserProfile} aria-label="Close user profile">×</button></header>
          {userProfileError && <div className="csm-admin-alert is-error" role="alert">{userProfileError}</div>}
          {userProfileNotice && <div className="csm-admin-alert is-success" role="status">{userProfileNotice}</div>}
          {userProfileLoading ? <div className="csm-admin-empty" role="status">Loading account profile…</div> : userProfileModal.data && <>
            <div className="csm-admin-profile-summary"><span className={`csm-admin-status ${userProfileModal.data.account.banned_at ? 'is-locked' : ''}`}>{userProfileModal.data.account.banned_at ? 'Banned' : userProfileModal.data.account.role}</span><span>Joined {new Date(`${userProfileModal.data.account.created_at}Z`).toLocaleDateString()}</span><span>{userProfileModal.data.account.deck_count} decks · {userProfileModal.data.account.document_count} PDFs</span><span>Last active {userProfileModal.data.account.last_active ? new Date(`${userProfileModal.data.account.last_active}Z`).toLocaleString() : '—'}</span></div>
            {userProfileModal.data.account.banned_at && <div className="csm-admin-alert is-error" role="status">Banned {new Date(`${userProfileModal.data.account.banned_at}Z`).toLocaleString()}: {userProfileModal.data.account.ban_reason || 'No reason recorded.'}</div>}
            <div className="csm-admin-tabs csm-admin-profile-tabs" role="tablist" aria-label="User profile information"><button type="button" role="tab" aria-selected={userProfileTab === 'activity'} className={userProfileTab === 'activity' ? 'active' : ''} onClick={() => setUserProfileTab('activity')}>Activity</button><button type="button" role="tab" aria-selected={userProfileTab === 'submitted'} className={userProfileTab === 'submitted' ? 'active' : ''} onClick={() => setUserProfileTab('submitted')}>Reports submitted ({userProfileModal.data.submittedReports.length})</button><button type="button" role="tab" aria-selected={userProfileTab === 'received'} className={userProfileTab === 'received' ? 'active' : ''} onClick={() => setUserProfileTab('received')}>Reports on decks ({userProfileModal.data.receivedReports.length})</button></div>
            <div className="csm-admin-profile-content">
              {userProfileTab === 'activity' && (userProfileModal.data.activity.length ? <div className="csm-admin-profile-list">{userProfileModal.data.activity.map((item, index) => <article className="csm-admin-profile-activity" key={`${item.created_at}-${index}`}><div><strong>{item.material}</strong><small>{item.mode} · {item.screen} · {item.status}{item.accuracy !== null ? ` · ${Number(item.accuracy)}% accuracy` : ''}</small></div><time>{new Date(`${item.created_at}Z`).toLocaleString()}</time></article>)}</div> : <div className="csm-admin-empty">No study activity has been recorded.</div>)}
              {userProfileTab === 'submitted' && (userProfileModal.data.submittedReports.length ? <div className="csm-admin-profile-list">{userProfileModal.data.submittedReports.map(report => <article className="csm-admin-profile-report" key={report.id}><div><span className={`csm-admin-status ${report.status === 'open' ? 'is-locked' : ''}`}>{report.status}</span><strong>{report.deck_title}</strong><small>Deck owner: {report.deck_owner} · {new Date(`${report.created_at}Z`).toLocaleString()}</small><p>{report.reason}</p></div></article>)}</div> : <div className="csm-admin-empty">This account has not submitted any deck reports.</div>)}
              {userProfileTab === 'received' && (userProfileModal.data.receivedReports.length ? <div className="csm-admin-profile-list">{userProfileModal.data.receivedReports.map(report => <article className="csm-admin-profile-report" key={report.id}><div><span className={`csm-admin-status ${report.status === 'open' ? 'is-locked' : ''}`}>{report.status}</span><strong>{report.deck_title}</strong><small>Reported by: {report.flagged_by || 'Unknown'} · {new Date(`${report.created_at}Z`).toLocaleString()}</small><p>{report.reason}</p></div></article>)}</div> : <div className="csm-admin-empty">No reports have been filed against this account’s decks.</div>)}
            </div>
          </>}
          <footer className="csm-admin-profile-actions"><button type="button" className="csm-secondary-button" onClick={closeUserProfile}>Close</button>{userProfileModal.data?.account.role === 'user' && userProfileModal.account.username !== profile?.username && <>{userProfileModal.data.account.banned_at ? <button type="button" className="csm-secondary-button" disabled={busy} onClick={event => requestAdminAction(event, { title: `Unban ${userProfileModal.account.username}?`, message: 'This will allow the account to sign in again.', confirmLabel: 'Unban account', requiresReason: true, reasonLabel: 'Reason for unbanning', success: 'Account unbanned.', action: async reason => { await CSM.api('admin/users/unban', 'POST', { userId: userProfileModal.account.id, reason }); setUserProfileModal(current => current ? { ...current, data: { ...current.data, account: { ...current.data.account, banned_at: null, ban_reason: null } } } : current); setUserProfileNotice('Account unbanned.'); } })}>Unban</button> : <><button type="button" className="csm-secondary-button" disabled={busy} onClick={event => requestAdminAction(event, { title: `Warn ${userProfileModal.account.username}?`, message: 'The user will receive this warning in their account notifications.', confirmLabel: 'Send warning', requiresReason: true, reasonLabel: 'Warning message and reason', success: 'Warning sent to the user.', action: async reason => { await CSM.api('admin/users/warn', 'POST', { userId: userProfileModal.account.id, reason }); setUserProfileNotice('Warning sent to the user.'); } })}>Warn user</button><button type="button" className="csm-admin-danger-button" disabled={busy} onClick={event => requestAdminAction(event, { title: `Ban ${userProfileModal.account.username}?`, message: 'Banning immediately signs the account out and blocks future sign-ins. Add a reason for the audit record.', confirmLabel: 'Ban account', requiresReason: true, reasonLabel: 'Ban reason', danger: true, success: 'Account banned and signed out.', action: async reason => { await CSM.api('admin/users/ban', 'POST', { userId: userProfileModal.account.id, reason }); setUserProfileModal(current => current ? { ...current, data: { ...current.data, account: { ...current.data.account, banned_at: new Date().toISOString(), ban_reason: reason } } } : current); setUserProfileNotice('Account banned and signed out.'); } })}>Ban user</button></>}</>}</footer>
        </section>
      </div>}
      {flagDeckTarget && <div className="csm-modal-backdrop csm-admin-flag-backdrop" role="presentation" onClick={closeFlagModal}>
        <form className="csm-admin-flag-modal" role="dialog" aria-modal="true" aria-labelledby="admin-flag-title" aria-describedby="admin-flag-description" onSubmit={submitFlagReview} onClick={event => event.stopPropagation()}>
          <div className="csm-admin-flag-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4m0 1h12l-2.5 4L17 13H5" /></svg></div>
          <span className="csm-kicker">CONTENT MODERATION</span>
          <h2 id="admin-flag-title">Flag “{flagDeckTarget.code || flagDeckTarget.title}” for review</h2>
          <p id="admin-flag-description">Tell the moderation team why this reviewer needs attention. Your reason will be included in the private review queue.</p>
          <label className="csm-admin-flag-label" htmlFor="admin-flag-reason">Reason for review</label>
          <textarea id="admin-flag-reason" ref={flagReasonRef} value={flagReason} onChange={event => { setFlagReason(event.target.value); if (flagReasonError) setFlagReasonError(''); }} maxLength={1000} rows={4} placeholder="Describe the concern…" disabled={busy} aria-required="true" aria-invalid={Boolean(flagReasonError)} aria-describedby={flagReasonError ? 'admin-flag-description admin-flag-error' : 'admin-flag-description'} />
          <div className="csm-admin-flag-meta"><span>{flagReason.length}/1000</span>{flagReasonError && <span id="admin-flag-error" className="csm-admin-flag-error" role="alert">{flagReasonError}</span>}</div>
          <div className="csm-admin-flag-actions"><button type="button" className="csm-secondary-button" onClick={closeFlagModal} disabled={busy}>Cancel</button><button type="submit" className="csm-primary-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit flag'}</button></div>
        </form>
      </div>}
      {adminActionModal && <div className="csm-modal-backdrop csm-admin-action-backdrop" role="presentation" onClick={closeAdminActionModal}>
        <form className="csm-admin-action-modal" role="dialog" aria-modal="true" aria-labelledby="admin-action-title" aria-describedby="admin-action-description" onSubmit={submitAdminAction} onClick={event => event.stopPropagation()}>
          <div className={`csm-admin-action-icon ${adminActionModal.danger ? 'is-danger' : ''}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" /><path d="M12 8v4m0 4h.01" /></svg></div>
          <span className="csm-kicker">ADMIN ACTION</span>
          <h2 id="admin-action-title">{adminActionModal.title}</h2>
          <p id="admin-action-description">{adminActionModal.message}</p>
          {adminActionModal.requiresPassword && <>
            <label className="csm-admin-flag-label" htmlFor="admin-action-password">Your current password</label>
            <input id="admin-action-password" ref={adminActionPasswordRef} type="password" autoComplete="current-password" value={adminActionPassword} onChange={event => { setAdminActionPassword(event.target.value); if (adminActionError) setAdminActionError(''); }} maxLength={72} aria-required="true" aria-invalid={Boolean(adminActionError)} aria-describedby={adminActionError ? 'admin-action-description admin-action-password-error' : 'admin-action-description'} />
            {adminActionError && <p id="admin-action-password-error" className="csm-admin-flag-error" role="alert">{adminActionError}</p>}
          </>}
          {adminActionModal.requiresReason && <>
            <label className="csm-admin-flag-label" htmlFor="admin-action-reason">{adminActionModal.reasonLabel || 'Reason'}</label>
            <textarea id="admin-action-reason" ref={adminActionReasonRef} value={adminActionReason} onChange={event => { setAdminActionReason(event.target.value); if (adminActionError) setAdminActionError(''); }} maxLength={1000} rows={4} placeholder="Add a clear note…" aria-required="true" aria-invalid={Boolean(adminActionError)} aria-describedby={adminActionError ? 'admin-action-description admin-action-error' : 'admin-action-description'} />
            <div className="csm-admin-flag-meta"><span>{adminActionReason.length}/1000</span>{adminActionError && <span id="admin-action-error" className="csm-admin-flag-error" role="alert">{adminActionError}</span>}</div>
          </>}
          <div className="csm-admin-flag-actions"><button type="button" className="csm-secondary-button" onClick={closeAdminActionModal} disabled={busy}>Cancel</button><button ref={adminActionConfirmRef} type="submit" className={adminActionModal.danger ? 'csm-admin-danger-button' : 'csm-primary-button'} disabled={busy}>{busy ? 'Working…' : adminActionModal.confirmLabel || 'Continue'}</button></div>
        </form>
      </div>}
      {deckPreview && <div className="csm-modal-backdrop csm-admin-preview-backdrop" role="presentation" onClick={closeDeckPreview}>
        <section className="csm-admin-preview-modal" role="dialog" aria-modal="true" aria-labelledby="admin-preview-title" aria-describedby="admin-preview-description" onClick={event => event.stopPropagation()}>
          <header className="csm-admin-preview-header">
            <div><span className="csm-kicker">AUTHORIZED STAFF · READ ONLY</span><h2 id="admin-preview-title">{deckPreview.title || deckPreview.code || 'Deck preview'}</h2><p>{deckPreview.owner ? `Owned by ${deckPreview.owner}` : 'Loading deck owner…'} · {deckPreview.subject || 'No subject'} · {deckPreview.document_count || 0} PDF(s)</p></div>
            <div className="csm-admin-preview-header-actions"><button type="button" className="csm-secondary-button" onClick={() => loadDeckPreview(deckPreview)} disabled={deckPreviewLoading}>{deckPreviewLoading ? 'Refreshing…' : 'Refresh'}</button><button ref={deckPreviewCloseRef} type="button" className="csm-admin-preview-close" onClick={closeDeckPreview} aria-label="Close deck preview">×</button></div>
          </header>
          <p className="csm-admin-preview-description" id="admin-preview-description">View only this account’s attached PDF materials. Staff access is read-only and recorded for moderation oversight.</p>
          <div className="csm-admin-preview-content">
            {deckPreviewLoading ? <div className="csm-admin-empty" role="status">Loading the latest deck contents…</div> : deckPreviewError ? <div className="csm-admin-alert is-error" role="alert">{deckPreviewError}</div> : <>
              <section className="csm-admin-preview-documents" aria-label="PDF files attached to this deck">
                <div className="csm-admin-preview-documents-heading"><div><span className="csm-kicker">REFERENCE FILES</span><h3>Attached PDFs</h3></div><span className="csm-admin-status">{deckPreview.documents?.length || 0} files</span></div>
                {deckPreview.documents?.length ? <div className="csm-admin-preview-document-list">{deckPreview.documents.map(file => <article className="csm-admin-preview-document" key={file.id}><span className="csm-admin-preview-pdf-icon" aria-hidden="true">PDF</span><div className="csm-admin-preview-document-info"><strong>{file.title}</strong><small>{(Number(file.size) / 1048576).toFixed(2)} MB · Uploaded {new Date(`${file.uploadedAt}Z`).toLocaleDateString()}</small></div><a className="csm-secondary-button" href={file.url} target="_blank" rel="noreferrer">Open PDF ↗</a></article>)}</div> : <div className="csm-admin-empty csm-admin-preview-document-empty">No PDF files are attached to this deck.</div>}
              </section>
            </>}
          </div>
          {deckPreview.updated_at && <footer className="csm-admin-preview-footer">Last updated {new Date(`${deckPreview.updated_at}Z`).toLocaleString()}</footer>}
        </section>
      </div>}
    </>, document.body)}
  </div>;
}

function GuestLockedModal({ section, onClose }) {
  if (!section) return null;

  const configs = {
    home: {
      title: 'Home Dashboard is Locked',
      kicker: 'GUEST ACCESS',
      description: 'The personalized overview, study streak analytics, and activity history are available for registered members.'
    },
    creator: {
      title: 'Deck Creator is Locked',
      kicker: 'GUEST ACCESS',
      description: 'Creating custom Bombcard decks, building new reviewer questions, and importing study notes requires a free Co-StudyMaxx account.'
    },
    profile: {
      title: 'Account Profile is Locked',
      kicker: 'GUEST ACCESS',
      description: 'Profile customizations, avatars, password management, and study statistics are only accessible to signed-in accounts.'
    },
    arena: {
      title: 'Bombstyle Arena is Locked',
      kicker: 'SIGN IN TO PLAY',
      description: 'Timed pressure recall rounds, speed challenges, and leaderboard ranking require an account. Sign in or create a free account to unlock Play Bombstyle!'
    }
  };

  const info = configs[section] || configs.home;

  return (
    <div className="csm-locked-modal-overlay animate-fadeIn" onClick={onClose}>
      <div
        className="csm-locked-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-modal-title"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#fff1ee] border border-[#ffd7cf] text-[#f04824] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <IconLock className="w-6 h-6" />
        </div>

        <span className="csm-kicker text-[#f04824] tracking-widest text-[10px] font-extrabold uppercase">
          {info.kicker}
        </span>
        <h2 id="locked-modal-title" className="text-xl font-extrabold text-slate-800 font-display mt-1 mb-2">
          {info.title}
        </h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {info.description}
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href="login.html?mode=signup"
            className="w-full py-2.5 px-4 bg-[#f04824] hover:bg-[#e03e1b] text-white font-bold text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Create Free Account</span>
            <IconArrowRight />
          </a>
          <a
            href="login.html?mode=signin"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all text-center"
          >
            Sign In with Existing Account
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mt-1"
          >
            Continue Reviewing Deck
          </button>
        </div>
      </div>
    </div>
  );
}

function PeopleScreen({ onPlayDeck }) {
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckError, setDeckError] = useState('');
  const [revealedCards, setRevealedCards] = useState([]);
  const [previewStudyMode, setPreviewStudyMode] = useState(false);
  const [previewStudyIndex, setPreviewStudyIndex] = useState(0);
  const [previewStudyRevealed, setPreviewStudyRevealed] = useState(false);
  const [previewStudyDirection, setPreviewStudyDirection] = useState(1);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const peopleSearchRequestRef = useRef(0);

  const loadPeople = async (term, requestedPage = 0) => {
    const requestId = ++peopleSearchRequestRef.current;
    setBusy(true); setError(''); setSelectedPerson(null); setPage(requestedPage);
    try {
      const result = await CSM.api(`people/search&q=${encodeURIComponent(term)}&limit=12&offset=${requestedPage * 12}`);
      if (requestId !== peopleSearchRequestRef.current) return;
      setPeople(Array.isArray(result.people) ? result.people : []); setTotal(Number(result.total) || 0);
    } catch (requestError) { if (requestId === peopleSearchRequestRef.current) { setError(requestError.message || 'Could not search accounts.'); setPeople([]); setTotal(0); } }
    finally { if (requestId === peopleSearchRequestRef.current) setBusy(false); }
  };

  useEffect(() => {
    const term = search.trim();
    setPage(0);
    if (term.length < 2) {
      peopleSearchRequestRef.current += 1;
      setPeople([]); setTotal(0); setError(''); setBusy(false);
      return undefined;
    }
    const timer = window.setTimeout(() => { loadPeople(term, 0); }, 350);
    return () => { window.clearTimeout(timer); peopleSearchRequestRef.current += 1; };
  }, [search]);

  const searchPeople = (event, requestedPage = 0) => {
    event?.preventDefault();
    const term = search.trim();
    if (term.length < 2) { setError('Enter at least 2 characters to search.'); setPeople([]); setTotal(0); return; }
    loadPeople(term, requestedPage);
  };

  const openPerson = async (person) => {
    setSelectedPerson({ ...person, loading: true }); setSelectedDeck(null); setPreviewStudyMode(false); setError('');
    try {
      const result = await CSM.api(`people/profile&id=${encodeURIComponent(person.id)}`);
      setSelectedPerson(result.person);
    } catch (requestError) { setSelectedPerson(null); setError(requestError.message || 'Could not load this profile.'); }
  };

  const openDeck = async (deck) => {
    setDeckBusy(true); setDeckError(''); setRevealedCards([]); setPreviewStudyMode(false); setPreviewStudyIndex(0); setPreviewStudyRevealed(false); setPreviewStudyDirection(1); setSelectedDeck({ ...deck, loading: true });
    try {
      const result = await CSM.api(`people/deck&id=${encodeURIComponent(deck.id)}`);
      setSelectedDeck(result.deck);
    } catch (requestError) { setSelectedDeck(null); setDeckError(requestError.message || 'This deck is no longer available.'); }
    finally { setDeckBusy(false); }
  };

  const submitDeckReport = async event => {
    event.preventDefault();
    const reason = reportReason.trim();
    if (!selectedDeck || reason.length < 8) { setReportError('Please provide at least 8 characters explaining the issue.'); return; }
    setReportBusy(true); setReportError('');
    try {
      await CSM.api('people/deck/report', 'POST', { deckId: selectedDeck.id, reason });
      setReportModalOpen(false); setReportReason(''); setReportNotice('Your report was sent to the moderation team.');
      window.setTimeout(() => setReportNotice(''), 4500);
    } catch (requestError) { setReportError(requestError.message || 'Could not submit your report.'); }
    finally { setReportBusy(false); }
  };

  return <div className="csm-screen csm-people-screen custom-scroll">
    <div className="csm-page-head"><div><span className="csm-kicker">STUDY COMMUNITY</span><h1>Find people</h1><p>Discover classmates and browse the reviewer decks they’ve chosen to share.</p></div></div>
    {!selectedPerson && !selectedDeck && <section className="csm-account-card csm-people-search-card">
      <form className="csm-people-search-form" onSubmit={searchPeople}>
        <label htmlFor="csm-people-search">Search by username or display name</label>
        <div><input id="csm-people-search" value={search} onChange={event => { const value = event.target.value; setSearch(value); setPage(0); setError(''); setBusy(value.trim().length >= 2); }} placeholder="e.g. maya or Biology" maxLength={60} /><button type="submit" className="csm-primary-button" disabled={busy}>{busy ? 'Searching…' : <><IconSearch className="w-4 h-4 text-white" /> Search</>}</button></div>
      </form>
      {error && <div className="csm-people-feedback is-error" role="status">{error}</div>}
      {!error && !busy && total > 0 && <p className="csm-people-result-count">{total} account{total === 1 ? '' : 's'} found · {people.length} shown</p>}
      {busy ? <div className="csm-people-loading" role="status" aria-live="polite"><span className="csm-people-spinner" /><span>Searching for matching users…</span><div className="csm-people-loading-lines"><i /><i /><i /></div></div> : null}
      {!busy && !error && search.trim().length >= 2 && people.length === 0 && <div className="csm-people-empty">No matching accounts found.</div>}
      {!busy && <div className="csm-people-results">{people.map(person => <article className="csm-people-result" key={person.id} role="button" tabIndex={0} onClick={() => openPerson(person)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openPerson(person); } }}>
        <span className="csm-admin-avatar" style={{ background: adminAvatarBackgrounds[person.avatar] || adminAvatarBackgrounds.ember }} aria-hidden="true">{getAccountInitials({ username: person.username, display_name: person.display_name })}</span>
        <div className="csm-people-result-copy"><strong>{person.display_name}</strong><span>@{person.username}</span><small>{Number(person.public_deck_count) || 0} public deck{Number(person.public_deck_count) === 1 ? '' : 's'}</small></div>
        <button type="button" className="csm-secondary-button" onClick={event => { event.stopPropagation(); openPerson(person); }}>View profile</button>
      </article>)}</div>}
      {total > 12 && <div className="csm-people-pagination"><span>Page {page + 1} of {Math.ceil(total / 12)}</span><button type="button" className="csm-secondary-button" disabled={busy || page === 0} onClick={() => searchPeople(null, page - 1)}>Previous</button><button type="button" className="csm-secondary-button" disabled={busy || (page + 1) * 12 >= total} onClick={() => searchPeople(null, page + 1)}>Next</button></div>}
      {!search.trim() && <div className="csm-people-empty csm-people-hint">Search using at least two characters. Profiles can appear in results while their decks remain private.</div>}
    </section>}

    {(selectedPerson || selectedDeck) && <>
{selectedPerson && <div className="csm-people-inline-preview">
      <section className="csm-account-card csm-people-profile-page" aria-labelledby="csm-people-profile-title">
        <div className="csm-people-preview-nav"><button type="button" className="csm-secondary-button" onClick={() => { setSelectedPerson(null); setDeckError(''); }}>Back to search</button></div>
        <button type="button" className="csm-people-modal-close" onClick={() => setSelectedPerson(null)} aria-label="Close profile">×</button>
        <div className="csm-people-profile-heading"><span className="csm-admin-avatar" style={{ background: adminAvatarBackgrounds[selectedPerson.avatar] || adminAvatarBackgrounds.ember }} aria-hidden="true">{getAccountInitials({ username: selectedPerson.username, display_name: selectedPerson.display_name })}</span><div><span className="csm-kicker">STUDENT PROFILE</span><h2 id="csm-people-profile-title">{selectedPerson.display_name}</h2><p>@{selectedPerson.username}</p></div></div>
        {selectedPerson.loading ? <div className="csm-people-empty">Loading profile…</div> : <>
          <div className="csm-people-deck-heading"><div><h3>Public decks</h3><p>Public decks include their Bombcards and attached PDFs. Private notes and study progress remain private.</p></div><span>{selectedPerson.decks?.length || 0}</span></div>
          {deckError && <div className="csm-people-feedback is-error" role="status">{deckError}</div>}
          {selectedPerson.decks?.length ? <div className="csm-people-decks">{selectedPerson.decks.map(deck => <article className="csm-people-deck" key={deck.id}><div><strong>{deck.title}</strong><span>{deck.subject || 'No subject'} · {deck.card_count} Bombcards</span></div><button type="button" className="csm-secondary-button" disabled={deckBusy} onClick={() => openDeck(deck)}>{deckBusy ? 'Loading…' : 'View deck'}</button></article>)}</div> : <div className="csm-people-empty">This user hasn’t shared any decks.</div>}
        </>}
      </section>
    </div>}

{selectedDeck && <div className="csm-people-inline-preview">
      <section className="csm-account-card csm-people-deck-page" aria-labelledby="csm-people-deck-title">
        <button type="button" className="csm-people-modal-close" onClick={() => setSelectedDeck(null)} aria-label="Close deck">×</button>
<div className="csm-people-deck-title-block">
          <div className="csm-people-deck-title-copy">
            <span className="csm-kicker">PUBLIC REVIEWER</span>
            <h2 id="csm-people-deck-title">{selectedDeck.title}</h2>
            <p className="csm-people-deck-subject">{selectedDeck.subject || 'No subject'} &middot; {selectedDeck.cards?.length || 0} Bombcards</p>
          </div>
          <div className="csm-people-deck-creator" aria-label="Deck creation date">
            <span className="csm-people-deck-creator-copy"><small>Created {selectedDeck.created_at ? new Date(String(selectedDeck.created_at).replace(' ', 'T')).toLocaleDateString() : 'date unavailable'}</small></span>
          </div>
        </div>
        {selectedDeck.loading && <div className="csm-people-loading" role="status"><span className="csm-people-spinner" /><span>Loading shared deck…</span></div>}
        {deckError && <div className="csm-people-feedback is-error">{deckError}</div>}
        <div className="csm-people-deck-actions"><button type="button" className="csm-secondary-button csm-people-report-trigger" onClick={() => { setReportReason(''); setReportError(''); setReportModalOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 21V5m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></svg>Report deck</button><button type="button" className="csm-primary-button" disabled={!selectedDeck.cards?.length} onClick={() => { setSelectedDeck(null); setSelectedPerson(null); onPlayDeck?.(selectedDeck); }}><IconArrowRight /> Play this deck in Arena</button></div>
        {!previewStudyMode && selectedDeck.documents?.length > 0 && <section className="csm-people-public-documents" aria-label="Public PDFs"><h3>PDF materials <span>{selectedDeck.documents.length}</span></h3><div>{selectedDeck.documents.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><IconPdf /><span><strong>{file.title}</strong><small>{(Number(file.size) / 1048576).toFixed(2)} MB · Opens in a new tab</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg></a>)}</div></section>}
        {previewStudyMode && selectedDeck.cards?.length > 0 && (() => {
          const card = selectedDeck.cards[previewStudyIndex];
          const togglePreviewAnswer = () => setPreviewStudyRevealed(value => !value);
          return <section className="csm-people-study-preview" aria-label="Temporary study preview">
            <div className="csm-people-study-preview-heading"><div><span className="csm-kicker">STUDY PREVIEW</span><h3>{selectedDeck.title}</h3><p>This is a preview only. Your study progress and decks won’t be changed.</p></div><button type="button" className="csm-secondary-button" onClick={() => { setPreviewStudyMode(false); setPreviewStudyRevealed(false); }}>Back to deck preview</button></div>
            <div className="csm-people-study-preview-count">Card {previewStudyIndex + 1} of {selectedDeck.cards.length}</div>
            <article key={previewStudyIndex} className={`csm-people-public-card csm-people-study-preview-card slide-${previewStudyDirection > 0 ? 'next' : 'previous'}${previewStudyRevealed ? ' is-flipped' : ''}`}>
              <div className="csm-people-flip-inner">
                <div className="csm-people-flip-face csm-people-flip-front"><span className="csm-people-card-type">BOMB CARD {previewStudyIndex + 1} · {String(card.type || '').replaceAll('_', ' ')}</span><button type="button" className="csm-people-question-face" onClick={togglePreviewAnswer} disabled={previewStudyRevealed} aria-pressed={previewStudyRevealed} aria-label={`Show answer for card ${previewStudyIndex + 1}`}><span className="csm-people-question-label">QUESTION</span><strong>{card.prompt}</strong>{card.options?.length > 0 && <ol>{card.options.map((option, i) => <li key={`${card.id}-${i}`}>{option}</li>)}</ol>}<span className="csm-people-flip-hint">Click to reveal answer</span></button></div>
                <div className="csm-people-flip-face csm-people-flip-back" aria-hidden={!previewStudyRevealed} onClick={event => { if (previewStudyRevealed && !event.target.closest('.csm-people-answer-clickable, button')) togglePreviewAnswer(); }}><span className="csm-people-question-label">ANSWER</span><div className="csm-people-answer csm-people-answer-clickable" role="button" tabIndex={previewStudyRevealed ? 0 : -1} aria-label="Flip back to question" onClick={() => previewStudyRevealed && togglePreviewAnswer()} onKeyDown={event => { if (previewStudyRevealed && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); togglePreviewAnswer(); } }}><strong>{card.correctAnswer}</strong>{card.explanation && <small>{card.explanation}</small>}</div><button type="button" className="csm-people-reveal" onClick={togglePreviewAnswer} disabled={!previewStudyRevealed}>Back to question</button></div>
              </div>
            </article>
            <div className="csm-people-study-preview-controls"><button type="button" className="csm-secondary-button" disabled={previewStudyIndex === 0} onClick={() => { setPreviewStudyDirection(-1); setPreviewStudyIndex(index => index - 1); setPreviewStudyRevealed(false); }}>Previous</button><button type="button" className="csm-primary-button" disabled={previewStudyIndex >= selectedDeck.cards.length - 1} onClick={() => { setPreviewStudyDirection(1); setPreviewStudyIndex(index => index + 1); setPreviewStudyRevealed(false); }}>Next card <IconArrowRight /></button></div>
          </section>;
        })()}
        {!previewStudyMode && <div className="csm-people-preview-limited"><div className="csm-people-public-cards">{selectedDeck.cards?.slice(0, 3).map((card, index) => {
          const flipped = revealedCards.includes(card.id);
          const toggleCard = () => setRevealedCards(current => flipped ? current.filter(id => id !== card.id) : [...current, card.id]);
          return <article className={`csm-people-public-card${flipped ? ' is-flipped' : ''}`} key={card.id}>
            <div className="csm-people-flip-inner">
              <div className="csm-people-flip-face csm-people-flip-front">
                <span className="csm-people-card-type">BOMB CARD {index + 1} · {String(card.type || '').replaceAll('_', ' ')}</span>
                <button type="button" className="csm-people-question-face" onClick={toggleCard} disabled={flipped} aria-pressed={flipped} aria-label={`Show answer for card ${index + 1}`}>
                  <span className="csm-people-question-label">QUESTION</span>
                  <strong>{card.prompt}</strong>
                  {card.options?.length > 0 && <ol>{card.options.map((option, i) => <li key={`${card.id}-${i}`}>{option}</li>)}</ol>}
                  <span className="csm-people-flip-hint">Click to reveal answer</span>
                </button>
              </div>
              <div className="csm-people-flip-face csm-people-flip-back" aria-hidden={!flipped}>
                <span className="csm-people-question-label">ANSWER</span>
                <div className="csm-people-answer csm-people-answer-clickable" role="button" tabIndex={flipped ? 0 : -1} aria-label={`Flip card ${index + 1} back to question`} onClick={() => flipped && toggleCard()} onKeyDown={event => { if (flipped && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleCard(); } }}><strong>{card.correctAnswer}</strong>{card.explanation && <small>{card.explanation}</small>}</div>
                <button type="button" className="csm-people-reveal" onClick={toggleCard} disabled={!flipped}>Back to question</button>
              </div>
            </div>
          </article>;
        })}</div>{selectedDeck.cards?.length > 3 && <div className="csm-people-preview-gate"><div className="csm-people-preview-teaser" aria-hidden="true">{selectedDeck.cards.slice(3, 6).map((card, index) => <article className="csm-people-preview-teaser-card" key={card.id}><span>BOMB CARD {index + 4}</span><strong>{card.prompt}</strong></article>)}</div><div className="csm-people-preview-gate-content"><span>Continue studying</span><p>Study the remaining {selectedDeck.cards.length - 3} Bombcards in a temporary preview. Your progress won’t be saved.</p><button type="button" className="csm-primary-button" onClick={() => { setPreviewStudyIndex(3); setPreviewStudyRevealed(false); setPreviewStudyMode(true); }}>Continue to study <IconArrowRight /></button></div></div>}</div>}
      </section>
    </div>}

    {reportNotice && <div className="csm-people-report-toast" role="status" aria-live="polite">{reportNotice}</div>}
    {reportModalOpen && selectedDeck && ReactDOM.createPortal(<div className="csm-modal-backdrop csm-people-report-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !reportBusy) setReportModalOpen(false); }}>
      <section className="csm-people-report-modal" role="dialog" aria-modal="true" aria-labelledby="csm-people-report-title">
        <button type="button" className="csm-people-modal-close" onClick={() => !reportBusy && setReportModalOpen(false)} aria-label="Close report dialog"><IconClose className="w-4 h-4" /></button>
        <span className="csm-kicker">COMMUNITY MODERATION</span>
        <h2 id="csm-people-report-title">Report this deck</h2>
        <p>Tell us why {selectedDeck.title} should be reviewed. Reports are sent to the moderation team.</p>
        <form onSubmit={submitDeckReport}>
          <label htmlFor="csm-people-report-reason">Reason for report</label>
          <textarea id="csm-people-report-reason" value={reportReason} onChange={event => setReportReason(event.target.value)} maxLength={1000} minLength={8} required placeholder="Describe the issue with this deck..." autoFocus />
          <small>{reportReason.length}/1000 characters</small>
          {reportError && <div className="csm-people-feedback is-error" role="alert">{reportError}</div>}
          <div className="csm-people-report-actions"><button type="button" className="csm-secondary-button" disabled={reportBusy} onClick={() => setReportModalOpen(false)}>Cancel</button><button type="submit" className="csm-primary-button" disabled={reportBusy || reportReason.trim().length < 8}>{reportBusy ? 'Sending...' : 'Submit report'}</button></div>
        </form>
      </section>
    </div>, document.body)}

    </>}
  </div>;
}

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Workspace render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return <div style={{ margin: 'auto', padding: 24, maxWidth: 620, border: '1px solid #dbe3ee', borderRadius: 16, background: '#fff', color: '#18233a', font: '14px system-ui', boxShadow: '0 12px 32px #17243a12' }} role="alert">
        <h1 style={{ margin: '0 0 8px', fontSize: 21 }}>The workspace hit a rendering error</h1>
        <p style={{ margin: '0 0 18px', color: '#64748b', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{this.state.error.message || 'An unexpected rendering error occurred.'}</p>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 14px', border: 0, borderRadius: 9, background: '#f04824', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reload workspace</button>
      </div>;
    }
    return this.props.children;
  }
}

function App({ isGuest = false, sharedDeck = null }) {
  // Navigation: 'home' | 'library' | 'game' | 'arena' | 'account'
  const [guestLockedSection, setGuestLockedSection] = useState(null);
  const initialRole = window.CSM?.initial?.profile?.role || (isGuest ? 'guest' : 'user');
  const isStaffAccount = ['admin', 'superadmin'].includes(initialRole);
  const staffRestrictedScreens = ['library', 'flashcards', 'creator', 'highlighter', 'game', 'arena', 'people'];
  const requestedScreen = new URLSearchParams(window.location.search).get('screen');
  const allowedScreens = ['home', 'library', 'flashcards', 'creator', 'highlighter', 'game', 'arena', 'people', 'account', 'admin', 'archive'];
  const isAdminPath = /\/admin\/?$/i.test(window.location.pathname);
  const initialScreen = isAdminPath ? 'admin' : (allowedScreens.includes(requestedScreen) ? requestedScreen : (isGuest ? 'library' : 'home'));
  const guestAllowedScreens = ['library', 'flashcards', 'arena', 'game'];
  const defaultScreen = isGuest ? (guestAllowedScreens.includes(initialScreen) ? initialScreen : 'library') : initialScreen;
  const [activeTab, setActiveTab] = useState(isStaffAccount && staffRestrictedScreens.includes(defaultScreen) ? 'home' : (!isStaffAccount && defaultScreen === 'admin' ? 'home' : defaultScreen));
  const [sidebarLocked, setSidebarLocked] = useState(readSidebarLockPreference);
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarLockPreference);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const libraryNavExpanded = mobileMenuOpen || ['library', 'flashcards', 'creator', 'highlighter'].includes(activeTab);
  const handleSidebarMouseEnter = () => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      setSidebarExpanded(true);
    }
  };
  const handleSidebarMouseLeave = () => {
    if (!sidebarLocked && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      setSidebarExpanded(false);
    }
  };
  const handleSidebarLockToggle = () => {
    const next = !sidebarLocked;
    setSidebarLocked(next);
    if (next) setSidebarExpanded(true);
    try { window.localStorage.setItem('csm-sidebar-locked', next ? '1' : '0'); }
    catch (error) { }
  };
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsWrapRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signOutConfirmationOpen, setSignOutConfirmationOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [changeConfirmation, setChangeConfirmation] = useState(null);
  const defaultProfile = { displayName: isGuest ? 'Guest Student' : 'Gavin Dave', username: isGuest ? 'guest' : 'gavin_dave', avatar: 'ember', nameChangedAt: null };
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...(window.CSM?.initial?.profile || {}) }));
  const isStaff = !isGuest && ['admin', 'superadmin'].includes(profile.role);
  const openAdminAccess = (section = '') => {
    const adminUrl = window.CSM.adminUrl || 'admin';
    if (['overview', 'content', 'reports', 'users'].includes(section)) {
      const separator = adminUrl.includes('?') ? '&' : '?';
      window.location.assign(`${adminUrl}${separator}section=${encodeURIComponent(section)}`);
      return;
    }
    window.location.assign(adminUrl);
  };
  const refreshNotifications = async () => {
    if (isGuest) return;
    try {
      const result = await CSM.api('notifications');
      setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
      setNotificationsUnread(Number(result.unreadCount) || 0);
    } catch { /* Session handling is surfaced by the shared API client. */ }
  };
  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const dismissOnOutsidePointer = event => {
      if (!notificationsWrapRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    const dismissOnEscape = event => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsidePointer);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [notificationsOpen]);
  useEffect(() => {
    if (isGuest) return;
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 30000);
    const refreshOnNotificationChange = () => refreshNotifications();
    window.addEventListener('csm:notifications-refresh', refreshOnNotificationChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('csm:notifications-refresh', refreshOnNotificationChange);
    };
  }, [isGuest]);
  useEffect(() => {
    if (isGuest && ['home', 'creator', 'account', 'admin'].includes(activeTab)) {
      setGuestLockedSection(activeTab === 'account' ? 'profile' : activeTab);
      setActiveTab('library');
      return;
    }
    if (isStaff && staffRestrictedScreens.includes(activeTab)) setActiveTab('home');
    else if (!isStaff && activeTab === 'admin') setActiveTab('home');
  }, [activeTab, isStaff, isGuest]);
  const [profileNameDraft, setProfileNameDraft] = useState(() => profile.displayName);
  const [profileClock, setProfileClock] = useState(Date.now());
  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);
  const [passwordErrorModal, setPasswordErrorModal] = useState(null);
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState('');
  const [newPasswordDraft, setNewPasswordDraft] = useState('');
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState('');
  const [accountSection, setAccountSection] = useState('profile');
  const [privacySaveStatus, setPrivacySaveStatus] = useState('');

  const [decks, setDecks] = useState(() => window.CSM?.initial?.decks || []);
  const [accountStats, setAccountStats] = useState(() => window.CSM?.initial?.stats || {});
  const [earnedAchievements, setEarnedAchievements] = useState(() => window.CSM?.initial?.achievements || []);
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
    if (isGuest) return;
    const data = await CSM.api('workspace');
    setProfile(data.profile); setDecks(data.decks); setRecentActivities(data.activities);
    setAccountStats(data.stats); setStudyProgress(data.studyProgress); setArenaSessions(data.sessions);
    setEarnedAchievements(data.achievements || []);
    await refreshNotifications();
    return data;
  };

  // --- Library Workshop State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySubjectFilter, setLibrarySubjectFilter] = useState('All subjects');
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedDeckForFolderView, setSelectedDeckForFolderView] = useState(() => (isGuest && sharedDeck) ? sharedDeck : null); // When clicking folder
  const [deckVisibilitySaving, setDeckVisibilitySaving] = useState(false);
  const [deckVisibilityNotice, setDeckVisibilityNotice] = useState(null);
  const deckVisibilityNoticeTimerRef = useRef(null);
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
  const [creatorEditingCardId, setCreatorEditingCardId] = useState(null);
  const [creatorHint, setCreatorHint] = useState('');
  const [creatorOptions, setCreatorOptions] = useState(['', '', '', '']);
  const [creatorCorrectIndex, setCreatorCorrectIndex] = useState(0);
  const [creatorAnswer, setCreatorAnswer] = useState('');
  const [creatorAlternates, setCreatorAlternates] = useState('');
  const [creatorStep, setCreatorStep] = useState(1); // 1 = Question, 2 = Answers & Details
  const [creatorShowHint, setCreatorShowHint] = useState(false);
  const [creatorShowAlternates, setCreatorShowAlternates] = useState(false);
  const [creatorCardAddedAnimation, setCreatorCardAddedAnimation] = useState(false);
  const [creatorSessionCount, setCreatorSessionCount] = useState(0);

  const startEditingBombcard = (deck, card) => {
    if (!card?.id) {
      triggerToast('This Bombcard cannot be edited because it has no saved ID.');
      return;
    }
    const options = Array.isArray(card.options) ? card.options.slice(0, 4).map(option => String(option ?? '')) : [];
    const savedCorrectIndex = Number(card.correctIndex);
    const correctAnswerIndex = options.indexOf(card.correctAnswer);
    setSelectedDeckIds([deck.id]);
    setCreatorTargetDeckId(deck.id);
    setCreatorEditingCardId(card.id);
    setCreatorType(card.type || 'IDENTIFICATION');
    setCreatorPrompt(card.prompt || '');
    setCreatorHint(card.hint || '');
    setCreatorOptions([...options, ...Array(Math.max(0, 4 - options.length)).fill('')]);
    setCreatorCorrectIndex(Number.isInteger(savedCorrectIndex) && savedCorrectIndex >= 0 && savedCorrectIndex < options.length ? savedCorrectIndex : Math.max(0, correctAnswerIndex));
    setCreatorAnswer(card.correctAnswer || '');
    setCreatorAlternates(card.alternates || '');
    setCreatorShowHint(Boolean(card.hint));
    setCreatorShowAlternates(Boolean(card.alternates));
    setCreatorStep(1);
    setOpenMaterialMenuId(null);
    setActiveTab('creator');
  };

  const prepareNewBombcard = () => {
    setCreatorEditingCardId(null);
    setCreatorType('MULTIPLE_CHOICE');
    setCreatorPrompt('');
    setCreatorHint('');
    setCreatorOptions(['', '', '', '']);
    setCreatorCorrectIndex(0);
    setCreatorAnswer('');
    setCreatorAlternates('');
    setCreatorShowHint(false);
    setCreatorShowAlternates(false);
    setCreatorStep(1);
  };

  const handleSaveBombcard = async () => {
    if (!creatorPrompt.trim()) {
      triggerToast('Please enter a question prompt.');
      setCreatorStep(1);
      return;
    }
    if (creatorType === 'MULTIPLE_CHOICE') {
      const filledOptions = creatorOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        triggerToast('Please provide at least 2 multiple choice options.');
        setCreatorStep(2);
        return;
      }
      if (!creatorOptions[creatorCorrectIndex]?.trim()) {
        triggerToast('The designated correct option cannot be blank.');
        setCreatorStep(2);
        return;
      }
    } else {
      if (!creatorAnswer.trim()) {
        triggerToast('Please enter the correct answer.');
        setCreatorStep(2);
        return;
      }
    }

    const targetDeck = decks.find(d => d.id === creatorTargetDeckId) || decks[0];
    if (!targetDeck) return;
    const isEditingCard = Boolean(creatorEditingCardId);

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
      await CSM.api('cards', isEditingCard ? 'PATCH' : 'POST', {
        ...newCard,
        ...(isEditingCard ? { id: creatorEditingCardId } : {}),
        deckId: targetDeck.id
      });
      await refreshWorkspace();
    } catch (error) { triggerToast(error.message); return; }

    recordActivity({
      material: targetDeck.code || targetDeck.title,
      mode: isEditingCard ? 'Bombcard Edit' : 'Bombcard Creation',
      deckId: targetDeck.id,
      screen: 'creator',
      status: isEditingCard ? 'Edited' : 'Card added'
    });

    try { sound.correct(); } catch (_) { }
    triggerToast(isEditingCard ? 'Bombcard changes saved.' : `Bombcard added to ${targetDeck.code || targetDeck.title}!`);
    if (!isEditingCard) {
      setCreatorSessionCount(prev => prev + 1);
      setCreatorCardAddedAnimation(true);
      setTimeout(() => setCreatorCardAddedAnimation(false), 900);
    }

    setCreatorEditingCardId(null);
    setCreatorPrompt('');
    setCreatorHint('');
    setCreatorOptions(['', '', '', '']);
    setCreatorAnswer('');
    setCreatorAlternates('');
    setCreatorCorrectIndex(0);
    setCreatorShowHint(false);
    setCreatorShowAlternates(false);
    setCreatorStep(1);
    if (isEditingCard) setActiveTab('library');
  };

  // --- Dedicated Gemini AI Bombcards Generator State ---
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [aiTargetDeckId, setAiTargetDeckId] = useState(() => window.CSM?.initial?.decks?.[0]?.id || '');
  const [aiSourceType, setAiSourceType] = useState('pdf'); // 'pdf' | 'text'
  const [aiNotes, setAiNotes] = useState('');
  const [aiFormat, setAiFormat] = useState('MIXED'); // 'MIXED' | 'MULTIPLE_CHOICE' | 'IDENTIFICATION'
  const [aiFocus, setAiFocus] = useState('comprehensive'); // 'comprehensive' | 'key_terms' | 'conceptual'
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReviewerDownloading, setAiReviewerDownloading] = useState(false);
  const [aiReviewerImporting, setAiReviewerImporting] = useState(false);
  const [aiReviewerReady, setAiReviewerReady] = useState(null);
  const [aiStage, setAiStage] = useState('input'); // 'input' | 'preview'
  const [aiGeneratedCards, setAiGeneratedCards] = useState([]);
  const [aiCardsAddedModal, setAiCardsAddedModal] = useState(null);

  // Dedicated PDF Extraction & Source Management
  const [aiPdfSourceMode, setAiPdfSourceMode] = useState('upload'); // 'upload' | 'library'
  const [aiUploadedPdfFile, setAiUploadedPdfFile] = useState(null);
  const [aiSelectedLibraryDoc, setAiSelectedLibraryDoc] = useState(null);
  const [aiPdfTotalPages, setAiPdfTotalPages] = useState(0);
  const [aiPdfPageRangeType, setAiPdfPageRangeType] = useState('all'); // 'all' | 'custom'
  const [aiPdfStartPage, setAiPdfStartPage] = useState(1);
  const [aiPdfEndPage, setAiPdfEndPage] = useState(1);
  const [aiExtractingPdf, setAiExtractingPdf] = useState(false);
  const [aiPdfExtractProgress, setAiPdfExtractProgress] = useState('');
  const [aiPdfExtractedSummary, setAiPdfExtractedSummary] = useState(null);
  const [aiShowNotesPreview, setAiShowNotesPreview] = useState(false);
  const [aiSavePdfToDeck, setAiSavePdfToDeck] = useState(true);
  const [aiPdfDragActive, setAiPdfDragActive] = useState(false);
  const aiPdfFileInputRef = useRef(null);

  const extractPdfText = async (source, pageRangeOverride = null) => {
    if (!source) return;
    setAiExtractingPdf(true);
    setAiPdfExtractProgress('Connecting to PDF reader...');
    try {
      const pdfjs = window.pdfjsLib || (await window.pdfjsReady);
      if (!pdfjs) throw new Error('PDF reader could not be initialized.');

      let loadingTask;
      let title = 'Document.pdf';

      if (source.type === 'file') {
        title = source.file.name;
        const arrayBuffer = await source.file.arrayBuffer();
        loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      } else {
        title = source.doc.title;
        loadingTask = pdfjs.getDocument({ url: source.doc.url, withCredentials: true });
      }

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      setAiPdfTotalPages(totalPages);

      const rangeType = pageRangeOverride?.type || aiPdfPageRangeType;
      let start = 1;
      let end = totalPages;

      if (rangeType === 'custom') {
        const reqStart = Number(pageRangeOverride?.start ?? aiPdfStartPage);
        const reqEnd = Number(pageRangeOverride?.end ?? aiPdfEndPage);
        start = Math.max(1, Math.min(reqStart || 1, totalPages));
        end = Math.max(start, Math.min(reqEnd || totalPages, totalPages));
      }

      setAiPdfStartPage(start);
      setAiPdfEndPage(end);

      let extractedFullText = '';
      for (let p = start; p <= end; p++) {
        setAiPdfExtractProgress(`Extracting page ${p} of ${end}...`);
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        let pageStr = '';
        let lastY = null;
        for (const item of textContent.items) {
          if (!item.str) continue;
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageStr += '\n';
          } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
            pageStr += ' ';
          }
          pageStr += item.str;
          lastY = item.transform[5];
        }

        if (pageStr.trim()) {
          extractedFullText += `--- Page ${p} ---\n${pageStr.trim()}\n\n`;
        }
      }

      const cleanText = extractedFullText.trim();
      if (!cleanText) {
        triggerToast('No readable text found in this PDF range. It may be a scanned image.');
        setAiPdfExtractProgress('');
        return;
      }

      setAiNotes(cleanText);
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
      setAiPdfExtractedSummary({
        fileName: title,
        pages: end - start + 1,
        totalPages,
        startPage: start,
        endPage: end,
        wordCount,
        charCount: cleanText.length
      });
      setAiPdfExtractProgress('');
      triggerToast(`✓ Extracted ${wordCount.toLocaleString()} words from ${title}!`);
    } catch (err) {
      console.error(err);
      triggerToast('PDF Extraction failed: ' + (err.message || 'Unknown error'));
      setAiPdfExtractProgress('');
    } finally {
      setAiExtractingPdf(false);
    }
  };

  const handleOpenAiGenerator = (preferredDeckId, docOrFile = null) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    const deckId = preferredDeckId || creatorTargetDeckId || (decks.length > 0 ? decks[0].id : '');
    setAiTargetDeckId(deckId);
    setAiStage('input');
    setAiGeneratorOpen(true);

    if (docOrFile) {
      setAiSourceType('pdf');
      if (docOrFile instanceof File) {
        setAiPdfSourceMode('upload');
        setAiUploadedPdfFile(docOrFile);
        setAiSelectedLibraryDoc(null);
        extractPdfText({ type: 'file', file: docOrFile });
      } else if (docOrFile.url) {
        setAiPdfSourceMode('library');
        setAiSelectedLibraryDoc(docOrFile);
        setAiUploadedPdfFile(null);
        extractPdfText({ type: 'doc', doc: docOrFile });
      }
    } else {
      const targetDeck = decks.find(d => d.id === deckId);
      if (targetDeck?.documents && targetDeck.documents.length > 0) {
        setAiSourceType('pdf');
        setAiPdfSourceMode('library');
        setAiSelectedLibraryDoc(targetDeck.documents[0]);
        setAiUploadedPdfFile(null);
        extractPdfText({ type: 'doc', doc: targetDeck.documents[0] });
      } else {
        setAiSourceType('pdf');
        setAiPdfSourceMode('upload');
      }
    }
  };

  const handleTargetDeckChange = (newDeckId) => {
    setAiTargetDeckId(newDeckId);
    const newDeck = decks.find(d => d.id === newDeckId);
    if (aiSourceType === 'pdf' && aiPdfSourceMode === 'library') {
      if (newDeck?.documents && newDeck.documents.length > 0) {
        setAiSelectedLibraryDoc(newDeck.documents[0]);
        extractPdfText({ type: 'doc', doc: newDeck.documents[0] });
      } else {
        setAiSelectedLibraryDoc(null);
        setAiPdfSourceMode('upload');
      }
    }
  };

  const handlePdfDrop = (e) => {
    e.preventDefault();
    setAiPdfDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setAiUploadedPdfFile(file);
        setAiPdfSourceMode('upload');
        setAiSelectedLibraryDoc(null);
        extractPdfText({ type: 'file', file });
      } else {
        triggerToast('Please drop a valid PDF file.');
      }
    }
  };

  const handlePdfFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setAiUploadedPdfFile(file);
        setAiPdfSourceMode('upload');
        setAiSelectedLibraryDoc(null);
        extractPdfText({ type: 'file', file });
      } else {
        triggerToast('Please select a valid PDF file.');
      }
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiNotes.trim()) {
      triggerToast('Please provide or extract study material first.');
      return;
    }
    setAiLoading(true);

    // If uploading a new PDF and savePdfToDeck is checked, ensure it is added to deck materials
    if (aiSourceType === 'pdf' && aiPdfSourceMode === 'upload' && aiUploadedPdfFile && aiSavePdfToDeck && aiTargetDeckId) {
      try {
        const targetDeck = decks.find(d => d.id === aiTargetDeckId);
        const alreadyExists = (targetDeck?.documents || []).some(d => d.title === aiUploadedPdfFile.name);
        if (!alreadyExists) {
          await CSM.upload(aiTargetDeckId, aiUploadedPdfFile);
          await refreshWorkspace();
        }
      } catch (uploadErr) {
        console.warn('Could not auto-save PDF to deck:', uploadErr);
      }
    }

    try {
      const res = await CSM.api('ai/generate', 'POST', {
        deckId: aiTargetDeckId,
        notes: aiNotes.trim(),
        format: aiFormat,
        focus: aiFocus,
        saveDirectly: false
      });
      if (res && res.cards && res.cards.length > 0) {
        setAiGeneratedCards(res.cards.map(c => ({ ...c, selected: false })));
        setAiStage('preview');
        try { sound.correct(); } catch (_) { }
        triggerToast(`Gemini forged ${res.cards.length} high-yield Bombcards!`);
      } else {
        triggerToast('Could not generate flashcards. Please provide more detailed text.');
      }
    } catch (err) {
      triggerToast(err.message || 'AI Generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAiReviewer = async () => {
    if (aiGeneratedCards.length === 0 || aiReviewerDownloading) return;
    const targetDeck = decks.find(deck => String(deck.id) === String(aiTargetDeckId));
    const deckTitle = targetDeck?.code || targetDeck?.title || 'Gemini Generated';
    setAiReviewerDownloading(true);
    try {
      const result = await CSM.api('ai/reviewer', 'POST', {
        deckTitle,
        notes: aiNotes.trim(),
        cards: aiGeneratedCards.map(({ type, prompt, correctAnswer, options }) => ({ type, prompt, correctAnswer, options }))
      });
      if (!result?.reviewer?.sections?.length) throw new Error('Gemini did not return a usable study reviewer.');
      const artifact = createAiReviewerPdf(result.reviewer, deckTitle);
      setAiReviewerReady({ ...artifact, deckId: targetDeck?.id || '', deckTitle });
    } catch (downloadError) {
      triggerToast(downloadError.message || 'Could not create the study reviewer.');
    } finally {
      setAiReviewerDownloading(false);
    }
  };

  const handleImportAiReviewer = async () => {
    if (!aiReviewerReady?.deckId || aiReviewerImporting) return;
    setAiReviewerImporting(true);
    try {
      const reviewerFile = new File([aiReviewerReady.blob], aiReviewerReady.filename, { type: 'application/pdf' });
      await CSM.upload(aiReviewerReady.deckId, reviewerFile);
      await refreshWorkspace();
      triggerToast('AI-generated reviewer added to Reference Notes.');
      setAiReviewerReady(null);
    } catch (importError) {
      triggerToast(importError.message || 'Could not add the reviewer to Reference Notes.');
    } finally {
      setAiReviewerImporting(false);
    }
  };

  const handleSaveAiCardsToDeck = async () => {
    const cardsToSave = aiGeneratedCards.filter(c => c.selected);
    if (cardsToSave.length === 0) {
      triggerToast('Please select at least one Bombcard to add.');
      return;
    }
    const targetDeck = decks.find(d => d.id === aiTargetDeckId) || decks[0];
    if (!targetDeck) {
      triggerToast('Please select a target deck.');
      return;
    }
    setAiLoading(true);
    try {
      for (const card of cardsToSave) {
        await CSM.api('cards', 'POST', {
          deckId: targetDeck.id,
          type: card.type,
          prompt: card.prompt,
          options: card.options,
          correctIndex: card.correctIndex,
          correctAnswer: card.correctAnswer,
          alternates: card.alternates,
          hint: card.hint
        });
      }
      await refreshWorkspace();
      try { sound.correct(); } catch (_) { }
      setAiCardsAddedModal({ count: cardsToSave.length, deckTitle: targetDeck.code || targetDeck.title });
      setAiGeneratorOpen(false);
      setAiStage('input');
      setAiNotes('');
      setAiGeneratedCards([]);
    } catch (err) {
      triggerToast(err.message || 'Failed saving cards.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadSampleNotes = () => {
    const sample = `Computer Network Topologies and Protocols:
1. Star Topology: In a star topology, each network host is connected to a central hub or switch with a point-to-point connection. If one cable fails, only that computer's connection is affected.
2. Mesh Topology: Every node has a direct connection to every other node (full mesh) or some nodes (partial mesh). It provides maximum redundancy and fault tolerance.
3. TCP (Transmission Control Protocol): Connection-oriented protocol providing reliable, ordered, and error-checked delivery of a stream of octets between applications. Uses a three-way handshake (SYN, SYN-ACK, ACK).
4. UDP (User Datagram Protocol): Connectionless protocol offering lightweight communication without guarantee of delivery, order, or duplicate protection. Often used for real-time video streaming, DNS, and online gaming.
5. ARP (Address Resolution Protocol): Resolves an IP address (Network Layer) to a physical MAC address (Data Link Layer).
6. DNS (Domain Name System): Operates on Port 53, translates human-readable domain names (e.g., example.com) to machine-routable IP addresses.`;
    setAiNotes(sample);
    triggerToast('Loaded sample computer networking notes.');
  };

  // --- Bombstyle Arena State Controller ---
  const [bombstylePhase, setBombstylePhase] = useState('select_deck'); // 'select_deck' | 'configure' | 'countdown' | 'gameplay' | 'results' | 'review_missed'
  const [bombstyleCountdown, setBombstyleCountdown] = useState(3);
  const [bombstyleDeckId, setBombstyleDeckId] = useState(() => window.CSM?.initial?.decks?.[0]?.id || '');
  const [publicArenaDeck, setPublicArenaDeck] = useState(null);
  const [bombstyleDifficulty, setBombstyleDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'
  const [bombstyleQueue, setBombstyleQueue] = useState([]);
  const [bombstyleIndex, setBombstyleIndex] = useState(0);
  const [bombstyleRevealed, setBombstyleRevealed] = useState(false);
  const [bombstyleAnswerDraft, setBombstyleAnswerDraft] = useState('');
  const [bombstyleAnswerError, setBombstyleAnswerError] = useState('');
  const bombstyleAnswerInputRef = useRef(null);
  const [bombstyleTimeRemaining, setBombstyleTimeRemaining] = useState(45);
  const [bombstyleStreak, setBombstyleStreak] = useState(0);
  const [bombstyleMaxStreak, setBombstyleMaxStreak] = useState(0);
  const [bombstyleCorrectCount, setBombstyleCorrectCount] = useState(0);
  const [bombstyleMissedCards, setBombstyleMissedCards] = useState([]);
  const [bombstyleStartTime, setBombstyleStartTime] = useState(null);
  const [bombstyleDurationSeconds, setBombstyleDurationSeconds] = useState(0);
  const [bombstyleSessionId, setBombstyleSessionId] = useState(null);
  const [bombstyleFeedback, setBombstyleFeedback] = useState(null); // 'defused' | 'exploded' | null
  const [bombstyleTimerHelpOpen, setBombstyleTimerHelpOpen] = useState(false);
  const [bombstyleExitModalOpen, setBombstyleExitModalOpen] = useState(false);
  const pendingBombstyleExitActionRef = useRef(null);
  const [selectedDeckIds, setSelectedDeckIds] = useState(() => (isGuest && sharedDeck) ? [sharedDeck.id] : [window.CSM?.initial?.decks?.[0]?.id].filter(Boolean));
  const [soundMuted, setSoundMuted] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardDragX, setFlashcardDragX] = useState(0);
  const [flashcardIsDragging, setFlashcardIsDragging] = useState(false);
  const [flashcardSwipePhase, setFlashcardSwipePhase] = useState('');
  const flashcardDragRef = useRef(null);
  const ignoreFlashcardClickRef = useRef(false);
  const flashcardMotionTimerRef = useRef(null);
  const flashcardMotionLockRef = useRef(false);
  const navigateFlashcardRef = useRef(null);
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

  // PDF Learning Workspace States
  const [pdfZoom, setPdfZoom] = useState(1.0);
  const [pdfSearchOpen, setPdfSearchOpen] = useState(false);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfSearchResults, setPdfSearchResults] = useState([]);
  const [pdfSearching, setPdfSearching] = useState(false);
  const [workspaceSidebarTab, setWorkspaceSidebarTab] = useState('flashcards');
  const [documentNotes, setDocumentNotes] = useState([]);
  const [documentNotesLoading, setDocumentNotesLoading] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteFormTitle, setNoteFormTitle] = useState('');
  const [noteFormContent, setNoteFormContent] = useState('');
  const [noteFormPage, setNoteFormPage] = useState(1);
  const [noteEditingId, setNoteEditingId] = useState(null);
  const [studyDecks, setStudyDecks] = useState([]);
  const [activeStudyDeckId, setActiveStudyDeckId] = useState(null);
  const [studyCards, setStudyCards] = useState([]);
  const [studyCardsLoading, setStudyCardsLoading] = useState(false);
  const [cardComposerOpen, setCardComposerOpen] = useState(false);
  const [cardFormQuestion, setCardFormQuestion] = useState('');
  const [cardFormAnswer, setCardFormAnswer] = useState('');
  const [cardFormExplanation, setCardFormExplanation] = useState('');
  const [cardFormTags, setCardFormTags] = useState('');
  const [cardFormSourcePage, setCardFormSourcePage] = useState(1);
  const [reviewingDeck, setReviewingDeck] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiAssistantResponse, setAiAssistantResponse] = useState(null);
  const [aiExplainLevel, setAiExplainLevel] = useState('concise');

  // Auto-save last read page with debounce
  useEffect(() => {
    if (!activeDocument?.id || isGuest || pdfPage <= 0) return;
    const timer = setTimeout(() => {
      CSM.api('documents/page', 'POST', { documentId: activeDocument.id, page: pdfPage }).catch(() => { });
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeDocument?.id, pdfPage, isGuest]);

  // Load study flashcards when active deck changes
  useEffect(() => {
    if (!activeStudyDeckId || isGuest) {
      setStudyCards([]);
      return;
    }
    setStudyCardsLoading(true);
    CSM.api('study-cards&deckId=' + encodeURIComponent(activeStudyDeckId))
      .then(res => setStudyCards(res?.cards || []))
      .catch(err => console.warn(err))
      .finally(() => setStudyCardsLoading(false));
  }, [activeStudyDeckId, isGuest]);

  // In-document text search
  const handlePdfSearch = async (query = pdfSearchQuery) => {
    if (!activeDocument?.id || !query.trim()) {
      setPdfSearchResults([]);
      return;
    }
    setPdfSearching(true);
    try {
      const res = await CSM.api('documents/search&documentId=' + encodeURIComponent(activeDocument.id) + '&q=' + encodeURIComponent(query.trim()));
      setPdfSearchResults(res?.results || []);
      if (!res?.results?.length) {
        triggerToast('No matches found for "' + query.trim() + '"');
      } else {
        triggerToast(`Found matches on ${res.results.length} page(s)`);
      }
    } catch (e) {
      triggerToast('Search error: ' + e.message);
    } finally {
      setPdfSearching(false);
    }
  };

  // AI Assistant Handlers
  const handleAiExplain = async (text, level = aiExplainLevel) => {
    if (!text?.trim()) return triggerToast('Select text first.');
    setAiThinking(true);
    try {
      const res = await CSM.api('ai/explain', 'POST', {
        text: text.trim(),
        level,
        documentId: activeDocument?.id,
        page: pdfPage
      });
      setAiAssistantResponse({ type: 'explain', text: text.trim(), result: res.explanation });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAiSummarize = async (text) => {
    setAiThinking(true);
    try {
      const res = await CSM.api('ai/summarize', 'POST', {
        text: text ? text.trim() : '',
        documentId: activeDocument?.id,
        page: pdfPage
      });
      setAiAssistantResponse({ type: 'summary', text: text || '', result: res.summary });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAiQuestions = async (text) => {
    setAiThinking(true);
    try {
      const res = await CSM.api('ai/questions', 'POST', {
        text: text ? text.trim() : '',
        documentId: activeDocument?.id,
        page: pdfPage,
        count: 4
      });
      setAiAssistantResponse({ type: 'questions', text: text || '', questions: res.questions || [] });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAiNotes = async (text, saveDirectly = false) => {
    setAiThinking(true);
    setWorkspaceSidebarTab('notes');
    try {
      const res = await CSM.api('ai/notes', 'POST', {
        text: text ? text.trim() : '',
        documentId: activeDocument?.id,
        page: pdfPage,
        save: saveDirectly
      });
      if (res?.saved && activeDocument?.id) {
        CSM.api('document-notes&documentId=' + encodeURIComponent(activeDocument.id)).then(r => setDocumentNotes(r?.notes || [])).catch(() => { });
        triggerToast('Saved structured note to document!');
      }
      setAiAssistantResponse({ type: 'note', text: text || '', note: res.note });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAiFlashcards = async (text) => {
    setAiThinking(true);
    setWorkspaceSidebarTab('flashcards');
    try {
      const res = await CSM.api('ai/flashcards', 'POST', {
        text: text ? text.trim() : '',
        documentId: activeDocument?.id,
        page: pdfPage,
        deckId: activeStudyDeckId,
        count: 5
      });
      if (res?.saved && activeStudyDeckId) {
        CSM.api('study-cards&deckId=' + encodeURIComponent(activeStudyDeckId)).then(r => setStudyCards(r?.cards || [])).catch(() => { });
        const targetDeck = decks.find(deck => deck.id === activeStudyDeckId);
        setAiCardsAddedModal({ count: Number(res.saved), deckTitle: targetDeck?.code || targetDeck?.title || 'your deck' });
      }
      setAiAssistantResponse({ type: 'flashcards', text: text || '', cards: res.cards || [], saved: res.saved });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAiAsk = async (prompt) => {
    if (!prompt?.trim()) return;
    setAiThinking(true);
    try {
      const res = await CSM.api('ai/explain', 'POST', {
        text: prompt.trim(),
        level: 'detailed',
        documentId: activeDocument?.id,
        page: pdfPage
      });
      setAiAssistantResponse({ type: 'explain', text: prompt.trim(), result: res.explanation });
    } catch (e) {
      triggerToast('AI error: ' + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  // Document Notes Handlers
  const handleSaveDocumentNote = async (noteData) => {
    if (!activeDocument?.id) return;
    try {
      if (noteData.id) {
        await CSM.api('document-notes', 'PATCH', {
          id: noteData.id,
          title: noteData.title,
          content: noteData.content,
          page: noteData.page
        });
        triggerToast('Note updated.');
      } else {
        await CSM.api('document-notes', 'POST', {
          documentId: activeDocument.id,
          title: noteData.title,
          content: noteData.content,
          page: noteData.page
        });
        triggerToast('Note created.');
      }
      const res = await CSM.api('document-notes&documentId=' + encodeURIComponent(activeDocument.id));
      setDocumentNotes(res?.notes || []);
    } catch (e) {
      triggerToast('Failed to save note: ' + e.message);
    }
  };

  const handleDeleteDocumentNote = async (noteId) => {
    if (!activeDocument?.id || !noteId) return;
    try {
      await CSM.api('document-notes', 'DELETE', { id: noteId });
      setDocumentNotes(prev => prev.filter(n => n.id !== noteId));
      triggerToast('Note removed.');
    } catch (e) {
      triggerToast('Could not delete note: ' + e.message);
    }
  };

  // Study Flashcards Handlers
  const handleCreateStudyDeck = async (title) => {
    const cleanTitle = canonicalDeckTitle(title);
    if (!cleanTitle) return false;
    if (studyDecks.some(deck => deckTitleKey(deck.title) === deckTitleKey(cleanTitle))) {
      triggerToast('A study deck with this title already exists.');
      return false;
    }
    try {
      const created = await CSM.api('study-decks', 'POST', {
        title: cleanTitle,
        documentId: activeDocument?.id || null
      });
      setStudyDecks(prev => [created, ...prev]);
      setActiveStudyDeckId(created.id);
      triggerToast(`Deck "${cleanTitle}" created.`);
      return true;
    } catch (e) {
      triggerToast('Could not create deck: ' + e.message);
      return false;
    }
  };

  const handleSaveStudyCard = async (cardData) => {
    try {
      await CSM.api('study-cards', 'POST', cardData);
      triggerToast('Flashcard added to deck.');
      if (activeStudyDeckId) {
        const res = await CSM.api('study-cards&deckId=' + encodeURIComponent(activeStudyDeckId));
        setStudyCards(res?.cards || []);
      }
    } catch (e) {
      triggerToast('Could not save flashcard: ' + e.message);
    }
  };

  const handleDeleteStudyCard = async (cardId) => {
    try {
      await CSM.api('study-cards', 'DELETE', { id: cardId });
      setStudyCards(prev => prev.filter(c => c.id !== cardId));
      triggerToast('Flashcard removed.');
    } catch (e) {
      triggerToast('Could not delete flashcard: ' + e.message);
    }
  };

  // Quick action from floating selection bar (Vaia Magic Marker)
  const handleQuickAction = (action, text, color) => {
    if (action === 'note') {
      setNoteFormTitle(`Note: Page ${pdfPage}`);
      setNoteFormContent(`“${text}”\n\n`);
      setNoteFormPage(pdfPage);
      setNoteEditingId(null);
      setNoteComposerOpen(true);
      setWorkspaceSidebarTab('notes');
    } else if (action === 'card') {
      setCardFormQuestion(text);
      setCardFormAnswer('');
      setCardFormExplanation('');
      setCardFormTags('');
      setCardFormSourcePage(pdfPage);
      setCardComposerOpen(true);
      setWorkspaceSidebarTab('flashcards');
    } else if (action === 'highlight') {
      if (color) setHighlightColor(color);
      savePdfSelection(color);
    }
  };

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


  // --- Stats Computation ---
  const totalReviewers = decks.length;
  const totalBombCards = useMemo(() => decks.reduce((acc, d) => acc + d.cards.length, 0), [decks]);
  const totalDocuments = useMemo(() => decks.reduce((acc, d) => acc + (d.documents?.length || 0), 0), [decks]);
  const currentStudyStreak = Number(accountStats.studyDays) || 0;
  const bestStudyStreak = Number(accountStats.studyBestDays) || 0;
  const studyStreakLost = currentStudyStreak === 0 && bestStudyStreak > 0;
  const formatTrend = value => `${Number(value) < 0 ? '\u2193' : '\u2191'} ${Math.abs(Number(value) || 0)}%`;
  const activityChart = Array.isArray(accountStats.activityChart) ? accountStats.activityChart : [];
  const arenaChart = Array.isArray(accountStats.arenaChart) ? accountStats.arenaChart : [];
  const activityChartMax = Math.max(1, ...arenaChart.flatMap(day => [Number(day.current) || 0, Number(day.previous) || 0]));
  const activeFlashcardDeck = useMemo(() => decks.find(d => d.id === selectedDeckIds[0]) || decks[0], [decks, selectedDeckIds]);
  const activeDeckProgress = useMemo(() => studyProgress.filter(item => item.deck_id === activeFlashcardDeck?.id), [studyProgress, activeFlashcardDeck?.id]);
  const activeDeckKnownAnswers = activeDeckProgress.reduce((total, item) => total + (Number(item.times_known) || 0), 0);
  const activeDeckUnknownAnswers = activeDeckProgress.reduce((total, item) => total + (Number(item.times_unknown) || 0), 0);
  const activeDeckAccuracy = activeDeckKnownAnswers + activeDeckUnknownAnswers
    ? Math.round(activeDeckKnownAnswers / (activeDeckKnownAnswers + activeDeckUnknownAnswers) * 100)
    : 0;
  const activeDeckMissedCount = activeDeckProgress.filter(item => (Number(item.times_unknown) || 0) > (Number(item.times_known) || 0)).length;

  const mostRecentDeck = useMemo(() => {
    if (recentActivities && recentActivities.length > 0) {
      const recentWithDeck = recentActivities.find(a => a.deckId && decks.some(d => d.id === a.deckId));
      if (recentWithDeck) {
        return decks.find(d => d.id === recentWithDeck.deckId) || decks[0] || null;
      }
    }
    return decks[0] || null;
  }, [decks, recentActivities]);

  const todayDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const todayChartItem = activityChart.find(item => item.day === todayDayName);
  const todayActivityCount = Number(todayChartItem?.current) || 0;
  const dailyGoalTarget = 20;
  const dailyGoalPercent = Math.min(100, Math.round((todayActivityCount / dailyGoalTarget) * 100));

  const totalWeekActivity = useMemo(() => {
    return arenaChart.reduce((acc, item) => acc + (Number(item.current) || 0), 0);
  }, [arenaChart]);

  const deckMasteryList = useMemo(() => {
    return decks.slice(0, 4).map(deck => {
      const deckCards = deck.cards || [];
      const deckProgress = studyProgress.filter(p => p.deck_id === deck.id);
      const knownCount = deckProgress.filter(p => p.status === 'known' || (Number(p.times_known) || 0) > (Number(p.times_unknown) || 0)).length;
      const masteryPct = deckCards.length ? Math.min(100, Math.round((knownCount / deckCards.length) * 100)) : 0;
      return {
        ...deck,
        masteryPct,
        knownCount,
        totalCards: deckCards.length
      };
    });
  }, [decks, studyProgress]);

  const badgesList = useMemo(() => {
    const hasDecks = earnedAchievements.includes('first_deck');
    const hasStreak = earnedAchievements.includes('streak_starter');
    const hasArena = earnedAchievements.includes('arena_warrior');
    const hasDocs = earnedAchievements.includes('pdf_scholar');
    const hasAccuracy = earnedAchievements.includes('master_mind');

    return [
      { id: 'first_deck', icon: <i className="bi bi-bullseye text-red-500 text-lg"></i>, title: 'First Reviewer', desc: 'Created a study deck', unlocked: hasDecks, progress: hasDecks ? 'Unlocked' : `${totalReviewers}/1` },
      { id: 'streak_starter', icon: <i className="bi bi-fire text-orange-500 text-lg"></i>, title: 'Streak Flame', desc: 'Active study streak', unlocked: hasStreak, progress: hasStreak ? `${accountStats.studyDays || 0}d` : '0d' },
      { id: 'arena_warrior', icon: <i className="bi bi-lightning-charge-fill text-amber-500 text-lg"></i>, title: 'Arena Champion', desc: 'Completed Arena match', unlocked: hasArena, progress: hasArena ? 'Unlocked' : `${arenaSessions?.length || 0}/1` },
      { id: 'pdf_scholar', icon: <i className="bi bi-journal-bookmark-fill text-blue-500 text-lg"></i>, title: 'PDF Scholar', desc: 'Added study documents', unlocked: hasDocs, progress: hasDocs ? 'Unlocked' : `${totalDocuments}/1` },
      { id: 'master_mind', icon: <i className="bi bi-lightbulb-fill text-purple-500 text-lg"></i>, title: 'Sharp Recall', desc: 'Achieved 75%+ accuracy', unlocked: hasAccuracy, progress: hasAccuracy ? `${accountStats.accuracy}%` : `${accountStats.accuracy || 0}%/75%` },
    ];
  }, [earnedAchievements, totalReviewers, accountStats, arenaSessions, totalDocuments, totalBombCards]);

  const flashcards = activeFlashcardDeck?.cards || [];
  const activeFlashcard = flashcards[flashcardIndex] || flashcards[0];
  const flipFlashcard = () => {
    if (!isGuest && !flashcardFlipped && activeFlashcard?.id) CSM.api('study/progress', 'POST', { bombcardId: activeFlashcard.id, result: 'seen' }).then(() => CSM.api('study/progress').then(setStudyProgress)).catch(error => console.warn('Study progress was not saved:', error));
    setFlashcardFlipped(value => !value);
  };
  const navigateFlashcard = (direction) => {
    if (flashcardMotionLockRef.current) return;
    const nextIndex = Math.max(0, Math.min(Math.max(flashcards.length - 1, 0), flashcardIndex + direction));
    if (nextIndex === flashcardIndex) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setFlashcardIndex(nextIndex);
      setFlashcardFlipped(false);
      return;
    }
    flashcardMotionLockRef.current = true;
    window.clearTimeout(flashcardMotionTimerRef.current);
    setFlashcardFlipped(false);
    setFlashcardSwipePhase(direction > 0 ? 'exit-left' : 'exit-right');
    flashcardMotionTimerRef.current = window.setTimeout(() => {
      setFlashcardIndex(nextIndex);
      setFlashcardDragX(0);
      setFlashcardSwipePhase(direction > 0 ? 'enter-right' : 'enter-left');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setFlashcardSwipePhase(direction > 0 ? 'settle-from-right' : 'settle-from-left');
      }));
      flashcardMotionTimerRef.current = window.setTimeout(() => {
        setFlashcardSwipePhase('');
        flashcardMotionLockRef.current = false;
      }, 240);
    }, 180);
  };
  navigateFlashcardRef.current = navigateFlashcard;
  const handleFlashcardPointerDown = (event) => {
    if (flashcardMotionLockRef.current || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    flashcardDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    setFlashcardIsDragging(true);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) { }
  };
  const handleFlashcardPointerMove = (event) => {
    const start = flashcardDragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    setFlashcardDragX(Math.abs(deltaX) > Math.abs(deltaY) ? Math.max(-140, Math.min(140, deltaX)) : 0);
  };
  const handleFlashcardPointerUp = (event) => {
    const start = flashcardDragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    flashcardDragRef.current = null;
    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    setFlashcardIsDragging(false);
    if (Math.abs(deltaX) >= 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      ignoreFlashcardClickRef.current = true;
      window.setTimeout(() => { ignoreFlashcardClickRef.current = false; }, 500);
      if (deltaX < 0 && flashcardIndex < flashcards.length - 1) navigateFlashcard(1);
      else if (deltaX > 0 && flashcardIndex > 0) navigateFlashcard(-1);
    }
    setFlashcardDragX(0);
  };
  const handleFlashcardPointerCancel = () => {
    flashcardDragRef.current = null;
    setFlashcardIsDragging(false);
    setFlashcardDragX(0);
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
    if (isGuest) return;
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
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedBombcardIds, setSelectedBombcardIds] = useState([]);

  const currentSelectedDeck = useMemo(() => {
    if (!selectedDeckForFolderView) return null;
    return decks.find(d => d.id === selectedDeckForFolderView.id) || selectedDeckForFolderView;
  }, [decks, selectedDeckForFolderView]);

  useEffect(() => {
    setBulkDeleteMode(false);
    setSelectedBombcardIds([]);
  }, [selectedDeckForFolderView?.id]);

  const visibleCards = useMemo(() => {
    if (!currentSelectedDeck || !currentSelectedDeck.cards) return [];
    if (showAllBombcards) return currentSelectedDeck.cards;
    return currentSelectedDeck.cards.slice(0, 3);
  }, [currentSelectedDeck, showAllBombcards]);

  const handleSelectDeckForDetail = (deck) => {
    setSelectedDeckForFolderView(deck);
    setShowAllBombcards(false);
    setBulkDeleteMode(false);
    setSelectedBombcardIds([]);
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
  const [shareDeckTarget, setShareDeckTarget] = useState(null);
  const [shareModalData, setShareModalData] = useState(null);
  const [shareModalLoading, setShareModalLoading] = useState(false);
  const [shareModalError, setShareModalError] = useState('');
  const [shareModalCopied, setShareModalCopied] = useState(false);

  // Section collapsing states
  const [collapseRecent, setCollapseRecent] = useState(false);
  const [collapseOlder, setCollapseOlder] = useState(false);

  const folderNameDuplicate = useMemo(() => {
    const titleKey = deckTitleKey(folderNameInput);
    if (!titleKey) return false;
    const originalKey = targetFolderForEdit ? deckTitleKey(targetFolderForEdit.title || targetFolderForEdit.code) : '';
    if (targetFolderForEdit && titleKey === originalKey) return false;
    return decks.some(deck => deck.id !== targetFolderForEdit?.id && deckTitleKey(deck.title || deck.code) === titleKey);
  }, [decks, folderNameInput, targetFolderForEdit]);

  const handleOpenEditFolderInfo = (deck, e) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    if (e) e.stopPropagation();
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(deck);
    setFolderNameInput(deck.code || deck.title);
    setFolderDescInput(deck.subject || '');
    setFolderInfoModalOpen(true);
  };

  const handleOpenCreateFolderInfo = () => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(null);
    setFolderNameInput('');
    setFolderDescInput('');
    setFolderInfoModalOpen(true);
  };

  const handleSaveFolderInfo = async (e) => {
    if (e) e.preventDefault();
    if (isGuest) { setGuestLockedSection('creator'); return; }
    const title = canonicalDeckTitle(folderNameInput);
    if (!title) {
      triggerToast('Please enter a deck title');
      return;
    }
    if (folderNameDuplicate) {
      triggerToast('A deck with this title already exists.');
      return;
    }

    try {
      const savedDeck = await CSM.api('decks', targetFolderForEdit ? 'PATCH' : 'POST', {
        ...(targetFolderForEdit ? { id: targetFolderForEdit.id } : {}),
        title, subject: folderDescInput.trim(), category: targetFolderForEdit?.category || 'Recent'
      });
      await refreshWorkspace();
      if (targetFolderForEdit) {
        // Edit ONLY folder name & description (NOT content)
        triggerToast(`Updated folder "${title}"`);
        showChangeConfirmation('Deck updated', `Your changes to "${title}" were saved.`);
      } else {
        // Create new folder
        setSelectedDeckIds(prev => [...prev, savedDeck.id]);
        triggerToast(`Created new folder "${title}"`);
        showChangeConfirmation('Deck created', `"${title}" is ready for your study materials.`);
      }

      setFolderInfoModalOpen(false);
      setTargetFolderForEdit(null);
    } catch (error) { triggerToast(error.message); }
  };

  const handleDeleteFolder = (deckId, e) => {
    if (e) e.stopPropagation();
    if (isGuest) { setGuestLockedSection('creator'); return; }
    const target = decks.find(d => d.id === deckId);
    setOpenDeckMenuId(null);
    setDeleteDeckTarget(target || { id: deckId, code: 'this deck', title: 'this deck' });
  };

  const handleRemoveDocument = (deckId, docId) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
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

  const handleRemoveBombcard = (deck, cardId) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    const card = deck?.cards?.find(item => item.id === cardId);
    if (!deck || !card) return;
    setOpenMaterialMenuId(null);
    requestDeleteConfirmation({
      title: 'Delete this Bombcard?',
      message: `“${card.prompt}” will be permanently removed from ${deck.code || deck.title}.`,
      confirmLabel: 'Delete Bombcard',
      action: async () => {
        try {
          await CSM.api('cards', 'DELETE', { id: cardId, deckId: deck.id });
          setRevealedLibraryCards(current => current.filter(id => id !== cardId));
          await refreshWorkspace();
        } catch (error) {
          triggerToast(error.message);
          return;
        }
        triggerToast('Bombcard deleted');
        showChangeConfirmation('Bombcard deleted', 'The Bombcard was removed from this reviewer.');
      }
    });
  };

  const handleBulkRemoveBombcards = (deck) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    const ids = (deck?.cards || []).map(card => card.id).filter(id => selectedBombcardIds.includes(id));
    if (!deck || ids.length === 0) return;
    requestDeleteConfirmation({
      title: `Delete ${ids.length} Bombcard${ids.length === 1 ? '' : 's'}?`,
      message: `The selected Bombcards will be permanently removed from ${deck.code || deck.title}. This cannot be undone.`,
      confirmLabel: `Delete ${ids.length} card${ids.length === 1 ? '' : 's'}`,
      action: async () => {
        try {
          await CSM.api('cards/bulk-delete', 'POST', { deckId: deck.id, ids });
          setRevealedLibraryCards(current => current.filter(id => !ids.includes(id)));
          setSelectedBombcardIds([]);
          setBulkDeleteMode(false);
          await refreshWorkspace();
        } catch (error) {
          triggerToast(error.message);
          return;
        }
        triggerToast(`${ids.length} Bombcard${ids.length === 1 ? '' : 's'} deleted`);
        showChangeConfirmation('Bombcards deleted', `${ids.length} selected Bombcard${ids.length === 1 ? ' was' : 's were'} removed from this reviewer.`);
      }
    });
  };

  const handleOpenDeckStudy = (deck, mode = 'flashcards') => {
    if (isGuest && (mode === 'game' || mode === 'arena')) {
      setGuestLockedSection('arena');
      return;
    }
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
    setPdfZoom(1.0);
    setPdfSearchQuery('');
    setPdfSearchResults([]);
    setPdfSearchOpen(false);
    setWorkspaceSidebarTab('flashcards');
    setAiAssistantResponse(null);
    if (!isGuest) {
      CSM.api('highlights&documentId=' + encodeURIComponent(document.id)).then(setHighlights).catch(error => triggerToast(error.message));
      // Restore last viewed reading page
      CSM.api('documents/page&documentId=' + encodeURIComponent(document.id)).then(res => {
        if (res?.last_page && Number(res.last_page) > 1) {
          setPdfPage(Number(res.last_page));
        }
      }).catch(() => { });
      // Load document notes
      setDocumentNotesLoading(true);
      CSM.api('document-notes&documentId=' + encodeURIComponent(document.id))
        .then(res => setDocumentNotes(res?.notes || []))
        .catch(err => console.warn(err))
        .finally(() => setDocumentNotesLoading(false));
      // Load study flashcard decks
      CSM.api('study-decks&documentId=' + encodeURIComponent(document.id))
        .then(res => {
          const list = res?.decks || [];
          setStudyDecks(list);
          if (list.length > 0) {
            setActiveStudyDeckId(list[0].id);
          } else {
            const defaultTitle = `${document.title.replace(/\.[^/.]+$/, '')} Flashcards`;
            CSM.api('study-decks', 'POST', {
              title: defaultTitle,
              description: `Study flashcards for ${document.title}`,
              documentId: document.id
            }).then(created => {
              setStudyDecks([created]);
              setActiveStudyDeckId(created.id);
            }).catch(() => { });
          }
        })
        .catch(err => console.warn(err));
    }
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
    if (isGuest) {
      setGuestLockedSection('arena');
      return;
    }
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

  const archiveFolder = async (deckId, name) => {
    if (isGuest) { setGuestLockedSection('creator'); return; }
    try { await CSM.api('decks', 'DELETE', { id: deckId }); await refreshWorkspace(); }
    catch (error) { triggerToast(error.message); return; }
    setSelectedDeckIds(prev => prev.filter(id => id !== deckId));
    if (selectedDeckForFolderView && selectedDeckForFolderView.id === deckId) {
      setSelectedDeckForFolderView(null);
    }
    setDeleteDeckTarget(null);
    triggerToast(`Moved "${name}" to your archive`);
    showChangeConfirmation('Deck archived', `“${name}” and its materials are in your archive. You can restore it later.`);
  };

  const confirmDeleteFolder = () => {
    if (!deleteDeckTarget) return;
    const deckId = deleteDeckTarget.id;
    const name = deleteDeckTarget.code || deleteDeckTarget.title || 'this deck';
    setDeleteDeckTarget(null);
    requestDeleteConfirmation({
      title: `Move “${name}” to your archive?`,
      message: 'The deck and its PDFs will be hidden from your library. You can restore them from Archive later.',
      confirmLabel: 'Move to archive',
      action: () => archiveFolder(deckId, name)
    });
  };

  const DeckCardActions = ({ deck }) => {
    if (isGuest) {
      return (
        <div className="csm-deck-actions">
          <button
            type="button"
            className="csm-share-button !p-1.5 !text-xs"
            onClick={(e) => handleShareDeck(deck, e)}
            title="Share this reviewer via link"
          >
            <IconShare />
          </button>
        </div>
      );
    }
    const isOpen = openDeckMenuId === deck.id;
    return (
      <div className="csm-deck-actions">
        <button
          type="button"
          className="csm-deck-menu-trigger"
          aria-label={`Actions for ${deck.code || deck.title}`}
          aria-expanded={isOpen}
          onClick={(e) => { e.stopPropagation(); setOpenDeckMenuId(isOpen ? null : deck.id); }}
        ><svg className="csm-admin-user-more-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
        {isOpen && (
          <div className="csm-deck-menu" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={(e) => handleOpenEditFolderInfo(deck, e)}><IconEdit /> Edit</button>
            <button type="button" className="danger" onClick={(e) => handleDeleteFolder(deck.id, e)}><IconTrash /> Move to archive</button>
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

  const orderedLibraryDecks = useMemo(() => [...recentDecks, ...olderDecks], [recentDecks, olderDecks]);
  const libraryPageCount = Math.max(1, Math.ceil(orderedLibraryDecks.length / 9));
  const pageDecks = useMemo(
    () => orderedLibraryDecks.slice((libraryPage - 1) * 9, libraryPage * 9),
    [orderedLibraryDecks, libraryPage]
  );
  const pageRecentDecks = pageDecks.filter(deck => deck.section === 'recent' || deck.id === 'deck-2');
  const pageOlderDecks = pageDecks.filter(deck => deck.section === 'older' || (deck.id !== 'deck-2' && deck.section !== 'recent'));

  useEffect(() => {
    if (libraryPage > libraryPageCount) setLibraryPage(libraryPageCount);
  }, [libraryPage, libraryPageCount]);

  // (Old game lobby summary helpers removed for Bombstyle)

  // Keep existing action handlers compatible without showing floating status toasts.
  const triggerToast = () => {};

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

  const handleProfileDeckVisibility = async (event) => {
    const deckVisibility = event.target.value;
    setPrivacySaveStatus('Saving…');
    try {
      const saved = await CSM.api('profile', 'PATCH', { deckVisibility });
      setProfile(saved);
      setPrivacySaveStatus(`Your default deck visibility is ${deckVisibility}.`);
    } catch (error) { setPrivacySaveStatus(error.message || 'Could not save this setting.'); }
  };

  const handleDeckVisibility = async (deck, visibility) => {
    setDeckVisibilitySaving(true); setDeckVisibilityNotice(null);
    const showDeckVisibilityNotice = notice => {
      setDeckVisibilityNotice(notice);
      window.clearTimeout(deckVisibilityNoticeTimerRef.current);
      deckVisibilityNoticeTimerRef.current = window.setTimeout(() => setDeckVisibilityNotice(null), 3600);
    };
    try {
      await CSM.api('decks', 'PATCH', { id: deck.id, title: deck.title || deck.code, subject: deck.subject || '', category: deck.category || 'Recent', visibility });
      await refreshWorkspace();
      const effectiveVisibility = visibility === 'inherit' ? profile.deckVisibility || 'private' : visibility;
      const message = visibility === 'inherit'
        ? `Your deck now follows your profile default (${effectiveVisibility}).`
        : `Your deck is now ${effectiveVisibility}.`;
      showDeckVisibilityNotice({ message, isError: false });
    } catch (error) { showDeckVisibilityNotice({ message: error.message || 'Could not save deck visibility.', isError: true }); }
    finally { setDeckVisibilitySaving(false); }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPasswordDraft.length < 8 || newPasswordDraft.length > 72) return triggerToast('Use a password between 8 and 72 characters.');
    if (newPasswordDraft !== confirmPasswordDraft) return setPasswordErrorModal({ title: 'Passwords don’t match', message: 'The new password and confirmation are different. Check both fields and try again.' });
    try {
      await CSM.api('auth/password', 'POST', { currentPassword: currentPasswordDraft, newPassword: newPasswordDraft });
      setPasswordResetModalOpen(false); setCurrentPasswordDraft(''); setNewPasswordDraft(''); setConfirmPasswordDraft('');
      triggerToast('Password updated.');
    } catch (error) {
      if (/current password.*incorrect/i.test(error.message || '')) {
        setPasswordErrorModal({ title: 'Current password is incorrect', message: 'That doesn’t match your current password. Check it and try again.' });
      } else triggerToast(error.message);
    }
  };

  useEffect(() => {
    if (!bombstyleExitModalOpen) return;
    const handleExitModalKeyDown = (event) => {
      if (event.key === 'Escape') resumeBombstyleSession();
    };
    document.addEventListener('keydown', handleExitModalKeyDown);
    return () => document.removeEventListener('keydown', handleExitModalKeyDown);
  }, [bombstyleExitModalOpen]);

  useEffect(() => {
    const handleArenaEscape = (event) => {
      if (event.key !== 'Escape' || bombstyleExitModalOpen) return;
      if (activeTab !== 'arena' || !['countdown', 'gameplay'].includes(bombstylePhase)) return;
      event.preventDefault();
      requestBombstyleExit();
    };
    document.addEventListener('keydown', handleArenaEscape);
    return () => document.removeEventListener('keydown', handleArenaEscape);
  }, [activeTab, bombstylePhase, bombstyleExitModalOpen]);

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

  const savePdfSelection = async (explicitColor = null) => {
    if (!activeDocument || !pdfSelection) return triggerToast('Select some PDF text first.');
    const colorToUse = explicitColor || highlightColor;
    setPdfSaving(true);
    try {
      const note = await CSM.api('highlights', 'POST', {
        documentId: activeDocument.id, text: pdfSelection.text, page: pdfSelection.page,
        color: colorToUse, purpose: 'note', selection: pdfSelection.selection
      });
      setHighlights(items => [...items, note]);
      setPdfSelection(null); setPdfCardComposerOpen(false); window.getSelection()?.removeAllRanges();
      triggerToast('Magic Marker highlight saved.');
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
    if (isGuest) { setGuestLockedSection('creator'); return; }
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
    prepareNewBombcard();
    const target = targetDeckForAddMaterial || currentSelectedDeck || decks[0];
    if (target) {
      setSelectedDeckIds([target.id]);
      setCreatorTargetDeckId(target.id);
    }
    setIsAddMaterialPopupOpen(false);
    setActiveTab('creator');
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


  const handleShareDeck = async (deck, e) => {
    if (e) e.stopPropagation();
    setOpenDeckMenuId(null);
    setShareDeckTarget(deck);
    setShareModalLoading(false);
    setShareModalError('');
    setShareModalCopied(false);
    if (isGuest) {
      const shareUrl = deck?.share?.url || window.location.href;
      setShareModalData({ isShared: true, isActive: true, token: deck?.share?.token || '', url: shareUrl });
      return;
    }
    setShareModalLoading(true);
    setShareModalData(null);
    try {
      const result = await CSM.api('decks/share', 'POST', { deckId: deck.id, action: 'create' });
      setShareModalData(result);
      setDecks(prev => prev.map(d => d.id === deck.id ? { ...d, share: { token: result.token, isActive: result.isActive, url: result.url } } : d));
    } catch (err) {
      setShareModalError(err.message || 'Could not generate share link.');
    } finally {
      setShareModalLoading(false);
    }
  };

  const handleToggleShareActive = async (active) => {
    if (!shareDeckTarget) return;
    setShareModalLoading(true);
    setShareModalError('');
    try {
      const result = await CSM.api('decks/share', 'POST', { deckId: shareDeckTarget.id, action: 'toggle', active });
      setShareModalData(prev => ({ ...prev, isActive: result.isActive, url: result.url, isShared: true }));
      setDecks(prev => prev.map(d => d.id === shareDeckTarget.id ? { ...d, share: { token: result.token, isActive: result.isActive, url: result.url } } : d));
      triggerToast(active ? 'Share link enabled' : 'Share link disabled');
    } catch (err) {
      setShareModalError(err.message || 'Could not update share link.');
    } finally {
      setShareModalLoading(false);
    }
  };

  const handleRegenerateShareLink = async () => {
    if (!shareDeckTarget) return;
    setShareModalLoading(true);
    setShareModalError('');
    setShareModalCopied(false);
    try {
      const result = await CSM.api('decks/share', 'POST', { deckId: shareDeckTarget.id, action: 'regenerate' });
      setShareModalData(result);
      setDecks(prev => prev.map(d => d.id === shareDeckTarget.id ? { ...d, share: { token: result.token, isActive: result.isActive, url: result.url } } : d));
      triggerToast('New share link generated');
    } catch (err) {
      setShareModalError(err.message || 'Could not regenerate share link.');
    } finally {
      setShareModalLoading(false);
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareModalData?.url) return;
    navigator.clipboard?.writeText(shareModalData.url);
    setShareModalCopied(true);
    triggerToast('Share link copied to clipboard!');
    setTimeout(() => setShareModalCopied(false), 2500);
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
    if (newQType === 'TRUE_FALSE' && !newQAnswer.trim()) {
      triggerToast('Choose True or False before appending this card.');
      return;
    }

    let cardObj = {
      id: 'card-' + Date.now(),
      type: newQType,
      prompt: newQPrompt.trim(),
      hint: newQHint.trim() || (newQType === 'MULTIPLE_CHOICE' ? 'Knowledge Check' : newQType === 'TRUE_FALSE' ? 'True / False' : 'Identification')
    };

    if (newQType === 'MULTIPLE_CHOICE') {
      const filledOptions = newQOptions.map((opt, i) => opt.trim() || `Option ${i + 1}`);
      cardObj.options = filledOptions;
      cardObj.correctIndex = newQCorrectIndex;
      cardObj.correctAnswer = filledOptions[newQCorrectIndex];
    } else if (newQType === 'TRUE_FALSE') {
      cardObj.options = ['True', 'False'];
      cardObj.correctIndex = newQAnswer.trim().toLowerCase() === 'false' ? 1 : 0;
      cardObj.correctAnswer = newQAnswer.trim() || 'True';
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
      message: `This ${card?.type === 'MULTIPLE_CHOICE' ? 'multiple-choice' : card?.type === 'TRUE_FALSE' ? 'true/false' : 'identification'} card will be removed from the current draft.`,
      confirmLabel: 'Delete card',
      action: () => {
        setEditorCards(prev => prev.filter(c => c.id !== cardId));
        triggerToast('Bombcard removed from the draft');
      }
    });
  };

  const handleSaveDeck = async () => {
    const title = canonicalDeckTitle(editorTitle || editorCode || 'New Reviewer');
    const originalTitleKey = editingDeck ? deckTitleKey(editingDeck.title || editingDeck.code) : '';
    if ((!editingDeck || deckTitleKey(title) !== originalTitleKey)
      && decks.some(deck => deck.id !== editingDeck?.id && deckTitleKey(deck.title || deck.code) === deckTitleKey(title))) {
      triggerToast('A deck with this title already exists.');
      return;
    }
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
  const bombstyleCountdownTimerRef = useRef(null);
  const bombstylePendingStartRef = useRef(null);
  const bombstyleCountdownStartedRef = useRef(false);
  const bombstyleDeadlineRef = useRef(null);
  const bombstyleAnswerSubmittedRef = useRef(false);
  const bombstyleWrongFeedbackTimerRef = useRef(null);
  const bombstyleTimeoutStartedRef = useRef(false);

  const bombstyleActiveDeck = useMemo(() => {
    return decks.find(d => d.id === bombstyleDeckId) || (publicArenaDeck?.id === bombstyleDeckId ? publicArenaDeck : null) || decks[0];
  }, [decks, bombstyleDeckId, publicArenaDeck]);

  const arenaDeckChoices = useMemo(() => {
    if (!publicArenaDeck || decks.some(deck => deck.id === publicArenaDeck.id)) return decks;
    return [...decks, publicArenaDeck];
  }, [decks, publicArenaDeck]);

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
  const isBombExploded = bombstyleFeedback === 'exploded';
  const isBombWrong = bombstyleFeedback === 'wrong';
  const isBombDanger = bombstyleTimeRemaining <= 5.0 && bombstylePhase === 'gameplay' && !bombstyleFeedback;
  const isBombStartled = bombstyleTimeRemaining <= 10.0 && bombstylePhase === 'gameplay' && !bombstyleFeedback;
  const isBombWorried = !isBombStartled && bombstyleTimeRemaining <= (selectedBombstyleDifficulty.seconds / 2) && bombstylePhase === 'gameplay' && !bombstyleFeedback;
  const bombTimerPercent = Math.max(0, Math.min(100, (bombstyleTimeRemaining / (selectedBombstyleDifficulty.seconds || 45)) * 100));

  const handleSelectBombstyleDeck = (deckId) => {
    setBombstyleDeckId(deckId);
    setBombstylePhase('configure');
  };

  const setBombstyleClock = (remainingMs) => {
    const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
    bombstyleDeadlineRef.current = Date.now() + safeRemainingMs;
    setBombstyleTimeRemaining(safeRemainingMs / 1000);
  };

  const constrainBombstyleClock = (remainingMs) => {
    const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
    const localDeadline = typeof bombstyleDeadlineRef.current === 'number'
      ? bombstyleDeadlineRef.current
      : Date.now() + Math.max(0, bombstyleTimeRemaining * 1000);
    // Server resyncs can correct a clock down, but must never add time back.
    bombstyleDeadlineRef.current = Math.min(localDeadline, Date.now() + safeRemainingMs);
    setBombstyleTimeRemaining(Math.max(0, bombstyleDeadlineRef.current - Date.now()) / 1000);
  };

  const currentBombstyleRemainingMs = () => {
    if (typeof bombstyleDeadlineRef.current === 'number') {
      return Math.max(0, bombstyleDeadlineRef.current - Date.now());
    }
    return Math.max(0, bombstyleTimeRemaining * 1000);
  };

  const openBombstyleExitConfirmation = () => {
    setBombstyleExitModalOpen(true);
    // The exit dialog is only a confirmation layer; it must never pause or reset the round clock.
    const sessionId = bombstyleSessionId;
    if (activeTab === 'arena' && bombstylePhase === 'gameplay' && !isGuest && sessionId) {
      CSM.api('arena/session&id=' + encodeURIComponent(sessionId)).then(async session => {
        if (bombstyleSessionId !== sessionId || activeTab !== 'arena' || bombstylePhase !== 'gameplay') return;
        // Clear legacy pause state, if any, without replacing the continuously running local deadline.
        if (session?.status === 'active' && session.paused) {
          session = await CSM.api('arena/resume', 'POST', { id: sessionId });
        }
        if (session?.status === 'active' && Number.isFinite(Number(session.remainingMs))) {
          constrainBombstyleClock(session.remainingMs);
        }
      }).catch(error => console.warn('Could not sync the Arena timer:', error));
    }
  };

  const requestBombstyleExit = (afterExit) => {
    const sessionInProgress = activeTab === 'arena' && ['countdown', 'gameplay'].includes(bombstylePhase);
    if (!sessionInProgress) {
      afterExit?.();
      return false;
    }
    pendingBombstyleExitActionRef.current = afterExit || null;
    openBombstyleExitConfirmation();
    return true;
  };

  const resumeBombstyleSession = async () => {
    pendingBombstyleExitActionRef.current = null;
    setBombstyleExitModalOpen(false);
  };

  const handleSetDifficulty = (diff) => {
    if (BOMBSTYLE_DIFFICULTIES[diff]) setBombstyleDifficulty(diff);
  };

  const handleStartBombstyle = (customCardQueue = null) => {
    const deck = bombstyleActiveDeck;
    const cardsToUse = customCardQueue ? [...customCardQueue] : (deck ? [...(deck.cards || [])] : []);

    if (cardsToUse.length === 0) {
      triggerToast('Selected deck does not contain any Bombcards yet.');
      return;
    }

    if (bombstyleWrongFeedbackTimerRef.current) clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleTimeoutStartedRef.current = false;
    setBombstyleAnswerError('');
    sound.init();
    bombstyleCountdownStartedRef.current = false;
    setBombstyleCountdown(3);
    bombstylePendingStartRef.current = async () => {
      let queue = cardsToUse;
      if (isGuest) {
        setBombstyleSessionId('guest-session-' + Date.now());
      } else {
        try {
          const session = await CSM.api('arena/start', 'POST', { deckId: deck.id, difficulty: bombstyleDifficulty });
          setBombstyleSessionId(session.id);
          queue = session.queue || queue;
        } catch (error) {
          bombstylePendingStartRef.current = null;
          setBombstylePhase('configure');
          triggerToast(error.message || 'Could not start the Arena session.');
          return;
        }
      }

      setBombstyleQueue(queue);
      setBombstyleIndex(0);
      setBombstyleRevealed(false);
      setBombstyleAnswerDraft('');
      bombstyleAnswerSubmittedRef.current = false;
      setBombstyleClock(selectedBombstyleDifficulty.seconds * 1000);
      setBombstyleStreak(0);
      setBombstyleMaxStreak(0);
      setBombstyleCorrectCount(0);
      setBombstyleMissedCards([]);
      setBombstyleFeedback(null);
      setBombstyleStartTime(Date.now());
      setBombstylePhase('gameplay');
      setActiveTab('arena');
      if (!isGuest) refreshWorkspace().catch(error => console.warn('Could not refresh study activity:', error));
    };
    setBombstylePhase('countdown');
    setActiveTab('arena');
  };

  useEffect(() => {
    if (activeTab !== 'arena' || bombstylePhase !== 'countdown') {
      if (bombstyleCountdownTimerRef.current) clearTimeout(bombstyleCountdownTimerRef.current);
      bombstyleCountdownTimerRef.current = null;
      return;
    }

    if (bombstyleCountdown <= 0) {
      bombstyleCountdownTimerRef.current = null;
      if (bombstyleCountdownStartedRef.current) return;
      bombstyleCountdownStartedRef.current = true;
      const startSession = bombstylePendingStartRef.current;
      bombstylePendingStartRef.current = null;
      if (startSession) startSession();
      return;
    }

    if (bombstyleCountdown === 1) sound.whistle();
    else sound.tick();
    bombstyleCountdownTimerRef.current = setTimeout(() => {
      setBombstyleCountdown(count => count - 1);
    }, 1000);
    return () => {
      if (bombstyleCountdownTimerRef.current) clearTimeout(bombstyleCountdownTimerRef.current);
      bombstyleCountdownTimerRef.current = null;
    };
  }, [activeTab, bombstylePhase, bombstyleCountdown]);

  const cancelBombstyleCountdown = () => {
    bombstylePendingStartRef.current = null;
    bombstyleCountdownStartedRef.current = false;
    if (bombstyleCountdownTimerRef.current) clearTimeout(bombstyleCountdownTimerRef.current);
    bombstyleCountdownTimerRef.current = null;
    setBombstylePhase('configure');
  };

  useEffect(() => {
    if (isGuest) return;
    CSM.api('arena/active').then(async session => {
      if (!session || session.status !== 'active') return;
      if (session.deckId && !decks.some(deck => deck.id === session.deckId)) {
        try {
          const result = await CSM.api(`people/deck&id=${encodeURIComponent(session.deckId)}`);
          setPublicArenaDeck(result.deck);
        } catch (error) {
          console.warn('Could not restore the shared deck for this Arena session:', error);
        }
      }
      let restoredSession = session;
      // Older sessions may have been paused by an earlier version of the exit dialog.
      if (session.paused) {
        try { restoredSession = await CSM.api('arena/resume', 'POST', { id: session.id }); } catch (_) { }
      }
      setBombstyleSessionId(restoredSession.id); setBombstyleDeckId(restoredSession.deckId); setBombstyleDifficulty(restoredSession.difficulty);
      const restoredQueue = restoredSession.queue || [];
      setBombstyleQueue(restoredQueue); setBombstyleIndex(restoredSession.index || 0);
      setBombstyleAnswerDraft(''); setBombstyleRevealed(false);
      const restoredAnswers = (restoredSession.answers || []).map(answer => ({ ...(restoredQueue[answer.position] || {}), result: answer.result }));
      setBombstyleMissedCards(restoredAnswers.filter(answer => answer.result !== 'correct'));
      setBombstyleClock(restoredSession.remainingMs); setBombstyleStreak(restoredSession.streak || 0);
      setBombstyleMaxStreak(restoredSession.maxStreak || 0); setBombstyleCorrectCount(restoredSession.correct || 0);
      setBombstyleStartTime(Date.now() - (restoredSession.durationMs || 0)); setBombstylePhase('gameplay'); setActiveTab('arena');
      setBombstyleExitModalOpen(false);
    }).catch(error => console.warn('Could not restore the active Arena session:', error));
  }, []);

  // Countdown Timer for Bombstyle
  useEffect(() => {
    if (activeTab !== 'arena' || bombstylePhase !== 'gameplay') {
      if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
      return;
    }

    if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
    const syncLocalClock = () => {
      const remainingMs = currentBombstyleRemainingMs();
      if (remainingMs <= 0) {
        clearInterval(bombstyleTimerRef.current);
        setBombstyleTimeRemaining(0);
        handleBombstyleTimeout();
        return;
      }
      setBombstyleTimeRemaining(remainingMs / 1000);
      if (remainingMs <= 5000 && Math.ceil(remainingMs / 100) % 10 === 0) sound.tick();
    };

    const syncVisibleSession = async () => {
      syncLocalClock();
      if (document.visibilityState !== 'visible' || isGuest || !bombstyleSessionId) return;
      try {
        let session = await CSM.api('arena/session&id=' + bombstyleSessionId);
        if (session?.status === 'active' && session.paused) {
          session = await CSM.api('arena/resume', 'POST', { id: bombstyleSessionId });
        }
        if (session?.status === 'active') {
          constrainBombstyleClock(session.remainingMs);
        }
        else if (session?.status === 'timeout') handleBombstyleTimeout();
        else if (session?.status === 'completed') finishBombstyleSession();
      } catch (error) { console.warn('Could not resync the Arena clock:', error); }
    };

    syncLocalClock();
    bombstyleTimerRef.current = setInterval(syncLocalClock, 100);
    document.addEventListener('visibilitychange', syncVisibleSession);
    window.addEventListener('focus', syncVisibleSession);

    return () => {
      if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
      document.removeEventListener('visibilitychange', syncVisibleSession);
      window.removeEventListener('focus', syncVisibleSession);
    };
  }, [activeTab, bombstylePhase, bombstyleIndex, bombstyleFeedback, selectedBombstyleDifficulty.seconds, bombstyleSessionId, isGuest]);

  const normalizeBombstyleAnswer = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isBombstyleAnswerCorrect = (answer, card) => {
    const candidate = normalizeBombstyleAnswer(answer);
    const expected = normalizeBombstyleAnswer(card?.correctAnswer);
    if (card?.type === 'TRUE_FALSE') return candidate === expected;
    if (card?.type === 'MULTIPLE_CHOICE') {
      const option = Array.isArray(card.options) ? card.options[Number(card.correctIndex)] : '';
      return candidate === expected || (option && candidate === normalizeBombstyleAnswer(option));
    }
    const accepted = [card?.correctAnswer, ...(String(card?.alternates || '').split(/[,;\n]+/))];
    return accepted.some(value => candidate && candidate === normalizeBombstyleAnswer(value));
  };

  const handleBombstyleAnswer = async (answer) => {
    if (bombstyleFeedback || !activeBombstyleCard || bombstyleAnswerSubmittedRef.current) return;
    const submittedAnswer = String(answer ?? '').trim();
    if (!submittedAnswer) {
      setBombstyleAnswerError('Please enter an answer before submitting.');
      requestAnimationFrame(() => bombstyleAnswerInputRef.current?.focus());
      return;
    }
    setBombstyleAnswerError('');
    bombstyleAnswerSubmittedRef.current = true;
    let serverResult = { status: 'active', remainingMs: 0 };
    let isCorrect = false;
    if (isGuest) {
      isCorrect = isBombstyleAnswerCorrect(submittedAnswer, activeBombstyleCard);
      const delta = isCorrect ? 8 : -5;
      const nextRemainingMs = Math.max(0, currentBombstyleRemainingMs() + (delta * 1000));
      serverResult.remainingMs = nextRemainingMs;
      setBombstyleClock(nextRemainingMs);
    } else {
      try { serverResult = await CSM.api('arena/answer', 'POST', { id: bombstyleSessionId, position: bombstyleIndex, answer: submittedAnswer }); }
      catch (error) { bombstyleAnswerSubmittedRef.current = false; triggerToast(error.message); return; }
      isCorrect = serverResult.answerResult === 'correct';
      setBombstyleClock(serverResult.remainingMs);
    }

    setBombstyleAnswerDraft(submittedAnswer);
    setBombstyleRevealed(true);
    if (isCorrect) {
      sound.arenaCorrect();
      setBombstyleFeedback('defused');
      const nextStreak = bombstyleStreak + 1;
      setBombstyleStreak(nextStreak);
      if (nextStreak > bombstyleMaxStreak) setBombstyleMaxStreak(nextStreak);
      setBombstyleCorrectCount(c => c + 1);

      setTimeout(() => advanceBombstyleCard(), 600);
    } else {
      sound.arenaWrong();
      setBombstyleFeedback('wrong');
      setBombstyleStreak(0);
      setBombstyleMissedCards(prev => [...prev, { ...activeBombstyleCard, resultReason: 'did_not_know' }]);

      if (bombstyleWrongFeedbackTimerRef.current) clearTimeout(bombstyleWrongFeedbackTimerRef.current);
      bombstyleWrongFeedbackTimerRef.current = setTimeout(() => {
        bombstyleWrongFeedbackTimerRef.current = null;
        if (currentBombstyleRemainingMs() <= 0) return;
        advanceBombstyleCard();
      }, 1100);
    }
  };

  const handleBombstyleTimeout = async () => {
    const waitingAfterWrongAnswer = bombstyleFeedback === 'wrong';
    if (bombstyleTimeoutStartedRef.current || (bombstyleFeedback && !waitingAfterWrongAnswer) || !activeBombstyleCard || (bombstyleAnswerSubmittedRef.current && !waitingAfterWrongAnswer)) return;
    bombstyleTimeoutStartedRef.current = true;
    if (bombstyleWrongFeedbackTimerRef.current) clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleAnswerSubmittedRef.current = true;
    if (!waitingAfterWrongAnswer) sound.arenaWrong();
    sound.detonation();
    if (!isGuest && bombstyleSessionId) {
      try { await CSM.api('arena/session&id=' + bombstyleSessionId); }
      catch (error) { console.warn(error); }
    }
    setBombstyleFeedback('exploded'); setBombstyleRevealed(true); setBombstyleClock(0);
    setBombstyleStreak(0);
    if (!waitingAfterWrongAnswer) setBombstyleMissedCards(prev => [...prev, { ...activeBombstyleCard, resultReason: 'timed_out' }]);

    setTimeout(() => {
      finishBombstyleSession();
    }, 1300);
  };

  const advanceBombstyleCard = () => {
    if (bombstyleWrongFeedbackTimerRef.current) clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleTimeoutStartedRef.current = false;
    setBombstyleFeedback(null);
    setBombstyleRevealed(false);
    setBombstyleAnswerDraft('');
    setBombstyleAnswerError('');
    bombstyleAnswerSubmittedRef.current = false;
    if (bombstyleIndex + 1 < bombstyleQueue.length) {
      setBombstyleIndex(i => i + 1);
    } else {
      finishBombstyleSession();
    }
  };

  const finishBombstyleSession = () => {
    if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
    if (bombstyleWrongFeedbackTimerRef.current) clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    pendingBombstyleExitActionRef.current = null;
    setBombstyleExitModalOpen(false);
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
            openBombstyleExitConfirmation();
            return;
          }
          if (!bombstyleRevealed) {
            if (activeBombstyleCard?.type === 'TRUE_FALSE' && (e.key === '1' || e.key === '2')) {
              e.preventDefault();
              handleBombstyleAnswer(e.key === '1' ? 'True' : 'False');
            } else if (activeBombstyleCard?.type === 'MULTIPLE_CHOICE' && /^[1-8]$/.test(e.key)) {
              e.preventDefault();
              const option = activeBombstyleCard.options?.[Number(e.key) - 1];
              if (option) handleBombstyleAnswer(option);
            }
          }
        }
      }

      if (activeTab === 'flashcards') {
        if (flashcardMotionLockRef.current) return;
        if (e.code === 'Space') {
          e.preventDefault();
          flipFlashcard();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateFlashcardRef.current?.(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateFlashcardRef.current?.(1);
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
          {!isGuest && <DeckCardActions deck={deck} />}
        </div>
        <div className="csm-library-deck-card-copy">
          <h3>{deck.code || deck.title}</h3>
          <p>{deck.subject || 'Information Technology'}</p>
          <span>{totalMaterials} material{totalMaterials === 1 ? '' : 's'}</span>
        </div>
        <div className="csm-library-deck-card-footer">
          <span><IconUser /> {isGuest ? `By ${deck.owner || 'Shared Reviewer'}` : 'By you'}</span>
          <strong>Open deck <IconArrowRight /></strong>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell w-full h-full flex items-stretch overflow-hidden">

      {/* ========================================================
              LEFT CAPSULE SIDEBAR
              ======================================================== */}
      {mobileMenuOpen && <button type="button" className="csm-mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />}
      <nav
        id="primary-navigation"
        className={`w-14 min-w-[56px] bg-[#141922] py-4 flex flex-col items-center justify-between shadow-2xl flex-shrink-0 z-20 ${sidebarExpanded || mobileMenuOpen ? 'sidebar-expanded' : ''} ${mobileMenuOpen ? 'csm-mobile-nav-open' : ''}`}
        aria-label="Primary navigation"
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onClick={(event) => {
          if (event.target.closest('button') || event.target.closest('.csm-sidebar-logo')) setMobileMenuOpen(false);
        }}
      >
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="csm-sidebar-brand-row w-full flex items-center justify-center">
            <button
              type="button"
              className="w-10 h-10 csm-sidebar-logo flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
              onClick={() => {
                if (isGuest) {
                  if (sidebarExpanded || mobileMenuOpen) setGuestLockedSection('home');
                  else setSidebarExpanded(true);
                  return;
                }
                if (sidebarExpanded || mobileMenuOpen) requestBombstyleExit(() => setActiveTab('home')); else setSidebarExpanded(true);
              }}
              title={isGuest ? 'Co-StudyMaxx (Home Locked for Guests)' : ((sidebarExpanded || mobileMenuOpen) ? 'Co-StudyMaxx Home' : 'Open sidebar')}
              aria-label={(sidebarExpanded || mobileMenuOpen) ? 'Co-StudyMaxx Home' : 'Open sidebar'}
            >
              <img
                src="assets/images/csm-sidebar-logo.png"
                alt="Co-StudyMaxx Logo"
                className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              />
              <svg className="csm-sidebar-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M14 8l4 4-4 4" /></svg>
              <span className="csm-sidebar-wordmark">Co-StudyMaxx</span>
            </button>
            <button type="button" className="csm-mobile-nav-close" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>

          {/* Navigation Tabs (MAIN Category) */}
          <div className="flex flex-col items-center gap-2 mt-2 w-full">
            <span className="csm-sidebar-category">Dashboard</span>
            <span className="csm-sidebar-divider" />

            {/* 1. Home Dashboard (Locked for Guest) */}
            <button
              onClick={() => {
                if (isGuest) { setGuestLockedSection('home'); return; }
                requestBombstyleExit(() => {
                  setSelectedDeckForFolderView(null);
                  setActiveTab('home');
                });
              }}
              data-tooltip={isGuest ? 'Home (Sign in to unlock)' : 'Overview'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === 'home'
                ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              title={isGuest ? 'Home Dashboard (Sign in to unlock)' : 'Home Dashboard'}
            >
              <IconHome />
              {isGuest && (
                <span className="csm-sidebar-lock-badge" title="Sign in to unlock">
                  <IconLock className="w-2.5 h-2.5" />
                </span>
              )}
              <span className="csm-sidebar-label">Home</span>
            </button>

            {/* 2. Reviewer Library (Parent with Nested Child Items) */}
            {!isStaff && <div className="w-full flex flex-col items-center">
              <button
                onClick={() => requestBombstyleExit(() => { setSelectedDeckForFolderView(isGuest && sharedDeck ? sharedDeck : null); setActiveTab('library'); })}
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

              {/* Nested Navigation: Study, Create, PDF Tools & AI Generator (Smooth Animated Accordion) */}
              <div
                className={`csm-sidebar-subnav-wrapper ${libraryNavExpanded ? 'expanded' : 'collapsed'}`}
                aria-hidden={!libraryNavExpanded}
              >
                <div className="csm-sidebar-subnav-inner">
                  <div className="csm-sidebar-subnav">
                    {/* 2a. Study Mini Sidebar */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => requestBombstyleExit(() => { setSelectedDeckForFolderView(null); setFlashcardIndex(0); setFlashcardFlipped(false); setActiveTab('flashcards'); })}
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

                    {/* 2b. Create Bombcards Mini Sidebar (Locked for Guest) */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        if (isGuest) { setGuestLockedSection('creator'); return; }
                        requestBombstyleExit(() => {
                          prepareNewBombcard();
                          setSelectedDeckForFolderView(null);
                          setActiveTab('creator');
                        });
                      }}
                      data-tooltip={isGuest ? 'Create Bombcards (Sign in to unlock)' : 'Create Bombcards'}
                      className={`csm-sidebar-subitem flex items-center transition-all relative ${activeTab === 'creator' ? 'active' : ''}`}
                      title={isGuest ? 'Create Bombcards (Sign in to unlock)' : 'Create Bombcards'}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                      {isGuest && (
                        <span className="csm-sidebar-lock-badge" title="Sign in to unlock">
                          <IconLock className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="csm-sidebar-label">Create Bombcards</span>
                    </button>

                    {/* 2c. PDF Tools Mini Sidebar */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        requestBombstyleExit(() => {
                          setSelectedDeckForFolderView(null);
                          if (!activeDocument) {
                            const firstDocDeck = decks.find(d => d.documents && d.documents.length > 0);
                            if (firstDocDeck && firstDocDeck.documents[0]) {
                              handleOpenDocument(firstDocDeck, firstDocDeck.documents[0]);
                              return;
                            }
                          }
                          setActiveTab('highlighter');
                        });
                      }}
                      data-tooltip="PDF Tools"
                      className={`csm-sidebar-subitem flex items-center transition-all ${activeTab === 'highlighter' ? 'active' : ''}`}
                      title="PDF Tools (Highlight & Generate Cards)"
                    >
                      <IconPdf className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                      <span className="csm-sidebar-label">PDF Tools</span>
                    </button>

                    {/* 2d. AI Flashcard Generator Modal Trigger */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        if (isGuest) { setGuestLockedSection('creator'); return; }
                        requestBombstyleExit(() => handleOpenAiGenerator());
                      }}
                      data-tooltip={isGuest ? 'AI Flashcards (Sign in to unlock)' : 'AI Generator'}
                      className="csm-sidebar-subitem flex items-center transition-all relative text-purple-300 hover:text-purple-200"
                      title={isGuest ? 'AI Flashcards (Sign in to unlock)' : 'AI Flashcards Generator (Gemini)'}
                    >
                      <IconSparkles className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
                      {isGuest && (
                        <span className="csm-sidebar-lock-badge" title="Sign in to unlock">
                          <IconLock className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="csm-sidebar-label">AI Generator</span>
                    </button>

                  </div>
                </div>
              </div>
            </div>}

            {/* 3. Game Mode Section (Launch Lobby - Locked for Guest) */}
            {!isStaff && <button
              onClick={() => {
                if (isGuest) {
                  setGuestLockedSection('arena');
                  return;
                }
                requestBombstyleExit(() => {
                  setBombstylePhase('select_deck');
                  setSelectedDeckForFolderView(null);
                  setActiveTab('arena');
                });
              }}
              data-tooltip={isGuest ? 'Arena (Sign in to unlock)' : 'Arena'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === 'game' || activeTab === 'arena'
                ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              title={isGuest ? 'Arena (Sign in to unlock)' : 'Arena (Bombstyle Recall)'}
            >
              <IconCards className="w-6 h-6" />
              {isGuest && (
                <span className="csm-sidebar-lock-badge" title="Sign in to unlock">
                  <IconLock className="w-2.5 h-2.5" />
                </span>
              )}
              <span className="csm-sidebar-label">Arena</span>
            </button>}

            {/* ACCOUNT Category — placed below Arena */}
            {!isGuest && <button
              type="button"
              onClick={() => requestBombstyleExit(() => { setSelectedDeckForFolderView(null); setActiveTab('archive'); })}
              data-tooltip="Archive"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === 'archive' ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              title="Archive"
              aria-label="Open archive"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8M10 12h4"/></svg>
              <span className="csm-sidebar-label">Archive</span>
            </button>}

            {!isGuest && !isStaff && <button
              type="button"
              onClick={() => requestBombstyleExit(() => { setSelectedDeckForFolderView(null); setActiveTab('people'); })}
              data-tooltip="Discover"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === 'people' ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              title="Discover people and public decks"
              aria-label="Discover"
            >
              <IconSearch className={`w-5 h-5 ${activeTab === 'people' ? 'text-white' : 'text-zinc-400'}`} />
              <span className="csm-sidebar-label">Discover</span>
            </button>}

            <span className="csm-sidebar-category" style={{ marginTop: '8px' }}>ACCOUNT</span>
            <span className="csm-sidebar-divider" />

            {/* Profile Settings (Locked for Guest) */}
            <button
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${activeTab === 'account' ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              title={isGuest ? 'Account Profile (Sign in to unlock)' : 'Account Profile'}
              data-tooltip={isGuest ? 'Profile (Sign in to unlock)' : 'Profile Settings'}
              onClick={() => {
                if (isGuest) { setGuestLockedSection('profile'); return; }
                requestBombstyleExit(() => handleOpenAccount());
              }}
            >
              <IconUser />
              {isGuest && (
                <span className="csm-sidebar-lock-badge" title="Sign in to unlock">
                  <IconLock className="w-2.5 h-2.5" />
                </span>
              )}
              <span className="csm-sidebar-label">Profile</span>
            </button>
            {['admin', 'superadmin'].includes(profile.role) && <button
              type="button"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'admin' ? 'active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              title="Admin console" data-tooltip="Admin console" aria-label="Admin console"
              onClick={() => requestBombstyleExit(openAdminAccess)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              <span className="csm-sidebar-label">Admin</span>
            </button>}
          </div>
        </div>

        {/* Sidebar lock — hover still controls the sidebar while unlocked */}
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            type="button"
            className={`csm-sidebar-toggle h-10 flex items-center justify-center transition-colors cursor-pointer ${sidebarLocked ? 'is-locked' : 'text-zinc-500 hover:text-white'}`}
            title={sidebarLocked ? 'Collapse sidebar' : 'Expand sidebar'}
            data-tooltip={sidebarLocked ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={sidebarLocked ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-pressed={sidebarLocked}
            onClick={handleSidebarLockToggle}
          >
            <span className="csm-sidebar-toggle-icon" aria-hidden="true">
              <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarLocked ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M9 3v18" />
                <path d="m15 9-3 3 3 3" />
              </svg>
            </span>
            <span className="csm-sidebar-label">{sidebarLocked ? 'Collapse sidebar' : 'Expand sidebar'}</span>
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
            <button
              type="button"
              className="csm-mobile-navigation-trigger"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMobileMenuOpen(open => !open)}
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
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
              {activeTab === 'archive' && (isStaff ? 'Admin Archive' : 'Archive')}
              {(activeTab === 'arena' || activeTab === 'game') && (
                <>
                  <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestBombstyleExit(() => setBombstylePhase('select_deck'))}>Arena</span>
                  <span className="csm-topbar-sep">/</span>
                  <span className="text-slate-900 font-extrabold cursor-pointer hover:text-slate-700 transition-colors" onClick={() => requestBombstyleExit(() => setBombstylePhase('select_deck'))}>Bombstyle</span>
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
              {activeTab === 'admin' && 'Admin Console'}
              {activeTab === 'people' && 'Discover'}
            </span>
          </div>
          <div className="csm-topbar-role-slot">
            {['admin', 'superadmin'].includes(profile.role) && (
              <span
                className={`csm-topbar-role ${profile.role === 'superadmin' ? 'is-super' : ''}`}
                aria-label={`Account role: ${profile.role === 'superadmin' ? 'Superadmin' : 'Admin'}`}
                title={`Signed in as ${profile.role === 'superadmin' ? 'Superadmin' : 'Admin'}`}
              >
                <IconUser className="csm-topbar-role-icon" />
                {profile.role === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
            )}
          </div>
          <div className="csm-top-actions">
            {isGuest ? (
              <div className="flex items-center gap-2.5">
                <span className="csm-guest-badge">
                  <span className="csm-guest-dot animate-pulse" />
                  Guest Mode
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = sharedDeck?.share?.url || window.location.href;
                    navigator.clipboard.writeText(shareUrl).then(() => triggerToast('Shared deck link copied!'));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#f04824] border border-[#f04824]/20 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Copy link to this shared reviewer"
                >
                  <IconShare className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                <a
                  href="login.html?mode=signin"
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="login.html?mode=signup"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#f04824] hover:bg-[#e03e1b] rounded-xl shadow-sm transition-all"
                >
                  Sign Up
                </a>
              </div>
            ) : (
              <>
                <div className="csm-notifications-wrap" ref={notificationsWrapRef}>
                  <button className={`csm-icon-button csm-notification ${notificationsUnread ? '' : 'is-empty'}`} type="button" aria-label={notificationsUnread ? `Notifications, ${notificationsUnread} unread` : 'Notifications'} aria-expanded={notificationsOpen} title="Notifications" onClick={() => { setNotificationsOpen(value => !value); if (!notificationsOpen) refreshNotifications(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                    {notificationsUnread > 0 && <span className="csm-notification-badge" aria-hidden="true">{notificationsUnread > 99 ? '99+' : notificationsUnread}</span>}
                  </button>
                  {notificationsOpen && (
                    <div className="csm-notifications-panel" role="dialog" aria-label="Notifications panel">
                      <div className="csm-notifications-header"><strong>Notifications</strong><span>{notificationsUnread ? `${notificationsUnread} unread` : 'All caught up'}</span></div>
                      <div className="csm-notifications-list">
                        {notifications.length ? notifications.map(notification => <article className={`csm-notification-item ${notification.isRead ? '' : 'is-unread'}`} key={notification.id}>
                          <span className="csm-notification-item-icon" aria-hidden="true">{notification.type === 'achievement_unlocked' ? <i className="bi bi-trophy-fill text-amber-500"></i> : notification.type?.startsWith('deck') ? '▦' : '•'}</span>
                          <div className="csm-notification-item-copy"><strong>{notification.title}</strong><p>{notification.message}</p><time dateTime={notification.createdAt}>{new Date(`${notification.createdAt}Z`).toLocaleString()}</time></div>
                          {!notification.isRead && <button className="csm-notification-mark-read" type="button" aria-label={`Mark ${notification.title} as read`} onClick={async () => { try { await CSM.api('notifications/read', 'PATCH', { id: notification.id }); setNotifications(items => items.map(item => item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)); setNotificationsUnread(count => Math.max(0, count - 1)); } catch (error) { triggerToast(error.message); } }}>Mark read</button>}
                        </article>) : <div className="csm-notifications-empty"><span className="csm-notifications-empty-icon"><i className="bi bi-check2-circle"></i></span><strong>No notifications</strong><p>You’re all caught up. Achievements and deck review updates will appear here.</p></div>}
                      </div>
                      <div className="csm-notifications-actions"><button type="button" disabled={!notificationsUnread} onClick={async () => { try { await CSM.api('notifications/read', 'PATCH', {}); setNotifications(items => items.map(item => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }))); setNotificationsUnread(0); } catch (error) { triggerToast(error.message); } }}>Mark all as read</button><button type="button" disabled={!notifications.length} onClick={() => { if (!notifications.length) return; requestDeleteConfirmation({ title: 'Clear all notifications?', message: 'Every notification will be permanently removed from this list.', confirmLabel: 'Clear notifications', action: async () => { try { await CSM.api('notifications', 'DELETE'); setNotifications([]); setNotificationsUnread(0); triggerToast('Notifications cleared'); } catch (error) { triggerToast(error.message); } } }); }}>Clear all</button></div>
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
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setSignOutError('');
                          setSignOutConfirmationOpen(true);
                        }}
                      >
                        <IconLogout />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {activeTab === 'home' && isStaff && <AdminHome profile={profile} onOpenAdmin={openAdminAccess} />}
        {activeTab === 'admin' && isStaff && <AdminPanel profile={profile} />}
        {activeTab === 'archive' && isStaff && <AdminArchiveScreen profile={profile} />}
        {activeTab === 'archive' && !isStaff && !isGuest && <UserArchiveScreen onWorkspaceRefresh={refreshWorkspace} />}
        {activeTab === 'people' && !isStaff && !isGuest && <PeopleScreen onPlayDeck={deck => { setPublicArenaDeck(deck); handleOpenGameMode(deck.id); }} />}

        {/* ========================================================
                VIEW A: HOME DASHBOARD
                ======================================================== */}
        {activeTab === 'home' && !isStaff && (
          <div className="flex h-full overflow-hidden relative">

            {/* Dashboard Content Container */}
            <div className="home-dashboard-content flex-1 w-full overflow-y-auto custom-scroll">

              {/* Header */}
              <div className="home-dashboard-header flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                  <span className="home-dashboard-eyebrow">OVERVIEW</span>
                  <h1 className="home-dashboard-title">{greeting}, {displayFirstName}</h1>
                  <p className="home-dashboard-subtitle">Stay on top of your reviewers, practice progress, and study streak.</p>
                </div>
              </div>

              {/* Statistic Cards Row */}
              <div className="home-stat-grid mb-6">
                <div
                  onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                  className="home-stat-card cursor-pointer"
                  title="View your reviewers library"
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
                    <span className="home-stat-description">
                      {totalReviewers > 0 ? (
                        <React.Fragment><b className="csm-trend up">{formatTrend(accountStats.decksTrend)}</b> this month</React.Fragment>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">Create your first deck <IconArrowRight /></span>
                      )}
                    </span>
                  </span>
                </div>

                <div
                  onClick={() => { setSelectedDeckForFolderView(null); setActiveTab('library'); }}
                  className="home-stat-card cursor-pointer"
                  title="View Bombcards"
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
                    <span className="home-stat-description">
                      {totalBombCards > 0 ? (
                        <React.Fragment><b className="csm-trend up">{formatTrend(accountStats.cardsTrend)}</b> across your sets</React.Fragment>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-white/95 font-bold underline">Create cards to practice <IconArrowRight /></span>
                      )}
                    </span>
                  </span>
                </div>

                <div
                  className={`home-stat-card cursor-pointer csm-study-streak-card ${currentStudyStreak > 0 ? 'is-active' : studyStreakLost ? 'is-lost' : 'is-new'}`}
                  onClick={() => setActiveTab('flashcards')}
                  title={studyStreakLost ? 'Your study streak ended. Study today to start a new one.' : 'Practice cards to protect your streak'}
                >
                  <span className="home-stat-icon csm-stat-streak" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21a8 8 0 0 0 5.8-13.7C16.4 6 14.5 4.4 14 2c-3 2-4.2 4.2-3.4 6.3A4.6 4.6 0 0 0 7.5 12c0 1.3.6 2.5 1.5 3.4" />
                      <path d="M12 21c-2.8 0-5-1.8-5-4.2 0-1.5.8-2.7 2.2-3.6.1 2.1 1.4 3.5 3.2 3.5 1.4 0 2.5-1 2.5-2.5 1.3 1.1 2.1 2.4 2.1 3.8 0 1.7-1.3 3-3 3Z" />
                    </svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">{studyStreakLost ? 'STREAK LOST' : 'STUDY STREAK'}</span>
                    <span className="home-stat-value">
                      {currentStudyStreak === 1 ? '1 day' : `${currentStudyStreak} days`}
                    </span>
                    <span className="home-stat-description">
                      {studyStreakLost ? (
                        <span className="csm-streak-lost-message">You missed a day. Study today to start again.</span>
                      ) : currentStudyStreak > 0 ? (
                        <><b className="csm-streak-best">{bestStudyStreak === 1 ? '1 day' : `${bestStudyStreak} days`}</b> personal best</>
                      ) : (
                        <span className="csm-streak-lost-message">Study today to start your streak.</span>
                      )}
                    </span>
                  </span>
                </div>

                <div className="home-stat-card cursor-pointer" onClick={() => handleOpenGameMode()} title="Test accuracy in Bombstyle Arena">
                  <span className="home-stat-icon csm-stat-accuracy" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19V5M4 19h16" />
                      <path d="m7 15 3-4 3 2 5-7" />
                    </svg>
                  </span>
                  <span className="home-stat-copy">
                    <span className="home-stat-label">AVG. ACCURACY</span>
                    <span className="home-stat-value">{accountStats.accuracy || 0}%</span>
                    <span className="home-stat-description">
                      {(accountStats.accuracy || 0) > 0 ? (
                        <React.Fragment><b className={`csm-trend ${(accountStats.accuracyTrend || 0) < 0 ? 'down' : 'up'}`}>{formatTrend(accountStats.accuracyTrend)}</b> than last week</React.Fragment>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">Test in Arena quiz <IconArrowRight /></span>
                      )}
                    </span>
                  </span>
                </div>
              </div>

              {/* Quick Resume Hero Banner */}
              {mostRecentDeck ? (
                <section className="csm-resume-hero mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#141d2b] via-[#1a2538] to-[#251f28] text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-zinc-700/60">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-[#f04824]/20 text-[#ff7a58] border border-[#f04824]/40 uppercase">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true" focusable="false">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M 10 8 L 16 12 L 10 16 Z" />
                        </svg>
                        Pick up where you left off
                      </span>
                      {mostRecentDeck.subject && (
                        <span className="text-xs text-zinc-300 font-medium px-2 py-0.5 rounded bg-white/10">{mostRecentDeck.subject}</span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-2.5">
                      <span>{mostRecentDeck.code || mostRecentDeck.title}</span>
                      {mostRecentDeck.title && mostRecentDeck.title !== mostRecentDeck.code && <span className="text-zinc-300 font-medium text-base sm:text-lg hidden sm:inline">· {mostRecentDeck.title}</span>}
                    </h2>
                    <p className="text-xs text-zinc-300 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5"><i className="bi bi-collection text-[#ff7a58]"></i> {mostRecentDeck.cards?.length || 0} Bombcards</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5"><i className="bi bi-clock-history text-zinc-400"></i> Ready for review</span>
                      {mostRecentDeck.documents?.length > 0 && (
                        <React.Fragment>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1.5"><i className="bi bi-file-earmark-pdf text-red-400"></i> {mostRecentDeck.documents.length} PDF notes</span>
                        </React.Fragment>
                      )}
                    </p>
                  </div>
                  <div className="relative z-10 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeckIds([mostRecentDeck.id]);
                        setActiveTab('flashcards');
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#f04824] hover:bg-[#d83c1b] text-white shadow-md flex items-center gap-2 transition-all duration-150 transform hover:-translate-y-0.5"
                    >
                      <IconPlay className="w-3.5 h-3.5" />
                      <span>Continue Review</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeckIds([mostRecentDeck.id]);
                        handleOpenGameMode();
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 transition-all"
                    >
                      <span className="inline-flex items-center gap-1.5"><i className="bi bi-controller"></i> Enter Arena</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeckForFolderView(mostRecentDeck);
                        setActiveTab('library');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2.5 rounded-xl font-medium text-xs text-zinc-300 hover:text-white transition-colors"
                      title="View in Library"
                    >
                      <span>View details</span><IconArrowRight />
                    </button>
                  </div>
                </section>
              ) : (
                <section className="csm-welcome-banner mb-6 p-6 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-100/50 border border-orange-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div>
                    <span className="text-[11px] font-bold text-orange-700 tracking-wider uppercase mb-1 block">Getting Started</span>
                    <h2 className="text-xl font-extrabold text-zinc-900 mb-1 flex items-center gap-2">Welcome to Co-StudyMaxx! <i className="bi bi-stars text-orange-500"></i></h2>
                    <p className="text-xs text-zinc-600 max-w-md">Create your first reviewer deck, then add PDF notes or build Bombcards with AI.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOpenCreateFolderInfo}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#f04824] hover:bg-[#d83c1b] text-white shadow-sm flex items-center gap-2 transition-all"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Create First Deck</span>
                    </button>
                  </div>
                </section>
              )}

              {/* Analytics & Focus Goal Row */}
              <div className="csm-dash-analytics-grid grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                {/* Left (2 cols): Weekly Study Activity Chart */}
                <section className="lg:col-span-2 csm-chart-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">DATA & PROGRESS</span>
                        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Weekly Arena Sessions</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Arena matches started each day, compared with last week.</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
                        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-xs bg-[#182231] inline-block"></i> This week</span>
                        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-xs bg-[#f04824] inline-block"></i> Last week</span>
                      </div>
                    </div>

                    {/* Chart Columns */}
                    <div className="csm-modern-chart h-40 flex items-end justify-around gap-2 pt-4 pb-2 border-b border-zinc-100 relative">
                      {arenaChart.map(({ day, current = 0, previous = 0 }) => {
                        const isToday = day === todayDayName;
                        const currHeight = Math.max(8, (Number(current) || 0) / activityChartMax * 100);
                        const prevHeight = Math.max(8, (Number(previous) || 0) / activityChartMax * 100);

                        return (
                          <div className={`flex-1 flex flex-col items-center justify-end h-full gap-2 group relative ${isToday ? 'csm-chart-today' : ''}`} key={day}>
                            {/* Hover tooltip */}
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] font-semibold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                              {day}: {current} Arena session{current === 1 ? '' : 's'} {previous ? `(last week: ${previous})` : ''}
                            </div>
                            <div className="w-full flex items-end justify-center gap-1.5 h-full">
                              {previous > 0 && (
                                <span
                                  className="w-2.5 sm:w-3.5 bg-[#f04824]/60 hover:bg-[#f04824] rounded-t-sm transition-all"
                                  style={{ height: `${prevHeight}%` }}
                                    title={`Last week Arena sessions: ${previous}`}
                                />
                              )}
                              <span
                                className={`w-2.5 sm:w-3.5 rounded-t-sm transition-all ${isToday ? 'bg-[#f04824] shadow-sm shadow-orange-500/30' : 'bg-[#182231] hover:bg-[#283850]'}`}
                                style={{ height: `${currHeight}%` }}
                                title={`This week Arena sessions: ${current}`}
                              />
                            </div>
                            <span className={`text-[11px] font-semibold ${isToday ? 'text-[#f04824] font-extrabold underline' : 'text-zinc-500'}`}>
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 text-xs text-zinc-500 flex items-center gap-1.5 border-t border-zinc-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span><b>{totalWeekActivity}</b> Arena session{totalWeekActivity === 1 ? '' : 's'} this week</span>
                  </div>
                </section>

                {/* Right (1 col): Daily Study Goal & Streak Tracker */}
                <section className="csm-daily-goal-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">DAILY FOCUS</span>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Today's Study Goal</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Stay consistent with regular flashcard practice.</p>

                    {/* Progress Stats */}
                    <div className="my-5 p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-orange-50/40 border border-zinc-100 flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-black text-zinc-900">
                          {todayActivityCount} <span className="text-sm font-semibold text-zinc-400">/ {dailyGoalTarget} cards</span>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500">
                          {dailyGoalPercent >= 100 ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                              <i className="bi bi-check-circle-fill"></i> Goal accomplished today!
                            </span>
                          ) : (
                            `${dailyGoalTarget - todayActivityCount} more cards to hit goal`
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-[#f04824]">{dailyGoalPercent}%</span>
                      </div>
                    </div>

                    {/* Progress bar track */}
                    <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden mb-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-[#f04824] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${dailyGoalPercent}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed inline-flex items-center gap-1.5">
                      <i className="bi bi-lightbulb-fill text-amber-500 shrink-0"></i>
                      <span>A short 5-minute review session protects your streak and cements spaced-repetition memory.</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('flashcards')}
                      className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <IconPlay className="w-3.5 h-3.5 text-[#f04824]" />
                      <span>Practice 10 Cards Now</span>
                    </button>
                  </div>
                </section>

              </div>

              {/* Subject Mastery & Readiness Breakdown */}
              {deckMasteryList.length > 0 && (
                <section className="csm-subject-mastery mb-6 p-5 sm:p-6 rounded-2xl bg-white border border-[#dce5ee] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">READINESS</span>
                      <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Subject Mastery & Weak Spots</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Track your confidence level and mastered cards across subjects.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('library')}
                      className="text-xs font-bold text-[#f04824] hover:underline flex items-center gap-1"
                    >
                      View all decks <IconArrowRight />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {deckMasteryList.map(deck => (
                      <div
                        key={deck.id}
                        className="p-4 rounded-xl border border-zinc-100 hover:border-orange-200 bg-zinc-50/50 hover:bg-orange-50/20 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-zinc-900">{deck.code}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-zinc-200/70 text-zinc-700">
                                {deck.subject || 'General'}
                              </span>
                            </div>
                            {deck.title && <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-[200px]">{deck.title}</p>}
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${deck.masteryPct >= 75 ? 'bg-emerald-50 text-emerald-700' : deck.masteryPct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700'}`}>
                            {deck.masteryPct}% Mastery
                          </span>
                        </div>

                        {/* Mastery Bar */}
                        <div className="w-full bg-zinc-200/80 rounded-full h-1.5 overflow-hidden mb-3">
                          <div
                            className={`h-1.5 rounded-full ${deck.masteryPct >= 75 ? 'bg-emerald-500' : deck.masteryPct >= 40 ? 'bg-amber-500' : 'bg-[#f04824]'}`}
                            style={{ width: `${Math.max(4, deck.masteryPct)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/40">
                          <span>{deck.knownCount} of {deck.totalCards} cards known</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeckIds([deck.id]);
                                setActiveTab('flashcards');
                              }}
                              className="csm-mastery-study-button"
                            >
                              <span>Study</span><IconArrowRight />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeckIds([deck.id]);
                                handleOpenGameMode();
                              }}
                              className="csm-mastery-arena-button"
                            >
                              <IconPlay /><span>Arena</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}



              {/* Co-Study & Gamification Row */}
              <div className="csm-dash-social-grid grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

                {/* Arena & Community Challenge Card */}
                <section className="csm-arena-challenge-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">CO-STUDYMAXX ARENA</span>
                        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Arena Countdown Challenge</h2>
                      </div>
                      <span className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#f04824] shadow-xs">
                        <i className="bi bi-controller text-xl"></i>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">
                      Pressure-based recall with high scores. Challenge your personal record or study with friends.
                    </p>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Best Arena Streak</span>
                        <span className="text-xl font-extrabold text-zinc-900 flex items-center gap-1.5 mt-0.5">
                          <i className="bi bi-fire text-orange-500"></i> {accountStats.studyBestDays || 0}
                          <span className="text-xs font-semibold text-zinc-400">cards</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Arena Sessions</span>
                        <span className="text-xl font-extrabold text-zinc-900 mt-0.5 block">
                          {arenaSessions.length} <span className="text-xs font-semibold text-zinc-400">played</span>
                        </span>
                      </div>
                    </div>

                    {arenaSessions.length > 0 && arenaSessions[0] && (
                      <div className="text-xs text-zinc-600 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/60 mb-3 flex items-center justify-between">
                        <span>Latest: <b>{arenaSessions[0].title || 'Arena Run'}</b></span>
                        <span className="font-bold text-[#f04824]">{arenaSessions[0].correctCount || 0} correct</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={handleOpenGameMode}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#f04824] hover:bg-[#d83c1b] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <span>Enter Bombstyle Arena</span><IconArrowRight />
                    </button>
                    {mostRecentDeck && (
                      <button
                        type="button"
                        onClick={(e) => handleShareDeck(mostRecentDeck, e)}
                        className="py-2.5 px-3 rounded-xl border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Share reviewer with study group"
                      >
                        <IconShare />
                        <span>Share Deck</span>
                      </button>
                    )}
                  </div>
                </section>

                {/* Gamified Achievements & Badges Card */}
                <section className="csm-badges-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">ACHIEVEMENTS</span>
                        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Study Milestones & Badges</h2>
                      </div>
                      <span className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
                        <i className="bi bi-trophy-fill text-xl"></i>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">
                      Earn recognition as you build consistent study habits and master your decks.
                    </p>

                    <div className="space-y-2.5">
                      {badgesList.map(badge => (
                        <div
                          key={badge.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${badge.unlocked ? 'bg-orange-50/40 border-orange-200/60' : 'bg-zinc-50/60 border-zinc-100 opacity-60'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0">{badge.icon}</span>
                            <div>
                              <span className="text-xs font-bold text-zinc-900 block leading-tight">{badge.title}</span>
                              <span className="text-[10px] text-zinc-500">{badge.desc}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.unlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'}`}>
                            {badge.unlocked ? <span className="inline-flex items-center gap-1"><i className="bi bi-check-circle-fill text-[10px]"></i> Unlocked</span> : badge.progress}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{badgesList.filter(b => b.unlocked).length} of {badgesList.length} badges earned</span>
                    <span className="font-semibold text-zinc-600">Keep studying to unlock all!</span>
                  </div>
                </section>

              </div>

              {/* Recent Activity */}
              <section className="csm-live-activity-card">
                <div className="csm-live-activity-heading">
                  <div>
                    <span className="csm-kicker">ACTIVITY</span>
                    <h2>Recent Activity</h2>
                    <p>Your latest accessed study areas and quiz sessions appear here.</p>
                  </div>
                  <button type="button" className="csm-outline-button" onClick={handleOpenLibrary}>
                    View library <IconArrowRight />
                  </button>
                </div>
                <div className="csm-live-activity-list">
                  {recentActivities.length ? recentActivities.slice(0, 5).map(activity => (
                    <button
                      key={activity.id}
                      type="button"
                      className="csm-live-activity-row group"
                      onClick={() => openRecentActivity(activity)}
                      title={`Jump into ${activity.material}`}
                    >
                      <span className={`csm-live-activity-icon ${activity.mode === 'PDF Tools' ? 'bg-red-50 text-red-600 border border-red-200' : activity.mode === 'BombStyle quiz' || activity.mode === 'BombStyle lobby' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        {activity.mode === 'PDF Tools' ? 'PDF' : activity.mode === 'Profile' ? 'ME' : activity.mode === 'BombStyle quiz' || activity.mode === 'BombStyle lobby' ? 'BS' : <IconCards className="w-4 h-4" />}
                      </span>
                      <span className="csm-live-activity-copy">
                        <strong>{activity.material}</strong>
                        <small>{activity.mode} · {formatActivityTime(activity.timestamp)}</small>
                      </span>
                      {activity.accuracy && activity.accuracy !== '—' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 hidden sm:inline-block">
                          {activity.accuracy} acc
                        </span>
                      )}
                      <span className="csm-live-activity-status">{activity.status}</span>
                      <IconArrowRight className="csm-live-activity-arrow w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )) : (
                    <div className="csm-live-activity-empty">No activity has been recorded yet. Study a deck to start tracking!</div>
                  )}
                </div>
              </section>

            </div>

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
                <div className="csm-account-summary-note"><span>Discoverable profile</span><p>Classmates can find your username and display name. Your reviewer decks are shared only according to your privacy settings.</p></div>
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
                <div className="csm-account-security-row"><span className="csm-account-security-icon">•••</span><div><strong>Change your password</strong><p>Verify your current password to set a new one. Email recovery requires the server mail service to be configured.</p></div><button type="button" className="csm-secondary-button" onClick={() => setPasswordResetModalOpen(true)}>Change password</button></div>
              </section>
              <section className="csm-account-card csm-account-policy-card">
                <div className="csm-account-card-heading"><div><span className="csm-kicker">PRIVACY &amp; POLICY</span><h2>Your data in Co-StudyMaxx</h2></div><span className="csm-account-placeholder-badge">Account data</span></div>
                <div className="csm-policy-list">
                  <div className="csm-policy-item"><strong>Account data</strong><p>Your account, profile, reviewer content, uploaded materials, and study results are stored in the private workspace database.</p></div>
                  <div className="csm-policy-item"><strong>Study activity</strong><p>The Home activity list only records the Library materials you open so you can return to your latest study work.</p></div>
                  <div className="csm-policy-item"><strong>Future policy links</strong><p>Privacy policy, terms, account deletion, and data export links will be connected here when the backend is ready.</p></div>
                </div>
                <div className="csm-public-deck-setting">
                  <div><strong>Default deck visibility</strong><p>Your profile remains discoverable by username and display name. This setting controls decks set to “Use profile default”; you can override it for each deck. People search shows Bombcards only. Active share links remain separate and should be disabled from the deck’s Share menu if you want to revoke link access.</p></div>
                  <label><span className="sr-only">Default deck visibility</span><select value={profile.deckVisibility || 'private'} onChange={handleProfileDeckVisibility}><option value="private">Private decks</option><option value="public">Public decks</option></select></label>
                  {privacySaveStatus && <small role="status">{privacySaveStatus}</small>}
                </div>
        <div className="csm-policy-actions"><button type="button" className="csm-secondary-button" onClick={() => triggerToast('Privacy policy is not configured yet.')}>View privacy policy</button><button type="button" className="csm-secondary-button" onClick={async () => { try { CSM.download(await CSM.api('account/export'), 'co-studymaxx-export.json'); } catch (error) { triggerToast(error.message); } }}><IconDownload />Export my data</button></div>
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
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => {
                    if (isGuest) { setGuestLockedSection('creator'); return; }
                    handleOpenCreateFolderInfo();
                  }}
                >
                  {isGuest ? <><IconLock className="w-3.5 h-3.5 mr-1" /> New deck</> : <><IconPlus /> New deck</>}
                </button>
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
                      <div className="flex items-center gap-2">
                        <span className="csm-kicker">{isGuest ? 'SHARED REVIEWER' : 'REVIEWER DECK'}</span>
                        {isGuest && <span className="csm-library-shared-badge">Shared</span>}
                      </div>
                      <h1>{currentSelectedDeck.code || currentSelectedDeck.title}</h1>
                      <p>{currentSelectedDeck.subject || 'Information Technology'} · {isGuest ? `By ${currentSelectedDeck.owner || 'Shared Reviewer'}` : `Updated ${currentSelectedDeck.lastModified || 'recently'}`}</p>
                    </div>
                  </div>
                  <div className="csm-library-detail-actions">
                    {!isGuest && <label className="csm-deck-visibility-control"><span>Deck visibility</span><select aria-label="Deck visibility" value={currentSelectedDeck.visibility || 'inherit'} disabled={deckVisibilitySaving} onChange={event => handleDeckVisibility(currentSelectedDeck, event.target.value)}><option value="inherit">Use profile default ({profile.deckVisibility || 'private'})</option><option value="public">Public</option><option value="private">Private</option></select></label>}
                    <button type="button" className="csm-share-button" onClick={(e) => handleShareDeck(currentSelectedDeck, e)} title="Share this reviewer via link">
                      <IconShare /> Share
                    </button>
                    {!isGuest && <DeckCardActions deck={currentSelectedDeck} />}
                    <button type="button" className="csm-secondary-button" onClick={() => handleOpenDeckStudy(currentSelectedDeck)}><IconNotebook /> Study deck</button>
                    <button
                      type="button"
                      className="csm-primary-button"
                      onClick={() => {
                        if (isGuest) { setGuestLockedSection('arena'); return; }
                        handleOpenDeckStudy(currentSelectedDeck, 'game');
                      }}
                    >
                      {isGuest && <IconLock className="w-3.5 h-3.5 mr-1.5 text-white/90" />}
                      Play Bomb Mode <IconArrowRight />
                    </button>
                  </div>
                </div>

                <div className="csm-library-detail-stats">
                  <div className="csm-library-detail-stat"><small>Bombcards</small><strong>{currentSelectedDeck.cards?.length || 0}</strong></div>
                  <div className="csm-library-detail-stat"><small>PDF notes</small><strong>{currentSelectedDeck.documents?.length || 0}</strong></div>
                  <div className={`csm-library-detail-stat${currentSelectedDeck.cards?.length ? ' accent' : ''}`}><small>Study status</small><strong>{currentSelectedDeck.cards?.length ? 'Ready' : 'Needs cards'}</strong></div>
                </div>

                <section className="csm-library-content-section">
                  <div className="csm-library-section-heading">
                    <div className="csm-library-section-heading-left"><span className="csm-kicker">PRACTICE SET</span><span className="csm-library-count-pill">{currentSelectedDeck.cards?.length || 0} cards</span></div>
                    <div className="csm-library-section-actions">
                      {currentSelectedDeck.cards?.length > 3 && (
                        <button
                          type="button"
                          className="csm-library-show-all"
                          aria-expanded={showAllBombcards}
                          aria-controls="practice-set-cards"
                          onClick={() => setShowAllBombcards(prev => !prev)}
                        >
                          {showAllBombcards ? 'Show less' : 'Show all'}
                        </button>
                      )}
                      {isGuest && <button
                        type="button"
                        onClick={() => setGuestLockedSection('creator')}
                      >
                        <IconLock className="w-3.5 h-3.5 mr-1 text-slate-500" /> Create Bombcards
                      </button>}
                    </div>
                  </div>
                  {!!currentSelectedDeck.cards?.length && !isGuest && (
                    <div className={`csm-bombcard-bulk-toolbar ${bulkDeleteMode ? 'is-selecting' : ''}`}>
                      <div className="csm-bombcard-bulk-controls">
                      {!bulkDeleteMode ? (
                        <button
                          type="button"
                          className="csm-bombcard-bulk-start"
                          onClick={() => {
                            setBulkDeleteMode(true);
                            setSelectedBombcardIds([]);
                            setShowAllBombcards(true);
                          }}
                        >
                          <IconTrash /> Select Cards
                        </button>
                      ) : (
                        <>
                          <div className="csm-bombcard-bulk-selection">
                            <button
                              type="button"
                              className="csm-bombcard-bulk-select-all"
                              onClick={() => {
                                const allIds = (currentSelectedDeck.cards || []).map(card => card.id).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every(id => selectedBombcardIds.includes(id));
                                setSelectedBombcardIds(allSelected ? [] : allIds);
                              }}
                            >
                              {currentSelectedDeck.cards.every(card => card.id && selectedBombcardIds.includes(card.id)) ? 'Deselect all' : `Select all ${currentSelectedDeck.cards.length}`}
                            </button>
                            <span aria-live="polite">{selectedBombcardIds.length} selected</span>
                          </div>
                          <div className="csm-bombcard-bulk-actions">
                            <button type="button" className="csm-bombcard-bulk-cancel" onClick={() => { setBulkDeleteMode(false); setSelectedBombcardIds([]); }}>Cancel</button>
                            <button type="button" className="csm-bombcard-bulk-delete" disabled={!selectedBombcardIds.length} onClick={() => handleBulkRemoveBombcards(currentSelectedDeck)}>
                              <IconTrash /> Delete selected ({selectedBombcardIds.length})
                            </button>
                          </div>
                        </>
                      )}
                      </div>
                      <button type="button" className="csm-bombcard-create-button" onClick={() => {
                        setBulkDeleteMode(false);
                        setSelectedBombcardIds([]);
                        prepareNewBombcard();
                        setSelectedDeckIds([currentSelectedDeck.id]);
                        setCreatorTargetDeckId(currentSelectedDeck.id);
                        setActiveTab('creator');
                      }}><IconPlus /> Create Bombcards</button>
                    </div>
                  )}
                  {(!currentSelectedDeck.cards || currentSelectedDeck.cards.length === 0) ? (
                    <div className="csm-library-empty">
                      <strong>Your Bombcard set is empty</strong>
                      <p>Add your first question manually or explore reviewer tools to start building this set.</p>
                      <button
                        type="button"
                        className="csm-primary-button"
                        onClick={() => {
                          if (isGuest) { setGuestLockedSection('creator'); return; }
                          prepareNewBombcard();
                          setSelectedDeckIds([currentSelectedDeck.id]);
                          setCreatorTargetDeckId(currentSelectedDeck.id);
                          setActiveTab('creator');
                        }}
                      >
                        {isGuest ? <><IconLock className="w-3.5 h-3.5 mr-1" /> Create Bombcards</> : <><IconPlus /> Create Bombcards</>}
                      </button>
                    </div>
                  ) : (
                    <div className="csm-library-bombcard-grid" id="practice-set-cards">
                      {visibleCards.map((card, idx) => {
                        const cardId = card.id || `${currentSelectedDeck.id}-card-${idx}`;
                        const isRevealed = revealedLibraryCards.includes(cardId);
                        const materialMenuOpen = openMaterialMenuId === cardId;
                        const isSelectedForDeletion = selectedBombcardIds.includes(cardId);
                        return (
                          <article key={cardId} className={`csm-library-bombcard ${isRevealed ? 'revealed' : ''} ${isSelectedForDeletion ? 'is-selected-for-delete' : ''}`}>
                            <div className="csm-library-bombcard-top">
                              {bulkDeleteMode ? (
                                <label className="csm-bombcard-select-control">
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForDeletion}
                                    disabled={!card.id}
                                    aria-label={`Select Bombcard ${idx + 1} for deletion`}
                                    onChange={(event) => setSelectedBombcardIds(current => event.target.checked ? [...current, cardId] : current.filter(id => id !== cardId))}
                                  />
                                  <span>{currentSelectedDeck.code || currentSelectedDeck.title} · M{idx + 1}</span>
                                </label>
                              ) : <span>{currentSelectedDeck.code || currentSelectedDeck.title} · M{idx + 1}</span>}
                              {!isGuest && !bulkDeleteMode && <div className="csm-material-actions">
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
                                      onClick={() => startEditingBombcard(currentSelectedDeck, card)}
                                    >
                                      <IconEdit /> Edit Bombcard
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleRemoveBombcard(currentSelectedDeck, cardId)}
                                    >
                                      <IconTrash /> Delete Bombcard
                                    </button>
                                  </div>
                                )}
                              </div>}
                            </div>
                            <p className="csm-library-bombcard-prompt">{card.prompt}</p>
                            {isRevealed && <p className="csm-library-bombcard-answer">{card.correctAnswer || 'Answer not saved yet.'}</p>}
                            <div className="csm-library-bombcard-footer"><small>{card.type === 'MULTIPLE_CHOICE' ? 'Multiple choice' : card.type === 'TRUE_FALSE' ? 'True / False' : 'Identification'}</small><button type="button" className="csm-library-reveal" onClick={() => toggleLibraryCardAnswer(cardId)}>{isRevealed ? 'Hide answer' : 'Reveal answer'}</button></div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="csm-library-content-section">
                  <div className="csm-library-section-heading">
                    <div className="csm-library-section-heading-left"><span className="csm-kicker">REFERENCE NOTES</span><span className="csm-library-count-pill">{currentSelectedDeck.documents?.length || 0} PDFs</span></div>
                    <button
                      className="csm-library-add-pdf-button"
                      type="button"
                      onClick={(e) => {
                        if (isGuest) { setGuestLockedSection('creator'); return; }
                        handleOpenAddMaterialPopup(currentSelectedDeck, e);
                      }}
                    >
                      {isGuest ? <><IconLock className="w-3.5 h-3.5" /> Add PDF</> : <><IconPlus /> Add PDF</>}
                    </button>
                  </div>
                  <div className="csm-library-documents">
                    {(!currentSelectedDeck.documents || currentSelectedDeck.documents.length === 0) ? (
                      <div className="csm-library-empty-row">No documents attached yet. Upload lecture notes or slides to keep them beside this reviewer.</div>
                    ) : currentSelectedDeck.documents.map((doc) => {
                      const docMenuId = `doc-${doc.id}`;
                      const documentMenuOpen = openMaterialMenuId === docMenuId;
                      return (
                        <div key={doc.id} className="csm-library-document">
                          <div className="csm-library-document-main"><span className="csm-library-document-icon">PDF</span><div className="csm-library-document-copy"><button type="button" onClick={() => handleOpenDocument(currentSelectedDeck, doc)}>{doc.title}</button><small>PDF reference · Click to open in PDF Tools</small></div></div>
                          <div className="csm-material-actions flex items-center gap-1.5">
                            {!isGuest && <button
                              type="button"
                              onClick={() => handleOpenAiGenerator(currentSelectedDeck.id, doc)}
                              className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Generate Bombcards from this PDF with Gemini AI"
                            >
                              <IconSparkles className="w-3 h-3 text-purple-600" />
                              <span>AI Cards</span>
                            </button>}
                            <button type="button" className="csm-material-menu-trigger" aria-label={`Document options for ${doc.title}`} aria-expanded={documentMenuOpen} onClick={() => setOpenMaterialMenuId(documentMenuOpen ? null : docMenuId)}><svg className="csm-admin-user-more-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
                            {documentMenuOpen && (
                              <div className="csm-material-menu">
                                <button type="button" onClick={() => { setOpenMaterialMenuId(null); handleOpenDocument(currentSelectedDeck, doc); }}>Open PDF tools</button>
                                <button type="button" onClick={() => { setOpenMaterialMenuId(null); window.location.assign(`${doc.url}&download=1`); }}>Download PDF</button>
                                {!isGuest && <button type="button" onClick={() => { setOpenMaterialMenuId(null); handleOpenAiGenerator(currentSelectedDeck.id, doc); }} className="flex items-center gap-1.5"><IconSparkles className="w-3.5 h-3.5 text-purple-600" /> Generate AI Flashcards</button>}
                                {!isGuest && <button type="button" className="danger" onClick={() => handleRemoveDocument(currentSelectedDeck.id, doc.id)}><IconTrash /> Remove PDF</button>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : (
              <div className="csm-library-main animate-fadeIn">
                <div className="csm-library-toolbar">
                  <label className="csm-library-search"><IconSearch /><input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setLibraryPage(1); }} placeholder="Search decks by title or subject" aria-label="Search decks by title or subject" /></label>
                  <label className="csm-library-filter"><span>Filter</span><select value={librarySubjectFilter} onChange={(e) => { setLibrarySubjectFilter(e.target.value); setLibraryPage(1); }} aria-label="Filter decks by subject">{librarySubjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                </div>

                {(pageRecentDecks.length > 0 || (libraryPage === 1 && recentDecks.length === 0)) && <section className="csm-library-list-section">
                  <div className="csm-library-section-heading"><div><h2>Recently updated</h2><span>{recentDecks.length} deck{recentDecks.length === 1 ? '' : 's'} · last 7 days</span></div><button type="button" onClick={() => setCollapseRecent(prev => !prev)}>{collapseRecent ? 'Show section' : 'Collapse section'}</button></div>
                  {!collapseRecent && (pageRecentDecks.length ? <div className="csm-library-deck-grid">{pageRecentDecks.map(renderLibraryDeckCard)}</div> : <div className="csm-library-empty"><strong>{olderDecks.length ? 'No recently updated decks' : 'No decks match your search'}</strong><p>{olderDecks.length ? 'Your matching reviewers are listed below.' : 'Try another title or subject, or create a fresh reviewer.'}</p><button type="button" className="csm-primary-button" onClick={handleOpenCreateFolderInfo}><IconPlus /> Add a deck</button></div>)}
                </section>}

                {pageOlderDecks.length > 0 && <section className="csm-library-list-section mt-6">
                  <div className="csm-library-section-heading"><div><h2>More reviewers</h2><span>{olderDecks.length} deck{olderDecks.length === 1 ? '' : 's'} · older than a week</span></div><button type="button" onClick={() => setCollapseOlder(prev => !prev)}>{collapseOlder ? 'Show section' : 'Collapse section'}</button></div>
                  {!collapseOlder && <div className="csm-library-deck-grid">{pageOlderDecks.map(renderLibraryDeckCard)}</div>}
                </section>}

                {orderedLibraryDecks.length > 0 && <nav className="csm-library-pagination" aria-label="Deck pages">
                  <span className="csm-library-page-summary">Showing {(libraryPage - 1) * 9 + 1} to {Math.min(libraryPage * 9, orderedLibraryDecks.length)} of {orderedLibraryDecks.length} decks</span>
                  {libraryPageCount > 1 && <div className="csm-library-pagination-controls">
                    <button type="button" className="csm-secondary-button" onClick={() => setLibraryPage(page => Math.max(1, page - 1))} disabled={libraryPage === 1}>Previous</button>
                    <div className="csm-library-page-numbers" aria-label="Select a page">
                      {getCompactPageItems(libraryPage, libraryPageCount).map(item => item.type === 'ellipsis' ? (
                        <span key={item.key} className="csm-library-page-ellipsis" aria-hidden="true">…</span>
                      ) : (
                        <button
                          key={item.value}
                          type="button"
                          className={`csm-library-page-number ${libraryPage === item.value ? 'is-current' : ''}`}
                          aria-label={`Page ${item.value}`}
                          aria-current={libraryPage === item.value ? 'page' : undefined}
                          onClick={() => setLibraryPage(item.value)}
                        >{item.value}</button>
                      ))}
                    </div>
                    <button type="button" className="csm-secondary-button" onClick={() => setLibraryPage(page => Math.min(libraryPageCount, page + 1))} disabled={libraryPage === libraryPageCount}>Next</button>
                  </div>}
                </nav>}
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
                <p>Recall first, reveal the answer when you&apos;re ready. Focus on understanding before moving forward.</p>
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
                    setFlashcardDragX(0);
                    setFlashcardSwipePhase('');
                    window.clearTimeout(flashcardMotionTimerRef.current);
                    flashcardMotionLockRef.current = false;
                  }}
                >
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title || deck.subject || deck.code} ({deck.cards?.length || 0} cards)
                    </option>
                  ))}
                </select>
              </label>
              <div className="csm-viewer-toolbar-actions">
                <button
                  type="button"
                  className="csm-secondary-button"
                  onClick={() => {
                    if (isGuest) { setGuestLockedSection('creator'); return; }
                    prepareNewBombcard();
                    setCreatorTargetDeckId(activeFlashcardDeck?.id || decks[0]?.id);
                    setActiveTab('creator');
                  }}
                >
                  {isGuest ? <IconLock className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> : <IconPlus className="w-3.5 h-3.5 mr-1.5 text-[#f04824]" />} Create Bombcards
                </button>
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => {
                    if (isGuest) { setGuestLockedSection('arena'); return; }
                    handleOpenGameMode(activeFlashcardDeck?.id);
                  }}
                >
                  {isGuest && <IconLock className="w-3.5 h-3.5 mr-1.5 text-white/90" />}
                  Play Bombstyle <IconArrowRight />
                </button>
              </div>
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
                  <div className="csm-flashcard-stage">
                  <button
                    type="button"
                    className={`csm-flashcard csm-study-flip-card ${flashcardFlipped ? 'is-flipped' : ''} ${flashcardIsDragging ? 'is-dragging' : ''} ${flashcardSwipePhase ? `is-swipe-${flashcardSwipePhase}` : ''}`}
                    style={flashcardIsDragging ? { '--flashcard-drag-x': `${flashcardDragX}px`, '--flashcard-drag-rotation': `${flashcardDragX * 0.025}deg` } : undefined}
                    onPointerDown={handleFlashcardPointerDown}
                    onPointerMove={handleFlashcardPointerMove}
                    onPointerUp={handleFlashcardPointerUp}
                    onPointerCancel={handleFlashcardPointerCancel}
                    onClick={() => {
                      if (ignoreFlashcardClickRef.current) {
                        ignoreFlashcardClickRef.current = false;
                        return;
                      }
                      flipFlashcard();
                    }}
                    aria-label={flashcardFlipped ? 'Show question' : 'Reveal answer'}
                  >
                    <span className="csm-study-flip-inner">
                      <span className="csm-study-flip-face csm-study-flip-front" aria-hidden={flashcardFlipped}>
                        <span className="csm-flashcard-side-label">QUESTION</span>
                        <strong>{activeFlashcard?.prompt || 'No cards in this deck yet.'}</strong>
                        <small>Click or press Space to reveal answer &bull; Swipe or use &larr; &rarr; to navigate</small>
                      </span>
                      <span className="csm-study-flip-face csm-study-flip-back" aria-hidden={!flashcardFlipped}>
                        <span className="csm-flashcard-side-label">ANSWER</span>
                        <strong>{activeFlashcard?.correctAnswer || 'No answer saved yet'}</strong>
                        {activeFlashcard?.explanation && <p>{activeFlashcard.explanation}</p>}
                        <small>Click or press Space to see question &bull; Swipe or use &larr; &rarr; to navigate</small>
                      </span>
                    </span>
                  </button>
                  </div>
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
                        prepareNewBombcard();
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
                    onClick={() => navigateFlashcard(-1)}
                    disabled={flashcardIndex === 0 || !!flashcardSwipePhase}
                  >
                    &larr; Previous
                  </button>
                  <button
                    type="button"
                    className="csm-primary-button"
                    onClick={() => navigateFlashcard(1)}
                    disabled={!flashcards.length || flashcardIndex >= flashcards.length - 1 || !!flashcardSwipePhase}
                  >
                    Next card <IconArrowRight />
                  </button>
                </div>
              </section>
              <aside className="csm-review-summary">
                <span className="csm-kicker">SESSION SUMMARY</span>
                <h2>{activeFlashcardDeck?.code || 'Your deck'}</h2>
                <div className="csm-summary-stat"><strong>{flashcards.length}</strong><span>cards in deck</span></div>
                <div className="csm-summary-stat"><strong>{activeDeckAccuracy}%</strong><span>average accuracy</span></div>
                <div className="csm-summary-stat"><strong>{activeDeckMissedCount}</strong><span>missed to revisit</span></div>
                <button
                  type="button"
                  className="csm-secondary-button csm-missed-practice-button"
                  onClick={() => {
                    if (isGuest) { setGuestLockedSection('arena'); return; }
                    setActiveTab('game');
                  }}
                >
                  {isGuest && <IconLock className="w-3 h-3 mr-1 inline-block text-slate-400" />}
                  <span>Practice missed cards</span><IconArrowRight />
                </button>
              </aside>
            </div>
          </div>
        )}

        {/* ========================================================
                VIEW B3: BOMBCARD CREATION STUDIO
                ======================================================== */}
        {activeTab === 'creator' && (() => {
          const currentTargetDeck = decks.find(d => d.id === creatorTargetDeckId) || decks[0];
          const deckCards = currentTargetDeck?.cards || [];
          const mcqCards = deckCards.filter(c => c.type === 'MULTIPLE_CHOICE');
          const idCards = deckCards.filter(c => c.type === 'IDENTIFICATION');

          return (
            <div className="csm-screen csm-creator-screen custom-scroll">
              <div className="csm-studio-container">
                {/* 1. Header */}
                <div className="csm-page-head mb-5">
                  <div>
                    <span className="csm-kicker flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#f04824] animate-pulse"></span>
                      BOMBCARD STUDIO
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{creatorEditingCardId ? 'Edit Bombcard' : 'Create Bombcards'}</h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {creatorEditingCardId ? 'Update the question, answer, or study details for this Bombcard.' : 'Craft high-retention questions step-by-step for your reviewer deck.'}
                    </p>
                  </div>
                  <div className="csm-page-actions flex items-center gap-2.5">
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={() => {
                        if (!creatorEditingCardId) setSelectedDeckForFolderView(null);
                        setCreatorEditingCardId(null);
                        setActiveTab('library');
                      }}
                    >
                      {creatorEditingCardId ? 'Back to Deck' : 'Back to Library'}
                    </button>
                    <button
                      type="button"
                      className="csm-primary-button"
                      onClick={() => {
                        if (currentTargetDeck) setSelectedDeckIds([currentTargetDeck.id]);
                        setActiveTab('flashcards');
                      }}
                    >
                      Go to Study <IconArrowRight />
                    </button>
                  </div>
                </div>

                {/* 2. Compact Studio Context & Control Bar */}
                <div className="csm-studio-control-bar">
                  {/* Left: Deck Context Selector */}
                  <div className="flex items-center gap-2">
                    <label className="csm-studio-deck-pill">
                      <span className="text-[11px] font-bold text-slate-400">{creatorEditingCardId ? 'Editing in:' : 'Creating in:'}</span>
                      <select
                        value={creatorTargetDeckId}
                        onChange={(e) => setCreatorTargetDeckId(e.target.value)}
                        disabled={Boolean(creatorEditingCardId)}
                        aria-label={creatorEditingCardId ? 'Deck containing the Bombcard being edited' : 'Deck for new Bombcards'}
                        className="csm-studio-deck-select"
                      >
                        {decks.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.code} — {d.title || d.subject}
                          </option>
                        ))}
                      </select>
                      <IconChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </label>
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      {deckCards.length} cards
                    </span>
                  </div>

                  {/* Center: Interactive Question Format Switcher */}
                  <div className="csm-studio-type-selector" role="tablist">
                    <button
                      type="button"
                      onClick={() => setCreatorType('MULTIPLE_CHOICE')}
                      className={`csm-studio-type-btn ${creatorType === 'MULTIPLE_CHOICE' ? 'active' : ''}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                        <circle cx="18" cy="6" r="2" fill="currentColor" />
                        <circle cx="6" cy="18" r="2" fill="currentColor" />
                        <circle cx="18" cy="18" r="2" fill="currentColor" />
                      </svg>
                      Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatorType('TRUE_FALSE')}
                      className={`csm-studio-type-btn ${creatorType === 'TRUE_FALSE' ? 'active' : ''}`}
                    >
                      <span className="text-[11px] font-black">T/F</span>
                      True / False
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatorType('IDENTIFICATION')}
                      className={`csm-studio-type-btn ${creatorType === 'IDENTIFICATION' ? 'active' : ''}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="4" y1="7" x2="20" y2="7" />
                        <line x1="4" y1="12" x2="14" y2="12" />
                        <line x1="4" y1="17" x2="18" y2="17" />
                      </svg>
                      Identification
                    </button>
                  </div>

                  {/* Right: Session Tracker & AI Generator Trigger */}
                  <div className="flex items-center gap-2">
                    {creatorSessionCount > 0 && (
                      <span className="text-[11px] font-extrabold text-[#f04824] bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fadeIn">
                        <IconFlame /> {creatorSessionCount} created this session
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenAiGenerator(currentTargetDeck?.id)}
                      className="text-[11px] font-extrabold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/90 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Generate flashcards with Gemini AI"
                    >
                      <IconSparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>AI Generator</span>
                    </button>
                  </div>
                </div>

                {/* 3. Main Studio Workspace Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Interactive Card Builder */}
                  <div className="lg:col-span-8">
                    <div className="csm-studio-card">
                      {/* Top Bar of the Studio Card */}
                      <div className="csm-studio-card-head">
                        <div className="csm-studio-steps">
                          <button
                            type="button"
                            onClick={() => setCreatorStep(1)}
                            className={`csm-studio-step-tab ${creatorStep === 1 ? 'active' : (creatorPrompt.trim() ? 'completed' : '')}`}
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-200/80 text-slate-700">
                              {creatorPrompt.trim() ? '✓' : '1'}
                            </span>
                            Question
                          </button>
                          <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <button
                            type="button"
                            onClick={() => {
                              if (!creatorPrompt.trim()) {
                                triggerToast('Please write the question prompt first.');
                                return;
                              }
                              setCreatorStep(2);
                            }}
                            className={`csm-studio-step-tab ${creatorStep === 2 ? 'active' : ''}`}
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-200/80 text-slate-700">
                              2
                            </span>
                            Answers & Details
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                            {creatorType === 'MULTIPLE_CHOICE' ? '4-Choice MCQ' : creatorType === 'TRUE_FALSE' ? 'True / False' : 'Identification'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 md:p-8">
                        {creatorStep === 1 ? (
                          /* --- STEP 1: THE QUESTION --- */
                          <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                Write Your Question *
                              </label>
                              <span className="text-[11px] font-semibold text-slate-400">
                                Step 1 of 2
                              </span>
                            </div>

                            <div className="relative">
                              <textarea
                                value={creatorPrompt}
                                onChange={(e) => setCreatorPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                                    if (creatorPrompt.trim()) {
                                      e.preventDefault();
                                      setCreatorStep(2);
                                    }
                                  }
                                }}
                                autoFocus
                                placeholder="e.g. Which SQL command removes all rows from a table without logging individual row deletions?"
                                rows="4"
                                className="w-full p-4 bg-[#f8fafc] border-2 border-slate-200/90 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#f04824] focus:bg-white resize-none transition-all leading-relaxed"
                              />
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">Enter</kbd> to continue
                              </span>
                              <button
                                type="button"
                                disabled={!creatorPrompt.trim()}
                                onClick={() => setCreatorStep(2)}
                                className={`h-10 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${creatorPrompt.trim()
                                    ? 'bg-[#f04824] hover:bg-[#e03e1b] text-white shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                              >
                                Next: Set Answers
                                <IconArrowRight />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* --- STEP 2: ANSWERS & DETAILS --- */
                          <div className="animate-fadeIn">
                            {/* Question Summary Bar */}
                            <div className="csm-studio-q-summary">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#f04824] flex-shrink-0">
                                  Q
                                </span>
                                <p className="text-xs font-bold text-slate-800 truncate" title={creatorPrompt}>
                                  {creatorPrompt}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCreatorStep(1)}
                                className="text-[11px] font-bold text-[#f04824] hover:underline flex-shrink-0 ml-2"
                              >
                                Edit Question
                              </button>
                            </div>

                            {/* Options Area */}
                            {creatorType === 'MULTIPLE_CHOICE' ? (
                              <div className="space-y-3 mb-5">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                    Answer Options *
                                  </label>
                                  <span className="text-[11px] font-semibold text-[#f04824]">
                                    Click any option letter to mark as correct
                                  </span>
                                </div>

                                {creatorOptions.map((opt, idx) => {
                                  const isCorrect = creatorCorrectIndex === idx;
                                  const letter = String.fromCharCode(65 + idx);
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => setCreatorCorrectIndex(idx)}
                                      className={`csm-studio-option-row cursor-pointer ${isCorrect ? 'is-correct' : ''}`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCreatorCorrectIndex(idx); }}
                                        className="csm-studio-letter-badge"
                                        title="Designate as correct answer"
                                      >
                                        {isCorrect ? '✓' : letter}
                                      </button>
                                      <input
                                        type="text"
                                        value={opt}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const updated = [...creatorOptions];
                                          updated[idx] = e.target.value;
                                          setCreatorOptions(updated);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            handleSaveBombcard();
                                          }
                                        }}
                                        placeholder={`Option ${letter}${isCorrect ? ' (Write the correct answer here)' : ''}`}
                                        className="flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400"
                                      />
                                      {isCorrect ? (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#f04824] bg-white px-2 py-0.5 rounded-md border border-orange-200/80 shadow-xs flex-shrink-0">
                                          Correct Choice
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setCreatorCorrectIndex(idx); }}
                                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                                        >
                                          Mark correct
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : creatorType === 'TRUE_FALSE' ? (
                              <div className="space-y-3 mb-5">
                                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Correct Answer *</label>
                                <div className="grid grid-cols-2 gap-3">
                                  {['True', 'False'].map(value => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => setCreatorAnswer(value)}
                                      className={`h-14 rounded-xl border-2 text-sm font-extrabold transition-all ${creatorAnswer === value ? 'border-[#f04824] bg-orange-50 text-[#f04824]' : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-slate-300'}`}
                                    >
                                      {value}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* Identification Answer */
                              <div className="space-y-4 mb-5">
                                <div>
                                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                                    Target Correct Answer *
                                  </label>
                                  <input
                                    type="text"
                                    value={creatorAnswer}
                                    onChange={(e) => setCreatorAnswer(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        handleSaveBombcard();
                                      }
                                    }}
                                    autoFocus
                                    placeholder="e.g. TRUNCATE"
                                    className="w-full h-11 px-4 bg-[#f8fafc] border-2 border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#f04824] focus:bg-white transition-all"
                                  />
                                </div>

                                {!creatorShowAlternates && !creatorAlternates ? (
                                  <button
                                    type="button"
                                    onClick={() => setCreatorShowAlternates(true)}
                                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <IconPlus className="w-3 h-3 text-[#f04824]" /> Add accepted alternate spellings (Optional)
                                  </button>
                                ) : (
                                  <div className="animate-fadeIn">
                                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                                      Accepted Alternates (Comma separated)
                                    </label>
                                    <input
                                      type="text"
                                      value={creatorAlternates}
                                      onChange={(e) => setCreatorAlternates(e.target.value)}
                                      placeholder="e.g. truncate, TRUNCATE TABLE"
                                      className="w-full h-9 px-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Optional Study Hint Pill */}
                            <div className="mb-6 pt-3 border-t border-slate-100">
                              {!creatorShowHint && !creatorHint ? (
                                <button
                                  type="button"
                                  onClick={() => setCreatorShowHint(true)}
                                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <IconPlus className="w-3 h-3 text-amber-500" /> Add study hint or topic tag (Optional)
                                </button>
                              ) : (
                                <div className="animate-fadeIn">
                                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                                    Study Hint / Tag
                                  </label>
                                  <input
                                    type="text"
                                    value={creatorHint}
                                    onChange={(e) => setCreatorHint(e.target.value)}
                                    placeholder="e.g. DDL Command, Fast Erase, Chapter 2"
                                    className="w-full h-9 px-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Bottom Actions Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setCreatorStep(1)}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                >
                                  ← Back to Question
                                </button>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatorPrompt('');
                                    setCreatorHint('');
                                    setCreatorOptions(['', '', '', '']);
                                    setCreatorAnswer('');
                                    setCreatorAlternates('');
                                    setCreatorCorrectIndex(0);
                                    setCreatorStep(1);
                                  }}
                                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
                                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">Enter</kbd>
                                </span>
                                <button
                                  type="button"
                                  onClick={handleSaveBombcard}
                                  className="h-11 px-6 rounded-xl bg-[#f04824] hover:bg-[#e03e1b] text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                  {creatorEditingCardId ? <IconEdit className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                                  {creatorEditingCardId ? 'Save Changes' : 'Add Bombcard'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Deck Collection & Quick Study */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Visual Deck Stack Card */}
                    <div className={`csm-studio-card-stack ${creatorCardAddedAnimation ? 'csm-studio-pulse-anim' : ''}`}>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconCards className="w-4 h-4 text-slate-700 flex-shrink-0" />
                          <h3 className="text-xs font-extrabold text-slate-900 truncate">Deck Collection</h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 truncate max-w-[130px] text-right" title={currentTargetDeck?.code || currentTargetDeck?.title}>
                          {currentTargetDeck?.code || currentTargetDeck?.title}
                        </span>
                      </div>

                      {/* Card Pile Visual Representation */}
                      <div className="text-center py-4 bg-white/70 rounded-2xl border border-slate-200/80 mb-4 shadow-xs">
                        <span className="text-3xl font-black text-slate-900 tracking-tight block">
                          {deckCards.length}
                        </span>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5 block">
                          Total Bombcards
                        </span>
                        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {mcqCards.length} MCQ
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {idCards.length} ID
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (currentTargetDeck) setSelectedDeckIds([currentTargetDeck.id]);
                          setActiveTab('flashcards');
                        }}
                        className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm px-3"
                      >
                        <span className="truncate">Study {currentTargetDeck?.code || 'Deck'} Now</span>
                        <IconArrowRight className="w-4 h-4 flex-shrink-0" />
                      </button>
                    </div>

                    {/* Cards in Deck List */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                        <h4 className="text-xs font-extrabold text-slate-900">Cards in this Deck</h4>
                        <span className="text-[11px] font-bold text-slate-400">{deckCards.length} total</span>
                      </div>

                      {deckCards.length === 0 ? (
                        <div className="py-6 text-center">
                          <div className="w-10 h-10 rounded-full bg-orange-50 text-[#f04824] flex items-center justify-center mx-auto mb-2">
                            <IconCards className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">No cards yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Write your question on the left to forge your first card!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                          {deckCards.map((card, idx) => (
                            <div
                              key={card.id || idx}
                              className="p-2.5 bg-[#f8fafc] hover:bg-slate-50 border border-slate-200/70 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-[9px] font-extrabold text-slate-400">
                                    {card.type === 'MULTIPLE_CHOICE' ? 'MCQ' : card.type === 'TRUE_FALSE' ? 'T/F' : 'ID'}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-800 truncate mt-1">{card.prompt}</p>
                              </div>
                              <span className="text-[10px] font-black text-[#f04824] bg-white border border-slate-200 px-2 py-0.5 rounded max-w-[100px] truncate flex-shrink-0">
                                {card.correctAnswer || 'Answer'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
            <div className="csm-page-head csm-pdf-page-head">
              <div>
                <span className="csm-kicker">DOCUMENT STUDY WORKSPACE</span>
                <h1>Study Workspace</h1>
                <p>{isGuest ? 'Read shared reviewer PDFs. Sign in to add highlights, notes, or flashcards.' : 'Read reviewer PDFs, mark key concepts with the Magic Marker, and build active-recall flashcards & notes.'}</p>
              </div>
              <div className="csm-page-actions flex items-center gap-2">
                {activeDocument && !isGuest && (
                  <button
                    type="button"
                    className="csm-primary-button flex items-center gap-1.5 cursor-pointer"
                    style={{ background: '#7c3aed', borderColor: '#6d28d9', color: '#ffffff' }}
                    onClick={() => handleOpenAiGenerator(activeDocument.deckId, activeDocument)}
                    title="Extract text from this PDF and generate Bombcards with Gemini AI"
                  >
                    <IconSparkles className="w-3.5 h-3.5 text-white" />
                    <span>Generate AI Flashcards</span>
                  </button>
                )}
                <button type="button" className="csm-secondary-button" onClick={() => setActiveTab('library')}>Back to library</button>
              </div>
            </div>

            <div className="csm-highlighter-layout">
              {/* Left Column: PDF Viewer Stage & Tools */}
              <section className="csm-pdf-card flex flex-col">
                {/* PDF Viewer Header Toolbar */}
                <div className="csm-pdf-toolbar flex flex-wrap items-center justify-between gap-3">
                  <div className="csm-pdf-document-title">
                    <strong title={activeDocument?.title || 'Choose a PDF to study'}>{activeDocument?.title || 'Choose a PDF to study'}</strong>
                    <span title={activeDocument ? `${decks.find(deck => deck.id === activeDocument.deckId)?.title || 'Your reviewer'} · private to your account` : ''}>
                      {activeDocument ? `${decks.find(deck => deck.id === activeDocument.deckId)?.title || 'Your reviewer'} · private to your account` : 'Choose from your saved reviewer documents'}
                    </span>
                  </div>

                  <div className="csm-pdf-tools flex items-center gap-2 flex-wrap">
                    {/* Search in document toggle */}
                    {activeDocument && (
                      <button
                        type="button"
                        onClick={() => setPdfSearchOpen(!pdfSearchOpen)}
                        className={`h-8 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${pdfSearchOpen ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        title="Search within document text"
                      >
                        <IconSearch />
                        <span>Search</span>
                      </button>
                    )}

                    {/* Zoom Controls */}
                    {activeDocument && (
                      <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold text-slate-700 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setPdfZoom(z => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Zoom out"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfZoom(1.0)}
                          className="px-2 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[11px] cursor-pointer"
                          title="Reset zoom to 100%"
                        >
                          {Math.round(pdfZoom * 100)}%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfZoom(z => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Zoom in"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Document Selector if none active */}
                    {!activeDocument && (
                      <select
                        className="csm-pdf-document-select"
                        value=""
                        aria-label="Choose a PDF"
                        onChange={event => {
                          const found = decks.flatMap(deck => (deck.documents || []).map(document => ({ deck, document }))).find(item => item.document.id === event.target.value);
                          if (found) handleOpenDocument(found.deck, found.document);
                        }}
                      >
                        <option value="">Choose PDF…</option>
                        {decks.flatMap(deck => (deck.documents || []).map(document => (
                          <option key={document.id} value={document.id}>{document.title} · {deck.title}</option>
                        )))}
                      </select>
                    )}

                    {/* Color Swatches */}
                    {['#f5a23a', '#8dc7ef', '#a8d8a8'].map((color, index) => (
                      <button
                        key={color}
                        type="button"
                        className={`csm-pdf-color ${highlightColor === color ? 'active' : ''}`}
                        onClick={() => setHighlightColor(color)}
                        aria-label={['Orange', 'Blue', 'Green'][index] + ' highlight color'}
                        aria-pressed={highlightColor === color}
                        style={{ '--swatch': color }}
                      />
                    ))}

                    {activeDocument && <a className="csm-pdf-open-link" href={activeDocument.url} target="_blank" rel="noreferrer">Open PDF ↗</a>}
                  </div>
                </div>

                {/* Search In-Document Bar */}
                {pdfSearchOpen && activeDocument && (
                  <div className="bg-purple-50/80 border-b border-purple-200 p-3 space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={pdfSearchQuery}
                          onChange={e => setPdfSearchQuery(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handlePdfSearch(); }}
                          placeholder="Search keywords or concepts across document..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium"
                        />
                        <div className="absolute left-2.5 top-2 text-slate-400 pointer-events-none">
                          <IconSearch />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePdfSearch()}
                        disabled={pdfSearching || !pdfSearchQuery.trim()}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {pdfSearching ? 'Searching…' : 'Find'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPdfSearchOpen(false); setPdfSearchResults([]); setPdfSearchQuery(''); }}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                        title="Close search"
                      >
                        <IconClose className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Search Results Summary & Page Jumps */}
                    {pdfSearchResults.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[11px] font-bold text-purple-900">Matches on pages:</span>
                        {pdfSearchResults.map((res, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => setPdfPage(Number(res.page_number))}
                            className="px-2 py-0.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-600 hover:text-white text-[11px] font-extrabold text-purple-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            Page {res.page_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions helper banner */}
                <div className="csm-pdf-instructions">
                  <span className="csm-pdf-instructions-icon"><IconHighlighter className="w-3.5 h-3.5 text-purple-600" /></span>
                  <span>{isGuest ? 'Read-only shared PDF. Sign in to save highlights, notes, or flashcards.' : 'Highlight any text in the PDF with the Magic Marker to create flashcards, add notes, or color-code key excerpts.'}</span>
                </div>

                {/* Enhanced PDF Canvas & Text Layer Viewer */}
                <PdfStudyViewer
                  document={activeDocument}
                  pageNumber={pdfPage}
                  onPageCount={setPdfPageCount}
                  highlights={highlights}
                  onSelection={isGuest ? undefined : handlePdfTextSelection}
                  zoom={pdfZoom}
                  onQuickAction={isGuest ? undefined : handleQuickAction}
                />

                {/* Pagination Controls with Reading Position Auto-Sync */}
                <div className="csm-pdf-pagination">
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() => setPdfPage(page => Math.max(1, page - 1))}
                    disabled={!activeDocument || pdfPage <= 1}
                  >
                    ← Previous
                  </button>
                  <label>
                    Page{' '}
                    <input
                      type="number"
                      min="1"
                      max={pdfPageCount || 1}
                      value={pdfPage}
                      onChange={event => {
                        const page = Number(event.target.value);
                        if (Number.isInteger(page) && page > 0 && page <= pdfPageCount) setPdfPage(page);
                      }}
                      disabled={!activeDocument || !pdfPageCount}
                    />{' '}
                    <span>of {pdfPageCount || '—'}</span>
                  </label>
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() => setPdfPage(page => Math.min(pdfPageCount, page + 1))}
                    disabled={!activeDocument || !pdfPageCount || pdfPage >= pdfPageCount}
                  >
                    Next <IconArrowRight />
                  </button>
                </div>
              </section>

              {/* Right Column: PDF Learning Workspace Sidebar (Assistant, Notes, Flashcards, Highlights) */}
              {isGuest ? (
                <aside className="csm-guest-pdf-tools">
                  <span className="csm-kicker">READ-ONLY PREVIEW</span>
                  <h2>PDF tools are locked</h2>
                  <p>You can read and download this shared PDF. Sign in to create notes, highlights, and flashcards.</p>
                  <a href="login.html?mode=signin">Sign in to unlock</a>
                </aside>
              ) : <LearningWorkspaceSidebar
                activeTab={workspaceSidebarTab}
                setActiveTab={setWorkspaceSidebarTab}
                activeDocument={activeDocument}
                decks={decks}
                pdfPage={pdfPage}
                setPdfPage={setPdfPage}
                pdfSelection={pdfSelection}
                setPdfSelection={setPdfSelection}
                // AI assist
                aiThinking={aiThinking}
                aiAssistantResponse={aiAssistantResponse}
                setAiAssistantResponse={setAiAssistantResponse}
                aiExplainLevel={aiExplainLevel}
                setAiExplainLevel={setAiExplainLevel}
                onAiExplain={handleAiExplain}
                onAiSummarize={handleAiSummarize}
                onAiQuestions={handleAiQuestions}
                onAiNotes={handleAiNotes}
                onAiFlashcards={handleAiFlashcards}
                onAiAsk={handleAiAsk}
                // Notes
                documentNotes={documentNotes}
                documentNotesLoading={documentNotesLoading}
                noteComposerOpen={noteComposerOpen}
                setNoteComposerOpen={setNoteComposerOpen}
                noteFormTitle={noteFormTitle}
                setNoteFormTitle={setNoteFormTitle}
                noteFormContent={noteFormContent}
                setNoteFormContent={setNoteFormContent}
                noteFormPage={noteFormPage}
                setNoteFormPage={setNoteFormPage}
                noteEditingId={noteEditingId}
                setNoteEditingId={setNoteEditingId}
                onSaveNote={handleSaveDocumentNote}
                onDeleteNote={handleDeleteDocumentNote}
                // Flashcards
                studyDecks={studyDecks}
                activeStudyDeckId={activeStudyDeckId}
                setActiveStudyDeckId={setActiveStudyDeckId}
                onCreateStudyDeck={handleCreateStudyDeck}
                studyCards={studyCards}
                studyCardsLoading={studyCardsLoading}
                cardComposerOpen={cardComposerOpen}
                setCardComposerOpen={setCardComposerOpen}
                cardFormQuestion={cardFormQuestion}
                setCardFormQuestion={setCardFormQuestion}
                cardFormAnswer={cardFormAnswer}
                setCardFormAnswer={setCardFormAnswer}
                cardFormExplanation={cardFormExplanation}
                setCardFormExplanation={setCardFormExplanation}
                cardFormTags={cardFormTags}
                setCardFormTags={setCardFormTags}
                cardFormSourcePage={cardFormSourcePage}
                setCardFormSourcePage={setCardFormSourcePage}
                onSaveStudyCard={handleSaveStudyCard}
                onDeleteStudyCard={handleDeleteStudyCard}
                onStartFlashcardReview={(deck) => setReviewingDeck(deck || { title: activeDocument?.title ? `${activeDocument.title} Cards` : 'Review Deck' })}
                // Highlights
                highlights={highlights}
                highlightColor={highlightColor}
                setHighlightColor={setHighlightColor}
                savePdfSelection={savePdfSelection}
                createPdfBombcard={createPdfBombcard}
                handleRemoveHighlight={handleRemoveHighlight}
                handleClearHighlights={handleClearHighlights}
                pdfSaving={pdfSaving}
                pdfCardComposerOpen={pdfCardComposerOpen}
                setPdfCardComposerOpen={setPdfCardComposerOpen}
                pdfSelectionRole={pdfSelectionRole}
                setPdfSelectionRole={setPdfSelectionRole}
                pdfCounterpart={pdfCounterpart}
                setPdfCounterpart={setPdfCounterpart}
                onOpenAiGenerator={() => handleOpenAiGenerator(activeDocument?.deckId, activeDocument)}
                triggerToast={triggerToast}
              />}
            </div>

            {/* Flashcard Active Recall Practice Session Modal */}
            {reviewingDeck && (
              <FlashcardReviewModal
                deck={reviewingDeck}
                cards={studyCards}
                onClose={() => setReviewingDeck(null)}
                onFinish={() => {
                  recordActivity({ material: reviewingDeck?.title || 'Flashcard Review', mode: 'Flashcard Review', screen: 'flashcards', status: 'Completed' });
                  if (activeStudyDeckId) {
                    CSM.api('study-cards&deckId=' + encodeURIComponent(activeStudyDeckId)).then(r => setStudyCards(r?.cards || [])).catch(() => { });
                  }
                }}
                onJumpToPage={(p) => setPdfPage(p)}
                triggerToast={triggerToast}
              />
            )}
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
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
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
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Time Pressure</span>
                      <span className="text-xl font-extrabold text-slate-900 leading-none">10s – 30s</span>
                    </div>
                  </div>
                </div>

                <div className="csm-arena-deck-grid">
                  {arenaDeckChoices.map(deck => {
                    const cardCount = deck.cards ? deck.cards.length : 0;
                    const hasCards = cardCount > 0;
                    const isSelected = bombstyleDeckId === deck.id;
                    const isTemporary = publicArenaDeck?.id === deck.id && !decks.some(ownedDeck => ownedDeck.id === deck.id);

                    return (
                      <div
                        key={deck.id}
                        className={`csm-arena-deck-card ${isSelected ? 'is-selected' : ''} ${!hasCards ? 'is-disabled' : ''} ${isTemporary ? 'is-temporary' : ''}`}
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
                          {isTemporary && (
                            <span
                              className="csm-arena-temporary-badge"
                              title="This shared deck is available in Arena only and is not saved to your library."
                            >
                              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="10" cy="10" r="7.2" />
                                <path d="M10 5.8v4.6l3 1.8" />
                              </svg>
                              <span>Temporary deck</span>
                              <span className="csm-arena-temporary-note">Arena only · not saved</span>
                            </span>
                          )}
                        </div>

                        <div className="csm-arena-deck-bottom">
                          <span className="csm-arena-deck-meta">
                            {deck.category || 'Deck'} &bull; {deck.cards?.length || 0} items
                          </span>
                          <span className="csm-arena-deck-action">
                            {hasCards ? <><span>Select Deck</span><IconArrowRight /></> : 'No cards yet'}
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
                              {key === 'easy' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4C11 4 5 7 5 14c0 3 2 5 5 5 7 0 10-6 10-15Z" /><path d="M4 21c3-5 6-8 11-11" /></svg>}
                              {key === 'normal' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z" /></svg>}
                              {key === 'hard' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>}
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
                      <img src="assets/images/csm-mascot.png" alt="Friendly bomb mascot" />
                    </div>
                    <h2 id="bombstyle-summary-title">Ready when you are.</h2>
                    <p className="csm-bombstyle-summary-subtitle">Here&rsquo;s your game plan.</p>
                    <div className="csm-bombstyle-summary-list">
                      <div><span className="csm-bombstyle-summary-icon"><IconSparkles /></span><span>Difficulty</span><strong>{selectedBombstyleDifficulty.label}</strong></div>
                      <div><span className="csm-bombstyle-summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><span>Starting time</span><strong>{selectedBombstyleDifficulty.timeLabel}</strong></div>
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

            {bombstylePhase === 'countdown' && (
              <section className="csm-bombstyle-countdown" role="status" aria-live="assertive" aria-label={`Game starts in ${bombstyleCountdown} ${bombstyleCountdown === 1 ? 'second' : 'seconds'}`}>
                <span className="csm-kicker">ARENA STARTING</span>
                <svg className="csm-bombstyle-stopwatch" viewBox="0 0 300 320" aria-hidden="true">
                  <rect x="127" y="31" width="46" height="51" rx="5" fill="#ed3e18" />
                  <rect x="96" y="5" width="108" height="34" rx="7" fill="#17172f" />
                  <rect x="103" y="12" width="94" height="19" rx="2" fill="#f04419" />
                  <g transform="rotate(45 270 79)">
                    <rect x="255" y="68" width="30" height="21" rx="4" fill="#17172f" />
                    <rect x="261" y="72" width="18" height="12" rx="2" fill="#f04419" />
                  </g>
                  <circle cx="150" cy="190" r="123" fill="#27263d" stroke="#17172f" strokeWidth="8" />
                  <circle cx="150" cy="190" r="111" fill="#4a495f" />
                  <circle cx="150" cy="190" r="101" fill="#eeeaf3" stroke="#d7d3df" strokeWidth="4" />
                  <g className="csm-bombstyle-stopwatch-ticks" fill="none" stroke="#17172f" strokeLinecap="round" strokeWidth="7">
                    <path d="M150 91v16" />
                    <path d="m225 115-12 12" />
                    <path d="M249 190h-16" />
                    <path d="m225 265-12-12" />
                    <path d="M150 289v-16" />
                    <path d="m75 265 12-12" />
                    <path d="M51 190h16" />
                    <path d="m75 115 12 12" />
                  </g>
                  <g
                    className="csm-bombstyle-stopwatch-hand"
                    style={{ transform: `rotate(${(3 - bombstyleCountdown) * 120}deg)` }}
                  >
                    <path d="M150 126 160 181a10 10 0 0 1-20 0Z" fill="#f04419" stroke="#17172f" strokeWidth="6" strokeLinejoin="round" />
                  </g>
                  <text className="csm-bombstyle-countdown-number" x="150" y="221" key={bombstyleCountdown}>{bombstyleCountdown}</text>
                  <text className="csm-bombstyle-stopwatch-unit" x="150" y="244">SEC</text>
                  <circle cx="150" cy="190" r="9" fill="#17172f" />
                  <circle cx="150" cy="190" r="4" fill="#f04419" />
                </svg>
                <h1>Get ready</h1>
                <p>{bombstyleActiveDeck?.code || bombstyleActiveDeck?.title || 'Your deck'} is about to begin.</p>
                <button type="button" className="csm-bombstyle-cancel-button csm-bombstyle-countdown-cancel" onClick={cancelBombstyleCountdown}>Cancel countdown</button>
              </section>
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
                      onClick={() => requestBombstyleExit(() => setBombstylePhase('select_deck'))}
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
                      <svg className="w-3.5 h-3.5 inline-block mr-1 text-amber-500 fill-amber-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                      STREAK ×{bombstyleStreak}
                    </div>

                  </div>
                </header>

                {/* Central Stage */}
                <div className="csm-arena-stage-center relative">
                  {/* Micro Feedback Popup */}
                  {bombstyleFeedback === 'defused' && (
                    <div className="bombstyle-feedback-pill defused">
                      <svg className="w-4 h-4 inline-block mr-1 fill-emerald-500" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                      DEFUSED!
                    </div>
                  )}
                  {isBombWrong && (
                    <div className="bombstyle-feedback-pill wrong">
                      WRONG ANSWER
                    </div>
                  )}
                  {bombstyleFeedback === 'exploded' && (
                    <div className="bombstyle-feedback-pill exploded">
                      <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                      EXPLODED!
                    </div>
                  )}

                  {/* Animated SVG Bomb Mascot */}
                  <div className="csm-arena-mascot-wrap">
                  <div className={`relative transition-transform duration-150 ${isBombExploded ? 'csm-arena-mascot-exploding' : isBombWrong ? 'csm-arena-mascot-wrong' : isBombDanger ? 'csm-arena-mascot-danger' : 'csm-arena-mascot-calm'}`}>
                    {/* Glow Aura */}
                    <div className={`absolute inset-2 rounded-full blur-xl transition-opacity duration-300 pointer-events-none ${(isBombDanger || isBombWrong || isBombExploded) ? 'bg-orange-500/20 opacity-100' : 'bg-[#f04824]/10 opacity-50'}`} />

                    <svg width="150" height="150" viewBox="0 0 200 200" className="relative z-10 drop-shadow-lg" role="img" aria-label={bombstyleFeedback === 'defused' ? 'Happy defused bomb' : isBombExploded ? 'Friendly surprised exploding bomb' : isBombWrong ? 'Bomb mascot reacting to an incorrect answer' : isBombStartled ? 'Startled bomb with a sweat drop and exclamation mark' : isBombWorried ? 'Worried sweating bomb' : 'Happy bomb mascot'}>
                      <defs>
                        <radialGradient id="bsBombBody" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#45464b" />
                          <stop offset="45%" stopColor="#202126" />
                          <stop offset="100%" stopColor="#0c0d10" />
                        </radialGradient>
                        <radialGradient id="bsBombDangerBody" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffda95" />
                          <stop offset="45%" stopColor="#ff9c38" />
                          <stop offset="100%" stopColor="#e65a24" />
                        </radialGradient>
                        <radialGradient id="bsBombWrongBody" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffc19c" />
                          <stop offset="48%" stopColor="#fb754b" />
                          <stop offset="100%" stopColor="#d9472b" />
                        </radialGradient>
                        <radialGradient id="bsBombDefusedBody" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#dcfff0" />
                          <stop offset="45%" stopColor="#72e6b1" />
                          <stop offset="100%" stopColor="#16a66a" />
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
                        d="M 100 48 C 94 26, 126 36, 132 15"
                        fill="none"
                        stroke={bombstyleFeedback === 'defused' ? '#059669' : isBombWrong ? '#b93824' : (isBombDanger || isBombExploded) ? '#c2410c' : '#d97706'}
                        strokeWidth="6"
                        strokeLinecap="round"
                      />

                      {/* Fuse Spark */}
                      {bombstyleFeedback !== 'defused' && (
                        <g transform="translate(132, 15)">
                          <circle cx="0" cy="0" r="10" fill="url(#bsSpark)" className="animate-spark-pulse" />
                          <path d="M 0 -12 L 0 -4 M 0 4 L 0 12 M -12 0 L -4 0 M 4 0 L 12 0" stroke={(isBombWrong || isBombDanger || isBombExploded) ? "#fb6542" : "#fef08a"} strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                        </g>
                      )}

                      {/* Cap */}
                      <rect x="87" y="40" width="26" height="17" rx="6" fill="#45464b" stroke="#25262b" strokeWidth="2" />
                      <path d="M 93 45 H 106" stroke="#85868d" strokeWidth="3" strokeLinecap="round" />

                      {/* Sphere */}
                      <ellipse
                        cx="100"
                        cy="116"
                        rx="73"
                        ry="70"
                        fill={bombstyleFeedback === 'defused' ? 'url(#bsBombDefusedBody)' : isBombWrong ? 'url(#bsBombWrongBody)' : (isBombDanger || isBombExploded) ? 'url(#bsBombDangerBody)' : 'url(#bsBombBody)'}
                        stroke={bombstyleFeedback === 'defused' ? '#059669' : isBombWrong ? '#c2412d' : (isBombDanger || isBombExploded) ? '#ea580c' : '#3f3f46'}
                        strokeWidth="2.5"
                      />
                      {/* Soft shell sheen keeps the rounded body readable at small sizes. */}
                      <path d="M 48 91 Q 58 65 83 61" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.13" />
                      <path d="M 131 171 Q 150 162 157 147" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" opacity="0.08" />

                      {/* Eyes & Mouth Expression */}
                      {bombstyleFeedback === 'defused' ? (
                        <g>
                          <path d="M 73 111 L 80 103 L 87 111 M 113 111 L 120 103 L 127 111" fill="none" stroke="#065f46" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 82 128 Q 100 148 118 128" fill="none" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
                        </g>
                      ) : isBombExploded ? (
                        <g>
                          {/* A soft surprised expression keeps wrong-answer feedback friendly. */}
                          <path d="M 70 111 Q 79 101 88 111 M 112 111 Q 121 101 130 111" fill="none" stroke="#71351d" strokeWidth="4.5" strokeLinecap="round" />
                          <ellipse cx="100" cy="136" rx="5.5" ry="7" fill="none" stroke="#71351d" strokeWidth="3.5" />
                          <circle cx="72" cy="128" r="5" fill="#fb7185" opacity="0.28" />
                          <circle cx="128" cy="128" r="5" fill="#fb7185" opacity="0.28" />
                        </g>
                      ) : isBombWrong ? (
                        <g>
                          <path d="M 72 111 L 80 105 L 88 111 M 112 111 L 120 105 L 128 111" fill="none" stroke="#7f271c" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 88 137 Q 100 125 112 137" fill="none" stroke="#7f271c" strokeWidth="4" strokeLinecap="round" />
                          <circle cx="72" cy="128" r="5" fill="#be123c" opacity="0.48" />
                          <circle cx="128" cy="128" r="5" fill="#be123c" opacity="0.48" />
                        </g>
                      ) : isBombStartled ? (
                        <g fill="none" stroke={isBombDanger ? '#71351d' : '#fff4e6'} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 73 104 L 83 110 L 73 116 M 127 104 L 117 110 L 127 116" strokeWidth="4.5" />
                          <path d="M 73 94 L 85 91 M 115 91 L 127 94" strokeWidth="3" />
                          <ellipse cx="100" cy="134" rx="5" ry="7" strokeWidth="3.5" />
                        </g>
                      ) : isBombWorried ? (
                        <g>
                          <path d="M 72 110 L 80 103 L 88 110" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 112 110 L 120 103 L 128 110" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 72 96 L 86 92 M 114 92 L 128 96" fill="none" stroke="#fff4e6" strokeWidth="3" strokeLinecap="round" />
                          <path d="M 91 136 Q 100 129 109 136" fill="none" stroke="#fff4e6" strokeWidth="3.5" strokeLinecap="round" />
                          <circle cx="72" cy="128" r="5" fill="#fb7185" opacity="0.3" />
                          <circle cx="128" cy="128" r="5" fill="#fb7185" opacity="0.3" />
                        </g>
                      ) : (
                        <g>
                          <path d="M 73 110 L 80 103 L 87 110" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 113 110 L 120 103 L 127 110" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="76" cy="126" r="5" fill="#fb7185" opacity="0.35" />
                          <circle cx="124" cy="126" r="5" fill="#fb7185" opacity="0.35" />
                          <path d="M 90 130 Q 100 141 110 130" fill="none" stroke="#fff4e6" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                      )}
                      {(isBombWorried || isBombStartled) && (
                        <g>
                          {/* One temple sweat bead, clearly above the eyes. */}
                          <path d="M 51 65 C 48 74 41 81 41 87 C 41 99 59 99 59 87 C 59 81 54 72 51 65 Z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1.5" />
                          <path d="M 46 84 Q 44 88 47 91" fill="none" stroke="#e0f2fe" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      )}
                      {isBombStartled && (
                        <g transform="rotate(12 180 69)" aria-hidden="true">
                          <rect x="169" y="47" width="22" height="40" rx="11" fill="#fff3e3" stroke="#fdba74" strokeWidth="1.5" />
                          <path d="M 180 56 V 69" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
                          <circle cx="180" cy="78" r="2.2" fill="#c2410c" />
                        </g>
                      )}
                    </svg>
                  </div>
                  {isBombExploded && (
                    <div className="csm-arena-cartoon-explosion" aria-hidden="true">
                      <span className="csm-arena-smoke puff-1" /><span className="csm-arena-smoke puff-2 is-dark" />
                      <span className="csm-arena-smoke puff-3" /><span className="csm-arena-smoke puff-4 is-dark" />
                      <span className="csm-arena-smoke puff-5 is-dark" /><span className="csm-arena-smoke puff-6" />
                      <span className="csm-arena-smoke puff-7" /><span className="csm-arena-smoke puff-8 is-dark" />
                      <span className="csm-arena-smoke puff-9 is-dark" /><span className="csm-arena-smoke puff-10" />
                      <span className="csm-arena-smoke puff-11" /><span className="csm-arena-smoke puff-12 is-dark" />
                      <i className="csm-arena-debris debris-1" /><i className="csm-arena-debris debris-2" />
                      <i className="csm-arena-debris debris-3" /><i className="csm-arena-debris debris-4" />
                      <i className="csm-arena-debris debris-5" /><i className="csm-arena-debris debris-6" />
                      <i className="csm-arena-debris debris-7" /><i className="csm-arena-debris debris-8" />
                    </div>
                  )}
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
                    <div className={`csm-arena-answer-box ${isBombExploded || isBombWrong ? 'incorrect' : 'correct'}`} role="status" aria-live="polite">
                      {bombstyleAnswerDraft && <div className="csm-arena-submitted-answer">YOUR ANSWER: {bombstyleAnswerDraft}{isBombExploded || isBombWrong ? ' — INCORRECT' : ''}</div>}
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
                      activeBombstyleCard.type === 'MULTIPLE_CHOICE' ? (
                        <div className="csm-arena-answer-choice-wrap">
                          <div className="csm-arena-choice-grid">
                          {(activeBombstyleCard.options || []).map((option, optionIndex) => (
                            <button key={optionIndex} type="button" className="csm-arena-choice-btn" onClick={() => handleBombstyleAnswer(option)}>
                              <span>{optionIndex + 1}</span>{option}
                            </button>
                          ))}
                          </div>
                          <div className="csm-arena-shortcut-hint">Keyboard: press 1-{Math.min(activeBombstyleCard.options?.length || 0, 8)} to answer</div>
                        </div>
                      ) : activeBombstyleCard.type === 'TRUE_FALSE' ? (
                        <div className="csm-arena-answer-choice-wrap">
                          <div className="csm-arena-choice-grid csm-arena-boolean-grid">
                          {['True', 'False'].map(option => (
                            <button key={option} type="button" className="csm-arena-choice-btn" onClick={() => handleBombstyleAnswer(option)}>
                              <span>{option === 'True' ? '✓' : '×'}</span>{option}
                            </button>
                          ))}
                          </div>
                          <div className="csm-arena-shortcut-hint">Keyboard: press 1 for True or 2 for False</div>
                        </div>
                      ) : (
                        <form className="csm-arena-identification-form" onSubmit={event => { event.preventDefault(); handleBombstyleAnswer(bombstyleAnswerDraft); }}>
                          <input
                            ref={bombstyleAnswerInputRef}
                            type="text"
                            value={bombstyleAnswerDraft}
                            onChange={event => {
                              const value = event.target.value;
                              setBombstyleAnswerDraft(value);
                              if (value.trim()) setBombstyleAnswerError('');
                            }}
                            placeholder="Type your answer"
                            autoComplete="off"
                            aria-label="Your answer"
                            aria-invalid={!!bombstyleAnswerError}
                            aria-describedby={bombstyleAnswerError ? 'bombstyle-answer-error' : undefined}
                          />
                          <button type="submit">Submit Answer</button>
                          {bombstyleAnswerError && <span id="bombstyle-answer-error" className="csm-arena-answer-error" role="alert">{bombstyleAnswerError}</span>}
                        </form>
                      )
                    ) : (
                      <div className="csm-arena-answer-status">Answer submitted — advancing automatically</div>
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
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="7" /><path d="M12 7V4" /><path d="M9 4h6" /></svg>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        REVIEW MISSED CARDS ({bombstyleMissedCards.length})
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="csm-arena-primary-btn"
                        onClick={() => handleStartBombstyle()}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
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
                  <div className="csm-page-actions csm-bombstyle-missed-actions">
                    <button
                      type="button"
                      className="csm-primary-button"
                      onClick={handleStudyMissedDeck}
                    >
                      <IconCards /> <span>Library</span>
                    </button>
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={() => handleStartBombstyle(bombstyleMissedCards)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 17.2 6L20 12M4 12l2.8 6A7 7 0 0 0 18.4 15"/></svg>
                      <span>Retry</span>
                    </button>
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={() => setBombstylePhase('results')}
                    >
                      <IconArrowLeft /> <span>Back to Results</span>
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
                          {card.resultReason === 'timed_out' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg style={{ width: '12px', height: '12px', color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 2" /></svg>
                              Timed Out
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg style={{ width: '12px', height: '12px', color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              Missed
                            </span>
                          )}
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
        <div className="csm-modal-backdrop csm-bombstyle-exit-backdrop" role="presentation" onClick={resumeBombstyleSession}>
          <div className="csm-bombstyle-exit-modal" role="dialog" aria-modal="true" aria-labelledby="bombstyle-exit-title" aria-describedby="bombstyle-exit-description" onClick={(event) => event.stopPropagation()}>
            <div className="csm-bombstyle-exit-heading">
              <div className="csm-bombstyle-exit-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 3.9 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <div>
                <span className="csm-kicker">LEAVE SESSION?</span>
                <h2 id="bombstyle-exit-title">Exit Bombstyle?</h2>
              </div>
            </div>
            <p id="bombstyle-exit-description">Your answers are saved. Leaving now will end this round and return you to the Arena.</p>
            <div className="csm-bombstyle-exit-actions">
              <button type="button" className="csm-secondary-button" autoFocus onClick={resumeBombstyleSession}>Cancel</button>
              <button
                type="button"
                className="csm-danger-button"
                onClick={async () => {
                  try { if (!isGuest) { await CSM.api('arena/abandon', 'POST', { id: bombstyleSessionId }); await refreshWorkspace(); } } catch (error) { triggerToast(error.message); }
                  const afterExit = pendingBombstyleExitActionRef.current;
                  pendingBombstyleExitActionRef.current = null;
                  setBombstyleExitModalOpen(false);
                  setBombstyleFeedback(null);
                  setBombstyleRevealed(false);
                  bombstyleAnswerSubmittedRef.current = false;
                  setBombstylePhase('select_deck');
                  afterExit?.();
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
            <label className="csm-modal-field">Deck title<input autoFocus type="text" value={folderNameInput} onChange={(e) => setFolderNameInput(e.target.value)} placeholder="e.g. ITE 292 B1" maxLength="160" aria-invalid={folderNameDuplicate} aria-describedby={folderNameDuplicate ? 'deck-title-error' : undefined} required />{folderNameDuplicate && <span id="deck-title-error" className="text-[11px] font-semibold text-red-600">You already have a deck with this title.</span>}</label>
            <label className="csm-modal-field">Subject<input type="text" value={folderDescInput} onChange={(e) => setFolderDescInput(e.target.value)} placeholder="e.g. Information Technology" /></label>
            <div className="csm-delete-actions"><button type="button" className="csm-secondary-button" onClick={() => setFolderInfoModalOpen(false)}>Cancel</button><button type="submit" className="csm-primary-button" disabled={!canonicalDeckTitle(folderNameInput) || folderNameDuplicate}>{targetFolderForEdit ? 'Save changes' : 'Add deck'}</button></div>
          </form>
        </div>
      )}

      {deleteDeckTarget && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setDeleteDeckTarget(null)}>
          <div className="csm-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-deck-title" onClick={(e) => e.stopPropagation()}>
            <div className="csm-delete-icon"><IconTrash /></div>
            <span className="csm-kicker">DECK ARCHIVE</span>
            <h2 id="delete-deck-title">Move “{deleteDeckTarget.code || deleteDeckTarget.title}” to Archive?</h2>
            <p>The deck, Bombcards, and PDFs will be kept safely in your archive. You can restore the deck later.</p>
            <div className="csm-delete-actions">
              <button type="button" className="csm-secondary-button" onClick={() => setDeleteDeckTarget(null)}>Cancel</button>
              <button type="button" className="csm-primary-button" onClick={confirmDeleteFolder}>Move to archive</button>
            </div>
          </div>
        </div>
      )}

      {signOutConfirmationOpen && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => { if (!signOutBusy) setSignOutConfirmationOpen(false); }}>
          <div className="csm-signout-modal" role="dialog" aria-modal="true" aria-labelledby="signout-confirmation-title" aria-describedby="signout-confirmation-copy" onClick={event => event.stopPropagation()}>
            <button type="button" className="csm-signout-close" aria-label="Close sign-out confirmation" disabled={signOutBusy} onClick={() => setSignOutConfirmationOpen(false)}>×</button>
            <div className="csm-signout-warning" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></div>
            <h2 id="signout-confirmation-title">Are you sure you want to sign out?</h2>
            <p id="signout-confirmation-copy">You’ll need to sign in again to access your workspace.</p>
            {signOutError && <p className="csm-signout-error" role="alert">{signOutError}</p>}
            <div className="csm-signout-actions">
              <button type="button" className="csm-secondary-button" disabled={signOutBusy} onClick={() => setSignOutConfirmationOpen(false)}>No, cancel</button>
              <button type="button" className="csm-signout-danger-button" disabled={signOutBusy} onClick={async () => {
                setSignOutBusy(true);
                setSignOutError('');
                const controller = new AbortController();
                const timeoutId = window.setTimeout(() => controller.abort(), 12000);
                try {
                  await CSM.api('auth/logout', 'POST', {}, { signal: controller.signal });
                  window.location.replace('login.html?mode=signin&reason=signed_out');
                } catch (error) {
                  setSignOutBusy(false);
                  setSignOutError(controller.signal.aborted ? 'Sign out is taking longer than expected. Check your connection and try again.' : `Couldn’t sign you out: ${error.message}`);
                } finally {
                  window.clearTimeout(timeoutId);
                }
              }}>{signOutBusy ? 'Signing out…' : 'Yes, sign out'}</button>
            </div>
          </div>
        </div>
      )}

      {deckVisibilityNotice && <div className={`csm-deck-visibility-toast ${deckVisibilityNotice.isError ? 'is-error' : ''}`} role={deckVisibilityNotice.isError ? 'alert' : 'status'} aria-live="polite">
        {!deckVisibilityNotice.isError && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
        <span>{deckVisibilityNotice.message}</span>
      </div>}

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

      {aiCardsAddedModal && (
        <div className="csm-modal-backdrop" role="presentation">
          <section className="csm-change-modal csm-ai-added-modal" role="dialog" aria-modal="true" aria-labelledby="ai-cards-added-title" aria-describedby="ai-cards-added-copy">
            <div className="csm-change-icon csm-ai-added-icon" aria-hidden="true"><IconSparkles className="w-5 h-5" /></div>
            <span className="csm-kicker">AI CARDS ADDED</span>
            <h2 id="ai-cards-added-title">Your new Bombcards are ready</h2>
            <p id="ai-cards-added-copy"><strong>{aiCardsAddedModal.count}</strong> AI-generated {aiCardsAddedModal.count === 1 ? 'card was' : 'cards were'} added to “{aiCardsAddedModal.deckTitle}”.</p>
            <button type="button" className="csm-primary-button" autoFocus onClick={() => setAiCardsAddedModal(null)}>Okay</button>
          </section>
        </div>
      )}

      {shareDeckTarget && (
        <div className="csm-modal-backdrop" role="presentation" onClick={() => setShareDeckTarget(null)}>
          <div className="csm-share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="csm-form-modal-header">
              <div>
                <span className="csm-kicker">SHARE REVIEWER</span>
                <h2 id="share-modal-title">Share “{shareDeckTarget.code || shareDeckTarget.title}”</h2>
              </div>
              <button type="button" className="csm-form-modal-close" onClick={() => setShareDeckTarget(null)} aria-label="Close">×</button>
            </div>
            <p className="csm-form-modal-help">
              Anyone with this link can view the reviewer, study its cards, and read shared PDFs. Editing tools require signing in.
            </p>

            {shareModalLoading && !shareModalData ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Generating unique share link...
              </div>
            ) : shareModalError ? (
              <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '11px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{shareModalError}</p>
                <div style={{ marginTop: '10px' }}>
                  <button type="button" className="csm-secondary-button" onClick={() => handleShareDeck(shareDeckTarget)}>Try Again</button>
                </div>
              </div>
            ) : shareModalData && (
              <div>
                <div>
                  {shareModalData.isActive ? (
                    <span className="csm-share-status active">● Link active — Guest access enabled</span>
                  ) : (
                    <span className="csm-share-status inactive">○ Link disabled — Access revoked</span>
                  )}
                </div>

                <div className="csm-share-url-group">
                  <input
                    type="text"
                    readOnly
                    value={shareModalData.url || ''}
                    className="csm-share-url-input"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className={`csm-copy-button ${shareModalCopied ? 'copied' : ''}`}
                    onClick={handleCopyShareUrl}
                  >
                    {shareModalCopied ? (
                      <React.Fragment><i className="bi bi-check-lg"></i> Copied!</React.Fragment>
                    ) : (
                      <React.Fragment><IconShare /> Copy Link</React.Fragment>
                    )}
                  </button>
                </div>

                <div className="csm-share-actions-row">
                  {!isGuest && (shareModalData.isActive ? (
                    <button
                      type="button"
                      className="csm-secondary-button danger-tint"
                      disabled={shareModalLoading}
                      onClick={() => handleToggleShareActive(false)}
                    >
                      Disable / Revoke Link
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="csm-secondary-button success-tint"
                      disabled={shareModalLoading}
                      onClick={() => handleToggleShareActive(true)}
                    >
                      Enable Link
                    </button>
                  ))}

                  {!isGuest && <button
                    type="button"
                    className="csm-secondary-button"
                    disabled={shareModalLoading}
                    onClick={handleRegenerateShareLink}
                    title="Generate a fresh token and deactivate the previous link"
                  >
                    Regenerate Link
                  </button>}

                  {shareModalData.isActive && (
                    <a
                      href={shareModalData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="csm-secondary-button"
                      style={{ marginLeft: 'auto', textDecoration: 'none' }}
                    >
                      Open as Guest ↗
                    </a>
                  )}
                </div>

                <div className="csm-share-tip">
                  Guests can open and study this shared reviewer without signing in. Reviewer editing tools remain locked.
                </div>
              </div>
            )}

            <div className="csm-delete-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="csm-primary-button" onClick={() => setShareDeckTarget(null)}>Done</button>
            </div>
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
            {newPasswordDraft && <PasswordStrengthIndicator password={newPasswordDraft} />}
            <input className="csm-password-input" type="password" autoComplete="new-password" aria-label="Confirm new password" required minLength={8} maxLength={72} placeholder="Confirm new password" value={confirmPasswordDraft} onChange={event => setConfirmPasswordDraft(event.target.value)} />
            <div className="csm-password-actions">
              <button type="submit" className="csm-primary-button">Update password</button>
              <button type="button" className="csm-secondary-button" onClick={() => setPasswordResetModalOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {passwordErrorModal && (
        <div className="csm-modal-backdrop csm-password-error-backdrop" role="presentation" onClick={() => setPasswordErrorModal(null)}>
          <section className="csm-password-error-modal" role="alertdialog" aria-modal="true" aria-labelledby="password-error-title" aria-describedby="password-error-copy" onClick={event => event.stopPropagation()}>
            <span className="csm-password-error-icon" aria-hidden="true">!</span>
            <span className="csm-kicker">PASSWORD NOT UPDATED</span>
            <h2 id="password-error-title">{passwordErrorModal.title}</h2>
            <p id="password-error-copy">{passwordErrorModal.message}</p>
            <button type="button" className="csm-primary-button" onClick={() => setPasswordErrorModal(null)}>Try again</button>
          </section>
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

              {/* Option 3: Generate AI Bombcards */}
              <div
                onClick={() => {
                  const targetDeck = targetDeckForAddMaterial || decks[0];
                  setIsAddMaterialPopupOpen(false);
                  handleOpenAiGenerator(targetDeck?.id);
                }}
                className="bg-[#f8f9fa] hover:bg-purple-50/40 border border-slate-200/90 hover:border-purple-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                    <IconSparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                        Generate with AI
                      </h4>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                        Gemini
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Generate Bombcards from notes with AI
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
              MODAL: GEMINI AI BOMBCARD GENERATOR
              ======================================================== */}
      {aiGeneratorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => { if (!aiLoading) setAiGeneratorOpen(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-[26px] p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                  <IconSparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      AI Bombcard Maker
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Gemini Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {aiStage === 'input'
                      ? 'Paste lecture notes or summaries to forge high-retention questions.'
                      : `Review & approve ${aiGeneratedCards.length} generated Bombcards before adding to deck.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => setAiGeneratorOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scroll py-5 space-y-5 pr-1">
              {aiStage === 'input' ? (
                <>
                  {/* Top Source Mode Tabs */}
                  <div className="flex p-1 bg-slate-100/90 rounded-2xl gap-1 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setAiSourceType('pdf')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${aiSourceType === 'pdf'
                          ? 'bg-white text-purple-900 shadow-sm border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <IconPdf className="w-3.5 h-4 text-purple-600" />
                      <span>From PDF Document</span>
                      {aiPdfExtractedSummary && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold ml-1">
                          ✓ Ready
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSourceType('text')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${aiSourceType === 'text'
                          ? 'bg-white text-purple-900 shadow-sm border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <IconFileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>From Pasted Text / Notes</span>
                    </button>
                  </div>

                  {/* Target Reviewer Deck Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Target Reviewer Deck
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Flashcards will be added here
                      </span>
                    </div>
                    <select
                      value={aiTargetDeckId}
                      onChange={(e) => handleTargetDeckChange(e.target.value)}
                      className="w-full h-11 px-3.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-400 focus:bg-white transition-all cursor-pointer"
                    >
                      {decks.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.title || d.subject} ({d.cards?.length || 0} cards · {d.documents?.length || 0} PDFs)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SOURCE 1: FROM PDF DOCUMENT */}
                  {aiSourceType === 'pdf' ? (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Sub-selector: Upload New PDF vs Pick Attached Document */}
                      {(() => {
                        const currentDeck = decks.find(d => d.id === aiTargetDeckId);
                        const deckDocs = currentDeck?.documents || [];
                        return (
                          <div className="space-y-3">
                            {deckDocs.length > 0 && (
                              <div className="flex items-center gap-2 pb-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAiPdfSourceMode('upload');
                                    if (aiUploadedPdfFile) {
                                      extractPdfText({ type: 'file', file: aiUploadedPdfFile });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${aiPdfSourceMode === 'upload'
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                  Upload / Drop PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAiPdfSourceMode('library');
                                    const defaultDoc = aiSelectedLibraryDoc || deckDocs[0];
                                    setAiSelectedLibraryDoc(defaultDoc);
                                    extractPdfText({ type: 'doc', doc: defaultDoc });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${aiPdfSourceMode === 'library'
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                  <span>Deck PDFs ({deckDocs.length})</span>
                                </button>
                              </div>
                            )}

                            {/* Option A: Dropzone / Upload View */}
                            {aiPdfSourceMode === 'upload' && (
                              <div>
                                <input
                                  type="file"
                                  ref={aiPdfFileInputRef}
                                  accept=".pdf,application/pdf"
                                  onChange={handlePdfFileSelect}
                                  className="hidden"
                                />

                                {!aiUploadedPdfFile ? (
                                  <div
                                    onDragOver={(e) => { e.preventDefault(); setAiPdfDragActive(true); }}
                                    onDragLeave={() => setAiPdfDragActive(false)}
                                    onDrop={handlePdfDrop}
                                    onClick={() => aiPdfFileInputRef.current?.click()}
                                    className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center ${aiPdfDragActive
                                        ? 'border-purple-600 bg-purple-50/70 shadow-inner'
                                        : 'border-slate-300 bg-[#f8fafc] hover:bg-purple-50/30 hover:border-purple-400'
                                      }`}
                                  >
                                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 shadow-xs">
                                      <IconUpload className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900">
                                      Drag & drop your PDF file here, or click to browse
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                      Supports lecture slides, textbook chapters, study summaries, and course notes (.pdf)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        aiPdfFileInputRef.current?.click();
                                      }}
                                      className="mt-3.5 h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
                                    >
                                      Browse PDF Files
                                    </button>
                                  </div>
                                ) : (
                                  /* Active Uploaded File Card */
                                  <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs flex-shrink-0">
                                          <IconPdf className="w-5 h-6 text-purple-700" />
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-black text-slate-900 truncate">
                                            {aiUploadedPdfFile.name}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-semibold">
                                            <span>{(aiUploadedPdfFile.size / 1024).toFixed(0)} KB</span>
                                            {aiPdfTotalPages > 0 && (
                                              <>
                                                <span>·</span>
                                                <span className="text-purple-700 font-bold">
                                                  {aiPdfTotalPages} {aiPdfTotalPages === 1 ? 'page' : 'pages'}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => aiPdfFileInputRef.current?.click()}
                                        className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white border border-purple-200 px-3 py-1.5 rounded-xl shadow-xs hover:bg-purple-50 transition-all cursor-pointer flex-shrink-0"
                                      >
                                        Change PDF
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Option B: Choose Attached Deck Document */}
                            {aiPdfSourceMode === 'library' && deckDocs.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                                  Select Deck PDF Document
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {deckDocs.map(doc => {
                                    const isSelected = aiSelectedLibraryDoc?.id === doc.id;
                                    return (
                                      <div
                                        key={doc.id}
                                        onClick={() => {
                                          setAiSelectedLibraryDoc(doc);
                                          extractPdfText({ type: 'doc', doc });
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${isSelected
                                            ? 'border-purple-500 bg-purple-50 shadow-xs'
                                            : 'border-slate-200 bg-[#f8fafc] hover:bg-slate-50'
                                          }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <IconPdf className={`w-4 h-5 ${isSelected ? 'text-purple-700' : 'text-slate-500'}`} />
                                          <div className="min-w-0">
                                            <p className={`text-xs font-black truncate ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                                              {doc.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Attached reviewer doc</p>
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Page Range Controls (Active when a PDF is loaded and has multiple pages) */}
                      {aiPdfTotalPages > 1 && (
                        <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                              Pages to Forge Cards From
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAiPdfPageRangeType('all');
                                  const src = aiPdfSourceMode === 'upload' ? { type: 'file', file: aiUploadedPdfFile } : { type: 'doc', doc: aiSelectedLibraryDoc };
                                  extractPdfText(src, { type: 'all', start: 1, end: aiPdfTotalPages });
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiPdfPageRangeType === 'all'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                All ({aiPdfTotalPages} pages)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiPdfPageRangeType('custom')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiPdfPageRangeType === 'custom'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                Custom Range
                              </button>
                            </div>
                          </div>

                          {aiPdfPageRangeType === 'custom' && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                                <span>Page</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={aiPdfEndPage}
                                  value={aiPdfStartPage}
                                  onChange={(e) => setAiPdfStartPage(Math.max(1, Math.min(Number(e.target.value) || 1, aiPdfTotalPages)))}
                                  className="w-14 h-8 px-2 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                                />
                                <span>to</span>
                                <input
                                  type="number"
                                  min={aiPdfStartPage}
                                  max={aiPdfTotalPages}
                                  value={aiPdfEndPage}
                                  onChange={(e) => setAiPdfEndPage(Math.max(aiPdfStartPage, Math.min(Number(e.target.value) || 1, aiPdfTotalPages)))}
                                  className="w-14 h-8 px-2 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                                />
                                <span className="text-slate-400">of {aiPdfTotalPages}</span>
                              </div>

                              <button
                                type="button"
                                disabled={aiExtractingPdf}
                                onClick={() => {
                                  const src = aiPdfSourceMode === 'upload' ? { type: 'file', file: aiUploadedPdfFile } : { type: 'doc', doc: aiSelectedLibraryDoc };
                                  extractPdfText(src, { type: 'custom', start: aiPdfStartPage, end: aiPdfEndPage });
                                }}
                                className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all cursor-pointer ml-auto"
                              >
                                {aiExtractingPdf ? 'Extracting...' : 'Extract Range'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extraction Status Bar */}
                      {aiExtractingPdf && (
                        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-3 animate-pulse">
                          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <div className="text-xs font-bold text-purple-900">
                            {aiPdfExtractProgress || 'Reading PDF text layers...'}
                          </div>
                        </div>
                      )}

                      {/* Extraction Success & Preview Card */}
                      {aiPdfExtractedSummary && !aiExtractingPdf && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">
                                ✓
                              </span>
                              <span className="text-xs font-bold text-emerald-950">
                                Extracted {aiPdfExtractedSummary.wordCount.toLocaleString()} words from {aiPdfExtractedSummary.pages} {aiPdfExtractedSummary.pages === 1 ? 'page' : 'pages'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAiShowNotesPreview(!aiShowNotesPreview)}
                              className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                            >
                              {aiShowNotesPreview ? 'Hide Text ▲' : 'View / Edit Text ▼'}
                            </button>
                          </div>

                          {aiShowNotesPreview && (
                            <div className="pt-2 border-t border-emerald-200/60">
                              <textarea
                                value={aiNotes}
                                onChange={(e) => setAiNotes(e.target.value)}
                                rows="5"
                                className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 font-mono resize-y outline-none focus:border-emerald-400 custom-scroll leading-relaxed"
                                placeholder="Extracted text from PDF..."
                              />
                              <p className="text-[10px] text-emerald-700 mt-1">
                                You can trim, modify, or add notes before generating cards.
                              </p>
                            </div>
                          )}

                          {aiPdfSourceMode === 'upload' && aiUploadedPdfFile && (
                            <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={aiSavePdfToDeck}
                                onChange={(e) => setAiSavePdfToDeck(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                              />
                              <span>
                                Also attach this PDF to reviewer materials in <strong>{decks.find(d => d.id === aiTargetDeckId)?.title || 'selected deck'}</strong>
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SOURCE 2: FROM RAW PASTED TEXT */
                    <div className="space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Study Material / Notes *
                        </label>
                        <button
                          type="button"
                          onClick={handleLoadSampleNotes}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          Load Sample Notes
                        </button>
                      </div>

                      <textarea
                        value={aiNotes}
                        onChange={(e) => setAiNotes(e.target.value)}
                        rows="6"
                        placeholder="Paste your study notes, textbook summary, definitions, or exam guide here... Gemini will distill it into crisp Multiple Choice and Identification flashcards."
                        className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:bg-white resize-y transition-all leading-relaxed custom-scroll"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Minimum ~50 words recommended for highest question quality</span>
                        <span>{aiNotes.length} characters</span>
                      </div>
                    </div>
                  )}

                  {/* Generation Controls */}
                  <div className="pt-1">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                        Question Format
                      </label>
                      <div className="flex items-center p-1 bg-[#f1f5f9] border border-slate-200 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => setAiFormat('MIXED')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === 'MIXED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Mixed
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiFormat('MULTIPLE_CHOICE')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === 'MULTIPLE_CHOICE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          MCQ Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiFormat('TRUE_FALSE')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === 'TRUE_FALSE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          T/F Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiFormat('IDENTIFICATION')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === 'IDENTIFICATION' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          ID Only
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      Card count adapts to the selected study material. You’ll choose which Bombcards to add after generation.
                    </p>
                  </div>

                  {/* Study Focus */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                      Focus Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAiFocus('comprehensive')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === 'comprehensive' ? 'border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs' : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="block font-black">Comprehensive</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Balanced mix of cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiFocus('key_terms')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === 'key_terms' ? 'border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs' : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="block font-black">Key Terms</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Definitions & acronyms</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiFocus('conceptual')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === 'conceptual' ? 'border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs' : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="block font-black">Application</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Scenarios & concepts</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* --- PREVIEW STAGE --- */
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between bg-purple-50/80 border border-purple-200 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      <span className="text-xs font-bold text-purple-950">
                        {aiGeneratedCards.filter(c => c.selected).length} of {aiGeneratedCards.length} cards selected
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAiGeneratedCards(cards => cards.map(c => ({ ...c, selected: true })))}
                        className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-purple-300">·</span>
                      <button
                        type="button"
                        onClick={() => setAiGeneratedCards(cards => cards.map(c => ({ ...c, selected: false })))}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                      <span className="text-purple-300">·</span>
                      <button
                        type="button"
                        onClick={handleGenerateAiReviewer}
                        disabled={aiReviewerDownloading}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        aria-label="Generate an AI study reviewer"
                        title="Generate an AI study reviewer"
                      >
                        <IconSparkles className="w-3.5 h-3.5" /> {aiReviewerDownloading ? 'Creating reviewer…' : 'Generate study reviewer'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {aiGeneratedCards.map((card, idx) => {
                      return (
                        <div
                          key={card.id || idx}
                          onClick={() => {
                            const updated = [...aiGeneratedCards];
                            updated[idx].selected = !updated[idx].selected;
                            setAiGeneratedCards(updated);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${card.selected ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={!!card.selected}
                              onChange={() => { }}
                              className="mt-1 w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  #{idx + 1} {card.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : card.type === 'TRUE_FALSE' ? 'True / False' : 'Identification'}
                                </span>
                                {card.hint && (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                    <IconBulb className="w-2.5 h-2.5 text-amber-600" /> Hint: {card.hint}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                {card.prompt}
                              </p>

                              {card.type === 'MULTIPLE_CHOICE' && card.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5">
                                  {card.options.map((opt, oIdx) => {
                                    const isCorrect = oIdx === card.correctIndex || opt === card.correctAnswer;
                                    return (
                                      <div
                                        key={oIdx}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${isCorrect ? 'bg-orange-50 text-[#f04824] border border-orange-200 font-bold' : 'bg-white border border-slate-200/80 text-slate-600'}`}
                                      >
                                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span className="truncate">{opt}</span>
                                        {isCorrect && <span className="ml-auto text-[9px] font-black text-[#f04824]">✓</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {card.type === 'TRUE_FALSE' && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Correct Answer:</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#f04824] border border-orange-200 text-xs font-bold">
                                    {card.correctAnswer}
                                  </span>
                                </div>
                              )}

                              {card.type === 'IDENTIFICATION' && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Correct Answer:</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#f04824] border border-orange-200 text-xs font-bold">
                                    {card.correctAnswer}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              {aiStage === 'input' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAiGeneratorOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading || aiExtractingPdf || !aiNotes.trim()}
                    onClick={handleGenerateWithAi}
                    className={`h-11 px-6 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${aiLoading || aiExtractingPdf || !aiNotes.trim()
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25 active:scale-95'
                      }`}
                  >
                    {aiLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Gemini is forging Bombcards...</span>
                      </>
                    ) : aiExtractingPdf ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                        <span>Reading PDF...</span>
                      </>
                    ) : (
                      <>
                        <IconSparkles className="w-4 h-4" />
                        <span>Forge Bombcards with Gemini</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAiStage('input')}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    ← Back to Notes
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading || aiGeneratedCards.filter(c => c.selected).length === 0}
                    onClick={handleSaveAiCardsToDeck}
                    className="h-11 px-6 rounded-xl bg-[#f04824] hover:bg-[#e03e1b] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Saving to deck...</span>
                      </>
                    ) : (
                      <>
                        <IconPlus className="w-4 h-4" />
                        <span>Add {aiGeneratedCards.filter(c => c.selected).length} Bombcards to Deck</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {aiReviewerReady && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          role="presentation"
          onClick={() => { if (!aiReviewerImporting) setAiReviewerReady(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-reviewer-ready-title"
            aria-describedby="ai-reviewer-ready-description"
            onClick={event => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <IconSparkles className="h-7 w-7" />
            </div>
            <div className="mb-2 flex justify-center">
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700">AI-generated</span>
            </div>
            <h2 id="ai-reviewer-ready-title" className="text-center text-xl font-black tracking-tight text-slate-900">Your study reviewer is ready</h2>
            <p id="ai-reviewer-ready-description" className="mt-2 text-center text-sm leading-relaxed text-slate-500">
              Save the AI-generated reviewer PDF to <strong className="text-slate-700">{aiReviewerReady.deckTitle}</strong> Reference Notes, or download it for offline study.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleImportAiReviewer}
                disabled={!aiReviewerReady.deckId || aiReviewerImporting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f04824] px-4 text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#e03e1b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiReviewerImporting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <IconPlus className="h-4 w-4" />}
                {aiReviewerImporting ? 'Adding to notes…' : 'Add to Reference Notes'}
              </button>
              <button
                type="button"
                onClick={() => { downloadAiReviewerPdf(aiReviewerReady); setAiReviewerReady(null); }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <IconDownload className="h-4 w-4" /> Download PDF
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAiReviewerReady(null)}
              disabled={aiReviewerImporting}
              className="mx-auto mt-4 block px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
            >
              Skip
            </button>
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
                    onClick={() => setNewQType('TRUE_FALSE')}
                    className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === 'TRUE_FALSE' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    True / False
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
                  ) : newQType === 'TRUE_FALSE' ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-medium text-slate-500 block">Choose the correct answer:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {['True', 'False'].map(value => (
                          <button
                            type="button"
                            key={value}
                            onClick={() => setNewQAnswer(value)}
                            className={`h-9 rounded-lg text-xs font-bold border transition-colors ${newQAnswer === value ? 'border-[#f04824] bg-orange-50 text-[#f04824]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
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
                            Ans: {c.correctAnswer} &bull; Type: {c.type === 'MULTIPLE_CHOICE' ? 'MCQ' : c.type === 'TRUE_FALSE' ? 'T/F' : 'ID'}
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

      {guestLockedSection && (
        <GuestLockedModal
          section={guestLockedSection}
          onClose={() => setGuestLockedSection(null)}
        />
      )}

    </div>
  );
}

function renderSharedDeckUnavailable(msg) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="width:100%;height:100vh;background:#f6f8fb;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
      <div style="background:#fff;border:1px solid #dce5ee;border-radius:20px;box-shadow:0 20px 45px rgba(15,23,42,0.1);max-width:440px;width:100%;padding:32px 28px;text-align:center;">
        <div style="width:58px;height:58px;border-radius:16px;background:#fff1ee;border:1px solid #ffd7cf;color:#f04824;display:grid;place-items:center;margin:0 auto 16px;">
          <svg style="width:28px;height:28px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <span style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#f04824;text-transform:uppercase;">SHARED REVIEWER</span>
        <h2 style="font-size:20px;font-weight:800;color:#18233a;margin:6px 0 10px;font-family:'Outfit',sans-serif;">Reviewer Deck Unavailable</h2>
        <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 24px;">${String(msg || 'This deck link may have been deactivated by its owner or does not exist.').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="login.html" style="display:block;width:100%;padding:11px 16px;background:#f04824;color:#fff;font-weight:700;font-size:12px;border-radius:12px;text-decoration:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(240,72,36,0.25);">
            Sign In to Co-StudyMaxx
          </a>
          <a href="login.html?mode=signup" style="display:block;width:100%;padding:11px 16px;background:#f1f5f9;color:#334155;font-weight:700;font-size:12px;border-radius:12px;text-decoration:none;box-sizing:border-box;">
            Create Free Account
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderAdminAccessDenied() {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = '<div style="width:100%;height:100vh;background:#f6f8fb;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif"><div style="max-width:440px;width:100%;padding:32px;border:1px solid #dce5ee;border-radius:20px;background:#fff;box-shadow:0 20px 45px rgba(15,23,42,.1);text-align:center"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#f04824;text-transform:uppercase">Restricted area</div><h2 style="margin:8px 0 10px;color:#18233a">Administrator access required</h2><p style="margin:0 0 22px;color:#64748b;line-height:1.6">This access path is reserved for authorized administrators.</p><a href="index.html" style="display:inline-block;padding:11px 18px;border-radius:12px;background:#f04824;color:#fff;font-weight:700;text-decoration:none">Return to workspace</a></div></div>';
}

(async function bootstrap() {
  const root = document.getElementById('root');
  const shareToken = window.CSM_GUEST_SHARE_TOKEN
    || (window.location.pathname.match(/\/shared\/deck\/([a-zA-Z0-9_-]+)/i)?.[1])
    || new URLSearchParams(window.location.search).get('share_token')
    || new URLSearchParams(window.location.search).get('token');

  if (shareToken) {
    try {
      const res = await fetch(`api/index.php?r=shared/deck&token=${encodeURIComponent(shareToken)}`);
      const data = await res.json();
      if (!res.ok || !data.deck) {
        throw new Error(data.error || 'This shared reviewer deck is unavailable.');
      }
      const sharedDeck = {
        ...data.deck,
        code: data.deck.code || data.deck.title,
        owner: data.deck.owner || 'Shared Reviewer',
        section: 'recent',
        share: data.share || { token: shareToken, isActive: true, url: window.location.href }
      };

      let session = { authenticated: false };
      try {
        session = await CSM.api('auth/session');
      } catch {
        session = { authenticated: false };
      }

      const isGuest = !session.authenticated;
      const profile = session.authenticated && session.profile ? session.profile : {
        displayName: 'Guest Student',
        username: 'guest',
        role: 'guest',
        avatar: 'ember'
      };

      window.CSM.isGuest = isGuest;
      if (session.authenticated) CSM.startIdleMonitor();
      window.CSM.guestSharedDeck = sharedDeck;
      window.CSM.initial = {
        profile,
        decks: [sharedDeck],
        stats: {
          totalDecks: 1,
          totalCards: sharedDeck.cards?.length || 0,
          totalDocuments: sharedDeck.documents?.length || 0
        }
      };

      root.classList.remove('csm-startup-root');
      root.removeAttribute('aria-busy');
      ReactDOM.render(
        <WorkspaceErrorBoundary><App isGuest={isGuest} sharedDeck={sharedDeck} /></WorkspaceErrorBoundary>,
        root
      );
      window.__CSM_APP_READY__ = true;
    } catch (error) {
      window.__CSM_APP_READY__ = true;
      renderSharedDeckUnavailable(error.message);
    }
    return;
  }

  CSM.api('auth/session').then(async session => {
    const adminPath = /\/admin\/?$/i.test(window.location.pathname);
    if (!session.authenticated) { const reason = session.reason || (session.timedOut ? 'idle_timeout' : ''); window.location.replace(`login.html?mode=signin${adminPath ? '&next=admin' : ''}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`); return; }
    if (adminPath && !['admin', 'superadmin'].includes(session.profile?.role)) { renderAdminAccessDenied(); return; }
    window.CSM.adminUrl = session.adminUrl || 'admin';
    CSM.initial = await CSM.api('workspace');
    CSM.startIdleMonitor();
    root.classList.remove('csm-startup-root');
    root.removeAttribute('aria-busy');
    ReactDOM.render(<WorkspaceErrorBoundary><App isGuest={false} sharedDeck={null} /></WorkspaceErrorBoundary>, root);
    window.__CSM_APP_READY__ = true;
  }).catch(error => {
    window.__CSM_APP_READY__ = true;
    root.innerHTML = `<div style="margin:auto;padding:24px;max-width:560px;background:white;border:1px solid #dbe3ee;border-radius:16px;color:#18233a;font:16px system-ui"><h2>Workspace unavailable</h2><p>${String(error.message || 'Could not load your account data.').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</p><button onclick="location.href='login.html'">Back to sign in</button></div>`;
  });
})();
