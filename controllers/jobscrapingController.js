import scrapeJobBoard from '../services/scrapeJobBoard.js';
import JobBoard from '../models/JobBoard.js';
import Job from '../models/Job.js';
import generateJobHash from '../utils/hashGenerator.js';
import Company from '../models/company.js';
import scrapeCompanyCareers from '../services/scrapeCompanies.js';

/**
 * Controller to scrape job boards WITHOUT AI
 * Just scrape, deduplicate, and save
 */
export const scrapeAllJobBoards = async (req, res) => {
  try {
    console.log('🚀 Starting scrape (no AI)...');

    // 1. Get all job boards
    const jobBoards = await JobBoard.find({});
    console.log(`📋 Found ${jobBoards.length} boards`);

    if (jobBoards.length === 0) {
      return res.json({
        success: false,
        message: 'No job boards found in database'
      });
    }

    let allJobs = [];

    // 2. Scrape each board
    for (const board of jobBoards) {
      console.log(`🔍 Scraping ${board.name}...`);

      const jobs = await scrapeJobBoard(board.url, board.name);

      // Only process if jobs were actually found
      if (jobs && jobs.length > 0) {
        // Add source info
        const jobsWithSource = jobs.map(job => ({
          ...job,
          sourceType: 'jobboard',
          sourceName: board.name,
          sourceUrl: board.url,
          scrapedAt: new Date(),
          lastChecked: new Date()
        }));

        allJobs = [...allJobs, ...jobsWithSource];
      }
    }

    console.log(`✅ Total relevant jobs found: ${allJobs.length}`);

    if (allJobs.length === 0) {
      return res.json({
        success: true,
        message: 'No relevant jobs found on any job board',
        stats: {
          jobBoardsScraped: jobBoards.length,
          relevantJobsFound: 0,
          newJobsSaved: 0,
          duplicateJobsFound: 0
        }
      });
    }

    // 3. Generate hashes for deduplication
    const jobsWithHash = allJobs.map(job => ({
      ...job,
      jobHash: generateJobHash(job)
    }));

    // 4. Get existing job hashes from DB
    const existingHashes = await Job.distinct('jobHash');
    const hashSet = new Set(existingHashes);

    // 5. Separate new vs duplicate jobs
    const newJobs = [];
    const duplicateJobs = [];

    for (const job of jobsWithHash) {
      if (hashSet.has(job.jobHash)) {
        duplicateJobs.push(job);
      } else {
        newJobs.push(job);
      }
    }

    console.log(`🆕 New jobs: ${newJobs.length}`);
    console.log(`🔁 Duplicates: ${duplicateJobs.length}`);

    // 6. Prepare new jobs for saving
    const jobsToSave = newJobs.map(job => ({
      ...job,
      // No AI fields - they remain null/empty
      aiProcessed: false,
      aiScore: null,
      aiAnalysis: null,
      matchedKeywords: [],
      missingSkills: [],
      isActive: true,
      applicationStatus: 'new'
    }));

    // 7. Save new jobs to DB
    let savedCount = 0;
    if (jobsToSave.length > 0) {
      try {
        const savedJobs = await Job.insertMany(jobsToSave, { ordered: false });
        savedCount = savedJobs.length;
        console.log(`💾 Saved ${savedCount} new jobs`);
      } catch (insertError) {
        console.error('Insert error:', insertError.message);
        // Don't try individually - just report failure
        return res.status(500).json({
          success: false,
          message: 'Failed to save jobs to database',
          error: insertError.message
        });
      }
    }

    // 8. Update lastChecked for duplicates
    if (duplicateJobs.length > 0) {
      const duplicateHashes = duplicateJobs.map(job => job.jobHash);
      await Job.updateMany(
        { jobHash: { $in: duplicateHashes } },
        { $set: { lastChecked: new Date() } }
      );
      console.log(`🔄 Updated lastChecked for ${duplicateJobs.length} duplicates`);
    }

    // 9. Return results
    return res.json({
      success: true,
      message: 'Scraping completed successfully',
      stats: {
        jobBoardsScraped: jobBoards.length,
        relevantJobsFound: allJobs.length,
        newJobsSaved: savedCount,
        duplicateJobsFound: duplicateJobs.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Scraping controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Scraping failed',
      error: error.message
    });
  }
};

export const scrapeAllCompanies = async (req, res) => {
  try {
    console.log('🚀 Starting company website scraping...');

    // Get all fintech companies
    const companies = await Company.find({});
    console.log(`📋 Found ${companies.length} fintech companies`);

    if (companies.length === 0) {
      return res.json({
        success: false,
        message: 'No companies found in database'
      });
    }

    let allJobs = [];

    // Scrape each company's career page
    for (const company of companies) {
      console.log(`\n🏢 Processing: ${company.name}`);

      const jobs = await scrapeCompanyCareers(company.url, company.name);

      if (jobs && jobs.length > 0) {
        const jobsWithMetadata = jobs.map(job => ({
          ...job,
          scrapedAt: new Date(),
          lastChecked: new Date()
        }));

        allJobs = [...allJobs, ...jobsWithMetadata];
      }
    }

    console.log(`\n✅ Total relevant tech jobs found: ${allJobs.length}`);

    if (allJobs.length === 0) {
      return res.json({
        success: true,
        message: 'No tech jobs found on any company website',
        stats: {
          companiesScraped: companies.length,
          jobsFound: 0
        }
      });
    }

    // Generate hashes and deduplicate
    const jobsWithHash = allJobs.map(job => ({
      ...job,
      jobHash: generateJobHash(job)
    }));

    const existingHashes = await Job.distinct('jobHash');
    const hashSet = new Set(existingHashes);

    const newJobs = jobsWithHash.filter(job => !hashSet.has(job.jobHash));
    const duplicateJobs = jobsWithHash.filter(job => hashSet.has(job.jobHash));

    console.log(`🆕 New jobs: ${newJobs.length}`);
    console.log(`🔁 Duplicates: ${duplicateJobs.length}`);

    // Prepare jobs for saving
    const jobsToSave = newJobs.map(job => ({
      ...job,
      aiProcessed: false,
      aiScore: null,
      aiAnalysis: null,
      matchedKeywords: [],
      missingSkills: [],
      isActive: true,
      applicationStatus: 'new'
    }));

    // Save to database
    let savedCount = 0;
    if (jobsToSave.length > 0) {
      try {
        await Job.insertMany(jobsToSave, { ordered: false });
        savedCount = jobsToSave.length;
        console.log(`💾 Saved ${savedCount} new jobs`);
      } catch (insertError) {
        console.error('Failed to save jobs:', insertError.message);
        return res.status(500).json({
          success: false,
          message: 'Database save failed',
          error: insertError.message
        });
      }
    }

    // Update duplicates
    if (duplicateJobs.length > 0) {
      const duplicateHashes = duplicateJobs.map(job => job.jobHash);
      await Job.updateMany(
        { jobHash: { $in: duplicateHashes } },
        { $set: { lastChecked: new Date() } }
      );
      console.log(`🔄 Updated ${duplicateJobs.length} duplicates`);
    }

    // Return results
    return res.json({
      success: true,
      message: 'Company scraping completed',
      stats: {
        companiesScraped: companies.length,
        jobsFound: allJobs.length,
        newJobsSaved: savedCount,
        duplicateJobsFound: duplicateJobs.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Company scraping failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Scraping failed',
      error: error.message
    });
  }
};

// Test a single company
export const testCompanyScrape = async (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url || !name) {
      return res.status(400).json({
        success: false,
        message: 'URL and company name required'
      });
    }

    console.log(`🧪 Testing: ${name}`);
    const jobs = await scrapeCompanyCareers(url, name);

    return res.json({
      success: true,
      company: { name, url },
      jobsFound: jobs.length,
      jobs: jobs
    });

  } catch (error) {
    console.error('Test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};

export default {
  scrapeAllJobBoards,
  scrapeAllCompanies,
  testCompanyScrape
};
