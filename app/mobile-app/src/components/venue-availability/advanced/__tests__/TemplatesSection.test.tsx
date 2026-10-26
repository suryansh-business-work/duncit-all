import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { SlotTemplate } from '@/hooks/useSlotTemplates';
import { renderWithProviders } from '@/utils/test-utils';
import type { RecurringForm } from '../../recurring/recurring-form';
import { TemplatesSection } from '../TemplatesSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const template = (
  id: string,
  patch: Record<string, unknown> = {},
  config: Record<string, unknown> = {},
) =>
  ({
    id,
    name: `Template ${id}`,
    is_default: false,
    config: {
      weekdays: [1, 2],
      start_time: '09:00',
      end_time: '11:00',
      default_price: 650,
      per_day_price: [],
      skip_weekly_off: false,
      skip_holidays: false,
      ...config,
    },
    ...patch,
  }) as unknown as SlotTemplate;

const formOf = (patch: Partial<RecurringForm> = {}): RecurringForm => ({
  startDate: null,
  endDate: null,
  weekdays: [0, 6],
  wholeDay: false,
  timeSlots: [
    { id: 'a', start: '18:00', end: '20:00' },
    { id: 'b', start: '21:00', end: '22:00' },
  ],
  spaces: [
    { label: 'Court 1', capacity: 4, price: '300', enabled: false },
    { label: 'Court 2', capacity: 8, price: '500', enabled: true },
  ],
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
  ...patch,
});

const mount = ({
  templates = [] as SlotTemplate[],
  form = formOf(),
  onCreate = jest.fn().mockResolvedValue(undefined),
  onRemove = jest.fn().mockResolvedValue(undefined),
} = {}) => {
  const patch = jest.fn();
  renderWithProviders(
    <TemplatesSection
      venueId="v1"
      templates={templates}
      form={form}
      patch={patch}
      onCreate={onCreate}
      onRemove={onRemove}
    />,
  );
  fireEvent.press(screen.getByTestId('advanced-templates-toggle'));
  return { patch, onCreate, onRemove };
};

const save = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('template-save'));
  });
const name = (value: string) =>
  fireEvent.changeText(screen.getByTestId('field-template-name'), value);

