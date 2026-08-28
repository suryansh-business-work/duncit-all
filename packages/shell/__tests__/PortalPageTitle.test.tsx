/**
 * Names the browser tab after the page being shown, derived from the same
 * breadcrumb trail the portal already computes — walking back past an opaque
 * id segment to the nearest real label, and back to the product name at the
 * root of the trail.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const crumbsState = vi.hoisted(() => ({ value: [] as { label: string }[] }));
const pageMeta = vi.hoisted(() => vi.fn());

vi.mock('@duncit/app-settings', () => ({ usePageMeta: pageMeta }));
vi.mock('@duncit/breadcrumb', () => ({
  ID_CRUMB_LABEL: '…',
  useBreadcrumbOverride: () => undefined,
  useCrumbs: () => crumbsState.value,
}));

import PortalPageTitle from '../src/chrome/PortalPageTitle';

describe('PortalPageTitle', () => {
  it('titles the tab with the product name on the landing page (no real crumb yet)', () => {
    crumbsState.value = [];
    render(<PortalPageTitle nav={[]} shortName="Support" appName="Duncit Support" />);

    expect(pageMeta).toHaveBeenCalledWith({ title: 'Duncit Support', appName: 'Duncit Support' });
  });

  it('titles the tab with the product name when the only crumb is the root itself', () => {
    crumbsState.value = [{ label: 'Support' }];
    render(<PortalPageTitle nav={[]} shortName="Support" appName="Duncit Support" />);

    expect(pageMeta).toHaveBeenCalledWith({ title: 'Duncit Support', appName: 'Duncit Support' });
  });

  it('titles the tab with the page, once there is a real one', () => {
    crumbsState.value = [{ label: 'Support' }, { label: 'Tickets' }];
    render(<PortalPageTitle nav={[]} shortName="Support" appName="Duncit Support" />);

    expect(pageMeta).toHaveBeenCalledWith({ title: 'Tickets', appName: 'Duncit Support' });
  });

  it('walks back past an opaque id segment to the nearest real label', () => {
    crumbsState.value = [{ label: 'Support' }, { label: 'Tickets' }, { label: '…' }];
    render(<PortalPageTitle nav={[]} shortName="Support" appName="Duncit Support" />);

    expect(pageMeta).toHaveBeenCalledWith({ title: 'Tickets', appName: 'Duncit Support' });
  });
});
