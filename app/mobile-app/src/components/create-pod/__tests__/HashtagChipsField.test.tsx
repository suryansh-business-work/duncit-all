import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { HashtagChipsField, parseHashtags } from '@/components/create-pod/HashtagChipsField';
import { blankCreatePodForm, type CreatePodFormValues } from '@/components/create-pod';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({ initial }: Readonly<{ initial?: string }>) {
  // `initial` deliberately passes through unmodified so tests can exercise the
  // undefined-value branch of the field.
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, pod_hashtag_text: initial as never },
  });
  return <HashtagChipsField form={form} />;
}

describe('parseHashtags', () => {
  it('splits on whitespace/commas, strips # and dedupes', () => {
    expect(parseHashtags('#weekend, #community fun weekend')).toEqual([
      'weekend',
      'community',
      'fun',
    ]);
    expect(parseHashtags('')).toEqual([]);
  });
});

describe('HashtagChipsField', () => {
  it('adds a chip on trailing space and on submit', () => {
    renderWithProviders(<Harness />);
    const input = screen.getByTestId('field-pod_hashtag_text');
    fireEvent.changeText(input, 'weekend ');
    expect(screen.getByTestId('hashtag-chip-weekend')).toBeOnTheScreen();
    fireEvent.changeText(input, 'fun');
    fireEvent(input, 'submitEditing');
    expect(screen.getByTestId('hashtag-chip-fun')).toBeOnTheScreen();
  });

  it('commits a pending tag on blur and ignores empty commits', () => {
    renderWithProviders(<Harness />);
    const input = screen.getByTestId('field-pod_hashtag_text');
    fireEvent.changeText(input, '#community');
    fireEvent(input, 'blur');
    expect(screen.getByTestId('hashtag-chip-community')).toBeOnTheScreen();
    fireEvent(input, 'submitEditing'); // empty draft → no-op
    expect(screen.queryByTestId('hashtag-chip-')).toBeNull();
  });

  it('tolerates an undefined form value', () => {
    renderWithProviders(<Harness initial={undefined as never} />);
    expect(screen.getByTestId('field-pod_hashtag_text')).toBeOnTheScreen();
  });

  it('renders existing tags and removes one from its chip', () => {
    renderWithProviders(<Harness initial="#weekend #fun" />);
    expect(screen.getByTestId('hashtag-chip-weekend')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('hashtag-remove-weekend'));
    expect(screen.queryByTestId('hashtag-chip-weekend')).toBeNull();
    expect(screen.getByTestId('hashtag-chip-fun')).toBeOnTheScreen();
  });
});
