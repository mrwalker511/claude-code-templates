# Font Scraper - Font Usage Verification & Analytics Tool

A comprehensive tool for verifying font usage, analyzing historical data, and generating auditable reports. Perfect for verifying or disputing font licensing claims (e.g., Monotype), tracking user analytics without Google Analytics, and conducting detailed font audits.

## 🎯 Key Features

### Font Detection
- **CSS Parsing** - Extracts fonts from @font-face declarations and font-family rules
- **Web Font Services** - Identifies Google Fonts, Adobe Fonts, Font Awesome, and more
- **System Fonts** - Distinguishes between web fonts and system fonts
- **Historical Analysis** - Scans 5-10 years of archived pages via Wayback Machine

### Bot Filtering (Industry Best Practices)
- **600+ Known Bots** - Comprehensive user-agent pattern matching
- **IP Range Verification** - Known bot IP ranges (Google, Bing, etc.)
- **Behavioral Analysis** - Detects automated behavior patterns
- **IAB Compliant** - Follows industry standards for bot detection

### Analytics Reconstruction
- **Unique Visitors** - IP + User-Agent fingerprinting
- **Impressions** - Page view tracking with bot filtering
- **Sessions** - Session reconstruction with timeout detection
- **Geographic Data** - Country/city analysis (with IP geolocation)
- **Device Breakdown** - Mobile, tablet, desktop detection
- **Referrer Tracking** - Traffic source analysis

### Reporting & Evidence
- **JSON Reports** - Complete data in structured format
- **CSV Exports** - Spreadsheet-ready analytics data
- **Summary Reports** - Human-readable audit summaries
- **Evidence Packages** - Markdown documentation for disputes

## 🚀 Quick Start

### Installation

```bash
# Navigate to the font-scraper directory
cd cli-tool/src/font-scraper

# The tool is ready to use! No additional installation needed.
```

### Basic Usage

#### 1. Quick Scan (Current Website)

```bash
node cli.js scan https://example.com
```

Output:
```
✓ Scan complete

📊 Font Summary:
  Total Fonts: 12
  Unique Fonts: 8
  Web Fonts: 5
  System Fonts: 7

🏢 Monotype Fonts:
  ✓ No Monotype fonts detected

📁 Results saved to: ./font-audit-reports/scan-2024-01-15.json
```

#### 2. Historical Analysis (Web Archive)

```bash
node cli.js history https://example.com --years 10
```

Output:
```
✓ Historical scan complete

📚 Historical Analysis (10 years):
  Snapshots analyzed: 10

🏢 Monotype Usage Timeline:
  2024: ✓ None detected
  2023: ✓ None detected
  2022: 2 fonts (Helvetica, Arial)
  2021: 1 font (Helvetica)
  ...
```

#### 3. Full Audit (Recommended)

```bash
node cli.js audit https://example.com --logs ./access.log.json --verbose
```

Output:
```
✓ Audit complete

═══════════════════════════════════════
           AUDIT SUMMARY
═══════════════════════════════════════

Current Website:
  Fonts: 12
  Monotype: None detected

Historical Analysis:
  Years analyzed: 10
  Snapshots: 10
  Years with Monotype: 2/10

Analytics (Bot-Filtered):
  Unique Visitors: 45,234
  Total Impressions: 123,456
  Bots Filtered: 78,912 (39%)

Key Findings:
  ⚠️  No Monotype fonts detected on current website
  📋 No Monotype fonts detected in 8 out of 10 historical snapshots

Recommendations:
  1. [HIGH] Current site shows no Monotype font usage. If billed for Monotype licenses, request detailed usage evidence.
  2. [MEDIUM] Monotype fonts found in less than half of historical snapshots. Consider negotiating based on actual usage periods.

✓ Full audit report available at: ./font-audit-reports/audit-2024-01-15/
```

#### 4. Bot Filtering Only

```bash
node cli.js filter-bots ./access.log.json --output ./filtered.json
```

## 📖 Detailed Usage

### CLI Commands

#### `scan` - Scan Current Website

```bash
node cli.js scan <url> [options]

Options:
  -v, --verbose          Verbose output
  -o, --output <dir>     Output directory (default: ./font-audit-reports)
```

