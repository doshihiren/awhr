// Awelion design tokens — dark teal theme (matches the HR portal reference design).
export const C = {
  bg: '#0d1117',
  surface: '#151b23',
  card: '#1b232d',
  border: '#26303c',
  accent: '#2dd4bf',
  accent2: '#0ea5a4',
  blue: '#38bdf8',
  green: '#22c55e',
  orange: '#fb923c',
  red: '#f43f5e',
  yellow: '#f59e0b',
  text: '#e6edf3',
  muted: '#8b98a8',
  subtle: '#aab6c4',
  onAccent: '#04201d',
};

export const FONT_HEAD = "'Sora', 'Manrope', sans-serif";
export const FONT_BODY = "'Manrope', system-ui, sans-serif";

// Text colour to use on top of a filled button/badge of the given colour.
export const onColor = (c) =>
  [C.accent, C.green, C.yellow, C.blue, C.orange].includes(c) ? C.onAccent : '#fff';

export const stageColors = {
  'New Lead': C.muted,
  'Contacted': C.blue,
  'Demo': C.yellow,
  'Proposal': C.orange,
  'Negotiation': '#f472b6',
  'Won': C.green,
  'Lost': C.red,
};

export const priorityColors = {
  high: C.red,
  medium: C.orange,
  low: C.muted,
};

export const statusColors = {
  active: C.green,
  at_risk: C.orange,
  completed: C.accent,
  on_hold: C.muted,
};

export const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { overflow-x: hidden; max-width: 100vw; }
  body { font-family: ${FONT_BODY}; background: ${C.bg}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  h1, h2, h3 { font-family: ${FONT_HEAD}; }
  main h1 { font-weight: 700 !important; letter-spacing: -0.01em !important; font-size: clamp(20px, 3vw, 24px) !important; }
  a { color: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  input, select, textarea {
    background: ${C.bg}; border: 1px solid ${C.border}; color: ${C.text};
    border-radius: 10px; padding: 10px 12px; font-size: 14px; font-family: inherit;
    outline: none; width: 100%; max-width: 100%; box-sizing: border-box;
    transition: border-color .15s, box-shadow .15s;
  }
  input:focus, select:focus, textarea:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accent}22; }
  input::placeholder, textarea::placeholder { color: ${C.muted}; }
  select option { background: ${C.card}; }
  button { font-family: inherit; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  table { border-collapse: collapse; }
  th { color: ${C.muted}; font-weight: 500; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .nav-link:hover { background: ${C.card}; color: ${C.text} !important; }
  .lift { transition: transform .2s, border-color .2s; }
  .lift:hover { transform: translateY(-3px); border-color: ${C.accent} !important; }

  /* ── Mobile responsiveness ────────────────────────────────────────── */
  @media (max-width: 480px) {
    table { display: block; overflow-x: auto; max-width: 100%; }
  }
  @media print {
    @page { size: A4; margin: 8mm; }
    body { background: #fff !important; }
    body > *:not(.print-root) { display: none !important; }
    .print-root { position: static !important; inset: auto !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
    .print-root .print-frame { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; }
    .payslip-print { max-width: none !important; padding: 0 !important; }
    .no-print { display: none !important; }
  }
`;
