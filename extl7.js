// supervision-note-comments.js
// Run:
//   npm i express pdfkit
//   node supervision-note-comments.js
//
// Download:
//   http://localhost:3000/download

const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

/** A4 */
const PAGE = { w: 595.28, h: 841.89 };

// Colors (same style as your other finalized reports)
const NAVY = "#001f54";
const GREY = "#d9d9d9";
const TEXT_NAVY = "#00173e";
const TITLE_GREY = "#595959";
const BODY_GREY = "#666666";
const RED = "#ee0000";
const BLACK = "#000000";
const WHITE = "#ffffff";

// Main content bounds used in your PDFs
const X0 = 65.88;
const X1 = 552.36;
const W = X1 - X0;

// Global padding below each blue bar (prevents “touching”)
const BAR_GAP = 10;

/** Thin line in your PDF (0.48pt height filled rect) */
function thinLine(doc, x, y, w) {
  doc.save().fillColor(BLACK).rect(x, y, w, 0.48).fill().restore();
}

/** Dark blue section bar (returns y AFTER bar) */
function sectionBar(doc, y, text) {
  const h = 26.76;
  doc.save().fillColor(NAVY).rect(X0, y, W, h).fill().restore();

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(WHITE)
    .text(text, X0 + 5.04, y + 7.2, { width: W - 10 });

  return y + h;
}

/** Footer bar */
function footerBar(doc, pageNo) {
  const y = 733.32;
  const h = 26.76;

  doc.save().fillColor(NAVY).rect(65.04, y, 486.48, h).fill().restore();

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(WHITE)
    .text(`Side ${pageNo} af 2`, 81.0, y + 8.2);

  const cx = 308.28;
  const cy = y + h / 2 + 0.8;

  doc.save().strokeColor(WHITE).lineWidth(1.4);
  doc.circle(cx - 18, cy, 9).stroke();
  doc
    .moveTo(cx - 25, cy + 6)
    .lineTo(cx - 18, cy - 6)
    .lineTo(cx - 11, cy + 6)
    .stroke();
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(9.35)
    .fillColor(WHITE)
    .text("Assurement", cx - 4, y + 8.2, { width: 120, align: "left" });
}

/** Placeholder box with centered label */
function placeholderBox(doc, x, y, w, h, label) {
  doc
    .save()
    .lineWidth(1)
    .strokeColor(BLACK)
    .rect(x, y, w, h)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(TITLE_GREY)
    .text(label, x, y + h / 2 - 5, { width: w, align: "center" });
}

function labelStyle(doc) {
  return doc.font("Helvetica").fontSize(9.35).fillColor(TEXT_NAVY);
}
function greyBody(doc) {
  return doc.font("Helvetica").fontSize(9.35).fillColor(BODY_GREY);
}
function redStyle(doc) {
  return doc.font("Helvetica").fontSize(7.54).fillColor(RED);
}

/** ✅ clipped paragraph helper (prevents overlap) */
function clippedText(doc, x, y, w, h, drawFn) {
  doc.save();
  doc.rect(x, y, w, h).clip();
  drawFn();
  doc.restore();
}

