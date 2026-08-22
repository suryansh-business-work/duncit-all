const R = 'suryansh-business-work/duncit-all';
const sha = process.argv[2];
const res = await fetch(`https://api.github.com/repos/${R}/commits/${sha}/check-runs?per_page=100`);
const j = await res.json();
if (!j.check_runs) { console.log(JSON.stringify(j).slice(0,500)); process.exit(1); }
const runs = j.check_runs;
const bad = runs.filter(r => r.status === 'completed' && !['success','neutral','skipped'].includes(r.conclusion));
const pending = runs.filter(r => r.status !== 'completed');
console.log(`total=${runs.length} failing=${bad.length} pending=${pending.length}`);
console.log('--- FAILING ---');
for (const r of bad) console.log(`${r.conclusion.padEnd(10)} ${r.name}  ${r.html_url}`);
console.log('--- PENDING ---');
for (const r of pending) console.log(`${r.status.padEnd(12)} ${r.name}`);
