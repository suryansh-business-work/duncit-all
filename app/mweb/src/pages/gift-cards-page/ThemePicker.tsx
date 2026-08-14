import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from './GiftCardVisual';
import type { GiftCardCategory, GiftCardScopeType } from './queries';

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
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {t('mweb.giftCards.themeHeading')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        {THEME_GROUPS.map((group) => {
          const active = scopeType === group.value;
          return (
            <Chip
              key={group.value}
              label={t(group.labelKey)}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => onGroup(group.value)}
            />
          );
        })}
      </Stack>
      {scopeType === 'SHOP' ? (
        <Box sx={{ mt: 1.5 }}>
          <GiftCardVisual
            scopeType="SHOP"
            scopeCategoryId={null}
            scopeName=""
            scopeImageUrl=""
            amount={amount}
            currencySymbol={currencySymbol}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {t('mweb.giftCards.shopThemeCaption')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
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
                  borderRadius: '16px',
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
                  amount={amount}
                  currencySymbol={currencySymbol}
                />
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
