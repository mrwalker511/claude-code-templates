/**
 * FontDetector - Comprehensive font detection from web pages
 * Extracts font information from CSS, computed styles, and web font services
 */

class FontDetector {
  constructor() {
    // Known web font services
    this.fontServices = {
      google: {
        patterns: [
          /fonts\.googleapis\.com/i,
          /fonts\.gstatic\.com/i,
        ],
        type: 'Google Fonts',
      },
      adobe: {
        patterns: [
          /use\.typekit\.net/i,
          /use\.typekit\.com/i,
          /p\.typekit\.net/i,
        ],
        type: 'Adobe Fonts (Typekit)',
      },
      fontawesome: {
        patterns: [
          /fontawesome/i,
          /fa-brands/i,
          /fa-solid/i,
        ],
        type: 'Font Awesome',
      },
      myfonts: {
        patterns: [/myfonts\.net/i],
        type: 'MyFonts',
      },
      fonts: {
        patterns: [/fonts\.com/i],
        type: 'Fonts.com',
      },
      cloudflare: {
        patterns: [/cdnjs\.cloudflare\.com.*fonts/i],
        type: 'Cloudflare CDN Fonts',
      },
    };

    // Common system fonts (to distinguish from web fonts)
    this.systemFonts = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Times',
      'Courier New',
      'Courier',
      'Verdana',
      'Georgia',
      'Palatino',
      'Garamond',
      'Comic Sans MS',
      'Trebuchet MS',
      'Arial Black',
      'Impact',
      'sans-serif',
      'serif',
      'monospace',
      'cursive',
      'fantasy',
      'system-ui',
    ];
  }

  /**
   * Extract fonts from CSS text
   * @param {string} cssText - CSS content
   * @returns {Array} Array of font definitions
   */
  extractFromCSS(cssText) {
    const fonts = [];

    // Extract @font-face declarations
    const fontFaceRegex = /@font-face\s*{([^}]*)}/gi;
    let match;

    while ((match = fontFaceRegex.exec(cssText)) !== null) {
      const fontFaceContent = match[1];

      const font = {
        type: '@font-face',
        family: this._extractValue(fontFaceContent, 'font-family'),
        weight: this._extractValue(fontFaceContent, 'font-weight'),
        style: this._extractValue(fontFaceContent, 'font-style'),
        src: this._extractFontSources(fontFaceContent),
      };

      if (font.family) {
        fonts.push(font);
      }
    }

    // Extract font-family declarations
    const fontFamilyRegex = /font-family\s*:\s*([^;]+);/gi;
    while ((match = fontFamilyRegex.exec(cssText)) !== null) {
      const families = this._parseFontFamily(match[1]);
      families.forEach(family => {
        if (family && !fonts.some(f => f.family === family)) {
          fonts.push({
            type: 'font-family',
            family: family,
            isSystemFont: this.isSystemFont(family),
          });
        }
      });
    }

    return fonts;
  }

  /**
   * Extract font sources from font-face src declaration
   * @param {string} content - Font-face content
   * @returns {Array} Array of font sources
   */
  _extractFontSources(content) {
    const srcMatch = content.match(/src\s*:\s*([^;]+);/i);
    if (!srcMatch) return [];

    const srcValue = srcMatch[1];
    const sources = [];

    // Extract URLs
    const urlRegex = /url\(['"]?([^'"()]+)['"]?\)(?:\s+format\(['"]?([^'"()]+)['"]?\))?/gi;
    let match;

    while ((match = urlRegex.exec(srcValue)) !== null) {
      sources.push({
        url: match[1],
        format: match[2] || this._detectFormatFromUrl(match[1]),
      });
    }

    return sources;
  }

  /**
   * Detect font format from URL
   * @param {string} url - Font URL
   * @returns {string} Font format
   */
  _detectFormatFromUrl(url) {
    if (url.includes('.woff2')) return 'woff2';
    if (url.includes('.woff')) return 'woff';
    if (url.includes('.ttf')) return 'truetype';
    if (url.includes('.otf')) return 'opentype';
    if (url.includes('.eot')) return 'embedded-opentype';
    if (url.includes('.svg')) return 'svg';
    return 'unknown';
  }

  /**
   * Extract CSS property value
   * @param {string} content - CSS content
   * @param {string} property - Property name
   * @returns {string} Property value
   */
  _extractValue(content, property) {
    const regex = new RegExp(`${property}\\s*:\\s*([^;]+);`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim().replace(/['"]/g, '') : null;
  }

  /**
   * Parse font-family value into individual fonts
   * @param {string} value - Font-family value
   * @returns {Array} Array of font names
   */
  _parseFontFamily(value) {
    return value
      .split(',')
      .map(f => f.trim().replace(/['"]/g, ''))
      .filter(f => f.length > 0);
  }

  /**
   * Check if font is a system font
   * @param {string} fontName - Font name
   * @returns {boolean} True if system font
   */
  isSystemFont(fontName) {
    return this.systemFonts.some(
      sf => sf.toLowerCase() === fontName.toLowerCase()
    );
  }

  /**
   * Detect web font service from URL
   * @param {string} url - URL to check
   * @returns {Object|null} Font service info
   */
  detectFontService(url) {
    for (const [service, config] of Object.entries(this.fontServices)) {
      if (config.patterns.some(pattern => pattern.test(url))) {
        return {
          service,
          name: config.type,
          url,
        };
      }
    }
    return null;
  }

  /**
   * Extract fonts from HTML content
   * @param {string} html - HTML content
   * @returns {Object} Font analysis
   */
  extractFromHTML(html) {
    const results = {
      cssLinks: [],
      inlineStyles: [],
      fontServices: [],
      allFonts: new Set(),
    };

    // Extract CSS link tags
    const cssLinkRegex = /<link[^>]*href=["']([^"']*\.css[^"']*)["'][^>]*>/gi;
    let match;

    while ((match = cssLinkRegex.exec(html)) !== null) {
      results.cssLinks.push(match[1]);
    }

    // Extract inline style tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((match = styleRegex.exec(html)) !== null) {
      const fonts = this.extractFromCSS(match[1]);
      results.inlineStyles.push(...fonts);
      fonts.forEach(f => results.allFonts.add(f.family));
    }

    // Detect web font service links
    const allLinks = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    allLinks.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']*)["']/);
      if (hrefMatch) {
        const service = this.detectFontService(hrefMatch[1]);
        if (service) {
          results.fontServices.push(service);
        }
      }
    });

    return {
      ...results,
      allFonts: Array.from(results.allFonts),
    };
  }

  /**
   * Parse Google Fonts URL to extract font families
   * @param {string} url - Google Fonts URL
   * @returns {Array} Array of font families
   */
  parseGoogleFontsUrl(url) {
    const fonts = [];

    // New API format: ?family=Roboto:wght@400;700&family=Open+Sans
    const familyRegex = /family=([^&:]+)(?::([^&]+))?/g;
    let match;

    while ((match = familyRegex.exec(url)) !== null) {
      const family = decodeURIComponent(match[1].replace(/\+/g, ' '));
      const variants = match[2] || '';

      fonts.push({
        family,
        service: 'Google Fonts',
        variants: this._parseGoogleFontVariants(variants),
      });
    }

    // Old API format: ?family=Roboto:400,700|Open+Sans
    if (fonts.length === 0) {
      const oldFormatMatch = url.match(/family=([^&]+)/);
      if (oldFormatMatch) {
        const families = oldFormatMatch[1].split('|');
        families.forEach(familyStr => {
          const [family, variants] = familyStr.split(':');
          fonts.push({
            family: decodeURIComponent(family.replace(/\+/g, ' ')),
            service: 'Google Fonts',
            variants: variants ? variants.split(',') : [],
          });
        });
      }
    }

    return fonts;
  }

  /**
   * Parse Google Fonts variants
   * @param {string} variantsStr - Variants string
   * @returns {Array} Array of variants
   */
  _parseGoogleFontVariants(variantsStr) {
    if (!variantsStr) return [];

    // New format: wght@400;700 or ital,wght@0,400;1,700
    if (variantsStr.includes('@')) {
      const [axes, values] = variantsStr.split('@');
      return values.split(';').map(v => ({
        axes: axes.split(','),
        values: v.split(','),
      }));
    }

    // Old format: 400,700
    return variantsStr.split(',');
  }

  /**
   * Create summary report of fonts
   * @param {Array} fonts - Array of font objects
   * @returns {Object} Summary report
   */
  createSummary(fonts) {
    const summary = {
      total: fonts.length,
      webFonts: 0,
      systemFonts: 0,
      byService: {},
      byFormat: {},
      unique: new Set(),
    };

    fonts.forEach(font => {
      summary.unique.add(font.family);

      if (font.isSystemFont) {
        summary.systemFonts++;
      } else {
        summary.webFonts++;
      }

      // Count by service
      if (font.service) {
        summary.byService[font.service] =
          (summary.byService[font.service] || 0) + 1;
      }

      // Count by format
      if (font.src && font.src.length > 0) {
        font.src.forEach(src => {
          const format = src.format || 'unknown';
          summary.byFormat[format] = (summary.byFormat[format] || 0) + 1;
        });
      }
    });

    summary.uniqueCount = summary.unique.size;
    summary.uniqueFonts = Array.from(summary.unique);

    return summary;
  }
}

module.exports = FontDetector;
