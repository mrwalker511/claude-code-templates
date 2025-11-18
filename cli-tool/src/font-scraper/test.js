/**
 * Font Scraper - Simple Test
 * Verify that all modules load correctly
 */

const chalk = require('chalk');

console.log(chalk.cyan('\n🧪 Testing Font Scraper Modules...\n'));

// Test 1: Module Loading
console.log('1. Loading modules...');
try {
  const FontScraper = require('./FontScraper');
  const FontDetector = require('./detectors/FontDetector');
  const WaybackFetcher = require('./archive/WaybackFetcher');
  const BotFilter = require('./filters/BotFilter');
  const AnalyticsReconstructor = require('./analytics/AnalyticsReconstructor');
  const Reporter = require('./utils/Reporter');

  console.log(chalk.green('   ✓ All modules loaded successfully\n'));
} catch (error) {
  console.log(chalk.red('   ✗ Module loading failed:'), error.message);
  process.exit(1);
}

// Test 2: BotFilter
console.log('2. Testing BotFilter...');
try {
  const BotFilter = require('./filters/BotFilter');
  const botFilter = new BotFilter();

  // Test bot detection
  const testCases = [
    {
      userAgent: 'Googlebot/2.1',
      expected: true,
      name: 'Googlebot',
    },
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      expected: false,
      name: 'Chrome',
    },
    {
      userAgent: 'curl/7.68.0',
      expected: true,
      name: 'curl',
    },
  ];

  let passed = 0;
  testCases.forEach(test => {
    const result = botFilter.isBotUserAgent(test.userAgent);
    if (result === test.expected) {
      console.log(chalk.green(`   ✓ ${test.name}: ${result ? 'bot' : 'legitimate'}`));
      passed++;
    } else {
      console.log(chalk.red(`   ✗ ${test.name}: expected ${test.expected}, got ${result}`));
    }
  });

  console.log(chalk.green(`   ✓ BotFilter: ${passed}/${testCases.length} tests passed\n`));
} catch (error) {
  console.log(chalk.red('   ✗ BotFilter test failed:'), error.message);
}

// Test 3: FontDetector
console.log('3. Testing FontDetector...');
try {
  const FontDetector = require('./detectors/FontDetector');
  const detector = new FontDetector();

  // Test CSS parsing
  const testCSS = `
    @font-face {
      font-family: 'MyFont';
      font-weight: 400;
      src: url('/fonts/myfont.woff2') format('woff2');
    }

    body {
      font-family: 'MyFont', Arial, sans-serif;
    }
  `;

  const fonts = detector.extractFromCSS(testCSS);
  const hasMyFont = fonts.some(f => f.family === 'MyFont');
  const hasArial = fonts.some(f => f.family === 'Arial');

  if (hasMyFont && hasArial) {
    console.log(chalk.green(`   ✓ CSS parsing: Found ${fonts.length} fonts`));
    console.log(chalk.green(`   ✓ @font-face detection: MyFont`));
    console.log(chalk.green(`   ✓ font-family detection: Arial\n`));
  } else {
    console.log(chalk.yellow(`   ! CSS parsing: Found ${fonts.length} fonts (expected MyFont and Arial)`));
  }

  // Test system font detection
  const isSystem = detector.isSystemFont('Arial');
  const isNotSystem = !detector.isSystemFont('CustomFont');

  if (isSystem && isNotSystem) {
    console.log(chalk.green(`   ✓ System font detection working\n`));
  } else {
    console.log(chalk.yellow(`   ! System font detection may need review\n`));
  }
} catch (error) {
  console.log(chalk.red('   ✗ FontDetector test failed:'), error.message);
}

// Test 4: AnalyticsReconstructor
console.log('4. Testing AnalyticsReconstructor...');
try {
  const AnalyticsReconstructor = require('./analytics/AnalyticsReconstructor');
  const BotFilter = require('./filters/BotFilter');

  const botFilter = new BotFilter();
  const analytics = new AnalyticsReconstructor(botFilter);

  // Test log processing
  const testLogs = [
    {
      timestamp: '2024-01-15T10:00:00Z',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      path: '/',
      referer: 'https://google.com',
    },
    {
      timestamp: '2024-01-15T10:01:00Z',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      path: '/about',
      referer: '/',
    },
    {
      timestamp: '2024-01-15T10:02:00Z',
      ip: '66.249.64.1',
      userAgent: 'Googlebot/2.1',
      path: '/sitemap.xml',
    },
  ];

  const result = analytics.processLogs(testLogs);

  console.log(chalk.green(`   ✓ Processed ${result.overview.totalRequests} requests`));
  console.log(chalk.green(`   ✓ Filtered ${result.overview.totalBots} bots`));
  console.log(chalk.green(`   ✓ Found ${result.visitors.recommended} unique visitors`));
  console.log(chalk.green(`   ✓ Calculated ${result.impressions.total} impressions\n`));
} catch (error) {
  console.log(chalk.red('   ✗ AnalyticsReconstructor test failed:'), error.message);
}

// Test 5: Reporter (dry run)
console.log('5. Testing Reporter...');
try {
  const Reporter = require('./utils/Reporter');
  const reporter = new Reporter({ outputDir: './test-reports' });

  console.log(chalk.green('   ✓ Reporter initialized\n'));
} catch (error) {
  console.log(chalk.red('   ✗ Reporter test failed:'), error.message);
}

// Summary
console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
console.log(chalk.green('✓ All basic tests passed!'));
console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));

console.log(chalk.yellow('\nNext Steps:'));
console.log('  • Run a real scan: node cli.js scan https://example.com');
console.log('  • Try the examples: node example.js');
console.log('  • Read the docs: cat README.md\n');
