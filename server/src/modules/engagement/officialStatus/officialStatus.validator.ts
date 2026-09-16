import * as yup from 'yup';
import {
  OFFICIAL_STATUS_EXPIRIES,
  OFFICIAL_STATUS_MEDIA_TYPES,
  OFFICIAL_STATUS_SCOPES,
} from './officialStatus.model';

export const TITLE_MIN = 2;
export const TITLE_MAX = 120;
export const CAPTION_MAX = 300;
export const URL_MAX = 600;

/**
 * Empty, an in-app path such as `/pod-ideas`, or a full https address.
 *
 * Plain http is refused on purpose: the apps open a status link in a webview,
 * and a marketer who pastes an http link ships a broken tap to every viewer on
 * a platform that blocks insecure loads.
 */
const LINK_URL = /^(?:\/\S*|https:\/\/\S+)?$/;

/**
 * The shape of a Marketing > Status save.
 *
 * Everything checkable without the database lives here; the two rules that
 * need it — the media URL and whether the chosen cities still exist — are
 * enforced in the service, which is the only place that can answer them.
 */
export const officialStatusInputSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(TITLE_MIN, 'Give this status a longer title')
    .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`)
    .required('Title is required'),
  media_url: yup.string().trim().max(URL_MAX).required('Pick an image or a video'),
  media_type: yup.string().oneOf(OFFICIAL_STATUS_MEDIA_TYPES).default('IMAGE'),
  caption: yup
    .string()
    .trim()
    .max(CAPTION_MAX, `Keep the caption under ${CAPTION_MAX} characters`)
    .default(''),
  link_url: yup
    .string()
    .trim()
    .max(URL_MAX)
    .matches(LINK_URL, 'Use an in-app path such as /pod-ideas, or a full https:// address')
    .default(''),
  scope: yup.string().oneOf(OFFICIAL_STATUS_SCOPES).required('Choose who sees this status'),
  /* A GLOBAL status ignores whatever cities the form last held, so the list is
     only required on the branch that reads it. */
  location_ids: yup
    .array()
    .of(yup.string().trim().required())
    .when('scope', {
      is: 'LOCATION',
      then: (schema) => schema.min(1, 'Pick at least one city'),
    })
    .default([]),
  expiry: yup.string().oneOf(OFFICIAL_STATUS_EXPIRIES).required('Choose when this status expires'),
  custom_expires_at: yup
    .string()
    .trim()
    .nullable()
    .when('expiry', {
      is: 'CUSTOM',
      then: (schema) => schema.required('Pick the date and time it expires'),
    })
    .default(null),
  is_active: yup.boolean().default(true),
});

export type OfficialStatusDTO = yup.InferType<typeof officialStatusInputSchema>;