describe('TemplatesSection — the list', () => {
  it('stays collapsed until opened', () => {
    renderWithProviders(
      <TemplatesSection
        venueId="v1"
        templates={[]}
        form={formOf()}
        patch={jest.fn()}
        onCreate={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('template-save')).toBeNull();
  });

  it('lists each saved template, marking the default one', () => {
    mount({ templates: [template('t1', { is_default: true }), template('t2')] });
    expect(screen.getByText('Template t1')).toBeOnTheScreen();
    expect(screen.getByText('Template t2')).toBeOnTheScreen();
    expect(screen.getAllByText('availability.templates.default')).toHaveLength(1);
  });

  it('applies a template: its days, one time range, its price on every space and its skips', () => {
    const { patch } = mount({
      templates: [template('t1', {}, { skip_weekly_off: true, skip_holidays: false })],
    });
    fireEvent.press(screen.getByTestId('template-t1-use'));
    expect(patch).toHaveBeenCalledTimes(1);
    const applied = patch.mock.calls[0][0];
    expect(applied.weekdays).toEqual([1, 2]);
    expect(applied.timeSlots).toEqual([expect.objectContaining({ start: '09:00', end: '11:00' })]);
    expect(applied.spaces).toEqual([
      { label: 'Court 1', capacity: 4, price: '650', enabled: false },
      { label: 'Court 2', capacity: 8, price: '650', enabled: true },
    ]);
    expect(applied.skipWeeklyOff).toBe(true);
    expect(applied.skipHolidays).toBe(false);
  });

  it('does not alias the template weekdays', () => {
    const t1 = template('t1');
    const { patch } = mount({ templates: [t1] });
    fireEvent.press(screen.getByTestId('template-t1-use'));
    expect(patch.mock.calls[0][0].weekdays).not.toBe(t1.config.weekdays);
  });
});

describe('TemplatesSection — deleting', () => {
  it('deletes the chosen template', () => {
    const { onRemove } = mount({ templates: [template('t1'), template('t2')] });
    fireEvent.press(screen.getByTestId('template-t2-delete'));
    expect(onRemove).toHaveBeenCalledWith('t2');
  });

  it('says why a delete failed instead of dropping the error', async () => {
    const onRemove = jest.fn().mockRejectedValue(new Error('In use by auto-extend'));
    mount({ templates: [template('t1')], onRemove });
    fireEvent.press(screen.getByTestId('template-t1-delete'));
    expect(await screen.findByTestId('template-error')).toHaveTextContent('In use by auto-extend');
  });

  it('uses the generic sentence when the delete failure has no message', async () => {
    const onRemove = jest.fn().mockRejectedValue('boom');
    mount({ templates: [template('t1')], onRemove });
    fireEvent.press(screen.getByTestId('template-t1-delete'));
    expect(await screen.findByTestId('template-error')).toHaveTextContent(
      'availability.updateFailed',
    );
  });

  it('clears an earlier error when the next delete starts', async () => {
    const onRemove = jest
      .fn()
      .mockRejectedValueOnce(new Error('In use'))
      .mockResolvedValueOnce(undefined);
    mount({ templates: [template('t1')], onRemove });
    fireEvent.press(screen.getByTestId('template-t1-delete'));
    await screen.findByTestId('template-error');
    fireEvent.press(screen.getByTestId('template-t1-delete'));
    await waitFor(() => expect(screen.queryByTestId('template-error')).toBeNull());
  });
});

describe('TemplatesSection — saving the current setup', () => {
  it('cannot save without a name', () => {
    mount();
    expect(screen.getByTestId('template-save')).toBeDisabled();
    name('   ');
    expect(screen.getByTestId('template-save')).toBeDisabled();
    name('Weekends');
    expect(screen.getByTestId('template-save')).toBeEnabled();
  });

  it('saves the first time range and the first enabled space price, then clears the name', async () => {
    const { onCreate } = mount();
    name('  Weekends  ');
    await save();
    expect(onCreate).toHaveBeenCalledWith({
      venue_id: 'v1',
      name: 'Weekends',
      config: {
        weekdays: [0, 6],
        start_time: '18:00',
        end_time: '20:00',
        default_price: 500,
        per_day_price: [],
        skip_weekly_off: true,
        skip_holidays: true,
      },
    });
    await waitFor(() => expect(screen.getByTestId('field-template-name').props.value).toBe(''));
  });

  it('falls back to the first space when none is enabled', async () => {
    const form = formOf({
      spaces: [
        { label: 'Court 1', capacity: 4, price: '300', enabled: false },
        { label: 'Court 2', capacity: 8, price: '500', enabled: false },
      ],
    });
    const { onCreate } = mount({ form });
    name('Quiet');
    await save();
    expect(onCreate.mock.calls[0][0].config.default_price).toBe(300);
  });

  it('saves empty times and a zero price for a form with no ranges or spaces', async () => {
    const { onCreate } = mount({ form: formOf({ timeSlots: [], spaces: [] }) });
    name('Empty');
    await save();
    expect(onCreate.mock.calls[0][0].config).toMatchObject({
      start_time: '',
      end_time: '',
      default_price: 0,
    });
  });

  it('keeps the name and shows the reason when the save fails', async () => {
    const onCreate = jest.fn().mockRejectedValue(new Error('Name taken'));
    mount({ onCreate });
    name('Weekends');
    await save();
    expect(await screen.findByTestId('template-error')).toHaveTextContent('Name taken');
    expect(screen.getByTestId('field-template-name').props.value).toBe('Weekends');
  });

  it('uses the generic sentence when the failure has no message', async () => {
    const onCreate = jest.fn().mockRejectedValue(undefined);
    mount({ onCreate });
    name('Weekends');
    await save();
    expect(await screen.findByTestId('template-error')).toHaveTextContent(
      'availability.updateFailed',
    );
  });

  it('shows the saving label and blocks a second save while the request runs', async () => {
    let finish: () => void = () => undefined;
    const onCreate = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    mount({ onCreate });
    name('Weekends');
    await save();
    expect(screen.getByLabelText('availability.templates.saving')).toBeOnTheScreen();
    expect(screen.getByTestId('template-save')).toBeDisabled();
    await act(async () => finish());
    await waitFor(() =>
      expect(screen.getByLabelText('availability.templates.save')).toBeOnTheScreen(),
    );
  });
});
