import { useRef, useState } from 'react';
import pron from '../data/pron.json';
import { play, useVoices, voiceScore } from '../lib/audio.js';
import { canRecognize } from '../lib/speech.js';
import { getState, replaceState, resetState, update, useStore } from '../lib/store.js';
import { Icon } from './ui.jsx';

const TEST = 'Guten Tag! Ich heiße Anna und komme aus München. Wie geht es Ihnen?';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const voices = useVoices();
  const set = (k, v) => update((s) => (s.settings[k] = v));
  const fileRef = useRef();
  const [showCredits, setShowCredits] = useState(false);
  const selected = voices.find((v) => v.voiceURI === settings.voiceURI) || voices[0];

  const quality = (v) => {
    const s = voiceScore(v);
    return s >= 100 ? ['Rất tốt (neural)', 'ok'] : s >= 60 ? ['Tốt', 'ok'] : ['Cơ bản', 'warn'];
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deutsch-a1-tien-do.json';
    a.click();
  };
  const importData = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      replaceState(JSON.parse(await f.text()));
      alert('Đã nhập tiến độ.');
    } catch {
      alert('File không hợp lệ.');
    }
  };

  const credits = Object.entries(pron).filter(([, v]) => v.page);

  return (
    <div className="stack narrow">
      <h1>Cài đặt</h1>

      <div className="card">
        <h3>Nguồn phát âm</h3>
        <ol className="sources">
          <li>
            <strong>🎙 Bản ghi người bản xứ</strong> – {credits.length} từ có file ghi âm thật từ <a href="https://de.wiktionary.org" target="_blank" rel="noreferrer">de.wiktionary.org</a> / Wikimedia Commons, chọn giọng chuẩn Đức (đã loại giọng Áo/Thụy Sĩ). Ưu tiên dùng nguồn này.
          </li>
          <li>
            <strong>Phiên âm IPA</strong> – lấy từ Wiktionary tiếng Đức, theo chuẩn <em>Duden Aussprachewörterbuch</em>.
          </li>
          <li>
            <strong>TTS (giọng máy)</strong> – cho câu và cụm từ. Chất lượng phụ thuộc trình duyệt: tốt nhất là <strong>Microsoft Edge</strong> (giọng neural „Katja/Conrad Online (Natural)") hoặc <strong>Chrome</strong> („Google Deutsch").
          </li>
        </ol>
        <label className="toggle">
          <input type="checkbox" checked={settings.preferNative} onChange={(e) => set('preferNative', e.target.checked)} />
          Ưu tiên bản ghi người bản xứ khi có
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.autoplay} onChange={(e) => set('autoplay', e.target.checked)} />
          Tự phát âm khi lật thẻ ôn tập
        </label>
      </div>

      <div className="card">
        <h3>Giọng đọc tiếng Đức (TTS)</h3>
        {voices.length === 0 ? (
          <p className="warn-text">
            Không tìm thấy giọng tiếng Đức trên trình duyệt này. Hãy dùng Edge/Chrome, hoặc cài thêm giọng tiếng Đức trong Cài đặt Windows → Thời gian & ngôn ngữ → Giọng nói.
          </p>
        ) : (
          <div className="voices">
            {voices.map((v) => {
              const [q, cls] = quality(v);
              return (
                <label key={v.voiceURI} className={`voice ${selected?.voiceURI === v.voiceURI ? 'on' : ''}`}>
                  <input type="radio" name="voice" checked={selected?.voiceURI === v.voiceURI} onChange={() => set('voiceURI', v.voiceURI)} />
                  <span className="grow">
                    {v.name} <span className="muted small">{v.lang}</span>
                  </span>
                  <span className={`small ${cls}-text`}>{q}</span>
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      set('voiceURI', v.voiceURI);
                      play(TEST, { tts: true });
                    }}
                    aria-label="Nghe thử"
                  >
                    <Icon name="play" fill size={14} />
                  </button>
                </label>
              );
            })}
          </div>
        )}
        <label className="slider">
          Tốc độ: {settings.rate.toFixed(2)}×
          <input type="range" min="0.6" max="1.2" step="0.05" value={settings.rate} onChange={(e) => set('rate', +e.target.value)} />
        </label>
        <p className="muted small">Gợi ý: bắt đầu 0.85–0.9×, tăng dần lên 1.0× ở tuần 3–4 để quen tốc độ thật trong bài thi.</p>
      </div>

      <div className="card">
        <h3>Kiểm tra nói (🎤)</h3>
        <p className="small">
          {canRecognize ? (
            <>Trình duyệt hỗ trợ nhận dạng giọng nói. Máy so khớp những gì nó nghe được với từ mẫu: ≥ 90% = rõ ràng, 70–89% = gần đúng. Lưu ý: đây là kiểm tra <em>độ dễ hiểu</em>, không phải chấm từng âm vị – hãy kết hợp tự ghi âm & so sánh với bản xứ.</>
          ) : (
            <span className="warn-text">Trình duyệt này không hỗ trợ nhận dạng giọng nói. Dùng Chrome hoặc Edge để bật nút 🎤.</span>
          )}
        </p>
      </div>

      <div className="card">
        <h3>Dữ liệu học tập</h3>
        <p className="muted small">Tiến độ được lưu trong trình duyệt (localStorage). Sao lưu để chuyển sang máy khác.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>Xuất tiến độ</button>
          <button className="btn" onClick={() => fileRef.current.click()}>Nhập tiến độ</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
          <button className="btn danger" onClick={() => confirm('Xoá toàn bộ tiến độ? Không thể hoàn tác.') && resetState()}>Xoá tiến độ</button>
        </div>
      </div>

      <div className="card">
        <h3>Ghi công bản ghi âm</h3>
        <p className="muted small">
          Các bản ghi âm thuộc Wikimedia Commons, phát hành theo giấy phép tự do (chủ yếu CC BY-SA 3.0/4.0). Xin cảm ơn các tình nguyện viên đã đóng góp.
        </p>
        <button className="btn sm" onClick={() => setShowCredits((x) => !x)}>{showCredits ? 'Ẩn' : `Xem ${credits.length} file & tác giả`}</button>
        {showCredits && (
          <ul className="credits">
            {credits.map(([k, v]) => (
              <li key={k}>
                <a href={v.page} target="_blank" rel="noreferrer">{v.file}</a> – {v.author || 'không rõ'} · {v.license}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
