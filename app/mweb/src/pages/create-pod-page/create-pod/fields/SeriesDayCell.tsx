import { useContext } from 'react';
import { format } from 'date-fns';
import { Box, Tooltip } from '@mui/material';
import { PickerDay, type PickerDayProps } from '@mui/x-date-pickers';
import { SERIES_DAY_SX, SeriesDayContext } from './seriesDayMarks';

/**
 * A calendar day of a recurring plan, marked by how it stands. Module scope,
 * not nested in the calendar — MUIX re-creates day cells constantly, and a
 * component redefined per render would remount every one of them.
 */
export default function SeriesDayCell(props: Readonly<PickerDayProps>) {
  const context = useContext(SeriesDayContext);
  const day = format(props.day, 'yyyy-MM-dd');
  const mark = props.outsideCurrentMonth ? undefined : context?.markOf(day);
  if (!context || !mark) return <PickerDay {...props} />;
  const cell = (
    <PickerDay
      {...props}
      aria-label={context.labelOf(day, mark)}
      data-testid={`pod-series-day-${day}`}
      sx={SERIES_DAY_SX[mark.state]}
    />
  );
  const reason = context.reasonOf(mark);
  if (!reason) return cell;
  return (
    <Tooltip title={reason} describeChild>
      <Box component="span" sx={{ display: 'inline-flex' }}>
        {cell}
      </Box>
    </Tooltip>
  );
}
