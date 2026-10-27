import { describe, expect, it } from 'vitest';
import DetailsLink from '../../../src/pages/entity-analytics/DetailsLink';
import { byTestId, mount, queryTestId } from '../../dom';
import { COPY } from '../../mocks/analytics';

describe('DetailsLink', () => {
  it('opens the console page behind a number in a new, isolated tab', async () => {
    await mount(<DetailsLink url="https://console.test/pods" testId="details" />);
    const link = byTestId('details');
    expect(link.getAttribute('href')).toBe('https://console.test/pods');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toBe(COPY['analytics.page.moreDetails']);
  });

  it('renders nothing for a number with no page behind it', async () => {
    const { container } = await mount(<DetailsLink url={null} testId="details" />);
    expect(queryTestId('details')).toBeNull();
    expect(container.innerHTML).toBe('');
    await mount(<DetailsLink testId="details" />);
    expect(queryTestId('details')).toBeNull();
  });
});
