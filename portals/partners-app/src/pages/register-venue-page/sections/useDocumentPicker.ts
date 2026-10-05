import { useState } from 'react';
import type { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueValues, TaxToggle } from '../register-venue';

/** Where a picked PDF lands: an existing row (its index), or a new row for a
 * tax-id switch's document type. */
export type PickerTarget = number | { type: string; toggle: TaxToggle };

/**
 * The single PDF picker behind every document upload on the step. A file whose
 * hash matches another row is refused with an alert, so the same document can
 * never be uploaded twice under different headings.
 */
export function useDocumentPicker(
  form: UseFormReturn<RegisterVenueValues>,
  append: UseFieldArrayAppend<RegisterVenueValues, 'documents'>
) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);

  const onPicked = (url: string, meta?: { hash?: string }) => {
    if (target === null) return;
    const documents = form.getValues('documents');
    const index = typeof target === 'number' ? target : -1;
    const duplicate = meta?.hash ? documents.find((doc, i) => i !== index && doc.hash === meta.hash) : undefined;
    setTarget(null);
    if (duplicate) {
      setDuplicateAlert(t('partners.registerVenuePage.duplicateDocumentError', { vars: { type: duplicate.type } }));
      return;
    }
    setDuplicateAlert(null);
    if (typeof target === 'number') {
      form.setValue(`documents.${target}.url`, url, { shouldDirty: true, shouldValidate: true });
      form.setValue(`documents.${target}.hash`, meta?.hash, { shouldDirty: true });
      return;
    }
    append({ type: target.type, url, hash: meta?.hash });
    // The switch carries the "document required" error; re-check it now the file is in.
    fireAndForget(form.trigger(target.toggle), logs.portal['partners-app'], 'register-venue', 'taxDocumentRecheck');
  };

  return {
    open: setTarget,
    isOpen: target !== null,
    close: () => setTarget(null),
    onPicked,
    duplicateAlert,
    dismissDuplicate: () => setDuplicateAlert(null),
  };
}
