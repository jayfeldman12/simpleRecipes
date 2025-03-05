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
export async function processImageUrl(imageUrl: string): Promise<string> {
  try {
    // Skip processing if it's already a CloudFront URL or doesn't exist
    if (!imageUrl || imageUrl.includes(cloudfrontDomain as string)) {
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
    // Return the original URL if there's an error
    return imageUrl;
  }
}
