import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import WhatsappSendConfig from '../../src/pages/automation/builder/inspector/WhatsappSendConfig';
import TemplateParamFields from '../../src/pages/automation/builder/inspector/TemplateParamFields';
import type { WhatsappValues } from '../../src/pages/automation/builder/inspector/schemas';
import type { AutomationOptions, NodeData } from '../../src/pages/automation/types';
import { renderWithProviders } from '../testkit';
import { OPTIONS, en } from './automation-fixtures';

function Harness({ initial, options = OPTIONS, spy }: Readonly<{ initial: NodeData; options?: AutomationOptions; spy: (c: NodeData) => void }>) {
  const [config, setConfig] = useState(initial);
  return (
    <WhatsappSendConfig
      nodeId="w"
      channel="WHATSAPP"
      config={config}
      options={options}
      onChange={(next) => {
        spy(next);
        setConfig(next);
      }}
    />
  );
}

const last = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)?.[0] as NodeData;

describe('WhatsappSendConfig', () => {
  it('sizes the parameter list to the campaign template and previews the message', async () => {
    const spy = vi.fn();
    renderWithProviders(<Harness initial={{ campaign_name: 'welcome', template_params: ['Asha'] }} spy={spy} />);
    // The template takes two variables; the saved list had one, so a blank is added.
    await waitFor(() => expect(last(spy)).toMatchObject({ template_params: ['Asha', ''] }));
    expect(screen.getByLabelText(en('ai.automation.inspector.whatsapp.param', { n: 1 }))).toHaveValue('Asha');
    expect(screen.getByLabelText(en('ai.automation.inspector.whatsapp.param', { n: 2 }))).toHaveValue('');
    expect(screen.getByText(/Hi Asha, your code is \{\{2\}\}/)).toBeInTheDocument();
    expect(screen.getByText('welcome_tpl')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(en('ai.automation.inspector.whatsapp.param', { n: 2 })), { target: { value: '4821' } });
    await waitFor(() => expect(screen.getByText(/Hi Asha, your code is 4821/)).toBeInTheDocument());
    expect(last(spy)).toMatchObject({ campaign_name: 'welcome', template_params: ['Asha', '4821'] });
  });

  it('keeps a dynamic button value, and drops it when cleared', async () => {
    const spy = vi.fn();
    renderWithProviders(<Harness initial={{ campaign_name: 'welcome', template_params: ['a', 'b'] }} spy={spy} />);
    const field = await screen.findByLabelText(en('ai.automation.inspector.whatsapp.button', { n: 1 }));
    fireEvent.change(field, { target: { value: 'abc' } });
    await waitFor(() => expect(last(spy).buttons).toEqual([{ index: 0, value: 'abc' }]));
    fireEvent.change(field, { target: { value: '' } });
    await waitFor(() => expect(last(spy).buttons).toEqual([]));
  });

  it('lets a campaign name be typed that the read API never listed', async () => {
    const spy = vi.fn();
    renderWithProviders(<Harness initial={{ campaign_name: '' }} spy={spy} />);
    fireEvent.change(screen.getByLabelText(en('ai.automation.inspector.whatsapp.campaign')), { target: { value: 'custom-send' } });
    await waitFor(() => expect(last(spy)).toMatchObject({ campaign_name: 'custom-send' }));
    // Not a listed campaign, so no template to fill in — the Project API says so.
    expect(screen.getByText(en('ai.automation.inspector.whatsapp.templateUnknown'))).toBeInTheDocument();
    expect(screen.queryByText('welcome_tpl')).not.toBeInTheDocument();
  });

  it('asks for media when the campaign carries it, and warns when WhatsApp is not connected', async () => {
    const options: AutomationOptions = {
      ...OPTIONS,
      whatsapp_configured: false,
      campaigns: [{ ...OPTIONS.campaigns[0], media_url: 'https://cdn.test/a.png' }],
    };
    const spy = vi.fn();
    renderWithProviders(<Harness initial={{ campaign_name: 'welcome', media_url: '', media_filename: '' }} options={options} spy={spy} />);
    expect(screen.getByText(en('ai.automation.inspector.whatsapp.notConfigured'))).toBeInTheDocument();
    const media = await screen.findByLabelText(en('ai.automation.inspector.whatsapp.media'));
    fireEvent.change(media, { target: { value: 'https://cdn.test/b.png' } });
    await waitFor(() => expect(last(spy)).toMatchObject({ media_url: 'https://cdn.test/b.png' }));
    expect(screen.getByLabelText(en('ai.automation.inspector.whatsapp.mediaFilename'))).toBeInTheDocument();
  });

  it('shows no media fields for a text-only campaign', async () => {
    renderWithProviders(<Harness initial={{ campaign_name: 'welcome' }} spy={vi.fn()} />);
    await screen.findByText('welcome_tpl');
    expect(screen.queryByLabelText(en('ai.automation.inspector.whatsapp.media'))).not.toBeInTheDocument();
  });

  it('offers listed and saved campaign names in the dropdown', async () => {
    renderWithProviders(<Harness initial={{ campaign_name: '' }} spy={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText(en('ai.automation.inspector.whatsapp.campaign')));
    expect(await screen.findByRole('option', { name: 'welcome' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'saved-one' })).toBeInTheDocument();
  });
});

describe('WhatsappSendConfig — picking and odd saved data', () => {
  it('fills the step from a campaign picked in the dropdown', async () => {
    const spy = vi.fn();
    renderWithProviders(<Harness initial={{ campaign_name: '' }} spy={spy} />);
    fireEvent.mouseDown(screen.getByLabelText(en('ai.automation.inspector.whatsapp.campaign')));
    fireEvent.click(await screen.findByRole('option', { name: 'welcome' }));
    await waitFor(() => expect(last(spy)).toMatchObject({ campaign_name: 'welcome' }));
    // The campaign's template now decides the fields.
    expect(await screen.findByText('welcome_tpl')).toBeInTheDocument();
    expect(screen.getByLabelText(en('ai.automation.inspector.whatsapp.param', { n: 2 }))).toBeInTheDocument();
  });

  it('files a saved button value with no position under the first button', async () => {
    renderWithProviders(
      <Harness initial={{ campaign_name: 'welcome', template_params: ['a', 'b'], buttons: [{ value: 'promo' }, null, { index: 'x', value: 'z' }] }} spy={vi.fn()} />
    );
    expect(await screen.findByLabelText(en('ai.automation.inspector.whatsapp.button', { n: 1 }))).toHaveValue('promo');
  });

  it('says the template is unknown when a listed campaign points at a template that is gone', () => {
    const options: AutomationOptions = {
      ...OPTIONS,
      campaigns: [{ ...OPTIONS.campaigns[0], name: 'orphan', template_name: 'deleted_tpl' }],
    };
    renderWithProviders(<Harness initial={{ campaign_name: 'orphan' }} options={options} spy={vi.fn()} />);
    expect(screen.getByText(en('ai.automation.inspector.whatsapp.templateUnknown'))).toBeInTheDocument();
    expect(screen.queryByLabelText(en('ai.automation.inspector.whatsapp.param', { n: 1 }))).not.toBeInTheDocument();
  });

  it('marks a campaign name longer than AiSensy accepts', async () => {
    renderWithProviders(<Harness initial={{ campaign_name: '' }} spy={vi.fn()} />);
    const field = screen.getByLabelText(en('ai.automation.inspector.whatsapp.campaign'));
    fireEvent.change(field, { target: { value: 'x'.repeat(121) } });
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.queryByText(en('ai.automation.inspector.whatsapp.campaignHint'))).not.toBeInTheDocument();
  });
});

