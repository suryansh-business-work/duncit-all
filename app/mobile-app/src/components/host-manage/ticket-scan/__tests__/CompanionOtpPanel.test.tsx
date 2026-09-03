import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { CompanionEntry } from '@duncit/utils';

import { CompanionOtpPanel } from '../CompanionOtpPanel';
import { renderWithProviders } from '@/utils/test-utils';
import { otpApi } from '@/utils/companion-otp-fixture';

/**
 * One companion's WhatsApp code.
 *
 * Optional by design — an attendee whose phone is dead or abroad must still be
 * able to walk in — so the panel proves the people it can and records which
 * ones those were. What it must NOT do is prove two people at once, which is
 * why the CTA is dead on every other row while a code is live.
 */
const entry: CompanionEntry = {
  name: 'Arjun Mehta',
  phone_extension: '+91',
  phone_number: '9876543210',
  otp_challenge_id: '',
};

describe('CompanionOtpPanel', () => {
  it('says nothing but "verified" once this companion is proved', () => {
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="VERIFIED"
        otp={otpApi()}
        onVerified={jest.fn()}
      />,
    );

    expect(screen.getByTestId('companion-verified-0')).toBeOnTheScreen();
    expect(screen.getByText('Verified')).toBeOnTheScreen();
    // Nothing left to do on this row, so no CTA and no code box.
    expect(screen.queryByTestId('companion-otp-send-0')).toBeNull();
    expect(screen.queryByTestId('companion-otp-code-0')).toBeNull();
  });

  it('explains why the CTA is dead while another row is mid-verification', () => {
    renderWithProviders(
      <CompanionOtpPanel
        index={1}
        entry={entry}
        state="BLOCKED"
        otp={otpApi({ activeIndex: 0 })}
        onVerified={jest.fn()}
      />,
    );

    expect(screen.getByText('Finish verifying the person above first.')).toBeOnTheScreen();
    expect(screen.getByTestId('companion-otp-send-1').props['aria-disabled']).toBe(true);
  });

  it('raises this row’s code, clearing anything typed against the last send', () => {
    const start = jest.fn();
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ start })}
        onVerified={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('companion-otp-send-0'));
    expect(start).toHaveBeenCalledWith(0, entry);
  });

  it('shows the code box only once THIS row holds the live challenge', () => {
    const { rerender } = renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 1, challengeId: 'ch-1' })}
        onVerified={jest.fn()}
      />,
    );
    // Another row owns the challenge — this one must not offer to spend it.
    expect(screen.queryByTestId('companion-otp-code-0')).toBeNull();

    rerender(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, challengeId: 'ch-1' })}
        onVerified={jest.fn()}
      />,
    );
    expect(screen.getByTestId('companion-otp-code-0')).toBeOnTheScreen();
  });

  it('hands the spent challenge back when the code is right', async () => {
    const onVerified = jest.fn();
    const submit = jest.fn().mockResolvedValue('ch-spent');
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, challengeId: 'ch-1', submit })}
        onVerified={onVerified}
      />,
    );

    fireEvent.changeText(screen.getByTestId('companion-otp-code-0'), '482913');
    fireEvent.press(screen.getByTestId('companion-otp-verify-0'));

    await waitFor(() => expect(submit).toHaveBeenCalledWith('482913'));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('ch-spent'));
  });

  it('keeps the row unproved when the code is wrong', async () => {
    const onVerified = jest.fn();
    const submit = jest.fn().mockResolvedValue(null);
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, challengeId: 'ch-1', submit })}
        onVerified={onVerified}
      />,
    );

    fireEvent.press(screen.getByTestId('companion-otp-verify-0'));

    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('swallows a rejected check rather than crashing the door', async () => {
    const onVerified = jest.fn();
    const submit = jest.fn().mockRejectedValue(new Error('network'));
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, challengeId: 'ch-1', submit })}
        onVerified={onVerified}
      />,
    );

    fireEvent.press(screen.getByTestId('companion-otp-verify-0'));

    // A failed request must not take the scan screen down with it — the hook
    // owns the error message, the panel just declines to proceed.
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('shows this row’s error, and only this row’s', () => {
    const { rerender } = renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 1, error: 'That code is not right.' })}
        onVerified={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('companion-otp-error-0')).toBeNull();

    rerender(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, error: 'That code is not right.' })}
        onVerified={jest.fn()}
      />,
    );
    expect(screen.getByTestId('companion-otp-error-0')).toBeOnTheScreen();
  });

  it('says it is sending only on the row whose code is actually going out', () => {
    const { rerender } = renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ sending: true, activeIndex: 0 })}
        onVerified={jest.fn()}
      />,
    );
    expect(screen.getByText('Sending…')).toBeOnTheScreen();

    rerender(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ sending: true, activeIndex: 1 })}
        onVerified={jest.fn()}
      />,
    );
    // Another row is sending. This one must not claim the spinner, or every
    // row in the list appears to be doing something.
    expect(screen.queryByText('Sending…')).toBeNull();
  });

  it('cancels the live code through the hook', () => {
    const cancel = jest.fn();
    renderWithProviders(
      <CompanionOtpPanel
        index={0}
        entry={entry}
        state="READY"
        otp={otpApi({ activeIndex: 0, challengeId: 'ch-1', cancel })}
        onVerified={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('companion-otp-cancel-0'));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
