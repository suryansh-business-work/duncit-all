import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { VenueAutoExtendForm } from '@duncit/slots';

import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { AutoExtendSection } from '../AutoExtendSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The calendar sheet is native UI; the stub shows what it was given and picks 5 Feb 2031.
jest.mock('@/components/venue-availability/DateTimePickerField', () => ({
  DateTimePickerField: ({
    testID,
    value,
    disabled,
    onChange,
  }: {
    testID: string;
    value: Date | null;
    disabled?: boolean;
    onChange: (next: Date) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    const shown = value ? `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}` : '-';
    return (
      <Pressable testID={testID} disabled={disabled} onPress={() => onChange(new Date(2031, 1, 5))}>
        <Text>{`until:${shown}:${disabled ? 'off' : 'on'}`}</Text>
      </Pressable>
    );
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const SETTINGS: VenueAutoExtendForm = {
  enabled: true,
  template_id: 'tpl1',
  horizon_days: 14,
  until: '2030-12-31',
};

const mount = (
  autoExtend: VenueAutoExtendForm = SETTINGS,
  { maxAdvanceDays = 30, hasDefaultTemplate = true } = {},
) => {
  const onSaved = jest.fn();
  renderWithProviders(
    <AutoExtendSection
      venueId="v1"
      autoExtend={autoExtend}
      maxAdvanceDays={maxAdvanceDays}
      hasDefaultTemplate={hasDefaultTemplate}
      onSaved={onSaved}
    />,
  );
  fireEvent.press(screen.getByTestId('advanced-auto-extend-toggle'));
  return { onSaved };
};

const horizon = () => screen.getByTestId('field-auto-extend-horizon');
const save = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('auto-extend-save'));
  });

beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({});
});

describe('AutoExtendSection — what shows', () => {
  it('stays collapsed until opened', () => {
    renderWithProviders(
      <AutoExtendSection
        venueId="v1"
        autoExtend={SETTINGS}
        maxAdvanceDays={30}
        hasDefaultTemplate
        onSaved={jest.fn()}
      />,
    );
    expect(screen.getByText('availability.autoExtend.title')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-extend-save')).toBeNull();
  });

  it('shows the saved settings and the advance limit', () => {
    mount();
    expect(screen.getByTestId('auto-extend-enabled-switch').props.value).toBe(true);
    expect(horizon().props.value).toBe('14');
    expect(screen.getByText('until:2030-12-31:on')).toBeOnTheScreen();
    expect(screen.getByText('availability.autoExtend.body|30')).toBeOnTheScreen();
    expect(screen.getByLabelText('availability.autoExtend.horizon|30')).toBeOnTheScreen();
  });

  it('warns that auto-extend does nothing without a default template', () => {
    mount(SETTINGS, { hasDefaultTemplate: false });
    expect(screen.getByTestId('auto-extend-no-default')).toBeOnTheScreen();
  });

  it('does not warn when a default template exists', () => {
    mount();
    expect(screen.queryByTestId('auto-extend-no-default')).toBeNull();
  });

  it('turns the horizon and stop date off, and drops the warning and clear button, when disabled', () => {
    mount({ ...SETTINGS, enabled: false }, { hasDefaultTemplate: false });
    expect(screen.getByText('until:2030-12-31:off')).toBeOnTheScreen();
    expect(screen.getByLabelText('availability.autoExtend.horizon|30').props['aria-disabled']).toBe(
      true,
    );
    expect(screen.queryByTestId('auto-extend-no-default')).toBeNull();
    expect(screen.queryByTestId('auto-extend-clear')).toBeNull();
  });

  it('shows no stop date as a dash and offers no clear button', () => {
    mount({ ...SETTINGS, until: '' });
    expect(screen.getByText('until:-:on')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-extend-clear')).toBeNull();
  });

  it('clears the stop date', () => {
    mount();
    fireEvent.press(screen.getByTestId('auto-extend-clear'));
    expect(screen.getByText('until:-:on')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-extend-clear')).toBeNull();
  });
});

describe('AutoExtendSection — saving', () => {
  it('saves the settings, keeping the template, and says so', async () => {
    const { onSaved } = mount();
    fireEvent.press(screen.getByTestId('auto-extend-until'));
    fireEvent.changeText(horizon(), '21');
    await save();
    expect(request).toHaveBeenCalledWith(
      UpdateVenueSettingsDocument,
      {
        venue_doc_id: 'v1',
        input: {
          auto_extend: {
            enabled: true,
            horizon_days: 21,
            until: '2031-02-05',
            template_id: 'tpl1',
          },
        },
      },
      { auth: true },
    );
    expect(await screen.findByTestId('auto-extend-saved')).toBeOnTheScreen();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('saves a switched-off setting with the switch value', async () => {
    mount();
    fireEvent(screen.getByTestId('auto-extend-enabled-switch'), 'valueChange', false);
    await save();
    expect(request.mock.calls[0][1].input.auto_extend.enabled).toBe(false);
  });

  it.each([
    ['empty', '', 1],
    ['zero', '0', 1],
    ['text', 'abc', 1],
    ['over the limit', '99', 30],
    ['a fraction', '7.4', 7],
  ])('keeps the horizon within 1 and the limit: %s', async (_label, typed, expected) => {
    mount();
    fireEvent.changeText(horizon(), typed);
    await save();
    expect(request.mock.calls[0][1].input.auto_extend.horizon_days).toBe(expected);
    expect(horizon().props.value).toBe(String(expected));
  });

  it('hides the saved note again as soon as anything is edited', async () => {
    mount();
    await save();
    await screen.findByTestId('auto-extend-saved');
    fireEvent.changeText(horizon(), '10');
    expect(screen.queryByTestId('auto-extend-saved')).toBeNull();
    await save();
    await screen.findByTestId('auto-extend-saved');
    fireEvent.press(screen.getByTestId('auto-extend-until'));
    expect(screen.queryByTestId('auto-extend-saved')).toBeNull();
    await save();
    await screen.findByTestId('auto-extend-saved');
    fireEvent(screen.getByTestId('auto-extend-enabled-switch'), 'valueChange', false);
    expect(screen.queryByTestId('auto-extend-saved')).toBeNull();
  });

  it('says the save failed and does not report success', async () => {
    request.mockRejectedValueOnce(new Error('boom'));
    const { onSaved } = mount();
    await save();
    expect(await screen.findByTestId('auto-extend-error')).toHaveTextContent(
      'availability.autoExtend.saveFailed',
    );
    expect(screen.queryByTestId('auto-extend-saved')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the saving label and blocks a second save while the request runs', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    mount();
    await save();
    expect(screen.getByLabelText('availability.autoExtend.saving')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-extend-save')).toBeDisabled();
    await act(async () => finish({}));
    await waitFor(() =>
      expect(screen.getByLabelText('availability.autoExtend.save')).toBeOnTheScreen(),
    );
  });

  it('clears an earlier error when saving again', async () => {
    request.mockRejectedValueOnce(new Error('boom'));
    mount();
    await save();
    await screen.findByTestId('auto-extend-error');
    await save();
    await waitFor(() => expect(screen.queryByTestId('auto-extend-error')).toBeNull());
  });
});
