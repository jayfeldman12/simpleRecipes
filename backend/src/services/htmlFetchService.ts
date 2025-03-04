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

    // Remove non-content elements
    $("script, style, noscript, iframe").remove();
    $("svg").remove();

    // Replace images with their alt text
    $("img").each(function (this: any) {
      const altText = $(this).attr("alt");
      if (altText) {
        $(this).replaceWith(`<span>[Image: ${altText}]</span>`);
      } else {
        $(this).remove();
      }
    });

    // Remove distracting elements
    $(
      '[class*="social"], [class*="share"], [class*="comment"], [class*="widget"], [class*="sidebar"], [class*="banner"], [class*="ad-"], [id*="ad-"]'
    ).remove();

    // Find the main content, prioritizing recipe-specific containers
    let mainContent =
      $("article").html() ||
      $("main").html() ||
      $(".recipe").html() ||
      $('[class*="recipe-"]').html() ||
      $('[class*="content"]').html() ||
      $('[class*="post"]').html() ||
      $('[itemprop="recipeInstructions"]').parent().html();

    let resultHtml;
    if (mainContent) {
      // Further clean the main content
      const $main = cheerio.load(`<div>${mainContent}</div>`);
      $main("header, footer, nav, aside").remove();
      resultHtml = $main.html();
      console.log("Using extracted main content section for recipe extraction");
    } else {
      // Use body content with navigation elements removed
      $("header, footer, nav, aside").remove();
      resultHtml = $("body").html();
      console.log("No main content section found, using cleaned body content");
    }

    if (resultHtml) {
      // Normalize whitespace
      resultHtml = resultHtml.replace(/\s+/g, " ");
      return resultHtml;
    }

    return $("body").html() || htmlContent;
  } catch (error) {
    console.error("Error optimizing HTML:", error);
    return htmlContent;
  }
}
