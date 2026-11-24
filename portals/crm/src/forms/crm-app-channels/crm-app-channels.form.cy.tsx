import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CrmAppChannelsForm, crmAppChannelsSchema, toCrmAppChannelsForm } from '.';

const CHANNELS = [
  { id: 'C-CRM', name: 'crm-app', is_private: false, is_member: true },
  { id: 'C-QA', name: 'crm-qa', is_private: true, is_member: false },
];

// Echoing keys keeps the messages assertable.
const schema = crmAppChannelsSchema(((key: string) => key) as Parameters<typeof crmAppChannelsSchema>[0], ['C-CRM', 'C-QA']);

describe('crmAppChannelsSchema', () => {
  it('accepts a channel the bot can see, or empty for the fallback', () => {
    expect(schema.safeParse({ production_channel: ' C-CRM ', staging_channel: '' })).toMatchObject({
      success: true,
      data: { production_channel: 'C-CRM', staging_channel: '' },
    });
  });

  it('refuses a channel that is not in the list', () => {
    const result = schema.safeParse({ production_channel: 'C-TYPO', staging_channel: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(['crm.downloadApp.settings.channelUnknown']);
  });

  it('opens on the stored channels, empty where none is set', () => {
    expect(toCrmAppChannelsForm({ production_channel: 'C-CRM', staging_channel: null })).toEqual({
      production_channel: 'C-CRM',
      staging_channel: '',
    });
  });
});

describe('CrmAppChannelsForm', () => {
  const pick = (field: string, option: string) => {
    const select = screen.getByTestId(`crm-channel-${field}`).parentElement as HTMLElement;
    fireEvent.mouseDown(within(select).getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: option }));
  };

  it('saves the chosen production and staging channels', async () => {
    const onSubmit = vi.fn();
    render(<CrmAppChannelsForm initial={{ production_channel: '', staging_channel: '' }} channels={CHANNELS} onSubmit={onSubmit} />);

    pick('production_channel', '#crm-app');
    pick('staging_channel', 'crm-qa (private)');
    fireEvent.click(screen.getByTestId('crm-channels-save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ production_channel: 'C-CRM', staging_channel: 'C-QA' });
  });

  it('warns when the bot is not in the picked channel', () => {
    render(<CrmAppChannelsForm initial={{ production_channel: '', staging_channel: 'C-QA' }} channels={CHANNELS} onSubmit={vi.fn()} />);
    expect(screen.getByText(/The Duncit bot is not in #crm-qa yet/)).toBeInTheDocument();
  });
});
