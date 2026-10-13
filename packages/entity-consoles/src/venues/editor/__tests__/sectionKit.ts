import { expect } from 'vitest';
import { within } from '@testing-library/react';
import { blankVenueValues, type VenueFormValues } from '../types';

/** What the venue form's section suites share. Test kit, not shipped code. */

/** The media picker as a section receives it. */
export type PickMedia = (folder?: string) => Promise<string | null>;

/** A new venue's form values, with whatever the case is about laid over them. */
export const venueValues = (over: Partial<VenueFormValues> = {}): VenueFormValues => ({
  ...blankVenueValues,
  ...over,
});

/**
 * The card a section is drawn in — found by the anchor the section strip
 * scrolls to, and checked to carry the section's title.
 */
export function sectionCard(key: string, title: string): HTMLElement {
  const [found] = [...document.querySelectorAll<HTMLElement>(`#venue-editor-${key}`)];
  expect(within(found).getByText(title)).toBeInTheDocument();
  return found;
}
