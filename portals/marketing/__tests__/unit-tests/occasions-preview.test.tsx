import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { dark, light } from '@duncit/auth-tokens';
import { renderWithProviders } from '../testkit';
import { blankPalette, makeLook } from '../mocks/occasions-themes.mock';
import { urlConfigs } from '../../src/config/url-configs';

// The canvas renderer is the shared @duncit/ui one with its own suite; jsdom has no canvas to draw on.
vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  OccasionEffects: ({ still, stillAt, contained }: { still: boolean; stillAt: number; contained: boolean }) => (
    <div data-testid="effects" data-still={String(still)} data-still-at={stillAt} data-contained={String(contained)} />
  ),
}));

import { pinsColorMode, previewPalette, HOUSE_PALETTES } from '../../src/pages/occasions-page/preview/palette';
import { mwebPreviewUrl } from '../../src/pages/occasions-page/preview/usePreviewMode';
import ModeToggle from '../../src/pages/occasions-page/preview/ModeToggle';
import PaletteSwatches from '../../src/pages/occasions-page/preview/PaletteSwatches';
import PhonePreview from '../../src/pages/occasions-page/preview/PhonePreview';
import PreviewDialog from '../../src/pages/occasions-page/preview/PreviewDialog';

const garlandLook = () => makeLook({ garland: { __typename: 'OccasionGarland', style: 'STRING_LIGHTS', colors: ['#FFD54F'] } });

describe('previewPalette and pinsColorMode', () => {
  it('paints the house palette in the viewer’s mode when there is no look', () => {
    expect(HOUSE_PALETTES).toEqual({ light, dark });
    expect(previewPalette(null, 'dark')).toEqual({ mode: 'dark', palette: dark });
    expect(previewPalette(null, 'light')).toEqual({ mode: 'light', palette: light });
  });

  it('lays the look’s tokens over the house palette and keeps the house colour where a token is blank', () => {
    const { mode, palette } = previewPalette(makeLook(), 'light');
    expect(mode).toBe('light');
    expect(palette.primary).toBe('#8E1B3A');
    expect(palette.brand).toBe('#FFD54F');
    expect(palette.bg).toBe(light.bg);
    expect(previewPalette(makeLook(), 'dark').palette.primary).toBe('#FF8A65');
  });

  it('follows the mode a look pins, whatever the viewer is in', () => {
    const night = makeLook({ color_mode: 'DARK', palette_dark: blankPalette({ bg: '#101010' }) });
    expect(previewPalette(night, 'light')).toEqual({ mode: 'dark', palette: { ...dark, bg: '#101010' } });
    expect(previewPalette(makeLook({ color_mode: 'LIGHT' }), 'dark').mode).toBe('light');
  });

  it('says a look pins its mode only for LIGHT or DARK', () => {
    expect(pinsColorMode(makeLook({ color_mode: 'LIGHT' }))).toBe(true);
    expect(pinsColorMode(makeLook({ color_mode: 'DARK' }))).toBe(true);
    expect(pinsColorMode(makeLook({ color_mode: 'AUTO' }))).toBe(false);
    expect(pinsColorMode(null)).toBe(false);
  });
});

describe('mwebPreviewUrl', () => {
  it('opens mWeb wearing the look, with the key made safe for a query string', () => {
    expect(mwebPreviewUrl('diwali')).toBe(`${urlConfigs.mwebUrl}/?occasion=diwali`);
    expect(mwebPreviewUrl('new year & eve')).toBe(`${urlConfigs.mwebUrl}/?occasion=new%20year%20%26%20eve`);
  });
});

