import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AppIcon from './AppIcon';

describe('AppIcon', () => {
  it('resolves a configured icon name to an MUI icon', () => {
    const { container } = render(<AppIcon name="dashboard" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('falls back to a neutral glyph for an unknown name', () => {
    const { container } = render(<AppIcon name="totally-unknown" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
