import { apply } from "./e.mjs";

apply("packages/portal-pod-form/src/index.ts", [
  [
    "export { podContentSchema } from './types';\nexport type { PodContentValues, PodField, PodMedia, ReadOnlyContextItem } from './types';",
    "export { buildPodContentSchema } from './types';\nexport type {\n  PodContentTranslate,\n  PodContentValues,\n  PodField,\n  PodMedia,\n  ReadOnlyContextItem,\n} from './types';",
  ],
]);

apply("packages/docs-demos/src/demos/portal-pod-form.tsx", [
  [
    "import { podContentSchema } from '@duncit/portal-pod-form';",
    "import { buildPodContentSchema } from '@duncit/portal-pod-form';",
  ],
  [
    "      const parsed = podContentSchema.safeParse(mock);",
    "      // The messages come from the catalogue, so the schema takes a\n      // translator — the console's live one inside a portal, the key itself here.\n      const parsed = buildPodContentSchema((key) => key).safeParse(mock);",
  ],
]);

apply("packages/portal-pod-form/__tests__/podContentSchema.test.ts", [
  [
    "import { podContentSchema } from '../src/types';",
    "import { buildPodContentSchema } from '../src/types';\n\n// The schema takes the console's translator; outside React the key is the copy.\nconst podContentSchema = buildPodContentSchema((key) => key);",
  ],
]);

apply("packages/portal-pod-form/docs/index.mdx", [
  ["  - 'podContentSchema'", "  - 'buildPodContentSchema'"],
  ["### `podContentSchema.parse(...)` on valid values", "### `buildPodContentSchema(t).parse(...)` on valid values"],
  [
    "| `podContentSchema` | `ZodObject` | The three-field contract; `.parse` trims title and description. |\n| `PodContentValues` | `z.infer<typeof podContentSchema>` | `{ pod_title, pod_description, pod_images_and_videos }`. |",
    "| `buildPodContentSchema` | `(t: PodContentTranslate) => ZodObject` | The three-field contract; `.parse` trims title and description. Its messages come from `shell.podContent.*`. |\n| `PodContentValues` | `z.infer<ReturnType<typeof buildPodContentSchema>>` | `{ pod_title, pod_description, pod_images_and_videos }`. |",
  ],
]);
