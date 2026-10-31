import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The record page hands the shared host page its banner kit tabs. The shared
 * page and the banner panels are other packages' subjects, so they are
 * stand-ins that expose the props they were given.
 */
interface ExtraTab {
  value: string;
  label: string;
  render: () => ReactNode;
}
interface Host {
  id: string;
  user_id: string;
}

const captured = vi.hoisted(() => ({ extraTabs: null as null | ((host: Host) => ExtraTab[]) }));

vi.mock('@duncit/entity-consoles', () => ({
  HostDetailsPage: ({ extraTabs }: { extraTabs: (host: Host) => ExtraTab[] }) => {
    captured.extraTabs = extraTabs;
    return null;
  },
}));
vi.mock('@duncit/shell', () => ({
  useTranslation: () => ({ t: (key: string) => `t:${key}` }),
  BannerKitPanel: () => null,
  PodBannersPanel: () => null,
}));

import { BannerKitPanel, PodBannersPanel } from '@duncit/shell';
import HostRecordPage from '../../src/HostRecordPage';

const tabsFor = (host: Host): ExtraTab[] => {
  renderToStaticMarkup(<HostRecordPage />);
  if (!captured.extraTabs) throw new Error('the host page was never given its extra tabs');
  return captured.extraTabs(host);
};
const elementOf = (tab: ExtraTab | undefined): ReactElement<Record<string, unknown>> => {
  const node = tab?.render();
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error('the tab did not render an element');
  return node;
};

beforeEach(() => {
  captured.extraTabs = null;
});

describe('HostRecordPage', () => {
  it('adds Banner kit, then Banners, after the record’s own tabs', () => {
    const tabs = tabsFor({ id: 'h1', user_id: 'u1' });
    expect(tabs.map((tab) => [tab.value, tab.label])).toEqual([
      ['bannerKit', 't:shell.bannerKit.title'],
      ['banners', 't:shell.podBanners.title'],
    ]);
  });

  it("opens the host's kit as the console's record, keyed by the host", () => {
    const kit = elementOf(tabsFor({ id: 'h7', user_id: 'u7' })[0]);
    expect(kit.type).toBe(BannerKitPanel);
    expect(kit.key).toBe('h7');
    expect(kit.props).toEqual({ entity: 'HOST', mode: 'console', id: 'h7' });
  });

  it("lists the pods the host's ACCOUNT runs on Banners — the podsTable host filter is the user id", () => {
    const banners = elementOf(tabsFor({ id: 'h7', user_id: 'u7' })[1]);
    expect(banners.type).toBe(PodBannersPanel);
    expect(banners.key).toBe('h7');
    expect(banners.props).toEqual({ filter: { field: 'host_user_id', value: 'u7' } });
  });
});
