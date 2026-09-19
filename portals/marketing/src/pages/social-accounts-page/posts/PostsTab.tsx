import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SocialAccount } from '../queries';
import PostsTable from './PostsTable';

interface Props {
  accounts: SocialAccount[];
  onOpenPost: (postId: string) => void;
}

/** Every post from every connected account, with its engagement — open one for the detail and the AI's read. */
export default function PostsTab({ accounts, onOpenPost }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} data-testid="social-posts">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('marketing.social.postsIntro')}
      </Typography>
      <PostsTable accounts={accounts} onOpen={(post) => onOpenPost(post.id)} />
    </Stack>
  );
}
