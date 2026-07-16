import { describe, expect, it } from 'vitest';
import { createTheme } from '@mui/material/styles';
import {
  dayStateColor,
  hasIssue,
  serviceStateColor,
  stateChipColor,
  stateLabel,
} from './status';

const theme = createTheme();

describe('dayStateColor', () => {
  it('maps every day state to a palette colour', () => {
    expect(dayStateColor('operational', theme)).toBe(theme.palette.success.main);
    expect(dayStateColor('degraded', theme)).toBe(theme.palette.warning.main);
    expect(dayStateColor('partial_outage', theme)).toBe(theme.palette.warning.dark);
    expect(dayStateColor('major_outage', theme)).toBe(theme.palette.error.main);
  });
});

describe('serviceStateColor', () => {
  it('adds down and nodata on top of the day states', () => {
    expect(serviceStateColor('down', theme)).toBe(theme.palette.error.main);
    expect(serviceStateColor('nodata', theme)).toBe(theme.palette.text.disabled);
    expect(serviceStateColor('operational', theme)).toBe(theme.palette.success.main);
  });
});

describe('stateLabel', () => {
  it('gives a human label for each state', () => {
    expect(stateLabel('operational')).toBe('Operational');
    expect(stateLabel('degraded')).toBe('Degraded');
    expect(stateLabel('partial_outage')).toBe('Partial outage');
    expect(stateLabel('major_outage')).toBe('Major outage');
    expect(stateLabel('down')).toBe('Down');
    expect(stateLabel('nodata')).toBe('No data');
  });
});

describe('stateChipColor', () => {
  it('maps states to MUI chip colours', () => {
    expect(stateChipColor('operational')).toBe('success');
    expect(stateChipColor('degraded')).toBe('warning');
    expect(stateChipColor('partial_outage')).toBe('warning');
    expect(stateChipColor('nodata')).toBe('default');
    expect(stateChipColor('major_outage')).toBe('error');
    expect(stateChipColor('down')).toBe('error');
  });
});

describe('hasIssue', () => {
  it('is false only for operational and nodata', () => {
    expect(hasIssue('operational')).toBe(false);
    expect(hasIssue('nodata')).toBe(false);
    expect(hasIssue('degraded')).toBe(true);
    expect(hasIssue('major_outage')).toBe(true);
  });
});
