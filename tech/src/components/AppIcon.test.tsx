import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AppIcon from './AppIcon';

describe('AppIcon', () => {
  it('resolves a known name to its MUI icon', () => {
    const { getByTestId } = render(<AppIcon name="settings" />);
    expect(getByTestId('SettingsIcon')).toBeInTheDocument();
  });

  it('falls back to a neutral glyph for an unknown name', () => {
    const { getByTestId } = render(<AppIcon name="does-not-exist" />);
    expect(getByTestId('WidgetsIcon')).toBeInTheDocument();
  });
});
