import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import IdeaCard from './IdeaCard';

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
}: IdeasListProps) {
  return (
    <>
      {myIdeas.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Your submissions
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
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
      ) : ideas.length === 0 ? (
        <Alert severity="info">No ideas yet — be the first to share one!</Alert>
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
      )}
    </>
  );
}
