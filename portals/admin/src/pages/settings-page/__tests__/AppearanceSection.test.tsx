import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DuncitThemeProvider } from '@duncit/theme';
import AppearanceSection from '../AppearanceSection';

const STORAGE_KEY = 'admin_appearance_test_mode';

/** The real provider, so the switch drives the same persisted mode the portal boots with. */
const renderSection = (defaultMode: 'light' | 'dark') =>
  render(
    <DuncitThemeProvider storageKey={STORAGE_KEY} defaultMode={defaultMode}>
      <AppearanceSection />
    </DuncitThemeProvider>,
  );

describe('AppearanceSection', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('reads light mode as an unchecked "Light mode" switch and turns it dark', () => {
    renderSection('light');

    const toggle = screen.getByRole('switch', { name: 'Light mode' });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('reads dark mode as a checked "Dark mode" switch and turns it light', () => {
    renderSection('dark');

    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(screen.getByRole('switch', { name: 'Light mode' })).not.toBeChecked();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });
});
