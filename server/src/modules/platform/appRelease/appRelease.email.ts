import { escapeHtml } from '@utils/html';
import { EMAIL_COLOR as C, EMAIL_TYPE as F } from '@services/email/catalogue/tokens';
import type { Changelog, ReleaseCommit } from './appRelease.changelog';

/**
 * The variables the `app-release-build` template is filled with.
 *
 * The body lives in the email catalogue (Communications > Emails > Templates,
 * rule 28); only the two parts whose length is the build's — the changelog and
 * the commit list — are drawn here, as HTML. Every string that comes from a
 * commit is escaped: a subject line is free text, and one `<` in it would
 * otherwise break the markup of every email after it.
 */
export interface ReleaseEmailData {
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

/** The commit list stops here; a build with more links to its range instead. */
const MAX_COMMITS = 40;
const DASH = '—';

/**
 * A section title without the emoji OpenAI may still lead it with — the
 * prompt asks for plain words, but a prompt edited in the AI console can ask
 * for anything, and an email draws no Unicode icons (rule 22).
 */
const plainTitle = (title: string): string => title.replaceAll(/\p{Extended_Pictographic}|️/gu, '').trim();

function changelogHtml(changelog: Changelog): string {
  const sections = changelog.sections
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const items = section.items
        .map((item) => `<li style="margin:0 0 6px">${escapeHtml(item)}</li>`)
        .join('');
      return `<p style="margin:16px 0 4px;color:${C.ink};font-weight:700">${escapeHtml(plainTitle(section.title))}</p><ul style="margin:0;padding-left:20px">${items}</ul>`;
    })
    .join('');
  return `<p style="margin:0;color:${C.body}">${escapeHtml(changelog.intro)}</p>${sections}`;
}

function commitsHtml(commits: ReleaseCommit[]): string {
  if (commits.length === 0) return DASH;
  const rows = commits
    .slice(0, MAX_COMMITS)
    .map(
      (commit) =>
        `<tr><td style="padding:4px 10px 4px 0;color:${C.primary};font-family:${F.mono};font-size:${F.caption.size};white-space:nowrap;vertical-align:top">${escapeHtml(
          commit.hash.slice(0, 7)
        )}</td><td style="padding:4px 0;color:${C.body};font-size:${F.small.size};line-height:${F.small.line}">${escapeHtml(commit.subject)}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>`;
}

const count = (value?: number | null, sign = ''): string => (value == null ? DASH : `${sign}${value}`);

export function buildReleaseVars(data: ReleaseEmailData): Record<string, string> {
  return {
    version: data.version,
    build_name: data.buildName,
    apk_size: data.apkSizeMb > 0 ? `${data.apkSizeMb.toFixed(1)} MB` : 'APK',
    apk_url: data.apkUrl,
    changelog_html: changelogHtml(data.changelog),
    commits_count: String(data.commits.length),
    commits_html: commitsHtml(data.commits),
    files_changed: count(data.filesChanged),
    insertions: count(data.insertions, '+'),
    deletions: count(data.deletions, '-'),
    range_label: data.rangeLabel ? data.rangeLabel : DASH,
    built_on: data.builtOn,
  };
}
