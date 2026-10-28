import { useSyncExternalStore } from 'react';

const noSubscribe = () => () => undefined;
const browserCan = () => typeof IntersectionObserver !== 'undefined';
/** The server render assumes a modern browser, so the first client render matches it. */
const serverCan = () => true;

/**
 * Whether scroll-into-view animations can run here. Framer's whileInView makes
 * an IntersectionObserver on mount without checking for one, so where there is
 * none (an old browser, the test DOM) a reveal renders plainly instead of crashing.
 */
export function useCanObserve(): boolean {
  return useSyncExternalStore(noSubscribe, browserCan, serverCan);
}
