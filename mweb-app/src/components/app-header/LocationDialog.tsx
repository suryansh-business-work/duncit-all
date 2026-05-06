import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlaceIcon from '@mui/icons-material/Place';

interface Props {
  open: boolean;
  onClose: () => void;
  locations: any[];
  draftLocationId: string;
  setDraftLocationId: (id: string) => void;
  draftZone: string;
  setDraftZone: (z: string) => void;
  onApply: () => void;
}

export default function LocationDialog({
  open,
  onClose,
  locations,
  draftLocationId,
  setDraftLocationId,
  draftZone,
  setDraftZone,
  onApply,
}: Props) {
  const draftLoc = locations.find((l: any) => l.id === draftLocationId);
  const zones: { zone_name: string }[] = draftLoc?.location_zones ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <PlaceIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Choose your city {draftZone ? '\u00b7 zone' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pods and clubs are filtered by this selection.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
        <Typography variant="overline" color="text.secondary">
          City
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 1.25,
            mt: 0.5,
            mb: 2,
          }}
        >
          {locations.map((l: any) => {
            const active = l.id === draftLocationId;
            return (
              <Card
                key={l.id}
                elevation={0}
                sx={{
                  border: 2,
                  borderColor: active ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'border-color .15s',
                }}
              >
                <CardActionArea
                  onClick={() => {
                    setDraftLocationId(l.id);
                    setDraftZone('');
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      bgcolor: 'grey.100',
                      backgroundImage: l.location_image ? `url(${l.location_image})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Box sx={{ px: 1, py: 0.75, textAlign: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: active ? 700 : 500, lineHeight: 1.1 }}
                      noWrap
                    >
                      {l.location_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.location_zones?.length ? `${l.location_zones.length} zones` : 'No zones'}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
          {locations.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No locations available
            </Typography>
          )}
        </Box>

        {draftLoc && (
          <>
            <Typography variant="overline" color="text.secondary">
              Zone in {draftLoc.location_name}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
              <Chip
                label="All zones"
                color={!draftZone ? 'primary' : 'default'}
                variant={!draftZone ? 'filled' : 'outlined'}
                onClick={() => setDraftZone('')}
              />
              {zones.map((z) => (
                <Chip
                  key={z.zone_name}
                  label={z.zone_name}
                  color={draftZone === z.zone_name ? 'primary' : 'default'}
                  variant={draftZone === z.zone_name ? 'filled' : 'outlined'}
                  onClick={() => setDraftZone(z.zone_name)}
                />
              ))}
              {zones.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  This city has no zones configured.
                </Typography>
              )}
            </Stack>
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="contained" onClick={onApply}>
                Apply
              </Button>
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
