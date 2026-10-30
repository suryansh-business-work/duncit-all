/**
 * Create Pod's steps — which show, and how Next / Back and a resumed draft
 * walk past the offer step a pod does not send.
 */
import { describe, expect, it } from 'vitest';

import {
  CREATE_POD_OFFER_STEP,
  CREATE_POD_STEP_COUNT,
  adjacentCreatePodStep,
  createPodSendsOffer,
  createPodStepShown,
  shownCreatePodStep,
  shownCreatePodSteps,
} from '../src/create-pod-steps';

const physical = { pod_mode: 'PHYSICAL', partner_request_id: '', venue_slot_id: '' };
const virtual = { pod_mode: 'VIRTUAL' };

describe('createPodSendsOffer', () => {
  it('is true only for a physical pod with no slot it already holds', () => {
    expect(createPodSendsOffer(physical)).toBe(true);
    expect(createPodSendsOffer(virtual)).toBe(false);
    expect(createPodSendsOffer({ ...physical, partner_request_id: 'req-1' })).toBe(false);
    expect(createPodSendsOffer({ ...physical, venue_slot_id: 'slot-1' })).toBe(false);
  });
});

describe('createPodStepShown / shownCreatePodSteps', () => {
  it('shows all five steps to a physical pod that sends an offer', () => {
    expect(shownCreatePodSteps(physical)).toEqual([0, 1, 2, 3, 4]);
    expect(createPodStepShown(CREATE_POD_OFFER_STEP, physical)).toBe(true);
  });

  it('drops the offer step for a virtual pod, so it walks four', () => {
    expect(shownCreatePodSteps(virtual)).toEqual([0, 1, 2, 4]);
    expect(createPodStepShown(CREATE_POD_OFFER_STEP, virtual)).toBe(false);
    expect(createPodStepShown(2, virtual)).toBe(true);
  });
});

describe('adjacentCreatePodStep', () => {
  it('moves one step at a time when every step shows', () => {
    expect(adjacentCreatePodStep(2, 1, physical)).toBe(3);
    expect(adjacentCreatePodStep(4, -1, physical)).toBe(3);
  });

  it('passes over the offer step both ways for a virtual pod', () => {
    expect(adjacentCreatePodStep(2, 1, virtual)).toBe(4);
    expect(adjacentCreatePodStep(4, -1, virtual)).toBe(2);
  });

  it('stays put at either end', () => {
    expect(adjacentCreatePodStep(0, -1, physical)).toBe(0);
    expect(adjacentCreatePodStep(CREATE_POD_STEP_COUNT - 1, 1, physical)).toBe(CREATE_POD_STEP_COUNT - 1);
  });
});

describe('shownCreatePodStep', () => {
  it('keeps a shown step and moves a hidden one forward', () => {
    expect(shownCreatePodStep(3, physical)).toBe(3);
    expect(shownCreatePodStep(3, virtual)).toBe(4);
  });

  it('clamps a step outside the range, and reads a non-number as the first', () => {
    expect(shownCreatePodStep(9, physical)).toBe(4);
    expect(shownCreatePodStep(-2, physical)).toBe(0);
    expect(shownCreatePodStep(Number.NaN, physical)).toBe(0);
  });
});
