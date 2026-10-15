import {
  CALM,
  LIVE,
  PAUSED,
  STOPPED,
  buttonPair,
  callout,
  closing,
  closingText,
  cta,
  detailRows,
  intro,
  introBlock,
  notice,
  paragraph,
  shell,
  textLink,
  text,
} from './mjml';
import { FIELD, LABEL } from './catalogue.copy';
import { EMAIL_COLOR as C, EMAIL_SPACE as S, EMAIL_TYPE as F } from './tokens';

/**
 * The bodies of the booking, payout and venue emails.
 *
 * Moved out of their `.mjml` files (rule 28) with every variable they used
 * still in place; the words are keys in `catalogue.bundle.core.ts`, beside the
 * few (`email.podRefund.*`, `email.giftCard.*`, `email.venueSlotRequest.*`)
 * that were already localized before the move.
 */

/**
 * The gift card itself: a dark card with the value large and the code beneath.
 *
 * The one body with a stage of its own — the card is what somebody paid for,
 * so it is drawn as an object to keep rather than as another line of text.
 */
const GIFT_CARD_STAGE = `      <mj-section padding="0 ${S.gutter} 20px ${S.gutter}">
        <mj-column background-color="${C.stage}" border-radius="${S.panelRadius}" padding="28px 20px">
          <mj-text align="center" font-size="${F.caption.size}" line-height="${F.caption.line}" font-weight="700" text-transform="uppercase" letter-spacing="1px" color="${C.onStageMuted}" padding="0">{{scope_label}}</mj-text>
          <mj-text align="center" font-size="${F.code.size}" line-height="${F.code.line}" font-weight="700" color="${C.onStage}" padding="6px 0 0 0">{{amount}}</mj-text>
          <mj-text align="center" font-family="${F.mono}" font-size="${F.value.size}" line-height="${F.value.line}" font-weight="700" letter-spacing="3px" color="${C.stageAccent}" padding="14px 0 0 0">{{code}}</mj-text>
          <mj-text align="center" font-size="${F.caption.size}" line-height="${F.caption.line}" color="${C.onStageMuted}" padding="8px 0 0 0">{{t:email.giftCard.expires}} {{expires_on}}</mj-text>
        </mj-column>
      </mj-section>`;

/** A muted aside for a line the service writes itself, such as a refund. */
const aside = (varName: string) => paragraph(`<span style="color:${C.muted}">{{${varName}}}</span>`);

