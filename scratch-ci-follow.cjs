const https = require('node:https');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const tok = fs.readFileSync('C:/Users/SURYAN~1/AppData/Local/Temp/gh.tok', 'utf8').trim();
const REPO = 'suryansh-business-work/duncit-all';

const api = (p) => new Promise((res, rej) => {
  https.get({ host: 'api.github.com', path: p, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'duncit-ci' } },
    (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => (r.statusCode === 200 ? res(JSON.parse(b)) : rej(new Error('HTTP ' + r.statusCode)))); }).on('error', rej);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < 45; i++) {
    let tip;
    try { tip = (await api(`/repos/${REPO}/commits/staging`)).sha; } catch (e) { console.log('tip error', e.message); await sleep(90000); continue; }
    let d;
    try { d = await api(`/repos/${REPO}/commits/${tip}/check-runs?per_page=100`); } catch (e) { console.log('runs error', e.message); await sleep(90000); continue; }
    const runs = d.check_runs || [];
    const server = runs.filter((r) => r.name.startsWith('server (')).map((r) => (r.status === 'completed' ? r.conclusion : r.status));
    const failures = runs.filter((r) => r.status === 'completed' && r.conclusion === 'failure');
    const stamp = new Date().toISOString().slice(11, 19);
    console.log(`[${stamp}] tip ${tip.slice(0, 9)} · ${runs.length} runs · server: ${server.join(',') || 'none yet'} · real failures: ${failures.length}`);
    if (failures.length) console.log('   FAILURES:', failures.map((r) => r.name).join(' | '));
    if (server.includes('success') && !failures.length) { console.log('SERVER JOB GREEN on', tip.slice(0, 9)); return; }
    if (failures.some((r) => r.name.startsWith('server ('))) { console.log('SERVER JOB FAILED on', tip.slice(0, 9)); return; }
    await sleep(90000);
  }
  console.log('watch window elapsed');
})();
