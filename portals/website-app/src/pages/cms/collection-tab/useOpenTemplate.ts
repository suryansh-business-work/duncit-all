import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { CmsCollection, CmsPageKind } from '@duncit/gql-types';
import { CMS_PAGES_TABLE, CREATE_CMS_PAGE, type CmsPageRow } from '../queries/pages';
import { cmsErrorMessage } from '../lib/errors';

type TemplateKind = Extract<CmsPageKind, 'COLLECTION_LIST' | 'COLLECTION_DETAIL'>;

/**
 * Opens a collection's list or detail template in the editor, creating it the
 * first time. Until then the site renders the built-in default, so a template
 * only exists once someone actually wants to design one.
 */
export function useOpenTemplate(siteId: string, collection: CmsCollection, collectionLabel: string) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<TemplateKind | null>(null);

  const open = useCallback(
    async (kind: TemplateKind) => {
      setOpening(kind);
      try {
        const existing = await client.query<{ cmsPagesTable: { rows: CmsPageRow[] } }>({
          query: CMS_PAGES_TABLE,
          variables: {
            siteId,
            query: {
              page: 1,
              page_size: 1,
              filters: [
                { field: 'kind', op: 'eq', value: kind },
                { field: 'collection_type', op: 'eq', value: collection },
              ],
            },
          },
          fetchPolicy: 'network-only',
        });
        let id = existing.data?.cmsPagesTable.rows[0]?.id;
        if (!id) {
          const title = kind === 'COLLECTION_LIST' ? t('websiteApp.cms.entries.designList') : t('websiteApp.cms.entries.designDetail');
          const created = await client.mutate<{ createCmsPage: { id: string } }>({
            mutation: CREATE_CMS_PAGE,
            variables: { siteId, input: { kind, collection_type: collection, title: `${collectionLabel} — ${title}` } },
          });
          id = created.data?.createCmsPage.id;
        }
        if (id) navigate(`/sites/${siteId}/pages/${id}/design`);
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.entries.templateFailed')));
      } finally {
        setOpening(null);
      }
    },
    [client, collection, collectionLabel, navigate, siteId, t],
  );

  return { open, opening };
}
