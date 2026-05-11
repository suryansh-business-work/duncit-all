import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import MomentTile from '../../components/moments/MomentTile';
import MomentLightbox from '../../components/moments/MomentLightbox';

interface Props {
  moments: any[];
}

export default function ClubMomentsSection({ moments }: Props) {
  const [active, setActive] = useState<number | null>(null);
  if (moments.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Moments
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1,
        }}
      >
        {moments.map((moment, index) => (
          <MomentTile
            key={index}
            url={moment.url}
            type={moment.type}
            aspect="1 / 1"
            index={index}
            total={moments.length}
            onClick={() => setActive(index)}
          />
        ))}
      </Box>
      <MomentLightbox
        moments={moments}
        index={active}
        onClose={() => setActive(null)}
        onIndexChange={setActive}
      />
    </Box>
  );
}