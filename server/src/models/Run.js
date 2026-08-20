/**
 * A Run is one paraphrase: the input, the output, the options that produced
 * it, and everything needed to explain the result later.
 *
 * Versioning is by parent pointer rather than an embedded history array.
 * Re-running a stored text creates a child Run, so each version keeps its own
 * metrics and trace, and the chain can be walked in either direction without
 * rewriting earlier documents.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const OptionsSchema = new Schema({
  tone: { type: String, required: true },
  readabilityTarget: { type: String, required: true },
  intensity: { type: String, required: true },
  mode: { type: String, default: 'rewrite' },
  summaryLength: { type: String, default: 'standard' },
  engine: { type: String, required: true },
  seed: { type: Number },
  preserve: { type: [String], default: [] },
}, { _id: false });

const TraceEntrySchema = new Schema({
  rule: String,
  reason: String,
  from: String,
  to: String,
  sentence: Number,
  paragraph: Number,
  pass: Number,
}, { _id: false });

const RunSchema = new Schema({
  title: { type: String, trim: true, maxlength: 200, default: '' },

  contentOriginal: { type: String, required: true },
  contentParaphrased: { type: String, required: true },

  options: { type: OptionsSchema, required: true },

  // Full metric snapshots, kept verbatim so a stored run renders exactly as
  // it did when created even if the scoring code later changes.
  metrics: { type: Schema.Types.Mixed, required: true },

  trace: { type: [TraceEntrySchema], default: [] },
  traceSummary: { type: Schema.Types.Mixed, default: [] },
  plan: { type: Schema.Types.Mixed, default: null },
  passes: { type: Schema.Types.Mixed, default: [] },

  favorite: { type: Boolean, default: false },

  parentId: { type: Schema.Types.ObjectId, ref: 'Run', default: null, index: true },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

RunSchema.index({ createdAt: -1 });
RunSchema.index({ favorite: 1, createdAt: -1 });

/** Compact shape for the history list; excludes trace and full metrics. */
RunSchema.statics.listProjection = {
  title: 1,
  contentOriginal: 1,
  contentParaphrased: 1,
  options: 1,
  favorite: 1,
  parentId: 1,
  version: 1,
  createdAt: 1,
  updatedAt: 1,
  'metrics.before.readability.summary': 1,
  'metrics.after.readability.summary': 1,
  'metrics.after.tone.dominant': 1,
  'metrics.delta': 1,
};

export const Run = mongoose.models.Run || mongoose.model('Run', RunSchema);
export default Run;
