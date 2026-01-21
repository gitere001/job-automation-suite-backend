import axios from 'axios';
import * as cheerio from 'cheerio';

const RELEVANT_TECH_KEYWORDS = [
  'developer', 'engineer', 'software', 'full stack', 'fullstack',
  'backend', 'frontend', 'web developer', 'web engineer',
  'javascript', 'typescript', 'node', 'react', 'python',
  'api', 'rest api', 'database', 'devops', 'systems',
  'technical', 'IT', 'tech', 'programmer', 'coder'
];

const EXCLUDE_KEYWORDS = [
  'internship', 'intern', 'attachment', 'senior', 'principal',
  'lead', 'manager', 'director', 'head of'
];

/**
 * Scrape careers page of a fintech company
 */
export const scrapeCompanyCareers = async (companyUrl, companyName) => {
  try {
    console.log(`🏢 Scraping careers: ${companyName} (${companyUrl})`);

    // Common career page paths
    const careerPaths = [
      '/careers',
      '/jobs',
      '/vacancies',
      '/career',
      '/job-openings',
      '/work-with-us',
      '/join-us',
      '/opportunities'
    ];

    let careersPage = null;

    // Try to find careers page
    for (const path of careerPaths) {
      try {
        const testUrl = companyUrl.endsWith('/') ?
          `${companyUrl}${path.substring(1)}` :
          `${companyUrl}${path}`;

        console.log(`   Trying: ${testUrl}`);
        const response = await axios.get(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 10000,
          validateStatus: (status) => status < 400
        });

        if (response.status === 200) {
          careersPage = { url: testUrl, data: response.data };
          console.log(`   ✅ Found careers page: ${testUrl}`);
          break;
        }
      } catch (err) {
        // Continue trying other paths
        continue;
      }
    }

    if (!careersPage) {
      console.log(`   ⚠️ No careers page found for ${companyName}`);
      return [];
    }

    const $ = cheerio.load(careersPage.data);
    const jobs = [];

    // Look for job listings
    const jobSelectors = [
      'a[href*="job"], a[href*="career"], a[href*="vacancy"]',
      '.job-listing', '.job-item', '.job-card', '.career-item',
      'li[class*="job"], div[class*="job"], article[class*="job"]',
      'h3 a, h4 a', // Job titles often in heading links
      '[class*="position"]', '[class*="opening"]',
      'a:contains("Apply"), a:contains("View")'
    ];

    const jobLinks = new Set();

    // Collect all potential job links
    jobSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim().toLowerCase();

        if (href && (href.includes('/job/') || href.includes('/career/') ||
            href.includes('/vacancy/') || href.includes('/apply/') ||
            text.includes('developer') || text.includes('engineer') ||
            text.includes('software'))) {

          let jobUrl = href;
          if (!href.startsWith('http')) {
            const base = new URL(careersPage.url);
            jobUrl = href.startsWith('/') ?
              `${base.origin}${href}` :
              `${base.origin}/${href}`;
          }

          jobLinks.add(jobUrl);
        }
      });
    });

    console.log(`   Found ${jobLinks.size} potential job links`);

    // Process each job link
    for (const jobLink of Array.from(jobLinks).slice(0, 20)) { // Limit to 20 jobs
      try {
        console.log(`   🔍 Checking: ${jobLink.substring(0, 60)}...`);

        const jobResponse = await axios.get(jobLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $$ = cheerio.load(jobResponse.data);

        // Extract job title
        const title =
          $$('h1').first().text().trim() ||
          $$('title').text().split('|')[0].trim() ||
          $$('meta[property="og:title"]').attr('content') ||
          'Unknown Position';

        // Filter by keywords
        const titleLower = title.toLowerCase();
        const isRelevant = RELEVANT_TECH_KEYWORDS.some(kw => titleLower.includes(kw));
        const isExcluded = EXCLUDE_KEYWORDS.some(kw => titleLower.includes(kw));

        if (!isRelevant || isExcluded) {
          console.log(`      ⏩ Skipped: ${title.substring(0, 40)}...`);
          continue;
        }

        // Extract job details
        const description = $$('main, .content, .description, .job-description')
          .first().text().trim().substring(0, 1000) || null;

        // Try to find location
        let location = 'Kenya';
        const pageText = $$('body').text().toLowerCase();
        if (pageText.includes('nairobi')) location = 'Nairobi, Kenya';
        else if (pageText.includes('remote')) location = 'Remote';

        // Try to find requirements
        const requirements = $$('.requirements, .qualifications, [class*="req"]')
          .first().text().trim() || null;

        jobs.push({
          title,
          company: companyName,
          location,
          jobUrl: jobLink,
          description,
          requirements,
          salary: null, // Hard to extract from most sites
          postedDate: new Date(), // Default to today
          sourceType: 'company_website',
          sourceName: companyName,
          sourceUrl: companyUrl
        });

        console.log(`      ✅ Added: ${title.substring(0, 50)}...`);

      } catch (jobError) {
        console.log(`      ❌ Failed to fetch job details: ${jobError.message}`);
        continue;
      }

      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`   ✨ Found ${jobs.length} relevant tech jobs at ${companyName}`);
    return jobs;

  } catch (error) {
    console.error(`❌ Failed to scrape ${companyName}:`, error.message);
    return [];
  }
};

export default scrapeCompanyCareers;
