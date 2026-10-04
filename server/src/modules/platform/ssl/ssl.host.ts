/**
 * The only file that touches the host for Tech → SSL.
 *
 * certbot runs on the VPS, not in a container, so `/etc/letsencrypt` is read
 * the way every host read is (`tech/host-read.ts`): READ-ONLY, no network,
 * printing each lineage's public `cert.pem` and renewal conf. Private keys are
 * never printed.
 */
import { readHostDir } from '../tech/host-read';
import { CERT_MARK, CONF_MARK, END_MARK } from './ssl.parse';

const LETSENCRYPT_DIR = '/etc/letsencrypt';

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

/** The host's certbot directory, printed (public material only). */
export async function readCertbotDump(): Promise<{ dump: string; error: string | null }> {
  const { output, error } = await readHostDir(LETSENCRYPT_DIR, READ_SCRIPT);
  return { dump: output, error };
}
