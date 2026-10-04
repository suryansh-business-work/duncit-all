import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { PortMapSite } from '@duncit/gql-types';

interface Props {
  sites: PortMapSite[];
  domains: string[];
  site: string;
  domain: string | null;
  onSite: (site: string) => void;
  onDomain: (domain: string | null) => void;
}

/** Narrows the map to one sites-available file and/or one domain. An empty site means every file. */
export default function PortMapFilters({ sites, domains, site, domain, onSite, onDomain }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        select
        size="small"
        label={t('tech.portMap.siteFilter')}
        value={site}
        onChange={(event) => onSite(event.target.value)}
        sx={{ minWidth: 240 }}
        slotProps={{ htmlInput: { 'data-testid': 'port-map-site-filter' } }}
      >
        <MenuItem value="">{t('tech.portMap.allSites')}</MenuItem>
        {sites.map((s) => (
          <MenuItem key={s.name} value={s.name}>
            {s.enabled
              ? t('tech.portMap.siteOption', { vars: { name: s.name, count: String(s.domain_count) } })
              : t('tech.portMap.siteOptionDisabled', { vars: { name: s.name, count: String(s.domain_count) } })}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete
        size="small"
        options={domains}
        value={domain}
        onChange={(_event, value) => onDomain(value)}
        sx={{ flex: 1, maxWidth: { sm: 420 } }}
        renderInput={(params) => (
          <TextField {...params} label={t('tech.portMap.domainFilter')} placeholder={t('tech.portMap.allDomains')} />
        )}
        data-testid="port-map-domain-filter"
      />
    </Stack>
  );
}
