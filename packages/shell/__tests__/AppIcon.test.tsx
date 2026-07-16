import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppIcon } from '../src/chrome/AppIcon';

describe('AppIcon', () => {
  it('resolves a known icon name', () => {
    render(<AppIcon name="dashboard" />);
    expect(screen.getByTestId('DashboardIcon')).toBeInTheDocument();
  });

  it('falls back to the neutral glyph for an unknown name', () => {
    render(<AppIcon name="totally-unknown" />);
    expect(screen.getByTestId('WidgetsIcon')).toBeInTheDocument();
  });

  it('falls back to the neutral glyph when no name is given', () => {
    render(<AppIcon />);
    expect(screen.getByTestId('WidgetsIcon')).toBeInTheDocument();
  });
});
