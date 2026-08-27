import { useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, Alert, Box, Dialog, Divider, Grid, Stack, Toolbar, Typography } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import {
  BLANK_POD_PRODUCT_CRITERIA,
  clampPodProductQty,
  filterPodProducts,
  podProductBrands,
  type PodPickerProduct,
  type PodProductCriteria,
} from '@duncit/utils';
import ProductCard from './ProductCard';
import ProductFilterBar from './ProductFilterBar';
import SelectionPanel from './SelectionPanel';
import { useTranslation } from './i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Already narrowed to the pod's Super → Category → Sub by the caller. */
  products: readonly PodPickerProduct[];
  /** Product ids already attached to this pod — shown as "Added", not pickable. */
  addedIds: readonly string[];
  onAdd: (productId: string, quantity: number) => void;
}

/**
 * The full-page "Add a Product" browser for Create a Pod.
 *
 * Selection is mandatory and explicit: the host picks a product by clicking its
 * card, which highlights it and is the ONLY thing that enables the quantity
 * stepper. Changing the pick resets the quantity, so a count chosen for one
 * product can never be carried onto another.
 */
export default function PodProductDialog({
  open,
  onClose,
  products,
  addedIds,
  onAdd,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [criteria, setCriteria] = useState<PodProductCriteria>(BLANK_POD_PRODUCT_CRITERIA);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const added = useMemo(() => new Set(addedIds.map(String)), [addedIds]);
  const brands = useMemo(() => podProductBrands(products), [products]);
  const visible = useMemo(() => filterPodProducts(products, criteria), [products, criteria]);
  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const reset = () => {
    setCriteria(BLANK_POD_PRODUCT_CRITERIA);
    setSelectedId('');
    setQuantity(1);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  // A new pick starts at 1 — never inherits the count chosen for the last one.
  const select = (id: string) => {
    setSelectedId(id);
    setQuantity(1);
    setError('');
  };

  const submit = () => {
    if (!selected) {
      setError(t('podProduct.selectFirst'));
      return;
    }
    onAdd(selected.id, clampPodProductQty(quantity, selected));
    reset();
    onClose();
  };

  return (
    <Dialog fullScreen open={open} onClose={close}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Stack
            sx={{
              flexGrow: 1,
              minWidth: 0
            }}>
            <Typography variant="h6" noWrap>
              {t('podProduct.dialogTitle')}
            </Typography>
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {t('podProduct.dialogSubtitle')}
            </Typography>
          </Stack>
          <DuncitIconButton edge="end" aria-label={t('podProduct.close')} onClick={close}>
            <CloseIcon />
          </DuncitIconButton>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, minHeight: 0 }}>
        <Grid
          sx={{ p: 2, overflowY: 'auto' }}
          size={{
            xs: 12,
            md: 8
          }}>
          <Stack spacing={2}>
            <ProductFilterBar
              criteria={criteria}
              onChange={setCriteria}
              onClear={() => setCriteria(BLANK_POD_PRODUCT_CRITERIA)}
              brands={brands}
              t={t}
            />
            <Divider />
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('podProduct.resultCount', { vars: { count: visible.length } })}
            </Typography>
            <ProductResults
              products={visible}
              total={products.length}
              added={added}
              selectedId={selectedId}
              onSelect={select}
              t={t}
            />
          </Stack>
        </Grid>
        <Grid
          sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, overflowY: 'auto' }}
          size={{
            xs: 12,
            md: 4
          }}>
          <SelectionPanel
            product={selected}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onAdd={submit}
            error={error}
            t={t}
          />
        </Grid>
      </Grid>
    </Dialog>
  );
}

interface ResultsProps {
  products: readonly PodPickerProduct[];
  /** Size of the pod's eligible catalogue before filters — tells an empty
   * result from an empty category. */
  total: number;
  added: ReadonlySet<string>;
  selectedId: string;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}

/** The grid, or the empty state that explains which kind of empty this is. */
function ProductResults({ products, total, added, selectedId, onSelect, t }: Readonly<ResultsProps>) {
  if (total === 0) {
    return <Alert severity="info">{t('podProduct.emptyCategory')}</Alert>;
  }
  if (products.length === 0) {
    return <Alert severity="info">{t('podProduct.emptySearch')}</Alert>;
  }
  return (
    <Box>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid
            key={product.id}
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <ProductCard
              product={product}
              selected={product.id === selectedId}
              added={added.has(String(product.id))}
              onSelect={onSelect}
              t={t}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
