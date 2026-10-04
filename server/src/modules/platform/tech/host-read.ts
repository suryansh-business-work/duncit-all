/**
 * Reads one directory of the VPS from inside the API container.
 *
 * nginx and certbot run on the host, not in a container, so their directories
 * do not exist in here. A throwaway container on the host's Docker daemon
 * (through the mounted socket — the image ships `docker-cli` for this) mounts
 * the directory READ-ONLY, has no network, runs a fixed script and exits. The
 * script and the mount are constants of the caller — nothing from a request
 * reaches them.
 */
import { execFile } from 'node:child_process';

/** Pulled from ECR like every image the deploy uses (Docker Hub's anonymous pull limit). */
const HOST_IMAGE = 'public.ecr.aws/docker/library/alpine:3';
/** Where the server image's `apk add docker-cli` puts it — absolute, never a PATH lookup. */
const DOCKER_BIN = '/usr/bin/docker';
/** The first read may pull the image. */
const DOCKER_TIMEOUT_MS = 90_000;
const MAX_BUFFER = 4 * 1024 * 1024;

/** Runs `script` against `dir` mounted read-only at the same path; `error` says why it could not. */
export function readHostDir(dir: string, script: string): Promise<{ output: string; error: string | null }> {
  const args = [
    'run', '--rm', '--network', 'none',
    '--mount', `type=bind,src=${dir},dst=${dir},readonly`,
    HOST_IMAGE, 'sh', '-c', script,
  ];
  return new Promise((resolve) => {
    execFile(
      DOCKER_BIN,
      args,
      { timeout: DOCKER_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
      (err, stdout, stderr) => {
        if (!err) {
          resolve({ output: String(stdout), error: null });
          return;
        }
        const missing = (err as NodeJS.ErrnoException).code === 'ENOENT';
        const error = missing ? 'The Docker CLI is not available where this API runs.' : String(stderr || err.message);
        resolve({ output: '', error: error.trim() });
      },
    );
  });
}
