import { getRuntimeEnvValue } from '@config/runtimeEnv';

/** One commit that went into a build. */
export interface ReleaseCommit {
  hash: string;
  subject: string;
  body?: string | null;
}

export interface ChangelogSection {
  title: string;
  items: string[];
}

/** Human-friendly release notes derived from the raw commit list. */
export interface Changelog {
  headline: string;
  intro: string;
  sections: ChangelogSection[];
}

export interface ChangelogMeta {
  appName: string;
  version: string;
  rangeLabel?: string | null;
}

/** Conventional-commit type → the section it belongs under (title includes an emoji). */
const TYPE_SECTIONS: { title: string; types: string[] }[] = [
  { title: '✨ New Features', types: ['feat'] },
  { title: '🐛 Fixes', types: ['fix'] },
  { title: '⚡ Performance', types: ['perf'] },
  { title: '🔧 Improvements', types: ['refactor', 'chore', 'build', 'ci', 'docs', 'style', 'test'] },
];
const OTHER_TITLE = '📦 Other changes';

const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/;

const isMergeCommit = (subject: string) => subject.startsWith('Merge ');

/** Split a conventional-commit subject into its type + human description. */
function parseSubject(subject: string): { type: string; text: string } {
  const match = CONVENTIONAL_RE.exec(subject.trim());
  if (!match) return { type: 'other', text: subject.trim() };
  const [, type, scope, description] = match;
  const scopeLabel = scope ? `${scope}: ` : '';
  const clean = description.charAt(0).toUpperCase() + description.slice(1);
  return { type: type.toLowerCase(), text: `${scopeLabel}${clean}` };
}

const sectionForType = (type: string): string =>
  TYPE_SECTIONS.find((s) => s.types.includes(type))?.title ?? OTHER_TITLE;

/**
 * Deterministic changelog built purely from the commit list, grouped by
 * conventional-commit type. Always accurate (no hallucination) — used as-is
 * when OpenAI is unavailable, and as the source of truth handed to OpenAI.
 */
export function mechanicalChangelog(commits: ReleaseCommit[], meta: ChangelogMeta): Changelog {
  const buckets = new Map<string, string[]>();
  for (const commit of commits) {
    if (isMergeCommit(commit.subject)) continue;
    const { type, text } = parseSubject(commit.subject);
    const title = sectionForType(type);
    const list = buckets.get(title) ?? [];
    list.push(text);
    buckets.set(title, list);
  }
  const order = [...TYPE_SECTIONS.map((s) => s.title), OTHER_TITLE];
  const sections = order
    .filter((title) => buckets.has(title))
    .map((title) => ({ title, items: buckets.get(title) ?? [] }));
  const count = commits.filter((c) => !isMergeCommit(c.subject)).length;
  const rangeSuffix = meta.rangeLabel ? ` (${meta.rangeLabel})` : '';
  return {
    headline: `${meta.appName} ${meta.version} is ready to test`,
    intro: `This build bundles ${count} change${count === 1 ? '' : 's'}${rangeSuffix}. Highlights below.`,
    sections,
  };
}

/** True when the parsed value has the exact Changelog shape we render. */
function isChangelog(value: unknown): value is Changelog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.headline !== 'string' || typeof v.intro !== 'string') return false;
  if (!Array.isArray(v.sections)) return false;
  return v.sections.every((s) => {
    const section = s as Record<string, unknown>;
    return typeof section?.title === 'string' && Array.isArray(section?.items);
  });
}

function buildPrompt(commits: ReleaseCommit[], meta: ChangelogMeta) {
  const lines = commits
    .filter((c) => !isMergeCommit(c.subject))
    .map((c) => {
      const bodyLine = c.body ? `\n    ${c.body.replace(/\s+/g, ' ').slice(0, 200)}` : '';
      return `- ${c.subject}${bodyLine}`;
    })
    .join('\n');
  const system = [
    `You write concise, friendly release notes for the "${meta.appName}" Android app.`,
    'Group the given git commits into human-readable bullet points a tester would understand.',
    'Rewrite terse commit messages into clear plain-English lines; drop internal noise (chore/ci/build/test) unless it is user-visible.',
    'Return STRICT JSON only, no markdown, exactly this shape:',
    '{ "headline": string, "intro": string, "sections": [{ "title": string, "items": string[] }] }',
    'Use at most 5 sections. Keep each bullet under 120 characters. Section titles may start with a relevant emoji.',
  ].join('\n');
  const user = `App: ${meta.appName}\nVersion: ${meta.version}\nRange: ${meta.rangeLabel ?? 'recent commits'}\n\nCommits:\n${lines}`;
  return { system, user };
}

/**
 * Turn the commit list into friendly release notes using OpenAI. Falls back to
 * the deterministic {@link mechanicalChangelog} if OpenAI is not configured or
 * the call fails — the release email must always ship.
 */
export async function buildChangelog(
  commits: ReleaseCommit[],
  meta: ChangelogMeta
): Promise<Changelog> {
  const fallback = mechanicalChangelog(commits, meta);
  const apiKey = (await getRuntimeEnvValue('OPENAI_API_KEY')).trim();
  if (!apiKey || commits.length === 0) return fallback;

  const model = (await getRuntimeEnvValue('OPENAI_MODEL')).trim() || 'gpt-4o-mini';
  const base = ((await getRuntimeEnvValue('OPENAI_BASE_URL')).trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  const { system, user } = buildPrompt(commits, meta);

  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!resp.ok) return fallback;
    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed: unknown = JSON.parse(content);
    return isChangelog(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
