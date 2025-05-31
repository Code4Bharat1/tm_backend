import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getPresignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadFileToS3 = async (file) => {
  const key = `uploads/${uuidv4()}-${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  return {
    Location: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    Key: key
  };
};

const getSignedUrl = async (s3Url) => {
  const key = new URL(s3Url).pathname.slice(1); // removes the first `/`
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getPresignedUrl(s3, command, { expiresIn: 3600 });
  return signedUrl;
};

const deleteFilesFromS3 = async (s3Url) => {
  const key = new URL(s3Url).pathname.slice(1);

  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  }));
};

export {
  uploadFileToS3,
  getSignedUrl,
  deleteFilesFromS3
};
