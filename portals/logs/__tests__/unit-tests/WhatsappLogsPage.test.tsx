import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The page assembles Communications' WhatsApp log under a heading of its own.
 * The log, its actions and the campaign filter belong to the Communications
 * console, so they are stand-ins that expose what the page wired into them.
 */
const seen = vi.hoisted(() => ({
  logProps: null as null | Record<string, unknown>,
  refresh: null as null | (() => void),
  query: { data: undefined as unknown },
  queryDocument: null as unknown,
  queryOptions: null as unknown,
}));
const actions = vi.hoisted(() => ({ duplicate: 'actions-sentinel' }));
const filter = vi.hoisted(() => ({ campaigns: ['wa-1'], clear: vi.fn() }));

vi.mock('@apollo/client/react', () => ({
  useQuery: (document: unknown, options: unknown) => {
    seen.queryDocument = document;
    seen.queryOptions = options;
    return { data: seen.query.data };
  },
}));
vi.mock('@duncit/shell', () => ({ useTranslation: () => ({ t: (key: string) => `t:${key}` }) }));
vi.mock('../../src/log-pages', () => ({
  WaLogs: (props: Record<string, unknown>) => {
    seen.logProps = props;
    return null;
  },
  useWaCampaignActions: (refresh: () => void) => {
    seen.refresh = refresh;
    return actions;
  },
  useLogCampaignParam: () => filter,
}));

import WhatsappLogsPage from '../../src/pages/whatsapp-logs';
import { LOGS_WA_AUDIENCE_LISTS } from '../../src/pages/whatsapp-logs/queries';

beforeEach(() => {
  seen.logProps = null;
  seen.refresh = null;
  seen.query.data = undefined;
  seen.queryDocument = null;
  seen.queryOptions = null;
  filter.clear.mockClear();
});

describe('WhatsappLogsPage', () => {
  it('carries its own page heading', () => {
    const html = renderToStaticMarkup(<WhatsappLogsPage />);
    expect(html).toContain('<h1');
    expect(html).toContain('t:shell.nav.whatsappLogs');
  });

  it('reads the saved audience lists from the cache first, so a send to one is named in its detail', () => {
    renderToStaticMarkup(<WhatsappLogsPage />);
    expect(seen.queryDocument).toBe(LOGS_WA_AUDIENCE_LISTS);
    expect(seen.queryOptions).toEqual({ fetchPolicy: 'cache-first' });
  });

  it('gives the log no lists until they arrive', () => {
    renderToStaticMarkup(<WhatsappLogsPage />);
    expect(seen.logProps?.audienceLists).toEqual([]);
  });

  it('gives the log the lists once they have arrived', () => {
    const lists = [{ id: 'l1', name: 'Hosts', member_count: 4 }];
    seen.query.data = { audienceLists: lists };
    renderToStaticMarkup(<WhatsappLogsPage />);
    expect(seen.logProps?.audienceLists).toBe(lists);
  });

  it('wires the campaign actions, the campaign filter and the table refetch into the log', () => {
    renderToStaticMarkup(<WhatsappLogsPage />);
    expect(seen.logProps).toMatchObject({ actions, campaigns: ['wa-1'], onClearCampaigns: filter.clear });
    expect(seen.logProps?.refetchRef).toEqual({ current: null });
  });

  it('refreshes the table through its refetch once the table has registered one', () => {
    renderToStaticMarkup(<WhatsappLogsPage />);
    const refetch = vi.fn();
    (seen.logProps?.refetchRef as { current: (() => void) | null }).current = refetch;
    seen.refresh?.();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes nothing, without failing, before the table has registered a refetch', () => {
    renderToStaticMarkup(<WhatsappLogsPage />);
    expect(() => seen.refresh?.()).not.toThrow();
  });
});
