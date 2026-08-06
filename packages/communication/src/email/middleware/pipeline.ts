import type { EmailContext, EmailMiddleware } from '../interfaces/hooks';
import type { EmailSendResult, PreparedEmail } from '../interfaces/provider';

/**
 * The middleware chain.
 *
 * Middlewares run in the order they were registered, each wrapping the rest, so
 * the first one registered is the outermost and sees the final result. Any of
 * them can rewrite the message, stop the send by returning a result without
 * calling `next`, or fail it by throwing.
 */

/**
 * Fold the chain into one function ending at `send`.
 *
 * Each middleware may call `next` at most once. Calling it twice would send the
 * email twice, which is exactly the failure a chain like this makes easy to
 * write by accident, so it is caught here rather than in someone's inbox.
 */
export function composeMiddleware(
  middlewares: readonly EmailMiddleware[],
  send: (email: PreparedEmail) => Promise<EmailSendResult>,
): (email: PreparedEmail, context: EmailContext) => Promise<EmailSendResult> {
  return (email, context) => {
    const run = (index: number, current: PreparedEmail): Promise<EmailSendResult> => {
      const middleware = middlewares[index];
      if (!middleware) return send(current);
      let called = false;
      return middleware(current, context, (next) => {
        if (called) {
          return Promise.reject(
            new Error('An email middleware called next() twice — that would send the email twice'),
          );
        }
        called = true;
        return run(index + 1, next);
      });
    };
    return run(0, email);
  };
}
