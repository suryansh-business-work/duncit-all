import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ClubHiddenBanner,
  HiddenChip,
  PodHiddenBanner,
  PodHiddenChip,
  VisibilityButton,
  VisibilityIconButton,
  podVisibilityValue,
} from '../VisibilityViews';

describe('VisibilityButton', () => {
  it('offers Hide for a visible record and fires the click', async () => {
    const onClick = vi.fn();
    render(<VisibilityButton hidden={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('offers Show for a hidden record', () => {
    render(<VisibilityButton hidden onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
  });
});

describe('VisibilityIconButton', () => {
  it('is labelled by what pressing it will do', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<VisibilityIconButton hidden={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<VisibilityIconButton hidden onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
  });
});

describe('HiddenChip', () => {
  it('renders nothing for a visible record', () => {
    const { container } = render(<HiddenChip hidden={false} reason="spam" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Hidden with the reason on hover, and tolerates a missing reason', () => {
    const { rerender } = render(<HiddenChip hidden reason="spam" />);
    expect(screen.getByText('Hidden').closest('[aria-label]')).toHaveAttribute('aria-label', 'spam');
    rerender(<HiddenChip hidden />);
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });
});

describe('PodHiddenChip', () => {
  it('renders nothing for a pod that is visible', () => {
    const { container } = render(<PodHiddenChip pod={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows plain Hidden for a pod hidden on its own, ahead of its club', () => {
    render(<PodHiddenChip pod={{ is_hidden: true, hidden_by_club: true, hidden_reason: 'Dup' }} />);
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Hidden with club')).not.toBeInTheDocument();
  });

  it('says Hidden with club when only its club is hidden, with the club reason on hover', () => {
    render(<PodHiddenChip pod={{ hidden_by_club: true, club_hidden_reason: 'Club paused' }} />);
    expect(screen.getByText('Hidden with club').closest('[aria-label]')).toHaveAttribute(
      'aria-label',
      'Club paused',
    );
  });

  it('copes with a club-hidden pod that has no club reason', () => {
    render(<PodHiddenChip pod={{ hidden_by_club: true }} />);
    expect(screen.getByText('Hidden with club')).toBeInTheDocument();
  });
});

describe('podVisibilityValue', () => {
  const t = (key: string) => key.split('.').pop() as string;

  it('prefers the pod\'s own flag, then the club, then visible', () => {
    expect(podVisibilityValue({ is_hidden: true, hidden_by_club: true }, t)).toBe('hiddenChip');
    expect(podVisibilityValue({ hidden_by_club: true }, t)).toBe('hiddenWithClubChip');
    expect(podVisibilityValue({}, t)).toBe('visible');
  });
});

describe('PodHiddenBanner', () => {
  it('draws nothing for a visible pod', () => {
    const { container } = render(<PodHiddenBanner pod={{ is_hidden: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains a pod hidden because of its club, with that club\'s reason', () => {
    render(<PodHiddenBanner pod={{ hidden_by_club: true, club_hidden_reason: 'Policy review' }} />);
    expect(screen.getByText(/hidden from the app because its club is hidden/)).toBeInTheDocument();
    expect(screen.getByText('Reason: Policy review')).toBeInTheDocument();
  });

  it('gives a pod hidden on its own its reason, and says when its club is hidden too', () => {
    render(
      <PodHiddenBanner pod={{ is_hidden: true, hidden_reason: 'Wrong venue', hidden_by_club: true }} />,
    );
    expect(screen.getByText(/This pod is hidden from the app\./)).toBeInTheDocument();
    expect(screen.getByText('Reason: Wrong venue')).toBeInTheDocument();
    expect(screen.getByText(/Its club is hidden too/)).toBeInTheDocument();
  });

  it('omits the reason line and the club note when neither applies', () => {
    render(<PodHiddenBanner pod={{ is_hidden: true }} />);
    expect(screen.getByText(/This pod is hidden from the app\./)).toBeInTheDocument();
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Its club is hidden too/)).not.toBeInTheDocument();
  });
});

describe('ClubHiddenBanner', () => {
  it('shows nothing for a visible club', () => {
    const { container } = render(<ClubHiddenBanner hidden={false} reason="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the reader the club and its pods are hidden, with the reason when given', () => {
    const { rerender } = render(<ClubHiddenBanner hidden reason="Fraud check" />);
    expect(screen.getByText(/This club and every pod in it are hidden/)).toBeInTheDocument();
    expect(screen.getByText('Reason: Fraud check')).toBeInTheDocument();

    rerender(<ClubHiddenBanner hidden reason={null} />);
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument();
  });
});
