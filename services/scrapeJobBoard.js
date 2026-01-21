
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Keywords that match your skills and target roles
 * Based on your CV: Full-Stack, Node.js, React, Python, Fintech
 */
const RELEVANT_KEYWORDS = [
  // Job titles
  'developer', 'engineer', 'software', 'programmer', 'coder',
  'full stack', 'fullstack', 'full-stack',
  'backend', 'back-end', 'back end',
  'frontend', 'front-end', 'front end',
  'web developer', 'web engineer',

  // Technologies you know
  'javascript', 'typescript', 'node', 'react', 'python',
  'express', 'next.js', 'nextjs', 'mongodb', 'mysql', 'postgresql',
  'api', 'rest api', 'restful',

  // Domains/Industries
  'fintech', 'financial technology', 'payment', 'mobile money',
  'm-pesa', 'mpesa', 'paystack',

  // Related roles
  'devops', 'systems', 'application developer',
  'technical', 'IT', 'tech',
  'mern', 'mean', 'stack'
];

/**
 * Keywords to EXCLUDE (jobs you don't want)
 */
const EXCLUDE_KEYWORDS = [
  'internship', 'intern', 'attachment',
  'senior', 'principal', 'lead', 'head of', 'director', 'manager',
  'data scientist', 'machine learning', 'ML engineer',
  'mobile', 'android', 'ios', 'flutter', 'react native',
  'java', '.net', 'c#', 'php', 'ruby', 'laravel',
  'designer', 'ui/ux', 'graphic',
  'sales', 'marketing', 'accountant'
];

/**
 * Universal job scraper with intelligent keyword filtering
 * Only returns jobs relevant to your skills
 */
export const scrapeJobBoard = async (url, sourceName) => {
  try {
    console.log(`🔍 Scraping: ${url}`);

    // Fetch the page
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const jobs = [];
    let totalScraped = 0;
    let filtered = 0;

    // Common job listing patterns across different job boards
    const jobSelectors = [
      'article',
      '.job-item',
      '.job-card',
      '.job-listing',
      '.search-result',
      '[class*="job"]',
      '[data-job-id]',
      'li[class*="listing"]',
      'div[class*="posting"]',
      '.vacancy'
    ];

    // Find all potential job containers
    let $jobElements = $();
    for (const selector of jobSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        $jobElements = elements;
        console.log(`📦 Using selector: ${selector} (${elements.length} elements)`);
        break;
      }
    }

    if ($jobElements.length === 0) {
      console.warn('⚠️ No job elements found - trying alternative approach');
      // Fallback: find all links that might be jobs
      $jobElements = $('a').filter((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        return href && (
          href.includes('job') ||
          text.includes('developer') ||
          text.includes('engineer')
        );
      });
    }

    console.log(`📦 Found ${$jobElements.length} potential job elements`);

    // Extract jobs from each container
    $jobElements.each((i, el) => {
      try {
        const $job = $(el);
        totalScraped++;

        // Extract title - try multiple patterns
        const title =
          $job.find('h2 a, h3 a, .job-title a, [class*="title"] a, a[class*="job"]').first().text().trim() ||
          $job.find('h2, h3, .job-title, [class*="title"]').first().text().trim() ||
          $job.find('a').first().text().trim();

        // Skip if no title or title too short
        if (!title || title.length < 5) return;

        // ========================================
        // KEYWORD FILTERING - THE CRITICAL PART
        // ========================================
        const titleLower = title.toLowerCase();

        // Check if title contains excluded keywords
        const hasExcluded = EXCLUDE_KEYWORDS.some(keyword =>
          titleLower.includes(keyword.toLowerCase())
        );

        if (hasExcluded) {
          filtered++;
          return; // Skip this job
        }

        // Check if title contains relevant keywords
        const isRelevant = RELEVANT_KEYWORDS.some(keyword =>
          titleLower.includes(keyword.toLowerCase())
        );

        if (!isRelevant) {
          filtered++;
          return; // Skip this job
        }

        // ========================================
        // If we reach here, job passed filtering
        // ========================================

        // Extract company
        const company =
          $job.find('.company, .company-name, [class*="company"]').first().text().trim() ||
          $job.find('span, p').filter((i, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes('ltd') || text.includes('limited') || text.includes('inc') || text.includes('plc');
          }).first().text().trim() ||
          'Company Not Listed';

        // Extract location
        const location =
          $job.find('.location, [class*="location"], [class*="place"]').first().text().trim() ||
          $job.find('span, p').filter((i, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes('nairobi') || text.includes('kenya') || text.includes('remote');
          }).first().text().trim() ||
          'Kenya';

        // Extract job URL
        const link = $job.find('a').first().attr('href') || $job.attr('href');
        let jobUrl = null;
        if (link) {
          try {
            jobUrl = link.startsWith('http') ? link : new URL(link, url).href;
          } catch (urlError) {
            jobUrl = link.startsWith('/') ? `${new URL(url).origin}${link}` : null;
          }
        }

        // Skip if no URL
        if (!jobUrl) return;

        // Extract salary if available
        const salaryText = $job.text();
        const salary = extractSalary(salaryText);

        // Extract posted date
        const dateText =
          $job.find('[class*="date"], [class*="time"], time').first().text().trim();
        const postedDate = parseRelativeDate(dateText);

        // Extract description snippet if available
        const description =
          $job.find('.description, [class*="desc"], p').first().text().trim() || null;

        // Add the job
        jobs.push({
          title,
          company,
          location: cleanLocation(location),
          jobUrl,
          salary,
          description: description ? description.substring(0, 500) : null,
          postedDate,
          sourceType: 'jobboard',
          sourceName,
          sourceUrl: url
        });

      } catch (err) {
        // Skip problematic items silently
      }
    });

    console.log(`✅ Scraped ${totalScraped} jobs`);
    console.log(`🔍 Filtered out ${filtered} irrelevant jobs`);
    console.log(`✨ Returning ${jobs.length} relevant jobs`);

    return jobs;

  } catch (error) {
    console.error(`❌ Scraping failed for ${url}:`, error.message);
    return [];
  }
};

