import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import PageControls from '../../../src/pages/entity-analytics/PageControls';
import { ANALYTICS_CITIES } from '../../../src/pages/entity-analytics/queries';
import type { PeriodState } from '../../../src/pages/entity-analytics/period-state';
import { byTestId, chooseOption, mount, queryTestId, settle } from '../../dom';
import { COPY } from '../../mocks/analytics';

const value: PeriodState = { days: 30, range: null, compare: 'PREVIOUS', city: null };

const cities: MockedResponse = {
  request: { query: ANALYTICS_CITIES },
  result: {
    data: {
      analyticsCities: [
        { __typename: 'AnalyticsCity', id: 'loc-blr', name: 'Bengaluru' },
        { __typename: 'AnalyticsCity', id: 'loc-mys', name: 'Mysuru' },
      ],
    },
  },
};

const setup = async (props: Partial<Parameters<typeof PageControls>[0]> = {}, state: PeriodState = value) => {
  const onChange = vi.fn();
  await mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[cities]}>
      <PageControls value={state} onChange={onChange} {...props} />
    </MockedProvider>,
  );
  return onChange;
};

describe('PageControls', () => {
  it('shows the period and the comparison, and no city or details link, by default', async () => {
    await setup();
    expect(queryTestId('analytics-period-30')).not.toBeNull();
    expect(queryTestId('analytics-compare')).not.toBeNull();
    expect(queryTestId('analytics-city')).toBeNull();
    expect(queryTestId('analytics-page-details')).toBeNull();
  });

  it('hides the period and the comparison on a page that reads only the state of things now', async () => {
    await setup({ periodless: true });
    expect(queryTestId('analytics-period-30')).toBeNull();
    expect(queryTestId('analytics-compare')).toBeNull();
  });

  it('changes the comparison without touching the rest of the state', async () => {
    const onChange = await setup();
    await chooseOption('analytics-compare', COPY['analytics.page.compareYear']);
    expect(onChange).toHaveBeenCalledWith({ ...value, compare: 'YEAR' });
  });

  it('changes the period without touching the rest of the state', async () => {
    const onChange = await setup({}, { ...value, city: 'loc-blr' });
    byTestId('analytics-period-7').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ days: 7, range: null, compare: 'PREVIOUS', city: 'loc-blr' });
  });

  it('changes the comparison back to the period before', async () => {
    const onChange = await setup({}, { ...value, compare: 'YEAR' });
    await chooseOption('analytics-compare', COPY['analytics.page.comparePrevious']);
    expect(onChange).toHaveBeenCalledWith({ ...value, compare: 'PREVIOUS' });
  });

  it('offers the cities on a page that can be narrowed, and narrows to the one picked', async () => {
    const onChange = await setup({ cityFilter: true });
    await settle(10);
    await chooseOption('analytics-city', 'Mysuru');
    expect(onChange).toHaveBeenCalledWith({ ...value, city: 'loc-mys' });
  });

  it('clears the city when All cities is chosen again', async () => {
    const onChange = await setup({ cityFilter: true }, { ...value, city: 'loc-blr' });
    await settle(10);
    await chooseOption('analytics-city', COPY['analytics.page.allCities']);
    expect(onChange).toHaveBeenCalledWith({ ...value, city: null });
  });

  it('links to the console behind the numbers in a new tab', async () => {
    await setup({ detailsUrl: 'https://console.test/pods' });
    const link = byTestId('analytics-page-details');
    expect(link.getAttribute('href')).toBe('https://console.test/pods');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toBe(COPY['analytics.page.moreDetails']);
    expect(link.textContent).toBe(COPY['analytics.page.moreDetailsShort']);
  });

  it('shows no details link for an empty url', async () => {
    await setup({ detailsUrl: '' });
    expect(queryTestId('analytics-page-details')).toBeNull();
  });
});
