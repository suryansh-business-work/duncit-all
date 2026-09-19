import { Box, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../../components/FormDialog';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { TWO_COLUMNS } from '../../../../lib/layout';
import type { Warehouse, WarehouseInput } from '../../queries';
import { makeWarehouseSchema, toWarehouseInput, warehouseDefaults, type WarehouseValues } from './warehouse.types';

interface WarehouseFormProps {
  /** The warehouse to correct; null adds a new one. */
  warehouse: Warehouse | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (id: string | null, input: WarehouseInput) => Promise<boolean>;
}

type TextName = Exclude<keyof WarehouseValues, 'is_default'>;

interface FieldDef {
  name: TextName;
  labelKey: string;
  autoComplete: string;
  hintKey?: string;
  wide?: boolean;
  optional?: boolean;
}

const FIELDS: readonly FieldDef[] = [
  { name: 'nickname', labelKey: 'ecommPortal.shipping.nickname', autoComplete: 'off', hintKey: 'ecommPortal.shipping.nicknameHint', wide: true },
  { name: 'contact_name', labelKey: 'ecommPortal.shipping.contactName', autoComplete: 'name' },
  { name: 'phone', labelKey: 'ecommPortal.shipping.addressPhone', autoComplete: 'tel-national', hintKey: 'ecommPortal.shipping.pickupPhoneHint' },
  { name: 'email', labelKey: 'ecommPortal.shipping.contactEmail', autoComplete: 'email', wide: true },
  { name: 'address_line1', labelKey: 'ecommPortal.shipping.addressLine1', autoComplete: 'address-line1', hintKey: 'ecommPortal.shipping.pickupStreetHint', wide: true },
  { name: 'address_line2', labelKey: 'ecommPortal.shipping.addressLine2', autoComplete: 'address-line2', wide: true, optional: true },
  { name: 'pincode', labelKey: 'ecommPortal.shipping.addressPincode', autoComplete: 'postal-code' },
  { name: 'city', labelKey: 'ecommPortal.shipping.addressCity', autoComplete: 'address-level2' },
  { name: 'state', labelKey: 'ecommPortal.shipping.addressState', autoComplete: 'address-level1' },
];

/**
 * Add or correct one of the store's warehouses — a ShipRocket pickup address.
 * Saving pushes it to ShipRocket straight away; the page then says whether
 * it is ready or what ShipRocket still needs.
 */
export default function WarehouseForm({ warehouse, busy, onClose, onSubmit }: Readonly<WarehouseFormProps>) {
  const { t, form } = useSchemaForm<WarehouseValues>(makeWarehouseSchema, warehouseDefaults(warehouse));
  const { control, handleSubmit } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(warehouse?.id ?? null, toWarehouseInput(values))) onClose();
  });
  const title = warehouse ? t('ecommPortal.shipping.editWarehouse') : t('ecommPortal.shipping.addWarehouse');
  return (
    <FormDialog formId="warehouse-form" title={title} busy={busy} onClose={onClose} onSubmit={submit} submitLabel={t('ecommPortal.shipping.saveWarehouse')} maxWidth="md">
      <Stack spacing={2}>
        <Box sx={TWO_COLUMNS}>
          {FIELDS.map((field) => (
            <Box key={field.name} sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
              <RhfTextField
                control={control}
                name={field.name}
                label={t(field.labelKey)}
                autoComplete={field.autoComplete}
                hint={field.hintKey ? t(field.hintKey) : undefined}
                required={!field.optional}
              />
            </Box>
          ))}
        </Box>
        <RhfSwitch control={control} name="is_default" label={t('ecommPortal.shipping.defaultWarehouse')} hint={t('ecommPortal.shipping.defaultWarehouseHint')} />
      </Stack>
    </FormDialog>
  );
}
