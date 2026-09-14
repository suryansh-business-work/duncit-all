import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { Chip } from '@mui/material';

interface Props {
  locality?: string | null;
  testId: string;
}

/** The area a club operates in, as a small pin chip under its name. Renders
 * nothing when the club names no area. Native twin: components/LocalityChip. */
export default function LocalityChip({ locality, testId }: Readonly<Props>) {
  const label = locality?.trim();
  if (!label) return null;
  return (
    <Chip
      data-testid={testId}
      size="small"
      icon={<PlaceIcon />}
      label={label}
      sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
    />
  );
}
