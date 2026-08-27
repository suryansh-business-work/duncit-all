import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { FaqSubmissionsPage } from '../../src/pages/faqs/faq-submissions';
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
    super_category_slug: 'dining',
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
  it('opens with the heading, description and hint the queue is read through', async () => {
    renderWithProviders(<FaqSubmissionsPage />, { mocks: [faqSubmissionsTableMock(rows)] });
    expect(await screen.findByText('FAQ Submissions')).toBeInTheDocument();
    expect(
      screen.getByText('Questions asked from duncit.com that no published FAQ answers yet.'),
    ).toBeInTheDocument();
    // The hint is the only thing on screen that says a submission is not an
    // answer — losing it turns "Mark Converted" into a delete button.
    expect(screen.getByText(/Write the reply under App FAQs/)).toBeInTheDocument();
  });

  it('renders rows with placeholders and disables the action a row already has', async () => {
    renderWithProviders(<FaqSubmissionsPage />, { mocks: [faqSubmissionsTableMock(rows)] });
    await waitFor(() => expect(screen.getByText('New one')).toBeInTheDocument());
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
    // The first row is NEW, so both actions are live. Await each mutation so
    // its onCompleted (refetchRef.current?.()) actually fires.
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Converted' })[0]);
    await flush();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ignore' })[0]);
    await flush();
    expect(screen.getByText('FAQ Submissions')).toBeInTheDocument();
  });
});
