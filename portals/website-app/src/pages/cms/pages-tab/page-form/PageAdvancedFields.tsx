import { Controller, type Control } from 'react-hook-form';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import RhfSwitch from '../../components/RhfSwitch';
import CodeField from '../../components/CodeField';
import SeoSharingFields from '../../components/SeoSharingFields';
import type { CodeToken } from '../../components/code-field/CodeTokens';
import type { PageFormValues } from './page.types';

/** Search & sharing, plus the page's own head code, CSS and JavaScript. */
export default function PageAdvancedFields({ control, tokens }: Readonly<{ control: Control<PageFormValues>; tokens: CodeToken[] }>) {
  const { t } = useTranslation();
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 600 }}>{t('websiteApp.cms.pageForm.advanced')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <RhfTextField control={control} name="seo_title" label={t('websiteApp.cms.pageForm.seoTitle')} slotProps={{ htmlInput: { maxLength: 160 } }} />
          <RhfTextField
            control={control}
            name="seo_description"
            label={t('websiteApp.cms.pageForm.seoDescription')}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 320 } }}
          />
          <Controller
            control={control}
            name="seo_image"
            render={({ field, fieldState }) => (
              <SingleImageUploadField
                value={field.value ?? ''}
                onChange={field.onChange}
                folder="/website/cms"
                label={t('websiteApp.cms.pageForm.seoImage')}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <RhfTextField control={control} name="canonical_url" label={t('websiteApp.cms.pageForm.canonical')} />
          <RhfSwitch control={control} name="noindex" label={t('websiteApp.cms.pageForm.noindex')} />
          <SeoSharingFields control={control} />
          <CodeField control={control} name="head_html" label={t('websiteApp.cms.pageForm.headHtml')} language="html" />
          <CodeField control={control} name="custom_css" label={t('websiteApp.cms.pageForm.customCss')} language="scss" tokens={tokens} />
          <CodeField control={control} name="custom_js" label={t('websiteApp.cms.pageForm.customJs')} language="javascript" />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
