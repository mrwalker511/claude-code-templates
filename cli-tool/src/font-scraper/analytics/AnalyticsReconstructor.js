/**
 * AnalyticsReconstructor - Rebuild analytics data from logs
 * Calculates impressions, unique visitors, and other metrics
 * with proper bot filtering
 */

const crypto = require('crypto');

class AnalyticsReconstructor {
  constructor(botFilter) {
    this.botFilter = botFilter;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Process log entries to extract analytics
   * @param {Array} logEntries - Raw log entries
   * @returns {Object} Analytics data
   */
  processLogs(logEntries) {
    // Filter out bots
    const filteredLogs = this.botFilter
      ? this.botFilter.filterLogs(logEntries)
      : { legitimate: logEntries, bots: [] };

    const legitimateEntries = filteredLogs.legitimate;

    // Calculate metrics
    const analytics = {
      overview: {
        totalRequests: legitimateEntries.length,
        totalBots: filteredLogs.bots.length,
        botPercentage: filteredLogs.stats?.botPercentage || 0,
        dateRange: this._getDateRange(legitimateEntries),
      },
      visitors: this._calculateVisitors(legitimateEntries),
      impressions: this._calculateImpressions(legitimateEntries),
      sessions: this._calculateSessions(legitimateEntries),
      pages: this._calculatePageViews(legitimateEntries),
      referrers: this._calculateReferrers(legitimateEntries),
      devices: this._calculateDevices(legitimateEntries),
      browsers: this._calculateBrowsers(legitimateEntries),
      geography: this._calculateGeography(legitimateEntries),
      timeline: this._calculateTimeline(legitimateEntries),
    };

    return analytics;
  }

  /**
   * Calculate unique visitors
   * @param {Array} entries - Log entries
   * @returns {Object} Visitor metrics
   */
  _calculateVisitors(entries) {
    const uniqueIPs = new Set();
    const uniqueFingerprints = new Set();

    entries.forEach(entry => {
      if (entry.ip) {
        uniqueIPs.add(entry.ip);
      }

      // Create fingerprint from IP + User Agent
      const fingerprint = this._createFingerprint(entry.ip, entry.userAgent);
      uniqueFingerprints.add(fingerprint);
    });

    return {
      byIP: uniqueIPs.size,
      byFingerprint: uniqueFingerprints.size,
      recommended: uniqueFingerprints.size, // More accurate than IP alone
      details: {
        method: 'IP + User-Agent fingerprinting',
        confidence: 'medium',
      },
    };
  }

  /**
   * Calculate impressions (page views)
   * @param {Array} entries - Log entries
   * @returns {Object} Impression metrics
   */
  _calculateImpressions(entries) {
    const pageImpressions = {};
    let totalImpressions = 0;

    entries.forEach(entry => {
      const path = this._normalizePath(entry.path || entry.url);

      if (!pageImpressions[path]) {
        pageImpressions[path] = {
          count: 0,
          uniqueVisitors: new Set(),
        };
      }

      pageImpressions[path].count++;
      totalImpressions++;

      const fingerprint = this._createFingerprint(entry.ip, entry.userAgent);
      pageImpressions[path].uniqueVisitors.add(fingerprint);
    });

    // Convert to array and sort
    const pages = Object.entries(pageImpressions)
      .map(([path, data]) => ({
        path,
        impressions: data.count,
        uniqueVisitors: data.uniqueVisitors.size,
        avgViewsPerVisitor: (data.count / data.uniqueVisitors.size).toFixed(2),
      }))
      .sort((a, b) => b.impressions - a.impressions);

    return {
      total: totalImpressions,
      byPage: pages,
      topPages: pages.slice(0, 10),
    };
  }

  /**
   * Calculate sessions
   * @param {Array} entries - Log entries
   * @returns {Object} Session metrics
   */
  _calculateSessions(entries) {
    // Group by visitor
    const visitorSessions = {};

    entries.forEach(entry => {
      const fingerprint = this._createFingerprint(entry.ip, entry.userAgent);
      const timestamp = new Date(entry.timestamp).getTime();

      if (!visitorSessions[fingerprint]) {
        visitorSessions[fingerprint] = [];
      }

      visitorSessions[fingerprint].push({
        timestamp,
        path: entry.path || entry.url,
      });
    });

    // Calculate sessions (group by 30-minute gaps)
    let totalSessions = 0;
    const sessionDurations = [];
    const pagesPerSession = [];

    Object.values(visitorSessions).forEach(visits => {
      // Sort by timestamp
      visits.sort((a, b) => a.timestamp - b.timestamp);

      let sessionStart = visits[0].timestamp;
      let sessionPages = 1;

      for (let i = 1; i < visits.length; i++) {
        const timeDiff = visits[i].timestamp - visits[i - 1].timestamp;

        if (timeDiff > this.sessionTimeout) {
          // New session
          const duration = visits[i - 1].timestamp - sessionStart;
          sessionDurations.push(duration);
          pagesPerSession.push(sessionPages);
          totalSessions++;

          sessionStart = visits[i].timestamp;
          sessionPages = 1;
        } else {
          sessionPages++;
        }
      }

      // Last session
      const duration = visits[visits.length - 1].timestamp - sessionStart;
      sessionDurations.push(duration);
      pagesPerSession.push(sessionPages);
      totalSessions++;
    });

    return {
      total: totalSessions,
      avgDuration: this._average(sessionDurations),
      avgDurationFormatted: this._formatDuration(this._average(sessionDurations)),
      avgPagesPerSession: this._average(pagesPerSession).toFixed(2),
      bounceRate: this._calculateBounceRate(pagesPerSession),
    };
  }

  /**
   * Calculate page views breakdown
   * @param {Array} entries - Log entries
   * @returns {Object} Page view metrics
   */
  _calculatePageViews(entries) {
    const pages = {};

    entries.forEach(entry => {
      const path = this._normalizePath(entry.path || entry.url);

      if (!pages[path]) {
        pages[path] = {
          views: 0,
          uniqueVisitors: new Set(),
          byHour: Array(24).fill(0),
          byDay: {},
        };
      }

      pages[path].views++;

      const fingerprint = this._createFingerprint(entry.ip, entry.userAgent);
      pages[path].uniqueVisitors.add(fingerprint);

      const date = new Date(entry.timestamp);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];

      pages[path].byHour[hour]++;
      pages[path].byDay[day] = (pages[path].byDay[day] || 0) + 1;
    });

    return Object.entries(pages).map(([path, data]) => ({
      path,
      views: data.views,
      uniqueVisitors: data.uniqueVisitors.size,
      peakHour: data.byHour.indexOf(Math.max(...data.byHour)),
      dailyAverage: this._average(Object.values(data.byDay)).toFixed(2),
    }));
  }

