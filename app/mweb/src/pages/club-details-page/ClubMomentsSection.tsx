import { useState } from 'react';
import { Box } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import MomentTile from '../../components/moments/MomentTile';
import MomentLightbox from '../../components/moments/MomentLightbox';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  moments: any[];
}

export default function ClubMomentsSection({ moments }: Readonly<Props>) {
  const { t } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  if (moments.length === 0) return null;

  return (
    <Box>
      <SectionHeader title={t('mweb.clubDetailsPage.moments')} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1,
          mt: 1.25,
        }}
      >
        {moments.map((moment, index) => (
          <MomentTile
            key={moment.url}
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