import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { ColorModeProvider } from '@duncit/shell';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WaTestForm } from '../../src/pages/whatsapp-page/wa-test-form';
import { emptyValues, toTestInput, waTestSchema } from '../../src/pages/whatsapp-page/wa-test-form/wa-test.types';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({ catalogue: {} as Record<string, unknown> }));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => ({ data: m.catalogue, loading: false, error: undefined, refetch: vi.fn() }),
}));

const template = {
  id: 'tpl-1',
  name: 'order_tpl',
  status: 'APPROVED',
  category: 'UTILITY',
  language: 'en',
  body: 'Hi {{1}}',
  param_count: 1,
  header: '',
  header_format: 'TEXT',
  needs_media: false,
  footer: '',
  buttons: [],
  cta_buttons: [],
};

const mount = (over: Record<string, unknown> = {}) => {
  const h = { onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue(true) };
  renderWithProviders(<WaTestForm open busy={false} names={[]} {...h} {...over} />);
  return h;
};

beforeEach(() => {
  m.catalogue = {
    aisensyProjectConfigured: true,
    aisensyCampaigns: [
      { name: 'order_camp', status: 'Live', template_name: 'order_tpl', type: 'API', media_url: '', media_filename: '' },
    ],
    aisensyTemplates: [template],
  };
});

describe('wa-test.types', () => {
  const t = (key: string) => key;

  it('accepts a country-code number and requires a name and campaign', () => {
    const schema = waTestSchema(t);
    const base = { ...emptyValues('order_camp'), destination: '919000000000', user_name: 'Asha' };
    expect(schema.safeParse(base).success).toBe(true);
    const bad = schema.safeParse({ ...base, destination: '+91 90000', user_name: '', wa_campaign_name: '' });
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['destination', 'user_name', 'wa_campaign_name']));
  });

  it('builds the send input with trimmed values, buttons and media', () => {
    const input = toTestInput({
      ...emptyValues('order_camp'),
      destination: ' 919000000000 ',
      user_name: ' Asha ',
      template_params: [{ value: ' ORD-1 ' }],
      buttons: [{ index: 0, value: ' x ' }],
      media_url: 'https://cdn.example.test/a.png',
      media_filename: 'a.png',
    });
    expect(input).toEqual({
      wa_campaign_name: 'order_camp',
      destination: '919000000000',
      user_name: 'Asha',
      template_params: ['ORD-1'],
      media: { url: 'https://cdn.example.test/a.png', filename: 'a.png' },
      buttons: [{ index: 0, value: 'x' }],
    });
  });
});

describe('WaTestForm', () => {
  it('starts on the first AiSensy campaign and sends one test to one number', async () => {
    const h = mount();
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /WhatsApp campaign/ })).toHaveTextContent('order_camp')
    );
    fireEvent.change(screen.getByLabelText(/Destination/), { target: { value: '919000000000' } });
    fireEvent.change(screen.getByLabelText(/User name/i), { target: { value: 'Asha' } });
    fireEvent.change(await screen.findByLabelText(/Value \{\{1\}\}/), { target: { value: 'Asha' } });
    const send = screen.getByRole('button', { name: 'Send test' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await waitFor(() =>
      expect(h.onSubmit).toHaveBeenCalledWith({
        wa_campaign_name: 'order_camp',
        destination: '919000000000',
        user_name: 'Asha',
        template_params: ['Asha'],
        media: null,
        buttons: [],
      })
    );
    await waitFor(() => expect(h.onClose).toHaveBeenCalled());
  });

  it('stays open when the test did not go out', async () => {
    const h = mount({ onSubmit: vi.fn().mockResolvedValue(false) });
    fireEvent.change(screen.getByLabelText(/Destination/), { target: { value: '919000000000' } });
    fireEvent.change(screen.getByLabelText(/User name/i), { target: { value: 'Asha' } });
    fireEvent.change(await screen.findByLabelText(/Value \{\{1\}\}/), { target: { value: 'x' } });
    const send = screen.getByRole('button', { name: 'Send test' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send test' })).toBeInTheDocument());
    expect(h.onClose).not.toHaveBeenCalled();
  });

  it('rejects a number with a plus sign or spaces', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Destination/), { target: { value: '+91 900' } });
    expect(
      await screen.findByText('Country code + number, digits only (e.g. 919582998897)')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test' })).toBeDisabled();
  });

  it('prefers the campaign the test was started from', async () => {
    m.catalogue = {
      ...m.catalogue,
      aisensyCampaigns: [
        { name: 'first_camp', status: 'Live', template_name: '', type: 'API', media_url: '', media_filename: '' },
        { name: 'order_camp', status: 'Live', template_name: 'order_tpl', type: 'API', media_url: '', media_filename: '' },
      ],
    };
    mount({ campaignName: 'order_camp' });
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /WhatsApp campaign/ })).toHaveTextContent('order_camp')
    );
  });

  it('says so when there are no campaign names', async () => {
    m.catalogue = { aisensyProjectConfigured: false, aisensyCampaigns: [], aisensyTemplates: [] };
    mount();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /WhatsApp campaign/ }));
    expect(await screen.findByText(/No campaign names yet/)).toBeInTheDocument();
  });

  it('previews the campaign header asset on a media template', async () => {
    m.catalogue = {
      aisensyProjectConfigured: true,
      aisensyCampaigns: [
        {
          name: 'order_camp',
          status: 'Live',
          template_name: 'order_tpl',
          type: 'API',
          media_url: 'https://cdn.example.test/banner.png',
          media_filename: 'banner.png',
        },
      ],
      aisensyTemplates: [{ ...template, header_format: 'IMAGE', needs_media: true }],
    };
    mount();
    await waitFor(() =>
      expect(screen.getByLabelText(/Header media URL/)).toHaveValue('https://cdn.example.test/banner.png')
    );
  });

  it('renders nothing while closed and lays the form out once opened', async () => {
    const props = { busy: false, names: [], onClose: vi.fn(), onSubmit: vi.fn() };
    const view = renderWithProviders(<WaTestForm open={false} {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MemoryRouter>
              <WaTestForm open {...props} />
            </MemoryRouter>
          </LocalizationProvider>
        </ColorModeProvider>
      </MockedProvider>
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /WhatsApp campaign/ })).toHaveTextContent('order_camp')
    );
    expect(await screen.findByLabelText(/Value \{\{1\}\}/)).toHaveValue('');
  });

  it('shows the busy label and locks cancel while sending', () => {
    mount({ busy: true });
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
