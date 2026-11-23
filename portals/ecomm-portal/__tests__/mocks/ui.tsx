/** '@duncit/ui' stand-in: the status chip prints its label so a test can read it. */
export type StatusColorMap = Record<string, string>;

interface StatusChipProps {
  label: string;
  status: string;
  colorMap: StatusColorMap;
  'data-testid'?: string;
}

export function StatusChip({ label, 'data-testid': testId }: Readonly<StatusChipProps>) {
  return <span data-testid={testId}>{label}</span>;
}
