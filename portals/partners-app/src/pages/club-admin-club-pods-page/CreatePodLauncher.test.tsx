import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import CreatePodLauncher from './CreatePodLauncher';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

/** Mounts the launcher and waits until the feature flag answer has been applied. */
const mount = async (autoPods: boolean) => {
  const onNormal = vi.fn();
  const sent: SentOperation[] = [];
  renderWithProviders(<CreatePodLauncher clubId="club-1" onNormal={onNormal} />, {
    link: scriptedLink(
      { PublicFeatureFlags: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'auto_pods', enabled: autoPods }] } },
      sent,
    ),
  });
  await waitFor(() => expect(sent.some((op) => op.name === 'PublicFeatureFlags')).toBe(true));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  return { onNormal };
};

const newPod = () => screen.getByRole('button', { name: 'New Pod' });

describe('CreatePodLauncher', () => {
  it('opens the ordinary editor straight away while the auto_pods flag is off', async () => {
    const { onNormal } = await mount(false);
    fireEvent.click(newPod());
    expect(onNormal).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('pod-kind-normal')).toBeNull();
  });

  it('asks which kind of pod when the flag is on, and opens the ordinary editor for a normal one', async () => {
    const { onNormal } = await mount(true);
    fireEvent.click(newPod());
    expect(onNormal).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('pod-kind-normal'));
    expect(onNormal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('pod-kind-normal')).toBeNull());
  });

  it('opens the Auto Pod editor of this club for an auto pod', async () => {
    const { onNormal } = await mount(true);
    fireEvent.click(newPod());
    fireEvent.click(await screen.findByTestId('pod-kind-auto'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1/auto-pods/new'));
    expect(onNormal).not.toHaveBeenCalled();
  });

  it('closes the question without choosing', async () => {
    const { onNormal } = await mount(true);
    fireEvent.click(newPod());
    await screen.findByTestId('pod-kind-normal');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('pod-kind-normal')).toBeNull());
    expect(onNormal).not.toHaveBeenCalled();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
});