#### `history` - Historical Analysis

```bash
node cli.js history <url> [options]

Options:
  -y, --years <number>   Number of years to go back (default: 10)
  -v, --verbose          Verbose output
  -o, --output <dir>     Output directory
```

#### `audit` - Full Audit

```bash
node cli.js audit <url> [options]

Options:
  -l, --logs <file>      Path to log file for analytics (JSON)
  -y, --years <number>   Number of years to go back (default: 10)
  -v, --verbose          Verbose output
  -o, --output <dir>     Output directory
  --no-json              Skip JSON report
  --no-csv               Skip CSV reports
  --no-summary           Skip summary report
  --no-evidence          Skip evidence package
```

#### `filter-bots` - Filter Bot Traffic

```bash
node cli.js filter-bots <logfile> [options]

Options:
  -o, --output <file>    Output file for filtered logs
  -s, --stats            Show statistics only (don't save filtered logs)
```

### Programmatic Usage

```javascript
const FontScraper = require('./FontScraper');
const Reporter = require('./utils/Reporter');

// Initialize scraper
const scraper = new FontScraper({
  verbose: true,
  yearsBack: 10
});

// Scan current site
const current = await scraper.scanCurrent('https://example.com');

// Scan historical snapshots
const historical = await scraper.scanHistorical('https://example.com');

// Full audit with analytics
const logs = [...]; // Your log data
const audit = await scraper.fullAudit('https://example.com', logs);

// Generate reports
const reporter = new Reporter({ outputDir: './reports' });
const report = await reporter.generateReport(audit);
```

## 🏢 Monotype Verification Use Case

### Background
Monotype is a major font licensing company. Companies often receive bills for Monotype font usage, but may need to verify:
- Are we actually using Monotype fonts?
- When did we start/stop using them?
- Do the usage claims match reality?

### How This Tool Helps

1. **Current Verification**
   - Scans your live website for Monotype fonts
   - Provides exact count and locations

2. **Historical Proof**
   - Checks 10 years of archived pages
   - Shows when fonts were/weren't used
   - Creates timeline of font usage

3. **Auditable Evidence**
   - Generates CSV reports for spreadsheet analysis
   - Creates markdown evidence documents
   - Provides Web Archive URLs for verification

4. **Dispute Support**
   - If Monotype claims you used fonts in 2020 but archives show you didn't
   - Evidence package includes archive URLs for third-party verification
   - Reports are structured for business/legal use

### Example Workflow

```bash
# 1. Run full audit
node cli.js audit https://yourcompany.com --years 10 --verbose

# 2. Review the generated reports:
#    - SUMMARY.txt (quick overview)
#    - EVIDENCE.md (detailed evidence)
#    - monotype-usage.csv (spreadsheet analysis)

# 3. Use evidence to:
#    - Verify billing accuracy
#    - Dispute incorrect claims
#    - Negotiate license terms
```

## 📊 Analytics Reconstruction (Google Analytics Alternative)

### Log Data Format

Your log file should be a JSON array of entries:

```json
[
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0 ...",
    "path": "/",
    "referer": "https://google.com",
    "country": "US",
    "city": "New York"
  }
]
```

### Metrics Calculated

- **Unique Visitors** - IP + User-Agent fingerprinting (more accurate than IP alone)
- **Impressions** - Total page views (bot-filtered)
- **Sessions** - 30-minute session timeout
- **Bounce Rate** - Single-page sessions
- **Top Pages** - By impressions and unique visitors
- **Referrers** - Traffic sources
- **Devices** - Mobile, tablet, desktop breakdown
- **Browsers** - Browser distribution
- **Timeline** - Daily, hourly, weekly patterns

### Bot Filtering

Industry-standard bot detection using:
- **600+ bot patterns** - Googlebot, Bingbot, social media bots, scrapers
- **IP verification** - Known bot IP ranges
- **Behavioral analysis** - Request rate, session duration, JS execution
- **Header validation** - Missing or suspicious headers

Typical results: 30-50% of traffic filtered as bots

## 📁 Report Structure

After running an audit, you'll get:

