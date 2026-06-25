import { useMemo } from 'react';
import { Box, Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { getApprovalColumns } from './columns';
import type { ApprovalRequest } from './helpers';

interface Props {
  loading: boolean;
  items: ApprovalRequest[];
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

export default function ApprovalsTable({ loading, items, formatDateTime, onReview }: Readonly<Props>) {
  const columns = useMemo(
    () => getApprovalColumns({ formatDateTime, onReview }),
    [formatDateTime, onReview]
  );

  return (
    <Card>
      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ height: 360 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight={700}>
                {items.length} request{items.length === 1 ? '' : 's'} found
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click a row to review
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <DataGrid
            rows={items}
            columns={columns}
            autoHeight
            getRowHeight={() => 64}
            disableRowSelectionOnClick
            onRowClick={(p) => onReview(p.row as ApprovalRequest)}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 800 },
              '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-row:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        </>
      )}
    </Card>
  );
}
