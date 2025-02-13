const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  endpoint: process.env.VULTR_ENDPOINT || "https://ewr1.vultrobjects.com",
  region: "ewr1",
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY,
    secretAccessKey: process.env.VULTR_SECRET_KEY,
  },
  forcePathStyle: true,
});

module.exports = s3Client;
