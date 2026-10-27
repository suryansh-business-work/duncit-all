import { act, screen } from '@testing-library/react';
import { useColorScheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LITE_ME } from '../../../../shared/graphql/documents';
import { MODE_STORAGE_KEY } from '../../../../shared/theme';
import { DisplayModeSync, MUI_MODE } from '../../../app/providers/DisplayModeSync';
import { meFixture, renderWithProviders } from '../../test-utils';

/** What the page is drawn in right now, and a way for the reader to flip it on this device. */
function ModeProbe() {
  const { mode, setMode } = useColorScheme();
  return (
    <>
      <p data-testid="mode">{mode ?? ''}</p>
      <button type="button" onClick={() => setMode('dark')}>
        Go dark
      </button>
    </>
  );
}

const page = (
  <>
    <DisplayModeSync />
    <ModeProbe />
  </>
);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('MUI_MODE', () => {
  it("maps the account's choice to MUI's words", () => {
    expect(MUI_MODE).toEqual({ SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' });
  });
});

describe('DisplayModeSync', () => {
  it("leaves a visitor's page in the app's default mode", () => {
    renderWithProviders(page);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it("applies the account's saved mode on this device", () => {
    renderWithProviders(page, { me: meFixture({ display_mode: 'LIGHT' }) });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('light');
  });

  it('does not fight a toggle on this device after it has applied the saved mode once', async () => {
    const { user } = renderWithProviders(page, { me: meFixture({ display_mode: 'SYSTEM' }) });
    expect(screen.getByTestId('mode')).toHaveTextContent('system');

    await user.click(screen.getByRole('button', { name: 'Go dark' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('applies the new mode when the account changes it on another device', () => {
    const me = meFixture({ display_mode: 'LIGHT' });
    const { cache } = renderWithProviders(page, { me });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');

    act(() => {
      cache.writeQuery({ query: LITE_ME, data: { liteMe: { ...me, display_mode: 'DARK' } } });
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });
});
