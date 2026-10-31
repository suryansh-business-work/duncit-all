/**
 * Create Pod's steps — which pods send an offer, and which step a stored draft
 * reopens on, whether the four-step stepper or the old five-step one saved it.
 */
import { describe, expect, it } from 'vitest';

import {
  CREATE_POD_STEPPER_VERSION,
  CREATE_POD_STEP_COUNT,
  clampCreatePodStep,
  createPodSendsOffer,
  resumeCreatePodStep,
} from '../src/create-pod-steps';

const physical = { pod_mode: 'PHYSICAL', partner_request_id: '', venue_slot_id: '' };
const virtual = { pod_mode: 'VIRTUAL' };
const current = JSON.stringify({ pod_title: 'Jam', stepper: CREATE_POD_STEPPER_VERSION });
const fiveStep = JSON.stringify({ pod_title: 'Jam' });

describe('createPodSendsOffer', () => {
  it('is true only for a physical pod with no slot it already holds', () => {
    expect(createPodSendsOffer(physical)).toBe(true);
    expect(createPodSendsOffer(virtual)).toBe(false);
    expect(createPodSendsOffer({ ...physical, partner_request_id: 'req-1' })).toBe(false);
    expect(createPodSendsOffer({ ...physical, venue_slot_id: 'slot-1' })).toBe(false);
  });
});

describe('clampCreatePodStep', () => {
  it('keeps a step that exists', () => {
    expect(clampCreatePodStep(2)).toBe(2);
  });

  it('holds a step outside the range to the nearest end, and reads a non-number as the first', () => {
    expect(clampCreatePodStep(9)).toBe(CREATE_POD_STEP_COUNT - 1);
    expect(clampCreatePodStep(-2)).toBe(0);
    expect(clampCreatePodStep(Number.NaN)).toBe(0);
    expect(clampCreatePodStep(null)).toBe(0);
  });
});

describe('resumeCreatePodStep', () => {
  it('reopens a draft this stepper saved on its own step', () => {
    expect(resumeCreatePodStep(0, current)).toBe(0);
    expect(resumeCreatePodStep(3, current)).toBe(3);
  });

  it('clamps a step this stepper could not have saved', () => {
    expect(resumeCreatePodStep(7, current)).toBe(CREATE_POD_STEP_COUNT - 1);
  });

  it('moves a five-step draft onto the step that now holds its screen', () => {
    // Location & Club → What, Basics → Details, Venue & Slot → Where & when,
    // Offer for Venue and Pricing → Money.
    expect([0, 1, 2, 3, 4].map((step) => resumeCreatePodStep(step, fiveStep))).toEqual([0, 3, 1, 2, 2]);
  });

  it('reads a payload that is not JSON, or names another stepper, as a five-step draft', () => {
    expect(resumeCreatePodStep(1, 'not json')).toBe(3);
    expect(resumeCreatePodStep(1, JSON.stringify({ stepper: 99 }))).toBe(3);
    expect(resumeCreatePodStep(null, undefined)).toBe(0);
    expect(resumeCreatePodStep(12, fiveStep)).toBe(2);
  });
});
