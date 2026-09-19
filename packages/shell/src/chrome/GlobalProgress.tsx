import { RequestProgressBar } from '@duncit/ui';

/**
 * The console-wide loading bar, mounted once by `mountPortal`.
 *
 * It is `@duncit/ui`'s `RequestProgressBar` under the shell's older name: the
 * bar and the transport counter it reads moved there so a surface without the
 * shell chrome (the pet store) draws the very same bar over the same counter.
 */
export function GlobalProgress() {
  return <RequestProgressBar />;
}
