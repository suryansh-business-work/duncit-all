import { LaunchSplash } from './LaunchSplash';
import { SplashBoundary } from './SplashBoundary';

/** The launch video inside its own boundary: if it breaks, the app simply shows. */
export function LaunchSplashGate({ onDone }: Readonly<{ onDone: () => void }>) {
  return (
    <SplashBoundary onFail={onDone}>
      <LaunchSplash onDone={onDone} />
    </SplashBoundary>
  );
}

export { hideNativeSplash, SPLASH_MAX_MS } from './LaunchSplash';
