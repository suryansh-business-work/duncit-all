import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import TargetDialog from '../../../src/pages/entity-analytics/TargetDialog';
import { SET_ANALYTICS_TARGET } from '../../../src/pages/entity-analytics/queries';
import {
  targetSchema,
  toTargetValue,
  toTargetValues,
} from '../../../src/pages/entity-analytics/analytics-target';
import { byTestId, click, mount, queryTestId, settle, typeInto, waitUntil } from '../../dom';
import { COPY, kpi } from '../../mocks/analytics';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('target values', () => {
  const schema = targetSchema({ required: 'REQUIRED', invalid: 'INVALID' });
  const messages = (goal: string) => {
    const result = schema.safeParse({ goal });
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('accepts zero and any positive number, with surrounding spaces', () => {
    expect(messages('0')).toEqual([]);
    expect(messages(' 12.5 ')).toEqual([]);
  });

  it('asks for a goal when the field is empty or blank', () => {
    expect(messages('')).toEqual(['REQUIRED']);
    expect(messages('   ')).toEqual(['REQUIRED']);
  });

  it('refuses a negative number and text that is not a number', () => {
    expect(messages('-1')).toEqual(['INVALID']);
    expect(messages('abc')).toEqual(['INVALID']);
  });

  it('fills the field with the goal as set, and blank when there is none', () => {
    expect(toTargetValues(40)).toEqual({ goal: '40' });
    expect(toTargetValues(0)).toEqual({ goal: '0' });
    expect(toTargetValues(null)).toEqual({ goal: '' });
    expect(toTargetValues(undefined)).toEqual({ goal: '' });
  });

  it('reads the typed goal back as a number', () => {
    expect(toTargetValue({ goal: ' 7.5 ' })).toBe(7.5);
  });
});

describe('TargetDialog', () => {
  const save = (value: number | null, result: MockedResponse['result'] = { data: { setAnalyticsTarget: true } }): MockedResponse => ({
    request: { query: SET_ANALYTICS_TARGET, variables: { entity: 'PODS', key: 'pods_held', value } },
    result,
  });

  const open = async (goal: number | null, mocks: MockedResponse[] = []) => {
    const onClose = vi.fn();
    await mount(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <TargetDialog entity="PODS" kpi={kpi({ key: 'pods_held', target_goal: goal })} title="Pods held" onClose={onClose} />
      </MockedProvider>,
    );
    await waitUntil(() => expect(queryTestId('analytics-target-form')).not.toBeNull());
    return onClose;
  };
  const goal = () => byTestId('analytics-target-goal') as HTMLInputElement;

  it('is named for the tile and starts from the goal already set', async () => {
    await open(40);
    expect(document.body.textContent).toContain(COPY['analytics.target.dialogTitle'].replace('{tile}', 'Pods held'));
    expect(goal().value).toBe('40');
    expect(queryTestId('analytics-target-clear')).not.toBeNull();
  });

  it('starts empty and offers no removal for a tile without a goal', async () => {
    await open(null);
    expect(goal().value).toBe('');
    expect(queryTestId('analytics-target-clear')).toBeNull();
  });

  it('offers removal for a goal of zero', async () => {
    await open(0);
    expect(goal().value).toBe('0');
    expect(queryTestId('analytics-target-clear')).not.toBeNull();
  });

  it('saves the typed goal as a number, says so, and closes', async () => {
    const onClose = await open(null, [save(75)]);
    await typeInto(goal(), '75');
    await click(byTestId('analytics-target-save'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.target.saved']));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('names what is wrong and sends nothing for an empty or negative goal', async () => {
    const onClose = await open(null);
    await click(byTestId('analytics-target-save'));
    await waitUntil(() => expect(document.body.textContent).toContain(COPY['analytics.target.required']));
    await typeInto(goal(), '-3');
    await click(byTestId('analytics-target-save'));
    await waitUntil(() => expect(document.body.textContent).toContain(COPY['analytics.target.invalid']));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a refused save and stays open so nothing typed is lost', async () => {
    const onClose = await open(null, [save(75, { errors: [new GraphQLError('Not allowed')] })]);
    await typeInto(goal(), '75');
    await click(byTestId('analytics-target-save'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(goal().value).toBe('75');
  });

  it('removes the goal by sending null, says so, and closes', async () => {
    const onClose = await open(40, [save(null)]);
    await click(byTestId('analytics-target-clear'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.target.cleared']));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports a refused removal and stays open', async () => {
    const onClose = await open(40, [save(null, { errors: [new GraphQLError('Not allowed')] })]);
    await click(byTestId('analytics-target-clear'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    await settle(10);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without saving on cancel', async () => {
    const onClose = await open(40);
    const cancel = [...document.querySelectorAll('button')].find((b) => b.textContent === COPY['analytics.target.cancel']) as HTMLElement;
    await click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
