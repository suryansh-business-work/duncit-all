import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { buildVenueApiRouter } from '../../venueApi.router';
import { apiKeyService } from '@modules/platform/apiKey/apiKey.service';
import { ApiKeyModel } from '@modules/platform/apiKey/apiKey.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

const app = express();
app.use('/api/v1', buildVenueApiRouter());

const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function seedVenue(overrides: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Grand Hall',
    description: 'A hall',
    city: 'Delhi',
    state: 'Delhi',
    locality: 'CP',
    address_line1: '1 Main Road',
    postal_code: '110001',
    lat: 28.6,
    lng: 77.2,
    capacity: 120,
    owner_email: 'top-secret-owner@example.com',
    owner_phone: '+919999999999',
    gstin: 'SECRETGST123',
    pan: 'SECRETPAN9X',
    ...overrides,
  });
  return String(v._id);
}

async function seedKey(name = 'Integration key') {
  const { raw_key } = await apiKeyService.create(ownerId, name);
  return raw_key;
}

async function seedSlot(venueId: string, startDays = 2) {
  const [slot] = await venueSlotService.create(ownerId, {
    venue_id: venueId,
    slots: [{ start_at: inDays(startDays), end_at: inDays(startDays + 0.1), price: 500 }],
  });
  return slot.id;
}

