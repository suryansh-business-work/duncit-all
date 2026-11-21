import { ActionsMenu, type ActionsMenuItem } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';

/** One action in a row's menu (the shared `ActionsMenuItem`). */
export type RowAction = ActionsMenuItem;

interface Props {
  /** The row's name, so the menu button reads "Actions for About us". */
  label: string;
  actions: RowAction[];
}

/** A row's actions behind one keyboard-reachable menu button. */
export default function RowActions({ label, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  return <ActionsMenu buttonLabel={`${t('shell.common.actions')}: ${label}`} actions={actions} />;
}
