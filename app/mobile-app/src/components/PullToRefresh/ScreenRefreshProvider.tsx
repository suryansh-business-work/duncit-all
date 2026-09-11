import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { logs } from '@duncit/logs';

/** A reload the pull gesture runs. Anything it returns is awaited. */
export type RefreshHandler = () => unknown;

type Register = (handler: RefreshHandler) => () => void;

interface ScreenRefreshState {
  /** A screen with nothing to reload gets its pull gesture switched off. */
  hasHandlers: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Split in two on purpose. The registry never changes identity, so a hook
 * registers once for the life of the screen; were it part of the state value,
 * every flip of `refreshing` would unregister and re-register every query on
 * the screen, mid-refresh.
 */
const RegisterContext = createContext<Register | null>(null);
const StateContext = createContext<ScreenRefreshState | null>(null);

/** A refresh that finishes in 80ms reads as "nothing happened" — hold the
 * spinner long enough for the gesture to be acknowledged. */
const MIN_SPINNER_MS = 400;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Owns one screen's pull-to-refresh. Mounted around EVERY route by the
 * navigators' `screenLayout`, so a screen never has to opt in.
 *
 * Data hooks register their own reload through {@link useRefreshRegistration},
 * which is why a pull reloads what the screen actually shows — including
 * queries that live several components deep — with no prop drilling and no
 * remount, so local state, scroll position and half-typed forms all survive it.
 * Handlers are scoped per screen, so pulling on one screen never refetches the
 * ones parked behind it in the stack.
 */
export function ScreenRefreshProvider({ children }: Readonly<{ children: ReactNode }>) {
  const handlers = useRef(new Set<RefreshHandler>());
  const [hasHandlers, setHasHandlers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const register = useCallback<Register>((handler) => {
    handlers.current.add(handler);
    setHasHandlers(true);
    return () => {
      handlers.current.delete(handler);
      setHasHandlers(handlers.current.size > 0);
    };
  }, []);

  const refresh = useCallback(() => {
    // Only reachable on iOS, which cannot switch the control off: leaving
    // `refreshing` false makes the native spinner end at once, rather than
    // holding it for a reload that does not exist.
    if (handlers.current.size === 0) return;
    setRefreshing(true);
    const reloads = [...handlers.current].map(async (handler) => handler());
    // allSettled, not all: one failing query must not cancel the rest, and the
    // spinner has to end either way.
    Promise.allSettled([...reloads, wait(MIN_SPINNER_MS)])
      .then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            logs.mobileApp.error('pull-to-refresh', 'ScreenRefreshProvider', {
              error: result.reason,
            });
          }
        }
      })
      .finally(() => setRefreshing(false));
  }, []);

  const state = useMemo(
    () => ({ hasHandlers, refreshing, refresh }),
    [hasHandlers, refreshing, refresh],
  );

  return (
    <RegisterContext.Provider value={register}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </RegisterContext.Provider>
  );
}

/** This screen's refresh state, or null outside a screen (a floating dialog, a test). */
export function useScreenRefresh(): ScreenRefreshState | null {
  return useContext(StateContext);
}

/**
 * Hand a data hook's reload to the screen's pull gesture.
 *
 * Call it from the HOOK, not the screen: the hook is the one place that knows
 * how to reload its own query, so every screen using it — today's and
 * tomorrow's — gets pull-to-refresh with no wiring of its own. Registration is
 * a no-op wherever no screen provider is above (a dialog rendered at the app
 * root, a unit test), and `load` may be a fresh closure every render — only the
 * latest one is ever called.
 */
export function useRefreshRegistration(load: RefreshHandler): void {
  const register = useContext(RegisterContext);
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });
  const stable = useCallback(() => latest.current(), []);
  useEffect(() => register?.(stable), [register, stable]);
}
