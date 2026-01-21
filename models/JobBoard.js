import mongoose from 'mongoose';

const jobBoardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const JobBoard = mongoose.model('JobBoard', jobBoardSchema);

export default JobBoard;