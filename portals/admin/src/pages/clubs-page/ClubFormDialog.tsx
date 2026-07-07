import { useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';
import { ClubForm, type ClubAdmin, type ClubFormConfig, type ClubFormValues } from '@duncit/club-form';
import AiFillButton from '../../components/AiFillButton';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValues: ClubFormValues;
  initialAdmins: ClubAdmin[];
  config: ClubFormConfig;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: ClubFormValues, options: { draft: boolean }) => Promise<void> | void;
  onPickImage: (folder?: string) => Promise<string | null>;
}

export default function ClubFormDialog({
  open,
  onClose,
  initialValues,
  initialAdmins,
  config,
  busy,
  opError,
  onSubmit,
  onPickImage,
}: Readonly<Props>) {
  const isEdit = !!initialValues.id;
  const methodsRef = useRef<UseFormReturn<ClubFormValues> | null>(null);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span>{isEdit ? 'Edit Club' : 'New Club'}</span>
        <AiFillButton
          entity="CLUB"
          onFill={(d) => {
            const methods = methodsRef.current;
            if (!methods) return;
            const prev = methods.getValues();
            methods.reset({
              ...prev,
              club_name: d.club_name ?? prev.club_name,
              club_description: d.club_description ?? prev.club_description,
              feature_text: d.feature_text ?? prev.feature_text,
              moments_text: d.moments_text ?? prev.moments_text,
              community_link: d.community_link ?? prev.community_link,
              group_link: d.group_link ?? prev.group_link,
            });
          }}
        />
      </DialogTitle>
      <DialogContent dividers>
        <ClubForm
          initialValues={initialValues}
          config={config}
          initialAdmins={initialAdmins}
          onPickImage={onPickImage}
          busy={busy}
          error={opError}
          onCancel={onClose}
          onSubmit={onSubmit}
          onReady={(methods) => {
            methodsRef.current = methods;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
