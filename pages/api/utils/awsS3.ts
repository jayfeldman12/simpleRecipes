import AWS from "aws-sdk";
import axios from "axios";
import { createReadStream, writeFile } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";

// Promisify writeFile
const writeFileAsync = promisify(writeFile);

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Create S3 service object
const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET_IMAGES;
const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

/**
 * Downloads an image from a URL and returns the local file path
 */
export async function downloadImage(imageUrl: string): Promise<string> {
  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });

    // Get the file extension from the URL or Content-Type
    const contentType = response.headers["content-type"];
    let extension = ".jpg"; // default extension

    if (contentType) {
      if (contentType.includes("jpeg") || contentType.includes("jpg")) {
        extension = ".jpg";
      } else if (contentType.includes("png")) {
        extension = ".png";
      } else if (contentType.includes("gif")) {
        extension = ".gif";
      } else if (contentType.includes("webp")) {
        extension = ".webp";
      }
    } else {
      // Try to get extension from URL
      const urlExtension = path
        .extname(new URL(imageUrl).pathname)
        .toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(urlExtension)) {
        extension = urlExtension;
      }
    }

    // Create a temporary file path
    const fileName = `recipe-image-${Date.now()}${extension}`;
    const filePath = path.join(tmpdir(), fileName);

    // Write the file
    await writeFileAsync(filePath, response.data);
    return filePath;
  } catch (error) {
    console.error("Error downloading image:", error);
    throw error;
  }
}

/**
 * Uploads an image to S3 and returns the S3 URL
 */
export async function uploadImageToS3(
  filePath: string,
  fileName: string
): Promise<string> {
  try {
    // Upload the file
    await s3
      .upload({
        Bucket: bucketName as string,
        Key: fileName,
        Body: createReadStream(filePath),
        ContentType: getContentType(fileName),
      })
      .promise();

    // Clean up the temporary file
    await unlink(filePath);

    // Return the CloudFront URL
    return `${cloudfrontDomain}/${fileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    // Clean up the temporary file on error
    try {
      await unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting temporary file:", unlinkError);
    }
    throw error;
  }
}

/**
 * Determines the content type from the file name
 */
function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Processes an image URL: downloads it and uploads to S3
 * Returns the new CloudFront URL
 */
export async function processImageUrl(
  imageUrl: string,
  retryCount = 0
): Promise<string> {
  try {
    // Skip processing if it's already a CloudFront URL or doesn't exist
    if (!imageUrl || imageUrl.includes(cloudfrontDomain as string)) {
      return imageUrl;
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (urlError) {
      console.error("Invalid URL format:", imageUrl);
      return imageUrl;
    }

    // Create a unique file name based on current time
    const fileExt = path.extname(new URL(imageUrl).pathname) || ".jpg";
    const fileName = `recipe-${Date.now()}${fileExt}`;

    // Download the image
    const localPath = await downloadImage(imageUrl);

    // Upload to S3
    const s3Url = await uploadImageToS3(localPath, fileName);

    return s3Url;
  } catch (error) {
    console.error("Error processing image:", error);

    // Retry logic (max 2 retries)
    if (retryCount < 2) {
      console.log(
        `Retrying image processing for ${imageUrl} (attempt ${retryCount + 1})`
      );
      return processImageUrl(imageUrl, retryCount + 1);
    }

    // Return the original URL if there's an error after retries
    return imageUrl;
  }
}

/**
 * Processes HTML content, finding all <img> tags,
 * downloading the images, uploading to S3, and replacing
 * the src attributes with CloudFront URLs
 */
export async function processImagesInHtml(
  htmlContent: string,
  sourceUrl?: string
): Promise<string> {
  if (!htmlContent) {
    return htmlContent;
  }

  // Safety check - if this doesn't look like HTML with images, return as is
  if (!/<img/i.test(htmlContent)) {
    return htmlContent;
  }

  try {
    // Create a regex to match all img tags with various src patterns
    const imgRegex =
      /<img[^>]*\s(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;
    let match;
    let processedHtml = htmlContent;
    let imagesToProcess: { originalUrl: string; fullMatch: string }[] = [];

    // Create URL object from source URL if available
    let baseUrl: URL | null = null;
    if (sourceUrl) {
      try {
        baseUrl = new URL(sourceUrl);
      } catch (error) {
        console.error("Invalid source URL:", error);
      }
    }

    // Find all images to process
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      let imgSrc = match[1];

      // Skip if already a CloudFront URL, data URLs, or SVG data
      if (
        imgSrc.includes(cloudfrontDomain as string) ||
        imgSrc.startsWith("data:") ||
        imgSrc.startsWith("blob:") ||
        imgSrc.includes("svg+xml")
      ) {
        continue;
      }

      // Handle relative URLs if we have a base URL
      if (baseUrl && !imgSrc.match(/^(https?:)?\/\//)) {
        try {
          // For absolute paths (starting with /)
          if (imgSrc.startsWith("/")) {
            imgSrc = `${baseUrl.protocol}//${baseUrl.host}${imgSrc}`;
          }
          // For relative paths (not starting with / or http)
          else if (!imgSrc.match(/^(https?:)?\/\//)) {
            // Get the directory part of the pathname
            const pathParts = baseUrl.pathname.split("/");
            pathParts.pop(); // Remove the last part (file name)
            const directory = pathParts.join("/");

            // Ensure directory ends with a slash for path joining
            const directoryWithSlash = directory.endsWith("/")
              ? directory
              : directory + "/";
            imgSrc = `${baseUrl.protocol}//${baseUrl.host}${directoryWithSlash}${imgSrc}`;
          }
        } catch (urlError) {
          console.error("Error processing relative URL:", urlError);
          // Continue with the original URL if there's an error
        }
      }

      // Validate URL structure
      try {
        new URL(imgSrc);

        // Add to processing queue - only if we have a valid URL
        imagesToProcess.push({
          originalUrl: imgSrc,
          fullMatch,
        });
      } catch (urlError) {
        console.warn(`Skipping invalid image URL: ${imgSrc}`);
        // Skip invalid URLs
      }
    }

    console.log(
      `Found ${imagesToProcess.length} images to process in HTML content`
    );

    // Process images in parallel with a limit to avoid overwhelming resources
    const batchSize = 5;
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (img) => {
          try {
            // Process the image URL
            const s3Url = await processImageUrl(img.originalUrl);

            // Replace in HTML - create a new img tag with the same attributes but updated src
            const updatedImgTag = img.fullMatch.replace(
              /\s(?:src|data-src|data-lazy-src)=["'][^"']+["']/i,
              ` src="${s3Url}"`
            );

            return {
              originalMatch: img.fullMatch,
              newTag: updatedImgTag,
              success: true,
            };
          } catch (error) {
            console.error(`Error processing image ${img.originalUrl}:`, error);
            // Return failure result
            return {
              originalMatch: img.fullMatch,
              newTag: img.fullMatch, // Keep original on error
              success: false,
            };
          }
        })
      );

      // Apply all successful replacements
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          processedHtml = processedHtml.replace(
            result.value.originalMatch,
            result.value.newTag
          );
        }
      });
    }

    return processedHtml;
  } catch (error) {
    console.error("Error processing images in HTML:", error);
    // Return original content if processing fails
    return htmlContent;
  }
}
