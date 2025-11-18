#!/usr/bin/env node

/**
 * Font Scraper CLI
 * Command-line interface for font verification and analytics
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');

const FontScraper = require('./FontScraper');
const Reporter = require('./utils/Reporter');

const program = new Command();

program
  .name('font-scraper')
  .description('Verify font usage and generate audit reports for licensing verification')
  .version('1.0.0');

// Scan current website
program
  .command('scan')
  .description('Scan current website for fonts')
  .argument('<url>', 'URL to scan')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <dir>', 'Output directory', './font-audit-reports')
  .action(async (url, options) => {
    const spinner = ora('Scanning website...').start();

    try {
      const scraper = new FontScraper({ verbose: options.verbose });
      const result = await scraper.scanCurrent(url);

      spinner.succeed('Scan complete');

      console.log(chalk.cyan('\n📊 Font Summary:'));
      console.log(`  Total Fonts: ${result.fonts.summary.total}`);
      console.log(`  Unique Fonts: ${result.fonts.summary.uniqueCount}`);
      console.log(`  Web Fonts: ${result.fonts.summary.webFonts}`);
      console.log(`  System Fonts: ${result.fonts.summary.systemFonts}`);

      console.log(chalk.yellow('\n🏢 Monotype Fonts:'));
      if (result.monotype.found.length > 0) {
        result.monotype.found.forEach(font => {
          console.log(`  ✓ ${font.font} (${font.instances} instances)`);
        });
      } else {
        console.log(chalk.green('  ✓ No Monotype fonts detected'));
      }

      // Save results
      const reporter = new Reporter({ outputDir: options.output });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = `${options.output}/scan-${timestamp}.json`;
      await fs.ensureDir(options.output);
      await fs.writeJSON(outputFile, result, { spaces: 2 });

      console.log(chalk.gray(`\n📁 Results saved to: ${outputFile}\n`));
    } catch (error) {
      spinner.fail('Scan failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Scan historical snapshots
program
  .command('history')
  .description('Scan historical snapshots from Web Archive')
  .argument('<url>', 'URL to scan')
  .option('-y, --years <number>', 'Number of years to go back', '10')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <dir>', 'Output directory', './font-audit-reports')
  .action(async (url, options) => {
    const spinner = ora('Fetching historical snapshots...').start();

    try {
      const scraper = new FontScraper({
        verbose: options.verbose,
        yearsBack: parseInt(options.years),
      });

      const result = await scraper.scanHistorical(url);

      spinner.succeed('Historical scan complete');

      console.log(chalk.cyan(`\n📚 Historical Analysis (${result.yearsAnalyzed} years):`));
      console.log(`  Snapshots analyzed: ${result.snapshots.length}`);

      console.log(chalk.yellow('\n🏢 Monotype Usage Timeline:'));
      result.timeline.monotypeHistory.forEach(year => {
        if (year.monotypefontsUsed > 0) {
          console.log(`  ${year.year}: ${year.monotypefontsUsed} fonts (${year.fonts.join(', ')})`);
        } else {
          console.log(chalk.green(`  ${year.year}: ✓ None detected`));
        }
      });

      // Save results
      const reporter = new Reporter({ outputDir: options.output });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = `${options.output}/history-${timestamp}.json`;
      await fs.ensureDir(options.output);
      await fs.writeJSON(outputFile, result, { spaces: 2 });

      console.log(chalk.gray(`\n📁 Results saved to: ${outputFile}\n`));
    } catch (error) {
      spinner.fail('Historical scan failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Full audit
program
  .command('audit')
  .description('Run complete audit (current + historical + analytics)')
  .argument('<url>', 'URL to audit')
  .option('-l, --logs <file>', 'Path to log file for analytics')
  .option('-y, --years <number>', 'Number of years to go back', '10')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <dir>', 'Output directory', './font-audit-reports')
  .option('--no-json', 'Skip JSON report')
  .option('--no-csv', 'Skip CSV reports')
  .option('--no-summary', 'Skip summary report')
  .option('--no-evidence', 'Skip evidence package')
  .action(async (url, options) => {
    const spinner = ora('Running full audit...').start();

    try {
      // Load log data if provided
      let logData = null;
      if (options.logs) {
        spinner.text = 'Loading log data...';
        const logsContent = await fs.readFile(options.logs, 'utf-8');
        logData = JSON.parse(logsContent);
      }

      // Run audit
      spinner.text = 'Analyzing current and historical data...';
      const scraper = new FontScraper({
        verbose: options.verbose,
        yearsBack: parseInt(options.years),
      });

      const audit = await scraper.fullAudit(url, logData);

      spinner.succeed('Audit complete');

      // Display summary
      console.log(chalk.cyan('\n═══════════════════════════════════════'));
      console.log(chalk.cyan('           AUDIT SUMMARY'));
      console.log(chalk.cyan('═══════════════════════════════════════\n'));

      if (audit.current && !audit.current.error) {
        console.log(chalk.yellow('Current Website:'));
        console.log(`  Fonts: ${audit.current.fonts.summary.total}`);
        console.log(`  Monotype: ${audit.current.monotype.found.length > 0 ?
          audit.current.monotype.found.map(f => f.font).join(', ') :
          chalk.green('None detected')}`);
      }

      if (audit.historical && !audit.historical.error) {
        console.log(chalk.yellow('\nHistorical Analysis:'));
        console.log(`  Years analyzed: ${audit.historical.yearsAnalyzed}`);
        console.log(`  Snapshots: ${audit.historical.snapshots.length}`);

        const yearsWithMonotype = audit.historical.snapshots.filter(
          s => !s.error && s.monotype?.found.length > 0
        ).length;

        console.log(`  Years with Monotype: ${yearsWithMonotype}/${audit.historical.snapshots.length}`);
      }

      if (audit.analytics) {
        console.log(chalk.yellow('\nAnalytics (Bot-Filtered):'));
        console.log(`  Unique Visitors: ${audit.analytics.visitors.recommended.toLocaleString()}`);
        console.log(`  Total Impressions: ${audit.analytics.impressions.total.toLocaleString()}`);
        console.log(`  Bots Filtered: ${audit.analytics.overview.totalBots.toLocaleString()} (${audit.analytics.overview.botPercentage}%)`);
      }

      console.log(chalk.yellow('\nKey Findings:'));
      audit.findings.evidence.forEach(e => {
        const icon = e.severity === 'HIGH' ? '⚠️ ' : e.severity === 'MEDIUM' ? '📋' : 'ℹ️ ';
        console.log(`  ${icon} ${e.message}`);
      });

      if (audit.findings.recommendations.length > 0) {
        console.log(chalk.yellow('\nRecommendations:'));
        audit.findings.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. [${rec.priority}] ${rec.recommendation}`);
        });
      }

      // Generate reports
      spinner.start('Generating reports...');
      const reporter = new Reporter({ outputDir: options.output });
      const report = await reporter.generateReport(audit, {
        json: options.json,
        csv: options.csv,
        summary: options.summary,
        evidence: options.evidence,
      });

      spinner.succeed('Reports generated');

      console.log(chalk.green(`\n✓ Full audit report available at: ${report.reportDir}\n`));
    } catch (error) {
      spinner.fail('Audit failed');
      console.error(chalk.red(`Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Filter bots from logs
program
  .command('filter-bots')
  .description('Filter bot traffic from log files')
  .argument('<logfile>', 'Path to log file (JSON)')
  .option('-o, --output <file>', 'Output file for filtered logs')
  .option('-s, --stats', 'Show statistics only')
  .action(async (logfile, options) => {
    const spinner = ora('Processing log file...').start();

    try {
      const BotFilter = require('./filters/BotFilter');
      const botFilter = new BotFilter();

      // Load logs
      const logsContent = await fs.readFile(logfile, 'utf-8');
      const logs = JSON.parse(logsContent);

      spinner.text = 'Filtering bots...';
      const filtered = botFilter.filterLogs(logs);

      spinner.succeed('Filtering complete');

      // Display stats
      console.log(chalk.cyan('\n📊 Bot Filtering Results:'));
      console.log(`  Total entries: ${filtered.total.toLocaleString()}`);
      console.log(`  Legitimate: ${filtered.legitimate.length.toLocaleString()}`);
      console.log(`  Bots detected: ${filtered.bots.length.toLocaleString()}`);
      console.log(`  Bot percentage: ${filtered.stats.botPercentage}%`);

      console.log(chalk.yellow('\nDetection Methods:'));
      Object.entries(filtered.stats.detectionMethods).forEach(([method, count]) => {
        console.log(`  ${method}: ${count.toLocaleString()}`);
      });

      // Save filtered logs
      if (!options.stats && options.output) {
        await fs.writeJSON(options.output, filtered, { spaces: 2 });
        console.log(chalk.gray(`\n📁 Filtered logs saved to: ${options.output}\n`));
      }
    } catch (error) {
      spinner.fail('Filtering failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
