/**
 * Test double for rn-tourguide.
 *
 * The real overlay only draws once the host has measured a real layout and then
 * morphs an SVG mask through `setNativeProps` — jest measures nothing and has no
 * native shadow tree, so the genuine article renders an empty scrim and proves
 * nothing. This stands in for it with the same contract: zones register
 * themselves by number, `canStart` flips once one has, `start` opens on the
 * lowest zone, Next/Previous walk the list and stopping emits `stop`.
 *
 * That is enough to exercise everything this app owns — the runner's
 * resolve/freeze/start sequence, an anchor's zone numbering, and the themed
 * tooltip's controls — without pretending to test the library itself.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { IStep, Labels, TooltipProps } from 'rn-tourguide';

type Handler = (event?: unknown) => void;

interface Emitter {
  on: (type: string, handler: Handler) => void;
  off: (type: string, handler: Handler) => void;
  emit: (type: string, event?: unknown) => void;
}

function createEmitter(): Emitter {
  const handlers: Record<string, Handler[]> = {};
  return {
    on: (type, handler) => {
      handlers[type] = [...(handlers[type] ?? []), handler];
    },
    off: (type, handler) => {
      handlers[type] = (handlers[type] ?? []).filter((h) => h !== handler);
    },
    emit: (type, event) => (handlers[type] ?? []).forEach((h) => h(event)),
  };
}

interface Ctx {
  registerStep: (key: string, step: IStep) => void;
  unregisterStep: (key: string, name: string) => void;
  start: (key: string) => void;
  stop: (key: string) => void;
  canStart: Record<string, boolean>;
  eventEmitter: Record<string, Emitter>;
  getCurrentStep: (key: string) => IStep | undefined;
}

const noop = () => undefined;

const TourCtx = createContext<Ctx>({
  registerStep: noop,
  unregisterStep: noop,
  start: noop,
  stop: noop,
  canStart: {},
  eventEmitter: {},
  getCurrentStep: () => undefined,
});

type StepMap = Record<string, Record<string, IStep>>;

const ordered = (steps: StepMap, key: string): IStep[] =>
  Object.values(steps[key] ?? {}).toSorted((a, b) => a.order - b.order);

export interface TourGuideProviderProps {
  children: ReactNode;
  tooltipComponent?: ComponentType<TooltipProps>;
  tooltipStyle?: StyleProp<ViewStyle>;
  labels?: Labels;
  backdropColor?: string;
  borderRadius?: number;
  maskOffset?: number;
  animationDuration?: number;
  androidStatusBarVisible?: boolean;
  preventOutsideInteraction?: boolean;
}

export function TourGuideProvider({
  children,
  tooltipComponent: Tooltip,
  tooltipStyle,
  labels,
  backdropColor,
}: Readonly<TourGuideProviderProps>) {
  const [steps, setSteps] = useState<StepMap>({});
  const [tourKey, setTourKey] = useState('_default');
  const [current, setCurrent] = useState<IStep | undefined>(undefined);
  const emitters = useRef<Record<string, Emitter>>({});

  const emitterFor = useCallback((key: string) => {
    emitters.current[key] ??= createEmitter();
    return emitters.current[key];
  }, []);

  const registerStep = useCallback(
    (key: string, step: IStep) => {
      emitterFor(key);
      setSteps((prev) => ({ ...prev, [key]: { ...prev[key], [step.name]: step } }));
    },
    [emitterFor],
  );

  const unregisterStep = useCallback((key: string, name: string) => {
    setSteps((prev) => {
      const { [name]: _removed, ...rest } = prev[key] ?? {};
      return { ...prev, [key]: rest };
    });
  }, []);

  const stop = useCallback(
    (key: string) => {
      setCurrent(undefined);
      emitterFor(key).emit('stop');
    },
    [emitterFor],
  );

  const start = useCallback(
    (key: string) => {
      const first = ordered(steps, key)[0];
      if (!first) return;
      setTourKey(key);
      setCurrent(first);
      emitterFor(key).emit('start');
    },
    [steps, emitterFor],
  );

  const canStart = useMemo(
    () =>
      Object.fromEntries(Object.keys(steps).map((key) => [key, ordered(steps, key).length > 0])),
    [steps],
  );

  const value = useMemo<Ctx>(
    () => ({
      registerStep,
      unregisterStep,
      start,
      stop,
      canStart,
      eventEmitter: emitters.current,
      getCurrentStep: () => current,
    }),
    [registerStep, unregisterStep, start, stop, canStart, current],
  );

  const list = ordered(steps, tourKey);
  const index = current ? list.findIndex((s) => s.name === current.name) : -1;
  const step = (offset: number) => list[index + offset];

  const go = (offset: number) => {
    const next = step(offset);
    if (next) setCurrent(next);
  };

  return (
    <TourCtx.Provider value={value}>
      {children}
      {current ? (
        <View testID="tour-overlay">
          <View testID="tour-backdrop" style={{ backgroundColor: backdropColor }} />
          <View testID="tour-tooltip-shell" style={tooltipStyle}>
            {Tooltip ? (
              <Tooltip
                currentStep={current}
                isFirstStep={index === 0}
                isLastStep={index === list.length - 1}
                handleNext={() => go(1)}
                handlePrev={() => go(-1)}
                handleStop={() => stop(tourKey)}
                labels={labels}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </TourCtx.Provider>
  );
}

export interface TourGuideZoneProps {
  zone: number;
  tourKey?: string;
  text?: string;
  style?: StyleProp<ViewStyle>;
  tooltipBottomOffset?: number;
  children?: ReactNode;
}

export function TourGuideZone({
  zone,
  tourKey = '_default',
  text = '',
  style,
  children,
}: Readonly<TourGuideZoneProps>) {
  const { registerStep, unregisterStep } = useContext(TourCtx);
  const name = String(zone);

  useEffect(() => {
    registerStep(tourKey, { name, order: zone, text, target: null, wrapper: null });
    return () => unregisterStep(tourKey, name);
  }, [tourKey, name, zone, text, registerStep, unregisterStep]);

  return (
    <View testID={`tour-zone-${tourKey}-${zone}`} style={style}>
      {children}
    </View>
  );
}

export function useTourGuideController(tourKey?: string) {
  const ctx = useContext(TourCtx);
  const key = tourKey ?? '_default';
  return {
    tourKey: key,
    start: () => ctx.start(key),
    stop: () => ctx.stop(key),
    canStart: ctx.canStart[key],
    eventEmitter: ctx.eventEmitter[key],
    getCurrentStep: () => ctx.getCurrentStep(key),
  };
}
