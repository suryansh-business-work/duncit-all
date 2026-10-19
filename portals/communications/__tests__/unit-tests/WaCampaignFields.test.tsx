import { useEffect, type ReactNode } from 'react';
import { useForm, type Control, type FieldValues } from 'react-hook-form';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WA_AUDIENCE_HINTS } from '../../src/pages/whatsapp-page/helpers';
import type { AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import {
  emptyValues,
  type WaCampaignValues,
} from '../../src/pages/whatsapp-page/wa-campaign-form/wa-campaign.types';
import { renderWithProviders } from '../testkit';

/**
 * The campaign form's field components rendered on their own, inside a bare
 * react-hook-form host, so each one's own edge cases (rows the template does
 * not back, an empty search, a field error) can be set up directly.
 */

const m = vi.hoisted(() => ({
  search: { data: undefined as unknown, loading: false },
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => m.search,
}));
// The real picker's sectioned input cannot be typed into from jsdom; this stub
// keeps its contract — a value, an onChange with a Date or null, and the
// text-field slot props the field passes for its error.
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (props: {
    label: string;
    value: Date;
    onChange: (date: Date | null) => void;
    slotProps: { textField: { error: boolean; helperText: string } };
  }) => (
    <div>
      <label>
        {props.label}
        <input
          aria-invalid={props.slotProps.textField.error}
          value={props.value.toISOString()}
          onChange={(event) =>
            props.onChange(event.target.value ? new Date(event.target.value) : null)
          }
        />
      </label>
      <p>{props.slotProps.textField.helperText}</p>
    </div>
  ),
}));

import CtaButtonsField from '../../src/pages/whatsapp-page/wa-campaign-form/CtaButtonsField';
import ParamsField from '../../src/pages/whatsapp-page/wa-campaign-form/ParamsField';
import RecipientFields from '../../src/pages/whatsapp-page/wa-campaign-form/RecipientFields';
import ScheduleField from '../../src/pages/whatsapp-page/wa-campaign-form/ScheduleField';
import TemplateInputs from '../../src/pages/whatsapp-page/wa-campaign-form/TemplateInputs';
import UserPickerField from '../../src/pages/whatsapp-page/wa-campaign-form/UserPickerField';

interface HostProps<T extends FieldValues> {
  defaults: T;
  /** A field error to raise once mounted, the way a failed resolver would. */
  error?: { name: string; message: string };
  render: (control: Control<T>) => ReactNode;
  onValues?: (values: T) => void;
}

function Host<T extends FieldValues>({ defaults, error, render, onValues }: HostProps<T>) {
  const form = useForm<T>({ defaultValues: defaults as never });
  const values = form.watch();
  useEffect(() => {
    if (error) form.setError(error.name as never, { message: error.message });
  }, [error, form]);
  useEffect(() => {
    onValues?.(values);
  });
  return <>{render(form.control)}</>;
}

const campaignValues = (over: Partial<WaCampaignValues> = {}): WaCampaignValues => ({
  ...emptyValues(),
  ...over,
});

const template = (over: Partial<AisensyTemplate> = {}): AisensyTemplate => ({
  id: 'tpl-1',
  name: 'plain_tpl',
  status: 'APPROVED',
  category: 'MARKETING',
  language: 'en',
  body: 'Hello there',
  param_count: 0,
  header: '',
  header_format: 'TEXT',
  needs_media: false,
  footer: '',
  buttons: [],
  cta_buttons: [],
  ...over,
});

beforeEach(() => {
  m.search = { data: undefined, loading: false };
});

describe('CtaButtonsField', () => {
  it('renders a link row only for the buttons the template still has', () => {
    renderWithProviders(
      <Host
        defaults={campaignValues({
          buttons: [
            { index: 0, value: '' },
            { index: 1, value: '' },
          ],
        })}
        render={(control) => (
          <CtaButtonsField
            control={control}
            buttons={[{ text: 'Track', url: 'https://x.test/{{1}}', url_param: 1, position: 0 } as never]}
          />
        )}
      />
    );
    expect(screen.getByText('Button links')).toBeInTheDocument();
    const rows = screen.getAllByRole('textbox');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAccessibleName('Link value for “Track”');
    expect(rows[0]).toHaveAccessibleDescription('https://x.test/{{1}}');
  });
});

describe('ParamsField', () => {
  it('shows the sentence a value lands in, and no context for a value the body does not use', () => {
    renderWithProviders(
      <Host
        defaults={campaignValues({ template_params: [{ value: '' }, { value: '' }] })}
        render={(control) => (
          <ParamsField control={control} body="Hi {{1}}, welcome" hint="Per recipient" />
        )}
      />
    );
    expect(screen.getByText('Per recipient')).toBeInTheDocument();
    expect(screen.getByLabelText('Value {{1}}')).toHaveAccessibleDescription(/Hi \{\{1\}\}/);
    expect(screen.getByLabelText('Value {{2}}')).not.toHaveAccessibleDescription(/…/);
  });
});

