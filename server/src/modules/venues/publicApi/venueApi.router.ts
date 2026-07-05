import { Router, type Response } from 'express';
import express from 'express';
import cors from 'cors';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { requireApiKey, type ApiKeyedRequest } from '@middleware/apiKey';
import { venueService } from '@modules/venues/venue/venue.service';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';

const ERROR_STATUS: Record<string, number> = {
  BAD_USER_INPUT: 400,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

function sendError(res: Response, err: unknown): Response {
  if (err instanceof GraphQLError) {
    const status = ERROR_STATUS[String(err.extensions?.code)] ?? 500;
    return res.status(status).json({ error: err.message });
  }
  console.error('[venueApi] unexpected error:', err);
  return res.status(500).json({ error: 'internal_error' });
}

/** The venue pub fields the public API is allowed to expose. Never owner_*,
 * bank_account, gstin, pan or share/commission percentages. */
interface VenuePubLike {
  id: string;
  venue_name: string;
  description: string;
  city: string;
  state: string;
  locality: string;
  address_line1: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  capacity: number;
  venue_category: Record<string, string | null>;
  cover_image_url: string;
  gallery: string[];
}

const toApiVenue = (v: VenuePubLike) => ({
  id: v.id,
  venue_name: v.venue_name,
  description: v.description,
  city: v.city,
  state: v.state,
  locality: v.locality,
  address_line1: v.address_line1,
  postal_code: v.postal_code,
  lat: v.lat,
  lng: v.lng,
  capacity: v.capacity,
  venue_category: v.venue_category,
  images: [v.cover_image_url, ...(v.gallery ?? [])].filter(Boolean),
});

/** Accepts both the slot service's pub shape (ISO strings, `id`) and a raw
 * mongoose doc (Dates, `_id`) — book/release return the raw doc. */
interface SlotLike {
  id?: unknown;
  _id?: unknown;
  start_at: Date | string;
  end_at: Date | string;
  space_label?: string | null;
  capacity?: number | null;
  price?: number | null;
  status: string;
}

const toApiSlot = (s: SlotLike) => ({
  id: String(s.id ?? s._id),
  starts_at: new Date(s.start_at).toISOString(),
  ends_at: new Date(s.end_at).toISOString(),
  space_label: s.space_label ?? '',
  capacity: s.capacity ?? 0,
  price: s.price ?? 0,
  status: s.status,
});

/**
 * Public developer REST API (v1): approved venues, their open slots, and
 * external slot booking. Authenticated per-request via `x-api-key`
 * (requireApiKey), CORS-open so the Developers portal can call it in-browser.
 */
export function buildVenueApiRouter(): Router {
  const router = Router();
  router.use(cors());
  router.use(express.json({ limit: '256kb' }));

  // Unauthenticated index — lets integrators sanity-check connectivity.
  router.get('/', (_req, res) =>
    res.json({ name: 'Duncit Venue API', version: 'v1', docs: 'https://developers.duncit.com' })
  );

  router.get('/venues', requireApiKey('venues:read'), async (_req, res) => {
    try {
      const venues = await venueService.list({ status: 'APPROVED' });
      return res.json({ venues: venues.map(toApiVenue) });
    } catch (err) {
      return sendError(res, err);
    }
  });

  router.get('/venues/:id', requireApiKey('venues:read'), async (req, res) => {
    try {
      const valid = Types.ObjectId.isValid(req.params.id);
      const venue = valid ? await venueService.getById(req.params.id) : null;
      if (!venue || venue.status !== 'APPROVED') {
        return res.status(404).json({ error: 'venue_not_found' });
      }
      return res.json({ venue: toApiVenue(venue) });
    } catch (err) {
      return sendError(res, err);
    }
  });

  router.get('/venues/:id/slots', requireApiKey('slots:read'), async (req, res) => {
    try {
      const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
      const toRaw = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
      const to = toRaw ? new Date(toRaw) : null;
      if (to && Number.isNaN(to.getTime())) {
        return res.status(400).json({ error: 'to must be a valid date' });
      }
      const slots = await venueSlotService.listAvailable(req.params.id, from);
      const inRange = to
        ? slots.filter((s) => new Date(s.start_at).getTime() <= to.getTime())
        : slots;
      return res.json({ slots: inRange.map(toApiSlot) });
    } catch (err) {
      return sendError(res, err);
    }
  });

  router.post(
    '/venues/:id/slots/:slotId/book',
    requireApiKey('bookings:write'),
    async (req, res) => {
      try {
        const auth = (req as ApiKeyedRequest).apiKey!;
        const externalRef =
          typeof req.body?.external_ref === 'string' ? req.body.external_ref : '';
        const slot = await venueSlotService.bookExternal(req.params.slotId, auth.id, externalRef);
        if (!slot) return res.status(409).json({ error: 'slot_unavailable' });
        return res.json({ booking: { ...toApiSlot(slot), external_ref: slot.external_ref ?? '' } });
      } catch (err) {
        return sendError(res, err);
      }
    }
  );

  router.delete(
    '/venues/:id/slots/:slotId/book',
    requireApiKey('bookings:write'),
    async (req, res) => {
      try {
        const auth = (req as ApiKeyedRequest).apiKey!;
        const slot = await venueSlotService.releaseExternal(req.params.slotId, auth.id);
        // null = not booked, or booked by a DIFFERENT key — keys only cancel their own.
        if (!slot) return res.status(409).json({ error: 'slot_unavailable' });
        return res.json({ released: true });
      } catch (err) {
        return sendError(res, err);
      }
    }
  );

  // JSON 404 for anything else under /api/v1 (never Express's HTML default).
  router.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return router;
}
