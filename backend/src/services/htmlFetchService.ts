import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Fetches HTML content from a given URL
 * @param url The URL to fetch HTML from
 * @returns The HTML content as a string or null if fetch fails
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
      validateStatus: (status: number) => status >= 200 && status < 400, // Accept 2xx and 3xx status codes
    };

    // Make the request
    const response = await axios.get(url, config);

    // Check response
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

    // Return optimized HTML content
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
    // Load HTML content into cheerio
    const $ = cheerio.load(htmlContent);

    // Remove all script and style tags
    $("script, style, noscript, iframe").remove();

    // Remove all SVG elements
    $("svg").remove();

    // Remove all image tags but keep their alt text as it might be useful
    $("img").each(function (this: any) {
      const altText = $(this).attr("alt");
      if (altText) {
        $(this).replaceWith(`<span>[Image: ${altText}]</span>`);
      } else {
        $(this).remove();
      }
    });

    // Remove social media widgets, comments, and other non-essential elements
    $(
      '[class*="social"], [class*="share"], [class*="comment"], [class*="widget"], [class*="sidebar"], [class*="banner"], [class*="ad-"], [id*="ad-"]'
    ).remove();

    // Look for the main content, prioritizing article tag or main content areas
    let mainContent =
      $("article").html() ||
      $("main").html() ||
      $(".recipe").html() ||
      $('[class*="recipe-"]').html() ||
      $('[class*="content"]').html() ||
      $('[class*="post"]').html() ||
      $('[itemprop="recipeInstructions"]').parent().html();

    // If we found a main content section, use it, otherwise use the body
    let resultHtml;
    if (mainContent) {
      // Create a new cheerio instance with just the main content
      const $main = cheerio.load(`<div>${mainContent}</div>`);

      // Further cleanup within the main content
      $main("header, footer, nav, aside").remove();

      resultHtml = $main.html();
      console.log("Using extracted main content section for recipe extraction");
    } else {
      // If no main content found, use the body but cleanup navigation, headers, footers
      $("header, footer, nav, aside").remove();
      resultHtml = $("body").html();
      console.log("No main content section found, using cleaned body content");
    }

    // Final cleanup
    if (resultHtml) {
      // Replace consecutive whitespace, newlines with a single space
      resultHtml = resultHtml.replace(/\s+/g, " ");
      return resultHtml;
    }

    // If all else fails, return the original HTML without scripts and styles
    return $("body").html() || htmlContent;
  } catch (error) {
    console.error("Error optimizing HTML:", error);
    // If there's an error in optimization, return the original content
    return htmlContent;
  }
}
