import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { getImagekitConfig } from '@modules/platform/upload/upload.service';
import { issueUploadTicket } from '@modules/platform/upload/uploadTicket';
import { signToken } from '@modules/access/user/user.service';
import { getUrlConfigs } from '@config/url-configs';
import type { AuthUser } from '@context';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  AppBuildModel,
  nextBuildNo,
  type AppBuildPlatform,
  type IAppBuild,
} from './appBuild.model';

/** Where CI build artifacts land on ImageKit (release-notify's folder). */
export const APP_BUILDS_FOLDER = '/app-builds';

const CHANNEL_ENV_KEY: Record<AppBuildPlatform, string> = {
  ANDROID: 'SLACK_ANDROID_BUILDS_CHANNEL',
  IOS: 'SLACK_IOS_BUILDS_CHANNEL',
};

const PLATFORM_LABEL: Record<AppBuildPlatform, string> = {
  ANDROID: 'Android',
  IOS: 'iOS',
};

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const optionalStr = (v: string | null | undefined): string => String(v ?? '').trim();
const optionalNum = (v: unknown): number | null => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? null : n;
};

const APP_BUILD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['build_no', 'version', 'build_name', 'commit_sha', 'branch', 'commits.subject'],
  // Every column the table renders sortable must be listed here — resolveSort
  // silently ignores anything else, so a gap makes the header arrow lie.
  sortFields: {
    build_name: 'build_name',
    status: 'status',
    version: 'version',
    size_mb: 'size_mb',
    duration_seconds: 'duration_seconds',
    branch: 'branch',
    reported_by: 'reported_by',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    version: { type: 'string' },
    branch: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const pub = (doc: IAppBuild) => ({
  id: doc.id,
  build_no: doc.build_no,
  platform: doc.platform,
  status: doc.status,
  version: doc.version,
  build_name: doc.build_name,
  artifact_url: doc.artifact_url,
  artifact_file_id: doc.artifact_file_id,
  size_mb: doc.size_mb,
  commit_sha: doc.commit_sha,
  branch: doc.branch,
  commits: doc.commits.map((c) => ({ hash: c.hash, subject: c.subject, author: c.author ?? '' })),
  files_changed: doc.files_changed,
  insertions: doc.insertions,
  deletions: doc.deletions,
  workflow_run_id: doc.workflow_run_id,
  workflow_run_url: doc.workflow_run_url,
  duration_seconds: doc.duration_seconds,
  reported_by: doc.reported_by,
  slack_channel: doc.slack_channel,
  slack_ts: doc.slack_ts,
  slack_error: doc.slack_error,
  created_at: doc.created_at?.toISOString() ?? null,
});

/** Slack mrkdwn treats &, < and > as control characters — a commit subject
 * containing `<!channel>` would otherwise ping the whole channel. */
const escapeMrkdwn = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** GitHub commit link derived from the run URL — both live on the same repo. */
function commitUrl(build: IAppBuild): string {
  const base = build.workflow_run_url.split('/actions/')[0];
  if (!base || !build.commit_sha) return '';
  return `${base}/commit/${build.commit_sha}`;
}

function headline(build: IAppBuild): string {
  const label = PLATFORM_LABEL[build.platform];
  if (build.status === 'FAILED') {
    return `:x: ${label} build failed — v${build.version} (${build.build_no})`;
  }
  return `:package: New ${label} build v${build.version} (${build.build_no})`;
}

/** Block Kit body for the announcement: headline, facts, changes, buttons. */
function buildBlocks(build: IAppBuild): unknown[] {
  const facts: string[] = [
    `*Version:* ${escapeMrkdwn(build.version)}`,
    `*Branch:* ${escapeMrkdwn(build.branch) || '—'}`,
  ];
  if (build.size_mb != null) facts.push(`*Size:* ${build.size_mb.toFixed(1)} MB`);
  const link = commitUrl(build);
  if (build.commit_sha) {
    const short = build.commit_sha.slice(0, 7);
    const commitText = link ? `<${link}|${short}>` : short;
    facts.push(`*Commit:* ${commitText}`);
  }
  if (build.files_changed != null) {
    facts.push(
      `*Changes:* ${build.files_changed} files (+${build.insertions ?? 0} / -${build.deletions ?? 0})`
    );
  }
  const blocks: unknown[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${headline(build)}*` } },
    { type: 'section', fields: facts.map((text) => ({ type: 'mrkdwn', text })) },
  ];
  if (build.commits.length > 0) {
    // Clipped per subject so 8 lines can never breach Slack's 3000-char
    // section limit (which fails the whole post as invalid_blocks).
    const lines = build.commits.slice(0, 8).map((c) => `• ${escapeMrkdwn(clip(c.subject, 150))}`);
    if (build.commits.length > 8) lines.push(`… and ${build.commits.length - 8} more`);
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } });
  }
  const buttons: unknown[] = [];
  if (build.artifact_url) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Download' },
      style: 'primary',
      url: `${build.artifact_url}?ik-attachment=true`,
    });
  }
  if (build.workflow_run_url) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: 'View run' },
      url: build.workflow_run_url,
    });
  }
  if (buttons.length > 0) blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}

/**
 * Announce an already-SAVED build on the platform's channel. Returns instead
 * of throwing when unconfigured — the build row is already the record, and a
 * missing channel must never turn a reported build into a CI failure.
 */
async function announce(
  build: IAppBuild
): Promise<{ channel?: string | null; ts?: string | null; skipped?: string | null }> {
  const channel = optionalStr(await getRuntimeEnvValue(CHANNEL_ENV_KEY[build.platform]));
  if (!channel) {
    return { skipped: `No Slack channel is configured for ${PLATFORM_LABEL[build.platform]} builds` };
  }
  const result = await postMessage({
    channel,
    text: headline(build).replace(/:[a-z_]+:\s*/g, ''),
    blocks: buildBlocks(build),
  });
  logs.server.info('appBuild', 'announce', {
    channel: result.channel,
    ts: result.ts,
    build_no: build.build_no,
  });
  return { channel: result.channel, ts: result.ts };
}

/** The one default+active SLACK entry, or null. Settings live on its config. */
async function slackEntry() {
  return EnvEntryModel.findOne({ category: 'SLACK', is_active: true, is_default: true });
}

export const appBuildService = {
  /** Save the build first, then announce best-effort and record the outcome. */
  async report(input: any, reportedBy: string) {
    const version = optionalStr(input.version);
    if (!version) throw badInput('version is required');
    const status = input.status === 'FAILED' ? 'FAILED' : 'SUCCESS';
    const artifactUrl = optionalStr(input.artifact_url);
    if (status === 'SUCCESS' && !artifactUrl) {
      throw badInput('artifact_url is required for a SUCCESS build');
    }
    const build = await AppBuildModel.create({
      build_no: await nextBuildNo(),
      platform: input.platform,
      status,
      version,
      build_name: optionalStr(input.build_name),
      artifact_url: artifactUrl,
      artifact_file_id: optionalStr(input.artifact_file_id),
      size_mb: optionalNum(input.size_mb),
      commit_sha: optionalStr(input.commit_sha),
      branch: optionalStr(input.branch),
      commits: (input.commits ?? [])
        .map((c: any) => ({
          hash: optionalStr(c.hash),
          subject: optionalStr(c.subject),
          author: optionalStr(c.author),
        }))
        .filter((c: any) => c.hash && c.subject),
      files_changed: optionalNum(input.files_changed),
      insertions: optionalNum(input.insertions),
      deletions: optionalNum(input.deletions),
      workflow_run_id: optionalStr(input.workflow_run_id),
      workflow_run_url: optionalStr(input.workflow_run_url),
      duration_seconds: optionalNum(input.duration_seconds),
      reported_by: reportedBy,
    });
    try {
      const outcome = await announce(build);
      build.slack_channel = outcome.channel ?? null;
      build.slack_ts = outcome.ts ?? null;
      build.slack_error = outcome.skipped ?? null;
    } catch (err) {
      build.slack_error = err instanceof Error ? err.message : String(err);
      logs.server.error('appBuild', 'announce', { error: err, build_no: build.build_no });
    }
    try {
      // The row (created above) is the record; failing to persist the Slack
      // OUTCOME must not fail the mutation — CI would then re-report this
      // successful build as FAILED.
      await build.save();
    } catch (err) {
      logs.server.error('appBuild', 'saveOutcome', { error: err, build_no: build.build_no });
    }
    return pub(build);
  },

  async table(platform: AppBuildPlatform, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IAppBuild>(
      AppBuildModel,
      { platform },
      input,
      APP_BUILD_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  /**
   * Authorise one artifact upload through the server, which then puts it on
   * ImageKit with the private key.
   *
   * This used to hand CI an ImageKit signature so the artifact could go straight
   * to ImageKit. A signature pairs the private key with the PUBLIC one, and a
   * public key from a different ImageKit account fails every upload with
   * "invalid signature parameter" — naming neither key. Uploading server-side
   * removes the pairing, and with it that entire failure mode.
   */
  async uploadAuth(userId: string) {
    const config = await getImagekitConfig();
    if (!config.privateKey) {
      throw new GraphQLError(
        'ImageKit is not configured. Add it in Tech portal → Environment Variables → ImageKit.',
        { extensions: { code: 'CONFIG_ERROR' } }
      );
    }
    const { serverUrl } = await getUrlConfigs();
    return {
      upload_url: `${serverUrl.replace(/\/$/, '')}/upload`,
      ticket: issueUploadTicket(userId, APP_BUILDS_FOLDER),
      folder: APP_BUILDS_FOLDER,
    };
  },

  async settings() {
    // Whether CI can actually reach us is not knowable from here — the secret
    // lives in GitHub. The last report is the only honest evidence, so the
    // settings page shows that instead of claiming a status it cannot check.
    const latest = await AppBuildModel.findOne({}, { created_at: 1, reported_by: 1 })
      .sort({ created_at: -1 })
      .lean();
    return {
      android_channel: optionalStr(await getRuntimeEnvValue('SLACK_ANDROID_BUILDS_CHANNEL')) || null,
      ios_channel: optionalStr(await getRuntimeEnvValue('SLACK_IOS_BUILDS_CHANNEL')) || null,
      last_reported_at: latest?.created_at?.toISOString() ?? null,
      last_reported_by: optionalStr(latest?.reported_by) || null,
    };
  },

  /**
   * Re-sign the caller's own identity as a credential for the build workflows.
   *
   * Deliberately grants nothing new: the caller already holds a token with these
   * roles, so this is a convenience over hand-crafting one, not an escalation.
   * Nothing is stored — the token is shown once, and a replacement is a click
   * away, so there is no copy of it here to leak.
   */
  async ciToken(user: AuthUser) {
    const token = await signToken({
      id: user.id,
      email: user.email ?? null,
      roles: user.roles,
      assigned_city: user.assigned_city ?? null,
      assigned_zones: user.assigned_zones ?? [],
    });
    // A long-lived copyable credential is worth being able to trace later.
    logs.server.warn('appBuild', 'ciToken', { userId: user.id, email: user.email ?? '' });
    return {
      token,
      secret_name: 'DUNCIT_RELEASE_TOKEN',
      issued_for: user.email ?? user.id,
    };
  },

  /** Writes the channel fields onto the default SLACK env entry (the same
   * place the bot token lives, so the Environment page shows them too). */
  async updateSettings(input: { android_channel?: string | null; ios_channel?: string | null }) {
    const entry = await slackEntry();
    if (!entry) {
      throw badInput(
        'Connect Slack first — add a bot token in Environment Variables → Slack, and mark the entry default.'
      );
    }
    const set: Record<string, string> = {};
    if (input.android_channel !== undefined) {
      set['config.android_builds_channel'] = optionalStr(input.android_channel);
    }
    if (input.ios_channel !== undefined) {
      set['config.ios_builds_channel'] = optionalStr(input.ios_channel);
    }
    if (Object.keys(set).length > 0) {
      await EnvEntryModel.updateOne({ _id: entry._id }, { $set: set });
    }
    return this.settings();
  },
};
