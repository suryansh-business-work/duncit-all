import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import AiFillButton from '../../components/AiFillButton';
import ClubFormSections, { SECTIONS } from './club-form/ClubFormSections';
import { ClubForm } from './queries';

interface Props {
  open: boolean;
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  busy: boolean;
  opError: string | null;
  superCats: any[];
  subCats: any[];
  venues: any[];
}

export default function ClubFormDialog({
  open,
  form,
  setForm,
  onClose,
  onSubmit,
  onSaveDraft,
  busy,
  opError,
  superCats,
  subCats,
  venues,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const toggleOne = (id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(SECTIONS.map((section) => section.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <span>{form.id ? 'Edit Club' : 'New Club'}</span>
        <AiFillButton
          entity="CLUB"
          onFill={(d) =>
            setForm((prev) => ({
              ...prev,
              club_name: d.club_name ?? prev.club_name,
              club_description: d.club_description ?? prev.club_description,
              feature_text: d.feature_text ?? prev.feature_text,
              moments_text: d.moments_text ?? prev.moments_text,
              community_link: d.community_link ?? prev.community_link,
              announcement_link: d.announcement_link ?? prev.announcement_link,
              group_link: d.group_link ?? prev.group_link,
            }))
          }
        />
      </DialogTitle>
      <DialogContent dividers>
        <ClubFormSections
          form={form}
          setForm={setForm}
          expanded={expanded}
          onToggle={toggleOne}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          superCats={superCats}
          subCats={subCats}
          venues={venues}
        />
        {opError && <Alert severity="error" sx={{ mt: 2 }}>{opError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {!form.id && (
          <Button
            variant="outlined"
            onClick={onSaveDraft}
            disabled={busy || !form.club_name.trim()}
          >
            Save as Draft
          </Button>
        )}
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !form.club_name.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
