import { Link as RouterLink } from 'react-router';
import { Chip, FormControlLabel, Link, Stack, Switch, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { PIPELINE_LABEL } from '../../leads-page/copy';
import { STEP_KIND_LABEL } from '../copy';
import type { OutreachSequence } from '../queries';

interface Props {
  sequence: OutreachSequence;
  canManage: boolean;
  busy: boolean;
  onEdit: (sequence: OutreachSequence) => void;
  onEnroll: (sequence: OutreachSequence) => void;
  onSetActive: (sequence: OutreachSequence, active: boolean) => Promise<boolean>;
}

const STATE_COLORS = { ON: 'success', OFF: 'default' } as const;
const COUNT_KEYS = ['active', 'paused', 'replied', 'opted_out', 'done', 'failed'] as const;
const COUNT_LABEL: Record<(typeof COUNT_KEYS)[number], string> = {
  active: 'marketing.outreach.statusActive',
  paused: 'marketing.outreach.statusPaused',
  replied: 'marketing.outreach.statusReplied',
  opted_out: 'marketing.outreach.statusOptedOut',
  done: 'marketing.outreach.statusDone',
  failed: 'marketing.outreach.statusFailed',
};

/** One sequence: its switch, its steps in a line, who is in it and today's pace. */
export default function SequenceCard({ sequence, canManage, busy, onEdit, onEnroll, onSetActive }: Readonly<Props>) {
  const { t } = useTranslation();
  const stateLabel = t(sequence.active ? 'marketing.outreach.on' : 'marketing.outreach.off');
  const action = canManage ? (
    <FormControlLabel
      label={stateLabel}
      labelPlacement="start"
      control={
        <Switch
          checked={sequence.active}
          disabled={busy}
          onChange={(event) => fireAndForget(onSetActive(sequence, event.target.checked), logs.portal.marketing, 'outreach', 'SequenceCard')}
          slotProps={{ input: { 'aria-label': t('marketing.outreach.activeLabel', { vars: { name: sequence.name } }) } }}
          data-testid={`sequence-switch-${sequence.id}`}
        />
      }
    />
  ) : (
    <StatusChip status={sequence.active ? 'ON' : 'OFF'} colorMap={STATE_COLORS} label={stateLabel} data-testid={`sequence-state-${sequence.id}`} />
  );

  return (
    <SectionCard title={sequence.name} subtitle={sequence.description} icon={<ForumOutlinedIcon color="action" />} action={action}>
      <Stack spacing={1.5} data-testid={`sequence-card-${sequence.id}`}>
        <Stack component="ol" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }} aria-label={t('marketing.outreach.stepsTitle')}>
          {sequence.steps.map((step, index) => (
            <Chip
              component="li"
              key={`${step.kind}-${index}`}
              size="small"
              label={t('marketing.outreach.stepTitle', { vars: { number: String(index + 1), kind: t(STEP_KIND_LABEL[step.kind]) } })}
            />
          ))}
        </Stack>
        <Typography variant="body2" data-testid={`sequence-meta-${sequence.id}`}>
          {t('marketing.outreach.cardMeta', {
            vars: {
              pipeline: sequence.pipeline ? t(PIPELINE_LABEL[sequence.pipeline]) : t('marketing.outreach.anyPipeline'),
              sent: String(sequence.sent_today),
              limit: String(sequence.daily_limit),
            },
          })}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {COUNT_KEYS.map((key) => (
            <Chip key={key} size="small" variant="outlined" label={t('marketing.outreach.countChip', { vars: { label: t(COUNT_LABEL[key]), count: String(sequence.counts[key]) } })} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <DuncitButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(sequence)} data-testid={`sequence-edit-${sequence.id}`}>
            {t(canManage || !sequence.active ? 'marketing.outreach.edit' : 'marketing.outreach.view')}
          </DuncitButton>
          {canManage && (
            <DuncitButton size="small" startIcon={<GroupAddOutlinedIcon />} onClick={() => onEnroll(sequence)} data-testid={`sequence-enroll-${sequence.id}`}>
              {t('marketing.outreach.enroll')}
            </DuncitButton>
          )}
          <Link component={RouterLink} to={`/outreach/sequences?selectedtab=enrollments&sequence=${sequence.id}`} variant="body2">
            {t('marketing.outreach.seeEnrollments', { vars: { count: String(sequence.counts.total) } })}
          </Link>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
