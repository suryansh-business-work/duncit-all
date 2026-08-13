import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { ModelPrice } from './queries';

interface Props {
  prices: readonly ModelPrice[];
  /** `null` opens the dialog for a new model; a row opens it for that model. */
  onEdit: (price: ModelPrice | null) => void;
}

function RateRow({ price, onEdit }: Readonly<{ price: ModelPrice; onEdit: (p: ModelPrice) => void }>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap title={price.model}>
          {price.model}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          in ${price.input_per_1m} · out ${price.output_per_1m} — per 1M tokens
        </Typography>
      </Box>
      <IconButton size="small" aria-label={`Edit rate for ${price.model}`} onClick={() => onEdit(price)}>
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
  return (
    <Stack spacing={1.5}>
      <Button size="small" startIcon={<AddIcon />} onClick={() => onEdit(null)} sx={{ alignSelf: 'flex-start' }}>
        Add a model
      </Button>
      <Stack spacing={1.25} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
        {prices.map((price) => (
          <RateRow key={price.id} price={price} onEdit={onEdit} />
        ))}
      </Stack>
    </Stack>
  );
}
