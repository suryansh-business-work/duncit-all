import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

import PrivacyNotice from '../../src/pages/external-links-page/privacy/PrivacyNotice';

describe('PrivacyNotice', () => {
  it('heads the notice with what a click records', () => {
    renderWithProviders(<PrivacyNotice />);
    expect(screen.getByText('What a click records')).toBeInTheDocument();
    expect(screen.getByText(/records exactly this and nothing else/)).toBeInTheDocument();
  });

  // Whoever answers a data request has to be able to stand behind this list:
  // each collected field is paired with the reason it is kept, in order.
  it('lists every collected field next to why it is kept', () => {
    const { container } = renderWithProviders(<PrivacyNotice />);
    const list = container.querySelector('dl') as HTMLElement;
    const terms = within(list).getAllByRole('term').map((term) => term.textContent);
    const reasons = within(list).getAllByRole('definition').map((reason) => reason.textContent);

    expect(terms).toEqual([
      'The time of the click',
      'Where the click came from — the referring site, or the in-app browser',
      'Device type, operating system and browser, from the user agent',
      'Country, region and city, looked up from the address offline',
      'A salted SHA-256 of the address — never the address itself',
    ]);
    expect(reasons).toHaveLength(5);
    expect(reasons[0]).toBe('What the clicks-over-time chart is drawn from.');
    expect(reasons[3]).toMatch(/address never leaves this server/);
    expect(reasons[4]).toMatch(/useless for naming them/);
  });

  it('states the legal basis under the list', () => {
    renderWithProviders(<PrivacyNotice />);
    expect(screen.getByText(/GDPR Art\. 6\(1\)\(f\)/)).toBeInTheDocument();
    expect(screen.getByText(/no cookie is written by the redirect/)).toBeInTheDocument();
  });
});
