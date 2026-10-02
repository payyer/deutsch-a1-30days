import { useEffect, useState } from 'react';
import { VOCAB_BY_ID } from '../data/index.js';
import { play, stopAudio } from '../lib/audio.js';
import { dueIds, fmtInterval, grade, GRADES, nextInterval } from '../lib/srs.js';
import { getState, markActive, useStore } from '../lib/store.js';
import { DeWord, Icon, Ipa, PlayButton, Progress, shuffle, SourceBadge, SpeakCheck } from './ui.jsx';

export default function Review({ go }) {
  const srs = useStore((s) => s.srs);
  const autoplay = useStore((s) => s.settings.autoplay);
  const [mode, setMode] = useState('de'); // de: Đức → Việt (nghe hiểu); vi: Việt → Đức (nhớ chủ động)
  const [session, setSession] = useState(null);

  const due = dueIds(srs);
  const learned = Object.keys(srs);

  const start = (ids) => setSession({ queue: shuffle(ids), i: 0, flipped: false, total: ids.length, again: 0 });

  if (!session) {
    return (
      <div className="stack narrow">
        <h1>Ôn tập</h1>
        <p className="muted">
          Hệ thống lặp lại ngắt quãng (SRS): từ bạn nhớ tốt sẽ xuất hiện thưa dần (1 → 3 → 7 → 15 → 30+ ngày), từ hay quên sẽ quay lại sớm. Ôn <strong>trước</strong> khi học bài mới mỗi ngày.
        </p>
        <div className="seg">
          <button className={mode === 'de' ? 'on' : ''} onClick={() => setMode('de')}>Đức → Việt <span className="muted small">nghe & hiểu</span></button>
          <button className={mode === 'vi' ? 'on' : ''} onClick={() => setMode('vi')}>Việt → Đức <span className="muted small">nhớ chủ động</span></button>
        </div>
        <div className="card center">
          <div className="score-big">{due.length}</div>
          <p className="muted">thẻ đến hạn hôm nay · tổng {learned.length} từ đã học</p>
          <div className="row gap center">
            <button className="btn primary lg" disabled={!due.length} onClick={() => start(due)}>Bắt đầu ôn</button>
            {learned.length > 0 && (
              <button className="btn lg" onClick={() => start(shuffle(learned).slice(0, 20))}>Luyện thêm 20 thẻ</button>
            )}
          </div>
          {!learned.length && (
            <p className="muted small">
              Chưa có thẻ nào. Từ vựng được thêm vào đây khi bạn học xong bước Từ vựng của mỗi ngày.{' '}
              <button className="link" onClick={() => go('#/')}>Về lộ trình</button>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <Session session={session} setSession={setSession} mode={mode} autoplay={autoplay} />;
}

function Session({ session, setSession, mode, autoplay }) {
  const { queue, i, flipped } = session;
  const id = queue[i];
  const item = VOCAB_BY_ID[id];
  const card = getState().srs[id];

  useEffect(() => {
    if (!item) return;
    if (mode === 'de' && autoplay) play(item.de);
    return () => stopAudio();
  }, [id, i]);

  useEffect(() => {
    const h = (e) => {
      if (!item) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        flip();
      } else if (flipped && /^[1-4]$/.test(e.key)) rate(+e.key - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!item) {
    return (
      <div className="stack narrow center">
        <div className="score-big ok">✓</div>
        <h2>Xong phiên ôn tập!</h2>
        <p className="muted">
          {session.total} thẻ · {session.again} lần "Quên". Hẹn gặp lại các thẻ này đúng lúc bạn sắp quên chúng.
        </p>
        <button className="btn primary" onClick={() => setSession(null)}>Quay lại</button>
      </div>
    );
  }

  function flip() {
    setSession((s) => ({ ...s, flipped: true }));
    if (mode === 'vi') play(item.de);
  }

  function rate(q) {
    grade(id, q);
    markActive();
    setSession((s) => ({
      ...s,
      queue: q === 0 ? [...s.queue, id] : s.queue,
      i: s.i + 1,
      flipped: false,
      again: s.again + (q === 0 ? 1 : 0),
    }));
  }

  return (
    <div className="stack narrow">
      <div className="quiz-top">
        <button className="link muted" onClick={() => setSession(null)}>
          <Icon name="x" size={16} /> Thoát
        </button>
        <Progress value={i} max={queue.length} />
        <span className="muted small">
          {i + 1}/{queue.length}
        </span>
      </div>

      <div className="card flashcard" onClick={() => !flipped && flip()}>
        {mode === 'de' || flipped ? (
          <div className="fc-de">
            <DeWord item={item} />
            <div className="fc-sub">
              <Ipa text={item.de} /> <SourceBadge text={item.de} />
            </div>
            <div className="row gap center" onClick={(e) => e.stopPropagation()}>
              <PlayButton text={item.de} size="lg" />
              <SpeakCheck target={item.de} />
            </div>
          </div>
        ) : (
          <div className="fc-vi">{item.vi}</div>
        )}

        {flipped ? (
          <div className="fc-back">
            {mode === 'de' ? <div className="fc-vi">{item.vi}</div> : null}
            {item.note && <div className="muted">{item.note}</div>}
            <div className="muted small">Ngày {item.day}</div>
          </div>
        ) : (
          <div className="fc-hint muted small">{mode === 'de' ? 'Nghĩa là gì? Nghĩ trong đầu rồi' : 'Nói to từ tiếng Đức rồi'} chạm để lật (Space)</div>
        )}
      </div>

      {flipped && (
        <div className="grades">
          {GRADES.map((g) => (
            <button key={g.q} className={`grade g${g.q}`} onClick={() => rate(g.q)}>
              <span>{g.label}</span>
              <span className="small muted">{fmtInterval(nextInterval(card, g.q))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
