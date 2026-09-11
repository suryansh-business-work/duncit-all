import { Box, CircularProgress, Stack } from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import IdeaCard from './IdeaCard';
import { useTranslation } from '../../i18n/useTranslation';

interface IdeasListProps {
  loading: boolean;
  hasData: boolean;
  ideas: any[];
  myIdeas: any[];
  myId?: string;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onShare: (idea: any) => void;
  onDelete: (id: string) => void;
}

export default function IdeasList({
  loading,
  hasData,
  ideas,
  myIdeas,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
}: Readonly<IdeasListProps>) {
  const { t } = useTranslation();
  const ideasContent =
    ideas.length === 0 ? (
      <EmptyState icon={<LightbulbOutlinedIcon />} title={t('mweb.podIdeas.noIdeasYetBeTheFirst')} />
    ) : (
      <Stack spacing={1.5}>
        {ideas.map((idea: any) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            myId={myId}
            onOpen={() => onOpen(idea.id)}
            onLike={() => onLike(idea.id)}
            onShare={() => onShare(idea)}
            onDelete={() => onDelete(idea.id)}
          />
        ))}
      </Stack>
    );

  return (
    <>
      {myIdeas.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionHeader title="Your submissions" />
          <Stack spacing={1.5} sx={{ mt: 1.25 }}>
            {myIdeas.map((idea: any) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                myId={myId}
                onOpen={() => onOpen(idea.id)}
                onLike={() => onLike(idea.id)}
                onShare={() => onShare(idea)}
                onDelete={() => onDelete(idea.id)}
                showStatus
              />
            ))}
          </Stack>
        </Box>
      )}

      {loading && !hasData ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        ideasContent
      )}
    </>
  );
}
