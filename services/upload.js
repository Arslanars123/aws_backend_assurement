const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let s3Client = null;
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.S3_BUCKET_NAME
);

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

class DualStorage {
  constructor() {
    this.localStorage = localStorage;
  }

  _handleFile(req, file, cb) {
    this.localStorage._handleFile(req, file, (localError, localFile) => {
      if (localError) {
        return cb(localError);
      }

      // Store local file info
      const fileInfo = {
        ...localFile,
        filename: localFile.filename,
        path: localFile.path,
        destination: localFile.destination,
      };

      // If S3 is configured, also upload to S3
      if (isS3Configured && s3Client) {
        // Resolve path to absolute path if it's relative
        // localFile.path from multer should be absolute, but handle both cases
        let filePath = localFile.path;
        
        // If path is relative, try to resolve it
        if (!path.isAbsolute(filePath)) {
          // Try multiple possible base paths
          const possiblePaths = [
            path.resolve(process.cwd(), filePath), // Most likely - relative to cwd
            path.resolve(__dirname, '..', filePath),
            path.resolve(__dirname, '..', '..', filePath),
            path.resolve(process.cwd(), 'reports_backend', 'aws_backend_assurement', filePath),
          ];
          
          // Find the first path that exists
          const existingPath = possiblePaths.find(p => {
            try {
              return fs.existsSync(p);
            } catch (e) {
              return false;
            }
          });
          
          filePath = existingPath || possiblePaths[0];
        }
        
        // Check if local file exists before trying to read it
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ Local file not found for S3 upload:`);
          console.warn(`   Attempted path: ${filePath}`);
          console.warn(`   Original path: ${localFile.path}`);
          console.warn(`   Current working directory: ${process.cwd()}`);
          console.warn(`   __dirname: ${__dirname}`);
          console.warn(`   File will be stored locally only (no S3 upload)`);
          // Continue with local file info only - don't fail the upload
          cb(null, fileInfo);
          return;
        }

        try {
          // Double-check file exists right before reading (in case of race conditions)
          if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File disappeared before S3 upload: ${filePath}`);
            cb(null, fileInfo);
            return;
          }

          const fileStream = fs.createReadStream(filePath);
          
          // Handle file stream errors
          fileStream.on('error', (streamError) => {
            console.error(`❌ Error reading file stream for S3 upload: ${filePath}`, streamError);
            // Continue with local file info even if stream fails
            cb(null, fileInfo);
          });

          const uniqueSuffix = crypto.randomBytes(16).toString("hex");
          const s3Filename = uniqueSuffix + "-" + file.originalname;

          const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Filename,
            Body: fileStream,
            ContentType: file.mimetype,
          };

          s3Client
            .send(new PutObjectCommand(uploadParams))
            .then((data) => {
              fileInfo.s3Key = s3Filename;
              fileInfo.s3Location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Filename}`;
              console.log(`✅ Successfully uploaded to S3: ${file.originalname} -> ${s3Filename}`);
              cb(null, fileInfo);
            })
            .catch((s3Error) => {
              console.error("❌ S3 upload error:", s3Error);
              // Continue with local file even if S3 fails
              cb(null, fileInfo);
            });
        } catch (readError) {
          console.error(`❌ Error reading local file for S3 upload: ${filePath}`, readError);
          console.error(`   Error details: ${readError.message}`);
          console.error(`   Stack: ${readError.stack}`);
          // Continue with local file info even if read fails
          cb(null, fileInfo);
        }
      } else {
        // S3 not configured, just use local storage
        cb(null, fileInfo);
      }
    });
  }

  _removeFile(req, file, cb) {
    fs.unlink(file.path, cb);
  }
}

const upload = multer({ storage: new DualStorage() });

module.exports = { upload };
