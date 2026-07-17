import { describe, expect, it } from 'vitest';
import { Chart as ChartJS } from 'chart.js';
import './setup';

describe('charts/setup', () => {
  it('registers the shared chart.js scales and elements', () => {
    // Importing the module runs ChartJS.register(...) once for the whole app.
    expect(ChartJS.registry.scales.get('linear')).toBeTruthy();
    expect(ChartJS.registry.scales.get('category')).toBeTruthy();
    expect(ChartJS.registry.elements.get('bar')).toBeTruthy();
    expect(ChartJS.registry.elements.get('line')).toBeTruthy();
  });
});
