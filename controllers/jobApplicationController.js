import JobContact from '../models/JobContact.js';
import { sendJobApplication } from '../utils/sendJobApplicationResend.js';

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
            website: company.website ? company.website.toLowerCase() : undefined,
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

    // Separate manual and automated applications
    const manualApps = allContacts.filter(c => c.applicationType === 'manual');
    const automatedApps = allContacts.filter(c => c.applicationType === 'automated');

    // Calculate stats for ALL applications
    const totalApplications = allContacts.length;
    const totalManual = manualApps.length;
    const totalAutomated = automatedApps.length;

    const responded = allContacts.filter(c => c.responseStatus !== 'no_response');
    const respondedManual = manualApps.filter(c => c.responseStatus !== 'no_response');
    const respondedAutomated = automatedApps.filter(c => c.responseStatus !== 'no_response');

    const interviewed = allContacts.filter(c => c.responseStatus === 'interview');
    const interviewedManual = manualApps.filter(c => c.responseStatus === 'interview');
    const interviewedAutomated = automatedApps.filter(c => c.responseStatus === 'interview');

    const offers = allContacts.filter(c => c.responseStatus === 'offer');
    const offersManual = manualApps.filter(c => c.responseStatus === 'offer');
    const offersAutomated = automatedApps.filter(c => c.responseStatus === 'offer');

    // Calculate rates for ALL
    const responseRate = totalApplications > 0 ? (responded.length / totalApplications * 100) : 0;
    const interviewRate = totalApplications > 0 ? (interviewed.length / totalApplications * 100) : 0;
    const offerRate = totalApplications > 0 ? (offers.length / totalApplications * 100) : 0;

    // Calculate rates for MANUAL
    const responseRateManual = totalManual > 0 ? (respondedManual.length / totalManual * 100) : 0;
    const interviewRateManual = totalManual > 0 ? (interviewedManual.length / totalManual * 100) : 0;
    const offerRateManual = totalManual > 0 ? (offersManual.length / totalManual * 100) : 0;

    // Calculate rates for AUTOMATED
    const responseRateAutomated = totalAutomated > 0 ? (respondedAutomated.length / totalAutomated * 100) : 0;
    const interviewRateAutomated = totalAutomated > 0 ? (interviewedAutomated.length / totalAutomated * 100) : 0;
    const offerRateAutomated = totalAutomated > 0 ? (offersAutomated.length / totalAutomated * 100) : 0;

    // Pipeline status for ALL
    const pending = allContacts.filter(c => c.responseStatus === 'no_response').length;
    const inProcess = allContacts.filter(c => ['replied', 'interview'].includes(c.responseStatus)).length;
    const rejected = allContacts.filter(c => ['rejected', 'ghosted'].includes(c.responseStatus)).length;
    const successful = offers.length;

    // Pipeline status by type
    const pendingManual = manualApps.filter(c => c.responseStatus === 'no_response').length;
    const pendingAutomated = automatedApps.filter(c => c.responseStatus === 'no_response').length;

    const inProcessManual = manualApps.filter(c => ['replied', 'interview'].includes(c.responseStatus)).length;
    const inProcessAutomated = automatedApps.filter(c => ['replied', 'interview'].includes(c.responseStatus)).length;

    // Weekly activity for ALL
    const applicationsThisWeek = allContacts.filter(c =>
      isThisWeek(c.createdAt)
    ).length;

    const responsesThisWeek = allContacts.filter(c =>
      c.responseDate && c.responseStatus !== 'no_response' && isThisWeek(c.responseDate)
    ).length;

    // Weekly activity by type
    const manualAppsThisWeek = manualApps.filter(c => isThisWeek(c.createdAt)).length;
    const automatedAppsThisWeek = automatedApps.filter(c => isThisWeek(c.createdAt)).length;

    // Average days to response for ALL
    const respondedContacts = allContacts.filter(c => c.responseDate);
    const totalResponseDays = respondedContacts.reduce((sum, contact) => {
      const days = Math.floor((contact.responseDate - contact.createdAt) / (1000 * 60 * 60 * 24));
      return sum + (days > 0 ? days : 0);
    }, 0);
    const avgDaysToResponse = respondedContacts.length > 0 ?
      (totalResponseDays / respondedContacts.length).toFixed(1) : 0;

    // Average days to response by type
    const respondedManualContacts = manualApps.filter(c => c.responseDate);
    const totalResponseDaysManual = respondedManualContacts.reduce((sum, contact) => {
      const days = Math.floor((contact.responseDate - contact.createdAt) / (1000 * 60 * 60 * 24));
      return sum + (days > 0 ? days : 0);
    }, 0);
    const avgDaysToResponseManual = respondedManualContacts.length > 0 ?
      (totalResponseDaysManual / respondedManualContacts.length).toFixed(1) : 0;

    const respondedAutomatedContacts = automatedApps.filter(c => c.responseDate);
    const totalResponseDaysAutomated = respondedAutomatedContacts.reduce((sum, contact) => {
      const days = Math.floor((contact.responseDate - contact.createdAt) / (1000 * 60 * 60 * 24));
      return sum + (days > 0 ? days : 0);
    }, 0);
    const avgDaysToResponseAutomated = respondedAutomatedContacts.length > 0 ?
      (totalResponseDaysAutomated / respondedAutomatedContacts.length).toFixed(1) : 0;

    // Follow-ups needed (next 2 days)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const followUpsNeeded = allContacts.filter(c =>
      c.nextFollowUpDate && c.nextFollowUpDate <= tomorrow
    ).length;

    // Applications for last 7 days - by type
    const lastWeekApplications = {
      manual: {},
      automated: {},
      total: {}
    };

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

      // Count applications for this day by type
      const manualCount = manualApps.filter(c =>
        c.createdAt >= startOfDay &&
        c.createdAt <= endOfDay
      ).length;

      const automatedCount = automatedApps.filter(c =>
        c.createdAt >= startOfDay &&
        c.createdAt <= endOfDay
      ).length;

      lastWeekApplications.manual[key] = manualCount;
      lastWeekApplications.automated[key] = automatedCount;
      lastWeekApplications.total[key] = manualCount + automatedCount;
    }

    // Construct response with breakdown by application type
    const dashboardData = {
      overview: {
        totalApplications,
        totalManual,
        totalAutomated,
        manualPercentage: totalApplications > 0 ? parseFloat((totalManual / totalApplications * 100).toFixed(1)) : 0,
        automatedPercentage: totalApplications > 0 ? parseFloat((totalAutomated / totalApplications * 100).toFixed(1)) : 0,
        responseRate: parseFloat(responseRate.toFixed(1)),
        interviewRate: parseFloat(interviewRate.toFixed(1)),
        offerRate: parseFloat(offerRate.toFixed(1))
      },
      performanceByType: {
        manual: {
          responseRate: parseFloat(responseRateManual.toFixed(1)),
          interviewRate: parseFloat(interviewRateManual.toFixed(1)),
          offerRate: parseFloat(offerRateManual.toFixed(1)),
          avgDaysToResponse: parseFloat(avgDaysToResponseManual)
        },
        automated: {
          responseRate: parseFloat(responseRateAutomated.toFixed(1)),
          interviewRate: parseFloat(interviewRateAutomated.toFixed(1)),
          offerRate: parseFloat(offerRateAutomated.toFixed(1)),
          avgDaysToResponse: parseFloat(avgDaysToResponseAutomated)
        }
      },
      pipeline: {
        pending,
        inProcess,
        rejected,
        successful,
        byType: {
          manual: {
            pending: pendingManual,
            inProcess: inProcessManual,
            successful: offersManual.length
          },
          automated: {
            pending: pendingAutomated,
            inProcess: inProcessAutomated,
            successful: offersAutomated.length
          }
        }
      },
      weeklyActivity: {
        applicationsThisWeek,
        manualAppsThisWeek,
        automatedAppsThisWeek,
        responsesThisWeek,
        avgDaysToResponse: parseFloat(avgDaysToResponse),
        followUpsNeeded
      },
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


// Add to jobApplicationController.js
export const getApplications = async (req, res) => {
  try {
    // Extract query parameters with defaults
    const {
      limit = '20',
      responseStatus,
      applicationType,
      search,
      sort = '-createdAt' // Default: latest first

    } = req.query;

    // Build filter object
    const filter = {};

    // Add responseStatus filter if provided
    if (responseStatus) {
      filter.responseStatus = responseStatus;
    }
    if (applicationType) {
      filter.applicationType = applicationType;
    }

    // Add company name search if provided (case-insensitive regex)
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // Determine limit - if "all", don't use limit
    const limitNum = limit === 'all' ? null : parseInt(limit, 10);

    // Build query with optimization
    let query = JobContact.find(filter)
      .sort(sort) // Sort by specified field (default: latest first)
      .lean(); // Return plain JS objects for better performance

    // Only apply limit if not "all"
    if (limitNum !== null) {
      query = query.limit(limitNum);
    }

    // Execute query - optimized with select only needed fields
    const applications = await query.select('name email website responseStatus initialReach followUpCount priority createdAt updatedAt responseDate nextFollowUpDate applicationType');

    // Get total count for the applied filters (optimized separate count)
    const totalCount = await JobContact.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: applications,
      meta: {
        total: totalCount,
        returned: applications.length,
        limit: limitNum === null ? 'all' : limitNum,
        filters: {
          responseStatus: responseStatus || 'none',
          search: search || 'none'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};




// Add manual application tracking
export const addManualApplication = async (req, res) => {
  try {
    const { name, email, website } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    // Check if company already exists
    const existingContact = await JobContact.findOne({
      email: email.toLowerCase()
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Company already exists in database',
        data: existingContact
      });
    }

    // Create new manual application record
    const newApplication = await JobContact.create({
      name,
      email: email.toLowerCase(),
      website: website ? website.toLowerCase() : undefined,
      initialReach: true, // Mark as contacted
      responseStatus: 'no_response',
      followUpCount: 0,
      priority: 'medium',
      lastContacted: new Date(),
      applicationType: 'manual'
    });

    console.log(`📝 Manual application added for ${name}`);

    res.status(201).json({
      success: true,
      message: 'Manual application tracked successfully',
      data: newApplication
    });

  } catch (error) {
    console.error('Add manual application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add manual application',
      error: error.message
    });
  }
};

// Update response status for any application
export const updateResponseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseStatus } = req.body;

    // Validate response status
    const validStatuses = ['no_response', 'replied', 'rejected', 'interview', 'offer', 'ghosted'];
    if (!validStatuses.includes(responseStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid response status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find and update the application
    const updateData = {
      responseStatus,
      responseDate: responseStatus !== 'no_response' ? new Date() : null
    };

    const updatedApplication = await JobContact.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    console.log(`🔄 Updated status for ${updatedApplication.name} to: ${responseStatus}`);

    res.status(200).json({
      success: true,
      message: 'Response status updated successfully',
      data: updatedApplication
    });

  } catch (error) {
    console.error('Update response status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update response status',
      error: error.message
    });
  }
};

// Delete bounced/failed applications
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Add a reason for deletion
    const { reason = 'bounced/removed' } = req.body;

    // Find the application first to log it
    const application = await JobContact.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Delete the application
    await JobContact.findByIdAndDelete(id);

    console.log(`🗑️  Deleted application for ${application.name} (${application.email}) - Reason: ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
      deletedData: {
        name: application.name,
        email: application.email,
        deletedAt: new Date().toISOString(),
        reason: reason
      }
    });

  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: error.message
    });
  }
};
