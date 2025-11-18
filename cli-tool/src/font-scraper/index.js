/**
 * Font Scraper - Main Entry Point
 * Export all modules for easy importing
 */

module.exports = {
  // Main scraper
  FontScraper: require('./FontScraper'),

  // Detectors
  FontDetector: require('./detectors/FontDetector'),

  // Archive
  WaybackFetcher: require('./archive/WaybackFetcher'),

  // Filters
  BotFilter: require('./filters/BotFilter'),

  // Analytics
  AnalyticsReconstructor: require('./analytics/AnalyticsReconstructor'),

  // Utilities
  Reporter: require('./utils/Reporter'),
};
