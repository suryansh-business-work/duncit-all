const https = require('node:https');
const fs = require('node:fs');
const tok = fs.readFileSync(process.env.TMPTOK, 'utf8').trim();
const sha = process.argv[2];
https.get({
  host: 'api.github.com',
  path: `/repos/suryansh-business-work/duncit-all/commits/${sha}/check-runs?per_page=100`,
  headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'duncit-ci' },
}, (res) => {
  let b = '';
  res.on('data', (c) => (b += c));
  res.on('end', () => {
    if (res.statusCode !== 200) return console.log('HTTP', res.statusCode, b.slice(0, 200));
    const d = JSON.parse(b);
    const by = {};
    for (const r of d.check_runs || []) { const k = r.status === 'completed' ? r.conclusion : r.status; (by[k] ||= []).push(r.name); }
    console.log(`sha ${sha.slice(0,9)} — ${d.total_count} check runs`);
    for (const [k, v] of Object.entries(by)) console.log('  ' + String(k).toUpperCase(), '(' + v.length + '):', v.join(' | '));
  });
}).on('error', (e) => console.log('ERR', e.message));
