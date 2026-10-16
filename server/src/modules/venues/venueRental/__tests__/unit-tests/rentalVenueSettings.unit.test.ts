import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { findByIdAndUpdate: jest.fn() } }));

import { logs } from '@observability/log';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { setVenueRentalDepositGst } from '../../rentalVenueSettings';

/*
  The Venues console's per-venue switch for GST on rental deposits. The flag is
  read at checkout, so what this writes decides whether the next guest's
  deposit is taxed.
*/

const m = <T>(fn: T) => fn as unknown as jest.Mock;
const updated = (value: unknown) => ({ select: () => ({ lean: () => Promise.resolve(value) }) });
const VENUE = new Types.ObjectId().toHexString();

beforeEach(() => jest.resetAllMocks());

describe('setVenueRentalDepositGst', () => {
  it('turns GST off for the venue, logs who did it and returns the stored value', async () => {
    m(VenueModel.findByIdAndUpdate).mockReturnValue(updated({ rental_deposit_gst: false }));

    await expect(setVenueRentalDepositGst('admin-1', VENUE, false)).resolves.toEqual({
      venue_id: VENUE,
      rental_deposit_gst: false,
    });

    expect(VenueModel.findByIdAndUpdate).toHaveBeenCalledWith(
      VENUE,
      { $set: { rental_deposit_gst: false } },
      { new: true }
    );
    expect(logs.server.info).toHaveBeenCalledWith('rentalVenueSettings', 'setVenueRentalDepositGst', {
      actor_user_id: 'admin-1',
      venue_id: VENUE,
      charge_gst: false,
    });
  });

  it('reads a venue saved before the switch existed as taxed', async () => {
    m(VenueModel.findByIdAndUpdate).mockReturnValue(updated({}));
    await expect(setVenueRentalDepositGst('admin-1', VENUE, true)).resolves.toEqual({
      venue_id: VENUE,
      rental_deposit_gst: true,
    });
  });

  it('refuses a malformed id without touching the database', async () => {
    await expect(setVenueRentalDepositGst('admin-1', 'nope', true)).rejects.toThrow('Venue not found');
    expect(VenueModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logs.server.info).not.toHaveBeenCalled();
  });

  it('refuses a venue that does not exist, and logs nothing', async () => {
    m(VenueModel.findByIdAndUpdate).mockReturnValue(updated(null));
    await expect(setVenueRentalDepositGst('admin-1', VENUE, false)).rejects.toThrow('Venue not found');
    expect(logs.server.info).not.toHaveBeenCalled();
  });
});