/** Page 1 */
function page1(doc, d) {
  // Top-left icon placeholder
  placeholderBox(doc, 64.8, 35.04, 47.16, 61.8, "Picture");

  // Top-right admin logo
  doc.save().fillColor(NAVY).rect(474.48, 36.0, 77.88, 74.4).fill().restore();
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(WHITE)
    .text("ADMIN LOGO", 474.48, 36.0 + 30, { width: 77.88, align: "center" });

  // Title line
  doc
    .font("Helvetica")
    .fontSize(28.17)
    .fillColor(TITLE_GREY)
    .text("SUPERVISION NOTE SN-", 118.44, 40.8, { continued: true });

  doc
    .font("Helvetica")
    .fillColor(RED)
    .text(d.uniquePrefix || "0x");

  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.uniqueNoLabel || "Unique no", 402.0, 56.4);

  // TITLE row
  const titleY = 72.8;
  doc
    .font("Helvetica")
    .fontSize(16.89)
    .fillColor(TITLE_GREY)
    .text("TITLE:", 118.44, titleY, { continued: true });

  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text("  " + (d.title || "title from registration"));

  // PROJECT INFORMATION bar
  const piTop = 114.12;
  const piAfter = sectionBar(doc, piTop, "PROJECT INFORMATION") + BAR_GAP;

  // Column x positions
  const L1 = 70.92;
  const V1 = 150.6;
  const L2 = 270.84;
  const V2 = 397.56;

  // Rows (start using piAfter so bar doesn’t touch)
  labelStyle(doc).text("CREATED DATE:", L1, piAfter + 8.0);
  redStyle(doc).text(d.createdDate || "document date", V1, piAfter + 10.4);

  labelStyle(doc).text("CREATED BY:", L2, piAfter + 8.0);
  redStyle(doc).text(d.createdBy || "from registration", V2, piAfter + 10.4);

  labelStyle(doc).text("PROJECT NAME:", L1, piAfter + 23.2);
  redStyle(doc).text(d.projectName || "Project setup", V1, piAfter + 25.6);

  labelStyle(doc).text("PROJECT ID:", L2, piAfter + 23.2);
  redStyle(doc).text(d.projectId || "Project setup", V2, piAfter + 25.6);

  // Grey header row
  const greyY = piAfter + 38.4;
  doc.save().fillColor(GREY).rect(X0, greyY, W, 26.76).fill().restore();
  labelStyle(doc).text("CONTRACTOR", L1, greyY + 2.4);
  labelStyle(doc).text("MAIN CONTRACTOR /\nCUSTOMER:", L2, greyY + 2.4, {
    lineGap: 1,
  });

  redStyle(doc).text(d.contractorHeaderVal || "Project setup", V1, greyY + 5.0);
  redStyle(doc).text(d.mainHeaderVal || "Project setup", V2, greyY + 5.0);

  // Address rows
  const r1 = greyY + 29.6;
  labelStyle(doc).text("ADDRESS", L1, r1);
  redStyle(doc).text(d.contractorAddress || "Project setup", V1, r1 + 2.4);

  labelStyle(doc).text("ADRESS:", L2, r1);
  redStyle(doc).text(d.mainAddress || "Project setup", V2, r1 + 2.4);

  const r2 = r1 + 15.2;
  labelStyle(doc).text("POSTCODE", L1, r2);
  redStyle(doc).text(d.contractorPostcode || "Project setup", V1, r2 + 2.4);

  labelStyle(doc).text("POSTCODE:", L2, r2);
  redStyle(doc).text(d.mainPostcode || "Project setup", V2, r2 + 2.4);

  const r3 = r2 + 15.2;
  labelStyle(doc).text("CITY", L1, r3);
  redStyle(doc).text(d.contractorCity || "Project setup", V1, r3 + 2.4);

  labelStyle(doc).text("CITY:", L2, r3);
  redStyle(doc).text(d.mainCity || "Project setup", V2, r3 + 2.4);

  const r4 = r3 + 15.2;
  labelStyle(doc).text("CVR", L1, r4);
  redStyle(doc).text(d.contractorCVR || "Project setup", V1, r4 + 2.4);

  labelStyle(doc).text("CVR:", L2, r4);
  redStyle(doc).text(d.mainCVR || "Project setup", V2, r4 + 2.4);

  // STATUS OVERVIEW bar
  const soBarY = 265.8;
  const soAfter = sectionBar(doc, soBarY, "STATUS OVERVIEW") + BAR_GAP;

  // ✅ paragraph is CLIPPED into fixed box so table never overlaps
  const paraX = 70.92;
  const paraW = W - 10.08;

  const tableHeaderY = 372.8; // fixed table header position
  const paraTop = soAfter; // start under the bar gap
  const paraH = tableHeaderY - paraTop - 10; // leave clear gap before table

  clippedText(doc, paraX, paraTop, paraW, paraH, () => {
    greyBody(doc)
      .fontSize(9.05)
      .text(
        "As a contractor associated with the project at the ",
        paraX,
        paraTop,
        { width: paraW, continued: true, lineGap: 0.6 }
      );

    doc.font("Helvetica").fontSize(9.05).fillColor(RED).text("above address,", {
      continued: true,
    });

    doc
      .font("Helvetica")
      .fontSize(8.05)
      .fillColor(BODY_GREY)
      .text(
        " I have, in connection with inspections or work processes on site, recorded conditions that are carried out by other contractors, or are not included in the project material. This requires attention from the construction management and its advisors to avoid bottlenecks with errors and deficiencies that subsequently need to be corrected. Therefore, a self-inspection by the management and a written response on whether any changes are needed in relation to the executed work is recommended.",
        { width: paraW, lineGap: 0.6 }
      );
  });

  // Table headers
  labelStyle(doc).text("DATE:", 70.92, tableHeaderY);
  labelStyle(doc).text("STATUS", 150.6, tableHeaderY);
  labelStyle(doc).text("RECIPIENT NAME", 270.84, tableHeaderY);
  labelStyle(doc).text("RECIPTIENT E-MAIL:", 397.56, tableHeaderY);

  thinLine(doc, 65.88, 388.08, 552.36 - 65.88);

  // Values row
  const TV_Y = 389.2;
  redStyle(doc).text(d.statusDate || "document date", 70.92, TV_Y);
  redStyle(doc).text(d.statusValue || "from registration", 150.6, TV_Y);
  redStyle(doc).text(d.recipientName || "from registration", 270.84, TV_Y);
  redStyle(doc).text(d.recipientEmail || "from registration", 397.56, TV_Y);

  // LOCATION bar
  const locAfter = sectionBar(doc, 412.92, "LOCATION") + BAR_GAP;

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TITLE_GREY)
    .text(
      "Below are inserted drawings indicating where control has been performed in connection with the supervision",
      70.92,
      locAfter,
      { width: W - 10, lineBreak: false }
    );

  labelStyle(doc).text("DRAWING ID:", 70.92, locAfter + 16.0);
  labelStyle(doc).text(d.drawingIdLabel || "SITE PLAN", 150.6, locAfter + 16.0);

  thinLine(doc, 65.88, locAfter + 29.2, 552.36 - 65.88);

  redStyle(doc).text(
    d.markedDrawing || "MARKED DRAWING From PHOTO registration",
    150.6,
    locAfter + 31.0,
    { width: 360, lineBreak: false }
  );

  // SUPERVISION OVERVIEW bar
  const supAfter = sectionBar(doc, 593.76, "SUPERVISION OVERVIEW") + BAR_GAP;

  const S_HY = supAfter + 6.0;
  labelStyle(doc).text("SN-ID:", 70.92, S_HY);
  labelStyle(doc).text("DESCRIPTION:", 150.6, S_HY);
  labelStyle(doc).text("PHOTO:", 274.08, S_HY);
  redStyle(doc).text(d.photoHint || "from registration", 304.8, S_HY + 2.0);

  thinLine(doc, 65.88, S_HY + 15.0, 552.36 - 65.88);

  const S_VY = S_HY + 16.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("SN-", 70.92, S_VY);
  redStyle(doc).text(d.uniqueNo || "Unique no", 86.04, S_VY + 2.0);

  redStyle(doc).text(
    d.supervisionDesc || "from PHOTO registration",
    150.6,
    S_VY + 2.0,
    { width: 240, lineBreak: false }
  );

  placeholderBox(doc, 425.4, 638.04, 121.92, 93.6, "Picture");

  footerBar(doc, 1);
}

