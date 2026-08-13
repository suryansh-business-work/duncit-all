import { Schema, model, type Document } from 'mongoose';

export type AppBuildPlatform = 'ANDROID' | 'IOS';
/**
 * QUEUED is the portal's doing: a build started from Tech exists as a row
 * BEFORE GitHub has a runner for it, because the dispatch REST call answers
 * 204 with no run id and the operator still needs to see that their click
 * landed. CI moves it to RUNNING with the run url attached.
 */
export type AppBuildStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type AppBuildArtifactKind = 'APK' | 'AAB' | 'IPA';

/** Which stack the built app talks to — NOT where this row is recorded. */
export type AppBuildEnv = 'PRODUCTION' | 'STAGING';

/** What started the build. */
export type AppBuildTrigger = 'PUSH' | 'PORTAL';

/**
 * One stage of a run, stamped when the runner entered it. The workflow reports
 * these as it goes, so a build that is still running can say what it is doing
 * rather than only how long it has been doing something.
 */
export interface IAppBuildStage {
  name: string;
  at: Date;
}

export interface IAppBuildCommit {
  hash: string;
  subject: string;
  author: string;
}

/**
 * One file a build produced. Android makes two of these — the APK people
 * sideload and the AAB that goes to Play — from a single compile, so they
 * belong to one build row rather than two.
 */
export interface IAppBuildArtifact {
  kind: AppBuildArtifactKind;
  name: string;
  url: string;
  /** The on-disk file name in the VPS build store; how it is deleted. */
  file_id: string;
  size_mb: number | null;
  /** Why this one is missing. Empty whenever there is a url. */
  error: string;
}

export interface IAppBuild extends Document {
  /** Permanent, human-readable id (DUN-BLD-000001) — never reused. */
  build_no: string;
  platform: AppBuildPlatform;
  status: AppBuildStatus;
  /** app.json expo.version at the commit the build was made from. */
  version: string;
  /**
   * Everything this build produced. Empty on rows written before builds shipped
   * more than one file — `pub()` synthesises those from the singular fields
   * below, so nothing downstream has to know which era a row came from.
   */
  artifacts: IAppBuildArtifact[];
  /** The primary artifact's file name, e.g. duncit-android-v1.52.30-6c8d121.apk. */
  build_name: string;
  /**
   * The download link. Empty on a FAILED build, and on a SUCCESS build whose
   * artifact could not be stored — see artifact_error.
   */
  artifact_url: string;
  /**
   * The handle the artifact can be removed by: the on-disk file name in the
   * VPS build store. Older rows hold an ImageKit fileId, from when artifacts
   * lived there.
   */
  artifact_file_id: string;
  /**
   * Why a SUCCESS build has no download. Empty whenever there IS one — this
   * exists so "it compiled but the upload failed" is a visible outcome rather
   * than a missing button.
   */
  artifact_error: string;
  /**
   * Why a FAILED build failed: the stage that broke plus whatever the runner
   * said. Empty on RUNNING and SUCCESS. Without it a red row is just a colour,
   * and the reason lives only in a GitHub log that expires.
   */
  error_message: string;
  size_mb: number | null;
  commit_sha: string;
  branch: string;
  /** The commits this build shipped (the merge's range on the push event). */
  commits: IAppBuildCommit[];
  files_changed: number | null;
  insertions: number | null;
  deletions: number | null;
  workflow_run_id: string;
  workflow_run_url: string;
  duration_seconds: number | null;
  /** Who the CI authenticated as when it reported the build. */
  reported_by: string;
  /**
   * Correlates the row the portal created at dispatch with the reports the
   * runner sends later. It travels as a workflow input, so it is the only join
   * key available BEFORE a run id exists.
   */
  dispatch_id: string;
  /** PUSH for a merge to main, PORTAL for a Create build in Tech. */
  trigger_source: AppBuildTrigger;
  /**
   * The person who started it: the portal account for PORTAL builds, the
   * GitHub actor who merged for PUSH builds. "Who ran this" is otherwise only
   * answerable from a GitHub run page that expires.
   */
  triggered_by: string;
  /** Which server + database the built app points at. */
  app_env: AppBuildEnv;
  /**
   * What the operator asked for. Kept apart from `artifacts` (what was
   * actually produced) so an APK that was requested and never appeared is a
   * visible gap rather than an absence.
   */
  requested_artifacts: AppBuildArtifactKind[];
  /** The stage the runner is in now — the headline while it is still running. */
  stage: string;
  /** Every stage it has entered, in order. */
  stages: IAppBuildStage[];
  /**
   * What happened to the Slack announcement. Slack is a NOTIFICATION, not the
   * store of record — the row is. An unposted build stays visible here.
   */
  slack_channel: string | null;
  slack_ts: string | null;
  slack_error: string | null;
  created_at: Date;
  updated_at: Date;
}

