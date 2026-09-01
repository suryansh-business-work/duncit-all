import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const SET_VISIBILITY = gql`
  mutation SetMyProfileVisibility($visibility: ProfileVisibility!) {
    updateMyProfileVisibility(visibility: $visibility) {
      user_id
      profile_visibility
    }
  }
`;

interface Props {
  visibility?: string | null;
  onChanged: () => void;
}

/** Account privacy: a private profile hides its posts and status from people
 * who don't follow you (like Instagram). Name and avatar stay visible. */
export default function PrivacyToggleCard({ visibility, onChanged }: Readonly<Props>) {
  const [setVisibility, { loading }] = useMutation<any>(SET_VISIBILITY);
  const isPrivate = visibility === 'PRIVATE';

  const onToggle = async (next: boolean) => {
    try {
      await setVisibility({ variables: { visibility: next ? 'PRIVATE' : 'PUBLIC' } });
      onChanged();
    } catch {
      /* keep the previous state on failure */
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <LockOutlinedIcon color="action" />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Private account
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              When private, only followers can see your posts and status.
            </Typography>
          </Stack>
          {loading ? (
            <CircularProgress size={22} />
          ) : (
            <Switch
              checked={isPrivate}
              onChange={(event) => {
                onToggle(event.target.checked).catch(() => undefined);
              }}
              slotProps={{
                input: { 'aria-label': 'Toggle private account' }
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
