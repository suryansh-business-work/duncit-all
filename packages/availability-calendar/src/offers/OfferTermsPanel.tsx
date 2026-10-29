import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { currentOfferTerms, isFreeVenueOfferModel, venueOfferInboxStatus, type CurrentOfferTerms, type OfferStatusTone } from '@duncit/utils';
import type { PriceBreakdown, Translate } from '../pricing/types';
import { offerTermsLabel } from './format';
import FreeJustificationNote from './FreeJustificationNote';
import { OfferAnswerBy, OfferAsk } from './OfferAsk';
import OfferImages from './OfferImages';
import OfferQuoteView from './OfferQuoteView';
import type { OfferSide } from './offer-target';
import type { OfferTerms } from './queries';

interface Props {
  offer: OfferTerms;
  /** A free pod: the host settles the venue's charges directly, so no amount is quoted. */
  podIsFree: boolean;
  /** Who reads it: the venue (the default) or the pod's host. */
  side?: OfferSide;
}

/** Where the offer stands as the host is told — and the chip's tone. */
function hostStatus(t: Translate, status: string): { label: string; tone: OfferStatusTone } | null {
  if (status === 'SENT') return { label: t('availability.offers.hostAnswer.waiting'), tone: 'info' };
  if (status === 'COUNTERED') return { label: t('availability.offers.hostAnswer.yourMove'), tone: 'warning' };
  if (status === 'ACCEPTED') return { label: t('availability.offers.status.accepted'), tone: 'success' };
  if (status === 'DECLINED') return { label: t('availability.offers.status.declined'), tone: 'error' };
  return null;
}

function venueStatus(t: Translate, status: string): { label: string; tone: OfferStatusTone } | null {
  const known = venueOfferInboxStatus({ status });
  return known.key ? { label: t(known.key), tone: known.tone } : null;
}

/** Whose terms are on the table, as the reader names them. */
function termsHeading(t: Translate, side: OfferSide, by: string): string {
  if (side === 'HOST') return by === 'HOST' ? t('availability.offers.hostAnswer.yourTerms') : t('availability.offers.hostAnswer.venueTerms');
  return by === 'VENUE' ? t('availability.offers.yourTerms') : t('availability.offers.hostTerms');
}

const OPEN_STATUSES: ReadonlySet<string> = new Set(['SENT', 'COUNTERED']);

/** The money the terms come to — none for a free venue (the terms line says so), the free-pod notice for a free pod. */
function TermsMoney({ terms, podIsFree, side }: Readonly<{ terms: CurrentOfferTerms<PriceBreakdown>; podIsFree: boolean; side: OfferSide }>) {
  const { t } = useTranslation();
  if (isFreeVenueOfferModel(terms.model)) return null;
  if (!podIsFree) return <OfferQuoteView side={side} quote={terms.quote} quoteMin={terms.quoteMin} />;
  return <Alert severity="info">{side === 'HOST' ? t('availability.offers.hostAnswer.freePod') : t('availability.offers.freePod')}</Alert>;
}

/**
 * The terms on the table — the host's offer, or the venue's counter while it
 * waits — with where the offer stands, the server's quote of them as a range
 * from the venue's minimum guests to the pod's spots (and its breakdown at the
 * most), why the host asked for it free (a free venue), what the venue is asked
 * to provide, the note, the photos attached, and the answer-by time while it is
 * open. The venue and the host each read it from their side.
 */
export default function OfferTermsPanel({ offer, podIsFree, side = 'VENUE' }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = side === 'HOST' ? hostStatus(t, offer.status) : venueStatus(t, offer.status);
  const terms = currentOfferTerms(offer);

  return (
    <Stack spacing={1.25} data-testid={`offer-terms-${offer.slot_id}`}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          {termsHeading(t, side, terms.by)}
        </Typography>
        <Typography variant="body2">{offerTermsLabel(t, terms.model, terms.rate)}</Typography>
        {status && <Chip size="small" color={status.tone} label={status.label} data-testid="offer-status" />}
      </Stack>
      <TermsMoney terms={terms} podIsFree={podIsFree} side={side} />
      <FreeJustificationNote justification={offer.free_justification} />
      <OfferAsk offerings={terms.offerings} note={terms.note} by={terms.by} />
      {/* The photos go with the terms on the table: the venue's counter's while there is one. */}
      <OfferImages images={offer.counter ? offer.counter.images : offer.images} />
      {OPEN_STATUSES.has(offer.status) && <OfferAnswerBy at={offer.expires_at} />}
    </Stack>
  );
}
