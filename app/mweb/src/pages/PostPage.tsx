import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, CircularProgress, Stack } from '@mui/material';
import PostDialog from './profile-page/post-dialog/PostDialog';

const ME_ID = gql`
  query MeIdForPost {
    me {
      user_id
    }
  }
`;

/**
 * Deep-link target for post-activity notifications (`/post/:postId`). Loads the
 * viewer's id and opens the shared PostDialog on the post; closing returns to
 * the previous screen. The dialog itself fetches the post + comment thread.
 */
export default function PostPage() {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(ME_ID, { fetchPolicy: 'cache-and-network' });

  const goBack = () => navigate(-1);

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error || !data?.me) {
    return <Alert severity="error">{error?.message ?? 'Unable to open post'}</Alert>;
  }

  return (
    <PostDialog
      postId={postId}
      meId={data.me.user_id}
      onClose={goBack}
      onDeleted={goBack}
    />
  );
}
