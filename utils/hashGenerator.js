import crypto from 'crypto';

const generateJobHash = (job) => {
  const hashString = [
    job.title?.toLowerCase().trim() || '',
    job.company?.toLowerCase().trim() || '',
    job.location?.toLowerCase().trim() || '',
    job.sourceName?.toLowerCase().trim() || ''
  ].join('|');

  return crypto.createHash('sha256').update(hashString).digest('hex');
};

export default generateJobHash;