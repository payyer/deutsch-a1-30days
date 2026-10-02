import { useEffect, useMemo, useState } from 'react';
import { DAYS, VOCAB, ALL_PAIRS } from '../data/index.js';
import { playSequence, stopAudio } from '../lib/audio.js';
import { addCards } from '../lib/srs.js';
import { markActive, todayStr, update, useStore } from '../lib/store.js';
import Quiz from './Quiz.jsx';
import { DeWord, Icon, Ipa, PlayButton, Recorder, Rich, SourceBadge, SpeakCheck, Table } from './ui.jsx';

const STEPS = [
  { id: 'sound', label: 'Phát âm', min: 10 },
  { id: 'vocab', label: 'Từ vựng', min: 15 },
  { id: 'grammar', label: 'Ngữ pháp', min: 15 },
  { id: 'dialog', label: 'Hội thoại', min: 10 },
  { id: 'practice', label: 'Luyện tập', min: 15 },
  { id: 'output', label: 'Nói & Viết', min: 10 },
];

export default function DayView({ day, go }) {
  const d = DAYS[day - 1];
  const steps = useMemo(() => STEPS.filter((s) => (s.id === 'vocab' ? d.vocab.length : s.id === 'dialog' ? d.dialog : true)), [d]);
  const doneSteps = useStore((s) => s.steps[day] || {});
  const isDone = useStore((s) => !!s.done[day]);
  const best = useStore((s) => s.scores[day]);
  const [step, setStep] = useState(() => steps.find((s) => !doneSteps[s.id])?.id || steps[0].id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    return () => stopAudio();
  }, [step]);

  const i = steps.findIndex((s) => s.id === step);
  const markStep = (id) => {
    update((s) => {
      s.steps[day] = { ...(s.steps[day] || {}), [id]: true };
    });
    markActive();
  };
  const next = () => {
    markStep(step);
    if (step === 'vocab') addCards(d.vocab.map(([de]) => de));
    if (i < steps.length - 1) setStep(steps[i + 1].id);
  };
  const finishDay = () => {
    markStep('output');
    addCards(d.vocab.map(([de]) => de));
    update((s) => {
      s.done[day] = s.done[day] || todayStr();
    });
    go(day < 30 ? `#/done/${day}` : '#/done/30');
  };

  const totalMin = steps.reduce((a, s) => a + s.min, 0);

  return (
    <div className="day">
      <header className="day-head">
        <button className="link muted" onClick={() => go('#/')}>
          <Icon name="left" size={16} /> Lộ trình
        </button>
        <div className="day-title">
          <span className="day-num">Ngày {day}</span>
          <h1>{d.title}</h1>
          <p className="muted">{d.goal}</p>
          <p className="muted small">
            ≈ {totalMin} phút {isDone && <>· <span className="ok-text">✓ đã hoàn thành</span></>} {best != null && <>· điểm tốt nhất {best}%</>}
          </p>
        </div>
      </header>

      <nav className="steps" aria-label="Các bước">
        {steps.map((s, k) => (
          <button key={s.id} className={`step ${s.id === step ? 'current' : ''} ${doneSteps[s.id] ? 'done' : ''}`} onClick={() => setStep(s.id)}>
            <span className="step-dot">{doneSteps[s.id] ? <Icon name="check" size={12} /> : k + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </nav>

      <section className="step-body">
        {step === 'sound' && <SoundStep d={d} />}
        {step === 'vocab' && <VocabStep d={d} />}
        {step === 'grammar' && <GrammarStep d={d} />}
        {step === 'dialog' && <DialogStep d={d} />}
        {step === 'practice' && (
          <Quiz
            day={day}
            onFinish={(pct) => {
              update((s) => {
                s.scores[day] = Math.max(s.scores[day] || 0, pct);
              });
              next();
            }}
          />
        )}
        {step === 'output' && <OutputStep d={d} />}
      </section>

      {step !== 'practice' && (
        <footer className="step-nav">
          <button className="btn" disabled={i === 0} onClick={() => setStep(steps[i - 1].id)}>
            <Icon name="left" size={16} /> Trước
          </button>
          {step === 'output' ? (
            <button className="btn primary" onClick={finishDay}>
              <Icon name="check" size={16} /> Hoàn thành ngày {day}
            </button>
          ) : (
            <button className="btn primary" onClick={next}>
              Tiếp: {steps[i + 1]?.label} <Icon name="right" size={16} />
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

/* ---------------- 1. Phát âm ---------------- */
export function SoundStep({ d, compact = false }) {
  const s = d.sound;
  return (
    <div className="stack">
      {!compact && <h2>{s.title}</h2>}
      <div className="tip">
        <Rich text={s.tip} />
      </div>
      <div className="sound-grid">
        {s.items.map((it, k) => (
          <div className="card sound-card" key={k}>
            <div className="sound-head">
              <strong>{it.label}</strong> {it.ipa && <span className="ipa">{/[a-zəɐʁçʃŋɪʏʊɔœøɛ]/.test(it.ipa) ? `[${it.ipa}]` : it.ipa}</span>}
            </div>
            {it.note && <p className="muted small">{it.note}</p>}
            <div className="sound-words">
              {it.words.map((w) => (
                <div className="sound-word" key={w}>
                  <PlayButton text={w} size="sm" />
                  <span className="de">{w}</span>
                  <Ipa text={w} />
                  <SpeakCheck target={w} compact />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {s.pairs?.length > 0 && (
        <div className="card">
          <h3>Cặp âm tối thiểu – nghe sự khác biệt</h3>
          <p className="muted small">Hai từ chỉ khác nhau một âm. Nghe xen kẽ nhiều lần, rồi tự đọc. Trò chơi luyện tai có ở trang Phát âm.</p>
          <div className="pairs">
            {s.pairs.map(([a, b]) => (
              <div className="pair" key={a + b}>
                <span><PlayButton text={a} size="sm" slow={false} /> {a} <Ipa text={a} /></span>
                <span className="vs">vs</span>
                <span><PlayButton text={b} size="sm" slow={false} /> {b} <Ipa text={b} /></span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!compact && (
        <div className="card">
          <h3>Tự ghi âm & so sánh</h3>
          <p className="muted small">Nghe mẫu → ghi âm giọng bạn → nghe lại xen kẽ. Đây là cách hiệu quả nhất để tự sửa phát âm.</p>
          <Recorder text={s.items[0].words[0]} />
        </div>
      )}
    </div>
  );
}

/* ---------------- 2. Từ vựng ---------------- */
function VocabStep({ d }) {
  const items = d.vocab.map(([de, vi, note]) => ({ id: de, de, vi, note: note || '' }));
  const [hideVi, setHideVi] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playAll = async () => {
    setPlaying(true);
    await playSequence(items.map((x) => x.de), 900);
    setPlaying(false);
  };
  return (
    <div className="stack">
      <div className="tip">
        <strong>Cách học:</strong> với mỗi từ ① nghe 2 lần (thường + chậm) ② nhìn phiên âm IPA ③ đọc to 3 lần ④ bấm 🎤 để máy kiểm tra. Danh từ: luôn học <strong>cùng mạo từ</strong> –{' '}
        <span className="g-der g-text">der</span> · <span className="g-die g-text">die</span> · <span className="g-das g-text">das</span> · <span className="g-pl g-text">số nhiều</span>.
      </div>
      <div className="row between">
        <span className="muted small">{items.length} từ · đánh dấu 🎙 = giọng người bản xứ</span>
        <div className="row gap">
          <button className="btn sm" onClick={() => setHideVi((h) => !h)}>{hideVi ? 'Hiện nghĩa' : 'Ẩn nghĩa (tự kiểm tra)'}</button>
          <button className="btn sm" onClick={playing ? stopAudio : playAll}>{playing ? 'Dừng' : '▶ Nghe tất cả'}</button>
        </div>
      </div>
      <div className="vocab-list">
        {items.map((v) => (
          <VocabRow key={v.id} v={v} hideVi={hideVi} />
        ))}
      </div>
    </div>
  );
}

function VocabRow({ v, hideVi }) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="vocab-row">
      <PlayButton text={v.de} />
      <div className="vocab-main">
        <div className="vocab-de">
          <DeWord item={v} /> <Ipa text={v.de} /> <SourceBadge text={v.de} />
        </div>
        <div className={`vocab-vi ${hideVi && !reveal ? 'blur' : ''}`} onClick={() => setReveal(true)}>
          {v.vi}
          {v.note && <span className="muted"> · {v.note}</span>}
        </div>
      </div>
      <SpeakCheck target={v.de} />
    </div>
  );
}

/* ---------------- 3. Ngữ pháp ---------------- */
function GrammarStep({ d }) {
  return (
    <div className="stack">
      {d.grammar.map((g, k) => (
        <div className="card grammar" key={k}>
          <h3>{g.h}</h3>
          {g.p && <p><Rich text={g.p} /></p>}
          {g.table && <Table rows={g.table} />}
          {g.p2 && <p><Rich text={g.p2} /></p>}
          {g.ex && (
            <div className="examples">
              {g.ex.map(([de, vi], j) => (
                <div className="example" key={j}>
                  <PlayButton text={de} size="sm" slow />
                  <div>
                    <div className="de">{de}</div>
                    {vi && <div className="muted small">{vi}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 4. Hội thoại (shadowing) ---------------- */
function DialogStep({ d }) {
  const [showVi, setShowVi] = useState(true);
  const [playing, setPlaying] = useState(false);
  const speakers = [...new Set(d.dialog.lines.map((l) => l[0]))];
  const playAll = async () => {
    setPlaying(true);
    await playSequence(d.dialog.lines.map((l) => l[1]), 700);
    setPlaying(false);
  };
  return (
    <div className="stack">
      <div className="tip">
        <strong>Shadowing:</strong> ① nghe cả đoạn ② nghe từng câu và nhại lại ngay (bấm 0.7× nếu nhanh) ③ bấm 🎤 để kiểm tra từng câu ④ đóng vai một nhân vật và đọc to.
      </div>
      <div className="row between">
        <h2>{d.dialog.title}</h2>
        <div className="row gap">
          <button className="btn sm" onClick={() => setShowVi((x) => !x)}>{showVi ? 'Ẩn dịch' : 'Hiện dịch'}</button>
          <button className="btn sm" onClick={playing ? stopAudio : playAll}>{playing ? 'Dừng' : '▶ Nghe cả đoạn'}</button>
        </div>
      </div>
      <div className="dialog">
        {d.dialog.lines.map(([who, de, vi], k) => (
          <div className={`line ${speakers.indexOf(who) % 2 ? 'b' : 'a'}`} key={k}>
            <div className="who">{who}</div>
            <div className="bubble">
              <div className="de">{de}</div>
              {showVi && <div className="muted small">{vi}</div>}
              <div className="line-actions">
                <PlayButton text={de} size="sm" />
                <SpeakCheck target={de} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 6. Nói & Viết ---------------- */
function OutputStep({ d }) {
  const [showSample, setShowSample] = useState(false);
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="stack">
      <div className="card">
        <h3>Nhiệm vụ hôm nay</h3>
        <p>{d.task}</p>
        <Recorder />
      </div>

      {d.speaking && (
        <div className="card">
          <h3>Luyện nói (Sprechen)</h3>
          <ol className="prompts">
            {d.speaking.map((p, k) => (
              <li key={k}>
                <p>{p}</p>
                <Recorder />
              </li>
            ))}
          </ol>
        </div>
      )}

      {d.writing && (
        <div className="card">
          <h3>Luyện viết (Schreiben)</h3>
          <p>{d.writing.prompt}</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} lang="de" spellCheck="false" placeholder="Viết bằng tiếng Đức…" />
          <div className="row between">
            <span className={`small ${words >= 25 ? 'ok-text' : 'muted'}`}>{words} từ (mục tiêu ~30)</span>
            <button className="btn sm" onClick={() => setShowSample((x) => !x)}>{showSample ? 'Ẩn bài mẫu' : 'Xem bài mẫu'}</button>
          </div>
          {showSample && (
            <div className="sample">
              <PlayButton text={d.writing.sample} size="sm" />
              <p className="de">{d.writing.sample}</p>
            </div>
          )}
        </div>
      )}

      {d.final && <FinalCheck />}
    </div>
  );
}

function FinalCheck() {
  const srs = useStore((s) => s.srs);
  const learned = Object.keys(srs).length;
  const mature = Object.values(srs).filter((c) => c.ivl >= 7).length;
  return (
    <div className="card">
      <h3>Tổng kết 30 ngày</h3>
      <p>
        Bạn đã học <strong>{learned}</strong>/{VOCAB.length} từ; <strong>{mature}</strong> từ đã nhớ vững (khoảng cách ôn ≥ 7 ngày). Đã luyện {ALL_PAIRS.length} cặp âm tối thiểu.
      </p>
      <p className="muted small">Hãy tiếp tục ôn tập mỗi ngày ở mục Ôn tập để không quên từ trước kỳ thi.</p>
    </div>
  );
}
