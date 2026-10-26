import { act, fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { renderWithProviders } from '@/utils/test-utils';
import type { ClubEditFormHandle, ClubEditFormValues } from '../club-edit.form';
import { ClubBasicFields } from '../ClubBasicFields';
import { ClubContentFields } from '../ClubContentFields';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

// The two pickers are tested on their own; here they expose what they were given
// and a button that picks a fixed answer.
const mockCategory = jest.fn();
jest.mock('../ClubCategoryField', () => ({
  ClubCategoryField: (props: {
    superId: string;
    subId: string;
    onChange: (superId: string, subId: string) => void;
    superError?: string;
    subError?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockCategory(props);
    return <Pressable testID="pick-category" onPress={() => props.onChange('s9', 'u9')} />;
  },
}));
const mockLocation = jest.fn();
jest.mock('../ClubLocationField', () => ({
  ClubLocationField: (props: {
    locationId: string;
    locality: string;
    onChange: (locationId: string, locality: string) => void;
    error?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockLocation(props);
    return (
      <Pressable testID="pick-location" onPress={() => props.onChange('loc9', 'Hazratganj')} />
    );
  },
}));
jest.mock('@/components/create-pod', () => ({
  ChipArrayField: (props: {
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    error?: string;
    testID: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={props.testID} onPress={() => props.onChange([...props.value, 'added'])}>
        <Text>{`${props.label}=${props.value.join('|')}`}</Text>
        {props.error ? <Text>{`error:${props.error}`}</Text> : null}
      </Pressable>
    );
  },
}));
jest.mock('../FaqListField', () => ({
  FaqListField: (props: {
    value: { id: string }[];
    onChange: (next: { id: string; question: string; answer: string }[]) => void;
    error?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID="faq-stub"
        onPress={() => props.onChange([{ id: 'n', question: 'Q', answer: 'A' }])}
      >
        <Text>{`faqs=${props.value.length}`}</Text>
        {props.error ? <Text>{`error:${props.error}`}</Text> : null}
      </Pressable>
    );
  },
}));

const DEFAULTS: ClubEditFormValues = {
  club_name: 'Smash Club',
  club_description: 'We play',
  super_category_id: 's1',
  category_id: 'u1',
  location_id: 'loc1',
  locality: 'Gomti Nagar',
  feature_text: '',
  moments_text: '',
  community_link: '',
  group_link: '',
  announcement_link: '',
  who_we_are: ['Players'],
  what_we_do: ['Play'],
  perks: [],
  values: ['Fun'],
  faqs: [],
};

let handle: ClubEditFormHandle | null = null;

function BasicHost() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ClubEditFormValues, any, ClubEditFormValues>({ defaultValues: DEFAULTS });
  handle = form;
  return <ClubBasicFields form={form} />;
}

function ContentHost() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ClubEditFormValues, any, ClubEditFormValues>({ defaultValues: DEFAULTS });
  handle = form;
  return <ClubContentFields control={form.control} />;
}

const values = () => handle?.getValues() as ClubEditFormValues;

beforeEach(() => {
  jest.clearAllMocks();
  handle = null;
});

describe('ClubBasicFields', () => {
  it('shows the name and description as the form has them', () => {
    renderWithProviders(<BasicHost />);
    expect(screen.getByLabelText('clubForm.basicSection.clubName').props.value).toBe('Smash Club');
    expect(screen.getByLabelText('clubForm.common.description').props.value).toBe('We play');
  });

  it('edits the name and description in the form', () => {
    renderWithProviders(<BasicHost />);
    fireEvent.changeText(screen.getByLabelText('clubForm.basicSection.clubName'), 'Rally Club');
    fireEvent.changeText(screen.getByLabelText('clubForm.common.description'), 'Rally on');
    expect(values().club_name).toBe('Rally Club');
    expect(values().club_description).toBe('Rally on');
  });

  it('hands the pickers the saved category and city', () => {
    renderWithProviders(<BasicHost />);
    expect(mockCategory.mock.calls[0][0]).toMatchObject({ superId: 's1', subId: 'u1' });
    expect(mockLocation.mock.calls[0][0]).toMatchObject({
      locationId: 'loc1',
      locality: 'Gomti Nagar',
    });
  });

  it('writes both category fields at once, marking the form dirty', async () => {
    renderWithProviders(<BasicHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-category'));
    });
    expect(values()).toMatchObject({ super_category_id: 's9', category_id: 'u9' });
    expect(handle?.formState.dirtyFields.super_category_id).toBe(true);
    expect(handle?.formState.dirtyFields.category_id).toBe(true);
  });

  it('writes both location fields at once', async () => {
    renderWithProviders(<BasicHost />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-location'));
    });
    expect(values()).toMatchObject({ location_id: 'loc9', locality: 'Hazratganj' });
    expect(handle?.formState.dirtyFields.location_id).toBe(true);
  });

  it('passes the validation errors of the pickers down', async () => {
    renderWithProviders(<BasicHost />);
    await act(async () => {
      handle?.setError('super_category_id', { message: 'Pick a super' });
      handle?.setError('category_id', { message: 'Pick a sub' });
      handle?.setError('location_id', { message: 'Pick a city' });
    });
    expect(mockCategory.mock.calls.at(-1)?.[0]).toMatchObject({
      superError: 'Pick a super',
      subError: 'Pick a sub',
    });
    expect(mockLocation.mock.calls.at(-1)?.[0].error).toBe('Pick a city');
  });
});

describe('ClubContentFields', () => {
  it('shows the four bullet lists with their saved entries', () => {
    renderWithProviders(<ContentHost />);
    expect(screen.getByText('clubForm.contentSection.whoWeAre=Players')).toBeOnTheScreen();
    expect(screen.getByText('clubForm.contentSection.whatWeDo=Play')).toBeOnTheScreen();
    expect(screen.getByText('clubForm.common.perks=')).toBeOnTheScreen();
    expect(screen.getByText('clubForm.contentSection.values=Fun')).toBeOnTheScreen();
  });

  it.each(['who_we_are', 'what_we_do', 'perks', 'values'] as const)(
    'edits %s in the form',
    (name) => {
      renderWithProviders(<ContentHost />);
      fireEvent.press(screen.getByTestId(`club-edit-${name}`));
      expect(values()[name]).toEqual([...DEFAULTS[name], 'added']);
    },
  );

  it('shows the error of one list', async () => {
    renderWithProviders(<ContentHost />);
    await act(async () => {
      handle?.setError('perks', { message: 'Add a perk' });
    });
    expect(screen.getByText('error:Add a perk')).toBeOnTheScreen();
  });

  it('edits the FAQs in the form and shows their error', async () => {
    renderWithProviders(<ContentHost />);
    expect(screen.getByText('faqs=0')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('faq-stub'));
    expect(values().faqs).toEqual([{ id: 'n', question: 'Q', answer: 'A' }]);
    await act(async () => {
      handle?.setError('faqs', { message: 'Finish both sides' });
    });
    expect(screen.getByText('error:Finish both sides')).toBeOnTheScreen();
  });
});
