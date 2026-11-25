import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { CRM_WEBSITE_SCRAPE_LIMIT } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makeWebsiteScrapeSchema,
  websiteScrapeDefaults,
  type WebsiteScrapeValues,
} from './website-scrape.types';

interface Props {
  website: string;
  busy: boolean;
  onSubmit: (values: WebsiteScrapeValues) => Promise<void>;
  onCancel: () => void;
}

/** Scrape website pages: how many to discover from the lead's site — the portal's scrape dialog. */
export function WebsiteScrapeForm({ website, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<WebsiteScrapeValues>(makeWebsiteScrapeSchema(t)),
    [t],
  );
  const { control, handleSubmit } = useForm({
    defaultValues: websiteScrapeDefaults,
    resolver,
    mode: 'onChange',
  });
  const { min, max } = CRM_WEBSITE_SCRAPE_LIMIT;
  return (
    <YStack gap="$3">
      <Text color="$muted">{t('crm.websitePages.scrapeIntro', { vars: { website } })}</Text>
      <TextField
        control={control}
        name="limit"
        label={t('crm.components.maxPagesToDiscover')}
        hint={t('crm.websitePages.limitHint', { vars: { min, max } })}
        keyboardType="number-pad"
        numeric={{}}
        testID="website-scrape-limit"
      />
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={t('shell.common.cancel')}
          onPress={onCancel}
          variant="ghost"
          disabled={busy}
          testID="website-scrape-cancel"
        />
        <DuncitButton
          label={busy ? t('crm.websitePages.scraping') : t('crm.websitePages.scrape')}
          onPress={handleSubmit(onSubmit)}
          loading={busy}
          testID="website-scrape-submit"
        />
      </XStack>
    </YStack>
  );
}
