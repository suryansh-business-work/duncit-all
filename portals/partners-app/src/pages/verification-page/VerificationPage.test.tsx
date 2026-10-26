import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import VerificationPage from './VerificationPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

/**
 * The three cards are @duncit/verification's. They are stubbed to list what they
 * were given and to report a change or a failure the way a card does.
 */
vi.mock('@duncit/verification/mui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  VerificationCards: ({
    items,
    onChanged,
    onError,
  }: {
    items: { type: string; status: string }[];
    onChanged: () => void;
    onError: (message: string) => void;
  }) => (
    <section data-testid="cards">
      <output data-testid="items">{items.map((item) => `${item.type}:${item.status}`).join(',')}</output>
      <button type="button" onClick={onChanged}>
        card changed
      </button>
      <button type="button" onClick={() => onError('Document is too large')}>
        card failed
      </button>
    </section>
  ),
}));

afterEach(cleanup);

const verification = (type: string, status: string) => ({
  __typename: 'Verification',
  type,
  status,
  document_url: null,
  reject_reason: null,
  address: null,
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<VerificationPage />, { link: scriptedLink(answers, sent) });

describe('VerificationPage', () => {
  it('shows a spinner until the verifications arrive', () => {
    mount({ MyVerifications: STAY_PENDING });
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('cards')).toBeNull();
  });

  it('shows the server message when the verifications cannot be read', async () => {
    mount({ MyVerifications: new Error('Verification is down') });
    expect(await screen.findByText('Verification is down')).toBeTruthy();
    expect(screen.queryByTestId('cards')).toBeNull();
  });

  it('hands the three cards the partner’s verifications', async () => {
    mount({
      MyVerifications: {
        myVerifications: [verification('IDENTITY', 'PENDING'), verification('ADDRESS', 'APPROVED'), verification('EMAIL', 'APPROVED')],
      },
    });
    expect(await screen.findByRole('heading', { name: 'Verification' })).toBeTruthy();
    expect(screen.getByTestId('items').textContent).toBe('IDENTITY:PENDING,ADDRESS:APPROVED,EMAIL:APPROVED');
  });

  it('hands the cards an empty list when the partner has none yet', async () => {
    mount({ MyVerifications: { myVerifications: null } });
    expect((await screen.findByTestId('items')).textContent).toBe('');
  });

  it('says the submission went in when a card changes, reads the verifications again, and lets the note be dismissed', async () => {
    const sent: SentOperation[] = [];
    mount({ MyVerifications: { myVerifications: [] } }, sent);
    fireEvent.click(await screen.findByRole('button', { name: 'card changed' }));
    const note = await screen.findByText('Submitted for review.');
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyVerifications').length).toBeGreaterThan(1));
    fireEvent.click(note.closest('[role="alert"]')?.querySelector('button') as HTMLElement);
    await waitFor(() => expect(screen.queryByText('Submitted for review.')).toBeNull());
  });

  it('shows a card’s failure message', async () => {
    mount({ MyVerifications: { myVerifications: [] } });
    fireEvent.click(await screen.findByRole('button', { name: 'card failed' }));
    expect(await screen.findByText('Document is too large')).toBeTruthy();
  });
});
