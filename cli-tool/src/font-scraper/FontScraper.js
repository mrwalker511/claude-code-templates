/**
 * FontScraper - Main orchestrator for font verification and analytics
 * Provides auditable evidence for font usage verification
 * Can be used to verify or dispute font licensing claims (e.g., Monotype)
 */

const FontDetector = require('./detectors/FontDetector');
const WaybackFetcher = require('./archive/WaybackFetcher');
const BotFilter = require('./filters/BotFilter');
const AnalyticsReconstructor = require('./analytics/AnalyticsReconstructor');

class FontScraper {
  constructor(options = {}) {
    this.fontDetector = new FontDetector();
    this.waybackFetcher = new WaybackFetcher(options.wayback || {});
    this.botFilter = new BotFilter();
    this.analyticsReconstructor = new AnalyticsReconstructor(this.botFilter);

    this.verbose = options.verbose || false;
    this.yearsBack = options.yearsBack || 10;

    // Monotype font families (for specific tracking)
    this.monotypefonts = [
      'Helvetica',
      'Helvetica Neue',
      'Arial',
      'Times New Roman',
      'Courier New',
      'Verdana',
      'Georgia',
      'Impact',
      'Comic Sans MS',
      'Trebuchet MS',
      'Webdings',
      'Wingdings',
    ];
  }

