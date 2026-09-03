import { fireEvent, screen } from '@testing-library/react-native';

import { CompanionCodeEntry } from '../CompanionCodeEntry';
import { renderWithProviders } from '@/utils/test-utils';

/**
 * The code box and its two buttons, shown once a companion's code is out.
 */
describe('CompanionCodeEntry', () => {
  const props = {
    index: 1,
    code: '',
    onCodeChange: jest.fn(),
    testCode: '',
    verifying: false,
    onVerify: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('takes a six-digit code and reports every keystroke', () => {
    const onCodeChange = jest.fn();
    renderWithProviders(<CompanionCodeEntry {...props} onCodeChange={onCodeChange} />);

    const box = screen.getByTestId('companion-otp-code-1');
    expect(box.props.maxLength).toBe(6);
    expect(box.props.keyboardType).toBe('number-pad');

    fireEvent.changeText(box, '123456');
    expect(onCodeChange).toHaveBeenCalledWith('123456');
  });

  it('verifies and cancels through the handlers it was given', () => {
    const onVerify = jest.fn();
    const onCancel = jest.fn();
    renderWithProviders(
      <CompanionCodeEntry {...props} code="123456" onVerify={onVerify} onCancel={onCancel} />,
    );

    fireEvent.press(screen.getByTestId('companion-otp-verify-1'));
    expect(onVerify).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('companion-otp-cancel-1'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('goes inert while a code is being checked, so one press is one attempt', () => {
    const onVerify = jest.fn();
    renderWithProviders(<CompanionCodeEntry {...props} verifying onVerify={onVerify} />);

    const verify = screen.getByTestId('companion-otp-verify-1');
    expect(screen.getByText('Verifying…')).toBeOnTheScreen();
    expect(verify.props['aria-disabled']).toBe(true);
    expect(verify.props.onPress).toBeUndefined();

    fireEvent.press(verify);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('shows the test code only while codes are not really being delivered', () => {
    const { rerender } = renderWithProviders(<CompanionCodeEntry {...props} />);
    expect(screen.queryByText(/test code/i)).toBeNull();

    rerender(<CompanionCodeEntry {...props} testCode="482913" />);
    // The server hands the code straight back while delivery is stubbed;
    // without this line the host has no way to complete the flow at all.
    expect(screen.getByText(/482913/)).toBeOnTheScreen();
  });

  it('stays cancellable while verifying, so a wrong number is not a dead end', () => {
    const onCancel = jest.fn();
    renderWithProviders(<CompanionCodeEntry {...props} verifying onCancel={onCancel} />);

    fireEvent.press(screen.getByTestId('companion-otp-cancel-1'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
