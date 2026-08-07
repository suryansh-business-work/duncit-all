import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { SomethingForYouForm } from './queries';

interface Props {
  item: SomethingForYouForm & { id: string };
  onEdit: (item: SomethingForYouForm & { id: string }) => void;
  onRemove: (item: SomethingForYouForm & { id: string }) => void;
}

export default function ItemRow({ item, onEdit, onRemove }: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Portrait, like the card itself — a square thumbnail here would
              hide exactly the cropping problem this list exists to catch. */}
          <Box
            sx={{
              width: 64,
              height: 88,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {item.title}
              </Typography>
              {!item.is_active && <Chip size="small" label="Hidden" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {item.bottom_text || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {item.link_path ? `opens ${item.link_path}` : 'no link'} · order {item.sort_order}
            </Typography>
          </Box>

          <Stack direction="row" sx={{ flexShrink: 0 }}>
            <IconButton aria-label="Edit card" onClick={() => onEdit(item)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton aria-label="Delete card" onClick={() => onRemove(item)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
