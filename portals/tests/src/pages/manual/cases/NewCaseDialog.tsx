import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import type { MutationCreateManualCaseArgs } from '@duncit/gql-types';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { ManualFormDialog } from '../../../components/manual/ManualFormDialog';
import { CREATE_MANUAL_CASE, type CreateCaseData } from '../shared/board.queries';
import { manualErrorText } from '../shared/errors';
import { NEW_CASE_FORM_ID, NewCaseForm, toCreateInput, type NewCaseValues } from './new-case';

interface Props {
  onClose: () => void;
}

const WHERE = { page: '/manual/cases', component: 'NewCaseDialog' };

/** "New case": file it, then open its page to write the rest. Mount only while open. */
export default function NewCaseDialog({ onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [create, { loading }] = useMutation<CreateCaseData, MutationCreateManualCaseArgs>(CREATE_MANUAL_CASE);

  const submit = async (values: NewCaseValues) => {
    try {
      const result = await create({ variables: { input: toCreateInput(values) } });
      const key = result.data?.createManualCase.key;
      notifySuccess(t('testsManual.newCase.created', { vars: { key: key ?? '' } }));
      onClose();
      if (key) navigate(`/manual/cases/${encodeURIComponent(key)}`);
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.newCase.failed'), WHERE));
    }
  };

  return (
    <ManualFormDialog
      title={t('testsManual.newCase.title')}
      formId={NEW_CASE_FORM_ID}
      saving={loading}
      onClose={onClose}
      submitLabel={t('testsManual.newCase.submit')}
    >
      <NewCaseForm onSubmit={submit} />
    </ManualFormDialog>
  );
}
