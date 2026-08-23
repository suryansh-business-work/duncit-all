import { apply } from "./e.mjs";
apply("packages/docs-demos/src/demos/host-pod-actions.tsx", [
  [
    "  buildHostUpdateInput,\n  podEditSchema,\n} from '@duncit/host-pod-actions';",
    "  buildHostPodActionLabels as buildLabels,\n  buildHostUpdateInput,\n  buildPodEditSchema,\n} from '@duncit/host-pod-actions';",
  ],
  [
    "      const parsed = podEditSchema.safeParse(mock);",
    "      // The messages come from the catalogue, so the schema takes the same\n      // labels the dialog renders — the key itself stands in for a translator.\n      const parsed = buildPodEditSchema(buildLabels((key) => key, 'mweb')).safeParse(mock);",
  ],
  [
    "      'Labels used': buildHostPodActionLabels((key: string) => key, mock.surface),",
    "      'Labels used': buildLabels((key: string) => key, mock.surface),",
  ],
]);
