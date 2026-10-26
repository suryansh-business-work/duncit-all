import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';
import AutoPodMineAction from '../AutoPodMineAction';

afterEach(cleanup);

const labels = { liveNow: 'Live now', cancelled: 'Cancelled', expired: 'Expired', viewPod: 'View pod' } as AutoPodLabels;
const show = (stage: string, podHref?: string | null) =>
  render(
    <MemoryRouter>
      <AutoPodMineAction row={{ stage } as AutoPodRow} labels={labels} podHref={podHref} />
    </MemoryRouter>,
  );

describe('AutoPodMineAction', () => {
  it.each([
    ['LIVE', 'Live now'],
    ['CANCELLED', 'Cancelled'],
    ['EXPIRED', 'Expired'],
  ])('names a %s offer as %s', (stage, label) => {
    show(stage);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows nothing for an offer still collecting its partners and with no pod to open', () => {
    const { container } = show('OPEN');
    expect(container.textContent).toBe('');
  });

  it('links the finished pod, with its status chip', () => {
    show('LIVE', '/host/pods/p1');
    expect(screen.getByRole('link', { name: 'View pod' }).getAttribute('href')).toBe('/host/pods/p1');
    expect(screen.getByText('Live now')).toBeTruthy();
  });

  it('links the pod alone while the offer has no status of its own', () => {
    show('OPEN', '/host/pods/p1');
    expect(screen.getByRole('link', { name: 'View pod' })).toBeTruthy();
    expect(screen.queryByText('Live now')).toBeNull();
  });
});
