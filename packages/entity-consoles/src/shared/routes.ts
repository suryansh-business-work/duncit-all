/**
 * Route constants the consoles share.
 *
 * `AUTO_PODS_PATH` lived in the admin portal's `app-config`, which is why the
 * pods pages imported a PORTAL's config — the one seam that made lifting them
 * look like a decoupling rather than a move. It is a route string, so it
 * belongs beside the screens that navigate to it.
 */
export const AUTO_PODS_PATH = '/auto-pods';
