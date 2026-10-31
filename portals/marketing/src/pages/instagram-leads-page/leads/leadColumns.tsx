import { Avatar, Chip, Stack, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/app-settings';
import { LEAD_STATUSES, LEAD_STATUS_COLOR, LEAD_STATUS_LABEL } from '../copy';
import type { IgLead } from '../queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const AVATAR = 32;

function ProfileCell({ row }: Readonly<{ row: IgLead }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, height: '100%' }}>
      <Avatar src={row.profile_picture_url || undefined} alt="" sx={{ width: AVATAR, height: AVATAR }} />
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          @{row.username}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.name}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** What the profile published to reach it by: one icon per kind. */
function ContactCell({ row, t }: Readonly<{ row: IgLead; t: Translate }>) {
  if (row.phones.length === 0 && row.emails.length === 0) return <>{EM_DASH}</>;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
      {row.phones.length > 0 && <PhoneIcon fontSize="small" titleAccess={t('marketing.igLeads.hasPhone')} />}
      {row.emails.length > 0 && <EmailOutlinedIcon fontSize="small" titleAccess={t('marketing.igLeads.hasEmail')} />}
    </Stack>
  );
}

export function getLeadColumns(t: Translate, locale: string): DuncitColumn<IgLead>[] {
  const count = (value: number | null) => (value === null ? EM_DASH : value.toLocaleString(locale));
  return [
    {
      field: 'username',
      headerName: t('marketing.igLeads.colProfile'),
      flex: 1,
      minWidth: 220,
      type: 'text',
      filterable: false,
      cellRenderer: (row) => <ProfileCell row={row} />,
      valueGetter: (row) => row.username,
    },
    { field: 'fit_score', headerName: t('marketing.igLeads.colFit'), type: 'number', width: 100, valueGetter: (row) => count(row.fit_score) },
    { field: 'followers', headerName: t('marketing.igLeads.colFollowers'), type: 'number', width: 120, valueGetter: (row) => count(row.followers) },
    {
      field: 'contact',
      headerName: t('marketing.igLeads.colContact'),
      type: 'text',
      width: 110,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ContactCell row={row} t={t} />,
      valueGetter: (row) => [...row.phones, ...row.emails].join(', '),
    },
    {
      field: 'status',
      headerName: t('marketing.igLeads.colStatus'),
      width: 140,
      type: 'enum',
      options: LEAD_STATUSES.map((status) => ({ value: status, label: t(LEAD_STATUS_LABEL[status]) })),
      cellRenderer: (row) => <Chip size="small" color={LEAD_STATUS_COLOR[row.status]} label={t(LEAD_STATUS_LABEL[row.status])} />,
      valueGetter: (row) => t(LEAD_STATUS_LABEL[row.status]),
    },
    dateColumn<IgLead>({ field: 'next_follow_up_at', headerName: t('marketing.igLeads.colNextFollowUp'), hide: false, width: 170 }),
    dateColumn<IgLead>({ field: 'created_at', headerName: t('marketing.igLeads.colFound'), width: 170 }),
  ];
}
