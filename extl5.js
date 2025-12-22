// new-agreement-report.js
// Run: node new-agreement-report.js
// Install: npm i express pdfkit

const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const os = require("os");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// US Letter
const PAGE = { w: 612, h: 792 };
const M = { l: 54, r: 54, t: 30, b: 30 };
const W = PAGE.w - M.l - M.r;

// Colors
const NAVY = "#062a59";
const LIGHT_GREY = "#e1e1e1";
const TITLE_GREY = "#6b6b6b";
const TEXT_GREY = "#666666";
const BLACKISH = "#1f1f1f";
const RED = "#e11d1d";
const MID_GREY = "#9a9a9a";
const BOX_GREY = "#777";

const SECTION_H = 24; // smaller
const FOOTER_H = 30;
const FOOTER_Y = PAGE.h - 66;
const SAFE_BOTTOM = FOOTER_Y - 6;

// ---------- helpers ----------
function rectFill(doc, x, y, w, h, color) {
  doc.save().fillColor(color).rect(x, y, w, h).fill().restore();
}
function hLine(doc, x, y, w, color = BLACKISH, lw = 0.6) {
  doc
    .save()
    .lineWidth(lw)
    .strokeColor(color)
    .moveTo(x, y)
    .lineTo(x + w, y)
    .stroke()
    .restore();
}
function sectionBar(doc, y, text) {
  rectFill(doc, M.l, y, W, SECTION_H, NAVY);
  doc
    .font("Helvetica")
    .fontSize(9.6)
    .fillColor("white")
    .text(text, M.l + 12, y + 7);
  return y + SECTION_H;
}
function oneLine(doc, text, x, y, w, color, size = 8.6, font = "Helvetica") {
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(String(text ?? ""), x, y, { width: w, lineBreak: false });
}
function textBox(
  doc,
  x,
  y,
  w,
  h,
  text,
  { font = "Helvetica", size = 9, color = TEXT_GREY, lineGap = 1 } = {}
) {
  // hard clamp (no overflow, no new pages)
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(String(text ?? ""), x, y, {
    width: w,
    height: h,
    ellipsis: true,
    lineGap,
  });
}
function pictureBox(doc, x, y, w, h, label = "Picture") {
  doc
    .save()
    .lineWidth(1)
    .strokeColor(BOX_GREY)
    .rect(x, y, w, h)
    .stroke()
    .restore();
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(BOX_GREY)
    .text(label, x, y + h / 2 - 6, { width: w, align: "center" });
}
function footerBar(doc, pageNo = 1, total = 1) {
  rectFill(doc, M.l, FOOTER_Y, W, FOOTER_H, NAVY);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("white")
    .text(`Side ${pageNo} af ${total}`, M.l + 22, FOOTER_Y + 9);

  const cx = M.l + W / 2;
  const cy = FOOTER_Y + FOOTER_H / 2 + 1;

  doc.save().strokeColor("white").lineWidth(1.6);
  doc.circle(cx - 28, cy, 10).stroke();
  doc
    .moveTo(cx - 35, cy + 7)
    .lineTo(cx - 28, cy - 7)
    .lineTo(cx - 21, cy + 7)
    .stroke();
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("white")
    .text("Assurement", cx - 12, FOOTER_Y + 9, {
      width: 140,
      align: "left",
    });
}

// compact 2-col row
function twoColRow(
  doc,
  y,
  xL,
  xR,
  colW,
  leftLabel,
  leftVal,
  rightLabel,
  rightVal
) {
  const labelW = 118;
  const valW = colW - labelW;

  doc.font("Helvetica").fontSize(9.4).fillColor(NAVY).text(leftLabel, xL, y);
  oneLine(doc, leftVal, xL + labelW, y + 0.2, valW, RED, 8.4);

  doc.font("Helvetica").fontSize(9.4).fillColor(NAVY).text(rightLabel, xR, y);
  oneLine(doc, rightVal, xR + labelW, y + 0.2, valW, RED, 8.4);

  return y + 14; // tighter height
}

