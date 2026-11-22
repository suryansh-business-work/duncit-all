import { useMutation } from '@apollo/client/react';
import {
  ADD_CRM_EMAIL_BRAND_ASSETS,
  CRM_EMAIL_SETTINGS,
  REMOVE_CRM_EMAIL_BRAND_ASSET,
  SET_CRM_EMAIL_PRIMARY_LOGO,
  UPDATE_CRM_EMAIL_BRAND_ASSET,
  type CrmEmailAssetKind,
  type CrmEmailBrandAsset,
} from '../../../api/emailSettings.gql';
import { useImageUploads } from '../../../lib/useImageUploads';
import { useActionRunner } from '../../../lib/useActionRunner';

/** Formats every mail client shows — the server refuses SVG and WebP for the same reason. */
export const EMAIL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'] as const;

/**
 * Changes to the CRM email brand library. Each change refetches the settings
 * query afterwards (the settings document has no id for Apollo to merge on),
 * so the page shows exactly what the server kept.
 */
export function useBrandAssets() {
  const refetchQueries = [{ query: CRM_EMAIL_SETTINGS }];
  const [addMut] = useMutation(ADD_CRM_EMAIL_BRAND_ASSETS, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, { refetchQueries });
  const [removeMut] = useMutation(REMOVE_CRM_EMAIL_BRAND_ASSET, { refetchQueries });
  const [logoMut] = useMutation(SET_CRM_EMAIL_PRIMARY_LOGO, { refetchQueries });
  const uploads = useImageUploads({ folder: 'crm/email-brand', accept: EMAIL_IMAGE_TYPES });
  const { saving, error: actionError, clearError, run } = useActionRunner();

  const add = async (kind: CrmEmailAssetKind, files: FileList) => {
    const uploaded = await uploads.uploadFiles(files);
    if (uploaded.length === 0) return;
    await run(() => addMut({ variables: { items: uploaded.map((file) => ({ kind, ...file })) } }));
  };

  const replace = async (asset: CrmEmailBrandAsset, file: File) => {
    const [uploaded] = await uploads.uploadFiles([file]);
    if (!uploaded) return;
    const { name: _fileName, ...fileFields } = uploaded;
    await run(() => updateMut({ variables: { id: asset.id, input: fileFields } }));
  };

  return {
    busy: uploads.busy || saving,
    uploadErrors: uploads.errors,
    clearUploadErrors: () => uploads.setErrors([]),
    actionError,
    clearActionError: clearError,
    add,
    replace,
    rename: (asset: CrmEmailBrandAsset, name: string) => run(() => updateMut({ variables: { id: asset.id, input: { name } } })),
    refile: (asset: CrmEmailBrandAsset, kind: CrmEmailAssetKind) =>
      run(() => updateMut({ variables: { id: asset.id, input: { kind } } })),
    remove: (asset: CrmEmailBrandAsset) => run(() => removeMut({ variables: { id: asset.id } })),
    setPrimaryLogo: (id: string | null) => run(() => logoMut({ variables: { id } })),
  };
}
