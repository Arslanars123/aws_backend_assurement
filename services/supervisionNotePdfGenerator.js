const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Initialize S3 client
let s3Client = null;
const isS3Configured =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET_NAME &&
  process.env.AWS_REGION;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate a supervision note PDF and upload to S3
 * @param {Object} note - The supervision note data
 * @param {Object} apiData - Additional API data (company, project, etc.)
 * @returns {Promise<string>} S3 URL of the uploaded PDF
 */
async function generateSupervisionNotePdf(note, apiData) {
  try {
    console.log(`Generating PDF for supervision note: ${note._id}`);

    // Generate HTML for the supervision note
    const html = generateSupervisionNoteHtml(note, apiData);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();

    // Upload to S3
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const s3Filename = `supervision-notes/${note._id}-${uniqueSuffix}.pdf`;

    if (isS3Configured && s3Client) {
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Filename,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Filename}`;
      console.log(`PDF uploaded to S3: ${s3Url}`);
      return s3Url;
    } else {
      // If S3 is not configured, save locally and return local URL
      const localPath = path.join(
        __dirname,
        "../uploads",
        `supervision-note-${note._id}.pdf`
      );
      fs.writeFileSync(localPath, pdfBuffer);
      return `/uploads/supervision-note-${note._id}.pdf`;
    }
  } catch (error) {
    console.error(`Error generating PDF for note ${note._id}:`, error);
    throw error;
  }
}

/**
 * Generate HTML for supervision note
 */
function generateSupervisionNoteHtml(note, apiData) {
  const source = apiData?.source || "SupervisionNote";

  // Determine heading based on source
  const getHeading = () => {
    switch (source) {
      case "AddressNotesTable":
        return "ADDRESS NOTES";
      case "NewAgreementTable":
        return "NEW AGREEMENT";
      case "SafetyMentionTable":
        return "SAFETY MENTION";
      case "TechnicalRequestTable":
        return "TECHNICAL REQUEST";
      default:
        return "SUPERVISION NOTE SN-OX";
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Generate images/drawings HTML
  const drawingsHtml = generateDrawingsHtml(note);
  const annotatedPdfsHtml = generateAnnotatedPdfsHtml(note);
  const markPicturesHtml = generateMarkPicturesHtml(note);
  const buildingPartImageHtml = generateBuildingPartImageHtml(note);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .supervision-note-container {
          width: 100%;
          background-color: #ffffff;
        }
        .supervision-note-page {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          position: relative;
        }
        .supervision-note-header {
          background-color: #1e3a8a;
          color: white;
          padding: 15px 40px;
          width: 100%;
        }
        .supervision-note-header-title {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .supervision-note-title-section {
          display: flex;
          align-items: center;
          gap: 30px;
          padding: 30px 40px;
        }
        .supervision-note-main-title {
          font-size: 28px;
          font-weight: bold;
          color: #374151;
          margin: 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .supervision-note-separator {
          height: 1px;
          background-color: #d1d5db;
          margin: 0 40px;
        }
        .supervision-note-project-details {
          padding: 30px 40px;
        }
        .supervision-note-section-title {
          font-size: 18px;
          font-weight: bold;
          color: #374151;
          margin: 0 0 25px 0;
        }
        .supervision-note-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .supervision-note-form-row {
          display: flex;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          min-height: 40px;
        }
        .supervision-note-form-label {
          min-width: 150px;
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          padding: 10px 15px;
          flex-shrink: 0;
        }
        .supervision-note-form-field {
          flex: 1;
          height: 20px;
          border-bottom: 1px solid #d1d5db;
          margin: 10px 15px;
          background-color: transparent;
        }
        .supervision-note-content-section {
          padding: 30px 40px;
        }
        .supervision-note-content-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .supervision-note-content-title-left {
          font-size: 16px;
          font-weight: bold;
          color: #374151;
          margin: 0;
        }
        .supervision-note-content-box {
          border: 1px solid #d1d5db;
          background-color: #ffffff;
          border-radius: 4px;
          overflow: visible;
          margin-bottom: 20px;
        }
        .supervision-note-content-box div {
          padding: 15px;
        }
        .supervision-note-content-box h4 {
          margin: 0 0 15px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .supervision-note-content-box img {
          width: 100%;
          height: auto;
          object-fit: contain;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .supervision-note-content-box iframe {
          width: 100%;
          height: 500px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .supervision-note-bottom-section {
          padding: 20px 40px;
          border-top: 1px solid #e5e7eb;
        }
        .supervision-note-bottom-text {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="supervision-note-container">
        <div class="supervision-note-page">
          <div class="supervision-note-header">
            <span class="supervision-note-header-title">26. INSPECTION NOTES</span>
          </div>

          <div class="supervision-note-title-section">
            <h1 class="supervision-note-main-title">${getHeading()}</h1>
          </div>

          <div class="supervision-note-separator"></div>

          <div class="supervision-note-project-details">
            <h2 class="supervision-note-section-title">Project details</h2>

            <div class="supervision-note-form-grid">
              <div class="supervision-note-form-column">
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">SUBJECT:</label>
                  <div class="supervision-note-form-field">${
                    note?.item || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">MAIL SENT DATE</label>
                  <div class="supervision-note-form-field">${formatDate(
                    note?.created_at
                  )}</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">PROJECT NAME</label>
                  <div class="supervision-note-form-field">${
                    apiData?.projectDetail?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">CUSTOMER</label>
                  <div class="supervision-note-form-field">${
                    apiData?.companyDetails?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">ADDRESS:</label>
                  <div class="supervision-note-form-field">${
                    apiData?.companyDetails?.address || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">RECIPIENT'S NAME:</label>
                  <div class="supervision-note-form-field">${
                    note?.users?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">HANDICRAFT</label>
                  <div class="supervision-note-form-field">${
                    note?.profession?.GroupName || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">INSPECTED DATE</label>
                  <div class="supervision-note-form-field">${formatDate(
                    note?.created_at
                  )}</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">FOLLOW-UP REQUIRED</label>
                  <div class="supervision-note-form-field">${
                    note?.comment && note.comment !== "null" ? note.comment : ""
                  }</div>
                </div>
              </div>

              <div class="supervision-note-form-column">
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">CREATED DATE</label>
                  <div class="supervision-note-form-field">${formatDate(
                    note?.created_at
                  )}</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">PREPARED BY</label>
                  <div class="supervision-note-form-field">${
                    apiData?.companyDetails?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">PROJECT ID</label>
                  <div class="supervision-note-form-field">${
                    apiData?.projectDetail?._id || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">BUILDING PART</label>
                  <div class="supervision-note-form-field">${
                    note?.buildingPart?.buildingPartDetail?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">PROFESSION</label>
                  <div class="supervision-note-form-field">${
                    note?.profession?.SubjectMatterId || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">RECIPIENT'S EMAIL</label>
                  <div class="supervision-note-form-field">${
                    note?.users?.username || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">PROJECT MANAGER</label>
                  <div class="supervision-note-form-field">${
                    note?.projectManager?.name || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">USER ROLE</label>
                  <div class="supervision-note-form-field">${
                    note?.users?.userRole || ""
                  }</div>
                </div>
                <div class="supervision-note-form-row">
                  <label class="supervision-note-form-label">NOTE ID</label>
                  <div class="supervision-note-form-field">${
                    note?._id || ""
                  }</div>
                </div>
              </div>
            </div>
          </div>

          <div class="supervision-note-separator"></div>

          <div class="supervision-note-content-section">
            <div class="supervision-note-content-header">
              <h3 class="supervision-note-content-title-left">DOCUMENTATION</h3>
            </div>

            <div class="supervision-note-content-boxes">
              ${drawingsHtml}
              ${buildingPartImageHtml}
              ${annotatedPdfsHtml}
              ${markPicturesHtml}
            </div>
          </div>

          <div class="supervision-note-bottom-section">
            <div class="supervision-note-bottom-text">QUESTIONS ABOUT RISKS AND</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateDrawingsHtml(note) {
  if (!note?.drawing?.mainDrawings || note.drawing.mainDrawings.length === 0) {
    return "";
  }

  return note.drawing.mainDrawings
    .map(
      (mainDrawing, index) => `
    <div class="supervision-note-content-box">
      <div>
        <h4>Main Drawing: ${mainDrawing.originalname}</h4>
        <p>Drawing preview - Reference: ${mainDrawing.s3Location}</p>
      </div>
    </div>
  `
    )
    .join("");
}

function generateAnnotatedPdfsHtml(note) {
  if (!note?.annotatedPdfs || note.annotatedPdfs.length === 0) {
    return "";
  }

  return `
    <div class="supervision-note-content-box">
      <div>
        <h4>Annotated Drawings</h4>
        ${note.annotatedPdfs
          .map(
            (pdf, index) => `
          <div style="margin-bottom: 15px;">
            <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${pdf.originalname}</p>
            <p style="font-size: 11px; color: #9ca3af;">Reference: ${pdf.s3Location}</p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function generateMarkPicturesHtml(note) {
  if (!note?.markPictureObjects || note.markPictureObjects.length === 0) {
    return "";
  }

  return `
    <div class="supervision-note-content-box">
      <div>
        <h4>Mark Pictures</h4>
        ${note.markPictureObjects
          .map(
            (pic, index) => `
          <div style="margin-bottom: 15px;">
            ${
              pic.description
                ? `<p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${pic.description}</p>`
                : ""
            }
            <p style="font-size: 11px; color: #9ca3af;">Reference: ${
              pic.s3Location
            }</p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function generateBuildingPartImageHtml(note) {
  if (!note?.buildingPart?.buildingPartDetail?.image?.s3Location) {
    return "";
  }

  return `
    <div class="supervision-note-content-box">
      <div>
        <h4>Building Part: ${note.buildingPart.buildingPartDetail.name}</h4>
        <p style="font-size: 11px; color: #9ca3af;">Reference: ${note.buildingPart.buildingPartDetail.image.s3Location}</p>
      </div>
    </div>
  `;
}

module.exports = { generateSupervisionNotePdf };
