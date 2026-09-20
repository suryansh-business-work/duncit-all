import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import type { Path } from 'react-hook-form';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { SAVE_BRAND, SUBMIT_BRAND, WITHDRAW_BRAND } from '../queries';
import { toSaveInput, type BrandFormValues } from '../schema';
import type { BrandWizardForm } from './useBrandWizard';

interface Options {
  brandId: string | null;
  form: BrandWizardForm;
  onChanged: () => void;
}

const editPath = (id: string) => `/ecomm-brand/${id}/edit`;

/**
 * Everything the wizard does to the server: save the draft, move on, submit,
 * withdraw. A new brand gets its id on the first save and the page moves to
 * its edit route so the Integration and Consent steps have an id to work on.
 */
export function useBrandWizardActions({ brandId, form, onChanged }: Readonly<Options>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saveBrand, saveState] = useMutation<any>(SAVE_BRAND);
  const [submitBrand, submitState] = useMutation<any>(SUBMIT_BRAND);
  const [withdrawBrand, withdrawState] = useMutation<any>(WITHDRAW_BRAND);
  const busy = saveState.loading || submitState.loading || withdrawState.loading;

  /** Saves whatever is typed — a draft may be partial — and answers the brand id. */
  const persist = async (): Promise<string | null> => {
    try {
      const res = await saveBrand({
        variables: { brand_doc_id: brandId ?? null, input: toSaveInput(form.getValues()) },
      });
      return res.data?.saveEcommBrand?.id ?? brandId;
    } catch (error) {
      notifyError(parseApiError(error));
      return null;
    }
  };

  /** The id the Integration and Consent steps mutate against — saved first when the brand is new. */
  const ensureBrandId = async (): Promise<string | null> => brandId ?? persist();

  const saveDraft = async (): Promise<string | null> => {
    const id = await persist();
    if (!id) return null;
    notifySuccess(t('partners.brandWizard.saved'));
    if (!brandId) navigate(editPath(id), { replace: true });
    return id;
  };

  /** Validates the step's own fields, saves, and says whether the wizard may advance. */
  const next = async (fields: Path<BrandFormValues>[]): Promise<boolean> => {
    const valid = fields.length === 0 || (await form.trigger(fields));
    if (!valid) return false;
    const id = await persist();
    if (id && !brandId) navigate(editPath(id), { replace: true });
    return Boolean(id);
  };

  const submit = async () => {
    const id = await persist();
    if (!id) return;
    try {
      await submitBrand({ variables: { brand_doc_id: id } });
      notifySuccess(t('partners.brandWizard.submitted'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const withdraw = async () => {
    if (!brandId) return;
    try {
      await withdrawBrand({ variables: { brand_doc_id: brandId } });
      notifySuccess(t('partners.brandWizard.withdrawn'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return { busy, saveDraft, next, submit, withdraw, ensureBrandId };
}

export type BrandWizardActions = ReturnType<typeof useBrandWizardActions>;
