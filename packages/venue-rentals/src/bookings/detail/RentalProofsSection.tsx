import { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { rentalActorKey, type RentalProof } from '@duncit/utils';
import DetailSection from './DetailSection';
import { when } from './format';
import ProofPhotoLightbox, { type LightboxPhoto } from './ProofPhotoLightbox';

interface Props {
  proofs: RentalProof[];
  /** Opens the Add proof dialog. */
  onAdd: () => void;
}

/** One proof: its note, its photos as thumbnails that open large, and who added it when. */
function ProofItem({ proof, index, onOpen }: Readonly<{ proof: RentalProof; index: number; onOpen: (photo: LightboxPhoto) => void }>) {
  const { t } = useTranslation();
  return (
    <Box component="li" data-testid="rental-detail-proof" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, listStyle: 'none' }}>
      <Stack spacing={1}>
        {proof.note && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {proof.note}
          </Typography>
        )}
        {proof.image_urls.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
            {proof.image_urls.map((url, photoIndex) => {
              // Numbered across the whole list, so two proofs' first photos have different names.
              const label = t('venueRentals.proof.photoAlt', { vars: { n: `${index + 1}.${photoIndex + 1}` } });
              return (
                <ButtonBase
                  key={url}
                  aria-label={label}
                  onClick={() => onOpen({ url, label })}
                  sx={{ aspectRatio: '1 / 1', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}
                >
                  <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </ButtonBase>
              );
            })}
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          {t('venueRentals.proof.addedBy', {
            vars: { name: proof.added_by_name, role: t(rentalActorKey(proof.added_by_role)), at: when(proof.added_at) },
          })}
        </Typography>
      </Stack>
    </Box>
  );
}

/** Optional notes and photos from Finance or the venue. Razorpay's record, not these, proves a refund. */
export default function RentalProofsSection({ proofs, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<LightboxPhoto | null>(null);
  const add = (
    <DuncitButton size="small" startIcon={<AddPhotoAlternateIcon />} onClick={onAdd} data-testid="rental-detail-add-proof">
      {t('venueRentals.proof.add')}
    </DuncitButton>
  );
  return (
    <DetailSection title={t('venueRentals.detail.proofs')} testId="rental-detail-proofs" action={add}>
      {proofs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('venueRentals.proof.empty')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0 }}>
          {proofs.map((proof, index) => (
            <ProofItem key={`${proof.added_at}-${proof.added_by_name}`} proof={proof} index={index} onOpen={setPhoto} />
          ))}
        </Stack>
      )}
      <ProofPhotoLightbox photo={photo} onClose={() => setPhoto(null)} />
    </DetailSection>
  );
}
