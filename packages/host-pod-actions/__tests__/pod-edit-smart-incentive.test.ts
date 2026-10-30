/**
 * The Smart Incentive inside the host's Edit Pod sheet: what the pod stores,
 * whether it can carry an offer at all, and when an edit needs re-validating.
 * The percentage rule itself is @duncit/utils' and tested there.
 */
import type { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { mwebHostPodLabels } from '../src/labels';
import {
  podEditSmartIncentive,
  podEditSmartIncentiveInput,
  refinePodEditSmartIncentive,
  type PodEditSmartIncentive,
} from '../src/pod-edit-smart-incentive';
import type { HostPodTarget } from '../src/types';

/** Echoes the key and its vars, so a message names the limit it was built with. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;

const labels = mwebHostPodLabels(t).smartIncentive;

/** Loyalty runs the programme, caps an offer at 20% and shows it after 15 seconds. */
const programme = { enabled: true, maxPct: 20, delaySeconds: 15 };
/** The pod offers 15% today. */
const stored = { smart_incentive_enabled: true, smart_incentive_pct: '15' };
const paid: PodEditSmartIncentive = { free: false, programme, stored };

const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget => ({
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_type: 'PAID',
  pod_amount: 499,
  smart_incentive_enabled: true,
  smart_incentive_pct: 15,
  ...over,
});

/** A RefinementCtx that records what the refine raised. */
const recordingCtx = () => {
  const addIssue = vi.fn();
  return { ctx: { addIssue, value: undefined } as unknown as z.RefinementCtx, addIssue };
};

describe('podEditSmartIncentive', () => {
  it('has no context without a pod', () => {
    expect(podEditSmartIncentive(null, programme)).toBeNull();
  });

  // Without the stored offer the form would start "off" and a save would switch
  // the host's real offer off with it.
  it('has no context when the list that opened the dialog never selected the offer', () => {
    expect(podEditSmartIncentive(pod({ smart_incentive_enabled: undefined }), programme)).toBeNull();
    expect(podEditSmartIncentive(pod({ smart_incentive_enabled: null }), programme)).toBeNull();
  });

  it('carries the stored offer as the host typed it, the programme and whether the pod is free', () => {
    expect(podEditSmartIncentive(pod(), programme)).toEqual({ free: false, programme, stored });
    expect(podEditSmartIncentive(pod({ pod_type: 'FREE', pod_amount: 0 }), programme)?.free).toBe(true);
  });

  it('reads an offer stored switched off as off, with no percentage to show', () => {
    const off = pod({ smart_incentive_enabled: false, smart_incentive_pct: 0 });
    expect(podEditSmartIncentive(off, programme)?.stored).toEqual({
      smart_incentive_enabled: false,
      smart_incentive_pct: '',
    });
  });
});

describe('refinePodEditSmartIncentive', () => {
  const run = (values: typeof stored, incentive: PodEditSmartIncentive = paid) => {
    const { ctx, addIssue } = recordingCtx();
    refinePodEditSmartIncentive(values, ctx, incentive, labels);
    return addIssue;
  };
  const pctIssue = (message: string) => ({ code: 'custom', path: ['smart_incentive_pct'], message });

  it('never checks a free pod, whose offer the input switches off anyway', () => {
    const typed = { smart_incentive_enabled: true, smart_incentive_pct: '' };
    expect(run(typed, { ...paid, free: true })).not.toHaveBeenCalled();
  });

  it('finds nothing wrong with an offer the host switched off', () => {
    expect(run({ smart_incentive_enabled: false, smart_incentive_pct: '95' })).not.toHaveBeenCalled();
  });

  // Loyalty lowering its maximum must not stop a host fixing a typo in their title.
  it('does not re-check an offer left at the percentage the pod stores', () => {
    const lowered = { ...paid, programme: { ...programme, maxPct: 10 } };
    expect(run(stored, lowered)).not.toHaveBeenCalled();
  });

  it('asks for a percentage when the host switches the offer on without one', () => {
    const wasOff = { ...paid, stored: { smart_incentive_enabled: false, smart_incentive_pct: '' } };
    const addIssue = run({ smart_incentive_enabled: true, smart_incentive_pct: '' }, wasOff);

    expect(addIssue).toHaveBeenCalledWith(pctIssue(labels.errors.REQUIRED(20)));
  });

  it('refuses anything but a whole percentage of at least 1', () => {
    expect(run({ smart_incentive_enabled: true, smart_incentive_pct: '0' })).toHaveBeenCalledWith(
      pctIssue(labels.errors.PCT_MIN(20)),
    );
    expect(run({ smart_incentive_enabled: true, smart_incentive_pct: '12.5' })).toHaveBeenCalledWith(
      pctIssue(labels.errors.PCT_MIN(20)),
    );
  });

  it("refuses a changed percentage above Loyalty's maximum, naming that maximum", () => {
    const addIssue = run({ smart_incentive_enabled: true, smart_incentive_pct: '25' });

    expect(addIssue).toHaveBeenCalledTimes(1);
    expect(addIssue).toHaveBeenCalledWith(pctIssue(labels.errors.PCT_MAX(20)));
    expect(labels.errors.PCT_MAX(20)).toContain('"max":20');
  });

  it('accepts a changed percentage up to the maximum itself', () => {
    expect(run({ smart_incentive_enabled: true, smart_incentive_pct: '20' })).not.toHaveBeenCalled();
  });
});

describe('podEditSmartIncentiveInput', () => {
  const offered = { smart_incentive_enabled: true, smart_incentive_pct: '12' };
  const off = { smart_incentive_enabled: false, smart_incentive_pct: '0' };

  // A narrow list that never selected the offer must not switch it off on a title edit.
  it('sends nothing when the dialog had no context for the offer', () => {
    expect(podEditSmartIncentiveInput(offered, null)).toEqual({});
    expect(podEditSmartIncentiveInput(offered, undefined)).toEqual({});
  });

  it('sends the typed percentage as a whole number on a paid pod', () => {
    expect(podEditSmartIncentiveInput(offered, paid)).toEqual({
      smart_incentive_enabled: true,
      smart_incentive_pct: 12,
    });
  });

  it('switches the offer off at 0% on a free pod, and when the host switched it off', () => {
    const switchedOff = { smart_incentive_enabled: false, smart_incentive_pct: 0 };
    expect(podEditSmartIncentiveInput(offered, { ...paid, free: true })).toEqual(switchedOff);
    expect(podEditSmartIncentiveInput(off, paid)).toEqual(switchedOff);
  });
});
