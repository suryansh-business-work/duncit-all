import { useFieldArray, type ArrayPath, type Control, type FieldArray, type FieldValues, type Path } from 'react-hook-form';
import { IconButton, MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { MAX_SEO_META_TAGS, TWITTER_CARDS, type SeoSharingValues } from '../lib/seoSharing';

/** Any form that keeps its share-card / meta fields under `seo_sharing`. */
type SeoSharingHost = FieldValues & { seo_sharing: SeoSharingValues };

const field = <T extends SeoSharingHost>(name: string) => `seo_sharing.${name}` as Path<T>;

/**
 * Share-card copy (Open Graph / X), keywords, schema.org structured data and
 * any extra `<meta>` tags. Blank fields fall back to the title, description
 * and the site's defaults.
 */
export default function SeoSharingFields<T extends SeoSharingHost>({ control }: Readonly<{ control: Control<T> }>) {
  const { t } = useTranslation();
  const tags = useFieldArray({ control, name: 'seo_sharing.meta_tags' as ArrayPath<T> });
  const cardLabel: Record<(typeof TWITTER_CARDS)[number], string> = {
    '': t('websiteApp.cms.seo.cardAuto'),
    summary: t('websiteApp.cms.seo.cardSummary'),
    summary_large_image: t('websiteApp.cms.seo.cardLarge'),
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" component="h3">
        {t('websiteApp.cms.seo.sharing')}
      </Typography>
      <RhfTextField control={control} name={field<T>('og_title')} label={t('websiteApp.cms.seo.ogTitle')} hint={t('websiteApp.cms.seo.ogTitleHint')} slotProps={{ htmlInput: { maxLength: 160 } }} />
      <RhfTextField
        control={control}
        name={field<T>('og_description')}
        label={t('websiteApp.cms.seo.ogDescription')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 320 } }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name={field<T>('twitter_card')} select label={t('websiteApp.cms.seo.twitterCard')} sx={{ minWidth: 220 }}>
          {TWITTER_CARDS.map((card) => (
            <MenuItem key={card || 'auto'} value={card}>
              {cardLabel[card]}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name={field<T>('keywords')} label={t('websiteApp.cms.seo.keywords')} hint={t('websiteApp.cms.seo.keywordsHint')} fullWidth />
      </Stack>
      <RhfTextField
        control={control}
        name={field<T>('json_ld')}
        label={t('websiteApp.cms.seo.jsonLd')}
        hint={t('websiteApp.cms.seo.jsonLdHint')}
        multiline
        minRows={4}
        slotProps={{ htmlInput: { spellCheck: false } }}
      />
      <Typography variant="subtitle2" component="h3">
        {t('websiteApp.cms.seo.metaTags')}
      </Typography>
      {tags.fields.map((tag, index) => (
        <Stack key={tag.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
          <RhfTextField control={control} name={field<T>(`meta_tags.${index}.name`)} label={t('websiteApp.cms.seo.metaName')} sx={{ minWidth: 200 }} />
          <RhfTextField control={control} name={field<T>(`meta_tags.${index}.content`)} label={t('websiteApp.cms.seo.metaContent')} fullWidth />
          <IconButton aria-label={t('websiteApp.cms.seo.removeMeta', { vars: { index: index + 1 } })} onClick={() => tags.remove(index)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        disabled={tags.fields.length >= MAX_SEO_META_TAGS}
        onClick={() => tags.append({ name: '', content: '' } as FieldArray<T, ArrayPath<T>>)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('websiteApp.cms.seo.addMeta')}
      </DuncitButton>
    </Stack>
  );
}
