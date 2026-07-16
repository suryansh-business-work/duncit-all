import { describe, expect, it } from 'vitest';
import * as api from '../src/index';

// The barrel re-exports every public symbol; importing it here executes the
// module so the entry point is covered and the surface is asserted stable.
describe('package entry point', () => {
  it('re-exports the full public API', () => {
    expect(typeof api.DuncitTable).toBe('function');
    expect(typeof api.useTableQuery).toBe('function');
    expect(typeof api.useTablePrefs).toBe('function');
    expect(typeof api.buildAgTheme).toBe('function');
    expect(typeof api.tableQueryToGql).toBe('function');
    expect(typeof api.filterChipLabel).toBe('function');
    expect(typeof api.makeApolloTableFetch).toBe('function');
    expect(typeof api.useApolloTableFetch).toBe('function');
    expect(typeof api.actionsColumn).toBe('function');
    expect(typeof api.activeChipColumn).toBe('function');
    expect(typeof api.dateColumn).toBe('function');
    expect(typeof api.formatDateCell).toBe('function');
    expect(api.DEFAULT_DATE_FORMAT).toBe('d MMM yyyy');
    expect(api.EM_DASH).toBe('—');
  });
});