/** Page 2 (same as earlier — kept stable) */
function page2(doc, d) {
  sectionBar(doc, 40.08, "FOLLOW-UP REQUIRED");
  const H1 = 40.08 + 26.76 + BAR_GAP + 2;

  labelStyle(doc).text("SN-ID:", 70.92, H1);
  labelStyle(doc).text("COMPLETED DATE", 150.6, H1);
  labelStyle(doc).text("PHOTO:", 274.08, H1);
  redStyle(doc).text(d.photoHint || "from registration", 304.8, H1 + 2.0);

  thinLine(doc, 65.88, H1 + 14.0, 552.36 - 65.88);

  const V1 = H1 + 15.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("SN-", 70.92, V1);
  redStyle(doc).text(d.uniqueNo || "Unique no", 86.04, V1 + 2.0);
  redStyle(doc).text(d.completedDate || "from registration", 150.6, V1 + 2.0);

  placeholderBox(doc, 427.44, 83.76, 119.28, 91.56, "Picture");

  sectionBar(doc, 181.32, "OVERVIEW OF RISKS AND ISSUES");
  const H2 = 181.32 + 26.76 + BAR_GAP - 2;

  labelStyle(doc).text("SN-ID:", 70.92, H2);
  labelStyle(doc).text("ISSUE", 150.6, H2);
  labelStyle(doc).text("RECEPTIENT", 374.16, H2);
  labelStyle(doc).text("DATE", 477.36, H2);

  thinLine(doc, 65.88, H2 + 14.0, 552.36 - 65.88);

  const V2 = H2 + 15.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("SN-", 70.92, V2);
  redStyle(doc).text(d.uniqueNo || "Unique no", 85.68, V2 + 2.0);
  redStyle(doc).text(d.riskIssue || "from registration", 150.6, V2 + 2.0, {
    width: 210,
    lineBreak: false,
  });
  redStyle(doc).text(d.riskRecipient || "from registration", 374.16, V2 + 2.0, {
    width: 100,
    lineBreak: false,
  });
  redStyle(doc).text(d.riskDate || "Registration DATE", 477.36, V2 + 2.0, {
    width: 75,
    lineBreak: false,
  });

  thinLine(doc, 65.16, V2 + 24.0, 552.36 - 65.16);

  sectionBar(doc, 246.36, "CONCLUSIONS/RECOMMENDATIONS");
  const H3 = 246.36 + 26.76 + BAR_GAP - 2;

  labelStyle(doc).text("SN-ID:", 70.92, H3);
  labelStyle(doc).text("RECOMMENDATION/CONCLUSION", 150.6, H3);
  labelStyle(doc).text("RECEPTIENT", 374.16, H3);
  labelStyle(doc).text("DATE", 477.36, H3);

  thinLine(doc, 65.88, H3 + 14.0, 552.36 - 65.88);

  const V3 = H3 + 15.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("SN-", 70.92, V3);
  redStyle(doc).text(d.uniqueNo || "Unique no", 85.68, V3 + 2.0);
  redStyle(doc).text(d.conclusion || "from registration", 150.6, V3 + 2.0, {
    width: 210,
    lineBreak: false,
  });
  redStyle(doc).text(
    d.conclusionRecipient || "from registration",
    374.16,
    V3 + 2.0,
    {
      width: 100,
      lineBreak: false,
    }
  );
  redStyle(doc).text(
    d.conclusionDate || "Registration DATE",
    477.36,
    V3 + 2.0,
    {
      width: 75,
      lineBreak: false,
    }
  );

  footerBar(doc, 2);
}

