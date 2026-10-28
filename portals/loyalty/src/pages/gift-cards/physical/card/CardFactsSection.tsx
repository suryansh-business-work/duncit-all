import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid, { type InfoItem } from '../../../../components/detail/InfoGrid';
import { renderPerson } from '../../virtual/cells';
import { physicalBatchPath } from '../PhysicalListPages';
import { formatCoins } from '../labels';
import type { PhysicalCardRow } from '../queries';
import PasscodeReveal from './PasscodeReveal';

interface Props {
  card: PhysicalCardRow;
  /** The passcode is a write-seat read; the analyst seat sees only its last four digits. */
  canRevealPasscode: boolean;
  onPasscodeRevealed: () => void;
}

/** The card itself: its numbers, its coins, its batch, its member and its dates. */
export default function CardFactsSection({ card, canRevealPasscode, onPasscodeRevealed }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const when = (iso: string | null) => (iso ? formatDateTime(iso) : EM_DASH);

  const items: InfoItem[] = [
    { key: 'card-number', label: t('loyalty.physical.colCardNumber'), value: card.card_number },
    {
      key: 'passcode',
      label: t('loyalty.physical.colPasscode'),
      value: canRevealPasscode ? (
        <PasscodeReveal cardId={card.id} last4={card.passcode_last4} onRevealed={onPasscodeRevealed} />
      ) : (
        t('loyalty.physical.passcodeMasked', { vars: { last4: card.passcode_last4 } })
      ),
      wide: canRevealPasscode,
    },
    { key: 'coins', label: t('loyalty.physical.colCoins'), value: formatCoins(card.coins) },
    {
      key: 'batch',
      label: t('loyalty.physical.colBatch'),
      value: (
        <Link component={RouterLink} to={physicalBatchPath(card.batch_id)}>
          {card.batch_label || card.batch_id}
        </Link>
      ),
    },
    {
      key: 'member',
      label: t('loyalty.physical.colMember'),
      value: card.assigned_user_id
        ? renderPerson(card.assigned_user_name, card.assigned_user_email)
        : t('loyalty.physical.notMapped'),
    },
    {
      key: 'redeemer',
      label: t('loyalty.physical.colRedeemer'),
      value: card.redeemed_by_user_id ? renderPerson(card.redeemer_name, card.redeemer_email) : EM_DASH,
    },
    { key: 'redeemed-at', label: t('loyalty.physical.colRedeemedAt'), value: when(card.redeemed_at) },
    { key: 'expires', label: t('loyalty.physical.colExpires'), value: when(card.expires_at) },
    { key: 'generated', label: t('loyalty.physical.colGenerated'), value: when(card.created_at) },
    { key: 'generated-by', label: t('loyalty.physical.colCreatedBy'), value: card.created_by_name || EM_DASH },
  ];
  if (card.voided_at) {
    items.push(
      { key: 'voided-at', label: t('loyalty.physical.voidedAt'), value: when(card.voided_at) },
      { key: 'voided-by', label: t('loyalty.physical.voidedBy'), value: card.voided_by_name || EM_DASH },
      { key: 'void-reason', label: t('loyalty.physical.voidReasonLabel'), value: card.void_reason, wide: true },
    );
  }

  return (
    <SectionCard title={t('loyalty.physical.cardFacts')}>
      <InfoGrid items={items} />
    </SectionCard>
  );
}
