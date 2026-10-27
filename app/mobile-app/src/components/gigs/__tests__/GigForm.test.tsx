import { act, fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import {
  emptyGigJobValues,
  type FreelancerFormValues,
  type GigCategory,
  type GigJobFormValues,
} from '@duncit/utils';

import { renderWithProviders } from '@/utils/test-utils';
import { FreelancerFormFields } from '../FreelancerFormFields';
import { GigContactFields } from '../gig-form/GigContactFields';
import { GigDateField } from '../gig-form/GigDateField';
import { GigWhatFields } from '../gig-form/GigWhatFields';
import { GigWhenWhereFields } from '../gig-form/GigWhenWhereFields';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDay: (key: string) => `day:${key}`,
    datePlaceholder: 'dd/mm/yyyy',
    toIsoDay: (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  }),
}));
const mockSheet = jest.fn();
jest.mock('@/components/create-pod/DateTimeSheet', () => ({
  CalendarSheet: (props: { onDone: (picked: Date) => void; [key: string]: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockSheet(props);
    return (
      <Pressable
        testID="calendar-done"
        onPress={() => props.onDone(new Date(2031, 1, 5, 17, 45))}
      />
    );
  },
}));
const mockPicker = jest.fn();
jest.mock('@/components/LocationPickerField/LocationPickerField', () => ({
  LocationPickerField: (props: {
    onChange: (locationId: string, locality: string) => void;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockPicker(props);
    return <Pressable testID="pick-city" onPress={() => props.onChange('loc9', 'Hazratganj')} />;
  },
}));

const CATEGORIES: GigCategory[] = [
  { id: 'cat1', title: 'Music', examples: ['DJ', 'MC'] },
  { id: 'cat2', title: 'Food', examples: ['Chef', 'DJ'] },
];

let formHandle: ReturnType<typeof useForm<GigJobFormValues>> | null = null;
let freelancerHandle: ReturnType<typeof useForm<FreelancerFormValues>> | null = null;

function WhatHost({
  posterRoles = ['HOST', 'VENUE_OWNER'] as const,
  start = {} as Partial<GigJobFormValues>,
}) {
  const form = useForm<GigJobFormValues>({
    defaultValues: { ...emptyGigJobValues(null), ...start },
  });
  formHandle = form;
  return (
    <GigWhatFields
      control={form.control}
      getValues={form.getValues}
      setValue={form.setValue}
      categories={CATEGORIES}
      posterRoles={posterRoles}
    />
  );
}

function WhenWhereHost() {
  const form = useForm<GigJobFormValues>({ defaultValues: emptyGigJobValues(null) });
  formHandle = form;
  return <GigWhenWhereFields control={form.control} />;
}

function ContactHost() {
  const form = useForm<GigJobFormValues>({
    defaultValues: {
      ...emptyGigJobValues(null),
      contact_name: 'Asha',
      contact_phone: '+91 99999 00000',
      contact_email: 'asha@x.com',
    },
  });
  formHandle = form;
  return <GigContactFields control={form.control} />;
}

function FreelancerHost() {
  const form = useForm<FreelancerFormValues>({
    defaultValues: {
      display_name: 'Ravi',
      category_ids: ['cat1'],
      skills: [],
      location_id: 'loc1',
      locality: '',
      bio: '',
      portfolio_url: '',
      experience_years: '2',
      contact_phone: '+91 99999 00000',
      contact_email: '',
      is_available: true,
    },
  });
  freelancerHandle = form;
  return <FreelancerFormFields control={form.control} categories={CATEGORIES} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  formHandle = null;
  freelancerHandle = null;
});

describe('GigDateField', () => {
  const mount = (props: Partial<React.ComponentProps<typeof GigDateField>> = {}) => {
    const onChange = jest.fn();
    renderWithProviders(
      <GigDateField
        label="Event date"
        hint="Optional"
        value=""
        onChange={onChange}
        minDate={new Date(2030, 0, 1)}
        {...props}
      />,
    );
    return onChange;
  };

  it('shows the date placeholder until a day is picked, and the day once it is', () => {
    const { unmount } = renderWithProviders(
      <GigDateField label="Event date" hint="h" value="" onChange={jest.fn()} minDate={null} />,
    );
    expect(screen.getByText('dd/mm/yyyy')).toBeOnTheScreen();
    unmount();
    mount({ value: '2030-02-14' });
    expect(screen.getByText('day:2030-02-14')).toBeOnTheScreen();
  });

  it('shows the hint, and the error in its place when there is one', () => {
    const { unmount } = renderWithProviders(
      <GigDateField
        label="Event date"
        hint="Optional"
        value=""
        onChange={jest.fn()}
        minDate={null}
      />,
    );
    expect(screen.getByText('Optional')).toBeOnTheScreen();
    unmount();
    mount({ error: 'Pick a day' });
    expect(screen.getByText('Pick a day')).toBeOnTheScreen();
    expect(screen.queryByText('Optional')).toBeNull();
  });

  it('opens a calendar limited to the allowed days, starting on the saved day', () => {
    const minDate = new Date(2030, 0, 1);
    const maxDate = new Date(2030, 5, 1);
    mount({ value: '2030-02-14', minDate, maxDate });
    expect(mockSheet).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('gig-form-date-open'));
    const props = mockSheet.mock.calls[0][0];
    expect(props.initial).toEqual(new Date('2030-02-14T12:00:00'));
    expect(props).toMatchObject({ minDateTime: minDate, maxDate, showTime: false });
  });

  it('starts the calendar on the earliest day when nothing is picked, and has no latest day by default', () => {
    const minDate = new Date(2030, 0, 1);
    mount({ minDate });
    fireEvent.press(screen.getByTestId('gig-form-date-open'));
    expect(mockSheet.mock.calls[0][0]).toMatchObject({ initial: minDate, maxDate: null });
  });

  it('answers the picked day as yyyy-MM-dd and closes the calendar', async () => {
    const onChange = mount();
    fireEvent.press(screen.getByTestId('gig-form-date-open'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-done'));
    });
    expect(onChange).toHaveBeenCalledWith('2031-02-05');
    expect(screen.queryByTestId('calendar-done')).toBeNull();
  });

  it('answers nothing when the calendar is dismissed', async () => {
    const onChange = mount();
    fireEvent.press(screen.getByTestId('gig-form-date-open'));
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText('mweb.common.close')[0] as never);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the caller test id', () => {
    mount({ testID: 'custom-date' });
    expect(screen.getByTestId('custom-date-open')).toBeOnTheScreen();
  });
});

