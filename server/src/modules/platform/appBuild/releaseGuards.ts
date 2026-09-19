import fs from 'node:fs';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { artifactPath } from '@modules/platform/upload/buildArtifactStore';
import { escapeMrkdwn } from '@utils/slack-blocks';
import { AppBuildModel, type AppBuildArtifactKind, type AppBuildPlatform, type IAppBuild } from './appBuild.model';

/**
 * What every store push checks before asking a store anything, and how it
 * tells Slack afterwards. Shared by the Play and App Store release services so
 * the two never disagree on what "releasable" means.
 */

export const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const PLATFORM_NAME: Record<AppBuildPlatform, string> = { ANDROID: 'Android', IOS: 'iOS' };

/** The stored artifact's path on disk, or the reason there is none. */
export async function storedArtifactPath(
  build: IAppBuild,
  kind: AppBuildArtifactKind,
  store: string
): Promise<string> {
  const artifact = (build.artifacts ?? []).find((a) => a.kind === kind && a.file_id);
  if (!artifact) throw badInput(`Only a build with a stored ${kind} can go to ${store} — this one has none.`);
  const file = artifactPath(artifact.file_id);
  if (!file) throw badInput(`This build’s ${kind} has an unusable file name and cannot be read back.`);
  await fs.promises.access(file).catch(() => {
    throw badInput(`This build’s ${kind} is no longer in the build store.`);
  });
  return file;
}

/** A finished, successful production build of the right platform — or the reason it is not. */
export async function releasableBuild(id: string, platform: AppBuildPlatform, store: string): Promise<IAppBuild> {
  const build = await AppBuildModel.findById(id);
  if (!build) throw badInput('That build no longer exists');
  if (build.platform !== platform) throw badInput(`Only ${PLATFORM_NAME[platform]} builds can go to ${store}.`);
  if (build.status !== 'SUCCESS') throw badInput(`Only a finished, successful build can go to ${store}.`);
  // Compiled in, not configurable: a staging-pointed app on a store would talk
  // to the staging database from every phone that installed it.
  if (build.app_env !== 'PRODUCTION') {
    throw badInput(`Only a production build can go to ${store} — this one talks to staging.`);
  }
  return build;
}

/** Best-effort line on the platform's builds channel. The row already holds the outcome; Slack only repeats it. */
export async function announceRelease(channelKey: string, text: string, buildNo: string): Promise<void> {
  const channel = (await getRuntimeEnvValue(channelKey)).trim();
  if (!channel) return;
  try {
    await postMessage({ channel, text: escapeMrkdwn(text) });
  } catch (err) {
    logs.server.error('appBuild', 'releaseAnnounce', { error: err, build_no: buildNo });
  }
}
