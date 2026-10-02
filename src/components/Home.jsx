import { DAYS, WEEKS, VOCAB } from '../data/index.js';
import { dueIds } from '../lib/srs.js';
import { streak, useStore } from '../lib/store.js';
import { Icon, Progress } from './ui.jsx';

export default function Home({ go }) {
  const s = useStore();
  const doneCount = Object.keys(s.done).length;
  const current = DAYS.find((d) => !s.done[d.day])?.day ?? 30;
  const due = dueIds(s.srs).length;
  const learned = Object.keys(s.srs).length;
  const st = streak(s.activity);
  const cur = DAYS[current - 1];

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">Deutsch A1 · 30 ngày</p>
          <h1>{doneCount === 0 ? 'Bắt đầu hành trình tiếng Đức' : doneCount === 30 ? 'Bạn đã hoàn thành lộ trình A1!' : `Ngày ${current}: ${cur.title}`}</h1>
          <p className="muted">{doneCount === 30 ? 'Tiếp tục ôn tập mỗi ngày và đăng ký thi Goethe A1.' : cur.goal}</p>
        </div>
        <div className="hero-actions">
          {due > 0 && (
            <button className="btn primary lg" onClick={() => go('#/review')}>
              <Icon name="cards" /> Ôn {due} thẻ trước
            </button>
          )}
          <button className={`btn lg ${due > 0 ? '' : 'primary'}`} onClick={() => go(`#/day/${current}`)}>
            {s.steps[current] ? 'Tiếp tục' : 'Học'} ngày {current} <Icon name="right" />
          </button>
        </div>
      </section>

      <section className="stats">
        <Stat label="Ngày hoàn thành" value={`${doneCount}/30`} />
        <Stat label="Chuỗi ngày học" value={<>{st} <span className="flame"><Icon name="flame" size={16} /></span></>} />
        <Stat label="Từ đã học" value={`${learned}/${VOCAB.length}`} />
        <Stat label="Thẻ cần ôn" value={due} accent={due > 0} />
      </section>
      <Progress value={doneCount} max={30} />

      {WEEKS.map((w) => (
        <section key={w.n} className="week">
          <h2>
            <span className="muted">Tuần {w.n}</span> · {w.title}
          </h2>
          <div className="day-grid">
            {DAYS.filter((d) => d.day >= w.days[0] && d.day <= w.days[1]).map((d) => {
              const done = !!s.done[d.day];
              const isCur = d.day === current && !done;
              const score = s.scores[d.day];
              return (
                <button key={d.day} className={`day-tile ${done ? 'done' : ''} ${isCur ? 'current' : ''} ${d.review ? 'review' : ''}`} onClick={() => go(`#/day/${d.day}`)}>
                  <span className="tile-top">
                    <span className="tile-num">{d.day}</span>
                    {done ? <Icon name="check" size={16} /> : d.review ? <span className="tag">{d.exam ? 'thi thử' : d.final ? 'cuối' : 'ôn'}</span> : null}
                  </span>
                  <span className="tile-title">{d.title.split(' – ')[0]}</span>
                  <span className="tile-sub">{d.title.split(' – ')[1] || ''}</span>
                  {score != null && <span className="tile-score">{score}%</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card method-teaser">
        <h3>Mỗi ngày học (~75–90 phút)</h3>
        <ol className="flow">
          <li><strong>Ôn thẻ</strong> – lặp lại ngắt quãng</li>
          <li><strong>Phát âm</strong> – âm khó + cặp tối thiểu</li>
          <li><strong>Từ vựng</strong> – nghe bản xứ + IPA + nói</li>
          <li><strong>Ngữ pháp</strong> – ngắn gọn, có ví dụ</li>
          <li><strong>Hội thoại</strong> – shadowing</li>
          <li><strong>Luyện tập</strong> – nhớ chủ động</li>
          <li><strong>Nói & Viết</strong> – tự ghi âm</li>
        </ol>
        <button className="link" onClick={() => go('#/method')}>Vì sao phương pháp này hiệu quả? →</button>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
