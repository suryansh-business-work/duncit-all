import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  [
    "    /**\n     * Discount codes — @duncit/coupons,",
    "    /**\n     * The config-driven pod content editor — @duncit/portal-pod-form, opened\n     * by Admin and by the Partners console. The shell's namespace because both\n     * ship it and neither owns it (rule 40).\n     */\n    podContent: {\n      title: 'Edit pod',\n      readOnlyHeading: 'Pod details (read-only)',\n      name: 'Name',\n      description: 'Description',\n      images: 'Images',\n      addImage: 'Add image',\n      mediaAlt: 'Pod media',\n      noImages: 'No images yet.',\n      nameMin: 'Name must be at least 2 characters',\n      descriptionRequired: 'Description is required',\n    },\n\n    /**\n     * Discount codes — @duncit/coupons,",
  ],
]);

apply("packages/portal-pod-form/src/types.ts", [
  [
    "import { z } from 'zod';",
    "import { z } from 'zod';\n\n/** The translator this form and its schema read their copy from (rule 38). */\nexport type PodContentTranslate = (key: string) => string;",
  ],
  [
    "export const podContentSchema = z.object({\n  pod_title: z.string().trim().min(2, 'Name must be at least 2 characters'),\n  pod_description: z.string().trim().min(1, 'Description is required'),\n  pod_images_and_videos: z.array(\n    z.object({ url: z.string().min(1), type: z.string().nullish() }),\n  ),\n});\n\nexport type PodContentValues = z.infer<typeof podContentSchema>;",
    "/** Built from the console's translator: a validation message is copy the\n *  operator reads, so it follows their language (rule 38). */\nexport const buildPodContentSchema = (t: PodContentTranslate) =>\n  z.object({\n    pod_title: z.string().trim().min(2, t('shell.podContent.nameMin')),\n    pod_description: z.string().trim().min(1, t('shell.podContent.descriptionRequired')),\n    pod_images_and_videos: z.array(\n      z.object({ url: z.string().min(1), type: z.string().nullish() }),\n    ),\n  });\n\nexport type PodContentValues = z.infer<ReturnType<typeof buildPodContentSchema>>;",
  ],
]);

apply("packages/portal-pod-form/src/PodContentFormDialog.tsx", [
  [
    "import { podContentSchema, type PodContentValues, type PodField, type ReadOnlyContextItem } from './types';",
    "import { useTranslation } from '@duncit/app-settings';\nimport {\n  buildPodContentSchema,\n  type PodContentValues,\n  type PodField,\n  type ReadOnlyContextItem,\n} from './types';",
  ],
  [
    "  title = 'Edit pod',",
    "  title,",
  ],
  [
    "}: Readonly<Props>) {\n  const {\n    register,\n    control,\n    handleSubmit,\n    reset,\n    formState: { errors },\n  } = useForm<PodContentValues>({ resolver: zodResolver(podContentSchema), defaultValues });",
    "}: Readonly<Props>) {\n  const { t } = useTranslation();\n  const {\n    register,\n    control,\n    handleSubmit,\n    reset,\n    formState: { errors },\n  } = useForm<PodContentValues>({\n    resolver: zodResolver(buildPodContentSchema(t)),\n    defaultValues,\n  });",
  ],
  [
    "      <DialogTitle>{title}</DialogTitle>",
    "      <DialogTitle>{title ?? t('shell.podContent.title')}</DialogTitle>",
  ],
  [
    "                  Pod details (read-only)\n                </Typography>",
    "                  {t('shell.podContent.readOnlyHeading')}\n                </Typography>",
  ],
  [
    "              label=\"Name\"\n              fullWidth",
    "              label={t('shell.podContent.name')}\n              fullWidth",
  ],
  [
    "              label=\"Description\"\n              fullWidth",
    "              label={t('shell.podContent.description')}\n              fullWidth",
  ],
  [
    "                  Images\n                </Typography>",
    "                  {t('shell.podContent.images')}\n                </Typography>",
  ],
  [
    "                    Add image\n                  </Button>",
    "                    {t('shell.podContent.addImage')}\n                  </Button>",
  ],
  [
    '                        alt="Pod media"',
    "                        alt={t('shell.podContent.mediaAlt')}",
  ],
  [
    "                  No images yet.\n                </Typography>",
    "                  {t('shell.podContent.noImages')}\n                </Typography>",
  ],
  [
    "          <Button onClick={onClose}>Cancel</Button>\n          <Button type=\"submit\" variant=\"contained\" disabled={busy}>\n            {busy ? 'Saving…' : 'Save'}\n          </Button>",
    "          <Button onClick={onClose}>{t('shell.common.cancel')}</Button>\n          <Button type=\"submit\" variant=\"contained\" disabled={busy}>\n            {busy ? t('shell.common.saving') : t('shell.common.save')}\n          </Button>",
  ],
]);
