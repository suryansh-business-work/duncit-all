import mjml2html from 'mjml';
import { GraphQLError } from 'graphql';
import { settingsService } from '@modules/platform/settings/settings.service';
import { sendHtmlEmail, type EmailAttachment } from '@services/email/email.service';
import { buildChangelog, type ReleaseCommit } from './appRelease.changelog';
import { buildReleaseMjml } from './appRelease.mjml';
import { RELEASE_NOTIFY_RECIPIENTS } from './appRelease.recipients';

export interface SendAppReleaseEmailInput {
  version: string;
  build_name: string;
  apk_url: string;
  apk_size_mb: number;
  commits: ReleaseCommit[];
  range_label?: string | null;
  files_changed?: number | null;
  insertions?: number | null;
  deletions?: number | null;
  recipients?: string[] | null;
}

export interface AppReleaseEmailResult {
  ok: boolean;
  message: string;
  recipients: string[];
  message_id?: string | null;
  changelog_html?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** APKs above this attach-limit go by download link only (SMTP servers reject > ~25 MB). */
const ATTACH_LIMIT_MB = 20;

function resolveRecipients(input?: string[] | null): string[] {
  const list = (input?.length ? input : RELEASE_NOTIFY_RECIPIENTS)
    .map((email) => email.trim())
    .filter((email) => EMAIL_RE.test(email));
  if (list.length === 0) {
    throw new GraphQLError('No valid recipients for the release email', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return Array.from(new Set(list));
}

/** Fetch the APK bytes only when small enough to attach; skip on any failure. */
async function maybeAttachApk(url: string, sizeMb: number, buildName: string): Promise<EmailAttachment[]> {
  if (sizeMb <= 0 || sizeMb > ATTACH_LIMIT_MB) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const content = Buffer.from(await res.arrayBuffer());
    return [
      {
        filename: buildName.endsWith('.apk') ? buildName : `${buildName}.apk`,
        content,
        contentType: 'application/vnd.android.package-archive',
      },
    ];
  } catch {
    return [];
  }
}

export async function sendAppReleaseEmail(
  input: SendAppReleaseEmailInput
): Promise<AppReleaseEmailResult> {
  if (!input.apk_url.trim()) {
    throw new GraphQLError('apk_url is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const recipients = resolveRecipients(input.recipients);

  const branding = await settingsService.getBranding().catch(() => null);
  const appName = branding?.app_name || 'Duncit';
  const logoUrl = branding?.mobile_logo_url || branding?.logo_url || '';

  const changelog = await buildChangelog(input.commits, {
    appName,
    version: input.version,
    rangeLabel: input.range_label,
  });

  const mjml = buildReleaseMjml({
    appName,
    logoUrl,
    version: input.version,
    buildName: input.build_name,
    apkUrl: input.apk_url,
    apkSizeMb: input.apk_size_mb,
    builtOn: new Date().toUTCString(),
    rangeLabel: input.range_label,
    changelog,
    commits: input.commits,
    filesChanged: input.files_changed,
    insertions: input.insertions,
    deletions: input.deletions,
  });

  const { html, errors } = mjml2html(mjml, { validationLevel: 'soft' }) as unknown as {
    html: string;
    errors: unknown[];
  };
  if (errors?.length) console.warn('Release MJML warnings:', errors);

  const attachments = await maybeAttachApk(input.apk_url, input.apk_size_mb, input.build_name);
  const subject = `📱 ${appName} v${input.version} — new build ready to test`;

  const info = await sendHtmlEmail({ to: recipients, subject, html, attachments });

  return {
    ok: true,
    message: `Release email sent to ${recipients.length} recipient(s)`,
    recipients,
    message_id: String(info.messageId ?? '') || null,
    changelog_html: html,
  };
}
