import type { Translate } from '../pricing/types';
import type { OfferSide } from './offer-target';

/** What an accept or a reject dialog says, as one side reads it. */
export interface AnswerCopy {
  title: string;
  /** The accept's confirmation naming what goes live, or what a reject means. */
  message: string;
  /** The reject's optional reason field. */
  reasonLabel: string;
  /** Said once the answer is saved. */
  done: string;
}

/** The names a confirmation reads out: the pod, the venue, when, and what the venue receives. */
export type AnswerVars = Record<'pod' | 'venue' | 'when' | 'amount', string>;

function venueAccept(t: Translate, vars: AnswerVars, free: boolean): AnswerCopy {
  return {
    title: t('availability.offers.acceptTitle'),
    message: free ? t('availability.offers.acceptMessageFree', { vars }) : t('availability.offers.acceptMessage', { vars }),
    reasonLabel: '',
    done: t('availability.offers.done.accepted'),
  };
}

function venueReject(t: Translate): AnswerCopy {
  return {
    title: t('availability.offers.rejectTitle'),
    message: t('availability.offers.rejectMessage'),
    reasonLabel: t('availability.offers.reason'),
    done: t('availability.offers.done.rejected'),
  };
}

function hostAccept(t: Translate, vars: AnswerVars, free: boolean): AnswerCopy {
  return {
    title: t('availability.offers.hostAnswer.acceptTitle'),
    // A free booking quotes no amount, so the confirmation names none (the venue's words read the same from the host's side).
    message: free ? t('availability.offers.acceptMessageFree', { vars }) : t('availability.offers.hostAnswer.acceptMessage', { vars }),
    reasonLabel: '',
    done: t('availability.offers.hostAnswer.accepted'),
  };
}

function hostReject(t: Translate): AnswerCopy {
  return {
    title: t('availability.offers.hostAnswer.rejectTitle'),
    message: t('availability.offers.hostAnswer.rejectMessage'),
    reasonLabel: t('availability.offers.hostAnswer.reason'),
    done: t('availability.offers.hostAnswer.rejected'),
  };
}

/** The venue accepts or rejects a host's terms; the host accepts or rejects the venue's counter. */
export function answerCopy(t: Translate, side: OfferSide, accept: boolean, vars: AnswerVars, free: boolean): AnswerCopy {
  if (side === 'HOST') return accept ? hostAccept(t, vars, free) : hostReject(t);
  return accept ? venueAccept(t, vars, free) : venueReject(t);
}

/** What a counter dialog says, as one side reads it. */
export interface CounterCopy {
  title: string;
  hint: string;
  done: string;
}

/** What the dialog says when one side changes its own counter before the other side saw it. */
export function editCopy(t: Translate): CounterCopy {
  return {
    title: t('availability.offers.revise.editTitle'),
    hint: t('availability.offers.revise.editHint'),
    done: t('availability.offers.revise.edited'),
  };
}

export function counterCopy(t: Translate, side: OfferSide): CounterCopy {
  if (side === 'HOST') {
    return {
      title: t('availability.offers.hostAnswer.counterTitle'),
      hint: t('availability.offers.hostAnswer.counterHint'),
      done: t('availability.offers.hostAnswer.countered'),
    };
  }
  return {
    title: t('availability.offers.counterTitle'),
    hint: t('availability.offers.counterHint'),
    done: t('availability.offers.done.countered'),
  };
}
