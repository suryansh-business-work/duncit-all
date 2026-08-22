import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { CrmWebsitePage } from '../../api/websitePages.gql';
import WebsitePageRow from './WebsitePageRow';
import { useTranslation } from '@duncit/shell';

interface Props {
  pages: CrmWebsitePage[];
  onView: (page: CrmWebsitePage) => void;
  onDelete: (page: CrmWebsitePage) => void;
  onError: (msg: string) => void;
}

export default function WebsitePagesTable({ pages, onView, onDelete, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t('crm.components.pageUrl')}</TableCell>
          <TableCell>{t('shell.common.status')}</TableCell>
          <TableCell align="right">{t('crm.components.chars')}</TableCell>
          <TableCell align="right">{t('shell.common.actions')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pages.map((page) => (
          <WebsitePageRow key={page.id} page={page} onView={onView} onDelete={onDelete} onError={onError} />
        ))}
      </TableBody>
    </Table>
  );
}
