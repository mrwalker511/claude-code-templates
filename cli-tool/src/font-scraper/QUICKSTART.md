# Font Scraper - Quick Start Guide

Get started with font verification in 5 minutes.

## Installation

```bash
# Navigate to the font-scraper directory
cd cli-tool/src/font-scraper

# Install dependencies (if not already installed)
npm install
```

## Your First Audit

### Step 1: Basic Scan

Scan a website for current font usage:

```bash
node cli.js scan https://www.google.com --verbose
```

**What you'll see:**
- Total fonts detected
- Unique fonts
- Web fonts vs system fonts
- Monotype font detection
- Results saved to JSON

### Step 2: Historical Analysis

Check historical font usage (past 10 years):

```bash
node cli.js history https://www.google.com --years 5 --verbose
```

**What you'll see:**
- Yearly snapshots from Web Archive
- Timeline of font changes
- Monotype usage over time
- Historical trends

**Note:** This queries the Wayback Machine and respects rate limits (2 second delay between requests). A 5-year analysis will take ~10 seconds.

### Step 3: Full Audit (Recommended)

Run a complete audit with all features:

```bash
node cli.js audit https://www.google.com --years 5 --verbose
```

**What you'll get:**
- Current font analysis
- Historical snapshots
- Comprehensive report in multiple formats:
  - `full-audit.json` - Complete data
  - `SUMMARY.txt` - Human-readable overview
  - `EVIDENCE.md` - Evidence package
  - CSV files for spreadsheet analysis

### Step 4: Explore the Reports

```bash
# Navigate to the reports directory
cd font-audit-reports

# Find your latest audit folder (named with timestamp)
ls -lt

# View the summary
cat audit-*/SUMMARY.txt

# Open the evidence package
cat audit-*/EVIDENCE.md
```

## Monotype Verification Example

Let's say Monotype claims you used their fonts. Here's how to verify:

```bash
# Run full audit with 10 years of historical data
node cli.js audit https://yourcompany.com --years 10 --verbose

# Review the Monotype-specific findings in:
# 1. SUMMARY.txt - Quick overview of Monotype usage
# 2. monotype-usage.csv - Spreadsheet-ready data
# 3. EVIDENCE.md - Detailed evidence with archive URLs

# Example output interpretation:
# "No Monotype fonts detected in 8 out of 10 historical snapshots"
# → Strong evidence for negotiating lower fees or disputing claims
```

## Bot Filtering Example

If you have server logs and want to filter out bots:

### Step 1: Prepare Your Log Data

Create a JSON file with your log entries:

```json
[
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "path": "/",
    "referer": "https://google.com"
  },
  {
    "timestamp": "2024-01-15T10:31:00Z",
    "ip": "66.249.64.1",
    "userAgent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "path": "/about"
  }
]
```

Save as `access.log.json`

### Step 2: Filter Bots

```bash
node cli.js filter-bots access.log.json --output filtered.json --stats
```

**What you'll see:**
- Total entries processed
- Legitimate traffic count
- Bots detected and filtered
- Bot percentage
- Detection methods used

### Step 3: Full Audit with Analytics

```bash
node cli.js audit https://yourcompany.com --logs access.log.json --verbose
```

**What you'll get:**
- Font usage analysis
- Historical data
- **PLUS:** Bot-filtered analytics
  - Unique visitors
  - Impressions (page views)
  - Session data
  - Bounce rate
  - Top pages
  - Referrers
  - Device breakdown

## Programmatic Usage

Create a file `my-audit.js`:

```javascript
const { FontScraper, Reporter } = require('./index');

async function runAudit() {
  // Initialize scraper
  const scraper = new FontScraper({
    verbose: true,
    yearsBack: 10
  });

  // Run audit
  const audit = await scraper.fullAudit('https://example.com');

  // Generate reports
  const reporter = new Reporter({ outputDir: './my-reports' });
  const report = await reporter.generateReport(audit);

  console.log('Audit complete:', report.reportDir);

  // Access specific findings
  if (audit.findings.monotypeUsage.current) {
    const monotype = audit.findings.monotypeUsage.current;
    console.log('Monotype fonts found:', monotype.found.length);
  }
}

runAudit().catch(console.error);
```

Run it:

```bash
node my-audit.js
```

## Common Use Cases

### 1. Verify Monotype Billing

**Scenario:** You received a bill for Monotype fonts but aren't sure if you use them.

```bash
node cli.js audit https://yourcompany.com --years 10 --verbose
```

**Look for:**
- `SUMMARY.txt` - Shows current and historical Monotype usage
- `monotype-usage.csv` - Import to Excel for analysis
- `EVIDENCE.md` - Use for billing disputes

### 2. Reconstruct Lost Analytics

**Scenario:** Google Analytics data was lost and you need visitor stats.

```bash
# Prepare your server logs as JSON
# Then run:
node cli.js audit https://yoursite.com --logs access.log.json
```

**You'll get:**
- Unique visitors (bot-filtered)
- Impressions
- Session data
- Top pages
- Referrer sources
- Device breakdown

### 3. Font Usage Audit

**Scenario:** You need to know what fonts your site uses/used.

```bash
node cli.js history https://yoursite.com --years 10 --verbose
```

**You'll get:**
- Timeline of font changes
- When fonts were added/removed
- Historical font usage patterns

## Tips & Best Practices

### Rate Limiting
The Wayback Machine has rate limits. The tool automatically:
- Waits 2 seconds between requests
- Retries failed requests (up to 3 times)
- Shows progress with verbose mode

### Log Data Quality
For best analytics results:
- Include IP addresses
- Include full User-Agent strings
- Include timestamps in ISO format
- Include referrer data (if available)
- Include geographic data (if available)

### Report Generation
- Use `--verbose` to see progress
- Reports are timestamped automatically
- All formats are generated by default
- Use `--no-csv` or `--no-json` to skip specific formats

### Performance
- Current scans: ~2-5 seconds
- Historical scans: ~2-3 seconds per year (due to rate limiting)
- 10-year audit: ~20-30 seconds
- Bot filtering: Near-instant for up to 1M log entries

## Troubleshooting

### "No snapshots found"
The URL may not be archived in the Wayback Machine. Try:
- Different URL (homepage vs. subpage)
- Reduce years back
- Check if site is in Wayback Machine manually

### "Request timeout"
Wayback Machine may be slow or unavailable. Try:
- Running again later
- Reducing years back
- Using `--verbose` to see which request is timing out

### "Cannot find module"
You're not in the correct directory. Make sure you're in:
```bash
cd cli-tool/src/font-scraper
```

## Next Steps

1. **Run a real audit** on your company's website
2. **Review the full README.md** for advanced features
3. **Check example.js** for programmatic usage patterns
4. **Explore the generated reports** to understand the data structure
5. **Customize bot filtering** for your specific needs

## Getting Help

- **Documentation:** See README.md for full documentation
- **Examples:** See example.js for code examples
- **Verbose Mode:** Use `--verbose` flag for detailed logging
- **Report Issues:** Check generated reports for insights

---

**Ready to verify your font usage?** Start with `node cli.js audit https://yoursite.com`
