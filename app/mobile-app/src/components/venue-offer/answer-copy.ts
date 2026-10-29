import type { Translate } from '@/i18n/fallback';
import type { OfferSide } from './offer-format';

/** Accept or reject the terms on the table. */
export type AnswerChoice = 'accept' | 'reject';

/** What an accept names: the pod, the venue, when, and what the venue receives. */
export type AnswerVars = Record<'pod' | 'venue' | 'when' | 'amount', string>;

/** What the sheet says. `reasonLabel` is '' for an accept (it asks for no reason). */
export interface AnswerCopy {
  title: string;
  message: string;
  reasonLabel: string;
}

/** The sheet's keys by side and choice: [title, message, reason label]. */
const KEYS: Readonly<Record<OfferSide, Record<AnswerChoice, readonly [string, string, string]>>> = {
  VENUE: {
    accept: ['availability.offers.acceptTitle', 'availability.offers.acceptMessage', ''],
    reject: [
      'availability.offers.rejectTitle',
      'availability.offers.rejectMessage',
      'availability.offers.reason',
    ],
  },
  HOST: {
    accept: [
      'availability.offers.hostAnswer.acceptTitle',
      'availability.offers.hostAnswer.acceptMessage',
      '',
    ],
    reject: [
      'availability.offers.hostAnswer.rejectTitle',
      'availability.offers.hostAnswer.rejectMessage',
      'availability.offers.hostAnswer.reason',
    ],
  },
};

/**
 * The venue accepting or rejecting a host's terms, or the host the venue's
 * counter. Accepting a free arrangement names no amount, on either side: a free
 * pod's host settles the venue's charges directly, and a free venue is paid
 * nothing.
 */
export function offerAnswerCopy(
  t: Translate,
  side: OfferSide,
  choice: AnswerChoice,
  vars: AnswerVars,
  free: boolean,
): AnswerCopy {
  const [title, message, reason] = KEYS[side][choice];
  const freeAccept = choice === 'accept' && free;
  return {
    title: t(title),
    message: t(freeAccept ? 'availability.offers.acceptMessageFree' : message, { vars }),
    reasonLabel: reason ? t(reason) : '',
  };
}
