import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { LEGAL_DOCUMENT_STATS, type LegalDocumentStats } from '../graphql/documents';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ legalDocumentStats: LegalDocumentStats }>(
    LEGAL_DOCUMENT_STATS,
    { fetchPolicy: 'cache-and-network' }
  );
  const stats = data?.legalDocumentStats;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Legal Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          An overview of your legal documents by type.
        </Typography>
      </Box>

      {loading && !stats ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Card variant="outlined" sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <CardActionArea onClick={() => navigate('/documents')}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <DescriptionIcon fontSize="large" color="primary" />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                        {stats?.total ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total documents
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Stack>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Documents by type
            </Typography>
            {stats && stats.by_type.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Document type</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.by_type.map((row) => (
                    <TableRow key={row.document_type} hover>
                      <TableCell>{row.document_type}</TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No documents yet. Create one from the Documents section.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