  /**
   * Calculate referrer data
   * @param {Array} entries - Log entries
   * @returns {Object} Referrer metrics
   */
  _calculateReferrers(entries) {
    const referrers = {};

    entries.forEach(entry => {
      const referrer = entry.referer || entry.referrer || 'Direct';
      const hostname = this._extractHostname(referrer);

      if (!referrers[hostname]) {
        referrers[hostname] = {
          count: 0,
          uniqueVisitors: new Set(),
        };
      }

      referrers[hostname].count++;
      const fingerprint = this._createFingerprint(entry.ip, entry.userAgent);
      referrers[hostname].uniqueVisitors.add(fingerprint);
    });

    const sorted = Object.entries(referrers)
      .map(([referrer, data]) => ({
        referrer,
        visits: data.count,
        uniqueVisitors: data.uniqueVisitors.size,
      }))
      .sort((a, b) => b.visits - a.visits);

    return {
      total: sorted.length,
      top: sorted.slice(0, 10),
      all: sorted,
    };
  }

  /**
   * Calculate device breakdown
   * @param {Array} entries - Log entries
   * @returns {Object} Device metrics
   */
  _calculateDevices(entries) {
    const devices = {
      mobile: 0,
      tablet: 0,
      desktop: 0,
      unknown: 0,
    };

    entries.forEach(entry => {
      const ua = (entry.userAgent || '').toLowerCase();
      const deviceType = this._detectDevice(ua);
      devices[deviceType]++;
    });

    const total = entries.length;

    return {
      counts: devices,
      percentages: {
        mobile: ((devices.mobile / total) * 100).toFixed(2),
        tablet: ((devices.tablet / total) * 100).toFixed(2),
        desktop: ((devices.desktop / total) * 100).toFixed(2),
        unknown: ((devices.unknown / total) * 100).toFixed(2),
      },
    };
  }

