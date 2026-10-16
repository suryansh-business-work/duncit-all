import { emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { settingsService } from '@modules/platform/settings/settings.service';
import { emailPreviewVars, sendHtmlEmail, type EmailAttachment } from '@services/email/email.service';
import { buildChangelog, type ReleaseCommit } from './appRelease.changelog';
import { buildReleaseVars } from './appRelease.email';
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

  const changelog = await buildChangelog(input.commits, {
    appName,
    version: input.version,
    rangeLabel: input.range_label,
  });

  // The `app-release-build` template (Communications > Emails > Templates),
  // filled with what a real send supplies — logo, links, translations — plus
  // the build's own values. Rendered here rather than through `sendEmail`
  // because one message goes to the whole release list at once.
  const vars = {
    ...(await emailPreviewVars()),
    app_name: appName,
    ...buildReleaseVars({
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
    }),
  };
  const { subject, html, errors } = await emailTemplateService.render('app-release-build', vars);
  if (errors?.length)
    logs.server.warn('appRelease', 'sendAppReleaseEmail', {
      msg: 'Release MJML warnings',
      errors,
    });
  if (!html) {
    throw new GraphQLError(errors?.join('; ') || 'The release email rendered an empty body');
  }

  const attachments = await maybeAttachApk(input.apk_url, input.apk_size_mb, input.build_name);

  const info = await sendHtmlEmail({
    to: recipients,
    subject: subject || `${appName} v${input.version}`,
    html,
    attachments,
    category: 'internal',
    template: 'app-release-build',
  });

  return {
    ok: true,
    message: `Release email sent to ${recipients.length} recipient(s)`,
    recipients,
    message_id: String(info.messageId ?? '') || null,
    changelog_html: html,
  };
}
