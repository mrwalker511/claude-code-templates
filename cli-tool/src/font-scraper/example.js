/**
 * Font Scraper - Example Usage
 *
 * This example demonstrates how to use the Font Scraper programmatically
 * to verify font usage and generate audit reports.
 */

const FontScraper = require('./FontScraper');
const Reporter = require('./utils/Reporter');
const BotFilter = require('./filters/BotFilter');

// Example configuration
const config = {
  // Your company's website URL
  url: 'https://example.com',

  // Number of years to analyze in Web Archive
  yearsBack: 10,

  // Enable verbose logging
  verbose: true,

  // Output directory for reports
  outputDir: './font-audit-reports',
};

/**
 * Example 1: Quick scan of current website
 */
async function quickScan() {
  console.log('\n🔍 Example 1: Quick Scan\n');

  const scraper = new FontScraper({ verbose: config.verbose });

  try {
    const result = await scraper.scanCurrent(config.url);

    console.log('Current Font Usage:');
    console.log(`  Total fonts: ${result.fonts.summary.total}`);
    console.log(`  Unique fonts: ${result.fonts.summary.uniqueCount}`);
    console.log(`  Web fonts: ${result.fonts.summary.webFonts}`);
    console.log(`  System fonts: ${result.fonts.summary.systemFonts}`);

    console.log('\nMonotype Fonts:');
    if (result.monotype.found.length > 0) {
      result.monotype.found.forEach(font => {
        console.log(`  ✓ ${font.font} - ${font.instances} instances`);
      });
    } else {
      console.log('  ✓ No Monotype fonts detected');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 2: Historical analysis
 */
async function historicalAnalysis() {
  console.log('\n📚 Example 2: Historical Analysis\n');

  const scraper = new FontScraper({
    verbose: config.verbose,
    yearsBack: config.yearsBack,
  });

  try {
    const result = await scraper.scanHistorical(config.url);

    console.log(`Historical Analysis (${result.yearsAnalyzed} years):`);
    console.log(`  Snapshots analyzed: ${result.snapshots.length}`);

    console.log('\nMonotype Usage Timeline:');
    result.timeline.monotypeHistory.forEach(year => {
      if (year.monotypefontsUsed > 0) {
        console.log(`  ${year.year}: ${year.monotypefontsUsed} fonts - ${year.fonts.join(', ')}`);
      } else {
        console.log(`  ${year.year}: None detected`);
      }
    });

    // Analyze font changes
    if (result.timeline.fontChanges.length > 0) {
      console.log('\nMajor Font Changes:');
      result.timeline.fontChanges.forEach(change => {
        console.log(`  ${change.fromYear} → ${change.toYear}:`);
        console.log(`    Added: ${change.summary.added}`);
        console.log(`    Removed: ${change.summary.removed}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 3: Full audit with analytics
 */
async function fullAuditWithAnalytics() {
  console.log('\n📊 Example 3: Full Audit with Analytics\n');

  // Example log data (replace with your actual log data)
  const sampleLogs = [
    {
      timestamp: '2024-01-15T10:30:00Z',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      path: '/',
      referer: 'https://google.com',
    },
    {
      timestamp: '2024-01-15T10:31:00Z',
      ip: '66.249.64.1',
      userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      path: '/about',
      referer: null,
    },
    // Add more log entries...
  ];

  const scraper = new FontScraper({
    verbose: config.verbose,
    yearsBack: config.yearsBack,
  });

  try {
    const audit = await scraper.fullAudit(config.url, sampleLogs);

    // Generate comprehensive report
    const reporter = new Reporter({ outputDir: config.outputDir });
    const report = await reporter.generateReport(audit);

    console.log('Audit Complete!');
    console.log(`\nReports generated in: ${report.reportDir}`);
    console.log('\nFiles created:');
    Object.entries(report.files).forEach(([type, file]) => {
      if (file) console.log(`  • ${type}: ${file}`);
    });

    // Display key findings
    console.log('\nKey Findings:');
    audit.findings.evidence.forEach(evidence => {
      console.log(`  [${evidence.severity}] ${evidence.message}`);
    });

    if (audit.findings.recommendations.length > 0) {
      console.log('\nRecommendations:');
      audit.findings.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.recommendation}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 4: Bot filtering for analytics
 */
async function botFilteringExample() {
  console.log('\n🤖 Example 4: Bot Filtering\n');

  const botFilter = new BotFilter();

  // Example log entries
  const logs = [
    {
      timestamp: '2024-01-15T10:00:00Z',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      path: '/',
    },
    {
      timestamp: '2024-01-15T10:01:00Z',
      ip: '66.249.64.1',
      userAgent: 'Googlebot/2.1',
      path: '/sitemap.xml',
    },
    {
      timestamp: '2024-01-15T10:02:00Z',
      ip: '192.168.1.2',
      userAgent: 'curl/7.68.0',
      path: '/api/data',
    },
  ];

  const filtered = botFilter.filterLogs(logs);

  console.log('Bot Filtering Results:');
  console.log(`  Total entries: ${filtered.total}`);
  console.log(`  Legitimate traffic: ${filtered.legitimate.length}`);
  console.log(`  Bots detected: ${filtered.bots.length}`);
  console.log(`  Bot percentage: ${filtered.stats.botPercentage}%`);

  console.log('\nDetection Methods:');
  Object.entries(filtered.stats.detectionMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });

  console.log('\nLegitimate Requests:');
  filtered.legitimate.forEach(entry => {
    console.log(`  ${entry.timestamp} - ${entry.path}`);
  });

  console.log('\nBlocked Bots:');
  filtered.bots.forEach(bot => {
    console.log(`  ${bot.userAgent.substring(0, 50)}... - ${bot.botDetection.method}`);
  });
}

/**
 * Example 5: Monotype-specific verification
 */
async function monotypeVerification() {
  console.log('\n🏢 Example 5: Monotype Font Verification\n');
  console.log('Purpose: Generate evidence to verify or dispute Monotype licensing claims\n');

  const scraper = new FontScraper({ verbose: config.verbose, yearsBack: 10 });

  try {
    // Run full audit
    const audit = await scraper.fullAudit(config.url);

    // Analyze Monotype usage
    console.log('Current Monotype Usage:');
    if (audit.current?.monotype) {
      const mono = audit.current.monotype;
      console.log(`  Fonts found: ${mono.found.length}`);
      console.log(`  Fonts checked: ${mono.summary.totalMonotypeChecked}`);

      if (mono.found.length > 0) {
        console.log('\n  Detected Monotype Fonts:');
        mono.found.forEach(font => {
          console.log(`    • ${font.font} (${font.instances} instances)`);
        });
      } else {
        console.log('  ✓ No Monotype fonts currently in use');
      }
    }

    // Historical Monotype usage
    console.log('\nHistorical Monotype Usage (10 years):');
    if (audit.historical?.timeline) {
      const history = audit.historical.timeline.monotypeHistory;

      const yearsWithMonotype = history.filter(y => y.monotypefontsUsed > 0).length;
      const yearsWithoutMonotype = history.filter(y => y.monotypefontsUsed === 0).length;

      console.log(`  Years with Monotype: ${yearsWithMonotype}`);
      console.log(`  Years without Monotype: ${yearsWithoutMonotype}`);
      console.log(`  Coverage: ${((yearsWithoutMonotype / history.length) * 100).toFixed(1)}% of years had no Monotype fonts`);
    }

    // Generate evidence report
    const reporter = new Reporter({ outputDir: config.outputDir });
    const report = await reporter.generateReport(audit, {
      json: true,
      csv: true,
      summary: true,
      evidence: true,
    });

    console.log(`\n✓ Evidence package created: ${report.reportDir}`);
    console.log('\nUse these files to:');
    console.log('  • Verify Monotype billing accuracy');
    console.log('  • Dispute incorrect usage claims');
    console.log('  • Negotiate license terms based on actual usage');
    console.log('  • Demonstrate historical font usage patterns');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('         Font Scraper - Usage Examples');
  console.log('═══════════════════════════════════════════════════════════');

  // Uncomment the examples you want to run:

  // await quickScan();
  // await historicalAnalysis();
  // await fullAuditWithAnalytics();
  // await botFilteringExample();
  await monotypeVerification();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Examples complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run examples if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  quickScan,
  historicalAnalysis,
  fullAuditWithAnalytics,
  botFilteringExample,
  monotypeVerification,
};
