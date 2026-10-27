import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useHostPodActionsConfig, type HostPodActionsConfig } from '@duncit/host-pod-actions';
import { podFeedbackPath, podMediaPath } from '@duncit/utils';
import HostPodActionsBridge from './HostPodActionsBridge';
import { urlConfigs } from '../config/url-configs';
import { renderWithProviders } from '../__tests__/render';

vi.mock(import('@duncit/media-picker'), async (importOriginal) => ({
  ...(await importOriginal()),
  MediaListField: ((props: { label: string; value: string; folder: string; helperText?: string; deviceOnly?: boolean }) => (
    <output data-testid="media-field">
      {JSON.stringify({ label: props.label, value: props.value, folder: props.folder, helper: props.helperText, deviceOnly: props.deviceOnly })}
    </output>
  )) as never,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

let config: HostPodActionsConfig | null = null;

/** Reads the config the bridge hands every host pod dialog beneath it. */
function Probe() {
  config = useHostPodActionsConfig();
  return null;
}

const mount = () => {
  config = null;
  renderWithProviders(
    <HostPodActionsBridge>
      <Probe />
    </HostPodActionsBridge>,
  );
  if (!config) throw new Error('the bridge supplied no config');
  return config as HostPodActionsConfig;
};

describe('HostPodActionsBridge', () => {
  it('links per-pod pages against mWeb', () => {
    expect(mount().linkBaseUrl).toBe(urlConfigs.mwebUrl);
  });

  it('opens the rating form, the pod media page and a profile on mWeb in a new tab', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    const actions = mount();
    actions.onOpenFeedback('p1');
    actions.onOpenPodMedia?.('p2');
    actions.onViewProfile('/profile/asha');
    expect(open.mock.calls).toEqual([
      [`${urlConfigs.mwebUrl}${podFeedbackPath('p1')}`, '_blank', 'noopener,noreferrer'],
      [`${urlConfigs.mwebUrl}${podMediaPath('p2')}`, '_blank', 'noopener,noreferrer'],
      [`${urlConfigs.mwebUrl}/profile/asha`, '_blank', 'noopener,noreferrer'],
    ]);
  });

  it('draws the portal’s media list field with the dialog’s props, the error as its helper text', () => {
    const actions = mount();
    renderWithProviders(
      actions.renderMediaField({ label: 'Photos', value: 'a.jpg', onChange: vi.fn(), folder: 'pods', error: 'Too many', deviceOnly: true }),
    );
    expect(JSON.parse(screen.getByTestId('media-field').textContent ?? '')).toEqual({
      label: 'Photos',
      value: 'a.jpg',
      folder: 'pods',
      helper: 'Too many',
      deviceOnly: true,
    });
  });

  it('reports a success through the one toast and lets it be dismissed', async () => {
    const actions = mount();
    act(() => actions.notifySuccess('Pod updated'));
    const alert = (await screen.findByText('Pod updated')).closest('[role="alert"]') as HTMLElement;
    expect(alert.className).toContain('MuiAlert-colorSuccess');
    fireEvent.click(alert.querySelector('button') as HTMLElement);
    await waitFor(() => expect(screen.queryByText('Pod updated')).toBeNull());
  });

  it('reports an error in the error colour, replacing the previous message', async () => {
    const actions = mount();
    act(() => actions.notifySuccess('Pod updated'));
    await screen.findByText('Pod updated');
    act(() => actions.notifyError('Could not cancel'));
    const alert = (await screen.findByText('Could not cancel')).closest('[role="alert"]') as HTMLElement;
    expect(alert.className).toContain('MuiAlert-colorError');
    expect(screen.queryByText('Pod updated')).toBeNull();
  });
});
