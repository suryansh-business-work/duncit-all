/**
 * Is the caller still there?
 *
 * A GraphQL request that outruns the client's own timeout does not stop when
 * the client gives up: the app aborts its fetch, the socket closes, and the
 * server carries on resolving fields and holding pooled Mongo connections for
 * a response nobody will read. Under load that is the whole failure — the user
 * retries, the retry queues behind the work their last attempt abandoned, and
 * the queue never drains.
 *
 * `res.on('close')` is the reliable signal for it. (`req.on('close')` is not:
 * for a POST whose body has been fully read, that fires on the normal end of
 * the request stream, so it cannot tell a finished upload from a hang-up.) If
 * the response was not finished when the connection closed, the caller left.
 */
import { GraphQLError } from 'graphql';
import type { Response } from 'express';

/** Wire the listener once per request and hand back a cheap live predicate. */
export function watchClientPresence(res: Response): () => boolean {
  let gone = false;
  res.on('close', () => {
    // writableFinished is true only once the response has been fully flushed.
    // False here means the socket closed under us — the client hung up.
    if (!res.writableFinished) gone = true;
  });
  return () => gone;
}

/**
 * Abandon the request if the caller has already gone.
 *
 * Thrown rather than returned so the whole operation unwinds at the first
 * check instead of every remaining resolver having to opt out. The response
 * goes to a closed socket, so no user ever sees this error; it exists to free
 * the connection and to leave a record that the caller timed out, which is the
 * only place that fact is visible on the server at all.
 */
export function throwIfClientGone(ctx: { isClientGone: () => boolean }): void {
  if (!ctx.isClientGone()) return;
  throw new GraphQLError('The client closed the request before it completed.', {
    extensions: { code: 'CLIENT_CLOSED_REQUEST' },
  });
}
