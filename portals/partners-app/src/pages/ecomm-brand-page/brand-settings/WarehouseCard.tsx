import { Box, Card, CardContent, Chip, FormControlLabel, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandWarehouse, WarehouseReviewStatus } from './warehouse.queries';
import { WarehouseShiprocketChip, WarehouseShiprocketNote } from './WarehouseShiprocketState';

export interface WarehouseCardProps {
  warehouse: BrandWarehouse;
  busy: boolean;
  onEdit: (warehouse: BrandWarehouse) => void;
  onDelete: (warehouse: BrandWarehouse) => void;
  onSetDefault: (warehouse: BrandWarehouse) => void;
  /** Switch the address on, or ask to switch it off. */
  onToggleActive: (warehouse: BrandWarehouse, active: boolean) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const addressLine = (warehouse: BrandWarehouse) =>
  [warehouse.address_line1, warehouse.address_line2, warehouse.city, warehouse.state, warehouse.pincode]
    .filter(Boolean)
    .join(', ');

/** What the partner can act on: the Duncit review. ShipRocket's side is its own
 * chip (WarehouseShiprocketChip) beside it — once read as "still not approved"
 * when it shared this one, so the two never merge. */
const reviewChip = (t: Translate): Record<WarehouseReviewStatus, { label: string; color: 'success' | 'warning' | 'error' }> => ({
  APPROVED: { label: t('partners.ecommBrandPage.approved'), color: 'success' },
  PENDING: { label: t('partners.ecommBrandPage.awaitingApproval'), color: 'warning' },
  REJECTED: { label: t('partners.ecommBrandPage.rejected'), color: 'error' },
});

/** Says what the state means for the partner — a bare chip left them guessing
 * whether the wait was theirs to end. */
const reviewHint = (status: WarehouseReviewStatus, t: Translate) =>
  status === 'REJECTED' ? t('partners.warehouses.rejectedHint') : t('partners.warehouses.pendingHint');

/** One pickup address: its summary, approval and ShipRocket state, and its
 * actions — primary, active/inactive (as ShipRocket shows them), edit, delete. */
export default function WarehouseCard({ warehouse, busy, onEdit, onDelete, onSetDefault, onToggleActive }: Readonly<WarehouseCardProps>) {
  const { t } = useTranslation();
  const review = reviewChip(t)[warehouse.review_status] ?? reviewChip(t).PENDING;
  const name = warehouse.nickname;
  const active = warehouse.is_active !== false;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, opacity: active ? 1 : 0.85 }} data-testid={`pickup-card-${warehouse.id}`}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography component="h3" sx={{ fontWeight: 900 }}>{name}</Typography>
              {warehouse.is_default && <Chip size="small" color="primary" label={t('partners.warehouses.primary')} />}
              {!active && <Chip size="small" variant="outlined" label={t('partners.warehouses.inactive')} />}
              <Chip size="small" color={review.color} label={review.label} />
              <WarehouseShiprocketChip warehouse={warehouse} />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {addressLine(warehouse)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {warehouse.contact_name} · {warehouse.phone} · {warehouse.email}
            </Typography>
            {warehouse.review_status !== 'APPROVED' && (
              <Typography variant="caption" color={`${review.color}.main`} sx={{ display: 'block', mt: 0.5 }}>
                {reviewHint(warehouse.review_status, t)}
              </Typography>
            )}
            {!active && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                {t('partners.warehouses.inactiveHint')}
              </Typography>
            )}
            <WarehouseShiprocketNote warehouse={warehouse} />
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start', flexShrink: 0 }}>
            <FormControlLabel
              sx={{ mr: 0.5 }}
              label={<Typography variant="caption">{active ? t('partners.warehouses.active') : t('partners.warehouses.inactive')}</Typography>}
              control={
                <Switch
                  size="small"
                  checked={active}
                  disabled={busy}
                  onChange={(_event, checked) => onToggleActive(warehouse, checked)}
                  slotProps={{
                    input: {
                      'aria-label': active
                        ? t('partners.warehouses.activeToggleAria', { vars: { name } })
                        : t('partners.warehouses.inactiveToggleAria', { vars: { name } }),
                    },
                  }}
                  data-testid={`pickup-active-${warehouse.id}`}
                />
              }
            />
            <Tooltip title={warehouse.is_default ? t('partners.warehouses.primaryTooltip') : t('partners.warehouses.makePrimary')}>
              <span>
                <DuncitIconButton
                  size="small"
                  color="primary"
                  disabled={busy || warehouse.is_default || !active}
                  onClick={() => onSetDefault(warehouse)}
                  aria-label={t('partners.warehouses.makePrimaryAria', { vars: { name } })}
                >
                  {warehouse.is_default ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('shell.common.edit')}>
              <DuncitIconButton size="small" disabled={busy} onClick={() => onEdit(warehouse)} aria-label={t('partners.warehouses.editAria', { vars: { name } })}>
                <EditIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
            <Tooltip title={t('shell.common.delete')}>
              <DuncitIconButton size="small" color="error" disabled={busy} onClick={() => onDelete(warehouse)} aria-label={t('partners.warehouses.deleteAria', { vars: { name } })}>
                <DeleteOutlineIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
