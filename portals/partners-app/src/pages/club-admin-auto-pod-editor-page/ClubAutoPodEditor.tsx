import { useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { notifySuccess } from '@duncit/dialogs';
import {
  CLUB_ADMIN_CREATE_AUTO_POD,
  makeNativeParityPodConfig,
  PodEditorPage,
  useAutoPodEditorState,
  useMediaPickerBridge,
  type PodFormConfig,
} from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';

export interface ClubAutoPodClub {
  id: string;
  club_name: string;
  super_category_id?: string | null;
  category_id?: string | null;
}

interface Props {
  club: ClubAutoPodClub;
  /** Where the back button and Cancel go. */
  backTo: string;
  /** The Duncit products this club may attach, already filtered to what it can see. */
  products: any[];
}

/**
 * The same stepper an admin's Auto Pod uses, in Auto Pod mode: no club,
 * venue or host — the marketplace fills those in — and the category
 * read-only, because a pod inherits Super + Sub from its club and this Auto
 * Pod is already claimed for THIS club. No finance: partners never see rates.
 * No audience counts either: the rows behind them carry other partners'
 * contact details, which are the admin's to see, not a club's.
 */
const CLUB_ADMIN_AUTO_POD_CONFIG: PodFormConfig = {
  ...makeNativeParityPodConfig({ showProducts: true }),
  autoPod: true,
  lockCategory: true,
  showAutoPodAudience: false,
  showHosts: false,
  showVenueSlot: false,
  showPlaceCharges: false,
  showReel: true,
  showFinance: false,
};

/** An Auto Pod has no club picker, so nothing ever asks for a club's venues. */
const noVenueIds = () => [];

/**
 * Create-only: a Club Admin opens the offer and the marketplace takes it from
 * there. Editing and cancelling stay with Duncit admins, because both change
 * what a venue may already have priced. Mounted only once the club is known,
 * so the club's category seeds the form on its first render.
 */
export default function ClubAutoPodEditor({ club, backTo, products }: Readonly<Props>) {
  const navigate = useNavigate();
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);
  const picker = useMediaPickerBridge();
  const [createAutoPod] = useMutation<any>(CLUB_ADMIN_CREATE_AUTO_POD);

  const editor = useAutoPodEditorState({
    createDefaults: {
      super_category_id: club.super_category_id ?? '',
      sub_category_id: club.category_id ?? '',
    },
    // Every save stays pinned to this club server-side.
    submitCreate: (input) => createAutoPod({ variables: { input, club_id: club.id } }),
    // Never reached: this page has no edit route, so `editingAutoPod` is never set.
    submitUpdate: () => Promise.reject(new Error('AUTO_POD_CLUB_ADMIN_EDIT_UNSUPPORTED')),
    onSaved: () => {
      notifySuccess(t('admin.autoPods.openedAnyOrder'));
      // An Auto Pod is not a pod yet, so it never lands in this club's pods
      // table — the queue that does show it is where the club admin goes.
      navigate('/club-admin/auto-pods');
    },
  });

  return (
    <>
      <PodEditorPage
        editing={false}
        title={t('admin.autoPods.newTitle')}
        eyebrow={t('admin.autoPods.clubEyebrow', { vars: { club: club.club_name } })}
        onBack={() => navigate(backTo)}
        backLabel={t('admin.autoPods.backToClubPods')}
        initialValues={editor.initialValues}
        config={CLUB_ADMIN_AUTO_POD_CONFIG}
        busy={editor.busy}
        error={editor.opError}
        clubs={[]}
        venues={[]}
        products={products}
        getClubVenueIds={noVenueIds}
        onPickImage={picker.pickImage}
        onPickVideo={picker.pickVideo}
        dateFormatter={fmt}
        slotLabels={slotLabels}
        onSubmit={(values) => editor.submit(values)}
        intro={
          <Alert severity="info">
            {t('admin.autoPods.clubHint', { vars: { club: club.club_name } })}
          </Alert>
        }
      />

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/auto-pods"
        title={picker.title}
        accept={picker.accept}
      />
    </>
  );
}
