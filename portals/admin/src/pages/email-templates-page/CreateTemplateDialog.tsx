import { useMutation } from '@apollo/client';
import { Dialog, DialogTitle } from '@mui/material';
import CreateTemplateForm from './CreateTemplateForm';
import { CREATE, STARTER } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string | null) => void;
  onError: (message: string) => void;
}

export default function CreateTemplateDialog({ open, onClose, onCreated, onError }: Readonly<Props>) {
  const [createTpl] = useMutation(CREATE);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New email template</DialogTitle>
      <CreateTemplateForm
        onCancel={onClose}
        onCreate={async (input) => {
          try {
            const r = await createTpl({
              variables: { input: { ...input, mjml: STARTER } },
            });
            onCreated(r.data?.createEmailTemplate?.template_id ?? null);
          } catch (e: any) {
            onError(e.message);
          }
        }}
      />
    </Dialog>
  );
}