// ---------- layout blocks ----------
function drawHeader(doc, d) {
  pictureBox(doc, M.l, M.t, 62, 70, "Icon");

  const adminS = 68;
  const adminX = PAGE.w - M.r - adminS;
  const adminY = M.t + 6;
  rectFill(doc, adminX, adminY, adminS, adminS, NAVY);
  doc
    .font("Helvetica")
    .fontSize(11.5)
    .fillColor("white")
    .text("ADMIN\nLOGO", adminX, adminY + 16, {
      width: adminS,
      align: "center",
      lineGap: 2,
    });

  const tx = M.l + 76;
  const titleY = M.t + 10;

  doc
    .font("Helvetica")
    .fontSize(15)
    .fillColor(TITLE_GREY)
    .text("NEW AGREEMENT NOTE AN-", tx + 4, titleY + 1, {
      lineBreak: false,
      continued: true,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(RED)
    .text(d.anSuffix || "0x unique no", { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor(TITLE_GREY)
    .text("TITLE:", tx, M.t + 64);
  oneLine(
    doc,
    d.title || "title from registration",
    tx + 50,
    M.t + 70.5,
    adminX - (tx + 50) - 8,
    RED,
    9.2
  );

  return 120; // next start
}

function drawProjectInfo(doc, topY, d) {
  let y = sectionBar(doc, topY, "PROJECT INFORMATION") + 8;

  const colGap = 26;
  const colW = (W - colGap) / 2;
  const xL = M.l;
  const xR = M.l + colW + colGap;

  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "CREATED DATE:",
    d.createdDate || "document date",
    "CREATED BY:",
    d.createdBy || "from registration"
  );
  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "PROJECT NAME:",
    d.projectName || "Project setup",
    "PROJECT ID:",
    d.projectId || "Project setup"
  );

  // smaller contractor bars
  rectFill(doc, xL, y - 2, colW, 20, LIGHT_GREY);
  rectFill(doc, xR, y - 2, colW, 20, LIGHT_GREY);
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("CONTRACTOR", xL + 8, y + 2);
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("MAIN CONTRACTOR /\nCUSTOMER:", xR + 8, y - 2, { lineGap: 0 });
  y += 26;

  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "ADDRESS",
    d.address || "Project setup",
    "ADRESS:",
    d.address2 || "Project setup"
  );
  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "POSTCODE",
    d.postcode || "Project setup",
    "POSTCODE:",
    d.postcode2 || "Project setup"
  );
  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "CITY",
    d.city || "Project setup",
    "CITY:",
    d.city2 || "Project setup"
  );
  y = twoColRow(
    doc,
    y,
    xL,
    xR,
    colW,
    "CVR",
    d.cvr || "Project setup",
    "CVR:",
    d.cvr2 || "Project setup"
  );

  return y + 4;
}

function drawSubject1(doc, topY) {
  let y = sectionBar(doc, topY, "SUBJECT") + 8;

  const subjH = 78; // fixed & shorter
  textBox(
    doc,
    M.l,
    y,
    W,
    subjH,
    "As a contractor associated with the project at the above address, in connection with the usual walk on the site, I have found conditions that are not included in my contract work, and therefore this condition is flagged.\n\n" +
      "This work is carried out on an invoice basis and will only be started once it has been confirmed by a construction or project manager. Here, special attention is drawn to the fact that reservations are made here for time and finances.\n\n" +
      "In addition to the time for the work to be carried out, it will be assumed that a quick response is returned, within 1-2 working days otherwise these days must be left over.",
    { size: 7.55, color: TEXT_GREY, lineGap: 0.15 }
  );

  return y + subjH + 6;
}

function drawAddressedTo(doc, topY, d) {
  let y = sectionBar(doc, topY, "ADDRESSED TO") + 8;

  const pad = 8;
  const x = M.l + pad;
  const c1 = 88;
  const c2 = 84;
  const c3 = 160;
  const c4 = W - pad * 2 - (c1 + c2 + c3);

  doc.font("Helvetica").fontSize(9.4).fillColor(NAVY);
  doc.text("AN-ID", x, y);
  doc.text("DATE", x + c1, y);
  doc.text("RECIPIENT NAME:", x + c1 + c2, y);
  doc.text("RECIPIENT EMAIL:", x + c1 + c2 + c3, y);

  y += 13;
  hLine(doc, M.l, y, W);
  y += 6;

  oneLine(doc, d.addrAnId || "AN- Unique no", x, y, c1 - 6, RED, 8.4);
  oneLine(doc, d.addrDate || "document date", x + c1, y, c2 - 6, RED, 8.4);
  oneLine(
    doc,
    d.addrRecipientName || "Project setup",
    x + c1 + c2,
    y,
    c3 - 6,
    RED,
    8.4
  );
  oneLine(
    doc,
    d.addrRecipientEmail || "from registration",
    x + c1 + c2 + c3,
    y,
    c4 - 6,
    RED,
    8.4
  );

  return y + 14;
}

