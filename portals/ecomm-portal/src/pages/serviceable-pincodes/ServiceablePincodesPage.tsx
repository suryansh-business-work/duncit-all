import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { useRowDelete, useTableRefresh } from '../../components/useTableActions';
import type { Editing } from '../../components/useListEditor';
import ServiceablePincodeForm, { type ServiceablePincodeValues } from './serviceable-pincode-form';
import {
  DELETE_SERVICEABLE_PINCODE,
  SAVE_SERVICEABLE_PINCODE,
  STORE_SERVICEABLE_PINCODES_TABLE,
  type StoreServiceablePincode,
} from './queries';
import { useServiceablePincodeColumns } from './useServiceablePincodeColumns';

/**
 * The pincodes the pet store delivers to. Once the list holds any, only the
 * active ones pass the storefront's pincode check, the product page's
 * delivery check and checkout; an empty list leaves it to the courier.
 */
export default function ServiceablePincodesPage() {
  const { t } = useTranslation();
  const { refetchRef, run } = useTableRefresh();
  const removeRow = useRowDelete(DELETE_SERVICEABLE_PINCODE, run);
  const [editing, setEditing] = useState<Editing<StoreServiceablePincode>>(null);
  const [save, saveState] = useMutation(SAVE_SERVICEABLE_PINCODE);

  const onDelete = useCallback((row: StoreServiceablePincode) => removeRow(row.id, row.pincode), [removeRow]);
  const columns = useServiceablePincodeColumns({ onEdit: setEditing, onDelete });

  const submit = async (input: ServiceablePincodeValues) => {
    const id = editing && editing !== 'new' ? editing.id : null;
    const saved = await run(() => save({ variables: { id, input } }), t('ecommPortal.common.saved'));
    if (saved) setEditing(null);
  };

  const addButton = (
    <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')} data-testid="serviceable-pincode-add">
      {t('ecommPortal.serviceablePincodes.add')}
    </DuncitButton>
  );

  return (
    <Stack spacing={3} data-testid="serviceable-pincodes-page">
      <PageHeader
        title={t('ecommPortal.nav.serviceablePincodes')}
        subtitle={t('ecommPortal.serviceablePincodes.subtitle')}
        actions={addButton}
      />
      <StoreTable<StoreServiceablePincode>
        tableId="ecomm-serviceable-pincodes"
        query={STORE_SERVICEABLE_PINCODES_TABLE}
        resultKey="storeServiceablePincodesTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.serviceablePincodes')}
        emptyText={t('ecommPortal.serviceablePincodes.empty')}
        searchPlaceholder={t('ecommPortal.serviceablePincodes.search')}
        defaultSort={{ field: 'pincode', dir: 'asc' }}
        refetchRef={refetchRef}
      />
      {editing && (
        <ServiceablePincodeForm
          initial={editing === 'new' ? null : editing}
          busy={saveState.loading}
          onClose={() => setEditing(null)}
          onSubmit={submit}
        />
      )}
    </Stack>
  );
}