/**
 * Extract salary from text using patterns
 */
const extractSalary = (text) => {
  const salaryPatterns = [
    /KES?\s*[\d,]+(?:\s*-\s*[\d,]+)?(?:\s*(?:per|\/)\s*(?:month|yr|year|annum))?/i,
    /Ksh?\s*[\d,]+(?:\s*-\s*[\d,]+)?/i,
    /[\d,]+\s*-\s*[\d,]+\s*(?:KES|Ksh)/i,
    /salary[:\s]+KES?\s*[\d,]+/i
  ];

  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  return null;
};

/**
 * Parse relative dates like "2 days ago", "1 week ago"
 */
const parseRelativeDate = (dateText) => {
  if (!dateText) return null;

  const text = dateText.toLowerCase();
  const now = new Date();

  if (text.includes('today') || text.includes('just now')) {
    return now;
  }

  if (text.includes('yesterday')) {
    return new Date(now.setDate(now.getDate() - 1));
  }

  const daysMatch = text.match(/(\d+)\s*day/);
  if (daysMatch) {
    return new Date(now.setDate(now.getDate() - parseInt(daysMatch[1])));
  }

  const weeksMatch = text.match(/(\d+)\s*week/);
  if (weeksMatch) {
    return new Date(now.setDate(now.getDate() - (parseInt(weeksMatch[1]) * 7)));
  }

  const monthsMatch = text.match(/(\d+)\s*month/);
  if (monthsMatch) {
    return new Date(now.setMonth(now.getMonth() - parseInt(monthsMatch[1])));
  }

  return null;
};

/**
 * Clean location text
 */
const cleanLocation = (location) => {
  if (!location) return 'Kenya';

  // Remove extra whitespace and common prefixes
  return location
    .replace(/location[:\s]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default scrapeJobBoard;
