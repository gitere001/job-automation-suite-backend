import mongoose from 'mongoose';

const jobContactSchema = new mongoose.Schema(
  {
    // Company Information
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    // Outreach Tracking
    initialReach: {
      type: Boolean,
      default: false
    },
    responseStatus: {
      type: String,
      enum: ['no_response', 'replied', 'rejected', 'interview', 'offer', 'ghosted'],
      default: 'no_response'
    },
    responseDate: {
      type: Date
    },
    followUpCount: {
      type: Number,
      default: 0,
      min: 0
    },
    nextFollowUpDate: {
      type: Date
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  {
    timestamps: true
  }
);

const JobContact = mongoose.model('JobContact', jobContactSchema);

export default JobContact;