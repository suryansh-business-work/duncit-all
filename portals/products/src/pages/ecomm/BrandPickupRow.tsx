import { Alert, Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

/** The partner-facing gate, decided on the Warehouse Approval page. Distinct
 * from ShipRocket registration below: this one is what lets them list products. */
type Translate = ReturnType<typeof useTranslation>['t'];

const reviewChip = (t: Translate): Record<string, { label: string; color: 'success' | 'warning' | 'error' }> => ({
  APPROVED: { label: t('products.pickup.approved'), color: 'success' },
  PENDING: { label: t('products.pickup.awaitingApproval'), color: 'warning' },
  REJECTED: { label: t('products.pickup.rejected'), color: 'error' },
});

interface Props {
  location: any;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onRegister: () => void;
}

export default function BrandPickupRow({
  location,
  busy,
  onEdit,
  onDelete,
  onSetDefault,
  onRegister,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const review = reviewChip(t)[location.review_status] ?? reviewChip(t).PENDING;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 0.5
              }}>
              <Typography variant="subtitle2" noWrap sx={{
                fontWeight: 700
              }}>
                {location.nickname}
              </Typography>
              {location.is_default && <Chip size="small" color="primary" label={t('products.pickup.default')} />}
              <Chip size="small" color={review.color} label={review.label} />
              {location.shiprocket_registered ? (
                <Chip size="small" color="success" variant="outlined" label={t('products.pickup.shiprocketReady')} />
              ) : (
                <Chip size="small" color="warning" variant="outlined" label={t('products.pickup.notRegistered')} />
              )}
            </Stack>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {location.contact_name} · {location.phone}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {[location.address_line1, location.address_line2, location.city, location.state, location.pincode]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={location.is_default ? 'Default location' : 'Set as default'}>
              <span>
                <DuncitIconButton size="small" disabled={busy || location.is_default} onClick={onSetDefault}>
                  {location.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('shell.common.edit')}>
              <DuncitIconButton size="small" disabled={busy} onClick={onEdit}>
                <EditIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
            <Tooltip title={t('shell.common.delete')}>
              <DuncitIconButton size="small" color="error" disabled={busy} onClick={onDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {!location.shiprocket_registered && (
          <Box sx={{ mt: 1.5 }}>
            {/* Registration runs automatically when the brand is approved; this
             * is the retry, and the reason says why the automatic one did not
             * land (usually ShipRocket credentials). */}
            {location.shiprocket_error && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {location.shiprocket_error}
              </Alert>
            )}
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={<LocalShippingIcon />}
              disabled={busy}
              onClick={onRegister}
            >
              Register with ShipRocket
            </DuncitButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
