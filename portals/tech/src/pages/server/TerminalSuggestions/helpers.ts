interface SuggestionRow {
  id: string;
  command: string;
  label: string;
  description: string;
}

export function matchesSearch(row: SuggestionRow, needle: string): boolean {
  if (!needle) return true;
  return `${row.label} ${row.description} ${row.command}`.toLowerCase().includes(needle);
}
