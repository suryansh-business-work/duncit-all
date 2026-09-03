import { fireEvent, screen } from '@testing-library/react-native';

import { CompanionSendButton } from '../CompanionSendButton';
import { renderWithProviders } from '@/utils/test-utils';

/**
 * The CTA that raises one companion's code.
 *
 * Only one row may hold a live code at a time, so "not ready" is a real and
 * frequent state — and Tamagui has no `disabled` prop, which means the press
 * handler, the opacity and the ARIA state each have to say so separately. That
 * is what these cases hold.
 */
describe('CompanionSendButton', () => {
  const props = {
    index: 0,
    ready: true,
    sent: false,
    sending: false,
    onStart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invites the host to verify, and raises a code when pressed', () => {
    const onStart = jest.fn();
    renderWithProviders(<CompanionSendButton {...props} onStart={onStart} />);

    const cta = screen.getByTestId('companion-otp-send-0');
    expect(screen.getByText('Verify on WhatsApp')).toBeOnTheScreen();
    expect(cta.props['aria-disabled']).toBe(false);

    fireEvent.press(cta);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('is inert while another row holds the live code', () => {
    const onStart = jest.fn();
    renderWithProviders(<CompanionSendButton {...props} ready={false} onStart={onStart} />);

    const cta = screen.getByTestId('companion-otp-send-0');
    // Both have to agree: no press handler, and announced as disabled.
    expect(cta.props['aria-disabled']).toBe(true);
    expect(cta.props.onPress).toBeUndefined();

    fireEvent.press(cta);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('says it is sending while this row’s request is in flight', () => {
    renderWithProviders(<CompanionSendButton {...props} sending />);

    expect(screen.getByText('Sending…')).toBeOnTheScreen();
  });

  it('offers to send again once this row’s code is out', () => {
    renderWithProviders(<CompanionSendButton {...props} sent />);

    expect(screen.getByText('Send again')).toBeOnTheScreen();
  });

  it('prefers "sending" over "send again" when a resend is in flight', () => {
    renderWithProviders(<CompanionSendButton {...props} sent sending />);

    // Both flags are true during a resend; the in-flight state is the one the
    // host needs to see.
    expect(screen.getByText('Sending…')).toBeOnTheScreen();
    expect(screen.queryByText('Send again')).toBeNull();
  });

  it('keeps its accessible name stable whatever the label says', () => {
    renderWithProviders(<CompanionSendButton {...props} sent />);

    // The visible label changes with state; the accessible name must not, or a
    // screen-reader user loses the control between renders.
    expect(screen.getByTestId('companion-otp-send-0').props['aria-label']).toBe(
      'Verify on WhatsApp',
    );
  });
});
