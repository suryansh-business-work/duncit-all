import { Box, ButtonBase, Card, Chip, Stack, Typography } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from './GiftCardVisual';
import type { GiftCardCategory, GiftCardScopeType } from './queries';
import { CARD_PILL_IDLE_SX, CARD_PILL_SX } from './segmentedSx';

/** The four theme groups, in display order. Keys are literal (rule 38). */
const THEME_GROUPS: readonly { value: GiftCardScopeType; labelKey: string }[] = [
  { value: 'SHOP', labelKey: 'mweb.giftCards.themeShop' },
  { value: 'SUPER', labelKey: 'mweb.giftCards.themeSuper' },
  { value: 'CATEGORY', labelKey: 'mweb.giftCards.themeCategory' },
  { value: 'SUB', labelKey: 'mweb.giftCards.themeSub' },
];

interface ThemePickerProps {
  categories: GiftCardCategory[];
  scopeType: GiftCardScopeType;
  scopeCategoryId: string | null;
  /** The amount previewed on every option card. */
  amount: number;
  currencySymbol: string;
  onGroup: (group: GiftCardScopeType) => void;
  onPick: (category: GiftCardCategory) => void;
}

/** Theme = the card's design. Pod Shop is one fixed card; the three category
 * tiers each fan out into a scrollable rail of live category previews. */
export default function ThemePicker({
  categories,
  scopeType,
  scopeCategoryId,
  amount,
  currencySymbol,
  onGroup,
  onPick,
}: Readonly<ThemePickerProps>) {
  const { t } = useTranslation();
  const options = categories.filter((category) => category.level === scopeType);

  return (
    <Card sx={{ p: 2 }}>
      <SectionHeader title={t('mweb.giftCards.themeHeading')} />
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          mt: 1.5
        }}>
        {THEME_GROUPS.map((group) => {
          const active = scopeType === group.value;
          return (
            <Chip
              key={group.value}
              label={t(group.labelKey)}
              color={active ? 'primary' : 'default'}
              onClick={() => onGroup(group.value)}
              sx={active ? CARD_PILL_SX : CARD_PILL_IDLE_SX}
            />
          );
        })}
      </Stack>
      {scopeType === 'SHOP' ? (
        <Box sx={{ mt: 2 }}>
          <GiftCardVisual
            scopeType="SHOP"
            scopeCategoryId={null}
            scopeName=""
            scopeImageUrl=""
            amount={amount}
            currencySymbol={currencySymbol}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              mt: 1,
              display: 'block'
            }}>
            {t('mweb.giftCards.shopThemeCaption')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {options.map((category) => {
            const selected = category.id === scopeCategoryId;
            return (
              <ButtonBase
                key={category.id}
                onClick={() => onPick(category)}
                aria-pressed={selected}
                sx={{
                  flex: '0 0 auto',
                  width: 220,
                  p: '2px',
                  borderRadius: '18px',
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'transparent',
                  textAlign: 'left',
                }}
              >
                <GiftCardVisual
                  compact
                  scopeType={scopeType}
                  scopeCategoryId={category.id}
                  scopeName={category.name}
                  scopeImageUrl={category.icon ?? ''}
                  artworkFrontUrl={category.gift_card_image_front}
                  artworkBackUrl={category.gift_card_image_back}
                  amount={amount}
                  currencySymbol={currencySymbol}
                />
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Card>
  );
}
