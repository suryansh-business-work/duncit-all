import type { LevelFns } from './types';

/**
 * Run a promise we deliberately do not await, logging a rejection instead of
 * dropping it.
 *
 * Replaces the `void promise()` idiom (Sonar S3735): `void` silently discards a
 * rejection, so a failed save or refresh disappears with no trace. The logger,
 * page and component are the caller's, so the Bugs view files the failure
 * against the screen that started it.
 *
 *   onConfirm={() => fireAndForget(save(), logs.mWeb, 'ProfileAvatar', 'save')}
 */
export function fireAndForget(promise: Promise<unknown>, logger: LevelFns, page: string, component: string): void {
  promise.catch((error: unknown) => {
    logger.error(page, component, { error });
  });
}
