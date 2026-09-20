import { Alert, Box, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, SectionCard } from '@duncit/ui';
import type { BrandStepState, BrandWizardStepKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { BrandFormValues } from '../../schema';
import type { BrandIntegrations } from '../../queries';
import { stepLabels } from '../wizard-steps';
import { reviewSections, type ReviewSection } from './review-sections';

interface SectionProps {
  section: ReviewSection;
  title: string;
  locked: boolean;
  notProvided: string;
  editLabel: string;
  onEdit: () => void;
}

/** One step's rows with its Edit link. Hoisted to module scope (S6478). */
function ReviewSectionCard({ section, title, locked, notProvided, editLabel, onEdit }: Readonly<SectionProps>) {
  const action = locked ? undefined : (
    <DuncitButton size="small" startIcon={<EditIcon />} onClick={onEdit} data-testid={`brand-review-edit-${section.key}`}>
      {editLabel}
    </DuncitButton>
  );
  return (
    <SectionCard title={title} action={action}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        {section.rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value || notProvided} valueSx={{ color: row.value ? 'text.primary' : 'text.secondary' }} />
        ))}
      </Box>
    </SectionCard>
  );
}

interface Props {
  values: BrandFormValues;
  states: BrandStepState[];
  integrations: BrandIntegrations | undefined;
  locked: boolean;
  onJump: (key: BrandWizardStepKey) => void;
}

/** Step 9 — everything at a glance, an Edit link per section, and what still blocks submission. */
export default function ReviewStep({ values, states, integrations, locked, onJump }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = stepLabels(t);
  const bothConnected = integrations?.shiprocket.connected === true && integrations?.razorpay.connected === true;
  const blocking = states.filter((state) => state.required && !state.complete);
  const notProvided = t('partners.brandWizard.review.notProvided');
  const editLabel = t('partners.brandWizard.review.edit');

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.review.intro')}
      </Typography>
      <Alert severity={bothConnected ? 'success' : 'warning'} data-testid="brand-review-integrations">
        {bothConnected ? t('partners.brandWizard.review.integrationsOk') : t('partners.brandWizard.review.integrationsMissing')}
      </Alert>
      {blocking.length > 0 && (
        <Alert severity="warning" data-testid="brand-review-blocked">
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('partners.brandWizard.blockedTitle')}
          </Typography>
          <Typography variant="body2">{t('partners.brandWizard.blockedIntro')}</Typography>
          <List dense disablePadding>
            {blocking.map((state) => (
              <ListItem key={state.key} disableGutters sx={{ py: 0 }}>
                <ListItemText primary={labels[state.key]} slotProps={{ primary: { variant: 'body2' } }} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
      {reviewSections(t, values).map((section) => (
        <ReviewSectionCard
          key={section.key}
          section={section}
          title={labels[section.key]}
          locked={locked}
          notProvided={notProvided}
          editLabel={editLabel}
          onEdit={() => onJump(section.key)}
        />
      ))}
    </Stack>
  );
}
