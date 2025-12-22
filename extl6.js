// adressed-note-comments.js
// Run:
//   npm i express pdfkit
//   node adressed-note-comments.js
//
// Download:
//   http://localhost:3000/download

const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

/** A4 */
const PAGE = { w: 595.28, h: 841.89 };

// Colors (matched to your PDF look)
const NAVY = "#001f54";
const GREY = "#d9d9d9";
const TEXT_NAVY = "#00173e";
const TITLE_GREY = "#595959";
const RED = "#ee0000";
const BLACK = "#000000";
const WHITE = "#ffffff";

// Main content bounds used in your PDF
const X0 = 65.88;
const X1 = 552.36;
const W = X1 - X0;

/** Thin line in your PDF (0.48pt height filled rect) */
function thinLine(doc, x, y, w) {
  doc.save().fillColor(BLACK).rect(x, y, w, 0.48).fill().restore();
}

/** Dark blue section bar */
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

/** Footer bar: left "Side X af 2", center "Company logo" placeholder */
function footerBar(doc, pageNo) {
  const y = 733.32;
  const h = 26.76;

  doc.save().fillColor(NAVY).rect(65.04, y, 486.48, h).fill().restore();

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(WHITE)
    .text(`Side ${pageNo} af 2`, 81.0, y + 8.2);

  // center "Company logo" placeholder (no images)
  const boxW = 90;
  const boxH = 18;
  const boxX = 257.04 - 18;
  const boxY = y + 4;

  doc
    .save()
    .lineWidth(1)
    .strokeColor(WHITE)
    .rect(boxX, boxY, boxW, boxH)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(WHITE)
    .text("Company logo", boxX, boxY + 4, { width: boxW, align: "center" });
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

/** ✅ Safe clipped paragraph (never overlaps next sections) */
function clippedParagraph(
  doc,
  x,
  y,
  w,
  h,
  text,
  { fontSize = 8.0, lineGap = 0, paragraphGap = 0 } = {}
) {
  doc.save();
  doc.rect(x, y, w, h).clip();
  doc.font("Helvetica").fontSize(fontSize).fillColor(BLACK);
  doc.text(text, x, y, { width: w, lineGap, paragraphGap });
  doc.restore();
}

/** Page 1 */
function page1(doc, d) {
  // Left top icon placeholder
  placeholderBox(doc, 67.44, 39.96, 51.72, 67.08, "Picture");

  // Right top "ADMIN LOGO" navy rounded box
  doc
    .save()
    .fillColor(NAVY)
    .roundedRect(484.32, 36.96, 67.2, 69.96, 12)
    .fill()
    .restore();
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(WHITE)
    .text("ADMIN\nLOGO", 484.32, 36.96 + 22, {
      width: 67.2,
      align: "center",
      lineGap: 2,
    });

  // Title line: "SAFETY MENTION SM-" + red "0x" + red "Unique no"
  doc
    .font("Helvetica")
    .fontSize(28.17)
    .fillColor(TITLE_GREY)
    .text("SAFETY MENTION SM-", 125.52, 40.8, { continued: true });

  doc
    .font("Helvetica")
    .fillColor(RED)
    .text(d.uniquePrefix || "0x", { continued: true });

  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text("  " + (d.uniqueNoLabel || "Unique no"), 372.6, 56.4);

  // TITLE row
  const titleY = 72.8;
  doc
    .font("Helvetica")
    .fontSize(16.89)
    .fillColor(TITLE_GREY)
    .text("TITLE:", 125.52, titleY, { continued: true });

  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text("  " + (d.title || "title from registration"), { continued: false });

  // PROJECT INFORMATION bar
  sectionBar(doc, 114.12, "PROJECT INFORMATION");

  // Column x positions
  const L1 = 70.92;
  const V1 = 177.72;
  const L2 = 310.92;
  const V2 = 410.88;

  const labelStyle = () =>
    doc.font("Helvetica").fontSize(9.35).fillColor(TEXT_NAVY);
  const redStyle = () => doc.font("Helvetica").fontSize(7.54).fillColor(RED);

  // Rows
  labelStyle().text("CREATED DATE:", L1, 149.6);
  redStyle().text(d.createdDate || "document date", V1, 152.0);

  labelStyle().text("CREATED BY:", L2, 149.6);
  redStyle().text(d.createdBy || "from registration", V2, 152.0);

  labelStyle().text("PROJECT NAME:", L1, 164.8);
  redStyle().text(d.projectName || "Project setup", V1, 167.2);

  labelStyle().text("PROJECT ID:", L2, 164.8);
  redStyle().text(d.projectId || "Project setup", V2, 167.2);

  // Grey header row (CONTRACTOR / MAIN CONTRACTOR)
  doc.save().fillColor(GREY).rect(X0, 180.0, W, 26.76).fill().restore();
  labelStyle().text("CONTRACTOR", L1, 182.4);
  labelStyle().text("MAIN CONTRACTOR /\nCUSTOME\u200BR:", L2, 182.4, {
    lineGap: 1,
  });

  // Contractor + Main contractor fields
  labelStyle().text("ADDRESS", L1, 209.6);
  redStyle().text(d.contractorAddress || "Project setup", V1, 212.0);

  labelStyle().text("ADRESS:", L2, 209.6);
  redStyle().text(d.mainAddress || "Project setup", V2, 212.0);

  labelStyle().text("POSTCODE", L1, 224.8);
  redStyle().text(d.contractorPostcode || "Project setup", V1, 227.2);

  labelStyle().text("POSTCODE:", L2, 224.8);
  redStyle().text(d.mainPostcode || "Project setup", V2, 227.2);

  labelStyle().text("CITY", L1, 240.0);
  redStyle().text(d.contractorCity || "Project setup", V1, 242.4);

  labelStyle().text("CITY:", L2, 240.0);
  redStyle().text(d.mainCity || "Project setup", V2, 242.4);

  labelStyle().text("CVR", L1, 255.2);
  redStyle().text(d.contractorCVR || "Project setup", V1, 257.6);

  labelStyle().text("CVR:", L2, 255.2);
  redStyle().text(d.mainCVR || "Project setup", V2, 257.6);

  // DESCRIPTION bar
  sectionBar(doc, 276.48, "DESCRIPTION");

  // ✅ DESCRIPTION paragraph (fit more lines, clipped, no overlap)
  const paraX = 70.92;
  const paraW = 486.48 - 10.08;
  const nextBarY = 393.72; // ADDRESSED TO starts here

  const paraY = 302.3; // slightly higher
  const paraH = nextBarY - paraY - 2; // max height without touching next bar

  const descriptionText =
    "The safety mention provides an overview of when communication has been sent out to the parties associated with the project, and it should have the effect that the respective party who has received the SAFETY NOTE is informed that There is a matter that needs to be addressed and which must be rectified (IMMEDIATELY), as the matter has/can have consequences for work processes and the overall project timeline, and the party to whom the notice is addressed will be held responsible (including delays and financial implications) which will then be attributed to the notified party.\n\n" +
    "The situation regarding health and safety on site requires attention, and must be rectified as soon as possible, as the situation can affect our workflow and safety on site.\n\n" +
    "Furthermore, it is pointed out that the construction management has full responsibility on site for compliance with these legal conditions.";

  clippedParagraph(doc, paraX, paraY, paraW, paraH, descriptionText, {
    fontSize: 7.85,
    lineGap: 0,
    paragraphGap: 0,
  });

  // ADDRESSED TO bar
  sectionBar(doc, 393.72, "ADDRESSED TO");

  // Header row + underline
  labelStyle().text("AN-ID", 70.92, 426.4);
  labelStyle().text("DATE", 177.72, 426.4);
  labelStyle().text("RECIPIENT NAME:", 310.92, 426.4);
  labelStyle().text("RECIPIENT EMAIL:", 410.88, 426.4);
  thinLine(doc, 65.88, 441.72, 406.08 - 65.88);

  // Values row
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("AN-", 70.92, 446.4);
  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.uniqueNo || "Unique no", 91.2, 446.4);
  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.docDate || "document date", 177.72, 446.4);
  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.recipientName || "from registration", 310.92, 446.4);
  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.recipientEmail || "from registration", 410.88, 446.4);

  // LOCATION bar
  sectionBar(doc, 463.44, "LOCATION");

  doc
    .font("Helvetica")
    .fontSize(8.2)
    .fillColor(TITLE_GREY)
    .text(
      "Below are drawings inserted indicating where inspections have been carried out in connection with recipient control/takeover",
      70.92,
      496.8,
      { width: W - 10, lineBreak: false }
    );

  // DRAWING ID line + value line
  labelStyle().text("DRAWING ID:", 70.92, 512.0);
  doc
    .font("Helvetica")
    .fontSize(7.54)
    .fillColor(RED)
    .text(d.drawingId || "MARKED DRAWING from registration", 177.72, 512.0);

  thinLine(doc, 172.92, 524.76, 552.36 - 172.92);

  // Footer
  footerBar(doc, 1);
}