describe('GigContactFields', () => {
  it('shows the contact the interested freelancer receives, prefilled', () => {
    renderWithProviders(<ContactHost />);
    expect(screen.getByRole('heading', { name: 'gigJobs.form.contactSection' })).toBeOnTheScreen();
    expect(screen.getByLabelText('gigJobs.form.contactName').props.value).toBe('Asha');
    expect(screen.getByLabelText('gigJobs.form.contactPhone').props.value).toBe('+91 99999 00000');
    expect(screen.getByLabelText('gigJobs.form.contactEmail').props.value).toBe('asha@x.com');
    expect(screen.getByTestId('gig-contact-notice')).toBeOnTheScreen();
  });

  it('writes edits into the form', () => {
    renderWithProviders(<ContactHost />);
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.contactName'), 'Bo');
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.contactPhone'), '+91 11111 22222');
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.contactEmail'), 'bo@x.com');
    expect(formHandle?.getValues()).toMatchObject({
      contact_name: 'Bo',
      contact_phone: '+91 11111 22222',
      contact_email: 'bo@x.com',
    });
  });
});

describe('GigWhatFields', () => {
  it('offers the roles this poster may post as, the categories, and asks for a category first', () => {
    renderWithProviders(<WhatHost />);
    expect(screen.getByTestId('gig-form-role-HOST')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-form-role-VENUE_OWNER')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-form-category-cat1')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-form-roles-hint')).toHaveTextContent(
      'gigJobs.form.pickCategoryFirst',
    );
    expect(screen.queryByTestId('gig-form-roles-DJ')).toBeNull();
  });

  it('sets the poster role', () => {
    renderWithProviders(<WhatHost />);
    fireEvent.press(screen.getByTestId('gig-form-role-VENUE_OWNER'));
    expect(formHandle?.getValues('poster_role')).toBe('VENUE_OWNER');
  });

  it('offers a category roles once it is picked, with the matching hint', async () => {
    renderWithProviders(<WhatHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-form-category-cat1'));
    });
    expect(formHandle?.getValues('category_id')).toBe('cat1');
    expect(screen.getByTestId('gig-form-roles-hint')).toHaveTextContent('gigJobs.form.rolesHint');
    expect(screen.getByTestId('gig-form-roles-DJ')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-form-roles-MC')).toBeOnTheScreen();
  });

  it('picks roles', async () => {
    renderWithProviders(<WhatHost start={{ category_id: 'cat1' }} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-form-roles-DJ'));
    });
    expect(formHandle?.getValues('roles')).toEqual(['DJ']);
  });

  it('drops the roles the new category does not offer, as it is picked', async () => {
    renderWithProviders(<WhatHost start={{ category_id: 'cat1', roles: ['DJ', 'MC'] }} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-form-category-cat2'));
    });
    expect(formHandle?.getValues('roles')).toEqual(['DJ']);
  });

  it('keeps every role when the new category still offers them all', async () => {
    renderWithProviders(<WhatHost start={{ category_id: 'cat1', roles: ['DJ'] }} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-form-category-cat2'));
    });
    expect(formHandle?.getValues('roles')).toEqual(['DJ']);
  });

  it('writes the title and the description', () => {
    renderWithProviders(<WhatHost />);
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.title'), 'Wedding DJ');
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.description'), 'Two hours');
    expect(formHandle?.getValues()).toMatchObject({
      title: 'Wedding DJ',
      description: 'Two hours',
    });
  });

  it('shows the validation error of a field', async () => {
    renderWithProviders(<WhatHost />);
    await act(async () => {
      formHandle?.setError('category_id', { message: 'Pick a category' });
      formHandle?.setError('poster_role', { message: 'Pick a role' });
      formHandle?.setError('roles', { message: 'Pick a gig role' });
    });
    expect(screen.getByText('Pick a category')).toBeOnTheScreen();
    expect(screen.getByText('Pick a role')).toBeOnTheScreen();
    expect(screen.getByText('Pick a gig role')).toBeOnTheScreen();
  });
});

