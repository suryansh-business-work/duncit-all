import { act, renderHook, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  refetch: vi.fn(),
  lastOptions: undefined as unknown as Record<string, unknown>,
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (_doc: unknown, options: Record<string, unknown>) => {
    m.lastOptions = options;
    return { data: m.data, loading: m.loading, error: m.error, refetch: m.refetch };
  },
}));

import { useWaCurrency } from '../../src/pages/whatsapp-page/useWaCurrency';
import {
  LOG_CAMPAIGN_PARAM,
  useLogCampaignParam,
} from '../../src/pages/whatsapp-page/useLogCampaignParam';
import {
  tallyFor,
  useWaSendCounts,
  withSendCounts,
} from '../../src/pages/whatsapp-page/wa-aisensy/useWaSendCounts';
import {
  campaignFor,
  templateFor,
  useAisensyCatalogue,
  useCampaignOptions,
} from '../../src/pages/whatsapp-page/wa-aisensy/useAisensyCatalogue';
import { useWaReach } from '../../src/pages/whatsapp-page/wa-campaign-form/useWaReach';
import { useTemplateFields } from '../../src/pages/whatsapp-page/wa-campaign-form/useTemplateFields';
import type { AisensyCampaign, AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import type { WaCampaignValues } from '../../src/pages/whatsapp-page/wa-campaign-form/wa-campaign.types';

beforeEach(() => {
  m.data = undefined;
  m.loading = false;
  m.error = undefined;
  m.refetch = vi.fn();
});

describe('useWaCurrency', () => {
  it('uses the symbol the rate card was saved with, and the rupee before it loads', () => {
    expect(renderHook(() => useWaCurrency()).result.current).toBe('₹');
    m.data = { waPricing: { currency_symbol: '$' } };
    expect(renderHook(() => useWaCurrency()).result.current).toBe('$');
  });
});

describe('useLogCampaignParam', () => {
  const mount = (url: string) =>
    renderHook(() => ({ param: useLogCampaignParam(), loc: useLocation() }), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
    });

  it('splits and trims the campaign names, dropping blanks', () => {
    const { result } = mount(`/?${LOG_CAMPAIGN_PARAM}=diwali, holi ,,eid`);
    expect(result.current.param.campaigns).toEqual(['diwali', 'holi', 'eid']);
  });

  it('is empty without the parameter', () => {
    expect(mount('/').result.current.param.campaigns).toEqual([]);
  });

  it('opens the logs tab narrowed in one URL write, then clears the narrowing', () => {
    const { result } = mount('/?other=1');
    act(() => result.current.param.openLogsFor(['a', 'b']));
    const search = new URLSearchParams(result.current.loc.search);
    expect(search.get(LOG_CAMPAIGN_PARAM)).toBe('a,b');
    expect(search.get('selectedtab')).toBe('logs');
    expect(search.get('other')).toBe('1');

    act(() => result.current.param.clear());
    const cleared = new URLSearchParams(result.current.loc.search);
    expect(cleared.has(LOG_CAMPAIGN_PARAM)).toBe(false);
    expect(cleared.get('other')).toBe('1');
  });
});

describe('send counts', () => {
  it('maps the counts by campaign name, empty before the answer', () => {
    expect(renderHook(() => useWaSendCounts()).result.current.size).toBe(0);
    m.data = { waSendCounts: [{ campaign: 'diwali', sent: 8, attempts: 10 }] };
    const counts = renderHook(() => useWaSendCounts()).result.current;
    expect(counts.get('diwali')).toEqual({ sent: 8, attempts: 10 });
  });

  it('sums several campaigns and treats an unknown name as zero', () => {
    const counts = new Map([
      ['a', { sent: 2, attempts: 3 }],
      ['b', { sent: 5, attempts: 5 }],
    ]);
    expect(tallyFor(counts, ['a', 'b', 'never'])).toEqual({ sent: 7, attempts: 8 });
    expect(tallyFor(counts, [])).toEqual({ sent: 0, attempts: 0 });
  });

  it('flattens the tally onto each row so the table can sort by it', () => {
    const counts = new Map([['a', { sent: 2, attempts: 3 }]]);
    const rows = withSendCounts([{ id: 1, c: ['a'] }, { id: 2, c: [] }], counts, (r) => r.c);
    expect(rows[0]).toMatchObject({ id: 1, sent_count: 2, attempts_count: 3, send_campaigns: ['a'] });
    expect(rows[1]).toMatchObject({ id: 2, sent_count: 0, attempts_count: 0, send_campaigns: [] });
  });
});

