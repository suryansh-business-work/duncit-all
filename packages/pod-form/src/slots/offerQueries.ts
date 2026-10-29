import { gql } from '@apollo/client';
import { VENUE_OFFER_CALENDAR_SDL, VENUE_OFFER_QUOTE_SDL } from '@duncit/utils';

/** Which days and hours the venue is open and free (≤ 62 days a call). */
export const VENUE_OFFER_CALENDAR = gql`${VENUE_OFFER_CALENDAR_SDL}`;

/** The server's price for the host's offer — or why it cannot be sent. */
export const VENUE_OFFER_QUOTE = gql`${VENUE_OFFER_QUOTE_SDL}`;

/** Each opening-offer option's name in this form's own copy — the priced ones, then a free venue. */
export const PODFORM_OFFER_MODEL_KEY: Readonly<Record<string, string>> = {
  PER_GUEST: 'podForm.offer.model.perGuest',
  PER_HOUR: 'podForm.offer.model.perHour',
  FLAT: 'podForm.offer.model.flat',
  FREE: 'podForm.offer.model.free',
};

/** One line on how each option pays the venue (per guest is a minimum order value per person; free pays nothing). */
export const PODFORM_OFFER_HELP_KEY: Readonly<Record<string, string>> = {
  PER_GUEST: 'podForm.offer.help.perGuest',
  PER_HOUR: 'podForm.offer.help.perHour',
  FLAT: 'podForm.offer.help.flat',
  FREE: 'podForm.offer.help.free',
};
