import axios from "axios";

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

    // Return HTML content
    return response.data;
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
