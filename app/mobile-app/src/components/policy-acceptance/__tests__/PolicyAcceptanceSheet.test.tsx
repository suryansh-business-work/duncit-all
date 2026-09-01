import { fireEvent, screen } from '@testing-library/react-native';

import { PolicyAcceptanceSheet } from '@/components/policy-acceptance';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePolicies');

const mockedPolicies = jest.mocked(useSignupPolicies);

const POLICIES = [
  { id: 'pol-terms', slug: 'terms', title: 'Terms of Use', content: 'The terms.' },
  { id: 'pol-privacy', slug: 'privacy', title: 'Privacy Policy', content: 'The privacy policy.' },
];

const listing = (policies: typeof POLICIES) =>
  ({
    policies,
    loaded: true,
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
  }) as unknown as ReturnType<typeof useSignupPolicies>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPolicies.mockReturnValue(listing(POLICIES));
});

describe('PolicyAcceptanceSheet', () => {
  /*
    The sheet used to leave itself open after Accept all: the handler ticked
    every box and stopped there, so the one press that finishes the gate still
    needed a second press on Close. mWeb's dialog has always closed on the same
    action, and rule 27 keeps the pair identical.
  */
  it('ticks every policy and closes on Accept all', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <PolicyAcceptanceSheet open acceptedIds={[]} onChange={onChange} onClose={onClose} />,
    );

    fireEvent.press(screen.getByTestId('policy-acceptance-accept-all'));

    expect(onChange).toHaveBeenCalledWith(['pol-terms', 'pol-privacy']);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /*
    Nothing left to accept means nothing to do: the button is inert rather than
    a second way to close, so a full list cannot be re-submitted by pressing it.
  */
  it('does nothing when every policy is already accepted', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <PolicyAcceptanceSheet
        open
        acceptedIds={['pol-terms', 'pol-privacy']}
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId('policy-acceptance-accept-all'));

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the Close button without accepting anything', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <PolicyAcceptanceSheet open acceptedIds={[]} onChange={onChange} onClose={onClose} />,
    );

    fireEvent.press(screen.getByTestId('policy-acceptance-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
