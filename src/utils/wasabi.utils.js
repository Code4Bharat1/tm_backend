// utils/wasabi.utils.js (fully updated, clean, reusable)

import AWS from "aws-sdk";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const wasabiEndpoint = new AWS.Endpoint(process.env.WASABI_ENDPOINT);

const s3 = new AWS.S3({
  endpoint: wasabiEndpoint,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: "v4",
});

const BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * Uploads any buffer or multer file to Wasabi cleanly.
 * Automatically generates a UUID-based filename if not provided.
 * Supports organized folder structure for clear segregation.
 * Returns { fileUrl, fileName, wasabiKey }
 */
export const uploadFileToWasabi = async ({
  buffer,
  originalName,
  folder = "",
  mimetype = "application/octet-stream",
  fileName = null,
}) => {
  if (!buffer || !originalName) {
    throw new Error("Missing buffer or originalName for Wasabi upload.");
  }

  const ext = path.extname(originalName || "file");
  const finalFileName = fileName || `${uuidv4()}${ext}`;
  const wasabiKey = folder ? `${folder}/${finalFileName}` : finalFileName;

  const params = {
    Bucket: BUCKET,
    Key: wasabiKey,
    Body: buffer,
    ContentType: mimetype,
    ACL: "public-read", // adjust as needed
  };

  await s3.putObject(params).promise();

  const fileUrl = `https://${BUCKET}.${process.env.WASABI_ENDPOINT}/${wasabiKey}`;

  return {
    fileUrl,
    fileName: finalFileName,
    wasabiKey,
  };
};

/**
 * Deletes an object from Wasabi by its key.
 */
export const deleteFromWasabi = async (wasabiKey) => {
  if (!wasabiKey) throw new Error("Missing wasabiKey for deletion.");

  const params = {
    Bucket: BUCKET,
    Key: wasabiKey,
  };

  await s3.deleteObject(params).promise();
};

/**
 * Example usage in your report generation cron:
 *
 * const { fileUrl } = await uploadFileToWasabi({
 *   buffer,
 *   originalName: fileName,
 *   folder: `attendance-reports/${year}/${month}`,
 *   mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
 * });
 *
 * This ensures consistent, reusable, organized Wasabi uploads across all your pipelines.
 */