describe('GigWhenWhereFields', () => {
  it('offers the event types and starts on an event', () => {
    renderWithProviders(<WhenWhereHost />);
    expect(screen.getByTestId('gig-form-type-EVENT').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('gig-form-type-WORKSHOP').props['aria-checked']).toBe(false);
  });

  it('sets the event type', () => {
    renderWithProviders(<WhenWhereHost />);
    fireEvent.press(screen.getByTestId('gig-form-type-WORKSHOP'));
    expect(formHandle?.getValues('event_type')).toBe('WORKSHOP');
  });

  it('picks the event day from the calendar', async () => {
    renderWithProviders(<WhenWhereHost />);
    fireEvent.press(screen.getByTestId('gig-form-date-open'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-done'));
    });
    expect(formHandle?.getValues('event_date')).toBe('2031-02-05');
    expect(mockSheet.mock.calls[0][0].minDateTime).toBeInstanceOf(Date);
  });

  it('writes the city and the area together', async () => {
    renderWithProviders(<WhenWhereHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-city'));
    });
    expect(formHandle?.getValues()).toMatchObject({ location_id: 'loc9', locality: 'Hazratganj' });
    expect(mockPicker.mock.calls[0][0]).toMatchObject({ testID: 'gig-form', required: true });
  });

  it('writes the venue line, the budget and the openings', () => {
    renderWithProviders(<WhenWhereHost />);
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.location'), 'Taj Hotel');
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.budget'), '25000');
    fireEvent.changeText(screen.getByLabelText('gigJobs.form.openings'), '3');
    expect(formHandle?.getValues()).toMatchObject({
      location: 'Taj Hotel',
      budget: '25000',
      openings: '3',
    });
  });

  it('shows the validation error of the date and of the city', async () => {
    renderWithProviders(<WhenWhereHost />);
    await act(async () => {
      formHandle?.setError('event_date', { message: 'Date is in the past' });
      formHandle?.setError('location_id', { message: 'Pick a city' });
    });
    expect(screen.getByText('Date is in the past')).toBeOnTheScreen();
    expect(mockPicker.mock.calls.at(-1)?.[0].error).toBe('Pick a city');
  });
});

