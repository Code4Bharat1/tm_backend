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
 * Uploads a file to Wasabi
 * Returns file metadata, including a signed URL
 */
export const uploadToWasabi = async (
  fileBuffer,
  originalName,
  folder = "",
  mimetype = "application/octet-stream"
) => {
  const ext = path.extname(originalName);
  const fileName = `${folder ? folder + "/" : ""}${uuidv4()}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
    // ❌ Remove public-read ACL since your account doesn't support it
  };

  await s3.putObject(params).promise();

  // Generate a signed URL for private access
  const signedUrl = s3.getSignedUrl("getObject", {
    Bucket: BUCKET,
    Key: fileName,
    Expires: 60 * 10, // 10 minutes
  });

  return {
    fileUrl: signedUrl,
    fileName,
    wasabiKey: fileName,
  };
};

/**
 * Returns a signed URL to access an object
 */
export const getWasabiSignedUrl = (key, expiresInSeconds = 60 * 10) => {
  return s3.getSignedUrl("getObject", {
    Bucket: BUCKET,
    Key: key,
    Expires: expiresInSeconds,
  });
};

/**
 * Deletes an object from Wasabi
 */
export const deleteFromWasabi = async (fileName) => {
  const params = {
    Bucket: BUCKET,
    Key: fileName,
  };
  await s3.deleteObject(params).promise();
};
