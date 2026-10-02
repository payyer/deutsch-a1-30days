// Phát âm: ưu tiên bản ghi người bản xứ (Wiktionary/Wikimedia Commons, đã tải sẵn vào public/audio),
// nếu không có thì dùng Web Speech API với giọng tiếng Đức tốt nhất trên máy.
import { useEffect, useState } from 'react';
import pron from '../data/pron.json';
import { pronKey, LETTER_TTS } from '../data/index.js';
import { getState } from './store.js';

const BASE = import.meta.env.BASE_URL;

export function pronOf(text) {
  return pron[pronKey(text)] || null;
}

export function hasNative(text) {
  return !!pronOf(text)?.src;
}

/* ---------- Giọng đọc TTS ---------- */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

/** Chấm điểm chất lượng giọng: giọng neural/online > Google > giọng hệ thống. */
export function voiceScore(v) {
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 100;
  if (/online/i.test(v.name)) s += 40;
  if (/google/i.test(v.name)) s += 60;
  if (/premium|enhanced/i.test(v.name)) s += 50;
  if (v.lang === 'de-DE' || v.lang === 'de_DE') s += 20;
  return s;
}

export function germanVoices() {
  if (!synth) return [];
  return synth
    .getVoices()
    .filter((v) => /^de([-_]|$)/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function useVoices() {
  const [voices, setVoices] = useState(germanVoices);
  useEffect(() => {
    if (!synth) return;
    const on = () => setVoices(germanVoices());
    synth.addEventListener('voiceschanged', on);
    on();
    return () => synth.removeEventListener('voiceschanged', on);
  }, []);
  return voices;
}

function pickVoice() {
  const voices = germanVoices();
  const want = getState().settings.voiceURI;
  return voices.find((v) => v.voiceURI === want) || voices[0] || null;
}

function cleanForTts(text) {
  if (LETTER_TTS[text]) return LETTER_TTS[text];
  return text
    .replace(/[↗↘→]/g, ' ')
    .replace(/…/g, ' ')
    .replace(/\s\/\s/g, ', ')
    .replace(/\(.*?\)/g, ' ')
    .trim();
}

/* ---------- Phát ---------- */

let current = null;
let pending = null; // resolve của lượt phát đang chạy
let seqToken = null;

function halt() {
  if (current) {
    current.pause();
    current = null;
  }
  synth?.cancel();
  pending?.('stopped');
  pending = null;
}

/** Dừng mọi âm thanh, kể cả chuỗi "nghe tất cả". */
export function stopAudio() {
  seqToken = null;
  halt();
}

function speak(text, slow) {
  return new Promise((resolve) => {
    if (!synth) return resolve('none');
    const u = new SpeechSynthesisUtterance(cleanForTts(text));
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'de-DE';
    u.rate = getState().settings.rate * (slow ? 0.65 : 1);
    u.onend = () => resolve('tts');
    u.onerror = () => resolve('tts');
    synth.speak(u);
  });
}

/**
 * Phát một từ / câu. Trả về Promise kết thúc khi phát xong.
 * opts.slow: chậm 0,7x (giữ cao độ). opts.tts: ép dùng giọng máy.
 */
export function play(text, opts = {}) {
  halt();
  return new Promise((resolve) => {
    pending = resolve;
    playInner(text, opts).then((r) => {
      if (pending === resolve) pending = null;
      resolve(r);
    });
  });
}

function playInner(text, opts) {
  const p = pronOf(text);
  const useNative = p?.src && !opts.tts && getState().settings.preferNative && !LETTER_TTS[text];
  if (!useNative) return speak(text, opts.slow);
  // MP3 (mọi trình duyệt, kể cả Safari/iOS) → OGG gốc → giọng máy
  const sources = [p.src, p.ogg].filter(Boolean).map((s) => (/^https?:/.test(s) ? s : BASE + s));
  return new Promise((resolve) => {
    const tryNext = () => {
      const src = sources.shift();
      if (!src) return speak(text, opts.slow).then(resolve);
      const a = new Audio(src);
      a.preservesPitch = true;
      a.playbackRate = opts.slow ? 0.7 : 1;
      current = a;
      let failed = false;
      const fail = () => {
        if (failed || current !== a) return;
        failed = true;
        tryNext();
      };
      a.onended = () => resolve('native');
      a.onerror = fail;
      a.play().catch((e) => (e.name === 'AbortError' ? resolve('stopped') : fail()));
    };
    tryNext();
  });
}

/** Tải trước audio của một danh sách từ để bấm là nghe ngay. */
export function preload(texts) {
  for (const t of texts) {
    const p = pronOf(t);
    if (p?.src && /^https?:/.test(p.src)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = p.src;
    }
  }
}

export async function playSequence(texts, gap = 600) {
  const token = {};
  seqToken = token;
  for (const t of texts) {
    const r = await play(t);
    if (seqToken !== token || r === 'none' || r === 'stopped') return;
    await new Promise((res) => setTimeout(res, gap));
    if (seqToken !== token) return;
  }
  seqToken = null;
}
