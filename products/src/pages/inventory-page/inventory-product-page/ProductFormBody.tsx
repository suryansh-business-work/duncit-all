import { Box } from '@mui/material';
import { useFormikContext } from 'formik';
import ProductAccordion from './ProductAccordion';
import StickyFooter from './StickyFooter';
import type { InventoryProductFormValues } from './types';
import { useUnsavedWarning } from './useUnsavedWarning';

interface ProductFormBodyProps {
  isNew: boolean;
  categories: { id: string; name: string }[];
  logs: any[];
  movements: any[];
  analytics: any[];
  activityLoading: boolean;
  onCancel: () => void;
  onAfterSave: () => void;
  onError: (msg: string) => void;
}

export default function ProductFormBody({
  isNew,
  categories,
  logs,
  movements,
  analytics,
  activityLoading,
  onCancel,
  onAfterSave,
  onError,
}: Readonly<ProductFormBodyProps>) {
  const f = useFormikContext<InventoryProductFormValues>();
  useUnsavedWarning(f.dirty && !f.isSubmitting);

  const submit = (andClose: boolean) => {
    f.submitForm().then(() => {
      if (andClose && !isNew) onAfterSave();
    });
  };

  return (
    <Box component="form" onSubmit={f.handleSubmit} noValidate>
      <ProductAccordion
        isNew={isNew}
        categories={categories}
        logs={logs}
        movements={movements}
        analytics={analytics}
        activityLoading={activityLoading}
        onError={onError}
      />
      <StickyFooter
        busy={f.isSubmitting}
        dirty={f.dirty}
        isEdit={!isNew}
        onCancel={onCancel}
        onSaveAndContinue={() => submit(false)}
        onSave={() => submit(true)}
      />
    </Box>
  );
}