/** Page 2 */
function page2(doc, d) {
  const labelStyle = () =>
    doc.font("Helvetica").fontSize(9.35).fillColor(TEXT_NAVY);
  const redStyle = () => doc.font("Helvetica").fontSize(7.54).fillColor(RED);

  // Column Xs (same as your reference)
  const X_AN = 70.92;
  const X_PRO = 111.0;
  const X_SUB = 177.72;
  const X_PHOTO = 410.88;

  const X_AN2 = 70.92;
  const X_ENT = 124.32;
  const X_SUB2 = 217.56;
  const X_CONS = 484.08;
  const X_CONS_VAL = 471.12; // value column starts slightly left for right-align

  // Column widths (hard limits so text cannot overlap)
  const W_PRO = X_SUB - X_PRO - 6; // Profession column width
  const W_SUB = 406.08 - X_SUB - 6; // Subject column (till photo area)
  const W_PHOTO = 552.36 - X_PHOTO - 6;

  const W_ENT = X_SUB2 - X_ENT - 6;
  const W_SUB2 = X_CONS_VAL - X_SUB2 - 6;
  const W_CONS = 552.36 - X_CONS_VAL - 6;

  // Helper: draw inline red hint after a blue label without overlap
  function drawLabelWithInlineHint(x, y, label, hint, maxWidth) {
    labelStyle().text(label, x, y, { width: maxWidth, lineBreak: false });

    const lw = doc.widthOfString(label, { font: "Helvetica", size: 9.35 });
    const hx = x + lw + 3;

    redStyle().text(hint, hx, y + 2.0, {
      width: Math.max(0, maxWidth - lw - 3),
      lineBreak: false,
    });
  }

  // =========================
  // REGISTRATIONS
  // =========================
  sectionBar(doc, 40.08, "REGISTRATIONS");

  const H_Y = 78.6;
  drawLabelWithInlineHint(X_AN, H_Y, "AN-NR:", "", X_PRO - X_AN - 6);
  drawLabelWithInlineHint(X_PRO, H_Y, "PROFESSION:", "", W_PRO);

  drawLabelWithInlineHint(
    X_SUB,
    H_Y,
    "SUBJECT/DESCRIPTION:",
    d.regFrom || "from registration",
    W_SUB
  );

  drawLabelWithInlineHint(
    X_PHOTO,
    H_Y,
    "PHOTO:",
    d.photoFrom || "from registration",
    W_PHOTO
  );

  thinLine(doc, 65.88, 92.08, 552.36 - 65.88);

  const V_Y = 98.0;

  // AN- + Unique no below it
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("AN-", X_AN, V_Y);

  redStyle().text(d.uniqueNo || "Unique\nno", X_AN + 20.3, V_Y + 7.2, {
    width: X_PRO - (X_AN + 20.3) - 6,
    lineGap: 0,
  });

  // Profession value
  redStyle().text(d.profession || "from registration", X_PRO, V_Y + 7.2, {
    width: W_PRO,
    lineBreak: false,
  });

  // Subject grey
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TITLE_GREY)
    .text(d.subjectPick || "Vælg et element.", X_SUB, V_Y, {
      width: W_SUB,
      lineBreak: false,
    });

  // Photo placeholder box
  placeholderBox(doc, 406.08, 103.0, 146.52, 98.0, "Picture");

  // =========================
  // THE COMPLAINT ENTAILS
  // =========================
  sectionBar(doc, 205.44, "THE COMPLAINT ENTAILS");

  // ✅ FIXED HEADER ALIGNMENT (single baseline)
  const H3_Y = 238.6;
  const H3_HINT_Y = H3_Y + 10.8;

  // Headers
  labelStyle().text("AN-ID", X_AN2, H3_Y);
  labelStyle().text("ENTAILS", X_ENT, H3_Y);
  labelStyle().text("SUBJECT/DESCRIPTION", X_SUB2, H3_Y);
  labelStyle().text("CONSEQUENCE", X_CONS, H3_Y);

  // Red hints (properly inside columns)
  redStyle().text("from registration", X_ENT, H3_HINT_Y, {
    width: W_ENT,
    lineBreak: false,
  });

  redStyle().text("from registration", X_CONS, H3_HINT_Y, {
    width: 552.36 - X_CONS - 6,
    lineBreak: false,
  });

  // Underline
  thinLine(doc, 65.88, 256.44, 552.36 - 65.88);

  // Values row
  const V2_Y = 262.0;

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("AN-", X_AN2, V2_Y);

  redStyle().text(d.uniqueNo || "Unique\nno", X_AN2 + 20.3, V2_Y, {
    width: X_ENT - (X_AN2 + 20.3) - 6,
    lineGap: 0,
  });

  // ✅ ENTAILS value baseline aligned with other values
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TITLE_GREY)
    .text(d.entailsPick || "Select an item.", X_ENT, V2_Y, {
      width: W_ENT,
      lineBreak: false,
    });

  // Subject red
  redStyle().text(d.subjectDesc || "from registration", X_SUB2, V2_Y, {
    width: W_SUB2,
    lineBreak: false,
  });

  // Consequence grey (right aligned)
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TITLE_GREY)
    .text(d.consequencePick || "Select an item.", X_CONS_VAL, V2_Y, {
      width: W_CONS,
      align: "right",
      lineBreak: false,
    });

  // Bottom underline row
  thinLine(doc, 65.16, 281.4, 552.36 - 65.16);

  // Footer
  footerBar(doc, 2);
}

