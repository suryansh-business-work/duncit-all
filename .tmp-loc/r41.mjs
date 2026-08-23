import { apply } from "./e.mjs";

// ---- CouponsPage
apply("packages/coupons/src/CouponsPage.tsx", [
  [
    "import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';",
    "import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';\nimport { useTranslation } from './i18n';",
  ],
  [
    "export default function CouponsPage() {\n  const client = useApolloClient();",
    "export default function CouponsPage() {\n  const { t } = useTranslation();\n  const client = useApolloClient();",
  ],
  [
    "    const ok = await confirm({ title: 'Delete coupon', message: `Delete coupon \"${c.code}\"?` });",
    "    const ok = await confirm({\n      title: t('shell.coupons.deleteTitle'),\n      message: t('shell.coupons.deleteMessage', { vars: { code: c.code } }),\n    });",
  ],
  [
    "      notifySuccess('Coupon deleted');",
    "      notifySuccess(t('shell.coupons.deleted'));",
  ],
  [
    "      notifyError(e.message ?? 'Could not delete coupon');",
    "      notifyError(e.message ?? t('shell.coupons.deleteFailed'));",
  ],
  [
    "          Coupons\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\">\n          Global discount codes + per-pod offer codes. Discounts apply on the payment step.\n        </Typography>",
    "          {t('shell.coupons.title')}\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\">\n          {t('shell.coupons.subtitle')}\n        </Typography>",
  ],
  [
    "            New coupon\n          </Button>",
    "            {t('shell.coupons.newCta')}\n          </Button>",
  ],
  [
    "          notifySuccess(editing ? 'Coupon updated' : 'Coupon created');",
    "          notifySuccess(editing ? t('shell.coupons.updated') : t('shell.coupons.created'));",
  ],
]);

// ---- CouponsTable
apply("packages/coupons/src/CouponsTable.tsx", [
  [
    "import type { CouponRow } from './queries';\nimport { formatDate } from '@duncit/datetime';",
    "import type { CouponRow } from './queries';\nimport { formatDate } from '@duncit/datetime';\nimport { useTranslation, type Translate } from './i18n';",
  ],
  [
    "const SCOPE_OPTIONS = [\n  { value: 'GLOBAL', label: 'Global' },\n  { value: 'POD', label: 'Pod' },\n];",
    "const scopeOptions = (t: Translate) => [\n  { value: 'GLOBAL', label: t('shell.coupons.filterGlobal') },\n  { value: 'POD', label: t('shell.coupons.filterPod') },\n];",
  ],
  [
    "const scopeLabel = (c: CouponRow) => (c.scope === 'POD' ? c.pod?.pod_title || 'Pod' : 'Global');\n\nconst renderScope = (c: CouponRow) => (\n  <Chip size=\"small\" label={scopeLabel(c)} color={c.scope === 'POD' ? 'secondary' : 'default'} />\n);",
    "/** A pod coupon shows the pod it belongs to; a global one says so. */\nconst scopeLabel = (c: CouponRow, t: Translate) => {\n  if (c.scope !== 'POD') return t('shell.coupons.filterGlobal');\n  return c.pod?.pod_title || t('shell.coupons.filterPod');\n};\n\nconst renderScope = (c: CouponRow, t: Translate) => (\n  <Chip size=\"small\" label={scopeLabel(c, t)} color={c.scope === 'POD' ? 'secondary' : 'default'} />\n);",
  ],
  [
    "}: Readonly<Props>) {\n  const columns = useMemo<DuncitColumn<CouponRow>[]>(() => {\n    return [\n      { field: 'code', headerName: 'Code', flex: 1, minWidth: 180, cellRenderer: renderCode, valueGetter: (c) => c.code },\n      {\n        field: 'discount_pct',\n        headerName: 'Discount',",
    "}: Readonly<Props>) {\n  const { t } = useTranslation();\n  const columns = useMemo<DuncitColumn<CouponRow>[]>(() => {\n    return [\n      {\n        field: 'code',\n        headerName: t('shell.coupons.code'),\n        flex: 1,\n        minWidth: 180,\n        cellRenderer: renderCode,\n        valueGetter: (c) => c.code,\n      },\n      {\n        field: 'discount_pct',\n        headerName: t('shell.coupons.colDiscount'),",
  ],
  [
    "        field: 'scope',\n        headerName: 'Scope',\n        filter: { type: 'select', options: SCOPE_OPTIONS },\n        minWidth: 140,\n        cellRenderer: renderScope,\n        valueGetter: scopeLabel,",
    "        field: 'scope',\n        headerName: t('shell.coupons.scope'),\n        filter: { type: 'select', options: scopeOptions(t) },\n        minWidth: 140,\n        cellRenderer: (c) => renderScope(c, t),\n        valueGetter: (c) => scopeLabel(c, t),",
  ],
  [
    "        field: 'valid_from',\n        headerName: 'Validity',",
    "        field: 'valid_from',\n        headerName: t('shell.coupons.colValidity'),",
  ],
  [
    "      dateColumn<CouponRow>({ field: 'valid_until', headerName: 'Valid until', formatDate: localeDate }),\n      { field: 'used_count', headerName: 'Used', width: 100, valueGetter: usedValue },",
    "      dateColumn<CouponRow>({\n        field: 'valid_until',\n        headerName: t('shell.coupons.validUntil'),\n        formatDate: localeDate,\n      }),\n      { field: 'used_count', headerName: t('shell.coupons.colUsed'), width: 100, valueGetter: usedValue },",
  ],
  [
    "        edit: { ariaLabel: 'Edit coupon' },\n        delete: { ariaLabel: 'Delete coupon', color: 'default', icon: <DeleteOutlineIcon fontSize=\"small\" /> },",
    "        edit: { ariaLabel: t('shell.coupons.editAria') },\n        delete: {\n          ariaLabel: t('shell.coupons.deleteAria'),\n          color: 'default',\n          icon: <DeleteOutlineIcon fontSize=\"small\" />,\n        },",
  ],
  [
    "    ];\n  }, [onEdit, onDelete]);",
    "    ];\n  }, [onEdit, onDelete, t]);",
  ],
  [
    "      emptyText=\"No coupons yet.\"",
    "      emptyText={t('shell.coupons.empty')}",
  ],
  [
    "      searchPlaceholder=\"Search code or description\"",
    "      searchPlaceholder={t('shell.coupons.search')}",
  ],
]);
