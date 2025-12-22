// technical-request-comments.js
// Run:
//   npm i express pdfkit
//   node technical-request-comments.js
//
// Download:
//   http://localhost:3000/download

const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

/** A4 */
const PAGE = { w: 595.28, h: 841.89 };

// Colors
const NAVY = "#001f54";
const GREY = "#d9d9d9";
const TEXT_NAVY = "#00173e";
const TITLE_GREY = "#595959";
const BODY_GREY = "#666666";
const RED = "#ee0000";
const BLACK = "#000000";
const WHITE = "#ffffff";

// Content bounds
const X0 = 65.88;
const X1 = 552.36;
const W = X1 - X0;

// ✅ tighter bar gap
const BAR_GAP = 6;

/** Thin line */
function thinLine(doc, x, y, w) {
  doc.save().fillColor(BLACK).rect(x, y, w, 0.48).fill().restore();
}

/** Blue section bar */
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

/** Placeholder box */
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
function redStyle(doc) {
  return doc.font("Helvetica").fontSize(7.54).fillColor(RED);
}

/** Clip helper */
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
    .text("ADMIN LOGO", 474.48, 66.0, { width: 77.88, align: "center" });

  // Title
  doc
    .font("Helvetica")
    .fontSize(28.17)
    .fillColor(TITLE_GREY)
    .text("TECNICAL REQUEST TR-", 118.44, 40.8, { continued: true });

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

  // =========================
  // 1) PROJECT INFORMATION (compressed)
  // =========================
  const piAfter = sectionBar(doc, 114.12, "PROJECT INFORMATION") + BAR_GAP;

  const L1 = 70.92;
  const V1 = 150.6;
  const L2 = 270.84;
  const V2 = 397.56;

  labelStyle(doc).text("CREATED DATE:", L1, piAfter + 6.0);
  redStyle(doc).text(d.createdDate || "document date", V1, piAfter + 8.0);

  labelStyle(doc).text("CREATED BY:", L2, piAfter + 6.0);
  redStyle(doc).text(d.createdBy || "from registration", V2, piAfter + 8.0);

  labelStyle(doc).text("PROJECT NAME:", L1, piAfter + 19.0);
  redStyle(doc).text(d.projectName || "Project setup", V1, piAfter + 21.0);

  labelStyle(doc).text("PROJECT ID:", L2, piAfter + 19.0);
  redStyle(doc).text(d.projectId || "Project setup", V2, piAfter + 21.0);

  // Grey row
  const greyY = piAfter + 32.0;
  doc.save().fillColor(GREY).rect(X0, greyY, W, 26.76).fill().restore();
  labelStyle(doc).text("CONTRACTOR", L1, greyY + 2.0);
  labelStyle(doc).text("MAIN CONTRACTOR \n/ CUSTOMER:", L2, greyY + 2.0, {
    lineGap: 1,
  });

  const r1 = greyY + 27.6;
  const step = 13.2;

  labelStyle(doc).text("ADDRESS", L1, r1);
  redStyle(doc).text(d.contractorAddress || "Project setup", V1, r1 + 2.0);
  labelStyle(doc).text("ADRESS:", L2, r1);
  redStyle(doc).text(d.mainAddress || "Project setup", V2, r1 + 2.0);

  const r2 = r1 + step;
  labelStyle(doc).text("POSTCODE", L1, r2);
  redStyle(doc).text(d.contractorPostcode || "Project setup", V1, r2 + 2.0);
  labelStyle(doc).text("POSTCODE:", L2, r2);
  redStyle(doc).text(d.mainPostcode || "Project setup", V2, r2 + 2.0);

  const r3 = r2 + step;
  labelStyle(doc).text("CITY", L1, r3);
  redStyle(doc).text(d.contractorCity || "Project setup", V1, r3 + 2.0);
  labelStyle(doc).text("CITY:", L2, r3);
  redStyle(doc).text(d.mainCity || "Project setup", V2, r3 + 2.0);

  const r4 = r3 + step;
  labelStyle(doc).text("CVR", L1, r4);
  redStyle(doc).text(d.contractorCVR || "Project setup", V1, r4 + 2.0);
  labelStyle(doc).text("CVR:", L2, r4);
  redStyle(doc).text(d.mainCVR || "Project setup", V2, r4 + 2.0);

  // =========================
  // 2) INFORMATION LETTER ✅ reduced blank space
  // =========================
  const INFO_BAR_Y = 274.0; // slightly up
  const infoAfter = sectionBar(doc, INFO_BAR_Y, "INFORMATION LETTER") + BAR_GAP;

  // ✅ moved up: table starts earlier, so paragraph area is smaller (no extra empty space)
  const sendHeaderY = 410.0;

  const paraX = 70.92;
  const paraW = W - 10.08;
  const paraTop = infoAfter;

  // ✅ smaller fixed height so it won’t look “too empty”
  const paraH = 108;

  const infoText =
    "In connection with the execution of my contract, it has unfortunately been determined that there are conditions which result in a technical inquiry into the construction management and its advisor.\n\n" +
    "It is assessed that there is no clear and unambiguous project material or that errors have been identified which require a directive from the construction management on what and how this inquiry or change in the project should be handled.\n\n" +
    "It is explicitly stated here that the client and their advisors have full responsibility for the project being clearly and unambiguously prepared, so that there is no doubt about the nature and scope of the work.";

  clippedText(doc, paraX, paraTop, paraW, paraH, () => {
    doc
      .font("Helvetica")
      .fontSize(8.4)
      .fillColor(BODY_GREY)
      .text(infoText, paraX, paraTop, {
        width: paraW,
        lineGap: 0.42,
        paragraphGap: 0,
      });
  });

  // SEND DATE / STATUS / PREPARED BY
  labelStyle(doc).text("SEND DATE", 70.92, sendHeaderY);
  labelStyle(doc).text("STATUS", 177.72, sendHeaderY);
  labelStyle(doc).text("PREPARED BY:", 310.92, sendHeaderY);

  thinLine(doc, 65.88, sendHeaderY + 14.2, 552.36 - 65.88);

  redStyle(doc).text(d.sendDate || "document date", 70.92, sendHeaderY + 15.8);
  redStyle(doc).text(
    d.status || "from registration",
    177.72,
    sendHeaderY + 15.8
  );
  redStyle(doc).text(
    d.preparedBy || "from registration",
    310.92,
    sendHeaderY + 15.8
  );

  // =========================
  // 3) ASSOCIATED ADVISORS (shifted up)
  // =========================
  const ADV_BAR_Y = 458.0; // moved up more
  const advAfter = sectionBar(doc, ADV_BAR_Y, "ASSOCIATED ADVISORS") + BAR_GAP;

  const A_HY = advAfter + 1;
  labelStyle(doc).text("TR- ID", 70.92, A_HY);
  labelStyle(doc).text("ADVISOR TYPE", 150.6, A_HY);
  labelStyle(doc).text("ADVISOR NAME", 270.84, A_HY);
  labelStyle(doc).text("ADVISOR MAIL", 397.56, A_HY);

  thinLine(doc, 65.88, A_HY + 13.8, 552.36 - 65.88);

  const A_VY = A_HY + 15.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("TR-", 70.92, A_VY);
  redStyle(doc).text(d.trNo || "0x", 90.0, A_VY + 2.0);

  redStyle(doc).text(d.advisorType || "from registration", 150.6, A_VY + 2.0);
  redStyle(doc).text(d.advisorName || "from registration", 270.84, A_VY + 2.0);
  redStyle(doc).text(d.advisorMail || "from registration", 397.56, A_VY + 2.0);

  // =========================
  // LOCATION ✅ more space for drawing
  // =========================
  const LOC_BAR_Y = 510.0; // moved up => more room below
  const locAfter = sectionBar(doc, LOC_BAR_Y, "LOCATION") + BAR_GAP;

  doc
    .font("Helvetica")
    .fontSize(9.0)
    .fillColor(TITLE_GREY)
    .text(
      "Below are inserted drawings indicating where inspections have been carried out in connection with the request",
      70.92,
      locAfter,
      { width: W - 10, lineBreak: false }
    );

  labelStyle(doc).text("DRAWING ID:", 70.92, locAfter + 16.0);
  labelStyle(doc).text(d.drawingIdLabel || "SITE PLAN", 150.6, locAfter + 16.0);

  thinLine(doc, 65.88, locAfter + 29.2, 552.36 - 65.88);

  labelStyle(doc).text("MARKED DRAWING", 70.92, locAfter + 33.0);
  redStyle(doc).text(
    d.markedDrawing || "from registration",
    150.6,
    locAfter + 35.0
  );

  // ✅ taller drawing placeholder
  placeholderBox(doc, 406.08, locAfter + 8.0, 146.52, 140.0, "Picture");

  footerBar(doc, 1);
}

