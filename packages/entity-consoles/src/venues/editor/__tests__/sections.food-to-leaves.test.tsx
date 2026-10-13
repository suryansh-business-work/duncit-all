import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodSection from '../sections/FoodSection';
import AmenitiesSection from '../sections/AmenitiesSection';
import DocumentsSection from '../sections/DocumentsSection';
import OwnerSection from '../sections/OwnerSection';
import PayoutSection from '../sections/PayoutSection';
import LeavesSection from '../sections/LeavesSection';
import { blankVenueValues, type VenueFormValues } from '../types';
import { registrationConfig } from './catalogues';
import { renderForm } from './harness';
import { sectionCard, venueValues, type PickMedia } from './sectionKit';

/** Sections three to eight of the venue form — the rest of the owner's own. */

// The account search has its own suite (`shared/__tests__/AccountPicker.test.tsx`);
// what Owner Details owns is what it does with the account that was picked, so
// the picker is two buttons: one account with every contact detail, one with none.
vi.mock('../../../shared/AccountPicker', () => ({
  default: ({ label, onPicked }: { label: string; onPicked: (account: Record<string, unknown>) => void }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onPicked({ user_id: 'user-9', full_name: 'Asha Rao', email: 'asha@duncit.com', phone_number: '9876543210' })
        }
      >
        {`${label}: Asha Rao`}
      </button>
      <button
        type="button"
        onClick={() => onPicked({ user_id: 'user-10', full_name: null, email: null, phone_number: null })}
      >
        {`${label}: no contact on file`}
      </button>
    </>
  ),
}));

describe('FoodSection', () => {
  const mount = (onPick: PickMedia, over: Partial<VenueFormValues> = {}) =>
    renderForm<VenueFormValues>(venueValues(over), ({ control }) => (
      <FoodSection control={control} config={registrationConfig()} onPick={onPick} />
    ));

  it('is its own section, and shows the menu only once the venue offers food', () => {
    const { form } = mount(vi.fn());
    const section = within(sectionCard('food', 'Food Menu'));
    expect(section.queryByRole('button', { name: 'Add a dish' })).not.toBeInTheDocument();

    fireEvent.click(section.getByRole('switch', { name: 'Offers food' }));

    expect(form().getValues('offers_food')).toBe(true);
    expect(section.getByRole('button', { name: 'Add a dish' })).toBeInTheDocument();
  });

  it("uploads a dish photo into the venue's menu folder", async () => {
    const onPick = vi.fn<PickMedia>().mockResolvedValue('https://cdn.example.test/dosa.jpg');
    const { form } = mount(onPick, { offers_food: true });

    fireEvent.click(screen.getByRole('button', { name: 'Add a dish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add a photo' }));

    await waitFor(() => expect(form().getValues('food_menu.0.images')).toEqual(['https://cdn.example.test/dosa.jpg']));
    expect(onPick).toHaveBeenCalledWith('/venues/menu');
  });

  it('offers one switch only — QR ordering is not set from this console', () => {
    mount(vi.fn(), { offers_food: true });
    // The owner's form carries a second switch here ("Enable online ordering");
    // that connection is the owner's own, so this section has just the one.
    const switches = within(sectionCard('food', 'Food Menu')).getAllByRole('switch');
    expect(switches).toHaveLength(1);
    expect(switches[0]).toHaveAccessibleName('Offers food');
  });
});

describe('AmenitiesSection', () => {
  it('offers the config lists for amenities, facilities and security', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(venueValues(), ({ control }) => (
      <AmenitiesSection control={control} config={registrationConfig()} />
    ));
    const section = within(sectionCard('amenities', 'Amenities & Security'));

    await user.click(section.getByRole('combobox', { name: 'Amenities' }));
    await user.click(await screen.findByRole('option', { name: 'Wi-Fi' }));
    await user.keyboard('{Escape}');
    await user.click(section.getByRole('combobox', { name: 'Facilities' }));
    await user.click(await screen.findByRole('option', { name: 'Parking' }));
    await user.keyboard('{Escape}');
    await user.click(section.getByRole('combobox', { name: 'Security' }));
    await user.click(await screen.findByRole('option', { name: 'CCTV' }));

    expect(form().getValues()).toMatchObject({ amenities: ['Wi-Fi'], facilities: ['Parking'], security: ['CCTV'] });
  });
});

