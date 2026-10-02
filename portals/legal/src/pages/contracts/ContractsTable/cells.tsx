import { Chip, Typography } from '@mui/material';
import { contractStatusLabel, type Contract, type ContractStatus } from '../../../graphql/contracts';

export const getRowId = (c: Contract) => c.id;

export const renderTitle = (c: Contract) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
    {c.title}
  </Typography>
);

const STATUS_COLOR: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  EXPIRED: 'error',
  ARCHIVED: 'warning',
};

export const renderStatus = (c: Contract) => (
  <Chip
    size="small"
    variant={c.status === 'ACTIVE' ? 'filled' : 'outlined'}
    color={STATUS_COLOR[c.status]}
    label={contractStatusLabel(c.status)}
  />
);
