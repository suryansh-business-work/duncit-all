import {
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CampaignNameForm, type CampaignNameValues } from '../campaign-name-form';
import type { WaCampaignNameOption } from '../queries';

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
  busy: boolean;
  names: WaCampaignNameOption[];
  onAdd: (values: CampaignNameValues) => Promise<void>;
  onDelete: (option: WaCampaignNameOption) => void;
}

/**
 * The AiSensy campaign names marketing may send. A send resolves its name
 * against this list, so a campaign that is not here cannot be sent — which is
 * the point: a typed name fails every message in a send, one at a time.
 */
export default function CampaignNamesCard({ busy, names, onAdd, onDelete }: Readonly<Props>) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={800}>
            Campaign names
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add each campaign exactly as it is named in AiSensy. Everything that sends picks from
            this list.
          </Typography>
        </Stack>
        {names.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing here yet.
          </Typography>
        )}
        {names.map((option) => (
          <NameRow key={option.id} option={option} busy={busy} onDelete={() => onDelete(option)} />
        ))}
        <Divider />
        <CampaignNameForm busy={busy} onSubmit={onAdd} />
      </Stack>
    </Paper>
  );
}
