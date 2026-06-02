import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AppIcon from './AppIcon';

describe('AppIcon', () => {
  it('renders a mapped icon', () => {
    const { container } = render(<AppIcon name="dashboard" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('falls back to a neutral glyph for unknown names', () => {
    const { container } = render(<AppIcon name="does-not-exist" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
