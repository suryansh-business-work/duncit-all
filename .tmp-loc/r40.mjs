import { apply } from "./e.mjs";

// ---- CouponFormDialog
apply("packages/coupons/src/CouponFormDialog.tsx", [
  [
    "import { RhfTextField } from '@duncit/forms';\nimport CouponDateField from './CouponDateField';\nimport { couponFormDefaults, couponFormSchema, toCouponInput, type CouponFormValues } from './coupon';",
    "import { RhfTextField } from '@duncit/forms';\nimport { useTranslation } from './i18n';\nimport CouponDateField from './CouponDateField';\nimport {\n  buildCouponFormSchema,\n  couponFormDefaults,\n  toCouponInput,\n  type CouponFormValues,\n} from './coupon';",
  ],
  [
    "  const [createCoupon] = useMutation(CREATE_COUPON);\n  const [updateCoupon] = useMutation(UPDATE_COUPON);\n\n  const { control, handleSubmit, watch, reset, setError, formState } = useForm<CouponFormValues>({\n    defaultValues: buildDefaults(initial, lockedPod),\n    resolver: zodResolver(couponFormSchema),",
    "  const { t } = useTranslation();\n  const [createCoupon] = useMutation(CREATE_COUPON);\n  const [updateCoupon] = useMutation(UPDATE_COUPON);\n\n  const { control, handleSubmit, watch, reset, setError, formState } = useForm<CouponFormValues>({\n    defaultValues: buildDefaults(initial, lockedPod),\n    resolver: zodResolver(buildCouponFormSchema(t)),",
  ],
  [
    "      setError('root', { message: (error as Error)?.message ?? 'Could not save coupon' });",
    "      setError('root', { message: (error as Error)?.message ?? t('shell.coupons.saveFailed') });",
  ],
  [
    "      <DialogTitle>{initial ? 'Edit coupon' : 'New coupon'}</DialogTitle>",
    "      <DialogTitle>{initial ? t('shell.coupons.editTitle') : t('shell.coupons.newTitle')}</DialogTitle>",
  ],
  [
    "            label=\"Code\"\n            size=\"small\"\n            required\n            hint=\"3–30 chars: A–Z, 0–9, - or _\"",
    "            label={t('shell.coupons.code')}\n            size=\"small\"\n            required\n            hint={t('shell.coupons.codeHint')}",
  ],
  [
    "<RhfTextField control={control} name=\"description\" label=\"Description\" size=\"small\" multiline minRows={2} />",
    "<RhfTextField\n            control={control}\n            name=\"description\"\n            label={t('shell.coupons.description')}\n            size=\"small\"\n            multiline\n            minRows={2}\n          />",
  ],
  [
    "<RhfTextField control={control} name=\"discount_pct\" type=\"number\" label=\"Discount %\" size=\"small\" required hint=\"Between 1 and 100\" />",
    "<RhfTextField\n              control={control}\n              name=\"discount_pct\"\n              type=\"number\"\n              label={t('shell.coupons.discountPct')}\n              size=\"small\"\n              required\n              hint={t('shell.coupons.discountHint')}\n            />",
  ],
  [
    "<RhfTextField control={control} name=\"min_order_amount\" type=\"number\" label=\"Min order ₹\" size=\"small\" />",
    "<RhfTextField\n              control={control}\n              name=\"min_order_amount\"\n              type=\"number\"\n              label={t('shell.coupons.minOrder')}\n              size=\"small\"\n            />",
  ],
  [
    "<RhfTextField control={control} name=\"scope\" select label=\"Scope\" size=\"small\" disabled={!!lockedPod}>\n              <MenuItem value=\"GLOBAL\">Global (all pods)</MenuItem>\n              <MenuItem value=\"POD\">Pod-specific</MenuItem>",
    "<RhfTextField\n              control={control}\n              name=\"scope\"\n              select\n              label={t('shell.coupons.scope')}\n              size=\"small\"\n              disabled={!!lockedPod}\n            >\n              <MenuItem value=\"GLOBAL\">{t('shell.coupons.scopeGlobal')}</MenuItem>\n              <MenuItem value=\"POD\">{t('shell.coupons.scopePod')}</MenuItem>",
  ],
  [
    "<RhfTextField control={control} name=\"pod_id\" select label=\"Pod\" size=\"small\" required disabled={!!lockedPod}>",
    "<RhfTextField\n                control={control}\n                name=\"pod_id\"\n                select\n                label={t('shell.coupons.pod')}\n                size=\"small\"\n                required\n                disabled={!!lockedPod}\n              >",
  ],
  [
    "            <CouponDateField control={control} name=\"valid_from\" label=\"Valid from\" />\n            <CouponDateField control={control} name=\"valid_until\" label=\"Valid until\" />",
    "            <CouponDateField control={control} name=\"valid_from\" label={t('shell.coupons.validFrom')} />\n            <CouponDateField control={control} name=\"valid_until\" label={t('shell.coupons.validUntil')} />",
  ],
  [
    "<RhfTextField control={control} name=\"max_uses\" type=\"number\" label=\"Max total uses\" size=\"small\" />",
    "<RhfTextField\n              control={control}\n              name=\"max_uses\"\n              type=\"number\"\n              label={t('shell.coupons.maxUses')}\n              size=\"small\"\n            />",
  ],
  [
    "<RhfTextField control={control} name=\"per_user_limit\" type=\"number\" label=\"Per-user limit\" size=\"small\" />",
    "<RhfTextField\n              control={control}\n              name=\"per_user_limit\"\n              type=\"number\"\n              label={t('shell.coupons.perUserLimit')}\n              size=\"small\"\n            />",
  ],
  [
    "                label=\"Active\"",
    "                label={t('shell.coupons.active')}",
  ],
  [
    "        <Button onClick={onClose}>Cancel</Button>\n        <Button variant=\"contained\" onClick={submit}>\n          {initial ? 'Save' : 'Create'}\n        </Button>",
    "        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>\n        <Button variant=\"contained\" onClick={submit}>\n          {initial ? t('shell.common.save') : t('shell.coupons.create')}\n        </Button>",
  ],
]);
