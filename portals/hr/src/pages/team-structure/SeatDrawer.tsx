import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Drawer, MenuItem, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import KraEditor from './KraEditor';
import PayEditor from './PayEditor';
import { makeSeatSchema, type SeatFormOutput, type SeatFormValues } from './seat.schema';
import { currencySymbol } from './money';
import { EMPLOYMENT_TYPES, NODE_KINDS, NODE_STATUSES, type NodeDraft, type TeamNode } from './types';

interface Props {
  open: boolean;
  /** The seat being edited, or null when adding one under `parentId`. */
  node: TeamNode | null;
  parentId: string | null;
  currency: string;
  nextOrder: number;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: NodeDraft) => void;
  onDelete: (node: TeamNode) => void;
}

const blank: SeatFormValues = {
  kind: 'ROLE',
  title: '',
  person_name: '',
  department: '',
  employment_type: 'FULL_TIME',
  status: 'FILLED',
  notes: '',
  pay: [],
  kras: [],
};

const valuesOf = (node: TeamNode | null): SeatFormValues =>
  node
    ? {
        kind: node.kind,
        title: node.title,
        person_name: node.person_name ?? '',
        department: node.department ?? '',
        employment_type: node.employment_type,
        status: node.status,
        notes: node.notes ?? '',
        pay: (node.pay ?? []).map((p) => ({ ...p, min_amount: p.min_amount ?? null, max_amount: p.max_amount ?? null, note: p.note ?? '' })),
        kras: (node.kras ?? []).map((k) => ({
          ...k,
          description: k.description ?? '',
          kpis: k.kpis.map((p) => ({ ...p, unit: p.unit ?? '', target: p.target ?? null })),
        })),
      }
    : blank;

const emptyToNull = (v?: string) => (v ? v : null);

export default function SeatDrawer({ open, node, parentId, currency, nextOrder, busy, onClose, onSave, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSeatSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<SeatFormValues, unknown, SeatFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(node),
  });
  // The drawer stays mounted; re-seed it whenever it opens on a different seat.
  useEffect(() => {
    if (open) reset(valuesOf(node));
  }, [open, node, reset]);

  const submit = handleSubmit((v) =>
    onSave({
      id: node?.id,
      parent_id: node ? node.parent_id : parentId,
      sort_order: node?.sort_order ?? nextOrder,
      kind: v.kind,
      title: v.title,
      person_name: emptyToNull(v.person_name),
      department: emptyToNull(v.department),
      employment_type: v.employment_type,
      status: v.status,
      notes: emptyToNull(v.notes),
      pay: v.pay.map((p) => ({ ...p, note: emptyToNull(p.note) })),
      kras: v.kras.map((k) => ({
        ...k,
        description: emptyToNull(k.description),
        kpis: k.kpis.map((p) => ({ ...p, unit: emptyToNull(p.unit) })),
      })),
    }),
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}>
      <Stack component="form" noValidate spacing={2} sx={{ p: 2 }} onSubmit={submit} aria-label={t('hr.teamStructure.seat.formLabel')}>
        <Typography variant="h6" component="h2">
          {t(node ? 'hr.teamStructure.seat.editTitle' : 'hr.teamStructure.seat.addTitle')}
        </Typography>
        <RhfTextField control={control} name="title" label={t('hr.teamStructure.seat.title')} required />
        <RhfTextField control={control} name="person_name" label={t('hr.teamStructure.seat.person')} />
        <Stack direction="row" spacing={1}>
          <RhfTextField select control={control} name="kind" label={t('hr.teamStructure.seat.kind')}>
            {NODE_KINDS.map((k) => <MenuItem key={k} value={k}>{t(`hr.teamStructure.kind.${k}`)}</MenuItem>)}
          </RhfTextField>
          <RhfTextField select control={control} name="status" label={t('hr.teamStructure.seat.status')}>
            {NODE_STATUSES.map((s) => <MenuItem key={s} value={s}>{t(`hr.teamStructure.status.${s}`)}</MenuItem>)}
          </RhfTextField>
        </Stack>
        <Stack direction="row" spacing={1}>
          <RhfTextField select control={control} name="employment_type" label={t('hr.teamStructure.seat.employment')}>
            {EMPLOYMENT_TYPES.map((e) => <MenuItem key={e} value={e}>{t(`hr.teamStructure.employment.${e}`)}</MenuItem>)}
          </RhfTextField>
          <RhfTextField control={control} name="department" label={t('hr.teamStructure.seat.department')} />
        </Stack>
        <RhfTextField control={control} name="notes" label={t('hr.teamStructure.seat.notes')} multiline minRows={2} />
        <PayEditor control={control} currencyLabel={currencySymbol(currency)} />
        <KraEditor control={control} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          {node ? (
            <DuncitButton color="error" variant="outlined" disabled={busy} onClick={() => onDelete(node)}>
              {t('hr.teamStructure.seat.delete')}
            </DuncitButton>
          ) : <span />}
          <Stack direction="row" spacing={1}>
            <DuncitButton variant="text" onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
            <DuncitButton type="submit" variant="contained" disabled={busy}>{t('shell.common.save')}</DuncitButton>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}
