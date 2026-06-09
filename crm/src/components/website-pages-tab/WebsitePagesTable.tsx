import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { CrmWebsitePage } from '../../api/websitePages.gql';
import WebsitePageRow from './WebsitePageRow';

interface Props {
  pages: CrmWebsitePage[];
  onView: (page: CrmWebsitePage) => void;
  onDelete: (page: CrmWebsitePage) => void;
  onError: (msg: string) => void;
}

export default function WebsitePagesTable({ pages, onView, onDelete, onError }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Page URL</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Chars</TableCell>
          <TableCell align="right">Actions</TableCell>
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
