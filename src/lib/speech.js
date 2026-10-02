// Nhận dạng giọng nói (Web Speech API) để kiểm tra người nghe có hiểu đúng từ bạn nói không,
// và ghi âm (MediaRecorder) để tự so sánh với bản mẫu.

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const canRecognize = !!SR;
export const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export function recognize(lang = 'de-DE') {
  return new Promise((resolve, reject) => {
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 5;
    let done = false;
    r.onresult = (e) => {
      done = true;
      resolve([...e.results[0]].map((a) => a.transcript));
    };
    r.onerror = (e) => {
      done = true;
      reject(e.error);
    };
    r.onend = () => !done && resolve([]);
    r.start();
  });
}

/* ---------- So khớp văn bản ---------- */

const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

export function numToDe(n) {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const o = n % 10;
    return (o ? (o === 1 ? 'ein' : ONES[o]) + 'und' : '') + TENS[Math.floor(n / 10)];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? '' : ONES[h]) + 'hundert' + (r ? numToDe(r) : '');
  }
  if (n < 10000) {
    const t = Math.floor(n / 1000), r = n % 1000;
    return (t === 1 ? '' : ONES[t]) + 'tausend' + (r ? numToDe(r) : '');
  }
  return String(n);
}

/** Chuẩn hoá để so sánh: chữ thường, bỏ dấu câu, số → chữ, ä→ae… */
export function norm(s, { umlautLoose = true } = {}) {
  let t = s
    .toLowerCase()
    .replace(/\b\d{1,4}\b/g, (d) => numToDe(+d))
    .replace(/[.,!?;:"„“”'’()…\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (umlautLoose) t = t.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  return t;
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

export function similarity(a, b) {
  const x = norm(a), y = norm(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Điểm nói: so khớp tốt nhất giữa các phương án nhận dạng và mục tiêu (có/không mạo từ). */
export function speakScore(alternatives, target) {
  const targets = [target, target.replace(/^(der|die|das)\s+/i, '')];
  let best = { score: 0, heard: alternatives[0] || '' };
  for (const alt of alternatives)
    for (const t of targets) {
      const s = similarity(alt, t);
      if (s > best.score) best = { score: s, heard: alt };
    }
  return best;
}