describe('ModeToggle', () => {
  it('switches between light and dark, and ignores a click on the mode already chosen', () => {
    const onChange = vi.fn();
    renderWithProviders(<ModeToggle value="light" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Preview in light or dark mode' });
    expect(within(group).getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Light' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(within(group).getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(screen.queryByText('This look always shows in its own mode.')).not.toBeInTheDocument();
  });

  it('is switched off and says why in words when the look pins its mode', () => {
    renderWithProviders(<ModeToggle value="dark" onChange={vi.fn()} pinned />);
    expect(screen.getByRole('button', { name: 'Light' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeDisabled();
    expect(screen.getByText('This look always shows in its own mode.')).toBeInTheDocument();
  });
});

describe('PaletteSwatches', () => {
  it('names the six key colours of the look in the mode shown', () => {
    renderWithProviders(<PaletteSwatches look={makeLook()} mode="light" />);
    const list = screen.getByRole('list', { name: 'Key colours' });
    const dots = within(list).getAllByRole('listitem');
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Primary #8E1B3A',
      `Accent ${light.accent}`,
      'Brand #FFD54F',
      `Background ${light.bg}`,
      `Surface ${light.surface}`,
      `Soft fill ${light.soft}`,
    ]);
  });
});

describe('PhonePreview', () => {
  it('shows the house look as one named picture, with no greeting and nothing drawn over it', () => {
    renderWithProviders(<PhonePreview look={null} mode="light" label="House look on a phone" />);
    const phone = screen.getByRole('img', { name: 'House look on a phone' });
    expect(within(phone).getByText('Duncit')).toBeInTheDocument();
    expect(within(phone).getByText('Today')).toBeInTheDocument();
    expect(within(phone).getByText('Nearby')).toBeInTheDocument();
    expect(within(phone).getAllByText('Join')).toHaveLength(1);
    expect(screen.queryByTestId('effects')).not.toBeInTheDocument();
  });

  it('wears the look’s name and trimmed greeting, without decoration when the look has none', () => {
    renderWithProviders(<PhonePreview look={makeLook({ greeting: '  Happy Diwali  ' })} mode="dark" size="lg" label="Diwali" />);
    expect(screen.getByText('Diwali', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Happy Diwali')).toBeInTheDocument();
    expect(screen.queryByTestId('effects')).not.toBeInTheDocument();
  });

  it('shows no greeting line for one that is only spaces', () => {
    renderWithProviders(<PhonePreview look={makeLook({ greeting: '   ' })} mode="light" label="Diwali" />);
    expect(screen.getByRole('img', { name: 'Diwali' }).textContent).toBe('DiwaliTodayJoinNearby');
  });

  it('runs the decoration inside the phone, as a still frame for a thumbnail', () => {
    const { unmount } = renderWithProviders(<PhonePreview look={garlandLook()} mode="light" size="sm" still label="Diwali" />);
    const effects = screen.getByTestId('effects');
    expect(effects).toHaveAttribute('data-still', 'true');
    expect(effects).toHaveAttribute('data-still-at', '4');
    expect(effects).toHaveAttribute('data-contained', 'true');
    unmount();
    renderWithProviders(<PhonePreview look={garlandLook()} mode="light" label="Diwali" />);
    expect(screen.getByTestId('effects')).toHaveAttribute('data-still', 'false');
  });
});

describe('PreviewDialog', () => {
  it('stays shut with no look', () => {
    renderWithProviders(<PreviewDialog look={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the look running at full size with its region, description, an mWeb link and a close', () => {
    const onClose = vi.fn();
    renderWithProviders(<PreviewDialog look={makeLook({ key: 'diwali 2026' })} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: /Diwali/ });
    expect(within(dialog).getByText('Indian festivals')).toBeInTheDocument();
    expect(within(dialog).getByText('Lamps and gold')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Preview of Diwali on a phone' })).toBeInTheDocument();
    // The console starts in dark mode, so the preview does too, and it may be switched.
    expect(within(dialog).getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Light' }));
    expect(within(dialog).getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    const link = within(dialog).getByRole('link', { name: 'Open on mWeb' });
    expect(link).toHaveAttribute('href', `${urlConfigs.mwebUrl}/?occasion=diwali%202026`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks the mode switch for a look that pins its mode, and leaves out an empty description', () => {
    renderWithProviders(<PreviewDialog look={makeLook({ color_mode: 'DARK', description: '', region: 'WESTERN' })} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Western festivals')).toBeInTheDocument();
    expect(within(dialog).getByText('This look always shows in its own mode.')).toBeInTheDocument();
    expect(within(dialog).queryByText('Lamps and gold')).not.toBeInTheDocument();
  });
});