describe('FreelancerFormFields', () => {
  it('shows the profile as it is saved', () => {
    renderWithProviders(<FreelancerHost />);
    expect(screen.getByLabelText('gigJobs.freelancer.name').props.value).toBe('Ravi');
    expect(screen.getByLabelText('gigJobs.freelancer.experience').props.value).toBe('2');
    expect(screen.getByLabelText('gigJobs.freelancer.phone').props.value).toBe('+91 99999 00000');
    expect(screen.getByTestId('freelancer-available-switch').props.value).toBe(true);
    expect(screen.getByTestId('freelancer-categories-cat1').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('freelancer-categories-cat2').props['aria-checked']).toBe(false);
  });

  it('offers the skills of the chosen categories, and more as categories are added', async () => {
    renderWithProviders(<FreelancerHost />);
    expect(screen.getByTestId('freelancer-skills-DJ')).toBeOnTheScreen();
    expect(screen.queryByTestId('freelancer-skills-Chef')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('freelancer-categories-cat2'));
    });
    expect(screen.getByTestId('freelancer-skills-Chef')).toBeOnTheScreen();
    expect(freelancerHandle?.getValues('category_ids')).toEqual(['cat1', 'cat2']);
  });

  it('picks skills', async () => {
    renderWithProviders(<FreelancerHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('freelancer-skills-MC'));
    });
    expect(freelancerHandle?.getValues('skills')).toEqual(['MC']);
  });

  it('writes the city, the text fields and the availability', async () => {
    renderWithProviders(<FreelancerHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-city'));
    });
    fireEvent.changeText(screen.getByLabelText('gigJobs.freelancer.name'), 'Ravi K');
    fireEvent.changeText(screen.getByLabelText('gigJobs.freelancer.bio'), 'Ten years on decks');
    fireEvent.changeText(
      screen.getByLabelText('gigJobs.freelancer.portfolio'),
      'https://ravi.example',
    );
    fireEvent.changeText(screen.getByLabelText('gigJobs.freelancer.email'), 'ravi@x.com');
    fireEvent(screen.getByTestId('freelancer-available-switch'), 'valueChange', false);
    expect(freelancerHandle?.getValues()).toMatchObject({
      location_id: 'loc9',
      locality: 'Hazratganj',
      display_name: 'Ravi K',
      bio: 'Ten years on decks',
      portfolio_url: 'https://ravi.example',
      contact_email: 'ravi@x.com',
      is_available: false,
    });
    expect(mockPicker.mock.calls[0][0]).toMatchObject({ testID: 'freelancer', required: true });
  });

  it('shows the error of the categories and of the skills', async () => {
    renderWithProviders(<FreelancerHost />);
    await act(async () => {
      freelancerHandle?.setError('category_ids', { message: 'Pick a category' });
      freelancerHandle?.setError('skills', { message: 'Pick a skill' });
      freelancerHandle?.setError('location_id', { message: 'Pick a city' });
    });
    expect(screen.getByText('Pick a category')).toBeOnTheScreen();
    expect(screen.getByText('Pick a skill')).toBeOnTheScreen();
    expect(mockPicker.mock.calls.at(-1)?.[0].error).toBe('Pick a city');
  });
});
