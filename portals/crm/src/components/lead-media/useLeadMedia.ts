import { useMutation, useQuery } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import {
  ADD_CRM_LEAD_MEDIA,
  CRM_LEAD_MEDIA,
  DELETE_CRM_LEAD_MEDIA,
  UPDATE_CRM_LEAD_MEDIA,
  type CrmLeadMedia,
  type CrmLeadMediaEntity,
  type CrmLeadMediaKind,
} from '../../api/leadMedia.gql';
import { useImageUploads } from '../../lib/useImageUploads';
import { useActionRunner } from '../../lib/useActionRunner';
import { LEAD_MEDIA_TYPES } from './leadMediaConfig';

/**
 * A lead's logos and images, and every change to them. Uploads go to ImageKit
 * first; only files that uploaded are attached, and each change refetches the
 * lead's list so the page never shows an item the server did not keep.
 */
export function useLeadMedia(entity: CrmLeadMediaEntity, leadId: string) {
  const variables = { entity_type: entity, lead_id: leadId };
  const { data, loading, error, refetch } = useQuery<{ crmLeadMedia: CrmLeadMedia[] }>(CRM_LEAD_MEDIA, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [{ query: CRM_LEAD_MEDIA, variables }];
  const [addMut] = useMutation<{ addCrmLeadMedia: CrmLeadMedia[] }>(ADD_CRM_LEAD_MEDIA, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_CRM_LEAD_MEDIA, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_CRM_LEAD_MEDIA, { refetchQueries });
  const uploads = useImageUploads({ folder: `crm/leads/${entity.toLowerCase()}`, accept: LEAD_MEDIA_TYPES, entityId: leadId });
  const { saving, error: actionError, clearError, run } = useActionRunner();

  const add = async (kind: CrmLeadMediaKind, files: FileList) => {
    const uploaded = await uploads.uploadFiles(files);
    if (uploaded.length === 0) return;
    await run(() =>
      addMut({ variables: { ...variables, items: uploaded.map((file) => ({ kind, ...file })) } })
    );
  };

  const replace = async (item: CrmLeadMedia, file: File) => {
    const [uploaded] = await uploads.uploadFiles([file]);
    if (!uploaded) return;
    const { name: _fileName, ...fileFields } = uploaded;
    await run(() => updateMut({ variables: { id: item.id, input: fileFields } }));
  };

  const rename = (item: CrmLeadMedia, name: string) =>
    run(() => updateMut({ variables: { id: item.id, input: { name } } }));

  const move = (item: CrmLeadMedia, kind: CrmLeadMediaKind) =>
    run(() => updateMut({ variables: { id: item.id, input: { kind } } }));

  const remove = (item: CrmLeadMedia) => run(() => deleteMut({ variables: { id: item.id } }));

  return {
    items: data?.crmLeadMedia ?? [],
    loading: loading && !data,
    loadError: error ? parseApiError(error) : null,
    refetch,
    busy: uploads.busy || saving,
    uploadErrors: uploads.errors,
    clearUploadErrors: () => uploads.setErrors([]),
    actionError,
    clearActionError: clearError,
    add,
    replace,
    rename,
    move,
    remove,
  };
}
