import { screen } from '@testing-library/react-native';
import type { VenueSettingsView } from '@duncit/slots';

import { useSlotTemplates } from '@/hooks/useSlotTemplates';
import { renderWithProviders } from '@/utils/test-utils';
import type { RecurringForm } from '../../recurring/recurring-form';
import { AdvancedSections } from '../AdvancedSections';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useSlotTemplates', () => ({ useSlotTemplates: jest.fn() }));

const stub = (name: string, record: jest.Mock) =>
  function Stub(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    record(props);
    return <Text>{name}</Text>;
  };
const mockRules = jest.fn();
const mockAuto = jest.fn();
const mockTemplates = jest.fn();
const mockBulk = jest.fn();
jest.mock('../VenueRulesSection', () => ({
  VenueRulesSection: (p: Record<string, unknown>) => stub('rules', mockRules)(p),
}));
jest.mock('../AutoExtendSection', () => ({
  AutoExtendSection: (p: Record<string, unknown>) => stub('auto', mockAuto)(p),
}));
jest.mock('../TemplatesSection', () => ({
  TemplatesSection: (p: Record<string, unknown>) => stub('templates', mockTemplates)(p),
}));
jest.mock('../BulkActionsSection', () => ({
  BulkActionsSection: (p: Record<string, unknown>) => stub('bulk', mockBulk)(p),
}));

const templatesMock = jest.mocked(useSlotTemplates);

const settings = (maxAdvance: number) =>
  ({
    rules: { max_advance_days: maxAdvance },
    auto_extend: { enabled: true, template_id: 't1', horizon_days: 7, until: '' },
  }) as unknown as VenueSettingsView;

const mount = (maxAdvance = 30, hasDefault = true) => {
  const create = jest.fn();
  const remove = jest.fn();
  templatesMock.mockReturnValue({
    templates: [{ id: 't1' }],
    hasDefault,
    create,
    remove,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useSlotTemplates>);
  const onVenueChanged = jest.fn();
  const onSlotsChanged = jest.fn();
  const form = { weekdays: [1] } as unknown as RecurringForm;
  const patch = jest.fn();
  renderWithProviders(
    <AdvancedSections
      venueId="v1"
      settings={settings(maxAdvance)}
      form={form}
      patch={patch}
      onVenueChanged={onVenueChanged}
      onSlotsChanged={onSlotsChanged}
    />,
  );
  return { create, remove, onVenueChanged, onSlotsChanged, form, patch };
};

beforeEach(() => jest.clearAllMocks());

describe('AdvancedSections', () => {
  it('shows the header and the four sections', () => {
    mount();
    expect(screen.getByText('availability.recurring.advancedSettings')).toBeOnTheScreen();
    for (const section of ['rules', 'auto', 'templates', 'bulk']) {
      expect(screen.getByText(section)).toBeOnTheScreen();
    }
  });

  it('reads the templates of its venue once and shares them with the sections that need them', () => {
    const { create, remove, form, patch } = mount(30, false);
    expect(templatesMock).toHaveBeenCalledWith('v1');
    expect(mockAuto.mock.calls[0][0].hasDefaultTemplate).toBe(false);
    expect(mockTemplates.mock.calls[0][0]).toMatchObject({
      venueId: 'v1',
      templates: [{ id: 't1' }],
      form,
      patch,
      onCreate: create,
      onRemove: remove,
    });
  });

  it('hands venue writes and slot writes to the right callbacks', () => {
    const { onVenueChanged, onSlotsChanged } = mount();
    expect(mockRules.mock.calls[0][0]).toMatchObject({ venueId: 'v1', onSaved: onVenueChanged });
    expect(mockAuto.mock.calls[0][0]).toMatchObject({ venueId: 'v1', onSaved: onVenueChanged });
    expect(mockBulk.mock.calls[0][0]).toMatchObject({ venueId: 'v1', onDone: onSlotsChanged });
  });

  it('gives auto-extend the venue advance limit', () => {
    mount(45);
    expect(mockAuto.mock.calls[0][0].maxAdvanceDays).toBe(45);
    expect(mockAuto.mock.calls[0][0].autoExtend).toMatchObject({ horizon_days: 7 });
  });

  it('caps the advance limit at what the server allows', () => {
    mount(5000);
    expect(mockAuto.mock.calls[0][0].maxAdvanceDays).toBeLessThanOrEqual(60);
  });
});
