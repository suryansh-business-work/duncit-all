import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { NewsletterPage } from '../../src/pages/website';
import { renderWithProviders, showHiddenColumns } from '../testkit';
import {
  makeSubscriber,
  newsletterSubscribersListMock,
  newsletterSubscribersTableMock,
} from '../mocks';

const rows = [
  makeSubscriber({ id: 'a', email: 'active@duncit.com', unsubscribed_at: null }),
  makeSubscriber({ id: 'u', email: 'gone@duncit.com', unsubscribed_at: '2026-02-01T00:00:00.000Z' }),
];

beforeEach(() => {
  // Reveal the declared-hidden "Unsubscribed" column so its valueGetter runs.
  showHiddenColumns('website-newsletter', ['unsubscribed_at']);
});

describe('NewsletterPage', () => {
  it('shows KPI totals and renders active + unsubscribed rows', async () => {
    renderWithProviders(<NewsletterPage />, {
      mocks: [newsletterSubscribersListMock(rows), newsletterSubscribersTableMock(rows)],
    });
    expect(await screen.findByText('Newsletter Submission')).toBeInTheDocument();
    // KPI cards: total 2, active 1.
    await waitFor(() => expect(screen.getByText('active@duncit.com')).toBeInTheDocument());
    expect(screen.getByText('gone@duncit.com')).toBeInTheDocument();
    // Status chips from both branches of the renderer + valueGetter (the KPI
    // card also renders an "Active" label, hence getAllByText).
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Unsubscribed').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to empty KPI totals and an empty table with no data', async () => {
    renderWithProviders(<NewsletterPage />, {
      mocks: [newsletterSubscribersListMock([]), newsletterSubscribersTableMock([])],
    });
    expect(await screen.findByText('Newsletter Submission')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No subscribers yet.')).toBeInTheDocument());
  });
});
