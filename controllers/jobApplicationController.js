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