/** Generator (2 pages only) */
function generateSafetyMentionReport(dynamic, outputStream) {
  if (!outputStream || typeof outputStream.write !== "function") {
    throw new Error("outputStream (Writable) is required");
  }

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(outputStream);

  page1(doc, dynamic);

  doc.addPage({ size: "A4", margin: 0 });
  page2(doc, dynamic);

  doc.end();
  return doc;
}

/** Routes */
app.get("/download", (req, res) => {
  try {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="SAFETY_MENTION.pdf"'
    );

    const dynamic = {
      uniquePrefix: "0x",
      uniqueNoLabel: "Unique no",

      title: "title from registration",
      createdDate: "document date",
      createdBy: "from registration",
      projectName: "Project setup",
      projectId: "Project setup",

      contractorAddress: "Project setup",
      contractorPostcode: "Project setup",
      contractorCity: "Project setup",
      contractorCVR: "Project setup",

      mainAddress: "Project setup",
      mainPostcode: "Project setup",
      mainCity: "Project setup",
      mainCVR: "Project setup",

      uniqueNo: "Unique no",
      docDate: "document date",
      recipientName: "from registration",
      recipientEmail: "from registration",
      drawingId: "MARKED DRAWING from registration",

      regFrom: "from registration",
      photoFrom: "from registration",
      profession: "from registration",
      subjectPick: "Vælg et element.",

      entailsPick: "Select an item.",
      subjectDesc: "from registration",
      consequencePick: "Select an item.",
    };

    generateSafetyMentionReport(dynamic, res);
  } catch (err) {
    try {
      if (!res.headersSent) res.status(500).send("PDF generation failed");
    } catch (_) {}
  }
});

app.get("/", (req, res) => {
  res.send(
    `<h2>safety mention PDF</h2><p>Download: <a href="/download">/download</a></p>`
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
