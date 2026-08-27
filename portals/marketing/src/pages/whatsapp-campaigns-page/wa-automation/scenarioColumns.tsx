import type { DuncitColumn } from '@duncit/table';
import { whatsappCategoryCopy } from '@duncit/app-settings';
import { MediaCell } from './MediaCell';
import {
  BlockerCell,
  CategoryCell,
  EnabledCell,
  NamedStatusCell,
  ScenarioCell,
  ValuesCell,
} from './scenarioCells';
import {
  CAMPAIGN_STATUS_COLORS,
  TEMPLATE_STATUS_COLORS,
  mediaStateFor,
  type WaDefaultUrls,
  type MediaState,
} from './helpers';
import type { WaScenario } from './queries';

interface ColumnDeps {
  t: (key: string) => string;
  /** The row a write is in flight for, so only its switch goes inert. */
  busyKey: string | null;
  onToggle: (eventKey: string, enabled: boolean) => void;
  /** Opens the header-asset dialog for one row. */
  onSetMedia: (row: WaScenario) => void;
  /** The platform default header asset, off the board. */
  defaults: WaDefaultUrls;
}

/**
 * The scenario table's columns.
 *
 * Sorting is in memory (the board arrives whole), so every `field` here is a
 * real row property — a synthetic one would sort by undefined.
 */
export function getScenarioColumns({
  t,
  busyKey,
  onToggle,
  onSetMedia,
  defaults,
}: Readonly<ColumnDeps>): DuncitColumn<WaScenario>[] {
  const firesLabel = t('adminWhatsapp.firesLabel');
  const paramsLabel = t('adminWhatsapp.paramsLabel');
  const readyLabel = t('adminWhatsapp.blockerNone');
  const lockedTitle = t('adminWhatsapp.cannotDisable');
  const lockedHint = t('adminWhatsapp.cannotDisableHint');
  const mediaStateLabels: Record<MediaState, string> = {
    NOT_NEEDED: t('adminWhatsapp.mediaNotNeeded'),
    MISSING: t('adminWhatsapp.mediaNone'),
    CAMPAIGN: t('adminWhatsapp.mediaFromCampaign'),
    DEFAULT: t('adminWhatsapp.mediaDefault'),
    CUSTOM: t('adminWhatsapp.mediaCustom'),
  };
  const setMediaLabel = t('adminWhatsapp.setMedia');

  return [
    {
      field: 'event_key',
      headerName: t('adminWhatsapp.colScenario'),
      flex: 1.4,
      minWidth: 260,
      cellRenderer: (row) => <ScenarioCell row={row} firesLabel={firesLabel} />,
      valueGetter: (row) => `${row.event_key} ${row.fires}`,
    },
    {
      field: 'audience',
      headerName: t('adminWhatsapp.colAudience'),
      width: 120,
    },
    {
      field: 'category',
      headerName: t('adminWhatsapp.colCategory'),
      width: 150,
      cellRenderer: (row) => <CategoryCell copy={whatsappCategoryCopy(t, row.category)} />,
      valueGetter: (row) => whatsappCategoryCopy(t, row.category).label,
    },
    {
      field: 'campaign',
      headerName: t('adminWhatsapp.colCampaign'),
      flex: 1,
      minWidth: 200,
      cellRenderer: (row) => (
        <NamedStatusCell
          name={row.campaign}
          status={row.campaign_status}
          colorMap={CAMPAIGN_STATUS_COLORS}
        />
      ),
      valueGetter: (row) => `${row.campaign} ${row.campaign_status}`,
    },
    {
      field: 'template_name',
      headerName: t('adminWhatsapp.colTemplate'),
      flex: 1,
      minWidth: 200,
      cellRenderer: (row) => (
        <NamedStatusCell
          name={row.template_name}
          status={row.template_status}
          colorMap={TEMPLATE_STATUS_COLORS}
        />
      ),
      valueGetter: (row) => `${row.template_name} ${row.template_status}`,
    },
    {
      // The two chips above already carry this; the column exists so AiSensy's
      // raw verdict can be sorted on and read as plain text.
      field: 'campaign_status',
      headerName: t('adminWhatsapp.colStatus'),
      hide: true,
      width: 180,
      valueGetter: (row) => `${row.campaign_status} / ${row.template_status}`,
    },
    {
      field: 'template_params',
      headerName: t('adminWhatsapp.colValues'),
      sortable: false,
      width: 110,
      cellRenderer: (row) => <ValuesCell row={row} paramsLabel={paramsLabel} />,
      valueGetter: (row) => `${row.params.length} / ${row.template_params}`,
    },
    {
      // Sorts and searches by the STATE LABEL, not the url — "which rows are
      // missing their asset" is the question this column answers.
      field: 'override_media_url',
      headerName: t('adminWhatsapp.colMedia'),
      width: 150,
      cellRenderer: (row) => (
        <MediaCell
          row={row}
          stateLabels={mediaStateLabels}
          setLabel={setMediaLabel}
          defaults={defaults}
          onOpen={onSetMedia}
        />
      ),
      valueGetter: (row) => mediaStateLabels[mediaStateFor(row, defaults)],
    },
    {
      field: 'blocker',
      headerName: t('adminWhatsapp.colBlocker'),
      flex: 1.2,
      minWidth: 240,
      cellRenderer: (row) => <BlockerCell row={row} readyLabel={readyLabel} />,
      valueGetter: (row) => row.blocker || readyLabel,
    },
    {
      field: 'enabled',
      headerName: t('adminWhatsapp.colEnabled'),
      width: 110,
      cellRenderer: (row) => (
        <EnabledCell
          row={row}
          busy={busyKey === row.event_key}
          lockedTitle={lockedTitle}
          lockedHint={lockedHint}
          onToggle={onToggle}
        />
      ),
    },
  ];
}
