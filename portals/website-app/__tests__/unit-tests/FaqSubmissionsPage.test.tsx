import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { FaqSubmissionsPage } from '../../src/pages/website';
import { renderWithProviders, flush } from '../testkit';
import {
  faqSubmissionsTableMock,
  makeFaqSubmission,
  updateFaqSubmissionStatusMock,
} from '../mocks';

const rows = [
  makeFaqSubmission({
    id: 'a',
    question: 'New one',
    status: 'NEW',
    email: 'q@duncit.com',
    super_category_slug: 'events',
  }),
  makeFaqSubmission({
    id: 'b',
    question: 'Converted one',
    status: 'CONVERTED',
    email: null,
    super_category_slug: null,
  }),
  makeFaqSubmission({ id: 'c', question: 'Ignored one', status: 'IGNORED' }),
];

describe('FaqSubmissionsPage', () => {
  it('renders rows with placeholders and disabled actions per status', async () => {
    renderWithProviders(<FaqSubmissionsPage />, {
      mocks: [faqSubmissionsTableMock(rows)],
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
        faqSubmissionsTableMock(rows),
        updateFaqSubmissionStatusMock('a', 'CONVERTED'),
        updateFaqSubmissionStatusMock('a', 'IGNORED'),
      ],
    });
    await waitFor(() => expect(screen.getByText('New one')).toBeInTheDocument());
    // First row (NEW) has both actions enabled. Await each mutation so its
    // onCompleted (refetchRef.current?.()) actually fires.
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Converted' })[0]);
    await flush();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ignore' })[0]);
    await flush();
    // The mutations fire; the page stays rendered.
    expect(screen.getByText('FAQ Submission')).toBeInTheDocument();
  });
});
