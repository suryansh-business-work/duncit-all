import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { ChoiceField, type ChoiceOption } from '@/components/ChoiceField';
import { leadDefaults, leadToForm, type LeadFormValues } from '@/features/leads/editor/values';
import { LeadForm, type LeadEditorOptions } from '@/forms/lead';
import { followUpOn } from '@/forms/lead/FollowUpField';
import { renderWithTheme } from '@/test-utils';

jest.mock('@/services/graphql.client', () => ({
  gqlRequest: jest.fn(async () => ({ crmLeadDuplicates: [] })),
}));

const opt = (...values: string[]): ChoiceOption[] =>
  values.map((value) => ({ value, label: value }));

const OPTIONS: LeadEditorOptions = {
  superCategories: [{ value: 'c1', label: 'Sports' }],
  statuses: opt('New', 'Contacted'),
  priorities: opt('Low', 'Medium', 'High'),
  venueTypes: opt('Cafe', 'Turf', 'Other'),
  users: [{ value: 'u1', label: 'Asha' }],
};

const filledVenue = (): LeadFormValues => ({
  ...leadDefaults('VENUE_LEAD'),
  super_category_id: 'c1',
  venue_name: 'Smash Arena',
  venue_types: ['Turf'],
  city: 'Pune',
  full_address: '12 MG Road, Pune',
});

describe('LeadForm (venue)', () => {
  it('asks for the other venue type only once Other is picked, as the portal requires', async () => {
    const onSubmit = jest.fn(async (_values: LeadFormValues) => undefined);
    renderWithTheme(
      <LeadForm
        kind="VENUE_LEAD"
        leadId={null}
        initial={filledVenue()}
        options={OPTIONS}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.queryByTestId('lead-venue-type-other')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-venue-types-Other'));
    expect(screen.getByTestId('lead-venue-type-other')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-save'));
    expect(await screen.findByText('Please specify the "Other" venue type')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('lead-venue-type-other'), 'Rooftop');
    fireEvent.press(screen.getByTestId('lead-venue-types-Turf'));
    fireEvent.press(screen.getByTestId('lead-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ venue_types: ['Other'], venue_type_other: 'Rooftop' }),
    );
  });

  it('adds and removes contacts, keeping at least the primary one', async () => {
    const onSubmit = jest.fn(async (_values: LeadFormValues) => undefined);
    renderWithTheme(
      <LeadForm
        kind="VENUE_LEAD"
        leadId={null}
        initial={filledVenue()}
        options={OPTIONS}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.queryByTestId('contact-remove-0')).toBeNull();
    fireEvent.press(screen.getByTestId('contact-add'));
    expect(screen.getByText('Contact 2')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('contact-1-name'), 'Mira');
    fireEvent.press(screen.getByTestId('contact-remove-0'));
    expect(screen.queryByText('Contact 2')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ contacts: [expect.objectContaining({ name: 'Mira' })] }),
    );
  });

  it('unassigns the lead and clears the follow-up, and labels Save for an existing lead', async () => {
    const onSubmit = jest.fn(async (_values: LeadFormValues) => undefined);
    const initial = leadToForm('VENUE_LEAD', {
      ...filledVenue(),
      assigned_user_id: 'u1',
      assigned_to: 'Asha',
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
    });
    renderWithTheme(
      <LeadForm
        kind="VENUE_LEAD"
        leadId="v1"
        initial={initial}
        options={OPTIONS}
        onSubmit={onSubmit}
        error="Saving failed"
      />,
    );
    expect(screen.getByText('Save changes')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-save-error')).toHaveTextContent('Saving failed');
    fireEvent.press(screen.getByTestId('lead-assignee-none'));
    fireEvent.press(screen.getByTestId('follow-up-clear'));
    expect(screen.getByTestId('follow-up-value')).toHaveTextContent('No follow-up set');
    fireEvent.press(screen.getByTestId('lead-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_user_id: '', assigned_to: '', next_follow_up_date: null }),
    );
  });
});

describe('followUpOn', () => {
  it('is the start of the day that many days ahead', () => {
    const on = new Date(followUpOn(3, new Date(2026, 10, 25, 18, 45)));
    expect([on.getFullYear(), on.getMonth(), on.getDate(), on.getHours(), on.getMinutes()]).toEqual(
      [2026, 10, 28, 0, 0],
    );
  });
});

function Picker({ options }: Readonly<{ options: ChoiceOption[] }>) {
  const { control } = useForm<{ pick: string }>({ defaultValues: { pick: '' } });
  return (
    <ChoiceField
      control={control}
      name="pick"
      label="Pick"
      options={options}
      searchLabel="Search"
      testID="pick"
    />
  );
}

describe('ChoiceField', () => {
  it('filters a long list as you type, and shows no search box for a short one', () => {
    const many = opt(...Array.from({ length: 14 }, (_, i) => `City ${i + 1}`));
    const { unmount } = renderWithTheme(<Picker options={many} />);
    fireEvent.changeText(screen.getByTestId('pick-search'), 'city 1');
    expect(screen.getByTestId('pick-City 10')).toBeOnTheScreen();
    expect(screen.queryByTestId('pick-City 2')).toBeNull();
    unmount();
    renderWithTheme(<Picker options={opt('A', 'B')} />);
    expect(screen.queryByTestId('pick-search')).toBeNull();
  });
});
