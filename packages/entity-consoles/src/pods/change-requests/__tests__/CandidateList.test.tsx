import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CandidateList from '../CandidateList';
import { makeCandidate } from './fixtures';

describe('CandidateList', () => {
  it('shows two placeholders and no cards while the candidates load', () => {
    const { container } = render(
      <CandidateList rows={[makeCandidate()]} role="VENUE" loading busy={false} onPick={vi.fn()} />,
    );
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);
    expect(screen.queryByText('Dialogues Cafe, Koramangala')).not.toBeInTheDocument();
  });

  it('says nobody matches when the list is empty', () => {
    render(<CandidateList rows={[]} role="HOST" loading={false} busy={false} onPick={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nobody matches this pod’s category and city yet. Onboard a partner, or cancel the pod and refund everyone.',
    );
  });

  it('lists a venue with its detail and contacts, continuing to the slot picker', () => {
    const onPick = vi.fn();
    const row = makeCandidate();
    render(<CandidateList rows={[row]} role="VENUE" loading={false} busy={false} onPick={onPick} />);

    expect(screen.getByText('Dialogues Cafe, Koramangala')).toBeInTheDocument();
    expect(screen.getByText('Cafe · 3.1 km away')).toBeInTheDocument();
    expect(screen.getByText('+91 99000 11122')).toBeInTheDocument();
    expect(screen.getByText('kiran@dialogues.in')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Slot' }));
    expect(onPick).toHaveBeenCalledWith(row);
  });

  it('sends a host request straight away, and drops a blank detail and blank contacts', () => {
    const onPick = vi.fn();
    const row = makeCandidate({ id: 'cand-2', label: 'Meera Iyer', detail: '', phone: '', email: '' });
    const { container } = render(
      <CandidateList rows={[row]} role="HOST" loading={false} busy={false} onPick={onPick} />,
    );

    expect(screen.getByText('Meera Iyer')).toBeInTheDocument();
    expect(container.querySelectorAll('.MuiTypography-caption')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(onPick).toHaveBeenCalledWith(row);
  });

  it('disables every pick while an offer is being sent', () => {
    render(
      <CandidateList
        rows={[makeCandidate(), makeCandidate({ id: 'cand-3', label: 'Toit, Indiranagar' })]}
        role="CLUB_ADMIN"
        loading={false}
        busy
        onPick={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: 'Send request' });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button).toBeDisabled();
  });
});
