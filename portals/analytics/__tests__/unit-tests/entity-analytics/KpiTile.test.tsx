import { describe, expect, it } from 'vitest';
import KpiTile from '../../../src/pages/entity-analytics/KpiTile';
import type { AnalyticsKpi } from '../../../src/pages/entity-analytics/queries';
import { byTestId, mount } from '../../dom';
import { COPY, kpi } from '../../mocks/analytics';

const tileText = async (value: AnalyticsKpi, days = 30) => {
  await mount(<KpiTile kpi={value} days={days} />);
  return byTestId(`analytics-kpi-${value.key}`).textContent ?? '';
};

describe('KpiTile', () => {
  it('names a known number, formats it, and explains it behind an info button', async () => {
    await mount(<KpiTile kpi={kpi({ key: 'fill_rate', value: 68.4, previous: 61.2, format: 'PERCENT' })} days={30} />);
    const tile = byTestId('analytics-kpi-fill_rate');
    expect(tile.textContent).toContain(COPY['analytics.kpi.fillRate']);
    expect(tile.textContent).toContain('68.4%');
    expect(tile.querySelector(`[aria-label="${COPY['analytics.kpi.fillRateHint']}"]`)).not.toBeNull();
  });

  it('shows a rate’s move in points, beside the period it compares with', async () => {
    const text = await tileText(kpi({ key: 'fill_rate', value: 68.4, previous: 61.2, format: 'PERCENT' }), 30);
    expect(text).toContain('+7.2 pts');
    expect(text).toContain('vs previous 30 days');
  });

  it('shows anything else as a percentage move', async () => {
    const text = await tileText(kpi({ key: 'revenue', value: 150000, previous: 200000, format: 'CURRENCY' }), 7);
    expect(text).toContain('₹1.5L');
    expect(text).toContain('−25%');
    expect(text).toContain('vs previous 7 days');
  });

  it('says so when nothing moved', async () => {
    expect(await tileText(kpi({ key: 'avg_rating', value: 4.4, previous: 4.4, format: 'RATING' }))).toContain('No change');
  });

  it('shows the plain change when the period before had none', async () => {
    const text = await tileText(kpi({ key: 'pods_held', value: 4, previous: 0 }));
    expect(text).toContain('+4');
    expect(text).not.toContain('%');
  });

  it('marks a live count as right now, with nothing to compare', async () => {
    const text = await tileText(kpi({ key: 'pending_review', value: 12, previous: null }));
    expect(text).toContain('Right now');
    expect(text).not.toContain('vs previous');
  });

  it('shows a rising number that is bad news as bad news', async () => {
    await mount(
      <KpiTile kpi={kpi({ key: 'cancellation_rate', value: 6, previous: 4, format: 'PERCENT', higher_is_better: false })} days={30} />,
    );
    const tile = byTestId('analytics-kpi-cancellation_rate');
    expect(tile.textContent).toContain('+2 pts');
    // The arrow still points up — it is the colour, not the direction, that says "bad".
    expect(tile.querySelector('[data-testid="TrendingUpIcon"]')).not.toBeNull();
  });

  it('uses the raw key, with no info button, for a number the console has no words for', async () => {
    await mount(<KpiTile kpi={kpi({ key: 'brand_new_metric', value: 3, previous: 5 })} days={30} />);
    const tile = byTestId('analytics-kpi-brand_new_metric');
    expect(tile.textContent).toContain('brand_new_metric');
    expect(tile.querySelector('button')).toBeNull();
    expect(tile.querySelector('[data-testid="TrendingDownIcon"]')).not.toBeNull();
  });
});
