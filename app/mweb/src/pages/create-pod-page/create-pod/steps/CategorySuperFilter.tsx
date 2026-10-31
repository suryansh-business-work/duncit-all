import { Box, ButtonBase, Typography } from '@mui/material';
import type { CreatePodSuperOption } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';

interface Props {
  options: readonly CreatePodSuperOption[];
  value: string;
  onChange: (id: string) => void;
}

/** "For You" / "For Your Pet" — narrows the category tiles to one
 * super-category. Names only: neither carries an icon (as in the app header). */
export default function CategorySuperFilter({ options, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      role="group"
      aria-label={t('mweb.createPod.categoryFor')}
      data-testid="create-pod-category-super"
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 999,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <ButtonBase
            key={option.id}
            data-testid={`create-pod-category-super-${option.id}`}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              px: 1.5,
              borderRadius: 999,
              color: selected ? 'primary.contrastText' : 'text.primary',
              bgcolor: selected ? 'primary.main' : 'transparent',
              transition: (theme) => theme.transitions.create(['background-color', 'color']),
            }}
          >
            <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{option.name}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
