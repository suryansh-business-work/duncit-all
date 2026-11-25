import { screen } from '@testing-library/react-native';

import { initialsOf } from '@/components/LeadAvatar';
import { renderWithTheme } from '@/test-utils';
import { HeaderBrand } from '../HeaderBrand';

/** The red app bar's title: the duncit wordmark, "CRM" and the screen — read out once. */

it('shows the product and the screen, and reads them out as one heading', () => {
  renderWithTheme(<HeaderBrand title="Dialer" />);
  // The wordmark and "CRM" are hidden from screen readers: the heading's label says it once.
  expect(screen.getByText('CRM', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('Dialer')).toBeOnTheScreen();
  expect(screen.getByLabelText('Duncit CRM, Dialer')).toBeOnTheScreen();
});

it.each([
  ['Apoorva Srivastava', 'AS'],
  ['  smash   arena gurgaon ', 'SA'],
  ['Riya', 'R'],
  ['', ''],
])('takes up to two initials from "%s"', (name, initials) => {
  expect(initialsOf(name)).toBe(initials);
});
