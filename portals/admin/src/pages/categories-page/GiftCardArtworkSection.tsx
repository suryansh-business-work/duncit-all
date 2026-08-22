import { Box, Stack, Typography } from '@mui/material';
import { canFlipGiftCard, giftCardArtwork } from '@duncit/utils';
import MediaPickerField from '../../components/MediaPickerField';
import { FormState } from './queries';
import { useTranslation } from '@duncit/shell';

/** Preview tile ratio — the same 1.6:1 the apps draw the card at. */
const PREVIEW_WIDTH = 168;
const PREVIEW_HEIGHT = 105;

interface FacePreviewProps {
  url: string;
  label: string;
}

/** One uploaded face, drawn at the card's own proportions so an admin sees the
 * crop the buyer will get rather than a square thumbnail. */
function FacePreview({ url, label }: Readonly<FacePreviewProps>) {
  if (!url) return null;
  return (
    <Box
      component="img"
      src={url}
      alt={label}
      sx={{
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        objectFit: 'cover',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    />
  );
}

interface Props {
  form: FormState;
  onFormChange: (form: FormState) => void;
}

/**
 * The gift card artwork an admin uploads for this category — the front and the
 * back of the printed card. Offered on every level, because a card is sold for
 * a super category, a category and a sub-category alike.
 *
 * Leaving both empty is a real answer: mWeb and the app then render the
 * generated gradient card they render today, with no flip affordance.
 */
export default function GiftCardArtworkSection({ form, onFormChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const artwork = giftCardArtwork(form.gift_card_image_front, form.gift_card_image_back);
  const frontLabel = t('admin.categories.giftCardFront');
  const backLabel = t('admin.categories.giftCardBack');

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('admin.categories.giftCardArtwork')}</Typography>
      <Typography variant="caption" color="text.secondary">
        {t('admin.categories.giftCardArtworkHint')}
      </Typography>
      <MediaPickerField
        label={frontLabel}
        value={form.gift_card_image_front}
        onChange={(next) => onFormChange({ ...form, gift_card_image_front: next })}
        folder="/categories/gift-cards"
        accept="image/*"
        showPreview={false}
      />
      <MediaPickerField
        label={backLabel}
        value={form.gift_card_image_back}
        onChange={(next) => onFormChange({ ...form, gift_card_image_back: next })}
        folder="/categories/gift-cards"
        accept="image/*"
        showPreview={false}
      />
      {canFlipGiftCard(artwork) && (
        <>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <FacePreview url={artwork.front} label={frontLabel} />
            <FacePreview url={artwork.back} label={backLabel} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('admin.categories.giftCardFlipHint')}
          </Typography>
        </>
      )}
    </Stack>
  );
}
