import { startTransition, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * The server renders every public page as a first-time, signed-out visitor
 * with the default look. While the browser hydrates that HTML, its first
 * render has to draw exactly the same thing, or React keeps the server's class
 * names on a tree that was drawn differently. So anything this browser
 * remembers (session, cart token, colour choices, an occasion preview) or
 * reads from the device is applied right after hydration instead of during it.
 *
 * Applied as a transition: the page inside the shell's Suspense boundary
 * hydrates in a later pass than the shell, and an urgent update reaching it
 * before then makes React throw its server HTML away and draw it again. A
 * transition waits for that pass.
 */
let hydrating = false;

/** Called by the client entry just before `hydrateRoot`, and ended once the first commit lands. */
export function beginHydration(): void {
  hydrating = true;
}

export function endHydration(): void {
  hydrating = false;
}

/** On the server, and in the render that hydrates its HTML: start from the server's value. */
export const startsFromServer = (): boolean => typeof window === 'undefined' || hydrating;

/**
 * State that starts as `serverValue` wherever the server's HTML is being
 * matched, and as `read()` everywhere else. When it started from the server,
 * `read()` replaces it right after hydration, so the shopper's own value
 * arrives a moment later rather than never.
 */
export function useBrowserState<T>(read: () => T, serverValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [fromServer] = useState(startsFromServer);
  const [value, setValue] = useState<T>(() => (fromServer ? serverValue : read()));
  const readRef = useRef(read);
  useEffect(() => {
    if (fromServer) startTransition(() => setValue(readRef.current()));
  }, [fromServer]);
  return [value, setValue];
}

const mediaMatches = (query: string): boolean => globalThis.matchMedia?.(query).matches ?? false;

/**
 * A device media query (dark scheme, reduced motion) that is `false` on the
 * server and while hydrating, and follows the device after. MUI's
 * `useMediaQuery` cannot be used for this: its changes are urgent updates.
 */
export function useDeviceMedia(query: string): boolean {
  const [matches, setMatches] = useBrowserState(() => mediaMatches(query), false);
  useEffect(() => {
    const list = globalThis.matchMedia?.(query);
    if (!list) return undefined;
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query, setMatches]);
  return matches;
}
