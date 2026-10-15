/**
 * The request-an-event contract lives in @duncit/forms/schemas: mWeb and the
 * native app ask the same optional note under the same rule (rules 27 + 56).
 * Re-exported here so the form folder keeps rule 17's shape.
 */
export {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
} from '@duncit/forms/schemas';
