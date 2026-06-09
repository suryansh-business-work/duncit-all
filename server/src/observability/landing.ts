/**
 * Minimal landing page served at `GET /` so the API root shows a branded,
 * secured-endpoint notice instead of Express's default "Cannot GET /".
 * Static, self-contained HTML (no template engine / assets).
 */
export const LANDING_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Duncit API</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #eef2f7;
        background: radial-gradient(1200px 600px at 80% -10%, rgba(255,90,90,.16), transparent 60%),
          radial-gradient(1000px 500px at 0% 0%, rgba(56,120,255,.12), transparent 55%), #0a0d16;
      }
      .card {
        max-width: 520px; width: 100%; text-align: center; padding: 34px;
        border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(255,255,255,.04);
      }
      .badge {
        display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: .78rem;
        color: #22c55e; border: 1px solid rgba(34,197,94,.3); background: rgba(34,197,94,.12);
        padding: 6px 14px; border-radius: 999px;
      }
      .dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.18); }
      h1 { font-size: 1.5rem; font-weight: 900; margin: 18px 0 6px; }
      p { color: #94a3b8; margin: 0; line-height: 1.55; }
      .warn {
        margin-top: 20px; border: 1px solid rgba(245,158,11,.3); background: rgba(245,158,11,.1);
        color: #fcd34d; border-radius: 12px; padding: 12px 14px; font-size: .85rem; line-height: 1.5;
      }
      a { color: #ff5a5a; font-weight: 700; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge"><span class="dot"></span> API Operational</span>
      <h1>Duncit API</h1>
      <p>This is the secured Duncit platform API. There are no browsable pages here.</p>
      <div class="warn">⚠ Restricted endpoint. Do not interact with this URL — every request is logged and monitored.</div>
      <p style="margin-top:18px">Live service status: <a href="https://status.duncit.com">status.duncit.com</a></p>
    </main>
  </body>
</html>`;
