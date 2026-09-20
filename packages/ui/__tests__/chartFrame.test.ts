import { describe, expect, it } from 'vitest';
import { createTheme } from '@mui/material/styles';
import { categoryAxis, chartTooltip, lineTrendDataset, lineTrendOptions, valueAxis } from '../src/chartFrame';

const theme = createTheme({ palette: { mode: 'light' } });

describe('chartFrame', () => {
  it('draws the tooltip on the paper surface in the theme ink', () => {
    const tooltip = chartTooltip(theme);
    expect(tooltip.backgroundColor).toBe(theme.palette.background.paper);
    expect(tooltip.titleColor).toBe(theme.palette.text.primary);
    expect(tooltip.borderColor).toBe(theme.palette.divider);
    expect(tooltip.borderWidth).toBe(1);
  });

  it('formats value-axis ticks through the given formatter, starting at zero', () => {
    const axis = valueAxis(theme, (value) => `₹${value}`);
    expect(axis.beginAtZero).toBe(true);
    expect(axis.ticks.maxTicksLimit).toBe(5);
    expect(axis.ticks.callback('1200')).toBe('₹1200');
    expect(axis.ticks.callback(7)).toBe('₹7');
  });

  it('thins category labels to twelve by default, or to the count given', () => {
    expect(categoryAxis(theme).ticks.maxTicksLimit).toBe(12);
    expect(categoryAxis(theme, 5).ticks.maxTicksLimit).toBe(5);
    expect(categoryAxis(theme).grid.display).toBe(false);
    expect(categoryAxis(theme).border.color).toBe(theme.palette.divider);
  });

  it('fills a lone trend line and leaves several as plain lines', () => {
    const alone = lineTrendDataset(theme, 0, true);
    expect(alone.fill).toBe(true);
    expect(alone.borderColor).toBe('#2a78d6');
    expect(alone.backgroundColor).not.toBe(alone.borderColor);
    const beside = lineTrendDataset(theme, 1, false);
    expect(beside.fill).toBe(false);
    expect(beside.borderColor).toBe('#eb6834');
    expect(beside.backgroundColor).toBe(beside.borderColor);
  });

  it('shows the legend only when lines can cross', () => {
    expect(lineTrendOptions(theme, true).plugins.legend.display).toBe(false);
    const several = lineTrendOptions(theme, false);
    expect(several.plugins.legend.display).toBe(true);
    expect(several.plugins.legend.labels.color).toBe(theme.palette.text.secondary);
    expect(several.interaction.mode).toBe('index');
    expect(several.animation).toBe(false);
    expect(several.maintainAspectRatio).toBe(false);
  });
});
