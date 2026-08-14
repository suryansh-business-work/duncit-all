import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { EMAIL } from '@duncit/regex';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import ThemePicker from './ThemePicker';
import AmountPicker from './AmountPicker';
import GiftRecipientFields from './GiftRecipientFields';
import HowItWorksCard from './HowItWorksCard';
import {
  GIFT_CARD_CATEGORIES,
  GIFT_CARD_SETTINGS,
  type GiftCardCategory,
  type GiftCardScopeType,
  type GiftCardSelection,
  type GiftCardSettings,
} from './queries';

/** The buy flow: theme → amount → who it's for → checkout. Amounts and limits
 * come from Finance > Gift Cards; themes come from the live category tree. */
export default function BuyTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settingsData, loading: settingsLoading, error: settingsError } = useQuery<{
    publicGiftCardSettings: GiftCardSettings;
  }>(GIFT_CARD_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const { data: categoriesData, error: categoriesError } = useQuery<{ categories: GiftCardCategory[] }>(
    GIFT_CARD_CATEGORIES,
    { fetchPolicy: 'cache-first' },
  );
  const { data: financeData } = useQuery(PUBLIC_FINANCE);

  const [scopeType, setScopeType] = useState<GiftCardScopeType>('SHOP');
  const [scopeCategory, setScopeCategory] = useState<GiftCardCategory | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [gift, setGift] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');

  const settings = settingsData?.publicGiftCardSettings ?? null;
  const categories = categoriesData?.categories ?? [];
  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';

  const amount = Number.parseInt(amountStr, 10);
  const amountValid =
    !!settings && Number.isFinite(amount) && amount >= settings.min_amount && amount <= settings.max_amount;
  const scopeValid = scopeType === 'SHOP' || !!scopeCategory;
  const emailValid = EMAIL.test(recipientEmail.trim());
  const emailError = gift && recipientEmail.trim() !== '' && !emailValid;
  const canContinue = scopeValid && amountValid && (!gift || emailValid);
  // The picker previews the chosen amount; before one is valid it shows the
  // first configured denomination so the cards never read ₹NaN.
  const previewAmount = amountValid ? amount : settings?.denominations[0] ?? settings?.min_amount ?? 0;

  const onGroup = (group: GiftCardScopeType) => {
    setScopeType(group);
    setScopeCategory(null);
  };

  const onContinue = () => {
    if (!canContinue || !scopeValid) return;
    const shop = scopeType === 'SHOP';
    const selection: GiftCardSelection = {
      scope_type: scopeType,
      scope_category_id: shop ? null : scopeCategory?.id ?? null,
      scope_name: shop ? '' : scopeCategory?.name ?? '',
      scope_image_url: shop ? '' : scopeCategory?.icon ?? '',
      amount,
      gift,
      recipient_email: gift ? recipientEmail.trim() : '',
      recipient_name: gift ? recipientName.trim() : '',
      message: gift ? message.trim() : '',
    };
    navigate('/gift-cards/checkout', { state: selection });
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('mweb.giftCards.buyTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('mweb.giftCards.buySubtitle')}
        </Typography>
      </Box>
      {(settingsError || categoriesError) && <Alert severity="error">{t('mweb.giftCards.loadError')}</Alert>}
      {settingsLoading && !settings && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}
      {settings && (
        <>
          <ThemePicker
            categories={categories}
            scopeType={scopeType}
            scopeCategoryId={scopeCategory?.id ?? null}
            amount={previewAmount}
            currencySymbol={currencySymbol}
            onGroup={onGroup}
            onPick={setScopeCategory}
          />
          <AmountPicker
            settings={settings}
            currencySymbol={currencySymbol}
            amountStr={amountStr}
            onChange={setAmountStr}
          />
          <GiftRecipientFields
            gift={gift}
            onGift={setGift}
            email={recipientEmail}
            onEmail={setRecipientEmail}
            emailError={emailError}
            name={recipientName}
            onName={setRecipientName}
            message={message}
            onMessage={setMessage}
          />
          <Button
            variant="contained"
            size="large"
            disabled={!canContinue}
            onClick={onContinue}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {t('mweb.giftCards.continueCta')}
          </Button>
        </>
      )}
      <HowItWorksCard />
    </Stack>
  );
}
