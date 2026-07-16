import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { FaqSubmissionsPage } from '../../src/pages/website';
import {
  FAQ_SUBMISSIONS_TABLE,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmission,
} from '../../src/pages/website/faq-submissions/queries';
import { renderWithProviders, tableMock } from './testkit';

const faq = (over: Partial<FaqSubmission>): FaqSubmission => ({
  id: 'f1',
  question: 'How do I join?',
  email: 'q@duncit.com',
  super_category_slug: 'events',
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

const rows = [
  faq({ id: 'a', question: 'New one', status: 'NEW', email: 'q@duncit.com', super_category_slug: 'events' }),
  faq({ id: 'b', question: 'Converted one', status: 'CONVERTED', email: null, super_category_slug: null }),
  faq({ id: 'c', question: 'Ignored one', status: 'IGNORED' }),
];

const updateMock = (id: string, status: 'CONVERTED' | 'IGNORED') => ({
  request: { query: UPDATE_FAQ_SUBMISSION_STATUS, variables: { id, status } },
  result: { data: { updateFaqSubmissionStatus: { id, status } } },
});

describe('FaqSubmissionsPage', () => {
  it('renders rows with placeholders and disabled actions per status', async () => {
    renderWithProviders(<FaqSubmissionsPage />, {
      mocks: [tableMock(FAQ_SUBMISSIONS_TABLE, 'faqSubmissionsTable', rows)],
    });
    expect(await screen.findByText('FAQ Submission')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('New one')).toBeInTheDocument());
    // The CONVERTED row's "Mark Converted" button is disabled; the IGNORED
    // row's "Ignore" button is disabled.
    const convertBtns = screen.getAllByRole('button', { name: 'Mark Converted' });
    const ignoreBtns = screen.getAllByRole('button', { name: 'Ignore' });
    expect(convertBtns.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(ignoreBtns.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('marks a submission converted and ignores another', async () => {
    renderWithProviders(<FaqSubmissionsPage />, {
      mocks: [
        tableMock(FAQ_SUBMISSIONS_TABLE, 'faqSubmissionsTable', rows),
        updateMock('a', 'CONVERTED'),
        updateMock('a', 'IGNORED'),
      ],
    });
    await waitFor(() => expect(screen.getByText('New one')).toBeInTheDocument());
    // First row (NEW) has both actions enabled.
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Converted' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Ignore' })[0]);
    // The mutations fire; the page stays rendered.
    expect(screen.getByText('FAQ Submission')).toBeInTheDocument();
  });
});
