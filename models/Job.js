import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    salary: {
      type: String,
      default: null
    },
    jobUrl: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: null
    },
    requirements: {
      type: String,
      default: null
    },
    howToApply: {
      type: String,
      default: null
    },
    postedDate: {
      type: Date,
      default: null
    },
    // Source tracking
    sourceType: {
      type: String,
      enum: ['jobboard', 'company_website'],
      required: true
    },
    sourceName: {
      type: String,
      required: true,
      trim: true
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true
    },
    // AI Analysis
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    aiAnalysis: {
      type: String,
      default: null
    },
    matchedKeywords: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    aiProcessed: {
      type: Boolean,
      default: false
    },
    // Application tracking
    applicationStatus: {
      type: String,
      enum: ['new', 'applied', 'rejected', 'interviewing'],
      default: 'new'
    },
    appliedDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: null
    },
    // Deduplication
    jobHash: {
      type: String,
      required: true,
      unique: true
    },
    // Metadata
    scrapedAt: {
      type: Date,
      default: Date.now
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
jobSchema.index({ aiScore: -1 });
jobSchema.index({ applicationStatus: 1 });
jobSchema.index({ sourceType: 1 });
jobSchema.index({ jobHash: 1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;