describe('DocumentsSection', () => {
  it('holds GSTIN, PAN and the uploads, under the owner form name', async () => {
    const onPick = vi.fn<PickMedia>().mockResolvedValue('https://cdn.example.test/gst.pdf');
    const { form } = renderForm<VenueFormValues>(venueValues(), ({ control }) => (
      <DocumentsSection control={control} config={registrationConfig()} onPick={onPick} />
    ));
    const section = within(sectionCard('documents', 'Venue Documents'));

    fireEvent.change(section.getByRole('textbox', { name: 'GSTIN' }), { target: { value: '29ABCDE1234F1Z5' } });
    fireEvent.change(section.getByRole('textbox', { name: 'PAN' }), { target: { value: 'ABCDE1234F' } });
    fireEvent.click(section.getByRole('button', { name: 'Add a document' }));
    fireEvent.click(await section.findByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(form().getValues('documents.0.url')).toBe('https://cdn.example.test/gst.pdf'));
    expect(form().getValues()).toMatchObject({ gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F' });
    expect(onPick).toHaveBeenCalledWith('/venue-documents');
  });
});

describe('OwnerSection and PayoutSection', () => {
  it("keeps the owner's contact in Owner Details and leaves the payout to its own section", () => {
    const { form } = renderForm<VenueFormValues>(venueValues(), ({ control, setValue }) => (
      <OwnerSection control={control} setValue={setValue} isEdit />
    ));
    const section = within(sectionCard('owner', 'Owner Details'));

    fireEvent.change(section.getByRole('textbox', { name: /Owner name/ }), { target: { value: 'Rohit Menon' } });
    fireEvent.change(section.getByRole('textbox', { name: /Owner phone/ }), { target: { value: '+919845012345' } });

    expect(form().getValues()).toMatchObject({ owner_name: 'Rohit Menon', owner_phone: '+919845012345' });
    expect(section.getByText(/The owning account cannot be changed here/)).toBeInTheDocument();
    expect(section.queryByRole('textbox', { name: 'Account holder' })).not.toBeInTheDocument();
    expect(section.queryByRole('combobox', { name: 'Payout method' })).not.toBeInTheDocument();
  });

  it('fills the contact details from the account picked while registering, and blanks what it lacks', () => {
    const { form } = renderForm<VenueFormValues>(venueValues({ owner_name: 'Old Name' }), ({ control, setValue }) => (
      <OwnerSection control={control} setValue={setValue} isEdit={false} />
    ));
    expect(screen.queryByText(/The owning account cannot be changed here/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Owner account: Asha Rao' }));
    expect(form().getValues()).toMatchObject({
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
      owner_phone: '9876543210',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Owner account: no contact on file' }));
    expect(form().getValues()).toMatchObject({ owner_name: '', owner_email: '', owner_phone: '' });
  });

  it('writes the payout block under bank_account from the Payout Method section', async () => {
    const { form } = renderForm<VenueFormValues>(venueValues(), ({ control }) => <PayoutSection control={control} />);
    const section = within(sectionCard('payout', 'Payout Method'));

    fireEvent.mouseDown(section.getByRole('combobox', { name: 'Payout method' }));
    fireEvent.click(await screen.findByRole('option', { name: 'UPI' }));
    fireEvent.change(section.getByRole('textbox', { name: 'Account holder' }), { target: { value: 'Third Wave LLP' } });
    fireEvent.change(section.getByRole('textbox', { name: 'UPI ID' }), { target: { value: 'thirdwave@okhdfc' } });

    expect(form().getValues('bank_account')).toMatchObject({
      payout_method: 'UPI',
      account_holder_name: 'Third Wave LLP',
      upi_id: 'thirdwave@okhdfc',
    });
  });
});

describe('LeavesSection', () => {
  it('lists the closed dates and takes one away, under the owner form name', () => {
    const { form } = renderForm<VenueFormValues>(
      venueValues({ settings: { ...blankVenueValues.settings, holidays: ['2026-01-26', '2026-08-15'] } }),
      ({ control }) => <LeavesSection control={control} />,
    );
    const section = within(sectionCard('leaves', 'Leaves & Holidays'));
    expect(section.getByText(/No slot can be created or booked on them/)).toBeInTheDocument();
    expect(section.getByText('2026-08-15')).toBeInTheDocument();

    const first = section.getByText('2026-01-26').closest('.MuiChip-root');
    if (!first) throw new Error('the holiday is not drawn as a chip');
    const remove = first.querySelector('.MuiChip-deleteIcon');
    if (!remove) throw new Error('the holiday chip has no delete control');
    fireEvent.click(remove);

    expect(form().getValues('settings.holidays')).toEqual(['2026-08-15']);
  });
});
