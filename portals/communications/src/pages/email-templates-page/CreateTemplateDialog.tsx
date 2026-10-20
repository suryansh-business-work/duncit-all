import { useMutation } from '@apollo/client/react';
import { Dialog, DialogTitle } from '@mui/material';
import CreateTemplateForm from './CreateTemplateForm';
import { CREATE } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string | null) => void;
  onError: (message: string) => void;
}

export default function CreateTemplateDialog({ open, onClose, onCreated, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [createTpl] = useMutation<any>(CREATE);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('tech.emailTemplates.newEmailTemplate')}</DialogTitle>
      <CreateTemplateForm
        onCancel={onClose}
        onCreate={async (input) => {
          try {
            // No body: the server starts it from the shipped design.
            const r = await createTpl({ variables: { input } });
            onCreated(r.data?.createEmailTemplate?.template_id ?? null);
          } catch (e: any) {
            onError(e.message);
          }
        }}
      />
    </Dialog>
  );
}
