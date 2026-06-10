/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factory requires lazily */
import { fireEvent, screen } from '@testing-library/react-native';

import { AccountButton } from '@/components/AccountButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { me: { first_name: 'Asha' } } }) }));
jest.mock('@/components/Sidebar', () => ({
  Sidebar: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open
      ? require('react').createElement(require('react-native').Pressable, {
          testID: 'sb-close',
          onPress: onClose,
        })
      : null,
}));

describe('AccountButton drawer close', () => {
  it('closes the drawer via the sidebar onClose handler', () => {
    renderWithProviders(<AccountButton />);
    fireEvent.press(screen.getByTestId('account-button'));
    expect(screen.getByTestId('sb-close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sb-close'));
    expect(screen.queryByTestId('sb-close')).toBeNull();
  });
});
