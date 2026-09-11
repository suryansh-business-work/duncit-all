import { Input, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { GiftCardSegmented, type SegmentOption } from './GiftCardSegmented';

interface Props {
  /** True when the card is being sent to someone else. */
  forGift: boolean;
  email: string;
  name: string;
  message: string;
  /** Email validation error; null while valid or empty. */
  emailError: string | null;
  onToggle: (forGift: boolean) => void;
  onEmail: (value: string) => void;
  onName: (value: string) => void;
  onMessage: (value: string) => void;
}

/** The self/gift toggle and the recipient fields of the buy page (rule 27 twin). */
export function GiftCardRecipientFields({
  forGift,
  email,
  name,
  message,
  emailError,
  onToggle,
  onEmail,
  onName,
  onMessage,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const options: readonly SegmentOption<boolean>[] = [
    { value: false, label: t('mweb.giftCards.forMyself'), testID: 'gift-card-for-myself' },
    { value: true, label: t('mweb.giftCards.forSomeone'), testID: 'gift-card-for-someone' },
  ];
  const emailLabel = t('mweb.giftCards.recipientEmailLabel');
  const nameLabel = t('mweb.giftCards.recipientNameLabel');
  const messageLabel = t('mweb.giftCards.messageLabel');

  return (
    <SurfaceCard gap={12}>
      <SectionHeader title={t('mweb.giftCards.forHeading')} />
      <GiftCardSegmented options={options} value={forGift} onChange={onToggle} />
      {forGift ? (
        <YStack gap={10}>
          <Field
            label={emailLabel}
            required
            hint={t('mweb.giftCards.recipientEmailHint')}
            error={emailError ?? undefined}
            testID="gift-card-recipient-email"
          >
            <Input
              testID="gift-card-recipient-email-input"
              value={email}
              onChangeText={onEmail}
              placeholder={emailLabel}
              placeholderTextColor="$muted"
              keyboardType="email-address"
              autoCapitalize="none"
              aria-label={emailLabel}
            />
          </Field>
          <Field label={nameLabel} testID="gift-card-recipient-name">
            <Input
              testID="gift-card-recipient-name-input"
              value={name}
              onChangeText={onName}
              placeholder={nameLabel}
              placeholderTextColor="$muted"
              aria-label={nameLabel}
            />
          </Field>
          <Field
            label={messageLabel}
            hint={t('mweb.giftCards.messageHint')}
            testID="gift-card-message"
          >
            <Input
              testID="gift-card-message-input"
              value={message}
              onChangeText={onMessage}
              placeholder={messageLabel}
              placeholderTextColor="$muted"
              multiline
              numberOfLines={3}
              aria-label={messageLabel}
            />
          </Field>
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
