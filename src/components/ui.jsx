import { useEffect, useRef, useState } from 'react';
import { play, pronOf, hasNative } from '../lib/audio.js';
import { canRecognize, canRecord, recognize, speakScore } from '../lib/speech.js';
import { gender } from '../data/index.js';

/* ---------- Icon ---------- */
const PATHS = {
  play: 'M8 5.5v13l11-6.5z',
  slow: 'M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0zm8-4v4l3 2',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  rec: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  stop: 'M7 7h10v10H7z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  list: 'M4 6h16M4 12h16M4 18h16',
  home: 'M4 11l8-7 8 7v9H4z',
  cards: 'M5 7h11v13H5zM8 4h11v13',
  ear: 'M7 10a5 5 0 0 1 10 0c0 3-3 4-3 7a2.5 2.5 0 0 1-5 0M10 10a2 2 0 0 1 4 0',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 1-1-2 0-4 0-5z',
};

export function Icon({ name, size = 18, fill = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ---------- Văn bản có định dạng nhẹ: **đậm**, <der>…</der> ---------- */
export function Rich({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|<(?:der|die|das|pl)>[^<]+<\/(?:der|die|das|pl)>|\n)/g);
  return parts.map((p, i) => {
    if (p === '\n') return <br key={i} />;
    const b = p.match(/^\*\*(.+)\*\*$/);
    if (b) return <strong key={i}>{b[1]}</strong>;
    const g = p.match(/^<(der|die|das|pl)>(.+)<\/\1>$/);
    if (g) return <span key={i} className={`g-${g[1]} g-text`}>{g[2]}</span>;
    return p;
  });
}

/* ---------- Nút phát âm ---------- */
export function PlayButton({ text, size = 'md', slow = true, label }) {
  const [busy, setBusy] = useState(false);
  const native = hasNative(text);
  const go = async (s) => {
    setBusy(s ? 'slow' : 'normal');
    await play(text, { slow: s });
    setBusy(false);
  };
  return (
    <span className={`play-group ${size}`}>
      <button className={`icon-btn ${busy === 'normal' ? 'active' : ''}`} onClick={() => go(false)} title={native ? 'Nghe (giọng người bản xứ)' : 'Nghe (giọng máy)'} aria-label="Nghe">
        <Icon name="play" fill size={size === 'lg' ? 22 : 16} />
        {label && <span>{label}</span>}
      </button>
      {slow && (
        <button className={`icon-btn ghost ${busy === 'slow' ? 'active' : ''}`} onClick={() => go(true)} title="Nghe chậm" aria-label="Nghe chậm">
          <span className="slow-label">0.7×</span>
        </button>
      )}
    </span>
  );
}

export function SourceBadge({ text }) {
  return hasNative(text) ? (
    <span className="badge native" title="Bản ghi âm của người bản xứ – Wikimedia Commons">🎙 bản xứ</span>
  ) : (
    <span className="badge tts" title="Giọng tổng hợp (Text-to-Speech) của trình duyệt">TTS</span>
  );
}

export function Ipa({ text, ipa }) {
  const v = ipa ?? pronOf(text)?.ipa;
  if (!v) return null;
  return <span className="ipa">[{v}]</span>;
}

/** Từ tiếng Đức có tô màu theo giống. */
export function DeWord({ item, className = '' }) {
  const g = gender(item);
  if (!g || g === 'pl') return <span className={`de ${g ? 'g-pl' : ''} ${className}`}>{item.de}</span>;
  const [art, ...rest] = item.de.split(' ');
  return (
    <span className={`de ${className}`}>
      <span className={`art g-${g}`}>{art}</span> {rest.join(' ')}
    </span>
  );
}

/* ---------- Kiểm tra nói (nhận dạng giọng nói) ---------- */
export function SpeakCheck({ target, compact = false }) {
  const [state, setState] = useState('idle');
  const [res, setRes] = useState(null);
  if (!canRecognize) return null;
  const go = async () => {
    setState('listening');
    setRes(null);
    try {
      const alts = await recognize();
      if (!alts.length) {
        setRes({ score: 0, heard: '' });
      } else setRes(speakScore(alts, target));
    } catch (e) {
      setRes({ error: e === 'not-allowed' ? 'Chưa cho phép micro' : 'Không nghe rõ, thử lại' });
    }
    setState('idle');
  };
  const level = res && !res.error ? (res.score >= 0.9 ? 'ok' : res.score >= 0.7 ? 'warn' : 'bad') : null;
  return (
    <span className="speak-check">
      <button className={`icon-btn ${state === 'listening' ? 'listening' : ''}`} onClick={go} title="Nói thử – máy sẽ kiểm tra" aria-label="Nói thử">
        <Icon name="mic" size={16} />
      </button>
      {res && (
        <span className={`speak-res ${level || 'bad'}`}>
          {res.error ||
            (res.heard ? (
              <>
                {level === 'ok' ? '✓' : level === 'warn' ? '≈' : '✗'} {!compact && <>„{res.heard}“ · </>}
                {Math.round(res.score * 100)}%
              </>
            ) : (
              'Không nghe thấy'
            ))}
        </span>
      )}
    </span>
  );
}

/* ---------- Ghi âm & so sánh ---------- */
export function Recorder({ text }) {
  const [rec, setRec] = useState(null);
  const [url, setUrl] = useState(null);
  const chunks = useRef([]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  if (!canRecord) return null;
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks.current, { type: mr.mimeType })));
      };
      mr.start();
      setRec(mr);
    } catch {
      alert('Không truy cập được micro. Hãy cho phép quyền micro trong trình duyệt.');
    }
  };
  const stop = () => {
    rec?.stop();
    setRec(null);
  };
  return (
    <div className="recorder">
      {text && <PlayButton text={text} label="Mẫu" />}
      {rec ? (
        <button className="btn rec-on" onClick={stop}>
          <Icon name="stop" fill size={14} /> Dừng
        </button>
      ) : (
        <button className="btn" onClick={start}>
          <Icon name="rec" fill size={14} /> Ghi âm
        </button>
      )}
      {url && <audio src={url} controls className="rec-audio" />}
    </div>
  );
}

/* ---------- Bảng ---------- */
// Bảng có hàng tiêu đề khi ô đầu tiên rỗng hoặc là một nhãn tiêu đề
const HEAD_LABELS = new Set(['Từ hỏi', 'Giờ', 'Đuôi', 'Nominativ', 'haben', 'Phần', 'Loại', 'Chủ ngữ']);

export function Table({ rows }) {
  const [head, ...body] = rows;
  const hasHead = head[0] === '' || HEAD_LABELS.has(head[0]);
  return (
    <div className="table-wrap">
      <table>
        {hasHead ? (
          <>
            <thead>
              <tr>{head.map((c, i) => <th key={i}><Rich text={c} /></th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}
            </tbody>
          </>
        ) : (
          <tbody>
            {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}
          </tbody>
        )}
      </table>
    </div>
  );
}

export function Progress({ value, max }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed ?? Math.random() * 1e9;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
