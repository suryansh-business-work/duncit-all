import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CampaignNameForm, type CampaignNameValues } from './campaign-name-form';
import type { WaCampaignNameOption } from './queries';

/** One saved name. Hoisted so it isn't redefined each render (S6478). */
function NameRow({
  option,
  busy,
  onDelete,
}: Readonly<{ option: WaCampaignNameOption; busy: boolean; onDelete: () => void }>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {option.name}
        </Typography>
        {option.description && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {option.description}
          </Typography>
        )}
      </Stack>
      <Tooltip title="Remove from the list">
        <span>
          <IconButton
            size="small"
            aria-label={`Remove ${option.name}`}
            disabled={busy}
            onClick={onDelete}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

interface Props {
  open: boolean;
  busy: boolean;
  names: WaCampaignNameOption[];
  onClose: () => void;
  onAdd: (values: CampaignNameValues) => Promise<void>;
  onDelete: (option: WaCampaignNameOption) => void;
}

/**
 * The AiSensy campaign names marketing may send. AiSensy's API cannot list a
 * workspace's campaigns, so this list is maintained here and everything else
 * picks from it — a typed name would fail every message in a send.
 */
export default function CampaignNamesDialog({
  open,
  busy,
  names,
  onClose,
  onAdd,
  onDelete,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>WhatsApp campaign names</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {names.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nothing here yet. Add the campaign exactly as it is named in AiSensy.
            </Typography>
          )}
          {names.map((option) => (
            <NameRow
              key={option.id}
              option={option}
              busy={busy}
              onDelete={() => onDelete(option)}
            />
          ))}
          <Divider />
          <CampaignNameForm busy={busy} onSubmit={onAdd} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
