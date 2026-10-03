/**
 * The only file that touches the host for Tech → SSL.
 *
 * certbot runs on the VPS, not in a container, so `/etc/letsencrypt` does not
 * exist inside the API container. It is read the way the Server terminal's
 * host reads are: a throwaway container on the host's Docker daemon (through
 * the mounted socket — the image ships `docker-cli` for this) that mounts the
 * directory READ-ONLY, has no network, and prints each lineage's public
 * `cert.pem` and renewal conf. Private keys are never printed. The command is
 * a fixed argument array — nothing from a request reaches it.
 */
import { execFile } from 'node:child_process';
import { CERT_MARK, CONF_MARK, END_MARK } from './ssl.parse';

/** Pulled from ECR like every image the deploy uses (Docker Hub's anonymous pull limit). */
const HOST_IMAGE = 'public.ecr.aws/docker/library/alpine:3';
/** Where the server image's `apk add docker-cli` puts it — absolute, never a PATH lookup. */
const DOCKER_BIN = '/usr/bin/docker';
const LETSENCRYPT_DIR = '/etc/letsencrypt';
/** The first read may pull the image. */
const DOCKER_TIMEOUT_MS = 90_000;
const MAX_BUFFER = 4 * 1024 * 1024;

/** Prints, per lineage: the marker + name, its cert.pem, its renewal conf, an end marker. */
const READ_SCRIPT = [
  `cd ${LETSENCRYPT_DIR}/live || exit 0`,
  'for d in */; do',
  '  n=${d%/}',
  '  [ -f "$n/cert.pem" ] || continue',
  `  echo "${CERT_MARK}$n"`,
  '  cat "$n/cert.pem"',
  `  echo "${CONF_MARK}"`,
  `  cat "${LETSENCRYPT_DIR}/renewal/$n.conf" 2>/dev/null`,
  `  echo "${END_MARK}"`,
  'done',
].join('\n');

const READ_ARGS = [
  'run', '--rm', '--network', 'none',
  '--mount', `type=bind,src=${LETSENCRYPT_DIR},dst=${LETSENCRYPT_DIR},readonly`,
  HOST_IMAGE, 'sh', '-c', READ_SCRIPT,
];

/** The host's certbot directory, printed (public material only). */
export function readCertbotDump(): Promise<{ dump: string; error: string | null }> {
  return new Promise((resolve) => {
    execFile(
      DOCKER_BIN,
      READ_ARGS,
      { timeout: DOCKER_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
      (err, stdout, stderr) => {
        if (!err) {
          resolve({ dump: String(stdout), error: null });
          return;
        }
        const missing = (err as NodeJS.ErrnoException).code === 'ENOENT';
        const error = missing ? 'The Docker CLI is not available where this API runs.' : String(stderr || err.message);
        resolve({ dump: '', error: error.trim() });
      },
    );
  });
}
