/**
 * BotFilter - Industry-standard bot and crawler detection
 * Filters out automated traffic to ensure accurate analytics
 */

class BotFilter {
  constructor() {
    // Known bot user-agents (comprehensive list from IAB, Google, industry sources)
    this.botPatterns = [
      // Search Engine Crawlers
      /googlebot/i,
      /bingbot/i,
      /slurp/i, // Yahoo
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
      /sogou/i,
      /exabot/i,

      // Social Media Bots
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
      /pinterest/i,
      /slackbot/i,
      /telegrambot/i,
      /whatsapp/i,

      // SEO/Analytics Tools
      /ahrefsbot/i,
      /semrushbot/i,
      /majestic/i,
      /mj12bot/i,
      /dotbot/i,
      /rogerbot/i,
      /screaming frog/i,

      // Archive/Web Crawlers
      /archive\.org_bot/i,
      /ia_archiver/i,
      /wayback/i,

      // Generic Bot Indicators
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /java\//i,
      /go-http-client/i,
      /axios/i,
      /node-fetch/i,

      // Monitoring/Uptime Services
      /pingdom/i,
      /uptimerobot/i,
      /newrelic/i,
      /datadog/i,
      /site24x7/i,

      // Security Scanners
      /nikto/i,
      /nessus/i,
      /qualys/i,
      /acunetix/i,
      /nmap/i,

      // Cloud/CDN Bots
      /cloudflare/i,
      /akamai/i,
      /fastly/i,

      // Headless Browsers (often automated)
      /headlesschrome/i,
      /phantomjs/i,
      /selenium/i,
      /puppeteer/i,
      /playwright/i,
    ];

    // Known bot IP ranges (CIDR notation)
    this.botIPRanges = [
      // Google
      '66.249.64.0/19',
      '66.102.0.0/20',

      // Bing
      '40.77.167.0/24',
      '207.46.13.0/24',

      // Common cloud providers (often bots)
      '35.0.0.0/8', // AWS
      '52.0.0.0/8', // AWS

      // Add more as needed
    ];

    // Behavioral patterns indicating bot activity
    this.suspiciousPatterns = {
      rapidRequests: 100, // More than 100 requests/minute
      shortSessionDuration: 2000, // Less than 2 seconds
      noJavaScript: true, // No JS execution detected
      perfectLinear: true, // Too perfect sequential access
    };
  }

  /**
   * Check if a user-agent is a bot
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if bot detected
   */
  isBotUserAgent(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') {
      return true; // No UA = likely bot
    }

    return this.botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check if IP is from a known bot range
   * @param {string} ip - IP address
   * @returns {boolean} True if in bot IP range
   */
  isBotIP(ip) {
    // Simple IP range check (for production, use proper IP library)
    // This is a simplified version
    if (!ip) return false;

    // Check against known bot IPs
    const knownBotIPs = [
      '66.249.', // Google
      '40.77.',   // Bing
      '157.55.',  // Bing
      '207.46.',  // Bing
    ];

    return knownBotIPs.some(prefix => ip.startsWith(prefix));
  }

  /**
   * Analyze behavioral patterns for bot detection
   * @param {Object} session - Session data
   * @returns {Object} Analysis result with score
   */
  analyzeBehavior(session) {
    const indicators = {
      isBot: false,
      confidence: 0,
      reasons: [],
    };

    // Check request rate
    if (session.requestsPerMinute > this.suspiciousPatterns.rapidRequests) {
      indicators.confidence += 30;
      indicators.reasons.push('Excessive request rate');
    }

    // Check session duration
    if (session.duration < this.suspiciousPatterns.shortSessionDuration) {
      indicators.confidence += 20;
      indicators.reasons.push('Suspiciously short session');
    }

    // Check JavaScript execution
    if (!session.hasJavaScript) {
      indicators.confidence += 25;
      indicators.reasons.push('No JavaScript execution detected');
    }

    // Check for perfect sequential access pattern
    if (session.accessPattern === 'sequential' && session.perfectTiming) {
      indicators.confidence += 25;
      indicators.reasons.push('Perfect sequential access pattern');
    }

    // Check if all requests are successful (bots often don't trigger errors)
    if (session.errorRate === 0 && session.requestCount > 50) {
      indicators.confidence += 15;
      indicators.reasons.push('Zero error rate with high request count');
    }

    // Check for missing common headers
    if (!session.headers.acceptLanguage) {
      indicators.confidence += 10;
      indicators.reasons.push('Missing Accept-Language header');
    }

    if (!session.headers.referer && session.requestCount > 5) {
      indicators.confidence += 10;
      indicators.reasons.push('Missing Referer header on multiple requests');
    }

    // Determine if bot based on confidence score
    indicators.isBot = indicators.confidence >= 50;

    return indicators;
  }

  /**
   * Comprehensive bot detection
   * @param {Object} request - Request object with userAgent, ip, session data
   * @returns {Object} Detection result
   */
  isBot(request) {
    const result = {
      isBot: false,
      confidence: 0,
      reasons: [],
      method: null,
    };

    // Check user agent
    if (this.isBotUserAgent(request.userAgent)) {
      result.isBot = true;
      result.confidence = 95;
      result.method = 'user-agent';
      result.reasons.push('Bot user-agent detected');
      return result;
    }

    // Check IP
    if (request.ip && this.isBotIP(request.ip)) {
      result.isBot = true;
      result.confidence = 85;
      result.method = 'ip-range';
      result.reasons.push('IP from known bot range');
      return result;
    }

    // Check behavioral patterns
    if (request.session) {
      const behaviorAnalysis = this.analyzeBehavior(request.session);
      if (behaviorAnalysis.isBot) {
        result.isBot = true;
        result.confidence = behaviorAnalysis.confidence;
        result.method = 'behavioral';
        result.reasons = behaviorAnalysis.reasons;
        return result;
      }
    }

    return result;
  }

  /**
   * Filter bot entries from log data
   * @param {Array} logEntries - Array of log entries
   * @returns {Object} Filtered results with stats
   */
  filterLogs(logEntries) {
    const results = {
      total: logEntries.length,
      legitimate: [],
      bots: [],
      stats: {
        botPercentage: 0,
        detectionMethods: {},
      },
    };

    logEntries.forEach(entry => {
      const detection = this.isBot({
        userAgent: entry.userAgent,
        ip: entry.ip,
        session: entry.session,
      });

      if (detection.isBot) {
        results.bots.push({
          ...entry,
          botDetection: detection,
        });

        // Track detection methods
        const method = detection.method || 'unknown';
        results.stats.detectionMethods[method] =
          (results.stats.detectionMethods[method] || 0) + 1;
      } else {
        results.legitimate.push(entry);
      }
    });

    results.stats.botPercentage =
      ((results.bots.length / results.total) * 100).toFixed(2);

    return results;
  }

  /**
   * Get list of common legitimate user agents for testing
   * @returns {Array} Legitimate user agent strings
   */
  getLegitimateUserAgents() {
    return [
      // Chrome
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      // Firefox
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',

      // Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',

      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

      // Mobile
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
    ];
  }
}

module.exports = BotFilter;
