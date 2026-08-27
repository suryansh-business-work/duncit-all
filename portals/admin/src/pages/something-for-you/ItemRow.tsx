import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import type { SomethingForYouForm } from './queries';
import { useTranslation } from '@duncit/shell';

/** What the card does, in one phrase — the reason to open the editor. */
const describeAction = (item: SomethingForYouForm): string => {
  if (item.action_type === 'ROUTE') return item.link_path ? `opens ${item.link_path}` : 'screen not chosen';
  if (item.action_type === 'URL') return item.link_url ? `opens ${item.link_url}` : 'address not set';
  return 'does nothing';
};

interface Props {
  item: SomethingForYouForm & { id: string };
  onEdit: (item: SomethingForYouForm & { id: string }) => void;
  onRemove: (item: SomethingForYouForm & { id: string }) => void;
}

export default function ItemRow({ item, onEdit, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{
          alignItems: "flex-start"
        }}>
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
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Typography variant="subtitle1" noWrap sx={{
                fontWeight: 700
              }}>
                {item.title}
              </Typography>
              {!item.is_active && <Chip size="small" label={t('admin.somethingForYou.hidden')} />}
            </Stack>
            <Typography variant="body2" noWrap sx={{
              color: "text.secondary"
            }}>
              {item.bottom_text || '—'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block'
              }}>
              {describeAction(item)} · order {item.sort_order}
            </Typography>
          </Box>

          <Stack direction="row" sx={{ flexShrink: 0 }}>
            <DuncitIconButton aria-label={t('admin.somethingForYou.editCard')} onClick={() => onEdit(item)}>
              <EditIcon fontSize="small" />
            </DuncitIconButton>
            <DuncitIconButton aria-label={t('admin.somethingForYou.deleteCard')} onClick={() => onRemove(item)}>
              <DeleteIcon fontSize="small" />
            </DuncitIconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