describe('RecipientFields', () => {
  it('leaves the hint blank for an audience it does not describe', () => {
    renderWithProviders(
      <Host
        defaults={campaignValues({ audience: 'LEGACY' as never })}
        render={(control) => (
          <RecipientFields control={control} setValue={vi.fn()} audience="LEGACY" audienceLists={[]} />
        )}
      />
    );
    expect(screen.getByRole('combobox', { name: /Send to/ })).toBeInTheDocument();
    for (const hint of Object.values(WA_AUDIENCE_HINTS)) {
      expect(screen.queryByText(hint)).not.toBeInTheDocument();
    }
  });

  it('describes the chosen audience under the selector', () => {
    renderWithProviders(
      <Host
        defaults={campaignValues({ audience: 'SPECIFIC_USERS' })}
        render={(control) => (
          <RecipientFields
            control={control}
            setValue={vi.fn()}
            audience="SPECIFIC_USERS"
            audienceLists={[]}
          />
        )}
      />
    );
    expect(screen.getByText(WA_AUDIENCE_HINTS.SPECIFIC_USERS)).toBeInTheDocument();
  });
});

describe('ScheduleField', () => {
  it('stores the picked time as ISO, and clearing the picker turns the schedule off', async () => {
    const onValues = vi.fn();
    renderWithProviders(
      <Host
        defaults={campaignValues({ scheduled_at: '2030-01-01T10:00:00.000Z' })}
        onValues={onValues}
        render={(control) => <ScheduleField control={control} />}
      />
    );
    const picker = screen.getByLabelText('Send at');
    fireEvent.change(picker, { target: { value: '2030-02-03T04:05:00.000Z' } });
    await waitFor(() =>
      expect(onValues).toHaveBeenLastCalledWith(
        expect.objectContaining({ scheduled_at: '2030-02-03T04:05:00.000Z' })
      )
    );

    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '' } });
    await waitFor(() => expect(screen.queryByLabelText('Send at')).not.toBeInTheDocument());
    expect(onValues).toHaveBeenLastCalledWith(expect.objectContaining({ scheduled_at: '' }));
    expect(screen.getByRole('switch', { name: /Schedule for later/ })).not.toBeChecked();
  });

  it('shows the schedule error under the picker', async () => {
    renderWithProviders(
      <Host
        defaults={campaignValues({ scheduled_at: '2030-01-01T10:00:00.000Z' })}
        error={{ name: 'scheduled_at', message: 'Pick a time in the future' }}
        render={(control) => <ScheduleField control={control} />}
      />
    );
    expect(await screen.findByText('Pick a time in the future')).toBeInTheDocument();
    expect(screen.getByLabelText('Send at')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('TemplateInputs', () => {
  const mount = (tpl: AisensyTemplate | null, defaults = campaignValues()) =>
    renderWithProviders(
      <Host
        defaults={defaults}
        render={(control) => (
          <TemplateInputs control={control} template={tpl} campaign={null} hint="hint" />
        )}
      />
    );

  it('asks for nothing when the template has no asset, values or links', () => {
    mount(template());
    expect(screen.queryByText('Header asset')).not.toBeInTheDocument();
    expect(screen.queryByText('Template values')).not.toBeInTheDocument();
    expect(screen.queryByText('Button links')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still asks for the link when a value-less template has a dynamic button', () => {
    mount(
      template({
        cta_buttons: [{ text: 'Open', url: 'https://x.test/{{1}}', url_param: 1 }] as never,
      }),
      campaignValues({ buttons: [{ index: 0, value: '' }] })
    );
    expect(screen.getByLabelText('Link value for “Open”')).toBeInTheDocument();
    expect(screen.queryByText('Header asset')).not.toBeInTheDocument();
  });

  it('still asks for the values when a template without asset or links has variables', () => {
    mount(
      template({ body: 'Hi {{1}}', param_count: 1 }),
      campaignValues({ template_params: [{ value: '' }] })
    );
    expect(screen.getByLabelText('Value {{1}}')).toBeInTheDocument();
  });
});

describe('UserPickerField', () => {
  const mount = (defaults = campaignValues(), error?: HostProps<WaCampaignValues>['error']) =>
    renderWithProviders(
      <Host defaults={defaults} error={error} render={(control) => <UserPickerField control={control} />} />
    );

  it('prompts for a search before anything is typed', async () => {
    mount();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /People/ }));
    expect(await screen.findByText('Type a name, email or number')).toBeInTheDocument();
  });

  it('says nobody matches once a search comes back empty', async () => {
    m.search = { data: { waCampaignUserSearch: [] }, loading: false };
    mount();
    const input = screen.getByRole('combobox', { name: /People/ });
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'Zed' } });
    expect(await screen.findByText('Nobody matches that')).toBeInTheDocument();
  });

  it('labels an unnamed account by its number and a picked chip with no name by its id', async () => {
    m.search = {
      data: { waCampaignUserSearch: [{ id: 'u2', name: '', destination: '+919111111111' }] },
      loading: false,
    };
    mount(campaignValues({ users: [{ id: 'u9', name: '' }] }));
    expect(screen.getByText('u9')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: /People/ }), { target: { value: '+91' } });
    expect(await screen.findByRole('option', { name: '+919111111111' })).toBeInTheDocument();
  });

  it('shows a spinner while the search runs', () => {
    m.search = { data: undefined, loading: true };
    mount();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the field error under the picker', async () => {
    mount(campaignValues(), { name: 'users', message: 'Pick at least one person' });
    expect(await screen.findByText('Pick at least one person')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /People/ })).toHaveAttribute('aria-invalid', 'true');
  });
});
