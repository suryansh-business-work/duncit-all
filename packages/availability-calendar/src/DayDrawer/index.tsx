import { Box, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { format } from 'date-fns';
import AddSlotForm from './AddSlotForm';
import SlotList from './SlotList';
import type { NewSlotInput, VenueSlotRow, VenueSpace } from '../types';
import { formatDate } from '@duncit/datetime';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  date: Date | null;
  slots: VenueSlotRow[];
  onClose: () => void;
  /** `overwrite` is true only after the partner confirmed replacing whatever
   *  is already published for that space and time. */
  onCreate: (input: NewSlotInput, overwrite: boolean) => Promise<void>;
  onToggleBlock: (slot: VenueSlotRow) => Promise<void>;
  onDelete: (slotId: string) => Promise<void>;
  /** True when this date is a venue leave/holiday — adding slots is disabled. */
  isHoliday?: boolean;
  /**
   * The venue's capacity entries. When it lists spaces, a slot has to say which
   * one it is for — different spaces may share the same time window — so the
   * picker appears and its capacity rides along. Empty = whole-venue venue, and
   * the form stays exactly as it was.
   */
  spaces?: VenueSpace[];
}

/** The day slot editor (list + block/delete + add). Prop-driven: it owns the
 *  form + confirm UX, the host app wires the create/update/delete calls. */
export default function DayDrawer({
  open,
  date,
  slots,
  onClose,
  onCreate,
  onToggleBlock,
  onDelete,
  isHoliday = false,
  spaces = [],
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Drawer anchor="right" open={open && !!date} onClose={onClose} slotProps={{
      paper: { sx: { width: { xs: '100%', sm: 380 } } }
    }}>
      <Stack spacing={2} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 900
              }}>
              {t('availability.drawerTitle')}
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 900
            }}>
              {date ? formatDate(date) : ''}
            </Typography>
          </Box>
          <DuncitIconButton size="small" onClick={onClose} aria-label={t('availability.close')}>
            <CloseIcon />
          </DuncitIconButton>
        </Stack>

        <SlotList slots={slots} onToggleBlock={onToggleBlock} onDelete={onDelete} />

        {date && (
          // Keyed on the day so reopening on another date reseeds the form.
          <AddSlotForm
            key={format(date, 'yyyy-MM-dd')}
            date={date}
            isHoliday={isHoliday}
            spaces={spaces}
            onCreate={onCreate}
          />
        )}
      </Stack>
    </Drawer>
  );
}
