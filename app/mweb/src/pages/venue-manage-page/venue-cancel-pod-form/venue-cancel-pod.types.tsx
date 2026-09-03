/**
 * The cancel-pod contract lives in @duncit/forms/schemas: mWeb, the native app
 * and the Partners console all ask the venue owner for the same reason before
 * a pod is cancelled, and the refusal is the mweb.venuePods.* key both apps
 * ship (rules 27 + 38 + 40). Re-exported here so the form folder keeps rule
 * 10's shape and the form imports nothing outside it.
 */
export {
  makeVenueCancelPodSchema,
  venueCancelPodDefaults,
  type VenueCancelPodValues,
} from '@duncit/forms/schemas';
