// Lấy phiên âm IPA + bản ghi âm người bản xứ cho mọi từ trong giáo trình → src/data/pron.json
//
//   node scripts/fetch-pron.mjs             # IPA + URL audio đã xác minh (app phát trực tiếp từ Wikimedia)
//   node scripts/fetch-pron.mjs --no-audio  # chỉ IPA
//   WIKI_CONTACT="email-hoặc-url" node scripts/fetch-pron.mjs --offline   # tải MP3 về public/audio
//
// Nguồn:
//   IPA:   mục "Deutsch" trên de.wiktionary.org, mẫu {{Lautschrift|…}} (dẫn theo Duden Aussprachewörterbuch)
//   Audio: mẫu {{Audio|De-….ogg}} trong dòng {{Hörbeispiele}} → Wikimedia Commons. Bỏ bản ghi có spr=at/ch
//          (giọng Áo/Thụy Sĩ) để giữ chuẩn Đức. URL MP3 lấy từ Commons API (videoinfo derivatives).

import { createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { allPronKeys } from '../src/data/index.js';

const UA = 'DeutschA1LearningApp/1.0 (personal study project' + (process.env.WIKI_CONTACT ? '; ' + process.env.WIKI_CONTACT : '') + ') Node.js';
const OUT_JSON = new URL('../src/data/pron.json', import.meta.url);
const AUDIO_DIR = new URL('../public/audio/', import.meta.url);
const withAudio = !process.argv.includes('--no-audio');
// Tải audio về máy (tuỳ chọn). Chính sách User-Agent của Wikimedia yêu cầu thông tin liên hệ:
//   WIKI_CONTACT="ban@email.com" node scripts/fetch-pron.mjs --offline
const offline = process.argv.includes('--offline');
const CONTACT = process.env.WIKI_CONTACT;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * 2 ** i;
      console.warn(`  ${res.status} → chờ ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error('Quá nhiều lần thử: ' + url);
}

/** Tách mục tiếng Đức trên trang wiktionary. */
function germanSection(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^== .*\{\{Sprache\|Deutsch\}\}.*==\s*$/.test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^== [^=]/.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start, end);
}

function parse(text) {
  const sec = germanSection(text);
  if (!sec) return null;
  let ipa = null;
  let audio = [];
  for (let i = 0; i < sec.length; i++) {
    const l = sec[i];
    if (!ipa && /^:\{\{IPA\}\}/.test(l)) {
      const m = l.match(/\{\{Lautschrift\|([^}|]+)/);
      if (m && !/…|\.\.\./.test(m[1])) ipa = m[1].trim();
    }
    if (!audio.length && /^:\{\{Hörbeispiele\}\}/.test(l)) {
      for (const m of l.matchAll(/\{\{Audio\|([^}|]+)((?:\|[^}]*)?)\}\}/g)) {
        // một số trang chứa ký tự điều hướng ẩn (U+200E…) trong tên file
        const file = m[1].replace(/[​-‏‪-‮⁦-⁩]/g, '').trim();
        const params = m[2] || '';
        if (/spr=/.test(params)) continue; // giọng vùng (at, ch…)
        if (/^De-(at|AT|ch|CH)-/.test(file)) continue;
        audio.push(file);
      }
    }
  }
  if (!ipa && !audio.length) return null;
  return { ipa, audio };
}

async function queryTitles(titles) {
  const u = new URL('https://de.wiktionary.org/w/api.php');
  const params = { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2', redirects: '1', titles: titles.join('|') };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const j = await (await get(u)).json();
  const map = {};
  const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.to, n.from]));
  const redir = Object.fromEntries((j.query.redirects || []).map((n) => [n.to, n.from]));
  for (const p of j.query.pages) {
    if (p.missing || !p.revisions) continue;
    const parsed = parse(p.revisions[0].slots.main.content);
    if (!parsed) continue;
    let t = p.title;
    if (redir[t]) t = redir[t];
    if (norm[t]) t = norm[t];
    map[t] = parsed;
  }
  return map;
}

function variants(key) {
  const v = [key];
  const lowerFirst = key[0].toLowerCase() + key.slice(1);
  const upperFirst = key[0].toUpperCase() + key.slice(1);
  if (lowerFirst !== key) v.push(lowerFirst);
  if (upperFirst !== key) v.push(upperFirst);
  return v;
}

/** Hỏi Commons API để lấy URL đã xác minh (bản MP3 chuyển mã + OGG gốc), tác giả và giấy phép. */
async function fileInfo(files) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  const params = { action: 'query', prop: 'videoinfo', viprop: 'url|derivatives|extmetadata', viextmetadatafilter: 'Artist|LicenseShortName', format: 'json', formatversion: '2', redirects: '1', titles: files.map((f) => 'File:' + f).join('|') };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const j = await (await get(u)).json();
  const back = {};
  for (const n of j.query.normalized || []) back[n.to] = n.from;
  for (const n of j.query.redirects || []) back[n.to] = back[n.from] || n.from;
  const out = {};
  for (const p of j.query.pages) {
    const vi = p.videoinfo?.[0];
    if (p.missing || !vi) continue;
    const clean = (x) => x && x.split('?')[0];
    const mp3 = vi.derivatives?.find((d) => d.type === 'audio/mpeg')?.src;
    const meta = vi.extmetadata || {};
    const artist = (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
    const orig = back[p.title] || p.title;
    out[orig.replace(/^File:/, '')] = { mp3: clean(mp3), ogg: clean(vi.url), page: vi.descriptionurl, author: artist.slice(0, 80), license: meta.LicenseShortName?.value || '' };
  }
  return out;
}

const exists = (u) => access(u).then(() => true, () => false);

async function main() {
  const keys = allPronKeys();
  console.log(`Tra ${keys.length} từ trên de.wiktionary.org …`);

  const found = {};
  // lượt 1: đúng chính tả; lượt 2: đổi hoa/thường chữ đầu
  for (const round of [0, 1]) {
    const todo = keys.filter((k) => !found[k]).flatMap((k) => (round === 0 ? [[k, k]] : variants(k).slice(1).map((v) => [k, v])));
    for (let i = 0; i < todo.length; i += 50) {
      const chunk = todo.slice(i, i + 50);
      const res = await queryTitles(chunk.map(([, t]) => t));
      for (const [k, t] of chunk) if (!found[k] && res[t]) found[k] = { ...res[t], title: t };
      process.stdout.write(`  lượt ${round + 1}: ${Math.min(i + 50, todo.length)}/${todo.length}\r`);
      await sleep(300);
    }
    console.log();
  }

  const out = {};
  for (const k of keys) {
    const f = found[k];
    if (!f) continue;
    out[k] = { ipa: f.ipa || null, file: f.audio[0] || null, title: f.title };
  }

  if (withAudio) {
    const files = [...new Set(Object.values(out).map((v) => v.file).filter(Boolean))];
    console.log(`Xác minh ${files.length} file audio qua Commons API …`);
    const info = {};
    for (let i = 0; i < files.length; i += 50) {
      Object.assign(info, await fileInfo(files.slice(i, i + 50)));
      process.stdout.write(`  ${Math.min(i + 50, files.length)}/${files.length}`);
      await sleep(300);
    }
    console.log();
    for (const v of Object.values(out)) {
      const f = info[v.file];
      if (!f) continue;
      Object.assign(v, { src: f.mp3 || f.ogg, ogg: f.ogg, page: f.page, author: f.author, license: f.license });
    }
    if (offline) await downloadAll(out);
  }

  await writeFile(OUT_JSON, JSON.stringify(out, null, 1));

  const missing = keys.filter((k) => !out[k]);
  const noIpa = keys.filter((k) => out[k] && !out[k].ipa);
  const noAudio = keys.filter((k) => out[k] && !out[k].src);
  const single = (k) => !/\s/.test(k);
  console.log(`\n✔ ${Object.keys(out).length}/${keys.length} có dữ liệu`);
  console.log(`  IPA: ${keys.length - missing.length - noIpa.length} • Audio bản xứ: ${Object.values(out).filter((v) => v.src).length}`);
  console.log(`  Từ đơn không có trên Wiktionary (${missing.filter(single).length}): ${missing.filter(single).join(', ')}`);
  console.log(`  Cụm từ dùng TTS (${missing.filter((k) => !single(k)).length})`);
  console.log(`  Có IPA nhưng không có audio (${noAudio.length}): ${noAudio.join(', ')}`);
}

async function downloadAll(out) {
  if (!CONTACT) {
    console.warn('Bỏ qua tải offline: cần đặt biến WIKI_CONTACT (email/URL liên hệ) theo chính sách User-Agent của Wikimedia.');
    return;
  }
  await mkdir(AUDIO_DIR, { recursive: true });
  const list = Object.values(out).filter((v) => v.src?.startsWith('http'));
  let n = 0;
  for (const v of list) {
    const name = createHash('md5').update(v.src).digest('hex').slice(0, 12) + '.mp3';
    const dest = new URL(name, AUDIO_DIR);
    if (!(await exists(dest))) {
      const res = await get(v.src);
      if (res.ok) await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      await sleep(1000);
    }
    if (await exists(dest)) v.src = 'audio/' + name;
    process.stdout.write(`  tải ${++n}/${list.length}`);
  }
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