```
font-audit-reports/
└── audit-2024-01-15T10-30-00/
    ├── full-audit.json           # Complete audit data
    ├── current-fonts.csv         # Current fonts in CSV
    ├── historical-timeline.csv   # Historical data in CSV
    ├── monotype-usage.csv        # Monotype-specific usage
    ├── analytics.csv             # Analytics metrics
    ├── SUMMARY.txt               # Human-readable summary
    └── EVIDENCE.md               # Evidence package
```

### Report Files Explained

**full-audit.json**
- Complete audit data in JSON format
- Use for programmatic analysis
- Import into data analysis tools

**CSV Files**
- Import into Excel, Google Sheets
- Create charts and pivot tables
- Share with non-technical stakeholders

**SUMMARY.txt**
- Quick overview of findings
- Key metrics and recommendations
- Human-readable format

**EVIDENCE.md**
- Detailed evidence for disputes
- Includes archive URLs for verification
- Structured for business/legal use

## 🔧 Advanced Configuration

### Custom Bot Patterns

```javascript
const BotFilter = require('./filters/BotFilter');

const botFilter = new BotFilter();

// Add custom bot pattern
botFilter.botPatterns.push(/mycustombot/i);

// Add custom IP range
botFilter.botIPRanges.push('10.0.0.0/8');
```

### Custom Font Detection

```javascript
const FontDetector = require('./detectors/FontDetector');

const detector = new FontDetector();

// Check specific fonts
const isMonotype = detector.isSystemFont('Helvetica');

// Parse Google Fonts URL
const fonts = detector.parseGoogleFontsUrl(
  'https://fonts.googleapis.com/css?family=Roboto:400,700'
);
```

### Custom Wayback Queries

```javascript
const WaybackFetcher = require('./archive/WaybackFetcher');

const wayback = new WaybackFetcher({
  userAgent: 'MyBot/1.0',
  requestDelay: 3000, // 3 seconds between requests
  maxRetries: 5
});

// Get snapshots for specific date range
const snapshots = await wayback.getSnapshots('https://example.com', {
  from: new Date('2020-01-01'),
  to: new Date('2020-12-31')
});
```

## 📋 Requirements

- Node.js 14.0.0+
- No additional dependencies (uses built-in Node.js modules)

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional font service detection (e.g., MyFonts, Fonts.com)
- More sophisticated bot detection algorithms
- IP geolocation integration
- Real-time monitoring mode
- Docker containerization
- API endpoints for integration

## ⚖️  Legal Disclaimer

This tool is designed for legitimate business purposes including:
- Verifying your own font usage
- Auditing your company's websites
- Disputing incorrect licensing claims
- Replacing lost analytics data

**Important Notes:**
- Historical data is from publicly available Web Archive
- Bot filtering uses industry-standard practices
- Reports are for informational purposes only
- Consult legal counsel for licensing disputes
- Respect Wayback Machine's terms of service
- Use reasonable rate limiting for archive requests

## 📞 Support

For issues or questions:
1. Check the example.js file for usage patterns
2. Review this README for configuration options
3. Enable --verbose for detailed logging
4. Check generated reports for insights

## 🎓 Use Cases

1. **Font License Verification**
   - Verify Monotype, Adobe, or other font licensing claims
   - Historical proof of font usage
   - Evidence for license negotiations

2. **Analytics Recovery**
   - Reconstruct lost Google Analytics data
   - Bot-filtered visitor counts
   - Historical traffic patterns

3. **Compliance Audits**
   - Font usage compliance verification
   - GDPR-compliant analytics (no tracking cookies)
   - Historical compliance documentation

4. **Business Intelligence**
   - Font usage trends over time
   - Visitor analytics without third-party tracking
   - Traffic source analysis

## 🚀 Next Steps

1. **Run a test audit** on your website
2. **Review the reports** to understand the data
3. **Configure bot filtering** for your specific needs
4. **Integrate with your log analysis** pipeline
5. **Generate evidence packages** for licensing discussions

## 📜 License

MIT License - Use freely for personal and commercial purposes.

---

**Built with ❤️ for accurate, verifiable font usage tracking**
