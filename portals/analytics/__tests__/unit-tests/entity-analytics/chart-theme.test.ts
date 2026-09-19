import { describe, expect, it, vi } from 'vitest';
import { createTheme } from '@mui/material/styles';
import { Chart } from 'chart.js';
import { categoryAxis, chartTooltip, valueAxis } from '../../../src/pages/entity-analytics/chart-theme';

const theme = createTheme({ palette: { mode: 'dark' } });

describe('chart theme', () => {
  it('registers everything the Analytics charts draw with Chart.js', () => {
    for (const id of ['category', 'linear']) expect(Chart.registry.getScale(id)).toBeDefined();
    for (const id of ['bar', 'line', 'point']) expect(Chart.registry.getElement(id)).toBeDefined();
    for (const id of ['tooltip', 'legend', 'filler']) expect(Chart.registry.getPlugin(id)).toBeDefined();
  });

  it('puts the tooltip on the paper surface in the theme’s own ink', () => {
    expect(chartTooltip(theme)).toEqual({
      backgroundColor: theme.palette.background.paper,
      titleColor: theme.palette.text.primary,
      bodyColor: theme.palette.text.primary,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      padding: 10,
    });
  });

  it('starts the value axis at zero and writes its ticks through the given format', () => {
    const format = vi.fn((value: number) => `₹${value}`);
    const axis = valueAxis(theme, format);
    expect(axis.beginAtZero).toBe(true);
    expect(axis.grid.color).toBe(theme.palette.divider);
    // Chart.js hands a tick over as a string or a number; the format gets a number.
    expect(axis.ticks.callback('1500')).toBe('₹1500');
    expect(format).toHaveBeenCalledWith(1500);
  });

  it('thins the category labels to twelve by default, or to what the chart asks', () => {
    expect(categoryAxis(theme).ticks.maxTicksLimit).toBe(12);
    expect(categoryAxis(theme, 10).ticks).toEqual({
      color: theme.palette.text.secondary,
      autoSkip: true,
      maxTicksLimit: 10,
      maxRotation: 0,
    });
    expect(categoryAxis(theme).grid.display).toBe(false);
  });
});
