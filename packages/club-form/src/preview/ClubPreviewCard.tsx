import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VerifiedIcon from '@mui/icons-material/Verified';
import { DuncitButton } from '@duncit/buttons';
import PreviewMedia from './PreviewMedia';
import type { ClubPreviewModel } from './club-preview-model';

/**
 * The club exactly as it lands in the clubs grid — the card mWeb and the native
 * app render, rebuilt here against the live form values.
 *
 * It is a STATIC twin of that card (the button goes nowhere): the apps' own
 * card is wired to their router and pod counts, so a portal cannot import it.
 */
export default function ClubPreviewCard({ model }: Readonly<{ model: ClubPreviewModel }>) {
  return (
    <Card
      variant="outlined"
      sx={{
        width: 300,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 18px 42px rgba(9,7,18,0.18)',
      }}
    >
      <Box sx={{ p: 1 }}>
        <Box sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <PreviewMedia media={model.media[0]} title={model.name} height={154} />
        </Box>
      </Box>
      <CardContent sx={{ pt: 0.75, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            mb: 0.75
          }}>
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, lineHeight: 1.15 }} noWrap>
            {model.name}
          </Typography>
          {model.isVerified && <VerifiedIcon color="primary" sx={{ fontSize: 18 }} />}
        </Stack>
        {model.categoryText && (
          <Chip size="small" label={model.categoryText} sx={{ mb: 0.75, fontWeight: 700 }} />
        )}
        {model.description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40
            }}>
            {model.description}
          </Typography>
        )}
        <DuncitButton
          fullWidth
          disabled
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{ mt: 1.5, borderRadius: 999, fontWeight: 700 }}
        >
          Open Club
        </DuncitButton>
      </CardContent>
    </Card>
  );
}
