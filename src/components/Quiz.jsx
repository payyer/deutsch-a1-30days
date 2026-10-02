import { useEffect, useMemo, useRef, useState } from 'react';
import { DAYS, VOCAB, gender } from '../data/index.js';
import { play, stopAudio } from '../lib/audio.js';
import { norm, similarity } from '../lib/speech.js';
import { DeWord, Icon, Ipa, PlayButton, Progress, shuffle } from './ui.jsx';

/* ================= Sinh câu hỏi ================= */

const kind = (v) => (gender(v) ? 'noun' : /^\d+$/.test(v.vi) ? 'num' : /\s/.test(v.de) ? 'phrase' : 'word');
const typeable = (v) => !/…/.test(v.de) && v.de.split(' ').length <= 3 && !/[?!]/.test(v.de);
const stripArt = (s) => s.replace(/^(der|die|das)\s+/, '');

function distractors(item, pool, field, rnd) {
  const same = pool.filter((v) => v.id !== item.id && kind(v) === kind(item) && v[field] !== item[field]);
  const others = pool.filter((v) => v.id !== item.id && v[field] !== item[field]);
  const picked = [];
  for (const v of [...shuffle(same, rnd()), ...shuffle(others, rnd())]) {
    if (picked.length === 3) break;
    if (!picked.some((p) => p[field] === v[field])) picked.push(v);
  }
  return picked.map((v) => v[field]);
}

function vocabQuestion(item, pool, type, rnd) {
  switch (type) {
    case 'listen':
      return { type, item, prompt: 'Nghe và chọn từ đúng', audio: item.de, options: shuffle([item.de, ...distractors(item, pool, 'de', rnd)], rnd()), answer: item.de };
    case 'meaning':
      return { type, item, prompt: 'Nghĩa là gì?', audio: item.de, options: shuffle([item.vi, ...distractors(item, pool, 'vi', rnd)], rnd()), answer: item.vi };
    case 'reverse':
      return { type, item, prompt: 'Chọn từ tiếng Đức', options: shuffle([item.de, ...distractors(item, pool, 'de', rnd)], rnd()), answer: item.de };
    case 'type':
      return { type, item, prompt: gender(item) && gender(item) !== 'pl' ? 'Gõ từ tiếng Đức (kèm mạo từ der/die/das)' : 'Gõ từ tiếng Đức', input: true, answer: item.de };
    case 'dictation':
      return { type, item, prompt: 'Nghe và gõ lại (chính tả)', audio: item.de, input: true, answer: item.de };
    case 'article':
      return { type, item, prompt: 'Chọn mạo từ đúng', options: ['der', 'die', 'das'], answer: gender(item) };
    default:
      return null;
  }
}

function eligibleTypes(v) {
  const t = ['listen', 'meaning', 'reverse'];
  if (typeable(v)) t.push('type', 'dictation');
  if (['der', 'die', 'das'].includes(gender(v))) t.push('article');
  return t;
}

function seededRnd(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280) * 1e6;
}

