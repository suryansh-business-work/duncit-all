// The MUI challenge editors shared by the Challenge Portal and Admin >
// Categories: the category mapping editor (one editor over the same server
// rows, so both screens stay in sync) and the per-tool settings editor. The
// engine itself — scoring, ranking, permissions — lives on the server only.
export * from './mapping';
export { ToolConfigFields, type ToolConfigFieldsProps } from './tool-config/ToolConfigFields';
export { CriteriaEditor } from './tool-config/CriteriaEditor';
export {
  parseToolConfig,
  parseToolFields,
  toolConfigIssues,
  withDefaults,
  type JudgeCriterion,
  type ToolConfig,
  type ToolConfigIssue,
  type ToolField,
  type ToolFieldKind,
} from './tool-config/fields';
export {
  CHALLENGE_MAPPING_EDITOR,
  CHALLENGE_MAPPING_FIELDS,
  CLEAR_CHALLENGE_MAPPING,
  UPSERT_CHALLENGE_MAPPING,
  type MappingEditorData,
} from './queries';
export { useTranslation as useChallengeTranslation } from './i18n';
