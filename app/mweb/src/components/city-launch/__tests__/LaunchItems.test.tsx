import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LAUNCH_HERO_FEATURES } from '@duncit/utils';

import { LaunchItemDiscs, LaunchItemPills, LaunchItemStrip } from '../LaunchItems';
import { fallbackT } from '../../../i18n/fallback';

const theme = createTheme();
const items = LAUNCH_HERO_FEATURES;

const renderIn = (ui: React.ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('LaunchItems', () => {
  it('has real items to draw', () => {
    expect(items.length).toBeGreaterThan(1);
  });

  it.each([
    ['strip', (testId: string) => <LaunchItemStrip items={items} testId={testId} />],
    ['discs', (testId: string) => <LaunchItemDiscs items={items} testId={testId} />],
    ['pills', (testId: string) => <LaunchItemPills items={items} testId={testId} />],
    ['inline pills', (testId: string) => <LaunchItemPills items={items} testId={testId} inline />],
  ])('%s: one list item per entry, each captioned from its label key and drawn with an icon', (_name, make) => {
    renderIn(make('launch-items'));
    const rows = within(screen.getByTestId('launch-items')).getAllByRole('listitem');
    expect(rows).toHaveLength(items.length);
    items.forEach((item, index) => {
      expect(rows[index]).toHaveTextContent(fallbackT(item.labelKey));
      expect(rows[index]?.querySelector('svg')).not.toBeNull();
    });
  });

  it('draws no divider before the first cell of a strip, and one before the rest', () => {
    renderIn(<LaunchItemStrip items={items} testId="strip" />);
    const rows = within(screen.getByTestId('strip')).getAllByRole('listitem');
    expect(getComputedStyle(rows[0]!).borderLeftStyle).not.toBe('solid');
    expect(getComputedStyle(rows[1]!).borderLeftStyle).toBe('solid');
  });

  it('wraps inline pills in a row and stacks the default ones in a column', () => {
    const { unmount } = renderIn(<LaunchItemPills items={items} testId="pills" inline />);
    expect(getComputedStyle(screen.getByTestId('pills')).flexDirection).toBe('row');
    unmount();
    renderIn(<LaunchItemPills items={items} testId="pills" />);
    expect(getComputedStyle(screen.getByTestId('pills')).flexDirection).toBe('column');
  });

  it('renders nothing inside an empty list', () => {
    renderIn(<LaunchItemStrip items={[]} testId="empty" />);
    expect(within(screen.getByTestId('empty')).queryAllByRole('listitem')).toHaveLength(0);
  });
});
