import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useColorMode } from '@duncit/theme';
import { ColorModeProvider } from '../src/test/ColorModeProvider';

function ModeProbe() {
  const { mode } = useColorMode();
  return <div>mode:{mode}</div>;
}

describe('ColorModeProvider', () => {
  it('provides the theme + color mode to its children', () => {
    render(
      <ColorModeProvider
        accent={{ light: '#ff8a8a', main: '#F82C2E', hover: '#d81f21', active: '#b81a1c' }}
        storageKey="cmp_test"
      >
        <ModeProbe />
        <div>child</div>
      </ColorModeProvider>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(screen.getByText(/mode:(light|dark)/)).toBeInTheDocument();
  });
});
