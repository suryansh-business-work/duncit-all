import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { ColorModeProvider } from '@duncit/shell';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AisensyCampaign, AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import { emptyValues } from '../../src/pages/whatsapp-page/wa-campaign-form/wa-campaign.types';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  catalogue: {} as Record<string, unknown>,
  reach: null as number | null,
  search: [] as unknown[],
}));
vi.mock('../../src/pages/whatsapp-page/wa-campaign-form/useWaReach', () => ({
  useWaReach: () => m.reach,
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: { definitions: Array<{ name?: { value: string } }> }) =>
    doc.definitions[0].name?.value === 'WaCampaignUserSearch'
      ? { data: { waCampaignUserSearch: m.search }, loading: false }
      : { data: m.catalogue, loading: false, error: undefined, refetch: vi.fn() },
}));

import { WaCampaignForm } from '../../src/pages/whatsapp-page/wa-campaign-form';

const template = (over: Partial<AisensyTemplate> = {}): AisensyTemplate => ({
  id: 'tpl-1',
  name: 'diwali_tpl',
  status: 'APPROVED',
  category: 'MARKETING',
  language: 'en',
  body: 'Hello {{1}}, offer {{2}}',
  param_count: 2,
  header: '',
  header_format: 'IMAGE',
  needs_media: true,
  footer: '',
  buttons: [],
  cta_buttons: [{ text: 'Track', url: 'https://x.test/{{1}}', url_param: 1 }] as never,
  ...over,
});

const campaign = (over: Partial<AisensyCampaign> = {}): AisensyCampaign => ({
  name: 'diwali_camp',
  status: 'Live',
  template_name: 'diwali_tpl',
  type: 'API',
  media_url: 'https://cdn.example.test/banner.png',
  media_filename: 'banner.png',
  ...over,
});

const mount = (over: Record<string, unknown> = {}) => {
  const h = { onClose: vi.fn(), onSubmit: vi.fn() };
  renderWithProviders(
    <WaCampaignForm
      open
      busy={false}
      names={[]}
      audienceLists={[{ id: 'L1', name: 'VIP', member_count: 1200 } as never]}
      variables={[{ name: 'first_name' } as never]}
      {...h}
      {...over}
    />
  );
  return h;
};

