import { Avatar } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';

/**
 * A pod's 56px cover thumbnail. A pod with no still — or one whose image fails
 * to load — shows the event glyph on the soft fill instead. Native twin:
 * components/host-manage/PodThumb.
 */
export default function PodThumb({ src }: Readonly<{ src?: string }>) {
  return (
    <Avatar
      variant="rounded"
      src={src}
      alt=""
      sx={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: '12px',
        bgcolor: 'action.hover',
        color: 'secondary.main',
      }}
    >
      <EventRoundedIcon />
    </Avatar>
  );
}
