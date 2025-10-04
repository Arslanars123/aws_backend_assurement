const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
const fs = require("fs");
const crypto = require("crypto");

// Check if S3 configuration is available
const hasS3Config =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.S3_BUCKET_NAME;

// Configure AWS S3 only if environment variables are present
let s3 = null;
if (hasS3Config) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
}

// Create storage configuration based on S3 availability
let storage;

if (hasS3Config) {
  // Dual storage configuration (local + S3)
  storage = {
    _handleFile: function (req, file, cb) {
      const uniqueSuffix = crypto.randomBytes(16).toString("hex");
      const filename = uniqueSuffix + "-" + file.originalname;

      const localStorage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, "uploads/");
        },
        filename: (req, file, cb) => {
          cb(null, filename);
        },
      });

      const s3Storage = multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
          cb(null, filename);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
      });

      localStorage._handleFile(req, file, (err, localResult) => {
        if (err) {
          return cb(err);
        }

        s3Storage._handleFile(req, file, (err, s3Result) => {
          if (err) {
            console.error("S3 upload failed:", err);
            return cb(null, {
              ...localResult,
              s3Error: err.message,
            });
          }

          cb(null, {
            ...localResult,
            s3Location: s3Result.location,
            s3Key: s3Result.key,
          });
        });
      });
    },

    _removeFile: function (req, file, cb) {
      if (file.path) {
        fs.unlink(file.path, cb);
      } else {
        cb();
      }
    },
  };
} else {
  console.log("S3 configuration missing, using local storage only");
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = crypto.randomBytes(16).toString("hex");
      const filename = uniqueSuffix + "-" + file.originalname;
      cb(null, filename);
    },
  });
}

const upload = multer({ storage: storage });

module.exports = { upload, storage };
