import { Box } from '@mui/material';
import { useFormContext } from 'react-hook-form';
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
  onSubmit: (values: InventoryProductFormValues) => Promise<void> | void;
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
  onSubmit,
  onError,
}: Readonly<ProductFormBodyProps>) {
  const f = useFormContext<InventoryProductFormValues>();
  const { isSubmitting, isDirty } = f.formState;
  useUnsavedWarning(isDirty && !isSubmitting);

  const handleSubmit = f.handleSubmit(onSubmit);

  const submit = (andClose: boolean) => {
    handleSubmit().then(() => {
      if (andClose && !isNew) onAfterSave();
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
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
        busy={isSubmitting}
        dirty={isDirty}
        isEdit={!isNew}
        onCancel={onCancel}
        onSaveAndContinue={() => submit(false)}
        onSave={() => submit(true)}
      />
    </Box>
  );
}
