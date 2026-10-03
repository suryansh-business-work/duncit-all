import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import HealthMeter, { type HealthBand } from '../HealthMeter';

const theme = createTheme();

const renderMeter = (props: Partial<Parameters<typeof HealthMeter>[0]> = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <HealthMeter score={72} band="GREEN" {...props} />
    </ThemeProvider>,
  );

/** The coloured arc is the second path; its dash length is the filled share. */
const arcs = () => Array.from(screen.getByTestId('health-meter').querySelectorAll('path'));

describe('HealthMeter', () => {
  it('reads the score out of 100 under the default label', () => {
    renderMeter();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
    expect(screen.getByText('Account Health')).toBeInTheDocument();
  });

  it('uses a caller’s label and caption when given', () => {
    renderMeter({ label: 'Club health', caption: 'Up 4 points this week' });
    expect(screen.getByText('Club health')).toBeInTheDocument();
    expect(screen.queryByText('Account Health')).not.toBeInTheDocument();
    expect(screen.getByText('Up 4 points this week')).toBeInTheDocument();
  });

  it('omits the caption line when the caption is empty', () => {
    renderMeter({ caption: null });
    expect(screen.getByTestId('health-meter').textContent).toBe('72/ 100Account Health');
  });

  it.each([
    [-15, '0'],
    [140, '100'],
    [66.6, '67'],
  ])('clamps and rounds a score of %s to %s', (score, shown) => {
    renderMeter({ score });
    expect(screen.getByText(shown)).toBeInTheDocument();
  });

  it('fills the arc in proportion to the score', () => {
    // size 168, thickness 14 → radius 77, half circumference 77π.
    const half = Math.PI * 77;
    const { unmount } = renderMeter({ score: 50 });
    const [, filledAt50] = arcs();
    expect(filledAt50.getAttribute('stroke-dasharray')).toBe(`${half / 2} ${half}`);
    unmount();

    renderMeter({ score: 0 });
    expect(arcs()[1].getAttribute('stroke-dasharray')).toBe(`0 ${half}`);
  });

  it.each([
    ['RED', theme.palette.error.main],
    ['YELLOW', theme.palette.warning.main],
    ['GREEN', theme.palette.success.main],
  ] as Array<[HealthBand, string]>)('colours a %s band from the theme', (band, colour) => {
    renderMeter({ band });
    expect(arcs()[1]).toHaveAttribute('stroke', colour);
  });

  it('sizes the gauge from size and thickness', () => {
    renderMeter({ size: 100, thickness: 10 });
    const svg = screen.getByTestId('health-meter').querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    // Half the size plus the stroke, so the round caps are not clipped.
    expect(svg).toHaveAttribute('height', '60');
    expect(arcs()[0]).toHaveAttribute('d', 'M 5 50 A 45 45 0 0 1 95 50');
  });

  it('is not interactive without a handler', () => {
    renderMeter();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('health-meter')).not.toHaveAttribute('tabindex');
  });

  it('is a keyboard-operable button with a handler', () => {
    const onClick = vi.fn();
    renderMeter({ onClick });
    const meter = screen.getByRole('button');
    expect(meter).toHaveAttribute('tabindex', '0');

    fireEvent.click(meter);
    fireEvent.keyDown(meter, { key: 'Enter' });
    fireEvent.keyDown(meter, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(meter, { key: 'Tab' });
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
