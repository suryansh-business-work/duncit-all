import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodSection from '../sections/FoodSection';
import AmenitiesSection from '../sections/AmenitiesSection';
import DocumentsSection from '../sections/DocumentsSection';
import OwnerSection from '../sections/OwnerSection';
import PayoutSection from '../sections/PayoutSection';
import LeavesSection from '../sections/LeavesSection';
import { blankFoodDish } from '@duncit/utils';
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

// The shared media picker as a stub: it records where it was told to file the
// upload, and picks one photo. The picker itself has its own suites.
const picked = vi.hoisted((): { folder?: string; entityId?: string }[] => []);
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaPickerDialog: ({ open, folder, entityId, onPicked }: { open: boolean; folder?: string; entityId?: string; onPicked: (url: string) => void }) =>
    open ? (
      <button
        type="button"
        onClick={() => {
          picked.push({ folder, entityId });
          onPicked('https://cdn.example.test/dosa.jpg');
        }}
      >
        Pick a stub photo
      </button>
    ) : null,
}));

describe('FoodSection', () => {
  const mount = (over: Partial<VenueFormValues> = {}) =>
    renderForm<VenueFormValues>(venueValues(over), ({ control }) => (
      <FoodSection control={control} config={registrationConfig()} venueId="venue-1" />
    ));

  it('is its own section, and shows the menu only once the venue offers food', () => {
    const { form } = mount();
    const section = within(sectionCard('food', 'Food Menu'));
    expect(section.queryByRole('button', { name: 'Add menu item' })).not.toBeInTheDocument();

    fireEvent.click(section.getByRole('switch', { name: 'Does this venue offer food?' }));

    expect(form().getValues('offers_food')).toBe(true);
    expect(section.getByRole('button', { name: 'Add menu item' })).toBeInTheDocument();
  });

  it("adds a dish on the catalogue's first entries, and files its photo in the venue's own folder", async () => {
    const { form } = mount({ offers_food: true });

    fireEvent.click(screen.getByRole('button', { name: 'Add menu item' }));
    expect(form().getValues('food_menu.0')).toMatchObject({ item_id: '', diet: 'VEG', spice_level: 'NONE', is_available: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Add photo of this menu item' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick a stub photo' }));

    await waitFor(() => expect(form().getValues('food_menu.0.images')).toEqual(['https://cdn.example.test/dosa.jpg']));
    expect(picked).toEqual([{ folder: '/venues', entityId: 'venue-1' }]);
  });

  it("sets QR ordering and the venue's GST, but cannot switch ordering on without the owner's Razorpay account", () => {
    mount({ offers_food: true });
    const section = within(sectionCard('food', 'Food Menu'));
    expect(section.getAllByRole('switch')).toHaveLength(3);
    expect(section.getByRole('switch', { name: 'Does this venue offer food?' })).toBeEnabled();
    // The account is the owner's own, linked from the Partners portal — the console only says there is none.
    expect(section.getByRole('switch', { name: 'Accept food orders from the venue QR' })).toBeDisabled();
    expect(section.getByText(/No Razorpay account is linked yet/)).toBeInTheDocument();
    expect(section.getByRole('switch', { name: "Set this venue's own GST" })).toBeEnabled();
  });

  it('switches ordering on once the owner has linked an account and a dish is available', () => {
    const { form } = mount({
      offers_food: true,
      food_menu: [{ ...blankFoodDish(registrationConfig()), name: 'Masala dosa', price: 120 }],
      food_ordering: { ...blankVenueValues.food_ordering, razorpay_linked: true },
    });
    const section = within(sectionCard('food', 'Food Menu'));
    expect(section.getByText(/A Razorpay account is linked/)).toBeInTheDocument();
    fireEvent.click(section.getByRole('switch', { name: 'Accept food orders from the venue QR' }));
    expect(form().getValues('food_ordering.enabled')).toBe(true);
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

describe('DocumentsSection / removing a document', () => {
  it('removes only the document whose button was pressed', async () => {
    const onPick = vi.fn<PickMedia>().mockResolvedValue(null);
    const { form } = renderForm<VenueFormValues>(
      venueValues({
        documents: [
          { type: 'GST', url: 'https://cdn.example.test/gst.pdf' },
          { type: 'FSSAI', url: 'https://cdn.example.test/fssai.pdf' },
        ],
      }),
      ({ control }) => <DocumentsSection control={control} config={registrationConfig()} onPick={onPick} />,
    );
    const section = within(sectionCard('documents', 'Venue Documents'));

    fireEvent.click(section.getAllByRole('button', { name: 'Remove this document' })[0]);

    expect(form().getValues('documents')).toEqual([{ type: 'FSSAI', url: 'https://cdn.example.test/fssai.pdf' }]);
    expect(section.getAllByRole('button', { name: 'Remove this document' })).toHaveLength(1);
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
