import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import type { BrandWarehouse, WarehouseReviewStatus } from './warehouse.queries';
import { useTranslation } from '@duncit/shell';

interface WarehouseCardProps {
  warehouse: BrandWarehouse;
  busy: boolean;
  onEdit: (warehouse: BrandWarehouse) => void;
  onDelete: (warehouse: BrandWarehouse) => void;
  onSetDefault: (warehouse: BrandWarehouse) => void;
}

const addressLine = (warehouse: BrandWarehouse) =>
  [warehouse.address_line1, warehouse.address_line2, warehouse.city, warehouse.state, warehouse.pincode]
    .filter(Boolean)
    .join(', ');

/** What the partner can act on. ShipRocket registration is Duncit-side plumbing
 * that never gates the partner, so showing it here (as this card used to) read
 * as "still not approved" long after the Products portal had approved it. */
type Translate = ReturnType<typeof useTranslation>['t'];

const reviewChip = (t: Translate): Record<WarehouseReviewStatus, { label: string; color: 'success' | 'warning' | 'error' }> => ({
  APPROVED: { label: t('partners.ecommBrandPage.approved'), color: 'success' },
  PENDING: { label: t('partners.ecommBrandPage.awaitingApproval'), color: 'warning' },
  REJECTED: { label: t('partners.ecommBrandPage.rejected'), color: 'error' },
});

/** Says what the state means for the partner — a bare chip left them guessing
 * whether the wait was theirs to end. */
const REVIEW_HINT: Record<WarehouseReviewStatus, string> = {
  APPROVED: '',
  PENDING: 'Products cannot ship from this warehouse until the Duncit team approves it.',
  REJECTED: 'This warehouse was rejected — edit the address and save to request another review.',
};

/** One warehouse card: address summary, approval status, edit/delete/default. */
function WarehouseCard({ warehouse, busy, onEdit, onDelete, onSetDefault }: Readonly<WarehouseCardProps>) {
  const { t } = useTranslation();
  const review = reviewChip(t)[warehouse.review_status] ?? reviewChip(t).PENDING;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          justifyContent: "space-between"
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography sx={{
                fontWeight: 900
              }}>{warehouse.nickname}</Typography>
              {warehouse.is_default && <Chip size="small" color="primary" label={t('partners.common.default')} />}
              <Chip size="small" color={review.color} label={review.label} />
            </Stack>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.5
              }}>
              {addressLine(warehouse)}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {warehouse.contact_name} · {warehouse.phone} · {warehouse.email}
            </Typography>
            {warehouse.review_status !== 'APPROVED' && (
              <Typography variant="caption" color={`${review.color}.main`} sx={{ display: 'block', mt: 0.5 }}>
                {REVIEW_HINT[warehouse.review_status] ?? REVIEW_HINT.PENDING}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} sx={{
            alignItems: "flex-start"
          }}>
            <Tooltip title={warehouse.is_default ? 'Default warehouse' : 'Make default'}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={busy || warehouse.is_default}
                  onClick={() => onSetDefault(warehouse)}
                  aria-label={`Make ${warehouse.nickname} default`}
                >
                  {warehouse.is_default ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('shell.common.edit')}>
              <IconButton size="small" disabled={busy} onClick={() => onEdit(warehouse)} aria-label={`Edit ${warehouse.nickname}`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('shell.common.delete')}>
              <IconButton size="small" color="error" disabled={busy} onClick={() => onDelete(warehouse)} aria-label={`Delete ${warehouse.nickname}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface Props {
  warehouses: BrandWarehouse[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (warehouse: BrandWarehouse) => void;
  onDelete: (warehouse: BrandWarehouse) => void;
  onSetDefault: (warehouse: BrandWarehouse) => void;
}

/** The brand's warehouses as cards with add/edit/delete/set-default actions. */
export default function WarehouseList({ warehouses, busy, onAdd, onEdit, onDelete, onSetDefault }: Readonly<Props>) {
  return (
    <Stack spacing={1.5}>
      {warehouses.length === 0 && (
        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            py: 3
          }}>
          <WarehouseIcon color="disabled" sx={{ fontSize: 40 }} />
          <Typography sx={{
            color: "text.secondary"
          }}>
            No warehouses yet — add the location your products ship from.
          </Typography>
        </Stack>
      )}
      {warehouses.map((warehouse) => (
        <WarehouseCard
          key={warehouse.id}
          warehouse={warehouse}
          busy={busy}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
        />
      ))}
      <Button variant="contained" onClick={onAdd} sx={{ alignSelf: 'flex-start' }}>
        Add warehouse
      </Button>
    </Stack>
  );
}