describe('AiSensy catalogue', () => {
  const campaign = (name: string, template = ''): AisensyCampaign =>
    ({ name, status: 'LIVE', template_name: template }) as unknown as AisensyCampaign;
  const template = (name: string): AisensyTemplate => ({ name }) as unknown as AisensyTemplate;

  it('treats an unanswered catalogue as configured and exposes empty lists', () => {
    const { result } = renderHook(() => useAisensyCatalogue({ skip: true }));
    expect(result.current.configured).toBe(true);
    expect(result.current.campaigns).toEqual([]);
    expect(m.lastOptions.skip).toBe(true);
  });

  it('reports a missing Project API configuration', () => {
    m.data = { aisensyProjectConfigured: false, aisensyCampaigns: [], aisensyTemplates: [] };
    expect(renderHook(() => useAisensyCatalogue()).result.current.configured).toBe(false);
  });

  it('offers AiSensy campaigns with their status when the Project API answers', () => {
    m.data = {
      aisensyProjectConfigured: true,
      aisensyCampaigns: [campaign('diwali')],
      aisensyTemplates: [template('t')],
    };
    const { result } = renderHook(() =>
      useCampaignOptions([{ id: '1', name: 'saved', description: 'd' } as never])
    );
    expect(result.current.live).toBe(true);
    expect(result.current.options).toEqual([{ value: 'diwali', label: 'diwali · LIVE' }]);
  });

  it('falls back to the saved names, with their description when there is one', () => {
    m.data = { aisensyProjectConfigured: false, aisensyCampaigns: [], aisensyTemplates: [] };
    const { result } = renderHook(() =>
      useCampaignOptions([
        { id: '1', name: 'saved', description: 'Festival' },
        { id: '2', name: 'bare', description: '' },
      ] as never)
    );
    expect(result.current.live).toBe(false);
    expect(result.current.options).toEqual([
      { value: 'saved', label: 'saved · Festival' },
      { value: 'bare', label: 'bare' },
    ]);
  });

  it('finds the campaign and the template behind it', () => {
    const campaigns = [campaign('diwali', 'tpl'), campaign('plain')];
    const templates = [template('tpl')];
    expect(campaignFor('diwali', campaigns)?.name).toBe('diwali');
    expect(campaignFor('nope', campaigns)).toBeNull();
    expect(templateFor('diwali', campaigns, templates)?.name).toBe('tpl');
    expect(templateFor('plain', campaigns, templates)).toBeNull();
    expect(templateFor('nope', campaigns, templates)).toBeNull();
  });
});

describe('useWaReach', () => {
  const values = (over: Partial<WaCampaignValues>): WaCampaignValues =>
    ({
      audience: 'ALL_USERS',
      audience_list_id: '',
      users: [],
      contacts: [],
      ...over,
    }) as unknown as WaCampaignValues;

  it('skips and reports nothing while the chosen source is unfilled', () => {
    for (const v of [
      values({ audience: 'AUDIENCE_LIST' }),
      values({ audience: 'SPECIFIC_USERS' }),
      values({ audience: 'MANUAL_NUMBERS' }),
    ]) {
      m.data = { waCampaignReach: 99 };
      const { result } = renderHook(() => useWaReach(v));
      expect(result.current).toBeNull();
      expect(m.lastOptions.skip).toBe(true);
    }
  });

  it('asks the server for filled sources, dropping contact names from the request', () => {
    m.data = { waCampaignReach: 42 };
    const { result } = renderHook(() =>
      useWaReach(
        values({
          audience: 'MANUAL_NUMBERS',
          contacts: [{ name: 'Asha', phone: '9000000000' }] as never,
        })
      )
    );
    expect(result.current).toBe(42);
    expect(m.lastOptions.skip).toBe(false);
    expect(
      (m.lastOptions.variables as { contacts: unknown[] }).contacts
    ).toEqual([{ name: '', phone: '9000000000' }]);
  });

  it('counts everyone for an unconditional audience and reports null before the answer', () => {
    const { result } = renderHook(() => useWaReach(values({ audience: 'ALL_USERS' })));
    expect(result.current).toBeNull();
    expect(m.lastOptions.skip).toBe(false);
  });

  it('sends the list id and user ids for those sources', () => {
    renderHook(() =>
      useWaReach(
        values({
          audience: 'SPECIFIC_USERS',
          users: [{ id: 'u1' }, { id: 'u2' }] as never,
        })
      )
    );
    expect((m.lastOptions.variables as { user_ids: string[] }).user_ids).toEqual(['u1', 'u2']);
    renderHook(() => useWaReach(values({ audience: 'AUDIENCE_LIST', audience_list_id: 'L1' })));
    expect((m.lastOptions.variables as { audience_list_id: string }).audience_list_id).toBe('L1');
  });
});

