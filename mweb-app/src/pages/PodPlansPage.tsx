import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const PUBLIC_PLANS = gql`
  query PublicPodPlans {
    publicPodPlans {
      id
      key
      name
      description
      image_url
      features
      price_label
      is_coming_soon
    }
  }
`;

interface PublicPlan {
  id: string;
  key: string;
  name: string;
  description: string;
  image_url: string;
  features: string[];
  price_label: string;
  is_coming_soon: boolean;
}

export default function PodPlansPage() {
  const { data, loading, error } = useQuery<{ publicPodPlans: PublicPlan[] }>(
    PUBLIC_PLANS
  );

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Pod Plans
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pick the plan that suits the kind of pods you want to host. More tiers
          are on the way — let us know what you need.
        </Typography>
      </Stack>

      {loading && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack spacing={2}>
        {(data?.publicPodPlans ?? []).map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                {p.image_url && (
                  <Box
                    component="img"
                    src={p.image_url}
                    alt=""
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography variant="h6" fontWeight={700}>
                      {p.name}
                    </Typography>
                    {p.is_coming_soon && (
                      <Chip size="small" color="warning" label="Coming soon" />
                    )}
                  </Stack>
                  {p.price_label && (
                    <Typography variant="subtitle2" color="primary">
                      {p.price_label}
                    </Typography>
                  )}
                  {p.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {p.description}
                    </Typography>
                  )}
                </Box>
              </Stack>

              {p.features?.length > 0 && (
                <Stack spacing={0.75} sx={{ mt: 2 }}>
                  {p.features.map((f, i) => (
                    <Stack
                      key={`${p.id}-${i}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <CheckCircleOutlineIcon
                        fontSize="small"
                        color="primary"
                      />
                      <Typography variant="body2">{f}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