/** Generator (2 pages only) */
function generateSupervisionNoteReport(dynamic, outputStream) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(outputStream);

  page1(doc, dynamic);

  doc.addPage({ size: "A4", margin: 0 });
  page2(doc, dynamic);

  doc.end();
}

/** Routes */
app.get("/download", (req, res) => {
  try {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="SUPERVISION_NOTE.pdf"'
    );

    const dynamic = {
      uniquePrefix: "0x",
      uniqueNoLabel: "Unique no",
      uniqueNo: "Unique no",

      title: "title from registration",

      createdDate: "document date",
      createdBy: "from registration",
      projectName: "Project setup",
      projectId: "Project setup",

      contractorHeaderVal: "Project setup",
      mainHeaderVal: "Project setup",

      contractorAddress: "Project setup",
      contractorPostcode: "Project setup",
      contractorCity: "Project setup",
      contractorCVR: "Project setup",

      mainAddress: "Project setup",
      mainPostcode: "Project setup",
      mainCity: "Project setup",
      mainCVR: "Project setup",

      statusDate: "document date",
      statusValue: "from registration",
      recipientName: "from registration",
      recipientEmail: "from registration",

      drawingIdLabel: "SITE PLAN",
      markedDrawing: "MARKED DRAWING From PHOTO registration",

      photoHint: "from registration",
      supervisionDesc: "from PHOTO registration",

      completedDate: "from registration",
      riskIssue: "from registration",
      riskRecipient: "from registration",
      riskDate: "Registration DATE",
      conclusion: "from registration",
      conclusionRecipient: "from registration",
      conclusionDate: "Registration DATE",
    };

    generateSupervisionNoteReport(dynamic, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("PDF generation failed");
  }
});

app.get("/", (req, res) => {
  res.send(
    `<h2>Supervision Note PDF</h2><p>Download: <a href="/download">/download</a></p>`
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
