import { useEffect, useState } from 'react';
import { ALL_PAIRS, ALPHABET, DAYS } from '../data/index.js';
import { play, playSequence, stopAudio } from '../lib/audio.js';
import { SoundStep } from './DayView.jsx';
import { Icon, Ipa, PlayButton, shuffle } from './ui.jsx';

export default function SoundLab() {
  const [tab, setTab] = useState('alphabet');
  useEffect(() => () => stopAudio(), [tab]);
  return (
    <div className="stack">
      <h1>Phát âm</h1>
      <div className="seg">
        <button className={tab === 'alphabet' ? 'on' : ''} onClick={() => setTab('alphabet')}>Bảng chữ cái</button>
        <button className={tab === 'pairs' ? 'on' : ''} onClick={() => setTab('pairs')}>Luyện tai</button>
        <button className={tab === 'sounds' ? 'on' : ''} onClick={() => setTab('sounds')}>Thư viện âm</button>
      </div>
      {tab === 'alphabet' && <Alphabet />}
      {tab === 'pairs' && <PairGame />}
      {tab === 'sounds' && <Library />}
    </div>
  );
}

function Alphabet() {
  const [name, setName] = useState('');
  // chữ tiếng Việt có dấu (Ễ, Ă…) quy về chữ cái gốc; giữ nguyên Ä Ö Ü ß
  const known = new Set(ALPHABET.map((a) => a.letter));
  const letters = [...name]
    .map((c) => (c === 'ß' ? c : c.toUpperCase()))
    .map((c) => (known.has(c) ? c : c.normalize('NFD')[0].replace('Đ', 'D')))
    .filter((c) => known.has(c));
  return (
    <div className="stack">
      <div className="alphabet">
        {ALPHABET.map((a) => (
          <div key={a.letter} className="letter">
            <button className="letter-btn" onClick={() => play(a.letter)} title={`Đọc chữ ${a.letter}`}>
              <span className="letter-big">{a.letter}</span>
              <span className="ipa">[{a.ipa}]</span>
            </button>
            <button className="letter-ex" onClick={() => play(a.example)} title="Nghe từ ví dụ">
              {a.example}
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Đánh vần tên của bạn</h3>
        <p className="muted small">Trong kỳ thi và khi gọi điện bạn sẽ được hỏi: „Wie schreibt man das?" Gõ tên, nghe cách đánh vần và đọc theo.</p>
        <div className="row gap">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyen" className="grow" />
          <button className="btn primary" disabled={!letters.length} onClick={() => playSequence(letters, 250)}>
            <Icon name="play" fill size={14} /> Đánh vần
          </button>
        </div>
        {letters.length > 0 && <p className="spelled">{letters.map((l) => ALPHABET.find((a) => a.letter === l)?.tts).join(' – ')}</p>}
      </div>
    </div>
  );
}

function PairGame() {
  const [round, setRound] = useState(() => newRound());
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });

  function newRound() {
    const { pair, day } = ALL_PAIRS[Math.floor(Math.random() * ALL_PAIRS.length)];
    const target = pair[Math.random() < 0.5 ? 0 : 1];
    return { pair: shuffle(pair), target, day };
  }

  useEffect(() => {
    const t = setTimeout(() => play(round.target), 250);
    return () => clearTimeout(t);
  }, [round]);

  const pick = (w) => {
    if (picked) return;
    setPicked(w);
    setScore((s) => ({ ok: s.ok + (w === round.target ? 1 : 0), n: s.n + 1 }));
  };
  const next = () => {
    setPicked(null);
    setRound(newRound());
  };

  return (
    <div className="stack narrow">
      <div className="tip">
        Luyện tai với <strong>cặp âm tối thiểu</strong>: hai từ chỉ khác nhau một âm (ü/i, ö/o, dài/ngắn, z/s…). Tai phân biệt được thì miệng mới nói đúng được. Mục tiêu: đúng 9/10 liên tiếp.
      </div>
      <div className="card center pair-game">
        <p className="muted small">
          Điểm: {score.ok}/{score.n} · cặp từ Ngày {round.day}
        </p>
        <PlayButton text={round.target} size="lg" />
        <div className="options inline">
          {round.pair.map((w) => (
            <button key={w} className={`option big ${picked ? (w === round.target ? 'correct' : w === picked ? 'wrong' : 'dim') : ''}`} onClick={() => pick(w)}>
              {w}
            </button>
          ))}
        </div>
        {picked && (
          <div className="stack center">
            <div className="pair">
              {round.pair.map((w) => (
                <span key={w}>
                  <PlayButton text={w} size="sm" slow={false} /> {w} <Ipa text={w} />
                </span>
              ))}
            </div>
            <button className="btn primary" onClick={next} autoFocus>
              Cặp tiếp theo <Icon name="right" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Library() {
  const [open, setOpen] = useState(null);
  return (
    <div className="stack">
      <p className="muted">Tất cả bài phát âm của 30 ngày. Mỗi từ có bản ghi người bản xứ (nếu có), phiên âm IPA và nút 🎤 để kiểm tra.</p>
      {DAYS.map((d) => (
        <div key={d.day} className={`accordion ${open === d.day ? 'open' : ''}`}>
          <button className="acc-head" onClick={() => setOpen(open === d.day ? null : d.day)}>
            <span className="muted">Ngày {d.day}</span> {d.sound.title}
            <Icon name={open === d.day ? 'left' : 'right'} size={16} />
          </button>
          {open === d.day && (
            <div className="acc-body">
              <SoundStep d={d} compact />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