function drawSubject2(doc, topY, d) {
  let y = sectionBar(doc, topY, "SUBJECT") + 8;

  const pad = 8;
  const x = M.l + pad;
  const leftW = 156;
  const rightW = W - pad * 2 - leftW;

  // row 1 header
  doc.font("Helvetica").fontSize(9.4).fillColor(NAVY);
  doc.text("DATE OF INSPECTION", x, y);
  doc.text("DESCRIPTION", x + leftW, y);

  y += 13;
  hLine(doc, M.l, y, W);
  y += 6;

  oneLine(
    doc,
    d.inspectionDate || "from registration",
    x,
    y,
    leftW - 6,
    RED,
    8.4
  );
  oneLine(
    doc,
    d.subjectDesc || "from registration",
    x + leftW,
    y,
    rightW - 6,
    RED,
    8.4
  );

  y += 14;
  hLine(doc, M.l, y, W);
  y += 7;

  // price line
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("ESTIMATET PRICE:", x, y);
  doc
    .font("Helvetica")
    .fontSize(9.8)
    .fillColor(MID_GREY)
    .text("Select an item.:", x + 132, y);
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("EX. VAT", M.l + W - 64, y);

  y += 12;
  oneLine(
    doc,
    d.estimatedPrice || "from registration",
    x + 132,
    y,
    190,
    RED,
    8.4
  );
  oneLine(
    doc,
    d.exVatValue || "from registration",
    M.l + W - 92,
    y,
    88,
    RED,
    8.4
  );

  y += 14;
  hLine(doc, M.l, y, W);
  y += 7;

  // deadline line
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("DEADLINE EXTENSION DAYS:", x, y);
  doc
    .font("Helvetica")
    .fontSize(9.8)
    .fillColor(MID_GREY)
    .text("Select an item.", x + 184, y);

  y += 12;
  oneLine(
    doc,
    d.deadlineExtensionDays || "from registration",
    x + 184,
    y,
    120,
    RED,
    8.4
  );
  oneLine(
    doc,
    d.deadlineExtraValue || "from registration",
    x + 308,
    y,
    170,
    RED,
    8.4
  );

  return y + 10;
}

function drawRegistrations(doc, topY, d) {
  let y = sectionBar(doc, topY, "REGISTRATIONS") + 8;

  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("AN-NR:", M.l + 10, y);
  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("DESCRIPTION:", M.l + 66, y);
  oneLine(
    doc,
    d.regDescFrom || "from registration",
    M.l + 150,
    y + 0.5,
    190,
    RED,
    8.4
  );

  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("PHOTO:", M.l + 340, y);
  oneLine(
    doc,
    d.regPhotoFrom || "from registration",
    M.l + 386,
    y + 0.5,
    110,
    RED,
    8.4
  );

  y += 14;
  hLine(doc, M.l, y, W);
  y += 9;

  doc
    .font("Helvetica")
    .fontSize(9.4)
    .fillColor(NAVY)
    .text("AN-", M.l + 10, y);
  doc
    .font("Helvetica")
    .fontSize(8.6)
    .fillColor(RED)
    .text("Unique\nno", M.l + 10, y + 12, { lineGap: 0 });

  doc
    .font("Helvetica")
    .fontSize(9.8)
    .fillColor(MID_GREY)
    .text("Vælg et element.", M.l + 165, y);

  // picture box must NEVER overlap footer or other blocks
  const picW = 190;
  const picH = 72; // smaller to avoid overlap
  const picX = M.l + W - picW - 14;
  const maxPicY = SAFE_BOTTOM - picH;
  const picY = Math.min(y + 4, maxPicY);

  pictureBox(doc, picX, picY, picW, picH, "Picture");
}

// ---------- one page draw ----------
function drawReport(doc, d = {}) {
  // header
  const afterHeader = drawHeader(doc, d);

  // project info compressed
  const afterProject = drawProjectInfo(doc, afterHeader, d);

  // absolute placement from computed end (prevents collisions)
  let y = afterProject + 6;
  y = drawSubject1(doc, y);

  y = drawAddressedTo(doc, y + 4, d);

  y = drawSubject2(doc, y + 4, d);

  // REGISTRATION: force it to start high enough so it cannot touch footer
  const REG_TOP = Math.min(y + 4, FOOTER_Y - 120); // 120 reserved
  drawRegistrations(doc, REG_TOP, d);

  footerBar(doc, 1, 1);
}

// ---------- disk-first generation ----------
function generatePdfToFile(filePath, dynamic = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      compress: true,
    });
    const out = fs.createWriteStream(filePath);

    out.on("finish", resolve);
    out.on("error", reject);
    doc.on("error", reject);

    doc.pipe(out);

    // IMPORTANT: only ONE page
    doc.addPage({ size: [PAGE.w, PAGE.h], margin: 0 });
    drawReport(doc, dynamic);

    doc.end();
  });
}

// ---------- Express ----------
app.get("/download", async (req, res) => {
  const tmpPath = path.join(os.tmpdir(), `new-agreement-${Date.now()}.pdf`);
  try {
    const dynamic = {}; // put your red values here later
    await generatePdfToFile(tmpPath, dynamic);

    res.download(tmpPath, "new-agreement-note.pdf", (err) => {
      fs.unlink(tmpPath, () => {});
      if (err) console.error("download error:", err);
    });
  } catch (e) {
    fs.unlink(tmpPath, () => {});
    res.status(500).send("PDF generation failed: " + (e?.message || "unknown"));
  }
});

app.get("/", (req, res) => {
  res.send(
    '<h3>NEW AGREEMENT NOTE</h3><p>Download: <a href="/download">/download</a></p>'
  );
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
