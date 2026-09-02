import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { EMAIL } from '@duncit/regex';

import { PrimaryButton } from '@/components/PrimaryButton';
import type { GiftCardCategory, GiftCardSettings } from '@/hooks/useGiftCards';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { GiftCardAmountPicker } from './GiftCardAmountPicker';
import { GiftCardHowItWorks } from './GiftCardHowItWorks';
import { GiftCardRecipientFields } from './GiftCardRecipientFields';
import { GiftCardThemePicker, type GiftCardThemeChoice } from './GiftCardThemePicker';

interface Props {
  settings: GiftCardSettings;
  categories: readonly GiftCardCategory[];
  currency: string;
  onContinue: (selection: GiftCardSelection) => void;
}

/** The Buy tab: theme → amount → recipient → Continue, over the instruction
 * block. Owns the buy-form state; the screen only routes the selection on. */
export function GiftCardBuySection({
  settings,
  categories,
  currency,
  onContinue,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<GiftCardThemeChoice | null>(null);
  const [chipAmount, setChipAmount] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [forGift, setForGift] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const rangeHint = t('mweb.giftCards.amountRangeHint', {
    vars: {
      min: formatMoney(currency, settings.min_amount),
      max: formatMoney(currency, settings.max_amount),
    },
  });
  const hasCustom = customText.trim() !== '';
  const customValue = Number.parseInt(customText.trim(), 10);
  const customValid =
    Number.isFinite(customValue) &&
    customValue >= settings.min_amount &&
    customValue <= settings.max_amount;
  let amount: number | null = chipAmount;
  if (hasCustom) amount = customValid ? customValue : null;
  const amountError = hasCustom && !customValid ? rangeHint : null;

  const trimmedEmail = email.trim();
  const emailValid = EMAIL.test(trimmedEmail);
  let emailError: string | null = null;
  if (forGift && trimmedEmail !== '' && !emailValid) {
    emailError = t('mweb.auth.validation.emailInvalid');
  }
  const canContinue = !!theme && amount !== null && (!forGift || emailValid);

  const continueToPayment = () => {
    /* istanbul ignore next -- the button is disabled until both exist */
    if (!theme || amount === null) return;
    onContinue({
      scope_type: theme.scope_type,
      scope_category_id: theme.scope_category_id,
      scope_name: theme.scope_name,
      scope_image_url: theme.scope_image_url,
      scope_image_front_url: theme.scope_image_front_url,
      scope_image_back_url: theme.scope_image_back_url,
      amount,
      recipient_email: forGift ? trimmedEmail : '',
      recipient_name: forGift ? name.trim() : '',
      message: forGift ? message.trim() : '',
    });
  };

  return (
    <YStack gap={18}>
      <YStack gap={4}>
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.giftCards.buyTitle')}
        </Text>
        <Text fontSize={13} color="$muted">
          {t('mweb.giftCards.buySubtitle')}
        </Text>
      </YStack>
      <GiftCardThemePicker categories={categories} value={theme} onChange={setTheme} />
      <GiftCardAmountPicker
        denominations={settings.denominations}
        min={settings.min_amount}
        max={settings.max_amount}
        currency={currency}
        selected={chipAmount}
        customText={customText}
        error={amountError}
        onSelect={(picked) => {
          setChipAmount(picked);
          setCustomText('');
        }}
        onCustomChange={setCustomText}
      />
      <GiftCardRecipientFields
        forGift={forGift}
        email={email}
        name={name}
        message={message}
        emailError={emailError}
        onToggle={setForGift}
        onEmail={setEmail}
        onName={setName}
        onMessage={setMessage}
      />
      <PrimaryButton
        testID="gift-card-continue"
        label={t('mweb.giftCards.continueCta')}
        disabled={!canContinue}
        onPress={continueToPayment}
      />
      <GiftCardHowItWorks />
    </YStack>
  );
}
