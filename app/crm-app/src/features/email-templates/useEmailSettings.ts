import { useEffect, useState } from 'react';
import { CRM_EMAIL_IMAGE_TYPES } from '@duncit/utils';

import type {
  CrmAppEmailTemplateSettingsQuery,
  CrmEmailBrandAssetUpdateInput,
} from '@/generated/graphql/graphql';
import {
  CrmAppEmailTemplateAddBrandAssetsDocument,
  CrmAppEmailTemplateRemoveBrandAssetDocument,
  CrmAppEmailTemplateSetPrimaryLogoDocument,
  CrmAppEmailTemplateSettingsDocument,
  CrmAppEmailTemplateUpdateBrandAssetDocument,
} from '@/graphql/emailTemplates';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { EMAIL_MEDIA_FOLDERS, pickMedia, uploadPicked, type PickedMedia } from './pickMedia';

export type EmailSettings = CrmAppEmailTemplateSettingsQuery['crmEmailSettings'];
export type BrandAsset = EmailSettings['assets'][number];
export type BrandAssetKind = BrandAsset['kind'];

const fileFields = (file: PickedMedia, url: string) => ({
  url,
  mime_type: file.mimeType,
  size_bytes: file.sizeBytes,
  width: file.width,
  height: file.height,
});

/**
 * Email Templates › Settings: the brand library, theme and fonts, and every
 * change to the library. Each change answers with the whole settings document,
 * which replaces what is shown — so the screen shows exactly what the server kept.
 */
export function useEmailSettings() {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppEmailTemplateSettingsDocument,
    {},
    { fallbackError: t('crm.emailSettings.loadFailed') },
  );
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  useEffect(() => {
    if (query.data) setSettings(query.data.crmEmailSettings);
  }, [query.data]);

  /** Run one change; resolves to whether it went through (its error stays for the screen to show). */
  const run = async (work: () => Promise<EmailSettings | null>): Promise<boolean> => {
    setActionError(null);
    setBusy(true);
    try {
      const next = await work();
      if (next) setSettings(next);
      return true;
    } catch (err) {
      setActionError(errorMessage(err, t('crmApp.common.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Upload the accepted files one by one; a refused or failed file is named and does not stop the rest. */
  const uploadAll = async (files: readonly PickedMedia[]) => {
    const problems: string[] = [];
    const done: { file: PickedMedia; url: string }[] = [];
    for (const file of files) {
      if ((CRM_EMAIL_IMAGE_TYPES as readonly string[]).includes(file.mimeType)) {
        try {
          done.push({ file, url: await uploadPicked(file, EMAIL_MEDIA_FOLDERS.brand) });
        } catch (err) {
          problems.push(`${file.name}: ${errorMessage(err, t('crmApp.common.saveFailed'))}`);
        }
      } else {
        problems.push(t('crm.media.wrongType', { vars: { name: file.name } }));
      }
    }
    setUploadErrors(problems);
    return done;
  };

  const add = (kind: BrandAssetKind) =>
    run(async () => {
      const done = await uploadAll(await pickMedia({ multiple: true }));
      if (done.length === 0) return null;
      const items = done.map(({ file, url }) => ({
        kind,
        name: file.name,
        ...fileFields(file, url),
      }));
      return (await gqlRequest(CrmAppEmailTemplateAddBrandAssetsDocument, { items }))
        .addCrmEmailBrandAssets;
    });

  const update = (asset: BrandAsset, input: CrmEmailBrandAssetUpdateInput) =>
    run(
      async () =>
        (await gqlRequest(CrmAppEmailTemplateUpdateBrandAssetDocument, { id: asset.id, input }))
          .updateCrmEmailBrandAsset,
    );

  return {
    settings,
    setSettings,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    busy,
    actionError,
    clearActionError: () => setActionError(null),
    uploadErrors,
    clearUploadErrors: () => setUploadErrors([]),
    add,
    replace: (asset: BrandAsset) =>
      run(async () => {
        const [done] = await uploadAll(await pickMedia());
        if (!done) return null;
        const input = fileFields(done.file, done.url);
        return (
          await gqlRequest(CrmAppEmailTemplateUpdateBrandAssetDocument, { id: asset.id, input })
        ).updateCrmEmailBrandAsset;
      }),
    rename: (asset: BrandAsset, name: string) => update(asset, { name }),
    refile: (asset: BrandAsset, kind: BrandAssetKind) => update(asset, { kind }),
    remove: (asset: BrandAsset) =>
      run(
        async () =>
          (await gqlRequest(CrmAppEmailTemplateRemoveBrandAssetDocument, { id: asset.id }))
            .removeCrmEmailBrandAsset,
      ),
    /** Use the asset as the header logo of every CRM email, or — with null — the Duncit logo again. */
    setPrimaryLogo: (id: string | null) =>
      run(
        async () =>
          (await gqlRequest(CrmAppEmailTemplateSetPrimaryLogoDocument, { id }))
            .setCrmEmailPrimaryLogo,
      ),
  };
}

export type EmailSettingsState = ReturnType<typeof useEmailSettings>;
