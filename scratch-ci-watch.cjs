const https = require('node:https');
const fs = require('node:fs');
const tok = fs.readFileSync('C:/Users/SURYAN~1/AppData/Local/Temp/gh.tok', 'utf8').trim();

const get = (sha) => new Promise((res, rej) => {
  https.get({
    host: 'api.github.com',
    path: `/repos/suryansh-business-work/duncit-all/commits/${sha}/check-runs?per_page=100`,
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'duncit-ci' },
  }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => (r.statusCode === 200 ? res(JSON.parse(b)) : rej(new Error('HTTP ' + r.statusCode)))); }).on('error', rej);
});

const WATCH = ['server (test', 'mWeb (test', 'Shared packages', 'Shared gates'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const sha = process.argv[2];
  for (let i = 0; i < 40; i++) {
    let d;
    try { d = await get(sha); } catch (e) { console.log('poll error', e.message); await sleep(90000); continue; }
    const runs = d.check_runs || [];
    const watched = runs.filter((r) => WATCH.some((w) => r.name.startsWith(w)));
    const failed = runs.filter((r) => r.status === 'completed' && !['success', 'skipped', 'neutral'].includes(r.conclusion));
    const pending = runs.filter((r) => r.status !== 'completed');
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${runs.length} runs · ${pending.length} pending · ${failed.length} not-green`);
    for (const r of watched) console.log('   ', r.name, '→', r.status === 'completed' ? r.conclusion : r.status);
    if (failed.length) { console.log('NOT GREEN:', failed.map((r) => `${r.name}=${r.conclusion}`).join(' | ')); }
    if (pending.length === 0 && runs.length > 0) { console.log(failed.length ? 'DONE — RED' : 'DONE — ALL GREEN'); return; }
    await sleep(90000);
  }
  console.log('watch window elapsed');
})();
