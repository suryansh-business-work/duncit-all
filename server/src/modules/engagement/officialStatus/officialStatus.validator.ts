import { z } from 'zod';
import { arr, bool, filled, matches, maxLen, minItems, minLen, obj, shape, str, trim } from '@utils/zod-fields';
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

const CUSTOM_EXPIRY_REQUIRED = 'Pick the date and time it expires';

const locationIds = (min?: string) =>
  arr(
    z
      .array(str(z.string().check(filled()), { required: true, transforms: [trim] }))
      .check(...(min ? [minItems(1, min)] : [])),
    { default: [] }
  );

const customExpiresAt = (required?: string) =>
  str(required ? z.string().check(filled(required)) : z.string().nullable(), {
    transforms: [trim],
    default: null,
    required,
  });

/**
 * The shape of a Marketing > Status save.
 *
 * Everything checkable without the database lives here; the two rules that
 * need it — the media URL and whether the chosen cities still exist — are
 * enforced in the service, which is the only place that can answer them.
 */
export const officialStatusInputSchema = obj(
  shape(
    {
      title: str(
        z
          .string()
          .check(
            minLen(TITLE_MIN, 'Give this status a longer title'),
            maxLen(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`),
            filled('Title is required')
          ),
        { required: 'Title is required', transforms: [trim] }
      ),
      media_url: str(z.string().check(maxLen(URL_MAX), filled('Pick an image or a video')), {
        required: 'Pick an image or a video',
        transforms: [trim],
      }),
      media_type: str(z.enum(OFFICIAL_STATUS_MEDIA_TYPES), { oneOf: OFFICIAL_STATUS_MEDIA_TYPES, default: 'IMAGE' }),
      caption: str(z.string().check(maxLen(CAPTION_MAX, `Keep the caption under ${CAPTION_MAX} characters`)), {
        transforms: [trim],
        default: '',
      }),
      link_url: str(
        z
          .string()
          .check(
            maxLen(URL_MAX),
            matches(LINK_URL, 'Use an in-app path such as /pod-ideas, or a full https:// address')
          ),
        { transforms: [trim], default: '' }
      ),
      scope: str(z.enum(OFFICIAL_STATUS_SCOPES), {
        oneOf: OFFICIAL_STATUS_SCOPES,
        required: 'Choose who sees this status',
      }),
      location_ids: locationIds(),
      expiry: str(z.enum(OFFICIAL_STATUS_EXPIRIES), {
        oneOf: OFFICIAL_STATUS_EXPIRIES,
        required: 'Choose when this status expires',
      }),
      custom_expires_at: customExpiresAt(),
      is_active: bool(z.boolean(), { default: true }),
    },
    {
      when: {
        /* A GLOBAL status ignores whatever cities the form last held, so the list is
           only required on the branch that reads it. */
        location_ids: (status) => (status.scope === 'LOCATION' ? locationIds('Pick at least one city') : undefined),
        custom_expires_at: (status) =>
          status.expiry === 'CUSTOM' ? customExpiresAt(CUSTOM_EXPIRY_REQUIRED) : undefined,
      },
    }
  )
);

export type OfficialStatusDTO = z.infer<typeof officialStatusInputSchema>;
