import { Input, Text, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';

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
  const options = [
    { gift: false, label: t('mweb.giftCards.forMyself'), testID: 'gift-card-for-myself' },
    { gift: true, label: t('mweb.giftCards.forSomeone'), testID: 'gift-card-for-someone' },
  ];
  const emailLabel = t('mweb.giftCards.recipientEmailLabel');
  const nameLabel = t('mweb.giftCards.recipientNameLabel');
  const messageLabel = t('mweb.giftCards.messageLabel');

  return (
    <YStack gap={10}>
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('mweb.giftCards.forHeading')}
      </Text>
      <XStack gap={8}>
        {options.map((option) => {
          const isActive = forGift === option.gift;
          return (
            <XStack
              key={option.testID}
              testID={option.testID}
              role="button"
              aria-label={option.label}
              onPress={() => onToggle(option.gift)}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={999}
              borderWidth={1}
              borderColor={isActive ? '$primary' : '$borderColor'}
              backgroundColor={isActive ? '$primary' : 'transparent'}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize={13} fontWeight="700" color={isActive ? '$onPrimary' : '$color'}>
                {option.label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
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
    </YStack>
  );
}
