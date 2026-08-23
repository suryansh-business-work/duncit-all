import { apply } from "./e.mjs";

apply("packages/auto-pods/src/form/AutoPodForm.tsx", [
  [
    "/** Mirrors the server's own template checks so a bad template never round-trips. */\nexport const autoPodSchema = z.object({\n  pod_title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),\n  category: z.object({\n    super_id: z.string(),\n    super_name: z.string(),\n    category_id: z.string(),\n    category_name: z.string(),\n    sub_id: z.string().min(1, 'Sub category is required'),\n    sub_name: z.string(),\n  }),\n  pod_description: z.string().trim().min(1, 'Description is required').max(4000),\n  pod_info: z.string().trim().max(4000),\n  media: z\n    .string()\n    .refine((value) => parseMediaLines(value).length > 0, 'At least one image URL is required'),\n  pod_amount: z.coerce\n    .number({ message: 'Ticket price is required' })\n    .min(1, 'Ticket price must be between 1 and 1999')\n    .max(1999, 'Ticket price must be between 1 and 1999'),\n  no_of_spots: z.coerce\n    .number({ message: 'Spots are required' })\n    .int('Spots must be a whole number')\n    .min(2, 'An Auto Pod needs at least 2 spots')\n    .max(999, 'An Auto Pod cannot have more than 999 spots'),\n  pod_occurrence: z.string().min(1, 'Occurrence is required'),\n  pod_hashtag: z.string().trim().max(300),\n  payment_terms: z.string().trim().max(2000),\n});",
    "/** The translator this form and its schema read their copy from. */\nexport type AutoPodTranslate = (key: string) => string;\n\n/**\n * Mirrors the server's own template checks so a bad template never round-trips.\n *\n * Built from the caller's translator rather than exported ready-made: a\n * validation message is copy the author reads, so it follows their language\n * like every other string on the screen (rule 38).\n */\nexport const buildAutoPodSchema = (t: AutoPodTranslate) =>\n  z.object({\n    pod_title: z.string().trim().min(3, t('shell.autoPodForm.titleMin')).max(120),\n    category: z.object({\n      super_id: z.string(),\n      super_name: z.string(),\n      category_id: z.string(),\n      category_name: z.string(),\n      sub_id: z.string().min(1, t('shell.autoPodForm.subCategoryRequired')),\n      sub_name: z.string(),\n    }),\n    pod_description: z.string().trim().min(1, t('shell.autoPodForm.descriptionRequired')).max(4000),\n    pod_info: z.string().trim().max(4000),\n    media: z\n      .string()\n      .refine((value) => parseMediaLines(value).length > 0, t('shell.autoPodForm.mediaRequired')),\n    pod_amount: z.coerce\n      .number({ message: t('shell.autoPodForm.priceRequired') })\n      .min(1, t('shell.autoPodForm.priceRange'))\n      .max(1999, t('shell.autoPodForm.priceRange')),\n    no_of_spots: z.coerce\n      .number({ message: t('shell.autoPodForm.spotsRequired') })\n      .int(t('shell.autoPodForm.spotsWhole'))\n      .min(2, t('shell.autoPodForm.spotsMin'))\n      .max(999, t('shell.autoPodForm.spotsMax')),\n    pod_occurrence: z.string().min(1, t('shell.autoPodForm.occurrenceRequired')),\n    pod_hashtag: z.string().trim().max(300),\n    payment_terms: z.string().trim().max(2000),\n  });",
  ],
  [
    "/** Form values → `CreateAutoPodInput` (the update input is the same shape). */\nexport const toAutoPodInput = (values: AutoPodFormValues) => {\n  const cast = autoPodSchema.parse(values);",
    "/**\n * Form values → `CreateAutoPodInput` (the update input is the same shape).\n *\n * Runs the schema again for its coercions (the numeric fields arrive as\n * strings), never for its messages — the form has already blocked anything\n * invalid — so the key itself is a fine stand-in for a translator here.\n */\nexport const toAutoPodInput = (values: AutoPodFormValues) => {\n  const cast = buildAutoPodSchema((key) => key).parse(values);",
  ],
  [
    "  const { control, handleSubmit, reset } = useForm<AutoPodFormValues>({\n    defaultValues: initialValues,\n    resolver: zodResolver(autoPodSchema),",
    "  const { control, handleSubmit, reset } = useForm<AutoPodFormValues>({\n    defaultValues: initialValues,\n    resolver: zodResolver(buildAutoPodSchema(t)),",
  ],
  [
    "  error: string | null;\n  t: (key: string) => string;",
    "  error: string | null;\n  t: AutoPodTranslate;",
  ],
]);

apply("packages/auto-pods/src/form/index.ts", [
  [
    "export { default as AutoPodForm, autoPodSchema, toAutoPodInput } from './AutoPodForm';\nexport type { AutoPodFormProps } from './AutoPodForm';",
    "export { default as AutoPodForm, buildAutoPodSchema, toAutoPodInput } from './AutoPodForm';\nexport type { AutoPodFormProps, AutoPodTranslate } from './AutoPodForm';",
  ],
]);

apply("portals/admin/src/pages/auto-pods-page/auto-pod-form/index.tsx", [
  ["  autoPodSchema,", "  buildAutoPodSchema,"],
]);

// shell bundle: the Auto Pod template form's validation copy
apply("packages/i18n/src/bundles/shell.ts", [
  [
    "    autoPods: {\n      venueTitle: 'Auto Pods for your venue',",
    "    /** The Auto Pod TEMPLATE form's validation messages (@duncit/auto-pods).\n     * Admin and the Partners console both open it, so the copy is the shell's\n     * rather than either console's (rule 40). */\n    autoPodForm: {\n      titleMin: 'Title must be at least 3 characters',\n      subCategoryRequired: 'Sub category is required',\n      descriptionRequired: 'Description is required',\n      mediaRequired: 'At least one image URL is required',\n      priceRequired: 'Ticket price is required',\n      priceRange: 'Ticket price must be between 1 and 1999',\n      spotsRequired: 'Spots are required',\n      spotsWhole: 'Spots must be a whole number',\n      spotsMin: 'An Auto Pod needs at least 2 spots',\n      spotsMax: 'An Auto Pod cannot have more than 999 spots',\n      occurrenceRequired: 'Occurrence is required',\n    },\n    autoPods: {\n      venueTitle: 'Auto Pods for your venue',",
  ],
]);
