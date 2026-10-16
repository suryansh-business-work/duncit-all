import {
  Alert,
  Chip,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import { DuncitButton } from '@duncit/buttons';
import { deliveryAddressLine } from '@duncit/utils';
import ResponsiveDialog from '../ResponsiveDialog';
import { RADIUS } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import type { UserAddress } from '../../pages/account-page/address-book-form';

interface Props {
  open: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  selectedId: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onSelect: (id: string) => void;
  /** Opens the address book to add or edit addresses. */
  onManage: () => void;
}

/** One address as a selectable card: label (+ default tag), recipient, the line. */
const OPTION_SX = {
  m: 0,
  alignItems: 'flex-start',
  p: 1.5,
  borderRadius: `${RADIUS.input}px`,
  border: '1px solid',
  borderColor: 'divider',
  '&:has(input:checked)': {
    borderColor: 'primary.main',
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.06),
  },
  '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
} as const;

/** The Pod Shop's "Where should we deliver?" list — every address in the
 * buyer's address book, the current one checked. Picking closes it; "Manage
 * addresses" opens the address book. Native twin: components/shop/DeliveryAddressSheet. */
export default function DeliveryAddressDialog({
  open,
  onClose,
  addresses,
  selectedId,
  loading,
  failed,
  onRetry,
  onSelect,
  onManage,
}: Readonly<Props>) {
  const { t } = useTranslation();
  let body;
  if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  } else if (failed) {
    body = (
      <Alert
        data-testid="delivery-address-error"
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={onRetry}>
            {t('mweb.shop.retry')}
          </DuncitButton>
        }
      >
        {t('mweb.shop.addressesLoadError')}
      </Alert>
    );
  } else if (addresses.length === 0) {
    body = (
      <Typography data-testid="delivery-address-empty" sx={{ color: 'text.secondary', py: 2 }}>
        {t('mweb.shop.noSavedAddresses')}
      </Typography>
    );
  } else {
    body = (
      <RadioGroup
        aria-label={t('mweb.shop.deliveryTitle')}
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        sx={{ gap: 1 }}
      >
        {addresses.map((address) => (
          <FormControlLabel
            key={address.id}
            data-testid={`delivery-address-option-${address.id}`}
            value={address.id}
            control={<Radio sx={{ mt: -0.75 }} />}
            sx={OPTION_SX}
            label={
              <Stack spacing={0.25}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography noWrap sx={{ fontWeight: 700 }}>
                    {address.label}
                  </Typography>
                  {address.is_default && (
                    <Chip
                      size="small"
                      label={t('mweb.checkout.addressDefault')}
                      sx={{ height: 20 }}
                    />
                  )}
                </Stack>
                {address.name && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {address.name}
                  </Typography>
                )}
                <Typography variant="body2">{deliveryAddressLine(address)}</Typography>
              </Stack>
            }
          />
        ))}
      </RadioGroup>
    );
  }

  return (
    <ResponsiveDialog
      testId="delivery-address-dialog"
      open={open}
      onClose={onClose}
      title={t('mweb.shop.deliveryTitle')}
      maxWidth="xs"
      actions={
        <DuncitButton
          data-testid="delivery-address-manage"
          variant="outlined"
          size="large"
          startIcon={<AddLocationAltRoundedIcon />}
          onClick={onManage}
          sx={{ width: '100%' }}
        >
          {addresses.length === 0
            ? t('mweb.shop.addDeliveryAddress')
            : t('mweb.shop.manageAddresses')}
        </DuncitButton>
      }
    >
      {body}
    </ResponsiveDialog>
  );
}
