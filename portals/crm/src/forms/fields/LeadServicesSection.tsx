import { useFormContext, useWatch } from 'react-hook-form';
import { Card, Stack, Typography } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import ServicesOfferedPicker from './ServicesOfferedPicker';
import type { CrmServiceOffered } from '../../api/crm.types';
import type { ServiceTargetKind } from '../../config/serviceTargets';

interface Props {
  /** Which lead kind's catalogue titles to offer. */
  appliesTo: ServiceTargetKind;
  servicesName?: string;
}

const label = (s: CrmServiceOffered) => (s.service === 'Other' ? s.custom_name || s.service : s.service);

/**
 * The "Services Offered" section every lead form shares: pick titles from the
 * CRM › Data › Services Offered catalogue (scoped to the lead's categories and
 * kind), then describe what this lead offers under each one. The descriptions
 * are what the Services tab on the lead's detail page shows.
 */
export default function LeadServicesSection({ appliesTo, servicesName = 'services_offered' }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const services = (useWatch({ control, name: servicesName }) as CrmServiceOffered[] | undefined) ?? [];

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4 }}>
        {t('crm.forms.servicesFromCatalogue')}
      </Typography>
      <ServicesOfferedPicker appliesTo={appliesTo} servicesName={servicesName} />
      {services.map((service, index) => (
        <Card key={`${index}-${service.service}`} variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Typography component="p" variant="subtitle2" sx={{ fontWeight: 700 }}>
              {label(service)}
            </Typography>
            <FormField
              name={`${servicesName}.${index}.description`}
              label={t('crm.forms.serviceDescription')}
              placeholder={t('crm.forms.serviceDescriptionHint')}
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
