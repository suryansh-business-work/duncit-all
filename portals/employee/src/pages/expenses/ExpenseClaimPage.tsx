import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Skeleton, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSetBreadcrumbs } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError, type EmployeeExpenseClaim } from '@duncit/utils';
import ExpenseClaimForm, {
  toExpenseClaimInput,
  type ExpenseClaimFormValues,
} from './expense-claim-form';
import {
  CREATE_EXPENSE_CLAIM,
  EXPENSE_CURRENCY,
  MY_EXPENSE_CLAIM,
  UPDATE_EXPENSE_CLAIM,
} from './queries';

const LIST_PATH = '/expenses';

/**
 * Employee > My Expenses > file / edit a claim.
 *
 * A whole page rather than a dialog: the claim is ten fields deep with an
 * upload in the middle of it, which a small scrolling box clipped the labels
 * of. The page also carries the disclaimer — filing is a REQUEST, and Finance
 * is the one who decides — which a dialog title had nowhere to say it.
 */
export default function ExpenseClaimPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation(CREATE_EXPENSE_CLAIM);
  const [update, updateState] = useMutation(UPDATE_EXPENSE_CLAIM);

  const currencyQuery = useQuery<{ publicFinanceSettings: { currency_symbol: string } }>(
    EXPENSE_CURRENCY,
  );
  const claimQuery = useQuery<{ myEmployeeExpense: EmployeeExpenseClaim }>(MY_EXPENSE_CLAIM, {
    variables: { expense_doc_id: expenseId },
    skip: !expenseId,
    fetchPolicy: 'cache-and-network',
  });

  const claim = claimQuery.data?.myEmployeeExpense ?? null;
  const currency = currencyQuery.data?.publicFinanceSettings?.currency_symbol ?? '';
  const busy = createState.loading || updateState.loading;
  const loadingClaim = !!expenseId && !claim && claimQuery.loading;
  // An id in the URL that answers with nothing — withdrawn, decided elsewhere,
  // or somebody else's. The server's own words beat a guess at what went wrong.
  const unreachable = !!expenseId && !claim && !claimQuery.loading;
  const unreachableText = claimQuery.error
    ? parseApiError(claimQuery.error)
    : t('employeeExpense.mine.claimNotFound');

  const backToList = () => navigate(LIST_PATH);

  const submit = async (values: ExpenseClaimFormValues) => {
    setError(null);
    const input = toExpenseClaimInput(values);
    try {
      if (expenseId) await update({ variables: { expense_doc_id: expenseId, input } });
      else await create({ variables: { input } });
      backToList();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const title = expenseId ? t('employeeExpense.mine.editClaim') : t('employeeExpense.mine.newClaim');
  const subtitle = expenseId
    ? t('employeeExpense.mine.editClaimSubtitle')
    : t('employeeExpense.mine.newClaimSubtitle');

  // Without this the trail reads "Expenses / 68f0… / Edit" — the raw claim id.
  useSetBreadcrumbs([{ label: title }]);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack spacing={2}>
        <Box>
          <DuncitButton size="small" startIcon={<ArrowBackIcon />} onClick={backToList}>
            {t('employeeExpense.mine.backToClaims')}
          </DuncitButton>
        </Box>

        <PageHeader title={title} subtitle={subtitle} />

        <Alert severity="info">{t('employeeExpense.mine.approvalDisclaimer')}</Alert>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <ClaimFormSlot
              loading={loadingClaim}
              missing={unreachable}
              missingText={unreachableText}
            >
              <ExpenseClaimForm
                key={expenseId ?? 'new'}
                claim={claim}
                currency={currency}
                busy={busy}
                errorMessage={error}
                onCancel={backToList}
                onSubmit={submit}
              />
            </ClaimFormSlot>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

interface SlotProps {
  loading: boolean;
  /** The id in the URL answered with nothing — a withdrawn or foreign claim. */
  missing: boolean;
  missingText: string;
  children: ReactNode;
}

/** Keeps the form off the page until the claim it is editing has arrived. */
function ClaimFormSlot({ loading, missing, missingText, children }: Readonly<SlotProps>) {
  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
      </Stack>
    );
  }
  if (missing) return <Alert severity="warning">{missingText}</Alert>;
  return <>{children}</>;
}
