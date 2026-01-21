import { sendJobApplication } from '../utils/sendJobApplication.js';
import JobContact from '../models/JobContact.js';

/**
 * Controller to handle batch job application sending
 * Takes an array of companies from frontend and processes them
 * Exact same logic as the original sendBatchApplications.js script
 */
export const sendBatchApplications = async (req, res) => {
  try {
    // Get companies array from request body
    const companies = req.body;

    // Validate input
    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of companies'
      });
    }

    // Validate each company object
    for (const company of companies) {
      if (!company.name || !company.email) {
        return res.status(400).json({
          success: false,
          message: 'Each company must have "name" and "email" fields'
        });
      }
    }

    console.log(`📦 Starting batch processing for ${companies.length} companies...`);



    const results = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let currentIndex = 0;

    // Process each company (SAME LOGIC AS BEFORE)
    for (const company of companies) {
      currentIndex++;
      console.log(`[${currentIndex}/${companies.length}] Processing ${company.name}...`);

      try {
        // Check if already sent to this company (SAME AS BEFORE)
        const existingContact = await JobContact.findOne({
          email: company.email.toLowerCase()
        });

        // If already sent and initialReach is true, skip (SAME AS BEFORE)
        if (existingContact && existingContact.initialReach) {
          console.log(`⏭️  Already sent to ${company.name}, skipping...`);
          skippedCount++;
          results.push({
            company: company.name,
            email: company.email,
            status: 'skipped',
            reason: 'Already contacted',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        console.log(`📤 Attempting to send to ${company.name}...`);

        // Send the application (SAME AS BEFORE)
        const result = await sendJobApplication(company);

        // Only update database if successful (SAME AS BEFORE)
        if (result.success) {
          sentCount++;
          console.log(`✅ Successfully sent to ${company.name}`);

          // Create or update the database record ONLY on success (SAME AS BEFORE)
          const updateData = {
            name: company.name,
            email: company.email.toLowerCase(),
            initialReach: true,
            responseStatus: 'no_response',
            followUpCount: 0,
            priority: 'medium',
            lastContacted: new Date()
          };

          if (existingContact) {
            // Update existing record (SAME AS BEFORE)
            await JobContact.findByIdAndUpdate(existingContact._id, updateData);
          } else {
            // Create new record (SAME AS BEFORE)
            await JobContact.create(updateData);
          }

          results.push({
            company: company.name,
            email: company.email,
            status: 'sent',
            messageId: result.response?.messageId,
            timestamp: result.timestamp
          });

        } else {
          // Failed - only log, don't store in DB (SAME AS BEFORE)
          failedCount++;
          console.log(`❌ Failed to send to ${company.name}: ${result.error}`);

          results.push({
            company: company.name,
            email: company.email,
            status: 'failed',
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        // Error handling (SAME AS BEFORE)
        failedCount++;
        console.log(`🔥 Error with ${company.name}: ${error.message}`);

        results.push({
          company: company.name,
          email: company.email,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // NO DATABASE STORAGE FOR ERRORS (SAME AS BEFORE)
      }

      // Add delay between emails (5 seconds) - SAME AS BEFORE
      if (currentIndex < companies.length) {
        console.log(`⏳ Waiting 5 seconds before next email...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n=== BATCH SENDING COMPLETE ===');
    console.log(`✅ Successfully sent: ${sentCount}`);
    console.log(`⏭️  Skipped (already sent): ${skippedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📊 Total processed: ${companies.length}`);

    // Return comprehensive response to frontend
    res.status(200).json({
      success: true,
      message: 'Batch processing complete',
      summary: {
        totalCompanies: companies.length,
        successfullySent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        processedAt: new Date().toISOString()
      },
      detailedResults: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Global error handler
    console.error(`🔥 Controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error during batch processing',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    // Get all job contacts
    const allContacts = await JobContact.find({});

    // Calculate dates for this week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Helper function to check if date is this week
    const isThisWeek = (date) => date >= startOfWeek && date <= endOfWeek;

    // Calculate stats
    const totalApplications = allContacts.filter(c => c.initialReach).length;
    const responded = allContacts.filter(c => c.responseStatus !== 'no_response');
    const interviewed = allContacts.filter(c => c.responseStatus === 'interview');
    const offers = allContacts.filter(c => c.responseStatus === 'offer');

    const responseRate = totalApplications > 0 ? (responded.length / totalApplications * 100) : 0;
    const interviewRate = totalApplications > 0 ? (interviewed.length / totalApplications * 100) : 0;
    const offerRate = totalApplications > 0 ? (offers.length / totalApplications * 100) : 0;

    // Pipeline status
    const pending = allContacts.filter(c => c.responseStatus === 'no_response').length;
    const inProcess = allContacts.filter(c => ['replied', 'interview'].includes(c.responseStatus)).length;
    const rejected = allContacts.filter(c => ['rejected', 'ghosted'].includes(c.responseStatus)).length;
    const successful = offers.length;

    // Weekly activity
    const applicationsThisWeek = allContacts.filter(c =>
      c.initialReach && isThisWeek(c.createdAt)
    ).length;

    const responsesThisWeek = allContacts.filter(c =>
      c.responseDate && c.responseStatus !== 'no_response' && isThisWeek(c.responseDate)
    ).length;

    // Average days to response
    const respondedContacts = allContacts.filter(c => c.responseDate);
    const totalResponseDays = respondedContacts.reduce((sum, contact) => {
      const days = Math.floor((contact.responseDate - contact.createdAt) / (1000 * 60 * 60 * 24));
      return sum + (days > 0 ? days : 0);
    }, 0);
    const avgDaysToResponse = respondedContacts.length > 0 ?
      (totalResponseDays / respondedContacts.length).toFixed(1) : 0;

    // Follow-ups needed (next 2 days)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const followUpsNeeded = allContacts.filter(c =>
      c.nextFollowUpDate && c.nextFollowUpDate <= tomorrow
    ).length;

    // Applications for last 7 days - one per day
    const lastWeekApplications = {};

    // Get applications for each of the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Format as "Wed-14"
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      const key = `${dayName}-${dayNumber}`;

      // Start and end of this day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Count applications for this day
      const count = allContacts.filter(c =>
        c.initialReach &&
        c.createdAt >= startOfDay &&
        c.createdAt <= endOfDay
      ).length;

      lastWeekApplications[key] = count;
    }

    // Construct response - REPLACED priorityFocus with lastWeekApplications
    const dashboardData = {
      overview: {
        totalApplications,
        responseRate: parseFloat(responseRate.toFixed(1)),
        interviewRate: parseFloat(interviewRate.toFixed(1)),
        offerRate: parseFloat(offerRate.toFixed(1))
      },
      pipeline: {
        pending,
        inProcess,
        rejected,
        successful
      },
      weeklyActivity: {
        applicationsThisWeek,
        responsesThisWeek,
        avgDaysToResponse: parseFloat(avgDaysToResponse),
        followUpsNeeded
      },
      // REPLACED: priorityFocus with lastWeekApplications (7 days data)
      lastWeekApplications
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};
