import { Button, CircularProgress } from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import HowToRegIcon from '@mui/icons-material/HowToReg';

interface Props {
  following: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}

export default function FollowButton({ following, disabled, loading, onToggle }: Readonly<Props>) {
  return (
    <Button
      size="small"
      variant={following ? 'contained' : 'outlined'}
      color={following ? 'primary' : 'inherit'}
      startIcon={
        loading ? <CircularProgress size={14} /> : following ? <HowToRegIcon /> : <PersonAddAltIcon />
      }
      disabled={disabled || loading}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
