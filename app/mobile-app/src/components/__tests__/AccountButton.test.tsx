import { fireEvent, screen } from '@testing-library/react-native';

import { AccountButton } from '@/components/AccountButton';
import { useMe } from '@/hooks/useMe';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
// The drawer is unit-tested on its own; here we only assert it toggles open.
jest.mock('@/components/Sidebar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Sidebar: ({ open }: { open: boolean }) => (open ? <View testID="sidebar-open" /> : null),
  };
});

const mockedUseMe = jest.mocked(useMe);

afterEach(() => jest.clearAllMocks());

describe('AccountButton', () => {
  it('shows the user photo when present', () => {
    mockedUseMe.mockReturnValue({ data: { me: { profile_photo: 'https://x/p.png' } } } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByTestId('account-avatar-image')).toBeOnTheScreen();
  });

  it('falls back to the initial and opens the drawer on press', () => {
    mockedUseMe.mockReturnValue({ data: { me: { first_name: 'Asha' } } } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-open')).toBeNull();
    fireEvent.press(screen.getByTestId('account-button'));
    expect(screen.getByTestId('sidebar-open')).toBeOnTheScreen();
  });

  it('defaults to "U" with no user data', () => {
    mockedUseMe.mockReturnValue({ data: undefined } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByText('U')).toBeOnTheScreen();
  });
});
