import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import {
  podProductBlurb,
  podProductImage,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';
import { formatMoney } from './format';
import type { Translate } from './i18n/useTranslation';

interface Props {
  product: PodPickerProduct;
  selected: boolean;
  /** Already attached to the pod — shown, but not pickable again. */
  added: boolean;
  onSelect: (id: string) => void;
  t: Translate;
}

/** One product in the picker grid. The whole card is the select control, so a
 * host picks by clicking the name card exactly as the flow describes. */
export default function ProductCard({ product, selected, added, onSelect, t }: Readonly<Props>) {
  const stock = podProductStock(product);
  const outOfStock = stock <= 0;
  const disabled = added || outOfStock;
  const image = podProductImage(product);
  const blurb = podProductBlurb(product);

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <CardActionArea
        onClick={() => onSelect(product.id)}
        disabled={disabled}
        aria-pressed={selected}
        sx={{ height: '100%', alignItems: 'stretch', p: 1.5 }}
      >
        <Stack spacing={1} height="100%">
          <Box
            sx={{
              position: 'relative',
              height: 132,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {image ? (
              <Box
                component="img"
                src={image}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <ImageNotSupportedIcon color="disabled" />
            )}
            {selected && (
              <CheckCircleIcon
                color="primary"
                sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'background.paper', borderRadius: '50%' }}
              />
            )}
          </Box>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
            {product.product_name}
          </Typography>
          {product.brand_name && (
            <Typography variant="caption" color="text.secondary">
              {product.brand_name}
            </Typography>
          )}
          {blurb && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {blurb}
            </Typography>
          )}
          <Box flexGrow={1} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography variant="subtitle2" color="primary.main">
              {t('podProduct.perUnit', { vars: { cost: formatMoney(product.unit_cost) } })}
            </Typography>
            <StockChip added={added} outOfStock={outOfStock} stock={stock} t={t} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

interface StockChipProps {
  added: boolean;
  outOfStock: boolean;
  stock: number;
  t: Translate;
}

/** The card's right-hand status: attached beats out-of-stock beats units-left. */
function StockChip({ added, outOfStock, stock, t }: Readonly<StockChipProps>) {
  if (added) {
    return <Chip size="small" color="success" label={t('podProduct.alreadyAdded')} />;
  }
  if (outOfStock) {
    return <Chip size="small" color="default" label={t('podProduct.outOfStock')} />;
  }
  return (
    <Typography variant="caption" color="text.secondary">
      {t('podProduct.unitsLeft', { vars: { count: stock } })}
    </Typography>
  );
}