describe('useTemplateFields', () => {
  interface Form {
    template_params: { value: string }[];
    buttons: { index: number; value: string }[];
    media_required: boolean;
    media_url: string;
    media_filename: string;
  }
  const tpl = (over: Record<string, unknown>) =>
    ({
      param_count: 2,
      needs_media: true,
      cta_buttons: [{ text: 'Track', url_param: 1 }],
      ...over,
    }) as unknown as AisensyTemplate;
  const camp = { media_url: 'https://cdn.example.test/a.png', media_filename: 'a.png' } as never;

  const mount = (
    initial: Partial<Form>,
    props: { template: AisensyTemplate | null; campaign: AisensyCampaign | null; resetCount: number }
  ) =>
    renderHook(
      (p: typeof props) => {
        const form = useForm<Form>({
          defaultValues: {
            template_params: [],
            buttons: [],
            media_required: false,
            media_url: '',
            media_filename: '',
            ...initial,
          },
        });
        useTemplateFields<Form>({
          ...p,
          setValue: form.setValue,
          getValues: form.getValues,
        });
        return form;
      },
      { initialProps: props }
    );

  it('lays rows out from the template and prefills the header from the campaign', async () => {
    const { result } = mount({}, { template: tpl({}), campaign: camp, resetCount: 0 });
    await waitFor(() => expect(result.current.getValues('template_params')).toHaveLength(2));
    expect(result.current.getValues('buttons')).toEqual([{ index: 0, value: '' }]);
    expect(result.current.getValues('media_required')).toBe(true);
    expect(result.current.getValues('media_url')).toBe('https://cdn.example.test/a.png');
    expect(result.current.getValues('media_filename')).toBe('a.png');
  });

  it('carries typed values across by position when the template changes', async () => {
    const { result, rerender } = mount(
      { template_params: [{ value: 'Asha' }, { value: 'Ravi' }, { value: 'Extra' }] },
      { template: tpl({ param_count: 3 }), campaign: null, resetCount: 0 }
    );
    await waitFor(() => expect(result.current.getValues('template_params')).toHaveLength(3));
    rerender({ template: tpl({ param_count: 1 }), campaign: null, resetCount: 0 });
    await waitFor(() => expect(result.current.getValues('template_params')).toEqual([{ value: 'Asha' }]));
    rerender({ template: tpl({ param_count: 2 }), campaign: null, resetCount: 0 });
    await waitFor(() =>
      expect(result.current.getValues('template_params')).toEqual([{ value: 'Asha' }, { value: '' }])
    );
  });

  it('leaves the rows of a duplicated send alone when the template cannot be read', async () => {
    const { result } = mount(
      { template_params: [{ value: 'kept' }], media_url: 'old' },
      { template: null, campaign: camp, resetCount: 0 }
    );
    await waitFor(() =>
      expect(result.current.getValues('media_url')).toBe('https://cdn.example.test/a.png')
    );
    expect(result.current.getValues('template_params')).toEqual([{ value: 'kept' }]);
  });

  it('keeps button values by their position', async () => {
    const { result } = mount(
      { buttons: [{ index: 0, value: 'ORD-1' }] },
      { template: tpl({}), campaign: null, resetCount: 0 }
    );
    await waitFor(() => expect(result.current.getValues('buttons')).toEqual([{ index: 0, value: 'ORD-1' }]));
  });
});