/** Page 2 (unchanged from your working version) */
function page2(doc, d) {
  const topAfter = sectionBar(doc, 40.08, "TECINAL REQUEST") + BAR_GAP;

  const H_Y = topAfter + 2;
  labelStyle(doc).text("TR-NR:", 70.92, H_Y);
  labelStyle(doc).text("PROFESSION:", 150.6, H_Y);

  labelStyle(doc).text("SUBJECT/DESCRIPTION:", 270.84, H_Y);
  redStyle(doc).text(d.subjectFrom || "from registration", 382.0, H_Y + 2.0);

  labelStyle(doc).text("PHOTO:", 474.0, H_Y);
  redStyle(doc).text(d.photoFrom || "from registration", 510.0, H_Y + 2.0);

  thinLine(doc, 65.88, H_Y + 14.8, 552.36 - 65.88);

  const V_Y = H_Y + 16.2;
  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("TR-", 70.92, V_Y);
  redStyle(doc).text(d.trNo || "0x", 90.0, V_Y + 2.0);

  redStyle(doc).text(d.profession || "from registration", 150.6, V_Y + 2.0);

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TITLE_GREY)
    .text(d.subjectPick || "Vælg et element.", 270.84, V_Y, {
      width: 180,
      lineBreak: false,
    });

  placeholderBox(doc, 410.88, V_Y - 3.0, 141.48, 98.0, "Picture");

  const consAfter =
    sectionBar(doc, 205.44, "NOTIFIED CONSEQUENCE ON TIME, ECONOMY AND DELAY") +
    BAR_GAP;

  const C_HY = consAfter + 2;

  const X_TR = 70.92;
  const X_ISSUE = 124.32;
  const X_DISC = 217.56;
  const X_TEMP = 330.0;
  const X_ECON = 430.0;
  const X_DATE = 500.0;

  labelStyle(doc).text("TR-ID", X_TR, C_HY);
  labelStyle(doc).text("ISSUE", X_ISSUE, C_HY);
  labelStyle(doc).text("DISCREPANCY IN\nPROJECT MATERIAL", X_DISC, C_HY - 4, {
    lineGap: 0.5,
  });
  labelStyle(doc).text("TEMPERY\nCONCEQUENCES", X_TEMP, C_HY - 4, {
    lineGap: 0.5,
  });
  labelStyle(doc).text("ECONOMICAL\nCONCEQUENCES", X_ECON, C_HY - 4, {
    lineGap: 0.5,
  });
  labelStyle(doc).text("NOTIFIED DATE", X_DATE, C_HY);

  thinLine(doc, 65.88, C_HY + 22.0, 552.36 - 65.88);

  const C_VY = C_HY + 24.0;

  doc
    .font("Helvetica")
    .fontSize(9.35)
    .fillColor(TEXT_NAVY)
    .text("TR-", X_TR, C_VY);
  redStyle(doc).text(d.trNo || "0x", X_TR + 18, C_VY + 2.0);

  redStyle(doc).text(d.issue || "from registration", X_ISSUE, C_VY + 2.0, {
    width: X_DISC - X_ISSUE - 6,
    lineBreak: false,
  });

  redStyle(doc).text(d.discrepancy || "YES / NO / TIME", X_DISC, C_VY + 2.0, {
    width: X_TEMP - X_DISC - 6,
    lineGap: 0,
  });
  redStyle(doc).text(d.temporary || "YES / NO / TIME", X_TEMP, C_VY + 2.0, {
    width: X_ECON - X_TEMP - 6,
    lineGap: 0,
  });
  redStyle(doc).text(d.economical || "YES / NO / TIME", X_ECON, C_VY + 2.0, {
    width: X_DATE - X_ECON - 6,
    lineGap: 0,
  });

  redStyle(doc).text(
    d.notifiedDate || "from registration",
    X_DATE,
    C_VY + 2.0,
    {
      width: 52.36,
      lineBreak: false,
    }
  );

  const paraTop = 330.0;
  const paraH = 733.32 - paraTop - 14;
  const paraX = 70.92;
  const paraW = W - 10.08;

  const bottomText =
    "As our schedules are set in advance, reservations are made for time and economy, should one not receive prompt responses. In this case, I have a deadline of 2-3 business days.\n\n" +
    "Objections to the above must be submitted by the construction management within the deadline, as I do not have the opportunity to get materials reordered, ordered materials, moved suppliers, etc.\n\n" +
    "Amounts as stated in the schedule under finance (if it has financial consequences) please send an agreement note before the work can commence.\n\n" +
    "Should this be omitted, delays should be expected until the agreement note is sent with a signature; we cannot be held responsible for these delays.";

  clippedText(doc, paraX, paraTop, paraW, paraH, () => {
    doc
      .font("Helvetica")
      .fontSize(9.0)
      .fillColor(BODY_GREY)
      .text(bottomText, paraX, paraTop, {
        width: paraW,
        lineGap: 0.6,
        paragraphGap: 0,
      });
  });

  footerBar(doc, 2);
}

/** Generator */
function generateTechnicalRequestReport(dynamic, outputStream) {
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
      'attachment; filename="TECNICAL_REQUEST.pdf"'
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

      sendDate: "document date",
      status: "from registration",
      preparedBy: "from registration",

      trNo: "0x",
      advisorType: "from registration",
      advisorName: "from registration",
      advisorMail: "from registration",

      drawingIdLabel: "SITE PLAN",
      markedDrawing: "from registration",

      profession: "from registration",
      subjectPick: "Vælg et element.",
      subjectFrom: "from registration",
      photoFrom: "from registration",

      issue: "from registration",
      discrepancy: "YES / NO / TIME from registration",
      temporary: "YES / NO / TIME from registration",
      economical: "YES / NO / TIME from registration",
      notifiedDate: "from registration",
    };

    generateTechnicalRequestReport(dynamic, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("PDF generation failed");
  }
});

app.get("/", (req, res) => {
  res.send(
    `<h2>Technical Request PDF</h2><p>Download: <a href="/download">/download</a></p>`
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
