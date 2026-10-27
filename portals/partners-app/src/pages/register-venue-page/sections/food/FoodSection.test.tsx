import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import FoodSection from './FoodSection';
import FoodGstinField from './FoodGstinField';
import { mountSection, sectionConfig } from '../__tests__/sectionHarness';
import { scriptedLink } from '../../../../__tests__/groupC-link';

afterEach(cleanup);

const link = scriptedLink({ MyPartnerIntegrations: { myPartnerIntegrations: [] } });

describe('FoodSection', () => {
  it('introduces the section and hands the shared fields the portal account picker', () => {
    mountSection(
      (form) => (
        <FoodSection form={form} config={sectionConfig} mode="register" savedGstin="" venueId="v1" venueName="Cafe" />
      ),
      {},
      { link },
    );
    expect(screen.getByTestId('register-venue-food')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Food Menu' })).toBeTruthy();
  });

  it('renders for an approved venue with saved tables and no dish list', () => {
    mountSection(
      (form) => <FoodSection form={form} config={sectionConfig} mode="edit-approved" savedGstin="22AAAAA0000A1Z5" hasSavedTables showMenu={false} />,
      { offers_food: true },
      { link },
    );
    expect(screen.getByTestId('register-venue-food')).toBeTruthy();
  });
});

describe('FoodGstinField', () => {
  it('points a venue still registering at the Documents section', () => {
    mountSection((form) => <FoodGstinField control={form.control} mode="register" savedGstin="" />);
    expect(screen.getByTestId('register-venue-food-gstin-documents')).toBeTruthy();
  });

  it('shows the shared locked field once the venue has a saved GST number, at any status', () => {
    mountSection((form) => <FoodGstinField control={form.control} mode="register" savedGstin="22AAAAA0000A1Z5" />);
    expect(screen.queryByTestId('register-venue-food-gstin-documents')).toBeNull();
    expect(screen.getByDisplayValue('22AAAAA0000A1Z5')).toBeTruthy();
  });

  it('lets an approved venue without a number type one', () => {
    mountSection((form) => <FoodGstinField control={form.control} mode="edit-approved" savedGstin="" />);
    expect(screen.queryByTestId('register-venue-food-gstin-documents')).toBeNull();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});
