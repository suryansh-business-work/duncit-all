import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import AmenitiesSection from './AmenitiesSection';
import { mountSection, sectionConfig } from './__tests__/sectionHarness';

afterEach(cleanup);

const chip = (group: string, option: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name: option });

describe('AmenitiesSection', () => {
  it('renders one toggle group per list the server configured', () => {
    mountSection((form) => <AmenitiesSection form={form} config={sectionConfig} />);

    expect(screen.getByText('Comfort features guests get inside your venue')).toBeTruthy();
    expect(chip('Amenities', 'AC').getAttribute('aria-pressed')).toBe('false');
    expect(chip('Amenities', 'Wi-Fi')).toBeTruthy();
    expect(chip('Facilities', 'Parking')).toBeTruthy();
    expect(chip('Venue Security', 'CCTV Surveillance')).toBeTruthy();
    expect(
      screen.queryByText('Amenities, facilities and security are locked after approval. Contact support to change them.')
    ).toBeNull();
  });

  it('toggles an option on and back off', () => {
    const { form } = mountSection((sectionForm) => <AmenitiesSection form={sectionForm} config={sectionConfig} />, {
      amenities: ['Wi-Fi'],
    });

    fireEvent.click(chip('Amenities', 'AC'));
    expect(form().getValues('amenities')).toEqual(['Wi-Fi', 'AC']);
    expect(chip('Amenities', 'AC').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(chip('Amenities', 'Wi-Fi'));
    expect(form().getValues('amenities')).toEqual(['AC']);
  });

  it('locks every chip after approval and says why', () => {
    const { form } = mountSection(
      (sectionForm) => <AmenitiesSection form={sectionForm} config={sectionConfig} disabled />,
      { facilities: ['Parking'] }
    );

    expect(
      screen.getByText('Amenities, facilities and security are locked after approval. Contact support to change them.')
    ).toBeTruthy();
    const parking = within(screen.getByRole('group', { name: 'Facilities' })).getByText('Parking');
    fireEvent.click(parking);
    expect(form().getValues('facilities')).toEqual(['Parking']);
  });
});
