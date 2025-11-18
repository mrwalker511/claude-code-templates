/**
 * WaybackFetcher - Fetch historical snapshots from Wayback Machine
 * Retrieves archived versions of web pages for historical font analysis
 */

const https = require('https');
const http = require('http');

class WaybackFetcher {
  constructor(options = {}) {
    this.baseUrl = 'https://web.archive.org';
    this.cdxApi = 'https://web.archive.org/cdx/search/cdx';
    this.userAgent = options.userAgent || 'FontScraperBot/1.0 (Historical Analysis)';
    this.requestDelay = options.requestDelay || 2000; // 2 second delay between requests
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Get available snapshots for a URL
   * @param {string} url - URL to query
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of snapshots
   */
  async getSnapshots(url, options = {}) {
    const params = new URLSearchParams({
      url: url,
      output: 'json',
      fl: 'timestamp,original,statuscode,mimetype',
      filter: options.filter || 'statuscode:200',
      collapse: options.collapse || 'timestamp:8', // One per day
    });

    // Add date range if specified
    if (options.from) {
      params.append('from', this._formatDate(options.from));
    }
    if (options.to) {
      params.append('to', this._formatDate(options.to));
    }

    const apiUrl = `${this.cdxApi}?${params.toString()}`;

    try {
      const data = await this._makeRequest(apiUrl);
      const json = JSON.parse(data);

      // First row is headers, skip it
      if (json.length <= 1) {
        return [];
      }

      const headers = json[0];
      return json.slice(1).map(row => {
        const snapshot = {};
        headers.forEach((header, index) => {
          snapshot[header] = row[index];
        });
        snapshot.archiveUrl = this._buildArchiveUrl(
          snapshot.timestamp,
          snapshot.original
        );
        snapshot.date = this._parseTimestamp(snapshot.timestamp);
        return snapshot;
      });
    } catch (error) {
      console.error(`Error fetching snapshots for ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Get yearly snapshots for historical analysis
   * @param {string} url - URL to query
   * @param {number} yearsBack - Number of years to go back
   * @returns {Promise<Array>} Array of yearly snapshots
   */
  async getYearlySnapshots(url, yearsBack = 10) {
    const now = new Date();
    const snapshots = [];

    for (let i = 0; i < yearsBack; i++) {
      const year = now.getFullYear() - i;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearSnapshots = await this.getSnapshots(url, {
        from: yearStart,
        to: yearEnd,
        collapse: 'timestamp:8', // One snapshot per day
      });

      // Get the closest snapshot to mid-year
      if (yearSnapshots.length > 0) {
        const midYear = new Date(year, 6, 1); // July 1st
        const closest = this._findClosestSnapshot(yearSnapshots, midYear);
        if (closest) {
          snapshots.push({
            year,
            ...closest,
          });
        }
      }

      // Be respectful of Wayback Machine servers
      await this._delay(this.requestDelay);
    }

    return snapshots;
  }

  /**
   * Fetch archived page content
   * @param {string} timestamp - Wayback timestamp
   * @param {string} url - Original URL
   * @returns {Promise<string>} Page content
   */
  async fetchArchivedPage(timestamp, url) {
    const archiveUrl = this._buildArchiveUrl(timestamp, url);

    try {
      const content = await this._makeRequest(archiveUrl);
      return content;
    } catch (error) {
      console.error(`Error fetching archived page:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch archived page with metadata
   * @param {Object} snapshot - Snapshot object with timestamp and original URL
   * @returns {Promise<Object>} Page content with metadata
   */
  async fetchSnapshot(snapshot) {
    const content = await this.fetchArchivedPage(
      snapshot.timestamp,
      snapshot.original
    );

    return {
      timestamp: snapshot.timestamp,
      date: snapshot.date,
      url: snapshot.original,
      archiveUrl: snapshot.archiveUrl,
      content: content,
      statusCode: snapshot.statuscode,
      mimeType: snapshot.mimetype,
    };
  }

  /**
   * Build Wayback Machine archive URL
   * @param {string} timestamp - Wayback timestamp
   * @param {string} url - Original URL
   * @returns {string} Archive URL
   */
  _buildArchiveUrl(timestamp, url) {
    return `${this.baseUrl}/web/${timestamp}id_/${url}`;
  }

  /**
   * Parse Wayback timestamp to Date
   * @param {string} timestamp - Wayback timestamp (YYYYMMDDhhmmss)
   * @returns {Date} Date object
   */
  _parseTimestamp(timestamp) {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10) || '00';
    const minute = timestamp.substring(10, 12) || '00';
    const second = timestamp.substring(12, 14) || '00';

    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    );
  }

  /**
   * Format date for Wayback API
   * @param {Date} date - Date object
   * @returns {string} Formatted date (YYYYMMDD)
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Find snapshot closest to target date
   * @param {Array} snapshots - Array of snapshots
   * @param {Date} targetDate - Target date
   * @returns {Object|null} Closest snapshot
   */
  _findClosestSnapshot(snapshots, targetDate) {
    if (snapshots.length === 0) return null;

    return snapshots.reduce((closest, snapshot) => {
      const snapshotDate = this._parseTimestamp(snapshot.timestamp);
      const closestDate = this._parseTimestamp(closest.timestamp);

      const snapshotDiff = Math.abs(snapshotDate - targetDate);
      const closestDiff = Math.abs(closestDate - targetDate);

      return snapshotDiff < closestDiff ? snapshot : closest;
    });
  }

  /**
   * Make HTTP/HTTPS request
   * @param {string} url - URL to request
   * @returns {Promise<string>} Response body
   */
  _makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;

      const options = {
        headers: {
          'User-Agent': this.userAgent,
        },
      };

      const request = client.get(url, options, response => {
        let data = '';

        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400) {
          if (response.headers.location) {
            return this._makeRequest(response.headers.location)
              .then(resolve)
              .catch(reject);
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          resolve(data);
        });
      });

      request.on('error', error => {
        reject(error);
      });

      request.setTimeout(30000, () => {
        request.abort();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get availability summary for a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} Availability summary
   */
  async getAvailability(url) {
    try {
      const snapshots = await this.getSnapshots(url, {
        collapse: 'timestamp:8',
      });

      if (snapshots.length === 0) {
        return {
          available: false,
          url: url,
          count: 0,
        };
      }

      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      return {
        available: true,
        url: url,
        count: snapshots.length,
        firstDate: this._parseTimestamp(firstSnapshot.timestamp),
        lastDate: this._parseTimestamp(lastSnapshot.timestamp),
        snapshots: snapshots,
      };
    } catch (error) {
      return {
        available: false,
        url: url,
        error: error.message,
      };
    }
  }

  /**
   * Batch fetch snapshots with rate limiting
   * @param {Array} urls - Array of URLs
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} Array of results
   */
  async batchFetchSnapshots(urls, options = {}) {
    const results = [];

    for (const url of urls) {
      try {
        const snapshots = await this.getYearlySnapshots(
          url,
          options.yearsBack || 10
        );
        results.push({
          url,
          success: true,
          snapshots,
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error.message,
        });
      }

      // Rate limiting
      await this._delay(this.requestDelay);
    }

    return results;
  }
}

module.exports = WaybackFetcher;
