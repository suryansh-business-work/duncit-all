import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
function* files(d){ for(const e of readdirSync(d)){ if(e==='node_modules'||e==='dist'||e==='.git')continue; const f=join(d,e); const s=statSync(f); if(s.isDirectory()) yield* files(f); else if(e.endsWith('.ts')||e.endsWith('.tsx')) yield f; } }
const fns = ["dateColumn","activeChipColumn","actionsColumn"];
const res = {};
for (const root of ["portals","packages","app","admin"]) {
  let list; try { list=[...files(root)]; } catch { continue; }
  for (const f of list) {
    const rel = f.replaceAll("\\","/");
    if (rel.startsWith("packages/table/src")) continue;
    const t = readFileSync(f,"utf8");
    for (const fn of fns) {
      let from = 0;
      for(;;) {
        const at = t.indexOf(fn, from);
        if (at < 0) break;
        from = at + fn.length;
        const before = t[at-1] ?? " ";
        if (/[A-Za-z0-9_$]/.test(before)) continue;
        // skip optional generic
        let i = from;
        if (t[i] === "<") { let d=1; i++; while(i<t.length && d>0){ if(t[i]==="<")d++; else if(t[i]===">")d--; i++; } }
        if (t[i] !== "(") continue;
        let j = i+1, depth = 1;
        while (j < t.length && depth > 0) { const c=t[j]; if(c==="(")depth++; else if(c===")")depth--; j++; }
        const body = t.slice(i+1, j-1);
        const key = fn + (body.includes("headerName") ? ":has" : ":MISSING");
        (res[key] ??= []).push(rel + " :: " + body.replace(/\s+/g," ").slice(0,80));
      }
    }
  }
}
for (const [k,v] of Object.entries(res).sort()) console.log(k, v.length);
for (const k of Object.keys(res).sort()) if(k.endsWith("MISSING")) { console.log("== "+k); for(const l of res[k]) console.log("   "+l); }
