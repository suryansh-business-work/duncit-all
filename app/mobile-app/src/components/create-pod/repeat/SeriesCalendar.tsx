import { useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { addMonths, buildMonthGrid, clampMonth, weekdayInitials } from '@duncit/slots';

import { MonthNav } from '@/components/slots/MonthNav';
import { WeekdayHeader } from '@/components/slots/WeekdayHeader';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import {
  dayTappable,
  SERIES_DAY_STATUS_KEY,
  seriesMonthBounds,
  type SeriesDayMark,
} from './series-calendar';
import { SeriesCalendarLegend, SeriesDayCell } from './SeriesCalendarParts';

interface Props {
  /** Each marked day (yyyy-MM-dd) and how its date stands. */
  marks: ReadonlyMap<string, SeriesDayMark>;
  /** The first date's day and the end day (yyyy-MM-dd; '' while none). */
  firstDay: string;
  endDay: string;
  /** CUSTOM: any day after the first is tappable, toggling it in or out. */
  custom: boolean;
  onToggleDay: (day: string, mark: SeriesDayMark | undefined) => void;
}

/**
 * The recurring pod's dates on a month grid, paged from the first date's month
 * to the end day's — the same `@duncit/slots` grid helpers and weekday header
 * the slot picker uses. A marked day leaves out or brings back its date; on
 * CUSTOM the host taps the days themselves. mWeb twin: SeriesCalendar.
 */
export function SeriesCalendar({ marks, firstDay, endDay, custom, onToggleDay }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const bounds = seriesMonthBounds(firstDay, endDay);
  const [viewed, setViewed] = useState(bounds.first);
  const monthKey = clampMonth(viewed, bounds.first, bounds.last);
  const weeks = buildMonthGrid(monthKey);
  const range = { custom, firstDay, endDay };

  const labelFor = (day: string, mark: SeriesDayMark | undefined) => {
    const date = fmt.formatDay(day);
    if (!mark) return date;
    const status = t(SERIES_DAY_STATUS_KEY[mark.status]);
    const why = mark.reasonKey ? `${status}, ${t(mark.reasonKey)}` : status;
    return t('mweb.podSeries.dayLabel', { vars: { date, status: why } });
  };

  return (
    <YStack gap={8} testID="pod-series-calendar">
      <MonthNav
        title={fmt.formatPattern(new Date(`${monthKey}-01T00:00:00`), 'MMMM yyyy')}
        canGoBack={monthKey > bounds.first}
        canGoNext={monthKey < bounds.last}
        onStep={(delta) =>
          setViewed(clampMonth(addMonths(monthKey, delta), bounds.first, bounds.last))
        }
        labels={{
          previousMonth: t('mweb.slots.previousMonth'),
          nextMonth: t('mweb.slots.nextMonth'),
        }}
        testIDPrefix="pod-series-month"
      />
      <WeekdayHeader initials={weekdayInitials(fmt)} />
      {/* A month's grid is fixed, so coordinate keys are stable. */}
      {weeks.map((week, weekIndex) => (
        <XStack key={`${monthKey}-w${weekIndex}`}>
          {week.map((day, column) => {
            if (!day) return <YStack key={`${monthKey}-w${weekIndex}-c${column}`} flex={1} />;
            const mark = marks.get(day);
            return (
              <SeriesDayCell
                key={day}
                day={day}
                mark={mark}
                tappable={dayTappable(day, mark, range)}
                inRange={day >= firstDay && (!endDay || day <= endDay)}
                label={labelFor(day, mark)}
                onPress={() => onToggleDay(day, mark)}
              />
            );
          })}
        </XStack>
      ))}
      <SeriesCalendarLegend />
    </YStack>
  );
}
