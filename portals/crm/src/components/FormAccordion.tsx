import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFormikContext } from 'formik';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getNested } from '../forms/getNested';

interface Props {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  /**
   * Formik field paths covered by this accordion (e.g. ["venue_name",
   * "venue_types", "contacts.0.email"]). When any of these have an error AND
   * the user has tried to submit (or already touched the field), the
   * accordion header turns red and the error count is shown so users find
   * issues even when the section is collapsed.
   */
  fieldPaths?: string[];
  /**
   * Expand-All / Collapse-All control. The parent bumps `expandSignal` (a
   * nonce) and sets `expandSignalValue`; each accordion then opens/closes while
   * still being individually toggleable afterwards.
   */
  expandSignal?: number;
  expandSignalValue?: boolean;
}

export default function FormAccordion({ title, children, defaultExpanded, fieldPaths, expandSignal, expandSignalValue }: Readonly<Props>) {
  const ctx = useFormikContext<Record<string, unknown>>();
  const [expanded, setExpanded] = useState(!!defaultExpanded);

  // Respond to Expand All / Collapse All from the parent.
  useEffect(() => {
    if (expandSignal === undefined) return;
    setExpanded(!!expandSignalValue);
  }, [expandSignal, expandSignalValue]);

  const errorCount = useMemo(() => {
    if (!ctx || !fieldPaths || fieldPaths.length === 0) return 0;
    const submitTried = ctx.submitCount > 0;
    return fieldPaths.reduce((acc, path) => {
      const err = getNested(ctx.errors, path);
      if (!err) return acc;
      // Only count after the user has touched the field OR after a submit
      // attempt. This keeps the form quiet while the user is still typing.
      const touched = !!getNested(ctx.touched, path);
      if (!submitTried && !touched) return acc;
      return acc + (Array.isArray(err) ? err.filter(Boolean).length : 1);
    }, 0);
  }, [ctx, fieldPaths]);

  // Auto-open the accordion on a failed submit so the user lands on the
  // problem area without hunting through closed sections.
  useEffect(() => {
    if (ctx?.submitCount && errorCount > 0) setExpanded(true);
  }, [ctx?.submitCount, errorCount]);

  const hasError = errorCount > 0;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      sx={(theme) => ({
        border: hasError ? `1px solid ${theme.palette.error.main}` : undefined,
        boxShadow: hasError ? `0 0 0 1px ${alpha(theme.palette.error.main, 0.45)}` : undefined,
      })}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon color={hasError ? 'error' : undefined} />}
        sx={(theme) => ({
          bgcolor: hasError ? alpha(theme.palette.error.main, 0.06) : undefined,
          '&:hover': { bgcolor: hasError ? alpha(theme.palette.error.main, 0.1) : undefined },
        })}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {hasError && <ErrorOutlineIcon color="error" fontSize="small" />}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color={hasError ? 'error.main' : undefined}
            noWrap
            sx={{ flex: 1, minWidth: 0 }}
          >
            {title}
          </Typography>
          {hasError && (
            <Chip
              label={`${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`}
              color="error"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box>{children}</Box>
      </AccordionDetails>
    </Accordion>
  );
}
