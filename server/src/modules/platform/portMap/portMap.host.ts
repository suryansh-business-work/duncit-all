/**
 * The only file that touches the host for Tech → Domain → Port Mapping.
 *
 * nginx is a systemd service on the VPS, so `/etc/nginx` is read the way every
 * host read is (`tech/host-read.ts`): READ-ONLY, no network. Each
 * `sites-available` file is printed with whether `sites-enabled` links it.
 */
import { readHostDir } from '../tech/host-read';
import { END_MARK, SITE_MARK } from './portMap.parse';

const NGINX_DIR = '/etc/nginx';

/** Prints, per site file: the marker + enabled flag + name, the file, an end marker. */
const READ_SCRIPT = [
  `cd ${NGINX_DIR}/sites-available || exit 0`,
  'for f in *; do',
  '  [ -f "$f" ] || continue',
  `  if [ -e "${NGINX_DIR}/sites-enabled/$f" ]; then e=1; else e=0; fi`,
  `  echo "${SITE_MARK}$e $f"`,
  '  cat "$f"',
  '  echo',
  `  echo "${END_MARK}"`,
  'done',
].join('\n');

/** The host's nginx `sites-available`, printed. */
export async function readNginxSites(): Promise<{ dump: string; error: string | null }> {
  const { output, error } = await readHostDir(NGINX_DIR, READ_SCRIPT);
  return { dump: output, error };
}
