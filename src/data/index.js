import week1 from './week1.js';
import week2 from './week2.js';
import week3 from './week3.js';
import week4 from './week4.js';

export const DAYS = [...week1, ...week2, ...week3, ...week4];

export const WEEKS = [
  { n: 1, title: 'Nền tảng & giới thiệu', days: [1, 7] },
  { n: 2, title: 'Cuộc sống hằng ngày', days: [8, 14] },
  { n: 3, title: 'Ra ngoài thành phố', days: [15, 21] },
  { n: 4, title: 'Quá khứ & luyện thi', days: [22, 30] },
];

// Bảng chữ cái: tên chữ cái (IPA chuẩn Duden), văn bản cho TTS và một từ ví dụ
export const ALPHABET = [
  ['A', 'aː', 'A', 'Abend'], ['B', 'beː', 'Be', 'Brot'], ['C', 'tseː', 'Zeh', 'Café'],
  ['D', 'deː', 'De', 'danke'], ['E', 'eː', 'E', 'Essen'], ['F', 'ɛf', 'Eff', 'Frau'],
  ['G', 'ɡeː', 'Geh', 'gut'], ['H', 'haː', 'Ha', 'Haus'], ['I', 'iː', 'I', 'ich'],
  ['J', 'jɔt', 'Jott', 'ja'], ['K', 'kaː', 'Ka', 'Kind'], ['L', 'ɛl', 'Ell', 'Lampe'],
  ['M', 'ɛm', 'Emm', 'Mutter'], ['N', 'ɛn', 'Enn', 'nein'], ['O', 'oː', 'O', 'Obst'],
  ['P', 'peː', 'Peh', 'Post'], ['Q', 'kuː', 'Kuh', 'Qualität'], ['R', 'ɛʁ', 'Err', 'rot'],
  ['S', 'ɛs', 'Ess', 'Sonne'], ['T', 'teː', 'Teh', 'Tag'], ['U', 'uː', 'U', 'Uhr'],
  ['V', 'faʊ̯', 'Vau', 'Vater'], ['W', 'veː', 'Weh', 'Wasser'], ['X', 'ɪks', 'Ix', 'Taxi'],
  ['Y', 'ˈʏpsilɔn', 'Ypsilon', 'Typ'], ['Z', 'tsɛt', 'Zett', 'Zahl'],
  ['Ä', 'ɛː', 'Ä', 'Käse'], ['Ö', 'øː', 'Ö', 'schön'], ['Ü', 'yː', 'Ü', 'müde'],
  ['ß', 'ɛsˈtsɛt', 'Eszett', 'Straße'],
].map(([letter, ipa, tts, example]) => ({ letter, ipa, tts, example }));

export const LETTER_TTS = Object.fromEntries(ALPHABET.map((a) => [a.letter, a.tts]));

/** Khoá tra cứu phát âm: bỏ mạo từ, lấy dạng đầu tiên, bỏ dấu câu cuối. */
export function pronKey(de) {
  return de
    .replace(/^(der|die|das)\s+/, '')
    .split(' / ')[0]
    .replace(/[!?.,…]+$/g, '')
    .replace(/\s*…\s*/g, ' ')
    .trim();
}

export function gender(item) {
  if (item.note === '(Pl.)') return 'pl';
  const m = item.de.match(/^(der|die|das)\s/);
  return m ? m[1] : null;
}

/** Danh sách từ vựng phẳng, mỗi mục có id duy nhất (= chính từ tiếng Đức). */
export const VOCAB = DAYS.flatMap((d) =>
  d.vocab.map(([de, vi, note]) => ({ id: de, de, vi, note: note || '', day: d.day })),
);
export const VOCAB_BY_ID = Object.fromEntries(VOCAB.map((v) => [v.id, v]));

export const ALL_PAIRS = DAYS.flatMap((d) => (d.sound?.pairs || []).map((p) => ({ pair: p, day: d.day })));

/** Tất cả từ/cụm cần tra phát âm (dùng bởi scripts/fetch-pron.mjs). */
export function allPronKeys() {
  const keys = new Set();
  for (const v of VOCAB) keys.add(pronKey(v.de));
  for (const d of DAYS) {
    for (const it of d.sound?.items || []) for (const w of it.words) keys.add(pronKey(w));
    for (const p of d.sound?.pairs || []) p.forEach((w) => keys.add(pronKey(w)));
  }
  for (const a of ALPHABET) keys.add(a.example);
  return [...keys].filter((k) => k.length > 1);
}
