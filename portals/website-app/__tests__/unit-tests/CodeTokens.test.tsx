import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import CodeTokens from '../../src/pages/cms/components/code-field/CodeTokens';
import { renderWithProviders } from '../testkit';

const swatchOf = (name: string) => screen.getByRole('button', { name: `Insert ${name}` }).querySelector('div[aria-hidden="true"]');

describe('CodeTokens', () => {
  it('says the site has no variables yet when there are none', () => {
    renderWithProviders(<CodeTokens tokens={[]} onInsert={vi.fn()} />);
    const panel = screen.getByRole('complementary', { name: 'Site variables' });
    expect(within(panel).getByText('This site has no design variables yet. Add them in Design.')).toBeInTheDocument();
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument();
  });

  it('lists every variable with its value and inserts var(--name) when one is clicked', () => {
    const onInsert = vi.fn();
    renderWithProviders(
      <CodeTokens
        tokens={[
          { name: '--brand', value: '#ff6600' },
          { name: '--space-2', value: '8px' },
        ]}
        onInsert={onInsert}
      />,
    );
    expect(screen.getByText('--space-2')).toBeInTheDocument();
    expect(screen.getByText('8px')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Insert --space-2' }));
    expect(onInsert).toHaveBeenCalledWith('var(--space-2)');
  });

  it.each([
    ['--brand', '#ff6600'],
    ['--brand-short', '#f60'],
    ['--overlay', 'rgba(0, 0, 0, 0.4)'],
    ['--accent', 'hsl(210 50% 40%)'],
    ['--ink', 'oklch(0.7 0.1 200)'],
    ['--padded', '  #000000  '],
    ['--text-color', 'black'],
  ])('shows a colour swatch for %s: %s', (name, value) => {
    renderWithProviders(<CodeTokens tokens={[{ name, value }]} onInsert={vi.fn()} />);
    expect(swatchOf(name)).not.toBeNull();
  });

  it.each([
    ['--space-2', '8px'],
    ['--font-body', '"Inter", sans-serif'],
    ['--bad-hex', '#ggg'],
    ['--radius', 'calc(4px * 2)'],
  ])('shows no swatch for a non-colour value %s: %s', (name, value) => {
    renderWithProviders(<CodeTokens tokens={[{ name, value }]} onInsert={vi.fn()} />);
    expect(swatchOf(name)).toBeNull();
  });
});
