import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import LeadContactActions from '@/components/LeadContactActions';

const wrap = (ui: JSX.Element) => render(<MockedProvider mocks={[]} addTypename={false}>{ui}</MockedProvider>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeadContactActions', () => {
  it('renders Call, WhatsApp and Email actions', () => {
    wrap(
      <LeadContactActions entity="VENUE_LEAD" leadId="v1" displayName="Hall" email="a@b.com" mobile="999" whatsapp="999" />
    );
    expect(screen.getByRole('button', { name: /Call/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Email/i })).toBeTruthy();
  });

  it('disables actions when the matching contact detail is missing', () => {
    wrap(<LeadContactActions entity="HOST_LEAD" leadId="h1" displayName="Bob" />);
    expect(screen.getByRole('button', { name: /Call/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Email/i })).toBeDisabled();
  });

  it('opens wa.me (digits only) when WhatsApp is clicked', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    wrap(<LeadContactActions entity="VENUE_LEAD" leadId="v1" displayName="Hall" whatsapp="+91 98765-43210" />);
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/i }));
    expect(open).toHaveBeenCalledWith('https://wa.me/919876543210', '_blank', 'noopener,noreferrer');
  });

  it('falls back to the mobile number for WhatsApp when no whatsapp is set', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    wrap(<LeadContactActions entity="VENUE_LEAD" leadId="v1" displayName="Hall" mobile="98765" />);
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/i }));
    expect(open).toHaveBeenCalledWith('https://wa.me/98765', '_blank', 'noopener,noreferrer');
  });
});