const appBuildCommitSchema = new Schema<IAppBuildCommit>(
  {
    hash: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    author: { type: String, default: '' },
  },
  { _id: false }
);

const appBuildArtifactSchema = new Schema<IAppBuildArtifact>(
  {
    kind: { type: String, enum: ['APK', 'AAB', 'IPA'], required: true },
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    file_id: { type: String, default: '' },
    size_mb: { type: Number, default: null },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const appBuildStageSchema = new Schema<IAppBuildStage>(
  {
    name: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const appBuildSchema = new Schema<IAppBuild>(
  {
    build_no: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ['ANDROID', 'IOS'], required: true, index: true },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'],
      default: 'SUCCESS',
      index: true,
    },
    // Empty until the runner reads app.json: a build queued from the portal is
    // a real row before anything has checked out the branch it will build.
    version: { type: String, default: '', trim: true, index: true },
    artifacts: { type: [appBuildArtifactSchema], default: [] },
    build_name: { type: String, default: '' },
    artifact_url: { type: String, default: '' },
    artifact_file_id: { type: String, default: '' },
    artifact_error: { type: String, default: '' },
    error_message: { type: String, default: '' },
    size_mb: { type: Number, default: null },
    commit_sha: { type: String, default: '', index: true },
    branch: { type: String, default: '' },
    commits: { type: [appBuildCommitSchema], default: [] },
    files_changed: { type: Number, default: null },
    insertions: { type: Number, default: null },
    deletions: { type: Number, default: null },
    workflow_run_id: { type: String, default: '' },
    workflow_run_url: { type: String, default: '' },
    duration_seconds: { type: Number, default: null },
    reported_by: { type: String, default: '' },
    dispatch_id: { type: String, default: '' },
    trigger_source: { type: String, enum: ['PUSH', 'PORTAL'], default: 'PUSH', index: true },
    triggered_by: { type: String, default: '' },
    app_env: { type: String, enum: ['PRODUCTION', 'STAGING'], default: 'PRODUCTION', index: true },
    requested_artifacts: { type: [String], default: [] },
    stage: { type: String, default: '' },
    stages: { type: [appBuildStageSchema], default: [] },
    slack_channel: { type: String, default: null },
    slack_ts: { type: String, default: null },
    slack_error: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Each platform tab reads its own builds newest-first.
appBuildSchema.index({ platform: 1, created_at: -1 });

// How a workflow's start-of-run and end-of-run reports find each other and
// become one row. Deliberately NOT unique: workflow_run_id is '' on a
// hand-made report and on every row written before builds reported their
// start, and a unique index would let only one of those exist.
appBuildSchema.index({ platform: 1, workflow_run_id: 1 });

// How a portal-dispatched row finds the reports of the run it started. Checked
// BEFORE workflow_run_id, because the row exists before the run does. Sparse
// and non-unique for the same reason as the index above: dispatch_id is '' on
// every push-triggered and pre-existing row.
appBuildSchema.index({ dispatch_id: 1 }, { sparse: true });

export const AppBuildModel = model<IAppBuild>('AppBuild', appBuildSchema);

// Atomic sequential counter for build ids (same pattern as FeedbackReportCounter).
interface IAppBuildCounter extends Document {
  singleton_key: string;
  seq: number;
}

const appBuildCounterSchema = new Schema<IAppBuildCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const AppBuildCounterModel = model<IAppBuildCounter>('AppBuildCounter', appBuildCounterSchema);

/** Next globally unique build id, e.g. `DUN-BLD-000001` — never reused. */
export async function nextBuildNo(): Promise<string> {
  const doc = await AppBuildCounterModel.findOneAndUpdate(
    { singleton_key: 'app_build' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `DUN-BLD-${String(doc.seq).padStart(6, '0')}`;
}
