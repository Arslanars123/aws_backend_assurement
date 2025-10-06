const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3"); // Using AWS SDK v3
const crypto = require("crypto");
require("dotenv").config();

// Configure AWS S3 if environment variables are present
let s3Client = null;
if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.S3_BUCKET_NAME
) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Configure multer with multer-s3 for file upload to S3
const storage = multerS3({
  s3: s3Client,
  bucket: process.env.S3_BUCKET_NAME,
  key: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const filename = uniqueSuffix + "-" + file.originalname;
    cb(null, filename);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});

// Multer configuration for handling file upload
const upload = multer({ storage: storage });

module.exports = { upload };
