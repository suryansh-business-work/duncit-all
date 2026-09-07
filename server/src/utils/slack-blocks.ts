/**
 * The small, sharp edges of writing Slack Block Kit by hand.
 *
 * Two features announce to Slack from CI now — App Builds and E2E Tests — and
 * these three helpers are the ones that are easy to get subtly wrong and
 * expensive to get wrong twice. They live here rather than beside either
 * caller so the escaping rule has ONE definition.
 */

/**
 * Slack's mrkdwn treats `<…>` as a link and `&` as an entity, so an unescaped
 * commit subject or error message can silently become a broken link — and
 * `<!channel>` inside one PINGS THE WHOLE CHANNEL. Escape anything that came
 * from a human or a compiler.
 */
export const escapeMrkdwn = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * A section block is capped at 3000 characters and Slack rejects the WHOLE
 * post as `invalid_blocks` when one breaches it — so a long message is clipped
 * per line rather than risking the announcement itself.
 */
export const clip = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

/** The small grey line under a message. */
export const contextBlock = (text: string) => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text }],
});