export function buildQuiz(day, seed = Date.now()) {
  const rnd = seededRnd(seed % 233280);
  const d = DAYS[day - 1];
  const learned = VOCAB.filter((v) => v.day <= day);
  const qs = [];

  let pool;
  let nVocab;
  if (d.final) {
    pool = learned;
    nVocab = 36;
  } else if (d.exam) {
    pool = learned;
    nVocab = 10;
  } else if (d.review) {
    const wkStart = day - 6;
    pool = learned.filter((v) => v.day >= wkStart);
    nVocab = 20;
  } else {
    pool = VOCAB.filter((v) => v.day === day);
    nVocab = Math.min(pool.length, 18);
  }

  const chosen = shuffle(pool, rnd()).slice(0, nVocab);
  chosen.forEach((v, i) => {
    const types = eligibleTypes(v);
    // xoay vòng loại câu hỏi để luyện cả nghe – hiểu – nhớ chủ động – viết
    const t = types[(i + Math.floor(rnd())) % types.length];
    qs.push(vocabQuestion(v, learned, t, rnd));
  });

  // xen kẽ từ các ngày trước (interleaving)
  if (!d.review && day > 1) {
    const prev = shuffle(learned.filter((v) => v.day < day), rnd()).slice(0, 4);
    prev.forEach((v, i) => qs.push(vocabQuestion(v, learned, ['listen', 'meaning', 'reverse', 'type'][i % 4], rnd)));
  }

  // ngữ pháp
  let drills = d.drills || [];
  if (d.final) drills = shuffle(DAYS.slice(0, 29).flatMap((x) => x.drills || []), rnd()).slice(0, 10);
  drills.forEach((dr) => qs.push({ type: 'drill', prompt: 'Điền vào chỗ trống', q: dr.q, options: shuffle(dr.o, rnd()), answer: dr.o[dr.a] }));

  // cặp âm tối thiểu
  let pairs = d.sound?.pairs || [];
  if (d.final) pairs = shuffle(DAYS.flatMap((x) => x.sound?.pairs || []), rnd()).slice(0, 4);
  shuffle(pairs, rnd()).slice(0, 3).forEach((p) => {
    const target = p[Math.floor(rnd()) % 2];
    qs.push({ type: 'pair', prompt: 'Nghe kỹ – bạn nghe thấy từ nào?', audio: target, options: p, answer: target });
  });

  // chính tả câu từ hội thoại
  const lines = (d.dialog?.lines || []).map((l) => l[1]).filter((s) => s.split(' ').length <= 8);
  shuffle(lines, rnd()).slice(0, 2).forEach((s) => qs.push({ type: 'sentence', prompt: 'Nghe và gõ lại cả câu', audio: s, input: true, answer: s }));

  let body = shuffle(qs, rnd());

  // đọc & nghe hiểu đặt cuối, giữ thứ tự như bài thi
  for (const r of d.reading || []) for (const [st, ans] of r.qs) body.push({ type: 'reading', prompt: 'Lesen – Richtig oder falsch?', title: r.title, text: r.text, q: st, options: ['Richtig', 'Falsch'], answer: ans ? 'Richtig' : 'Falsch' });
  for (const l of d.listening || []) body.push({ type: 'hearing', prompt: 'Hören – Nghe và chọn đáp án', audio: l.text, q: l.q, options: shuffle(l.o, rnd()), answer: l.o[l.a], script: l.text });

  return body.map((q, i) => ({ ...q, key: i }));
}

/* ================= Chấm điểm ================= */

export function checkTyped(q, input) {
  const target = q.answer;
  const alts = target.split(' / ');
  const ok = (a, b) => norm(a) === norm(b);
  if (q.type === 'sentence') {
    const s = similarity(input, target);
    return { ok: s >= 0.92, near: s >= 0.75, msg: s >= 0.92 ? null : `Giống ${Math.round(s * 100)}%` };
  }
  if (alts.some((a) => ok(a, input))) {
    const exactUmlaut = alts.some((a) => norm(a, { umlautLoose: false }) === norm(input, { umlautLoose: false }));
    return { ok: true, msg: exactUmlaut ? null : 'Đúng – lần sau nhớ gõ ä ö ü ß nhé' };
  }
  const g = gender(q.item);
  if (g && g !== 'pl') {
    if (ok(stripArt(target), stripArt(input))) {
      const art = input.trim().split(' ')[0].toLowerCase();
      return { ok: false, near: true, msg: ['der', 'die', 'das'].includes(art) ? `Sai mạo từ: phải là "${target.split(' ')[0]}"` : 'Thiếu mạo từ!' };
    }
  }
  return { ok: false, near: similarity(input, target) > 0.8, msg: null };
}

/* ================= Giao diện ================= */

