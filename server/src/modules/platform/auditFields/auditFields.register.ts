import mongoose from 'mongoose';
import { auditFieldsPlugin } from './auditFields.plugin';

/**
 * Registered from the top of `src/index.ts`, ahead of every import that
 * compiles a model: a global plugin reaches only the models compiled after it.
 *
 * After the change log, so its hooks read each write before `updated_by` is
 * added to it — the stamp is not an edit anybody made.
 */
mongoose.plugin(auditFieldsPlugin);
