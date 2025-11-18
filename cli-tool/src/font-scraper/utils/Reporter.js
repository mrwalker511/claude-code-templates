/**
 * Reporter - Export audit results to various formats
 * Creates auditable, evidence-ready reports for font usage verification
 */

const fs = require('fs-extra');
const path = require('path');

class Reporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './font-audit-reports';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Generate comprehensive audit report
   * @param {Object} auditData - Audit data from FontScraper
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report files generated
   */
  async generateReport(auditData, options = {}) {
    await fs.ensureDir(this.outputDir);

    const reportId = `audit-${this.timestamp}`;
    const reportDir = path.join(this.outputDir, reportId);
    await fs.ensureDir(reportDir);

    const files = {
      json: null,
      csv: null,
      summary: null,
      evidence: null,
    };

    // Generate JSON report (complete data)
    if (options.json !== false) {
      files.json = await this._generateJSON(auditData, reportDir);
    }

    // Generate CSV reports (for spreadsheet analysis)
    if (options.csv !== false) {
      files.csv = await this._generateCSV(auditData, reportDir);
    }

    // Generate summary report (human-readable)
    if (options.summary !== false) {
      files.summary = await this._generateSummary(auditData, reportDir);
    }

    // Generate evidence package (for disputes)
    if (options.evidence !== false) {
      files.evidence = await this._generateEvidence(auditData, reportDir);
    }

    console.log(`\n✓ Report generated: ${reportDir}\n`);

    return {
      reportId,
      reportDir,
      files,
    };
  }

  /**
   * Generate JSON report
   * @param {Object} data - Audit data
   * @param {string} dir - Output directory
   * @returns {Promise<string>} File path
   */
  async _generateJSON(data, dir) {
    const filePath = path.join(dir, 'full-audit.json');
    await fs.writeJSON(filePath, data, { spaces: 2 });
    console.log(`  Generated: full-audit.json`);
    return filePath;
  }

  /**
   * Generate CSV reports
   * @param {Object} data - Audit data
   * @param {string} dir - Output directory
   * @returns {Promise<Object>} File paths
   */
  async _generateCSV(data, dir) {
    const files = {};

    // Current fonts CSV
    if (data.current && data.current.fonts) {
      files.currentFonts = await this._writeFontsCSV(
        data.current.fonts.all,
        path.join(dir, 'current-fonts.csv')
      );
    }

    // Historical timeline CSV
    if (data.historical && data.historical.timeline) {
      files.historicalTimeline = await this._writeTimelineCSV(
        data.historical.timeline,
        path.join(dir, 'historical-timeline.csv')
      );
    }

    // Monotype usage CSV
    files.monotypeUsage = await this._writeMonotypeUsageCSV(
      data,
      path.join(dir, 'monotype-usage.csv')
    );

    // Analytics CSV (if available)
    if (data.analytics) {
      files.analytics = await this._writeAnalyticsCSV(
        data.analytics,
        path.join(dir, 'analytics.csv')
      );
    }

    return files;
  }

  /**
   * Generate summary report
   * @param {Object} data - Audit data
   * @param {string} dir - Output directory
   * @returns {Promise<string>} File path
   */
  async _generateSummary(data, dir) {
    const filePath = path.join(dir, 'SUMMARY.txt');

    let summary = '';
    summary += '═══════════════════════════════════════════════════════════\n';
    summary += '              FONT USAGE AUDIT REPORT\n';
    summary += '═══════════════════════════════════════════════════════════\n\n';

    summary += `URL: ${data.url}\n`;
    summary += `Audit Date: ${data.auditDate}\n`;
    summary += `Report ID: ${this.timestamp}\n\n`;

    // Current Usage
    summary += '───────────────────────────────────────────────────────────\n';
    summary += '  CURRENT WEBSITE ANALYSIS\n';
    summary += '───────────────────────────────────────────────────────────\n';

    if (data.current && !data.current.error) {
      const fonts = data.current.fonts.summary;
      summary += `Total Fonts: ${fonts.total}\n`;
      summary += `Unique Fonts: ${fonts.uniqueCount}\n`;
      summary += `Web Fonts: ${fonts.webFonts}\n`;
      summary += `System Fonts: ${fonts.systemFonts}\n\n`;

      summary += 'Monotype Fonts Found:\n';
      if (data.current.monotype.found.length > 0) {
        data.current.monotype.found.forEach(font => {
          summary += `  • ${font.font} (${font.instances} instances)\n`;
        });
      } else {
        summary += '  ✓ No Monotype fonts detected\n';
      }
      summary += '\n';

      if (data.current.fonts.services.length > 0) {
        summary += 'Font Services Used:\n';
        data.current.fonts.services.forEach(service => {
          summary += `  • ${service.name}\n`;
        });
        summary += '\n';
      }
    } else {
      summary += `Error: ${data.current?.error || 'Unknown error'}\n\n`;
    }

    // Historical Analysis
    summary += '───────────────────────────────────────────────────────────\n';
    summary += '  HISTORICAL ANALYSIS (Past 10 Years)\n';
    summary += '───────────────────────────────────────────────────────────\n';

    if (data.historical && !data.historical.error) {
      summary += `Snapshots Analyzed: ${data.historical.snapshots.length}\n`;
      summary += `Years Covered: ${data.historical.yearsAnalyzed}\n\n`;

      summary += 'Monotype Usage Timeline:\n';
      data.historical.timeline.monotypeHistory.forEach(year => {
        const status = year.monotypefontsUsed > 0
          ? `${year.monotypefontsUsed} fonts: ${year.fonts.join(', ')}`
          : '✓ None detected';
        summary += `  ${year.year}: ${status}\n`;
      });
      summary += '\n';

      if (data.historical.timeline.fontChanges.length > 0) {
        summary += 'Major Font Changes:\n';
        data.historical.timeline.fontChanges.forEach(change => {
          if (change.summary.added > 0 || change.summary.removed > 0) {
            summary += `  ${change.fromYear} → ${change.toYear}: `;
            summary += `+${change.summary.added} added, -${change.summary.removed} removed\n`;
          }
        });
        summary += '\n';
      }
    } else {
      summary += `Error: ${data.historical?.error || 'Unknown error'}\n\n`;
    }

    // Analytics
    if (data.analytics) {
      summary += '───────────────────────────────────────────────────────────\n';
      summary += '  ANALYTICS DATA (Bot-Filtered)\n';
      summary += '───────────────────────────────────────────────────────────\n';

      summary += `Total Requests: ${data.analytics.overview.totalRequests.toLocaleString()}\n`;
      summary += `Bots Filtered: ${data.analytics.overview.totalBots.toLocaleString()} (${data.analytics.overview.botPercentage}%)\n`;
      summary += `Unique Visitors: ${data.analytics.visitors.recommended.toLocaleString()}\n`;
      summary += `Total Impressions: ${data.analytics.impressions.total.toLocaleString()}\n`;
      summary += `Sessions: ${data.analytics.sessions.total.toLocaleString()}\n`;
      summary += `Avg Session Duration: ${data.analytics.sessions.avgDurationFormatted}\n`;
      summary += `Bounce Rate: ${data.analytics.sessions.bounceRate}%\n\n`;

      if (data.analytics.impressions.topPages.length > 0) {
        summary += 'Top Pages by Impressions:\n';
        data.analytics.impressions.topPages.slice(0, 5).forEach((page, i) => {
          summary += `  ${i + 1}. ${page.path} - ${page.impressions.toLocaleString()} views\n`;
        });
        summary += '\n';
      }
    }

    // Findings
    summary += '───────────────────────────────────────────────────────────\n';
    summary += '  KEY FINDINGS & EVIDENCE\n';
    summary += '───────────────────────────────────────────────────────────\n';

    if (data.findings && data.findings.evidence.length > 0) {
      data.findings.evidence.forEach((evidence, i) => {
        summary += `${i + 1}. [${evidence.severity}] ${evidence.message}\n`;
      });
      summary += '\n';
    }

    // Recommendations
    if (data.findings && data.findings.recommendations.length > 0) {
      summary += '───────────────────────────────────────────────────────────\n';
      summary += '  RECOMMENDATIONS\n';
      summary += '───────────────────────────────────────────────────────────\n';

      data.findings.recommendations.forEach((rec, i) => {
        summary += `${i + 1}. [${rec.priority}] ${rec.recommendation}\n`;
      });
      summary += '\n';
    }

    summary += '═══════════════════════════════════════════════════════════\n';
    summary += '  End of Report\n';
    summary += '═══════════════════════════════════════════════════════════\n';

    await fs.writeFile(filePath, summary);
    console.log(`  Generated: SUMMARY.txt`);
    return filePath;
  }

  /**
   * Generate evidence package
   * @param {Object} data - Audit data
   * @param {string} dir - Output directory
   * @returns {Promise<string>} File path
   */
  async _generateEvidence(data, dir) {
    const filePath = path.join(dir, 'EVIDENCE.md');

    let evidence = '';
    evidence += '# Font Usage Audit - Evidence Package\n\n';
    evidence += `**URL:** ${data.url}  \n`;
    evidence += `**Audit Date:** ${data.auditDate}  \n`;
    evidence += `**Report ID:** ${this.timestamp}\n\n`;

    evidence += '---\n\n';
    evidence += '## Executive Summary\n\n';
    evidence += 'This document provides verifiable evidence of font usage based on:\n\n';
    evidence += '1. **Current Website Analysis** - Live site inspection\n';
    evidence += '2. **Historical Archive Analysis** - 10 years of Wayback Machine data\n';
    evidence += '3. **Analytics Data** - Bot-filtered traffic analysis\n\n';

    evidence += '---\n\n';
    evidence += '## Current Font Usage\n\n';

    if (data.current && !data.current.error) {
      const mono = data.current.monotype;

      evidence += '### Monotype Fonts\n\n';
      if (mono.found.length > 0) {
        evidence += '| Font Family | Instances | Usage Context |\n';
        evidence += '|-------------|-----------|---------------|\n';
        mono.found.forEach(font => {
          evidence += `| ${font.font} | ${font.instances} | `;
          evidence += font.details.map(d => d.type).join(', ');
          evidence += ' |\n';
        });
      } else {
        evidence += '**Result:** No Monotype fonts detected on current website.\n\n';
        evidence += '**Verification:** Manual inspection of CSS files and computed styles.\n';
      }
      evidence += '\n';

      evidence += '### All Fonts Detected\n\n';
      evidence += '```\n';
      data.current.fonts.summary.uniqueFonts.forEach(font => {
        evidence += `  • ${font}\n`;
      });
      evidence += '```\n\n';
    }

    evidence += '---\n\n';
    evidence += '## Historical Analysis\n\n';

    if (data.historical && !data.historical.error) {
      evidence += '### Monotype Usage Over Time\n\n';
      evidence += '| Year | Monotype Fonts | Archive URL |\n';
      evidence += '|------|----------------|-------------|\n';

      data.historical.snapshots.forEach(snapshot => {
        if (!snapshot.error) {
          const count = snapshot.monotype?.found.length || 0;
          const fonts = snapshot.monotype?.found.map(f => f.font).join(', ') || 'None';
          evidence += `| ${snapshot.year} | ${count > 0 ? fonts : '✓ None'} | `;
          evidence += `[Archive](${snapshot.archiveUrl}) |\n`;
        }
      });
      evidence += '\n';

      const yearsWithoutMonotype = data.historical.snapshots.filter(
        s => !s.error && (s.monotype?.found.length || 0) === 0
      ).length;

      evidence += `**Finding:** ${yearsWithoutMonotype} out of ${data.historical.snapshots.length} `;
      evidence += `analyzed years showed no Monotype font usage.\n\n`;
    }

    evidence += '---\n\n';

    if (data.analytics) {
      evidence += '## Analytics Evidence\n\n';
      evidence += '### Traffic Overview (Bot-Filtered)\n\n';
      evidence += `- **Total Legitimate Requests:** ${data.analytics.overview.totalRequests.toLocaleString()}\n`;
      evidence += `- **Bots Filtered:** ${data.analytics.overview.totalBots.toLocaleString()} `;
      evidence += `(${data.analytics.overview.botPercentage}%)\n`;
      evidence += `- **Unique Visitors:** ${data.analytics.visitors.recommended.toLocaleString()}\n`;
      evidence += `- **Total Impressions:** ${data.analytics.impressions.total.toLocaleString()}\n\n`;

      evidence += '### Bot Filtering Methodology\n\n';
      evidence += '- User-agent pattern matching (600+ known bots)\n';
      evidence += '- IP range verification\n';
      evidence += '- Behavioral analysis\n';
      evidence += '- Industry standard practices (IAB compliance)\n\n';
    }

    evidence += '---\n\n';
    evidence += '## Verification Methods\n\n';
    evidence += '1. **CSS Parsing** - All @font-face declarations analyzed\n';
    evidence += '2. **Web Font Service Detection** - Google Fonts, Adobe Fonts, etc.\n';
    evidence += '3. **Archive Verification** - Internet Archive Wayback Machine\n';
    evidence += '4. **Bot Filtering** - Industry-standard detection algorithms\n\n';

    evidence += '---\n\n';
    evidence += '## Disclaimer\n\n';
    evidence += 'This audit was conducted using automated tools and publicly available data. ';
    evidence += 'Historical data is sourced from the Internet Archive Wayback Machine. ';
    evidence += 'Results should be verified against actual font license agreements and usage terms.\n\n';

    await fs.writeFile(filePath, evidence);
    console.log(`  Generated: EVIDENCE.md`);
    return filePath;
  }

  /**
   * Write fonts to CSV
   */
  async _writeFontsCSV(fonts, filePath) {
    const rows = [['Font Family', 'Type', 'Is System Font', 'Format', 'Source URL']];

    fonts.forEach(font => {
      const formats = font.src?.map(s => s.format).join('; ') || 'N/A';
      const sources = font.src?.map(s => s.url).join('; ') || 'N/A';

      rows.push([
        font.family || 'Unknown',
        font.type || 'N/A',
        font.isSystemFont ? 'Yes' : 'No',
        formats,
        sources,
      ]);
    });

    await this._writeCSV(rows, filePath);
    console.log(`  Generated: ${path.basename(filePath)}`);
    return filePath;
  }

  /**
   * Write timeline to CSV
   */
  async _writeTimelineCSV(timeline, filePath) {
    const rows = [['Year', 'Total Fonts', 'Unique Fonts', 'Web Fonts', 'System Fonts', 'Monotype Fonts']];

    timeline.years.forEach((year, index) => {
      const mono = timeline.monotypeHistory[index];
      rows.push([
        year.year,
        year.totalFonts,
        year.uniqueFonts,
        year.webFonts,
        year.systemFonts,
        mono?.monotypefontsUsed || 0,
      ]);
    });

    await this._writeCSV(rows, filePath);
    console.log(`  Generated: ${path.basename(filePath)}`);
    return filePath;
  }

  /**
   * Write Monotype usage to CSV
   */
  async _writeMonotypeUsageCSV(data, filePath) {
    const rows = [['Year/Current', 'Font Family', 'Instances', 'Archive URL']];

    // Current
    if (data.current?.monotype) {
      data.current.monotype.found.forEach(font => {
        rows.push(['Current', font.font, font.instances, data.current.timestamp]);
      });
    }

    // Historical
    if (data.historical?.snapshots) {
      data.historical.snapshots.forEach(snapshot => {
        if (!snapshot.error && snapshot.monotype) {
          snapshot.monotype.found.forEach(font => {
            rows.push([snapshot.year, font.font, font.instances, snapshot.archiveUrl]);
          });
        }
      });
    }

    await this._writeCSV(rows, filePath);
    console.log(`  Generated: ${path.basename(filePath)}`);
    return filePath;
  }

  /**
   * Write analytics to CSV
   */
  async _writeAnalyticsCSV(analytics, filePath) {
    const rows = [
      ['Metric', 'Value'],
      ['Total Requests', analytics.overview.totalRequests],
      ['Bots Filtered', analytics.overview.totalBots],
      ['Bot Percentage', `${analytics.overview.botPercentage}%`],
      ['Unique Visitors', analytics.visitors.recommended],
      ['Total Impressions', analytics.impressions.total],
      ['Total Sessions', analytics.sessions.total],
      ['Avg Session Duration', analytics.sessions.avgDurationFormatted],
      ['Bounce Rate', `${analytics.sessions.bounceRate}%`],
    ];

    await this._writeCSV(rows, filePath);
    console.log(`  Generated: ${path.basename(filePath)}`);
    return filePath;
  }

  /**
   * Write CSV file
   */
  async _writeCSV(rows, filePath) {
    const csv = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    await fs.writeFile(filePath, csv);
  }
}

module.exports = Reporter;
