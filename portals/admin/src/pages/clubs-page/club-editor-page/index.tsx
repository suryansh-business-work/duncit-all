import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import {
  ClubEditorPage,
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  type ClubAdmin,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';
import { notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import AiFillButton from '../../../components/AiFillButton';
import { applyAiFillToClubForm } from '../clubFormAi';
import { CLUB_FOR_EDIT, CREATE, UPDATE } from '../queries';
import useClubImagePicker from './useClubImagePicker';

const ADMIN_CLUB_CONFIG: ClubFormConfig = {
  showAdmins: true,
  showVerified: true,
  showIsActive: true,
};

const BACK_TO = '/clubs';

/**
 * The admin club editor, as a page rather than a dialog: `/clubs/new` and
 * `/clubs/:id/edit`. The club's page content — bullets, perks, values, FAQs —
 * is what a member actually reads, so it is written next to a live preview of
 * the page it lands on.
 */
export default function AdminClubEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const methodsRef = useRef<UseFormReturn<ClubFormValues> | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const picker = useClubImagePicker();

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);

  const clubQuery = useQuery(CLUB_FOR_EDIT, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const club = clubQuery.data?.club ?? null;

  const initialValues = useMemo<ClubFormValues>(
    () => (club ? clubToFormValues(club) : blankClubFormValues),
    [club],
  );
  const initialAdmins = useMemo<ClubAdmin[]>(() => (club?.club_admins ?? []) as ClubAdmin[], [club]);

  const submit = async (values: ClubFormValues, options: { draft: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = buildClubInput(values, { draft: options.draft, config: ADMIN_CLUB_CONFIG });
      if (values.id) {
        await updateMut({ variables: { id: values.id, input } });
      } else {
        await createMut({ variables: { input } });
      }
      notifySuccess(options.draft ? 'Draft saved' : 'Saved');
      navigate(BACK_TO);
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAiFill = (filled: Record<string, any>) => {
    const methods = methodsRef.current;
    if (!methods) return;
    applyAiFillToClubForm(filled, methods.getValues(), (next) => methods.reset(next));
  };

  return (
    <>
      <QueryGuard
        loading={clubQuery.loading && !club}
        error={clubQuery.error}
        errorText={clubQuery.error?.message}
        notFound={!!id && !club}
        notFoundText="Club not found."
        notFoundSeverity="warning"
      >
        {() => (
          <ClubEditorPage
            eyebrow="Admin · Clubs"
            onBack={() => navigate(BACK_TO)}
            backLabel="Back to clubs"
            initialValues={initialValues}
            initialAdmins={initialAdmins}
            config={ADMIN_CLUB_CONFIG}
            busy={busy}
            error={opError}
            onSubmit={submit}
            onPickImage={picker.pickImage}
            onReady={(methods) => {
              methodsRef.current = methods;
            }}
            titleExtras={<AiFillButton entity="CLUB" onFill={handleAiFill} />}
          />
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={picker.open}
        onClose={() => picker.settle(null)}
        onPicked={(url) => picker.settle(url)}
        folder={picker.folder}
        title="Add club image"
      />
    </>
  );
}
