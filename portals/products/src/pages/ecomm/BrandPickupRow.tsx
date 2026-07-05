import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

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
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {location.nickname}
              </Typography>
              {location.is_default && <Chip size="small" color="primary" label="Default" />}
              {location.shiprocket_registered ? (
                <Chip size="small" color="success" variant="outlined" label="ShipRocket ready" />
              ) : (
                <Chip size="small" color="warning" variant="outlined" label="Not registered" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {location.contact_name} · {location.phone}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[location.address_line1, location.address_line2, location.city, location.state, location.pincode]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={location.is_default ? 'Default location' : 'Set as default'}>
              <span>
                <IconButton size="small" disabled={busy || location.is_default} onClick={onSetDefault}>
                  {location.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" disabled={busy} onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" disabled={busy} onClick={onDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {!location.shiprocket_registered && (
          <Button
            sx={{ mt: 1.5 }}
            size="small"
            variant="outlined"
            startIcon={<LocalShippingIcon />}
            disabled={busy}
            onClick={onRegister}
          >
            Register with ShipRocket
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
