import { useEffect } from 'react';
import { useFormikContext } from 'formik';
import type { PodForm } from '../queries';

interface Props {
  filteredLocations: any[];
  zoneOptions: string[];
}

/**
 * Keeps dependent fields consistent inside the Formik tree:
 * - resets location_id when club changes and the prior location is no longer valid
 * - resets zone_name when zone is no longer valid for the selected location
 * - forces pod_amount = 0 for FREE pod types
 */
export default function CascadeEffect({ filteredLocations, zoneOptions }: Props) {
  const { values, setFieldValue } = useFormikContext<PodForm>();

  useEffect(() => {
    if (!values.club_id || !values.location_id) return;
    if (!filteredLocations.some((l: any) => l.id === values.location_id)) {
      setFieldValue('location_id', '');
      setFieldValue('zone_name', '');
    }
  }, [values.club_id, filteredLocations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (values.zone_name && !zoneOptions.includes(values.zone_name)) {
      setFieldValue('zone_name', '');
    }
  }, [values.location_id, zoneOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
      setFieldValue('pod_amount', 0);
    }
  }, [values.pod_type]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
