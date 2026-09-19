import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ModuleIcon, { type ModuleIconKind } from '../ModuleIcon';

const KIND_ICONS: [ModuleIconKind, string][] = [
  ['dashboard', 'DashboardIcon'],
  ['users', 'ManageAccountsIcon'],
  ['catalog', 'CategoryIcon'],
  ['campaign', 'CampaignIcon'],
  ['community', 'GroupsIcon'],
  ['engagement', 'CampaignIcon'],
  ['website', 'LanguageIcon'],
  ['finance', 'AccountBalanceWalletIcon'],
  ['inventory', 'Inventory2Icon'],
  ['system', 'TuneIcon'],
];

const renderIn = (mode: 'light' | 'dark', kind: ModuleIconKind) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <ModuleIcon kind={kind} color="#D92D2D" />
    </ThemeProvider>,
  );

describe('ModuleIcon', () => {
  it.each(KIND_ICONS)('draws the %s module with its own icon', (kind, testId) => {
    renderIn('light', kind);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it.each(['light', 'dark'] as const)('renders the tile in %s mode', (mode) => {
    const { container } = renderIn(mode, 'finance');
    expect(screen.getByTestId('AccountBalanceWalletIcon')).toBeInTheDocument();
    // Frame, signal bar and icon plate all sit inside the one tile.
    expect(container.firstElementChild?.children).toHaveLength(3);
  });
});
