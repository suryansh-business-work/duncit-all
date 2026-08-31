/**
 * The list is the piece each page used to own a copy of, and the copy is where
 * Email fell behind. These assert the routing, not the cards.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/media-picker', () => ({
  useImagekitBase64Upload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@duncit/ai-monitoring/mui', () => ({
  AiMonitoringChip: () => <span>AI Monitoring</span>,
}));

const { default: VerificationCards } = await import('../src/mui/VerificationCards');
const { default: EmailCard } = await import('../src/mui/EmailCard');
type Verification = import('../src').Verification;

const items: Verification[] = [
  {
    type: 'IDENTITY',
    status: 'NOT_SUBMITTED',
    document_url: null,
    reject_reason: null,
    address: null,
  },
  {
    type: 'ADDRESS',
    status: 'NOT_SUBMITTED',
    document_url: null,
    reject_reason: null,
    address: null,
  },
  {
    type: 'EMAIL',
    status: 'VERIFIED_BY_APP',
    document_url: null,
    reject_reason: null,
    address: null,
  },
];

describe('VerificationCards', () => {
  it('gives each type the card that can act on it', () => {
    render(
      <MockedProvider mocks={[]}>
        <VerificationCards items={items} onChanged={vi.fn()} onError={vi.fn()} />
      </MockedProvider>,
    );

    // Identity gets the file picker, Address gets the form, Email gets neither.
    expect(screen.getByTestId('verification-file-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Address line 1')).toBeInTheDocument();
    expect(
      screen.getByText('Your email is verified when you sign in — no action needed here.'),
    ).toBeInTheDocument();
  });

  it('renders nothing for an empty roster', () => {
    render(
      <MockedProvider mocks={[]}>
        <VerificationCards items={[]} onChanged={vi.fn()} onError={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.queryByTestId('verification-IDENTITY')).not.toBeInTheDocument();
  });
});

describe('EmailCard', () => {
  it('is terminal — it states why there is nothing to do', () => {
    render(<EmailCard item={items[2]} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Verified by the App')).toBeInTheDocument();
    expect(
      screen.getByText('Your email is verified when you sign in — no action needed here.'),
    ).toBeInTheDocument();
  });
});
