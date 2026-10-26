import { describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { TargetButton, TargetLine } from '../../../src/pages/entity-analytics/KpiTarget';
import { byTestId, click, mount, queryTestId, waitUntil } from '../../dom';
import { COPY, kpi } from '../../mocks/analytics';

const line = async (over: Parameters<typeof kpi>[0]) => {
  await mount(<TargetLine kpi={kpi({ key: 'pods_held', ...over })} />);
  return queryTestId('analytics-kpi-target-pods-held');
};

describe('TargetLine', () => {
  it('draws nothing for a tile with no goal, whether null or absent', async () => {
    expect(await line({ target: null })).toBeNull();
    expect(await line({ target: undefined })).toBeNull();
  });

  it('shows progress in words, with a check icon and "met" once a rise-is-good tile reaches its goal', async () => {
    const el = await line({ value: 120, target: 100, higher_is_better: true });
    expect(el?.textContent).toBe(`${COPY['analytics.target.progress'].replace('{target}', '100').replace('{percent}', '120%')}${COPY['analytics.target.met']}`);
    expect(el?.querySelector('svg[data-testid="CheckCircleOutlineOutlinedIcon"]')).not.toBeNull();
  });

  it('shows progress without a status while a rise-is-good tile is still short of its goal', async () => {
    const el = await line({ value: 50, target: 200, higher_is_better: true });
    expect(el?.textContent).toBe(COPY['analytics.target.progress'].replace('{target}', '200').replace('{percent}', '25%'));
    expect(el?.querySelector('svg')).toBeNull();
  });

  it('reads a zero goal on a rise-is-good tile as already there', async () => {
    const el = await line({ value: 0, target: 0, higher_is_better: true });
    expect(el?.textContent).toContain(COPY['analytics.target.progress'].replace('{target}', '0').replace('{percent}', '100%'));
    expect(el?.textContent).toContain(COPY['analytics.target.met']);
  });

  it('states a ceiling for a lower-is-better tile, and says met while under it', async () => {
    const el = await line({ value: 4, target: 6, higher_is_better: false, format: 'PERCENT' });
    expect(el?.textContent).toBe(`${COPY['analytics.target.ceiling'].replace('{target}', '6%')}${COPY['analytics.target.met']}`);
  });

  it('says "over the goal" once a lower-is-better tile passes its ceiling', async () => {
    const el = await line({ value: 9, target: 6, higher_is_better: false, format: 'PERCENT' });
    expect(el?.textContent).toBe(`${COPY['analytics.target.ceiling'].replace('{target}', '6%')}${COPY['analytics.target.over']}`);
    expect(el?.querySelector('svg')).toBeNull();
  });

  it('keys its test id on the tile key with dashes', async () => {
    await mount(<TargetLine kpi={kpi({ key: 'fill_rate', target: 10 })} />);
    expect(queryTestId('analytics-kpi-target-fill-rate')).not.toBeNull();
  });
});

describe('TargetButton', () => {
  const render = (over: Parameters<typeof kpi>[0]) =>
    mount(
      <MockedProvider mocks={[]}>
        <TargetButton entity="PODS" kpi={kpi({ key: 'pods_held', ...over })} title="Pods held" />
      </MockedProvider>,
    );
  const button = () => byTestId('analytics-kpi-target-button-pods-held');

  it('offers to set a goal on a tile without one', async () => {
    await render({ target_goal: null });
    expect(button().getAttribute('aria-label')).toBe(COPY['analytics.target.set']);
  });

  it('offers to change the goal on a tile that has one, including a goal of zero', async () => {
    await render({ target_goal: 0 });
    expect(button().getAttribute('aria-label')).toBe(COPY['analytics.target.edit']);
  });

  it('treats an absent goal like no goal', async () => {
    await render({ target_goal: undefined });
    expect(button().getAttribute('aria-label')).toBe(COPY['analytics.target.set']);
  });

  it('opens the goal dialog for the tile and closes it again on cancel', async () => {
    await render({ target_goal: 40 });
    expect(queryTestId('analytics-target-form')).toBeNull();
    await click(button());
    await waitUntil(() => expect(queryTestId('analytics-target-form')).not.toBeNull());
    expect(document.body.textContent).toContain(COPY['analytics.target.dialogTitle'].replace('{tile}', 'Pods held'));
    const cancel = [...document.querySelectorAll('button')].find((b) => b.textContent === COPY['analytics.target.cancel']) as HTMLElement;
    await click(cancel);
    await waitUntil(() => expect(queryTestId('analytics-target-form')).toBeNull());
  });
});