export const BOOKING_BODIES: Record<string, string> = {
  'event-ticket': shell(
    'email.eventTicket.title',
    [
      intro('email.eventTicket.title', 'email.eventTicket.body', 'name'),
      callout(LIVE, LABEL.ticket, 'ticket_code'),
      detailRows([
        { labelKey: FIELD.pod, valueVar: 'event_title' },
        { labelKey: FIELD.when, valueVar: 'date_label' },
        { labelKey: FIELD.place, valueVar: 'venue_line' },
        { labelKey: 'email.eventTicket.admits', valueVar: 'seats_count' },
      ]),
      cta('email.booking.view', 'booking_url'),
      closing('email.eventTicket.keepSafe'),
    ].join('\n'),
    'email.eventTicket.body'
  ),

  'payment-receipt': shell(
    'email.paymentReceipt.title',
    [
      intro('email.paymentReceipt.title', 'email.paymentReceipt.body', 'name'),
      callout(LIVE, 'email.paymentReceipt.amountLabel', 'amount'),
      detailRows([
        { labelKey: 'email.paymentReceipt.bookingLabel', valueVar: 'summary' },
        { labelKey: FIELD.invoiceNo, valueVar: 'invoice_no' },
        { labelKey: 'email.paymentReceipt.paymentIdLabel', valueVar: 'payment_id' },
      ]),
      cta('email.booking.view', 'booking_url'),
      closing('email.paymentReceipt.help'),
    ].join('\n'),
    'email.paymentReceipt.body'
  ),

  'pod-updated': shell(
    'email.podUpdated.title',
    [
      intro('email.podUpdated.title', 'email.podUpdated.body', 'name'),
      callout(CALM, LABEL.pod, 'pod_title'),
      detailRows([{ labelKey: 'email.podUpdated.scheduledLabel', valueVar: 'when' }]),
      closing('email.podUpdated.review'),
    ].join('\n'),
    'email.podUpdated.body'
  ),

  'pod-cancelled': shell(
    'email.podCancelled.title',
    [
      intro('email.podCancelled.title', 'email.podCancelled.body', 'name'),
      callout(STOPPED, LABEL.pod, 'pod_title'),
      detailRows([
        { labelKey: 'email.podCancelled.wasScheduledLabel', valueVar: 'when' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ]),
      aside('refund_line'),
      closing('email.podCancelled.explore'),
    ].join('\n'),
    'email.podCancelled.body'
  ),

  'pod-refund': shell(
    'email.podRefund.title',
    [
      intro('email.podRefund.title', 'email.podRefund.intro', 'name'),
      callout(LIVE, LABEL.refund, 'amount'),
      detailRows([
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: 'email.podRefund.reason', valueVar: 'reason' },
      ]),
      closingText('{{t:email.podRefund.settlementNote}} {{t:email.common.supportNote}}'),
    ].join('\n'),
    'email.podRefund.intro'
  ),

  'pod-backout-spot-filled': shell(
    'email.backoutFilled.title',
    [
      intro('email.backoutFilled.title', 'email.backoutFilled.body', 'name'),
      callout(LIVE, LABEL.pod, 'pod_title'),
      paragraph(`<strong style="color:${C.success}">{{refund_line}}</strong>`),
      closing('email.backoutFilled.complete'),
    ].join('\n'),
    'email.backoutFilled.body'
  ),

  'gift-card-received': shell(
    'email.giftCard.title',
    [
      introBlock({
        title: '{{t:email.giftCard.title}}',
        nameVar: 'recipient_name',
        body: '<strong>{{sender_name}}</strong> {{t:email.giftCard.intro}}',
      }),
      GIFT_CARD_STAGE,
      paragraph('<em>{{message_line}}</em>'),
      cta('email.giftCard.redeemCta', 'redeem_url'),
      closing('email.giftCard.howItWorks'),
    ].join('\n')
  ),

  'payout-statement': shell(
    'email.payoutStatement.title',
    [
      intro('email.payoutStatement.title', 'email.payoutStatement.body', 'name'),
      detailRows([
        { labelKey: 'email.payoutStatement.venueBillLabel', valueVar: 'venue_bill' },
        { labelKey: 'email.payoutStatement.gstLabel', valueVar: 'gst_amount' },
        { labelVar: 'duncit_label', valueVar: 'duncit_amount' },
        { labelVar: 'payout_label', valueVar: 'payout_amount', total: true },
      ]),
      aside('reason'),
    ].join('\n'),
    'email.payoutStatement.body'
  ),

  'payment-release-approved': shell(
    'email.paymentReleaseApproved.title',
    [
      intro('email.paymentReleaseApproved.title', 'email.paymentReleaseApproved.body', 'name'),
      callout(LIVE, 'email.paymentReleaseApproved.approvedLabel', 'approved_amount'),
      detailRows([
        { labelKey: 'email.paymentReleaseApproved.releaseTypeLabel', valueVar: 'approval_type' },
        { labelKey: 'email.paymentReleaseApproved.requestedLabel', valueVar: 'amount_requested' },
      ]),
      aside('reason'),
    ].join('\n'),
    'email.paymentReleaseApproved.body'
  ),

  'pod-calculator-report': shell(
    'email.podCalculator.title',
    [
      intro('email.podCalculator.title', 'email.podCalculator.intro'),
      callout(CALM, 'email.podCalculator.calculationLabel', 'calculation_name'),
      notice(PAUSED, 'email.podCalculator.estimateTitle', '{{t:email.podCalculator.estimateNote}}'),
      closing('email.podCalculator.footer'),
    ].join('\n'),
    'email.podCalculator.intro'
  ),

  'venue-slot-request': shell(
    'email.venueSlotRequest.title',
    [
      introBlock({
        title: '{{t:email.venueSlotRequest.title}}',
        nameVar: 'owner_name',
        body: '<strong>{{host_name}}</strong> {{t:email.venueSlotRequest.intro}} <strong>{{venue_name}}</strong>. {{t:email.venueSlotRequest.hold}}',
      }),
      detailRows([
        { labelKey: 'email.venueSlotRequest.pod', valueVar: 'pod_title' },
        { labelKey: 'email.venueSlotRequest.slot', valueVar: 'when' },
      ]),
      buttonPair(
        { labelKey: 'email.venueSlotRequest.approve', urlVar: 'approve_url' },
        { labelKey: 'email.venueSlotRequest.decline', urlVar: 'decline_url' }
      ),
      text('email.venueSlotRequest.earningsNote'),
      textLink('email.venueSlotRequest.reviewAll', 'review_url'),
    ].join('\n'),
    'email.venueSlotRequest.hold'
  ),
};