export default function Quiz({ day, onFinish }) {
  const [seed, setSeed] = useState(() => Date.now());
  const initial = useMemo(() => buildQuiz(day, seed), [day, seed]);
  const [queue, setQueue] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [firstTry, setFirstTry] = useState({}); // key → đúng/sai lần đầu
  const [requeued, setRequeued] = useState({});

  useEffect(() => {
    setQueue(initial);
    setIdx(0);
    setFirstTry({});
    setRequeued({});
    reset();
  }, [initial]);

  const q = queue[idx];
  const total = initial.length;
  const done = idx >= queue.length;

  function reset() {
    setPicked(null);
    setTyped('');
    setResult(null);
  }

  useEffect(() => {
    if (q?.audio && ['listen', 'dictation', 'pair', 'sentence', 'hearing', 'meaning'].includes(q.type)) {
      const t = setTimeout(() => play(q.audio), 250);
      return () => clearTimeout(t);
    }
  }, [q?.key, idx]);

  useEffect(() => () => stopAudio(), []);

  const submit = (val) => {
    if (result) return;
    let r;
    if (q.input) r = checkTyped(q, val);
    else r = { ok: val === q.answer };
    setPicked(val);
    setResult(r);
    if (!(q.key in firstTry)) setFirstTry((f) => ({ ...f, [q.key]: r.ok }));
    if (!r.ok && !requeued[q.key]) {
      setRequeued((x) => ({ ...x, [q.key]: true }));
      setQueue((qq) => [...qq, q]);
    }
    if (q.item && q.type !== 'listen' && q.type !== 'dictation') play(q.item.de);
  };

  const next = () => {
    reset();
    setIdx((i) => i + 1);
  };

  // phím tắt: 1–4 chọn, Enter tiếp
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (done || !q) return;
      if (e.key === 'Enter' && result) {
        e.preventDefault();
        next();
      } else if (!q.input && !result && /^[1-4]$/.test(e.key) && q.options[+e.key - 1]) submit(q.options[+e.key - 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (done) {
    const correct = Object.values(firstTry).filter(Boolean).length;
    const pct = Math.round((correct / total) * 100);
    const wrong = initial.filter((x) => firstTry[x.key] === false);
    return (
      <div className="quiz-result">
        <div className={`score-big ${pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'bad'}`}>{pct}%</div>
        <p className="muted">
          Đúng ngay lần đầu {correct}/{total} câu. {pct >= 80 ? 'Rất tốt! Bạn đã sẵn sàng cho bước tiếp theo.' : 'Nên làm lại một lần nữa để đạt ≥ 80% trước khi sang ngày mới.'}
        </p>
        {wrong.length > 0 && (
          <div className="wrong-list">
            <h4>Cần ôn lại</h4>
            {wrong.map((w) => (
              <div key={w.key} className="wrong-row">
                {w.audio && <PlayButton text={w.audio} slow={false} size="sm" />}
                <span>{w.q ? w.q.replace('___', `[${w.answer}]`) : w.item ? `${w.item.de} – ${w.item.vi}` : w.answer}</span>
              </div>
            ))}
          </div>
        )}
        <div className="row gap">
          <button className="btn" onClick={() => setSeed(Date.now())}>Làm lại (đề mới)</button>
          <button className="btn primary" onClick={() => onFinish?.(pct)}>Lưu kết quả & tiếp tục</button>
        </div>
      </div>
    );
  }

  const answered = Object.keys(firstTry).length;

  return (
    <div className="quiz" ref={ref}>
      <div className="quiz-top">
        <Progress value={answered} max={total} />
        <span className="muted small">
          {Math.min(idx + 1, queue.length)}/{queue.length}
        </span>
      </div>

      <div className="card quiz-card" key={idx}>
        <div className="quiz-prompt">{q.prompt}</div>

        {q.type === 'reading' && (
          <div className="reading-text">
            <strong>{q.title}</strong>
            <p>{q.text}</p>
          </div>
        )}

        {q.audio && (
          <div className="quiz-audio">
            <PlayButton text={q.audio} size="lg" />
          </div>
        )}

        {q.type === 'meaning' && <div className="quiz-word"><DeWord item={q.item} /></div>}
        {(q.type === 'reverse' || q.type === 'type') && <div className="quiz-word vi">{q.item.vi}</div>}
        {q.type === 'article' && <div className="quiz-word">___ {stripArt(q.item.de)} <span className="muted small">({q.item.vi})</span></div>}
        {(q.type === 'drill' || q.type === 'reading' || q.type === 'hearing') && <div className="quiz-word sentence">{q.q}</div>}

        {q.input ? (
          <TypeInput value={typed} onChange={setTyped} onSubmit={() => (result ? next() : submit(typed))} disabled={!!result} long={q.type === 'sentence'} />
        ) : (
          <div className={`options ${q.options.length <= 3 && q.options.every((o) => o.length < 14) ? 'inline' : ''}`}>
            {q.options.map((o, i) => {
              const cls = result ? (o === q.answer ? 'correct' : o === picked ? 'wrong' : 'dim') : '';
              return (
                <button key={o} className={`option ${cls}`} onClick={() => submit(o)} disabled={!!result}>
                  <span className="kbd">{i + 1}</span>
                  {q.type === 'article' ? <span className={`g-${o} g-text`}>{o}</span> : o}
                </button>
              );
            })}
          </div>
        )}

        {result && (
          <div className={`feedback ${result.ok ? 'ok' : 'bad'}`}>
            <div className="feedback-head">
              <Icon name={result.ok ? 'check' : 'x'} /> {result.ok ? 'Chính xác!' : 'Chưa đúng'}
              {result.msg && <span className="muted"> · {result.msg}</span>}
            </div>
            {!result.ok && (q.input || q.type === 'drill') && <div className="answer">Đáp án: <strong>{q.answer}</strong></div>}
            {q.item && (
              <div className="answer">
                <DeWord item={q.item} /> <Ipa text={q.item.de} /> – {q.item.vi}
                {q.item.note && <span className="muted"> · {q.item.note}</span>}
              </div>
            )}
            {q.script && <div className="answer muted">„{q.script}“</div>}
            <button className="btn primary" onClick={next} autoFocus={!q.input}>
              Tiếp <Icon name="right" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Phím tắt cho chữ đặc biệt khi bàn phím không có: Alt + a/o/u/s (giữ thêm Shift để viết hoa)
const ALT_KEYS = { KeyA: ['ä', 'Ä'], KeyO: ['ö', 'Ö'], KeyU: ['ü', 'Ü'], KeyS: ['ß', 'ẞ'] };

export function TypeInput({ value, onChange, onSubmit, disabled, long, placeholder, submitLabel = 'Kiểm tra', umlauts = true, lang = 'de' }) {
  const ref = useRef();
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);
  const insert = (ch) => {
    const el = ref.current;
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    onChange(value.slice(0, s) + ch + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  };
  const onKeyDown = (e) => {
    const pair = umlauts && e.altKey && !e.ctrlKey && !e.metaKey && ALT_KEYS[e.code];
    if (!pair) return;
    e.preventDefault();
    insert(pair[e.shiftKey ? 1 : 0]);
  };
  return (
    <form
      className="type-input"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} disabled={disabled} placeholder={placeholder || (long ? 'Gõ cả câu…' : 'Gõ ở đây…')} autoComplete="off" autoCapitalize="off" spellCheck="false" lang={lang} />
      <div className="umlauts">
        {umlauts &&
          ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map((c) => (
            <button type="button" key={c} onClick={() => insert(c)} disabled={disabled} tabIndex={-1}>
              {c}
            </button>
          ))}
        {!disabled && (
          <button type="submit" className="btn primary">
            {submitLabel}
          </button>
        )}
      </div>
      {umlauts && !disabled && (
        <div className="muted small key-hint">
          Phím tắt: <kbd>Alt</kbd>+<kbd>a</kbd> ä · <kbd>Alt</kbd>+<kbd>o</kbd> ö · <kbd>Alt</kbd>+<kbd>u</kbd> ü · <kbd>Alt</kbd>+<kbd>s</kbd> ß · thêm <kbd>Shift</kbd> để viết hoa. Gõ ae/oe/ue/ss cũng được chấp nhận.
        </div>
      )}
    </form>
  );
}