  /**
   * Scan current website for fonts
   * @param {string} url - URL to scan
   * @returns {Promise<Object>} Scan results
   */
  async scanCurrent(url) {
    this._log(`Scanning current site: ${url}`);

    try {
      // Fetch current page
      const html = await this._fetchPage(url);

      // Extract fonts
      const fontAnalysis = this.fontDetector.extractFromHTML(html);

      // Fetch and analyze CSS files
      const cssResults = await this._analyzeCSS(fontAnalysis.cssLinks, url);

      // Combine results
      const allFonts = [
        ...fontAnalysis.inlineStyles,
        ...cssResults.fonts,
      ];

      // Create summary
      const summary = this.fontDetector.createSummary(allFonts);

      // Identify Monotype fonts specifically
      const monotypeUsage = this._identifyMonotypeFonts(allFonts);

      return {
        url,
        timestamp: new Date().toISOString(),
        fonts: {
          all: allFonts,
          summary,
          services: fontAnalysis.fontServices,
        },
        monotype: monotypeUsage,
        evidence: {
          cssFiles: cssResults.files,
          inlineStyles: fontAnalysis.inlineStyles.length > 0,
          fontServiceLinks: fontAnalysis.fontServices,
        },
      };
    } catch (error) {
      this._log(`Error scanning ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scan historical snapshots from Web Archive
   * @param {string} url - URL to scan
   * @returns {Promise<Object>} Historical scan results
   */
  async scanHistorical(url) {
    this._log(`Scanning historical snapshots for: ${url}`);

    try {
      // Get yearly snapshots
      const snapshots = await this.waybackFetcher.getYearlySnapshots(
        url,
        this.yearsBack
      );

      this._log(`Found ${snapshots.length} historical snapshots`);

      const results = [];

      // Analyze each snapshot
      for (const snapshot of snapshots) {
        this._log(`Analyzing snapshot from ${snapshot.year}...`);

        try {
          const snapshotData = await this.waybackFetcher.fetchSnapshot(snapshot);
          const fontAnalysis = this.fontDetector.extractFromHTML(snapshotData.content);

          const allFonts = fontAnalysis.inlineStyles;
          const summary = this.fontDetector.createSummary(allFonts);
          const monotypeUsage = this._identifyMonotypeFonts(allFonts);

          results.push({
            year: snapshot.year,
            date: snapshot.date,
            archiveUrl: snapshot.archiveUrl,
            fonts: {
              all: allFonts,
              summary,
            },
            monotype: monotypeUsage,
          });
        } catch (error) {
          this._log(`Error analyzing snapshot from ${snapshot.year}: ${error.message}`);
          results.push({
            year: snapshot.year,
            error: error.message,
          });
        }
      }

      return {
        url,
        yearsAnalyzed: this.yearsBack,
        snapshots: results,
        timeline: this._createTimeline(results),
      };
    } catch (error) {
      this._log(`Error scanning historical data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Full audit: Current + Historical + Analytics
   * @param {string} url - URL to audit
   * @param {Array} logData - Optional log data for analytics
   * @returns {Promise<Object>} Complete audit report
   */
  async fullAudit(url, logData = null) {
    this._log(`Starting full audit for: ${url}`);

    const audit = {
      url,
      auditDate: new Date().toISOString(),
      current: null,
      historical: null,
      analytics: null,
      findings: {
        monotypeUsage: {},
        evidence: [],
        recommendations: [],
      },
    };

    // Scan current site
    try {
      audit.current = await this.scanCurrent(url);
    } catch (error) {
      audit.current = { error: error.message };
    }

    // Scan historical
    try {
      audit.historical = await this.scanHistorical(url);
    } catch (error) {
      audit.historical = { error: error.message };
    }

    // Process analytics if log data provided
    if (logData && logData.length > 0) {
      this._log(`Processing ${logData.length} log entries...`);
      audit.analytics = this.analyticsReconstructor.processLogs(logData);
    }

    // Generate findings and evidence
    audit.findings = this._generateFindings(audit);

    return audit;
  }

  /**
   * Identify Monotype fonts in font list
   * @param {Array} fonts - Font list
   * @returns {Object} Monotype usage analysis
   */
  _identifyMonotypeFonts(fonts) {
    const found = [];
    const notFound = [];

    this.monotypefonts.forEach(monotypeFont => {
      const usage = fonts.filter(font =>
        font.family &&
        font.family.toLowerCase().includes(monotypeFont.toLowerCase())
      );

      if (usage.length > 0) {
        found.push({
          font: monotypeFont,
          instances: usage.length,
          details: usage,
        });
      } else {
        notFound.push(monotypeFont);
      }
    });

    return {
      found,
      notFound,
      summary: {
        monotypefontsUsed: found.length,
        monotypefontsNotUsed: notFound.length,
        totalMonotypeChecked: this.monotypefonts.length,
      },
    };
  }

  /**
   * Create timeline of font usage changes
   * @param {Array} results - Historical results
   * @returns {Object} Timeline analysis
   */
  _createTimeline(results) {
    const timeline = {
      years: [],
      fontChanges: [],
      monotypeHistory: [],
    };

    results.forEach((result, index) => {
      if (result.error) return;

      timeline.years.push({
        year: result.year,
        totalFonts: result.fonts?.summary?.total || 0,
        uniqueFonts: result.fonts?.summary?.uniqueCount || 0,
        webFonts: result.fonts?.summary?.webFonts || 0,
        systemFonts: result.fonts?.summary?.systemFonts || 0,
      });

      // Track Monotype usage over time
      timeline.monotypeHistory.push({
        year: result.year,
        monotypefontsUsed: result.monotype?.found?.length || 0,
        fonts: result.monotype?.found?.map(f => f.font) || [],
      });

      // Detect changes from previous year
      if (index > 0) {
        const prevResult = results[index - 1];
        if (!prevResult.error) {
          const changes = this._detectChanges(
            prevResult.fonts?.all || [],
            result.fonts?.all || []
          );
          if (changes.added.length > 0 || changes.removed.length > 0) {
            timeline.fontChanges.push({
              fromYear: prevResult.year,
              toYear: result.year,
              ...changes,
            });
          }
        }
      }
    });

    return timeline;
  }

  /**
   * Detect changes between two font lists
   * @param {Array} oldFonts - Previous font list
   * @param {Array} newFonts - Current font list
   * @returns {Object} Changes detected
   */
  _detectChanges(oldFonts, newFonts) {
    const oldFamilies = new Set(oldFonts.map(f => f.family));
    const newFamilies = new Set(newFonts.map(f => f.family));

    const added = Array.from(newFamilies).filter(f => !oldFamilies.has(f));
    const removed = Array.from(oldFamilies).filter(f => !newFamilies.has(f));
    const unchanged = Array.from(newFamilies).filter(f => oldFamilies.has(f));

    return {
      added,
      removed,
      unchanged,
      summary: {
        added: added.length,
        removed: removed.length,
        unchanged: unchanged.length,
      },
    };
  }

  /**
   * Generate findings and recommendations for audit
   * @param {Object} audit - Audit data
   * @returns {Object} Findings
   */
  _generateFindings(audit) {
    const findings = {
      monotypeUsage: {
        current: null,
        historical: [],
        disputed: [],
      },
      evidence: [],
      recommendations: [],
    };

    // Current Monotype usage
    if (audit.current && !audit.current.error) {
      findings.monotypeUsage.current = audit.current.monotype;

      if (audit.current.monotype.found.length === 0) {
        findings.evidence.push({
          type: 'NO_MONOTYPE_CURRENT',
          severity: 'HIGH',
          message: 'No Monotype fonts detected on current website',
          timestamp: audit.current.timestamp,
        });
      }
    }

    // Historical Monotype usage
    if (audit.historical && !audit.historical.error) {
      audit.historical.snapshots.forEach(snapshot => {
        if (!snapshot.error && snapshot.monotype) {
          findings.monotypeUsage.historical.push({
            year: snapshot.year,
            date: snapshot.date,
            usage: snapshot.monotype,
          });

          if (snapshot.monotype.found.length === 0) {
            findings.evidence.push({
              type: 'NO_MONOTYPE_HISTORICAL',
              severity: 'MEDIUM',
              message: `No Monotype fonts detected in ${snapshot.year}`,
              year: snapshot.year,
              archiveUrl: snapshot.archiveUrl,
            });
          }
        }
      });
    }

    // Analytics evidence
    if (audit.analytics) {
      findings.evidence.push({
        type: 'ANALYTICS_DATA',
        severity: 'INFO',
        message: `Analyzed ${audit.analytics.overview.totalRequests} requests`,
        uniqueVisitors: audit.analytics.visitors.recommended,
        impressions: audit.analytics.impressions.total,
        botsFiltered: audit.analytics.overview.totalBots,
      });
    }

    // Generate recommendations
    if (findings.monotypeUsage.current?.found.length === 0) {
      findings.recommendations.push({
        priority: 'HIGH',
        recommendation: 'Current site shows no Monotype font usage. If billed for Monotype licenses, request detailed usage evidence.',
      });
    }

    const historicalWithMonotype = findings.monotypeUsage.historical.filter(
      h => h.usage.found.length > 0
    ).length;

    if (historicalWithMonotype < findings.monotypeUsage.historical.length / 2) {
      findings.recommendations.push({
        priority: 'MEDIUM',
        recommendation: `Monotype fonts found in less than half of historical snapshots. Consider negotiating based on actual usage periods.`,
      });
    }

    return findings;
  }

  /**
   * Analyze CSS files
   * @param {Array} cssUrls - CSS file URLs
   * @param {string} baseUrl - Base URL for relative paths
   * @returns {Promise<Object>} CSS analysis
   */
  async _analyzeCSS(cssUrls, baseUrl) {
    const results = {
      files: [],
      fonts: [],
    };

    for (const cssUrl of cssUrls) {
      try {
        const fullUrl = this._resolveUrl(cssUrl, baseUrl);
        const css = await this._fetchPage(fullUrl);
        const fonts = this.fontDetector.extractFromCSS(css);

        results.files.push({
          url: fullUrl,
          fontCount: fonts.length,
          fonts,
        });

        results.fonts.push(...fonts);
      } catch (error) {
        this._log(`Error fetching CSS ${cssUrl}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Fetch page content
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} Page content
   */
  async _fetchPage(url) {
    const protocol = url.startsWith('https:') ? require('https') : require('http');

    return new Promise((resolve, reject) => {
      protocol.get(url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      }).on('error', reject);
    });
  }

  /**
   * Resolve relative URL
   * @param {string} url - URL (may be relative)
   * @param {string} base - Base URL
   * @returns {string} Absolute URL
   */
  _resolveUrl(url, base) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    try {
      const baseUrl = new URL(base);
      return new URL(url, baseUrl.origin).href;
    } catch {
      return url;
    }
  }

  /**
   * Log message if verbose
   * @param {string} message - Message to log
   */
  _log(message) {
    if (this.verbose) {
      console.log(`[FontScraper] ${message}`);
    }
  }
}

module.exports = FontScraper;
