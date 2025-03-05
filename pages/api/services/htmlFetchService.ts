/**
 * HTML Fetch Service
 *
 * Service for fetching HTML content from URLs, with various utilities for handling
 * different types of websites and error conditions.
 */

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Fetches HTML content from a given URL and optimizes it for recipe extraction
 * @param url The URL to fetch HTML from
 * @returns The optimized HTML content as a string or null if fetch fails
 */
export const fetchHtmlFromUrl = async (url: string): Promise<string | null> => {
  try {
    // Validate and normalize URL
    if (!url) {
      console.error("Invalid URL: URL is empty");
      return null;
    }

    // Make sure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    console.log(`Fetching HTML from URL: ${url}`);

    // Configure request
    const config = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
      timeout: 15000, // 15 seconds timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max
      validateStatus: (status: number) => status >= 200 && status < 400,
    };

    const response = await axios.get(url, config);

    if (!response.data || typeof response.data !== "string") {
      console.error(
        `Invalid response for URL: ${url}. Response is not a string.`
      );
      return null;
    }

    console.log(
      `Successfully fetched HTML from URL: ${url}, content length: ${response.data.length} characters`
    );

    // Process HTML to remove unnecessary content and optimize for OpenAI
    const optimizedHtml = optimizeHtmlForRecipeExtraction(response.data);

    console.log(
      `Optimized HTML for recipe extraction, reduced from ${
        response.data.length
      } to ${optimizedHtml.length} characters (${Math.round(
        (optimizedHtml.length / response.data.length) * 100
      )}%)`
    );
    console.log("html", optimizedHtml);

    return optimizedHtml;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Axios error fetching HTML from ${url}:`,
        error.message,
        error.response?.status ? `Status: ${error.response.status}` : "",
        error.code ? `Code: ${error.code}` : ""
      );
    } else {
      console.error(`Error fetching HTML from ${url}:`, error);
    }
    return null;
  }
};

/**
 * Optimizes HTML content for recipe extraction by removing unnecessary elements
 * and focusing on meaningful content
 *
 * @param htmlContent Original HTML content
 * @returns Optimized HTML content
 */
function optimizeHtmlForRecipeExtraction(htmlContent: string): string {
  try {
    const $ = cheerio.load(htmlContent);

    // First check for article tag - if it exists, extract just that content
    const articleElements = $("article");
    if (articleElements.length > 0) {
      // Find the most substantial article
      let bestArticle: any = articleElements.first();
      let bestLength = bestArticle.text().trim().length;

      // If multiple articles exist, find the one with the most content
      if (articleElements.length > 1) {
        articleElements.each(function () {
          const articleLength = $(this).text().trim().length;
          if (articleLength > bestLength) {
            bestLength = articleLength;
            bestArticle = $(this);
          }
        });
      }

      // Clone the article to prevent modifying the original DOM
      const articleHtml = bestArticle.html() || "";
      const $article = cheerio.load(articleHtml);

      // Clean up specific elements within the article
      $article(
        "script, style, noscript, iframe, meta, link, nav, footer, header"
      ).remove();
      $article("svg").remove();
      $article("button").remove();
      $article('[role="dialog"]').remove();
      $article(
        '[class*="social"], [class*="share"], [class*="comment"]'
      ).remove();

      // Clean up images - preserve but simplify them
      $article("img").each(function () {
        // Keep the img tag but clean up unnecessary attributes
        const src = $article(this).attr("src") || "";
        const alt = $article(this).attr("alt") || "";
        const dataSrc = $article(this).attr("data-src") || "";

        // Use the best available image URL
        let bestSrc = src;
        if (!bestSrc && dataSrc) bestSrc = dataSrc;

        // If we have a src, keep the image; otherwise, remove it
        if (bestSrc) {
          $article(this).attr("src", bestSrc);
          if (alt) $article(this).attr("alt", alt);

          // Clean other attributes
          $article(this)
            .removeAttr("class")
            .removeAttr("id")
            .removeAttr("width")
            .removeAttr("height")
            .removeAttr("srcset")
            .removeAttr("sizes")
            .removeAttr("loading")
            .removeAttr("data-src")
            .removeAttr("data-srcset");
        } else {
          $article(this).remove();
        }
      });

      const cleanedArticleHtml = $article.html();
      console.log("Found and extracted article tag content");
      return cleanedArticleHtml || "";
    }

    // If no article tag, fall back to previous approach of finding content
    console.log("No article tag found, trying to identify main content");

    // Remove non-content elements
    $(
      "script, style, noscript, iframe, meta, link, nav, footer, header"
    ).remove();
    $("svg").remove();
    $("button").remove();
    $("[role='dialog']").remove();

    // Remove common ad and non-content containers
    $(
      '[class*="social"], [class*="share"], [class*="comment"], [class*="widget"], ' +
        '[class*="sidebar"], [class*="banner"], [class*="ad-"], [id*="ad-"], ' +
        '[class*="navigation"], [class*="menu"], [class*="popup"], [class*="modal"], ' +
        '[class*="newsletter"], [id*="newsletter"], [class*="related"], [class*="recommended"], ' +
        '[class*="promo"], [class*="subscribe"], [id*="subscribe"]'
    ).remove();

    // Clean up images
    $("img").each(function () {
      // Keep the img tag but clean up unnecessary attributes
      const src = $(this).attr("src") || "";
      const alt = $(this).attr("alt") || "";
      const dataSrc = $(this).attr("data-src") || "";

      // Use the best available image URL
      let bestSrc = src;
      if (!bestSrc && dataSrc) bestSrc = dataSrc;

      // If we have a src, keep the image; otherwise, remove it
      if (bestSrc) {
        $(this).attr("src", bestSrc);
        if (alt) $(this).attr("alt", alt);

        // Clean other attributes to simplify the HTML
        $(this)
          .removeAttr("class")
          .removeAttr("id")
          .removeAttr("width")
          .removeAttr("height")
          .removeAttr("srcset")
          .removeAttr("sizes")
          .removeAttr("loading")
          .removeAttr("data-src")
          .removeAttr("data-srcset");
      } else {
        $(this).remove();
      }
    });

    // Try to find the main recipe content area
    // Check multiple potential containers in priority order
    const recipeContentSelectors = [
      // Specific recipe content selectors
      '[itemtype*="Recipe"]',
      '[class*="recipe-container"]',
      '[class*="recipe-content"]',
      '[class*="recipe-instructions"]',
      '[id*="recipe-container"]',
      '[id*="recipe-content"]',
      // Structured data selectors
      '[itemprop="recipeInstructions"]',
      '[itemprop="recipe"]',
      // Main content selectors
      "main",
      ".main-content",
      "#main-content",
      ".main-article",
      ".content-area",
      ".post-content",
      ".entry-content",
      ".content",
      "#content",
    ];

    let mainContent: string | null = null;

    // Try each selector until we find content
    for (const selector of recipeContentSelectors) {
      const element = $(selector);
      const elementHtml = element.html();
      if (
        element.length > 0 &&
        elementHtml &&
        elementHtml.trim().length > 200
      ) {
        mainContent = elementHtml;
        console.log(`Found content using selector: ${selector}`);
        break;
      }
    }

    // If we still don't have content, try to find the main article by analyzing text density
    if (!mainContent) {
      console.log("Using text density analysis to find main content");
      mainContent = findContentByTextDensity($);
    }

    // If we have found main content, use it; otherwise, use the cleaned body
    if (mainContent) {
      // Wrap in a container
      const $main = cheerio.load(`<div>${mainContent}</div>`);

      // Final cleanup of the extracted content
      $main('aside, [class*="sidebar"]').remove();

      // Get the cleaned result
      let resultHtml = $main.html() || "";

      // Normalize whitespace
      resultHtml = resultHtml.replace(/\s+/g, " ").trim();

      console.log(
        `Extracted main content length: ${resultHtml.length} characters`
      );
      return resultHtml;
    }

    // Fallback: if no specific content area found, use the cleaned body
    let bodyHtml = $("body").html() || htmlContent;
    bodyHtml = bodyHtml.replace(/\s+/g, " ").trim();

    console.log(
      "No specific content container found, using cleaned body content"
    );
    return bodyHtml;
  } catch (error) {
    console.error("Error optimizing HTML:", error);
    return htmlContent;
  }
}

/**
 * Helper function to find the main content by analyzing text density
 * This can be useful when specific selectors don't work
 */
function findContentByTextDensity($: cheerio.CheerioAPI): string | null {
  let bestElement: any = null;
  let highestTextDensity = 0;

  $("div, section, article").each(function () {
    const element = $(this);
    const html = element.html() || "";
    const text = element.text().trim();
    const textLength = text.length;

    // Skip empty or tiny elements
    if (textLength < 200) return;

    // Calculate text-to-HTML ratio (text density)
    const density = textLength / html.length;

    // Check for recipe-related keywords
    const hasRecipeKeywords =
      /ingredients|instructions|preparation|directions|recipe|method|cook|bake|serve/i.test(
        text
      );

    // Boost score for elements with recipe keywords
    const adjustedDensity = hasRecipeKeywords ? density * 1.5 : density;

    // Update if this is the best candidate so far
    if (adjustedDensity > highestTextDensity) {
      highestTextDensity = adjustedDensity;
      bestElement = element;
    }
  });

  if (bestElement) {
    const html = bestElement.html();
    return html || null;
  }

  return null;
}

/**
 * Extract the main content from an HTML document
 * This is a supplementary function that can be used if needed
 */
export const extractMainContent = (html: string): string => {
  try {
    const $ = cheerio.load(html);

    // Try to find the main content area - common selectors for recipe sites
    const contentSelectors = [
      "article",
      ".recipe-content",
      ".recipe",
      ".recipe-container",
      ".post-content",
      ".entry-content",
      "main",
      "#content",
      ".content",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 200) {
        return element.html() || "";
      }
    }

    // Fallback to body if no content container found
    return $("body").html() || html;
  } catch (error) {
    console.warn("Error extracting main content:", error);
    return html;
  }
};

// Export the module
export default {
  fetchHtmlFromUrl,
  extractMainContent,
};
