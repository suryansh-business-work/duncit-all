import { useMemo } from 'react';
import { useField } from 'formik';
import { useQuery } from '@apollo/client';
import { Autocomplete, TextField } from '@mui/material';
import { CRM_SERVICES_OFFERED, type CrmServiceOffered } from '../../api/data.gql';
import type { CrmServiceOffered as LeadService } from '../../api/crm.types';

interface Props {
  superName?: string;
  categoryName?: string;
  subName?: string;
  servicesName?: string;
  /** Restrict the catalogue to titles flagged for this lead side. */
  appliesTo?: 'VENUE' | 'HOST' | 'ECOMM';
}

/**
 * Dynamic "Services Offered" picker that auto-loads the catalogue titles for the
 * lead's chosen Super → Category → Sub (managed in CRM → Data → Services
 * Offered). Selecting titles writes them into the lead's `services_offered`
 * while preserving any custom name / description already captured.
 */
export default function ServicesOfferedPicker({
  superName = 'super_category_id',
  categoryName = 'category_ids',
  subName = 'sub_category_ids',
  servicesName = 'services_offered',
  appliesTo,
}: Readonly<Props>) {
  const [superField] = useField<string>(superName);
  const [catField] = useField<string[]>(categoryName);
  const [subField] = useField<string[]>(subName);
  const [servicesField, , servicesHelpers] = useField<LeadService[]>(servicesName);
  const superId = superField.value || '';
  const categoryIds = catField.value ?? [];
  const subIds = subField.value ?? [];

  const { data, loading } = useQuery<{ crmServicesOffered: CrmServiceOffered[] }>(CRM_SERVICES_OFFERED, {
    variables: {
      filter: {
        super_category_id: superId,
        is_active: true,
        ...(appliesTo === 'VENUE' ? { applies_to_venue: true } : {}),
        ...(appliesTo === 'HOST' ? { applies_to_host: true } : {}),
        ...(appliesTo === 'ECOMM' ? { applies_to_ecomm: true } : {}),
      },
    },
    skip: !superId,
    fetchPolicy: 'cache-and-network',
  });

  // Narrow to the picked categories/sub-categories when any are chosen.
  const titles = useMemo(() => {
    const rows = data?.crmServicesOffered ?? [];
    const scoped = rows.filter((r) => {
      const catOk = categoryIds.length === 0 || !r.category_id || categoryIds.includes(r.category_id);
      const subOk = subIds.length === 0 || !r.sub_category_id || subIds.includes(r.sub_category_id);
      return catOk && subOk;
    });
    return Array.from(new Set(scoped.map((r) => r.title))).sort((a, b) => a.localeCompare(b));
  }, [data, categoryIds, subIds]);

  const selected = (servicesField.value ?? []).map((s) => s.service).filter(Boolean);

  if (!superId) return null;

  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      loading={loading}
      options={titles}
      value={selected}
      onChange={(_, picked) => {
        const existing = servicesField.value ?? [];
        const next: LeadService[] = (picked as string[])
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => existing.find((s) => s.service === t) ?? { service: t, custom_name: '', description: '' });
        servicesHelpers.setValue(next);
      }}
      renderInput={(p) => (
        <TextField
          {...p}
          label="Services Offered"
          placeholder={selected.length ? '' : 'Loaded from your category selection'}
          helperText={
            titles.length === 0 && !loading
              ? 'No catalogue services for this category — add them under Data → Services Offered, or type your own.'
              : 'Auto-loaded from the Services Offered catalogue'
          }
        />
      )}
    />
  );
}
