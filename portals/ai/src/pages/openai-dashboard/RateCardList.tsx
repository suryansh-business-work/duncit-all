import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { ModelPrice } from './queries';

interface Props {
  prices: readonly ModelPrice[];
  /** `null` opens the dialog for a new model; a row opens it for that model. */
  onEdit: (price: ModelPrice | null) => void;
}

interface RateRowProps {
  price: ModelPrice;
  onEdit: (p: ModelPrice) => void;
  rateLine: string;
  editAria: string;
}

function RateRow({ price, onEdit, rateLine, editAria }: Readonly<RateRowProps>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "space-between"
      }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap title={price.model} sx={{
          fontWeight: 600
        }}>
          {price.model}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {rateLine}
        </Typography>
      </Box>
      <IconButton size="small" aria-label={editAria} onClick={() => onEdit(price)}>
        <EditIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

/**
 * What each model is billed at. Every usage row is priced when it is written,
 * so a model missing from this list records tokens at zero cost until a rate is
 * added — the dashboard says so above rather than leaving the total quietly short.
 */
export default function RateCardList({ prices, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Button size="small" startIcon={<AddIcon />} onClick={() => onEdit(null)} sx={{ alignSelf: 'flex-start' }}>
        {t('ai.rateCard.addModel')}
      </Button>
      <Stack spacing={1.25} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
        {prices.map((price) => (
          <RateRow
            key={price.id}
            price={price}
            onEdit={onEdit}
            rateLine={t('ai.rateCard.rateLine', {
              vars: { input: price.input_per_1m, output: price.output_per_1m },
            })}
            editAria={t('ai.rateCard.editAria', { vars: { model: price.model } })}
          />
        ))}
      </Stack>
    </Stack>
  );
}
