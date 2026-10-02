import { useEffect, useState } from 'react';
import DayView from './components/DayView.jsx';
import Home from './components/Home.jsx';
import Method from './components/Method.jsx';
import Review from './components/Review.jsx';
import Settings from './components/Settings.jsx';
import SoundLab from './components/SoundLab.jsx';
import { Icon } from './components/ui.jsx';
import { DAYS } from './data/index.js';
import { stopAudio } from './lib/audio.js';
import { dueIds } from './lib/srs.js';
import { useStore } from './lib/store.js';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => {
      stopAudio();
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

const go = (h) => {
  window.location.hash = h;
};

export default function App() {
  const hash = useHash();
  const due = useStore((s) => dueIds(s.srs).length);
  const [, route, param] = hash.split('/');

  let page;
  if (route === 'day' && DAYS[+param - 1]) page = <DayView key={param} day={+param} go={go} />;
  else if (route === 'done') page = <Done day={+param} />;
  else if (route === 'review') page = <Review go={go} />;
  else if (route === 'sounds') page = <SoundLab />;
  else if (route === 'settings') page = <Settings />;
  else if (route === 'method') page = <Method go={go} />;
  else page = <Home go={go} />;

  const nav = [
    { h: '#/', id: '', label: 'Lộ trình', icon: 'home' },
    { h: '#/review', id: 'review', label: 'Ôn tập', icon: 'cards', badge: due },
    { h: '#/sounds', id: 'sounds', label: 'Phát âm', icon: 'ear' },
    { h: '#/settings', id: 'settings', label: 'Cài đặt', icon: 'gear' },
  ];
  const active = route === 'day' || route === 'done' || route === 'method' ? '' : route || '';

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="flag" aria-hidden="true" />
          Deutsch A1
        </a>
        <nav className="nav">
          {nav.map((n) => (
            <a key={n.id} href={n.h} className={active === n.id ? 'on' : ''}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
              {n.badge > 0 && <span className="badge-count">{n.badge}</span>}
            </a>
          ))}
        </nav>
      </header>
      <main className="main">{page}</main>
    </div>
  );
}

function Done({ day }) {
  const due = useStore((s) => dueIds(s.srs).length);
  const score = useStore((s) => s.scores[day]);
  const last = day >= 30;
  return (
    <div className="stack narrow center done-page">
      <div className="score-big ok">{last ? '🎉' : '✓'}</div>
      <h1>{last ? 'Chúc mừng! Bạn đã hoàn thành A1 trong 30 ngày.' : `Hoàn thành Ngày ${day}!`}</h1>
      {score != null && <p className="muted">Điểm luyện tập: {score}%</p>}
      <p className="muted">
        {last
          ? 'Tiếp tục ôn thẻ mỗi ngày, làm thêm đề thi mẫu của Goethe-Institut và đăng ký thi khi bạn sẵn sàng.'
          : 'Nghỉ ngơi một chút. Tối nay hoặc sáng mai hãy ôn lại thẻ trước khi học bài mới – giấc ngủ giúp củng cố trí nhớ.'}
      </p>
      <div className="row gap center">
        {due > 0 && <button className="btn" onClick={() => go('#/review')}>Ôn {due} thẻ</button>}
        {!last && <button className="btn" onClick={() => go(`#/day/${day + 1}`)}>Xem trước ngày {day + 1}</button>}
        <button className="btn primary" onClick={() => go('#/')}>Về lộ trình</button>
      </div>
    </div>
  );
}
