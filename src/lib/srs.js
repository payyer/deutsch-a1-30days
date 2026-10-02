// Lặp lại ngắt quãng (Spaced Repetition) – biến thể đơn giản của thuật toán SM-2.
import { update, todayStr } from './store.js';


export const GRADES = [
  { q: 0, label: 'Quên', hint: 'ôn lại ngay' },
  { q: 1, label: 'Khó', hint: '' },
  { q: 2, label: 'Nhớ', hint: '' },
  { q: 3, label: 'Dễ', hint: '' },
];

export function addCards(ids) {
  update((s) => {
    const t = todayStr();
    for (const id of ids) if (!s.srs[id]) s.srs[id] = { due: t, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  });
}

/** Trả về số ngày đến lần ôn tiếp theo nếu chọn mức q. */
export function nextInterval(card, q) {
  if (q === 0) return 0;
  if (q === 1) return Math.max(1, Math.round(card.ivl * 1.2));
  const base = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.round(card.ivl * card.ease);
  return q === 3 ? Math.max(base + 1, Math.round(base * 1.4)) : Math.max(base, card.ivl + 1);
}

export function grade(id, q) {
  update((s) => {
    const c = s.srs[id];
    if (!c) return;
    const ivl = nextInterval(c, q);
    if (q === 0) {
      c.reps = 0;
      c.lapses++;
      c.ease = Math.max(1.3, c.ease - 0.2);
    } else {
      c.reps++;
      if (q === 1) c.ease = Math.max(1.3, c.ease - 0.15);
      if (q === 3) c.ease += 0.15;
    }
    c.ivl = ivl;
    const d = new Date();
    d.setDate(d.getDate() + ivl);
    c.due = todayStr(d);
  });
}

export function dueIds(srs) {
  const t = todayStr();
  return Object.entries(srs)
    .filter(([, c]) => c.due <= t)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
    .map(([id]) => id);
}

export function fmtInterval(d) {
  if (d === 0) return '< 10 phút';
  if (d === 1) return '1 ngày';
  if (d < 30) return `${d} ngày`;
  return `${Math.round(d / 30)} tháng`;
}