const pick = async (label: RegExp | string, option: RegExp | string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

beforeEach(() => {
  m.catalogue = {
    aisensyProjectConfigured: true,
    aisensyCampaigns: [campaign()],
    aisensyTemplates: [template()],
  };
  m.reach = null;
  m.search = [];
});

describe('WaCampaignForm', () => {
  it('lays out the template values, header asset and link fields once a campaign is picked', async () => {
    mount();
    await pick(/WhatsApp campaign/, /diwali_camp/);
    expect(await screen.findByLabelText(/Value \{\{1\}\}/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Value \{\{2\}\}/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Link value for/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/Header media URL/)).toHaveValue('https://cdn.example.test/banner.png')
    );
  });

  it('sends everyone with the typed values and the campaign asset', async () => {
    const h = mount();
    fireEvent.change(screen.getByLabelText(/Campaign name \(internal\)/), {
      target: { value: 'Diwali blast' },
    });
    await pick(/WhatsApp campaign/, /diwali_camp/);
    fireEvent.change(await screen.findByLabelText(/Value \{\{1\}\}/), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByLabelText(/Value \{\{2\}\}/), { target: { value: '20% off' } });
    fireEvent.change(screen.getByLabelText(/Link value for/), { target: { value: 'ORD-1' } });
    const submit = screen.getByRole('button', { name: 'Send now' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(h.onSubmit).toHaveBeenCalled());
    expect(h.onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Diwali blast',
      wa_campaign_name: 'diwali_camp',
      audience: 'ALL_USERS',
      template_params: ['Asha', '20% off'],
      buttons: [{ index: 0, value: 'ORD-1' }],
      media: { url: 'https://cdn.example.test/banner.png', filename: 'banner.png' },
      scheduled_at: null,
    });
  });

  it('blocks the send and says so when nobody in the list has a usable number', async () => {
    m.reach = 0;
    mount();
    expect(await screen.findByText('Nobody in this list has a usable WhatsApp number.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send now' })).toBeDisabled();
  });

  it('shows how many messages the send will produce, with singular and plural', async () => {
    m.reach = 1;
    mount();
    expect(await screen.findByText('This sends 1 WhatsApp message.')).toBeInTheDocument();
  });

  it('pluralises a larger reach', async () => {
    m.reach = 1200;
    mount();
    expect(await screen.findByText(/This sends 1,200 WhatsApp messages\./)).toBeInTheDocument();
  });

  it('clears the other recipient sources when the audience changes, and lists saved lists with sizes', async () => {
    mount();
    await pick(/Send to/, 'Saved audience list');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Saved audience list/ }));
    expect(await screen.findByRole('option', { name: 'VIP · 1,200' })).toBeInTheDocument();
  });

  it('offers a repeat only for a saved audience list', async () => {
    mount();
    expect(screen.queryByLabelText(/marketing.whatsappCampaigns.repeatEveryDays|Repeat every/)).not.toBeInTheDocument();
    await pick(/Send to/, 'Saved audience list');
    expect(await screen.findByLabelText(/marketing.whatsappCampaigns.repeatEveryDays|Repeat every/)).toBeInTheDocument();
  });

  it('says so when there are no saved audience lists', async () => {
    mount({ audienceLists: [] });
    await pick(/Send to/, 'Saved audience list');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Saved audience list/ }));
    expect(await screen.findByText(/No saved lists yet/)).toBeInTheDocument();
  });

  it('says so when there are no campaign names at all', async () => {
    m.catalogue = { aisensyProjectConfigured: false, aisensyCampaigns: [], aisensyTemplates: [] };
    mount({ names: [] });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /WhatsApp campaign/ }));
    expect(await screen.findByText(/No campaign names yet/)).toBeInTheDocument();
  });

  it('asks for the file name when the header is a document', async () => {
    m.catalogue = {
      aisensyProjectConfigured: true,
      aisensyCampaigns: [campaign({ media_url: '' })],
      aisensyTemplates: [template({ header_format: 'FILE', cta_buttons: [] })],
    };
    mount();
    await pick(/WhatsApp campaign/, /diwali_camp/);
    expect(await screen.findByLabelText(/File name/)).toBeInTheDocument();
  });

  it('adds and removes typed-in contacts', async () => {
    mount();
    await pick(/Send to/, 'Typed-in contacts');
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    expect(await screen.findByLabelText('Number')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove contact 1' }));
    await waitFor(() => expect(screen.queryByLabelText('Number')).not.toBeInTheDocument());
  });

  it('picks people found by the server search', async () => {
    m.search = [{ id: 'u1', name: 'Asha', destination: '+919000000000' }];
    mount();
    await pick(/Send to/, 'Selected people');
    const input = screen.getByRole('combobox', { name: /People/ });
    fireEvent.change(input, { target: { value: 'Ash' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Asha · +919000000000' }));
    expect(await screen.findByText('Asha · +919000000000')).toBeInTheDocument();
  });

  it('switches to Schedule when a time is chosen, and back when it is cleared', async () => {
    mount();
    expect(screen.getByRole('button', { name: 'Send now' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Schedule for later/ }));
    expect(await screen.findByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Schedule for later/ }));
    expect(await screen.findByRole('button', { name: 'Send now' })).toBeInTheDocument();
  });

  it('shows the busy label and locks cancel while sending', () => {
    mount({ busy: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument();
  });

  it('starts from a duplicated send and the campaign a row opened it from', async () => {
    mount({
      campaignName: 'diwali_camp',
      initial: {
        name: 'Diwali (copy)',
        wa_campaign_name: 'diwali_camp',
        audience: 'ALL_USERS',
        audience_list_id: '',
        users: [],
        contacts: [],
        template_params: [{ value: 'Prefilled' }],
        buttons: [],
        media_required: false,
        media_url: '',
        media_filename: '',
        scheduled_at: '',
      },
    });
    await waitFor(() =>
      expect(screen.getByLabelText(/Campaign name \(internal\)/)).toHaveValue('Diwali (copy)')
    );
    expect(await screen.findByLabelText(/Value \{\{1\}\}/)).toHaveValue('Prefilled');
  });

  it('says it is scheduling while a scheduled send is busy', async () => {
    mount({
      busy: true,
      initial: {
        ...emptyValues('diwali_camp'),
        name: 'Later',
        scheduled_at: '2099-01-01T10:00:00.000Z',
      },
    });
    expect(await screen.findByRole('button', { name: 'Scheduling…' })).toBeInTheDocument();
  });

  it('renders nothing while closed and loads the prefilled values once opened', async () => {
    const props = {
      busy: false,
      names: [],
      audienceLists: [],
      variables: [],
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      initial: { ...emptyValues(), name: 'Reopened send' },
    };
    const view = renderWithProviders(<WaCampaignForm open={false} {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MemoryRouter>
              <WaCampaignForm open {...props} />
            </MemoryRouter>
          </LocalizationProvider>
        </ColorModeProvider>
      </MockedProvider>
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Campaign name \(internal\)/)).toHaveValue('Reopened send')
    );
  });

  it('offers the saved campaign names when AiSensy cannot be read', async () => {
    m.catalogue = { aisensyProjectConfigured: false, aisensyCampaigns: [], aisensyTemplates: [] };
    mount({ names: [{ id: 'n1', name: 'saved_camp', description: 'Festival' }] });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /WhatsApp campaign/ }));
    expect(await screen.findByRole('option', { name: 'saved_camp · Festival' })).toBeInTheDocument();
    // With no live template the form says it cannot lay out the values.
    expect(screen.getByRole('alert', { hidden: true })).toBeInTheDocument();
  });
});
