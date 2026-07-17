import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { SURVEY_KINDS, type SurveyKindMeta } from './surveyKinds';

interface CardProps {
  meta: SurveyKindMeta;
  onOpen: (slug: string) => void;
}

/** One "Survey For" audience card. Hoisted to module scope (S6478). */
function SurveyKindCard({ meta, onOpen }: Readonly<CardProps>) {
  const { slug, title, subtitle, Icon } = meta;
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onOpen(slug)} sx={{ p: 2.5, height: '100%' }}>
        <Stack spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Icon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

/** Surveys landing: pick who a survey is for, then manage that kind's surveys. */
export default function SurveysHubPage() {
  const navigate = useNavigate();
  const openKind = (slug: string) => navigate(`/surveys/kind/${slug}`);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <AssignmentIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Surveys</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose who a survey is for. Each type has its own category-specific surveys and a kind-level default.
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
        }}
      >
        {SURVEY_KINDS.map((meta) => (
          <SurveyKindCard key={meta.kind} meta={meta} onOpen={openKind} />
        ))}
      </Box>
    </Stack>
  );
}
