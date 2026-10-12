import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import WhatsappSendConfig from '../../src/pages/automation/builder/inspector/WhatsappSendConfig';
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