/** The fields on their own, on a form that has not been given params or buttons yet. */
function BareFields() {
  const { control, watch } = useForm<WhatsappValues>({ defaultValues: { campaign_name: 'welcome' } });
  const template = OPTIONS.templates[0];
  const dynamicButtons = template.cta_buttons.map((button, index) => ({ ...button, index }));
  return <TemplateParamFields control={control} watch={watch} template={template} paramCount={2} dynamicButtons={dynamicButtons} />;
}

describe('TemplateParamFields', () => {
  it('previews the body with its placeholders until values are typed', () => {
    renderWithProviders(<BareFields />);
    expect(screen.getByText(/Hi \{\{1\}\}, your code is \{\{2\}\}/)).toBeInTheDocument();
    expect(screen.getByText(/Duncit/)).toBeInTheDocument();
  });

  it('starts the button list from nothing when the first value is typed', async () => {
    renderWithProviders(<BareFields />);
    const field = screen.getByLabelText(en('ai.automation.inspector.whatsapp.button', { n: 1 }));
    expect(field).toHaveValue('');
    fireEvent.change(field, { target: { value: 'ref-42' } });
    await waitFor(() => expect(field).toHaveValue('ref-42'));
  });

  it('draws nothing without a template', () => {
    function NoTemplate() {
      const { control, watch } = useForm<WhatsappValues>();
      return <TemplateParamFields control={control} watch={watch} template={null} paramCount={0} dynamicButtons={[]} />;
    }
    renderWithProviders(<NoTemplate />);
    expect(screen.queryByText(en('ai.automation.inspector.whatsapp.preview'))).not.toBeInTheDocument();
  });
});
