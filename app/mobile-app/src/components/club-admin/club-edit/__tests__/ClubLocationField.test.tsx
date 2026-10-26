import { render } from '@testing-library/react-native';

import { ClubLocationField } from '../ClubLocationField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
const mockPicker = jest.fn();
jest.mock('@/components/LocationPickerField/LocationPickerField', () => ({
  LocationPickerField: (props: Record<string, unknown>) => {
    mockPicker(props);
    return null;
  },
}));

describe('ClubLocationField', () => {
  it('draws the shared picker, required, with the club form wording', () => {
    const onChange = jest.fn();
    render(
      <ClubLocationField
        locationId="loc1"
        locality="Gomti Nagar"
        onChange={onChange}
        error="Pick a city"
      />,
    );
    const props = mockPicker.mock.calls[0][0];
    expect(props).toMatchObject({
      locationId: 'loc1',
      locality: 'Gomti Nagar',
      onChange,
      error: 'Pick a city',
      required: true,
      testID: 'club-edit',
    });
    expect(props.copy).toMatchObject({
      label: 'clubForm.basicSection.location',
      hint: 'clubForm.basicSection.locationHint',
      placeholder: 'clubForm.basicSection.cityPlaceholder',
      change: 'clubForm.basicSection.changeCity',
      locality: 'clubForm.basicSection.locality',
      anyLocality: 'clubForm.basicSection.anyLocality',
      noLocalities: 'clubForm.basicSection.noLocalities',
    });
  });

  it('names the picked city for a screen reader', () => {
    render(<ClubLocationField locationId="" locality="" onChange={jest.fn()} />);
    const { copy } = mockPicker.mock.calls.at(-1)?.[0];
    expect(copy.cityAria('Lucknow')).toBe('clubForm.basicSection.cityAria|Lucknow');
  });
});
