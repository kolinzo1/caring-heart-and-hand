const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  endpoint: "https://89vi3j.stackhero-network.com:7909", // Your Stackhero endpoint
  region: "auto", // Use 'auto' for Stackhero
  credentials: {
    accessKeyId: process.env.STACKHERO_MINIO_ROOT_ACCESS_KEY,
    secretAccessKey: process.env.STACKHERO_MINIO_ROOT_SECRET_KEY,
  },
  forcePathStyle: true,
});

module.exports = s3Client;
