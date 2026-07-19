import type { Changelog, ReleaseCommit } from './appRelease.changelog';

export interface ReleaseMjmlData {
  appName: string;
  logoUrl: string;
  version: string;
  buildName: string;
  apkUrl: string;
  apkSizeMb: number;
  builtOn: string;
  rangeLabel?: string | null;
  changelog: Changelog;
  commits: ReleaseCommit[];
  filesChanged?: number | null;
  insertions?: number | null;
  deletions?: number | null;
}

const ACCENT = '#6C4CF1';
const INK = '#1A1A2E';
const MUTED = '#667085';
const BG = '#F4F5FB';
const CARD = '#FFFFFF';

/** Escape text placed inside MJML/HTML so commit messages can't break markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function headerSection(data: ReleaseMjmlData): string {
  const brand = data.logoUrl
    ? `<mj-image src="${esc(data.logoUrl)}" alt="${esc(data.appName)}" width="132px" padding="0" />`
    : `<mj-text align="center" font-size="22px" font-weight="700" color="${INK}">${esc(data.appName)}</mj-text>`;
  return `
    <mj-section padding="28px 0 8px">
      <mj-column>
        ${brand}
      </mj-column>
    </mj-section>`;
}

function heroSection(data: ReleaseMjmlData): string {
  const size = data.apkSizeMb > 0 ? `${data.apkSizeMb.toFixed(1)} MB` : 'APK';
  return `
    <mj-section background-color="${CARD}" border-radius="16px" padding="8px 8px 24px">
      <mj-column>
        <mj-text align="center" color="${ACCENT}" font-size="13px" font-weight="700" letter-spacing="1px" padding="24px 24px 4px">
          NEW ANDROID BUILD
        </mj-text>
        <mj-text align="center" color="${INK}" font-size="30px" font-weight="800" padding="0 24px 4px">
          ${esc(data.appName)} v${esc(data.version)}
        </mj-text>
        <mj-text align="center" color="${MUTED}" font-size="14px" padding="0 24px 18px">
          ${esc(data.buildName)} &nbsp;·&nbsp; ${esc(size)}
        </mj-text>
        <mj-button href="${esc(data.apkUrl)}" background-color="${ACCENT}" color="#FFFFFF" font-size="16px" font-weight="700" border-radius="10px" inner-padding="14px 34px" padding="0 24px">
          ⬇  Download APK
        </mj-button>
        <mj-text align="center" color="${MUTED}" font-size="12px" padding="12px 24px 0">
          Direct install link · works on any Android device
        </mj-text>
      </mj-column>
    </mj-section>`;
}

function changelogSection(data: ReleaseMjmlData): string {
  const blocks = data.changelog.sections
    .filter((s) => s.items.length > 0)
    .map((s) => {
      const items = s.items.map((item) => `<li style="margin:0 0 6px">${esc(item)}</li>`).join('');
      return `
        <mj-text color="${INK}" font-size="16px" font-weight="700" padding="16px 24px 4px">${esc(s.title)}</mj-text>
        <mj-text color="${MUTED}" font-size="14px" line-height="22px" padding="0 24px 6px">
          <ul style="margin:0;padding-left:20px">${items}</ul>
        </mj-text>`;
    })
    .join('');
  return `
    <mj-section padding="18px 0 0">
      <mj-column>
        <mj-text color="${INK}" font-size="20px" font-weight="800" padding="8px 24px 2px">What's new</mj-text>
        <mj-text color="${MUTED}" font-size="14px" line-height="22px" padding="0 24px 6px">${esc(data.changelog.intro)}</mj-text>
        ${blocks}
      </mj-column>
    </mj-section>`;
}

function commitLogSection(data: ReleaseMjmlData): string {
  if (data.commits.length === 0) return '';
  const rows = data.commits
    .slice(0, 40)
    .map(
      (c) =>
        `<tr><td style="padding:3px 8px 3px 0;color:${ACCENT};font-family:monospace;font-size:12px;white-space:nowrap;vertical-align:top">${esc(
          c.hash.slice(0, 7)
        )}</td><td style="padding:3px 0;color:${MUTED};font-size:13px">${esc(c.subject)}</td></tr>`
    )
    .join('');
  return `
    <mj-section padding="8px 0 0">
      <mj-column>
        <mj-text color="${INK}" font-size="15px" font-weight="700" padding="10px 24px 4px">
          Commits in this build (${data.commits.length})
        </mj-text>
        <mj-text padding="0 24px 8px">
          <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
        </mj-text>
      </mj-column>
    </mj-section>`;
}

function statsLine(data: ReleaseMjmlData): string {
  const parts: string[] = [];
  if (data.filesChanged != null) parts.push(`${data.filesChanged} files changed`);
  if (data.insertions != null) parts.push(`+${data.insertions}`);
  if (data.deletions != null) parts.push(`-${data.deletions}`);
  if (data.rangeLabel) parts.push(esc(data.rangeLabel));
  if (parts.length === 0) return '';
  return `
    <mj-section padding="0">
      <mj-column>
        <mj-divider border-color="#E6E8F0" padding="8px 24px" />
        <mj-text align="center" color="${MUTED}" font-size="12px" padding="0 24px 4px">${parts.join(' &nbsp;·&nbsp; ')}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** Compose the full MJML source for a mobile-app release email. */
export function buildReleaseMjml(data: ReleaseMjmlData): string {
  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" />
    </mj-attributes>
    <mj-preview>${esc(data.appName)} v${esc(data.version)} — ${esc(data.buildName)} is ready to install</mj-preview>
  </mj-head>
  <mj-body background-color="${BG}" width="600px">
    ${headerSection(data)}
    ${heroSection(data)}
    ${changelogSection(data)}
    ${commitLogSection(data)}
    ${statsLine(data)}
    <mj-section padding="12px 0 28px">
      <mj-column>
        <mj-text align="center" color="${MUTED}" font-size="12px" line-height="18px">
          Built on ${esc(data.builtOn)} · Internal test build.<br />
          You're receiving this because you're on the ${esc(data.appName)} release list.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}
