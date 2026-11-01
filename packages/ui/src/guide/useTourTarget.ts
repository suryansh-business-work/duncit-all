import { useEffect, useState, type ReactNode } from 'react';

export interface PortalTourStep {
  /** The page tags the element this step points at with `data-tour="<anchor>"`. */
  anchor: string;
  title: ReactNode;
  body: ReactNode;
}

/** A step whose element was on the page when the tour opened. */
export interface ResolvedTourStep {
  step: PortalTourStep;
  element: HTMLElement;
  /** Its index in the steps the caller passed. */
  index: number;
}

/** Where the target sits in the viewport. */
export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The element a step points at, or null when nothing on the page carries its anchor. */
export function findTourTarget(anchor: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
}

/**
 * The steps whose element is on the page right now, from `startAt` on.
 *
 * Resolved once, as the tour opens: a step whose element is missing is left
 * out rather than shown pointing at nothing, and the counter then counts what
 * will actually be shown.
 */
export function resolveTourSteps(steps: readonly PortalTourStep[], startAt: number): ResolvedTourStep[] {
  const resolved: ResolvedTourStep[] = [];
  steps.forEach((step, index) => {
    if (index < startAt) return;
    const element = findTourTarget(step.anchor);
    if (element) resolved.push({ step, element, index });
  });
  return resolved;
}

function rectOf(element: HTMLElement): TourRect {
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

/**
 * The target's viewport box, kept current through resize and scroll. The
 * element is scrolled into view first, so the spotlight is never drawn around
 * something off screen. Both listeners go with the step.
 */
export function useTourTarget(element: HTMLElement): TourRect {
  const [rect, setRect] = useState(() => rectOf(element));
  useEffect(() => {
    // jsdom has no scrollIntoView; a browser always does.
    if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'center' });
    const measure = () => setRect(rectOf(element));
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [element]);
  return rect;
}
