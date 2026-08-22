const R = 'suryansh-business-work/duncit-all';
const sha = 'bc691329a';
async function get(u) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(u);
      if (r.status === 403) { await new Promise(s => setTimeout(s, 20000)); continue; }
      if (!r.ok) { await new Promise(s => setTimeout(s, 10000)); continue; }
      return await r.json();
    } catch { await new Promise(s => setTimeout(s, 10000)); }
  }
  return null;
}
let stable = 0;
for (let tick = 0; tick < 90; tick++) {
  const j = await get(`https://api.github.com/repos/${R}/commits/${sha}/check-runs?per_page=100`);
  if (j?.check_runs) {
    const runs = j.check_runs;
    const pending = runs.filter(r => r.status !== 'completed');
    const failed = runs.filter(r => r.status === 'completed' && !['success','neutral','skipped'].includes(r.conclusion));
    console.log(`[${tick}] total=${runs.length} pending=${pending.length} failed=${failed.length}`);
    if (pending.length === 0 && runs.length > 0) {
      stable++;
      if (stable >= 2) {
        console.log('=== DONE ===');
        for (const f of failed) console.log(`FAIL ${f.conclusion} ${f.name} ${f.html_url}`);
        if (!failed.length) console.log('ALL GREEN');
        break;
      }
    } else { stable = 0; }
  }
  await new Promise(s => setTimeout(s, 30000));
}