describe('public venue API router', () => {
  it('serves an unauthenticated index', async () => {
    const res = await request(app).get('/api/v1/').expect(200);
    expect(res.body).toEqual({
      name: 'Duncit Venue API',
      version: 'v1',
      docs: 'https://developers.duncit.com',
    });
  });

  it('rejects requests without a valid key', async () => {
    await seedVenue();
    const noKey = await request(app).get('/api/v1/venues').expect(401);
    expect(noKey.body).toEqual({ error: 'invalid_api_key' });
    const badKey = await request(app)
      .get('/api/v1/venues')
      .set('x-api-key', 'dk_live_wrong')
      .expect(401);
    expect(badKey.body).toEqual({ error: 'invalid_api_key' });
  });

  it('lists only APPROVED venues through the slim DTO — no PII', async () => {
    const approvedId = await seedVenue();
    await seedVenue({ status: 'DRAFT', venue_name: 'Hidden Draft' });
    const key = await seedKey();

    const res = await request(app).get('/api/v1/venues').set('x-api-key', key).expect(200);
    expect(res.body.venues).toHaveLength(1);
    const venue = res.body.venues[0];
    expect(venue.id).toBe(approvedId);
    expect(venue.venue_name).toBe('Grand Hall');
    expect(venue.city).toBe('Delhi');
    expect(venue.postal_code).toBe('110001');
    expect(venue.lat).toBe(28.6);
    expect(venue.capacity).toBe(120);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('top-secret-owner@example.com');
    expect(raw).not.toContain('+919999999999');
    expect(raw).not.toContain('SECRETGST123');
    expect(raw).not.toContain('SECRETPAN9X');
    expect(venue).not.toHaveProperty('owner_email');
    expect(venue).not.toHaveProperty('bank_account');
    expect(venue).not.toHaveProperty('venue_share_pct');
  });

  it('excludes deactivated venues from the list and 404s on a single deactivated venue', async () => {
    const activeId = await seedVenue();
    const deactivatedId = await seedVenue({ is_active: false, venue_name: 'Offline Hall' });
    const key = await seedKey();

    const list = await request(app).get('/api/v1/venues').set('x-api-key', key).expect(200);
    expect(list.body.venues).toHaveLength(1);
    expect(list.body.venues[0].id).toBe(activeId);

    await request(app).get(`/api/v1/venues/${deactivatedId}`).set('x-api-key', key).expect(404);
  });

  it('gets one venue by id and 404s on drafts and unknown ids', async () => {
    const approvedId = await seedVenue();
    const draftId = await seedVenue({ status: 'DRAFT' });
    const key = await seedKey();

    const ok = await request(app).get(`/api/v1/venues/${approvedId}`).set('x-api-key', key).expect(200);
    expect(ok.body.venue.id).toBe(approvedId);
    expect(ok.body.venue).not.toHaveProperty('gstin');

    await request(app).get(`/api/v1/venues/${draftId}`).set('x-api-key', key).expect(404);
    await request(app)
      .get(`/api/v1/venues/${new Types.ObjectId()}`)
      .set('x-api-key', key)
      .expect(404);
    await request(app).get('/api/v1/venues/not-an-id').set('x-api-key', key).expect(404);
  });

  it('lists available slots with the slim slot DTO and honors from/to', async () => {
    const venueId = await seedVenue();
    await seedSlot(venueId, 2);
    await seedSlot(venueId, 10);
    const key = await seedKey();

    const all = await request(app)
      .get(`/api/v1/venues/${venueId}/slots`)
      .set('x-api-key', key)
      .expect(200);
    expect(all.body.slots).toHaveLength(2);
    expect(all.body.slots[0]).toEqual({
      id: expect.any(String),
      starts_at: expect.any(String),
      ends_at: expect.any(String),
      space_label: '',
      capacity: 0,
      price: 500,
      status: 'AVAILABLE',
    });

    const ranged = await request(app)
      .get(`/api/v1/venues/${venueId}/slots`)
      .query({ from: inDays(1), to: inDays(5) })
      .set('x-api-key', key)
      .expect(200);
    expect(ranged.body.slots).toHaveLength(1);

    await request(app)
      .get(`/api/v1/venues/${venueId}/slots`)
      .query({ to: 'not-a-date' })
      .set('x-api-key', key)
      .expect(400);
  });

  it('books a slot once, 409s the second attempt, and releases only for the owning key', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const key = await seedKey('Booker');
    const otherKey = await seedKey('Rival');

    const booked = await request(app)
      .post(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', key)
      .send({ external_ref: 'ORDER-42' })
      .expect(200);
    expect(booked.body.booking.id).toBe(slotId);
    expect(booked.body.booking.status).toBe('BOOKED');
    expect(booked.body.booking.external_ref).toBe('ORDER-42');

    // Already booked → conflict, for any key.
    const again = await request(app)
      .post(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', otherKey)
      .expect(409);
    expect(again.body).toEqual({ error: 'slot_unavailable' });

    // A different key cannot release someone else's booking.
    await request(app)
      .delete(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', otherKey)
      .expect(409);

    const released = await request(app)
      .delete(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', key)
      .expect(200);
    expect(released.body).toEqual({ released: true });

    const freed = await VenueSlotModel.findById(slotId);
    expect(freed!.status).toBe('AVAILABLE');
    expect(freed!.booked_by_api_key_id).toBeNull();
    expect(freed!.external_ref).toBe('');

    // Releasing an already-available slot is a conflict too.
    await request(app)
      .delete(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', key)
      .expect(409);
  });

  it('bookExternal is atomic at the service layer (second book returns null)', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const keyId = new Types.ObjectId().toString();

    const first = await venueSlotService.bookExternal(slotId, keyId, 'ref-1');
    expect(first!.status).toBe('BOOKED');
    expect(await venueSlotService.bookExternal(slotId, keyId, 'ref-2')).toBeNull();
    expect(await venueSlotService.releaseExternal(slotId, new Types.ObjectId().toString())).toBeNull();
    const released = await venueSlotService.releaseExternal(slotId, keyId);
    expect(released!.status).toBe('AVAILABLE');
  });

  it('403s when the key lacks a required scope', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const key = await seedKey('Read only');
    await ApiKeyModel.updateOne(
      { key_prefix: key.slice(0, 10) },
      { $set: { scopes: ['venues:read'] } }
    );

    await request(app).get('/api/v1/venues').set('x-api-key', key).expect(200);
    const res = await request(app)
      .post(`/api/v1/venues/${venueId}/slots/${slotId}/book`)
      .set('x-api-key', key)
      .expect(403);
    expect(res.body).toEqual({ error: 'insufficient_scope' });
  });

  it('answers JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('rate-limits a key after 120 requests in the window', async () => {
    await seedVenue();
    const key = await seedKey('Hammer');
    for (let i = 0; i < 120; i += 1) {
      await request(app).get('/api/v1/venues').set('x-api-key', key).expect(200);
    }
    const limited = await request(app).get('/api/v1/venues').set('x-api-key', key).expect(429);
    expect(limited.body).toEqual({ error: 'rate_limited' });
  }, 60_000);
});