  /**
   * Calculate browser breakdown
   * @param {Array} entries - Log entries
   * @returns {Object} Browser metrics
   */
  _calculateBrowsers(entries) {
    const browsers = {};

    entries.forEach(entry => {
      const browser = this._detectBrowser(entry.userAgent || '');

      if (!browsers[browser]) {
        browsers[browser] = 0;
      }
      browsers[browser]++;
    });

    const sorted = Object.entries(browsers)
      .map(([browser, count]) => ({
        browser,
        count,
        percentage: ((count / entries.length) * 100).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: sorted.length,
      breakdown: sorted,
      top: sorted.slice(0, 5),
    };
  }

  /**
   * Calculate geography data (if IP geolocation available)
   * @param {Array} entries - Log entries
   * @returns {Object} Geography metrics
   */
  _calculateGeography(entries) {
    const countries = {};
    const cities = {};

    entries.forEach(entry => {
      // This would require IP geolocation service
      // For now, placeholder
      const country = entry.country || 'Unknown';
      const city = entry.city || 'Unknown';

      countries[country] = (countries[country] || 0) + 1;
      cities[city] = (cities[city] || 0) + 1;
    });

    return {
      countries: Object.entries(countries)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      cities: Object.entries(cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Calculate timeline data
   * @param {Array} entries - Log entries
   * @returns {Object} Timeline metrics
   */
  _calculateTimeline(entries) {
    const byDay = {};
    const byHour = Array(24).fill(0);
    const byDayOfWeek = Array(7).fill(0);

    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const day = date.toISOString().split('T')[0];
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      byDay[day] = (byDay[day] || 0) + 1;
      byHour[hour]++;
      byDayOfWeek[dayOfWeek]++;
    });

    return {
      daily: Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      hourly: byHour.map((count, hour) => ({ hour, count })),
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
        (day, index) => ({
          day,
          count: byDayOfWeek[index],
        })
      ),
    };
  }

  /**
   * Helper methods
   */

  _createFingerprint(ip, userAgent) {
    const combined = `${ip || 'unknown'}|${userAgent || 'unknown'}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  _normalizePath(url) {
    if (!url) return '/';
    try {
      const urlObj = new URL(url, 'http://dummy.com');
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  _extractHostname(url) {
    if (!url || url === 'Direct') return 'Direct';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  _detectDevice(userAgent) {
    if (/mobile|android|iphone|ipod|blackberry|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mozilla|chrome|safari|firefox|opera|edge/i.test(userAgent)) {
      return 'desktop';
    }
    return 'unknown';
  }

  _detectBrowser(userAgent) {
    if (/edg/i.test(userAgent)) return 'Edge';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent))
      return 'Safari';
    if (/opera|opr/i.test(userAgent)) return 'Opera';
    if (/msie|trident/i.test(userAgent)) return 'Internet Explorer';
    return 'Unknown';
  }

  _getDateRange(entries) {
    if (entries.length === 0) return null;

    const dates = entries
      .map(e => new Date(e.timestamp))
      .sort((a, b) => a - b);

    return {
      start: dates[0].toISOString(),
      end: dates[dates.length - 1].toISOString(),
      days: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)),
    };
  }

  _average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  _calculateBounceRate(pagesPerSession) {
    const bounces = pagesPerSession.filter(pages => pages === 1).length;
    return ((bounces / pagesPerSession.length) * 100).toFixed(2);
  }
}

module.exports = AnalyticsReconstructor;
