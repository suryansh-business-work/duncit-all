import mongoose from 'mongoose';
import { tableChangeLogPlugin } from './tableChangeLog.plugin';

/**
 * Registered from the top of `src/index.ts`, ahead of every import that
 * compiles a model: a global plugin reaches only the models compiled after it.
 *
 * Top-level models only. A child schema (an address, a line item) is written
 * through its parent, and the parent's diff already names the path inside it —
 * hooks on the child would fire once per subdocument with no collection of its
 * own to read back from.
 */
mongoose.set('applyPluginsToChildSchemas', false);
mongoose.plugin(tableChangeLogPlugin);
