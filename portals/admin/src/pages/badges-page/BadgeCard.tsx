import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/shell';
import type { BadgeCondition } from '@duncit/utils';
import { CONDITION_LABEL_KEY } from './queries';

interface Props {
  badge: any;
  onEdit: (b: any) => void;
  onRemove: (b: any) => void;
}

export default function BadgeCard({ badge, onEdit, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {badge.image_url ? (
              <img
                src={badge.image_url}
                alt={badge.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Typography variant="subtitle1" noWrap sx={{
                fontWeight: 700
              }}>
                {badge.title}
              </Typography>
              {!badge.is_active && <Chip size="small" label={t('admin.profile.inactive')} />}
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block'
              }}>
              {t(CONDITION_LABEL_KEY[badge.condition_type as BadgeCondition])} ≥ {badge.threshold}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
              {badge.description}
            </Typography>
          </Box>
          <Stack>
            <IconButton size="small" onClick={() => onEdit(badge)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onRemove(badge)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
