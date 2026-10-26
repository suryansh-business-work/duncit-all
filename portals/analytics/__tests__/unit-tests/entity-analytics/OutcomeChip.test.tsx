import { describe, expect, it } from 'vitest';
import OutcomeChip from '../../../src/pages/entity-analytics/OutcomeChip';
import { byTestId, mount } from '../../dom';
import { COPY } from '../../mocks/analytics';

describe('OutcomeChip', () => {
  it('says a passing check in words, with an icon', async () => {
    await mount(<OutcomeChip value={1} />);
    const chip = byTestId('analytics-outcome-passed');
    expect(chip.textContent).toBe(COPY['analytics.outcome.passed']);
    expect(chip.querySelector('svg[data-testid="CheckCircleOutlinedIcon"]')).not.toBeNull();
  });

  it('says a failing check, any value but 1, as failed', async () => {
    await mount(<OutcomeChip value={0} />);
    const chip = byTestId('analytics-outcome-failed');
    expect(chip.textContent).toBe(COPY['analytics.outcome.failed']);
    expect(chip.querySelector('svg[data-testid="ErrorOutlinedIcon"]')).not.toBeNull();
  });

  it('says a check that never ran as untested, for both null and undefined', async () => {
    await mount(<OutcomeChip value={null} />);
    expect(byTestId('analytics-outcome-untested').textContent).toBe(COPY['analytics.outcome.untested']);
    await mount(<OutcomeChip value={undefined} />);
    expect(document.querySelectorAll('[data-testid="analytics-outcome-untested"]')).toHaveLength(2);
    expect(document.querySelector('svg[data-testid="HelpOutlinedIcon"]')).not.toBeNull();
  });
});
