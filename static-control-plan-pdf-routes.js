const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const {
  generateStaticControlPlanPDFBuffer,
} = require("./services/staticControlPlanPdf");

const loadImageAsDataUri = (absolutePath) => {
  try {
    if (!fs.existsSync(absolutePath)) {
      return "";
    }
    const ext = path.extname(absolutePath).toLowerCase();
    let mime = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") {
      mime = "image/jpeg";
    } else if (ext === ".svg") {
      mime = "image/svg+xml";
    } else if (ext === ".gif") {
      mime = "image/gif";
    }
    const buffer = fs.readFileSync(absolutePath);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error(`⚠️ Failed to load image at path ${absolutePath}:`, error);
    return "";
  }
};

const ASSUREMENT_LOGO_PATH = path.join(
  __dirname,
  "templates",
  "assurement-logo.png"
);
const FRONTEND_LOGO_PATH = path.join(
  __dirname,
  "..",
  "consfront-main",
  "src",
  "assets",
  "images",
  "jpo.jpg"
);

const ROOT_LOGO_PATH = path.join(__dirname, "logo.png");

const ASSUREMENT_LOGO_DATA_URI = loadImageAsDataUri(ASSUREMENT_LOGO_PATH);
const FRONTEND_LOGO_DATA_URI = loadImageAsDataUri(FRONTEND_LOGO_PATH);
const ROOT_LOGO_DATA_URI = loadImageAsDataUri(ROOT_LOGO_PATH);
const STATIC_CONTROL_BRAND_LOGO =
  ROOT_LOGO_DATA_URI || ASSUREMENT_LOGO_DATA_URI || FRONTEND_LOGO_DATA_URI;

module.exports = (db) => {
  const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };

  const euroCodeDescriptions = {
    0: "Eurocode 0: Basis of design for structures",
    1: "Eurocode 1: Actions on structures",
    2: "Eurocode 2: Concrete structures",
    3: "Eurocode 3: Steel structures",
    4: "Eurocode 4: Composite structures",
    5: "Eurocode 5: Timber structures",
    6: "Eurocode 6: Masonry structures",
    7: "Eurocode 7: Geotechnical design",
    8: "Eurocode 8: Design of structures for earthquake resistance",
    9: "Eurocode 9: Aluminium structures",
    1520: "EN 1520: Lightweight concrete with porous aggregates",
    12602: "EN 12602: Cellular concrete",
  };

  const escapeHtml = (value) => {
    if (value === undefined || value === null) {
      return "";
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatDate = (value) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMultiline = (value) => {
    if (!value) {
      return "";
    }
    return escapeHtml(value).replace(/\r?\n/g, "<br />");
  };

  const getEuroCodeName = (code) => {
    const key = String(code);
    return euroCodeDescriptions[key] || `Eurocode ${code}`;
  };

  const fetchStaticControlPlanData = async (
    companyId,
    projectId,
    subjectMatterId
  ) => {
    if (!companyId || !projectId || !subjectMatterId) {
      throw createHttpError(
        400,
        "Missing required fields: companyId, projectId, and subjectMatterId are required"
      );
    }

    console.log("📄 Generating Static Control Plan PDF...");
    console.log(`   CompanyId: ${companyId}`);
    console.log(`   ProjectId: ${projectId}`);
    console.log(`   SubjectMatterId: ${subjectMatterId}`);

    // 1. Get gamma document for this profession
    const gamma = await db.collection("gammas").findOne({
      $or: [{ projectsId: projectId }, { projectsId: { $in: [projectId] } }],
      "profession.SubjectMatterId": subjectMatterId,
    });

    if (!gamma) {
      throw createHttpError(
        404,
        `No static control plan found for subjectMatterId: ${subjectMatterId} in project: ${projectId}`
      );
    }

    console.log(`✅ Found gamma: ${gamma._id}`);

    // 2. Get project details
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      throw createHttpError(404, `Project not found: ${projectId}`);
    }

    console.log(`✅ Found project: ${project.name}`);

    // 3. Get company details
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId),
    });

    if (!company) {
      throw createHttpError(404, `Company not found: ${companyId}`);
    }

    console.log(`✅ Found company: ${company.name}`);

    // 4. Get EuroCodes from projectprofessioneurocodes collection
    let euroCodes = [];

    console.log("📋 Fetching EuroCodes from projectprofessioneurocodes...");
    console.log("   projectId:", projectId);
    console.log("   subjectMatterId:", subjectMatterId);

    try {
      const euroCodeDoc = await db
        .collection("projectprofessioneurocodes")
        .findOne({
          projectId: projectId,
          subjectMatterId: subjectMatterId,
        });

      if (euroCodeDoc) {
        console.log("✅ Found euroCode document:", euroCodeDoc._id);
        if (euroCodeDoc.euroCodes && Array.isArray(euroCodeDoc.euroCodes)) {
          euroCodes = euroCodeDoc.euroCodes;
          console.log(`✅ Found ${euroCodes.length} EuroCodes:`, euroCodes);
        } else {
          console.log("⚠️ euroCodes field is missing or not an array");
        }
      } else {
        console.log("⚠️ No euroCode document found for:", {
          projectId,
          subjectMatterId,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching EuroCodes:", error);
    }

    console.log(`✅ Final euroCodes array:`, euroCodes);

    // 5. Get special text from projectspecialtext collection
    let projectSpecialText = "";
    try {
      const specialTextDoc = await db.collection("projectspecialtext").findOne({
        projectId: projectId,
      });

      if (specialTextDoc && specialTextDoc.specialText) {
        projectSpecialText = specialTextDoc.specialText;
        console.log(`✅ Found special text: "${projectSpecialText}"`);
      } else {
        console.log("⚠️ No special text found for this project");
      }
    } catch (error) {
      console.error("Error fetching special text:", error);
    }

    // 6. Get project main drawings from "draws" collection
    let projectDrawings = [];
    try {
      const drawDocs = await db
        .collection("draws")
        .find({
          companyId: companyId,
          projectsId: projectId,
        })
        .toArray();

      console.log(`✅ Found ${drawDocs.length} draw documents`);

      // Extract mainDrawings from all draw documents
      drawDocs.forEach((drawDoc) => {
        if (drawDoc.mainDrawings && Array.isArray(drawDoc.mainDrawings)) {
          projectDrawings.push(...drawDoc.mainDrawings);
        }
      });

      console.log(`✅ Total main drawings: ${projectDrawings.length}`);
    } catch (error) {
      console.error("Error fetching drawings:", error);
    }

    // 7. Get checklist entries from "standards" collection (for 7.1, 7.2, 7.3)
    let checklistEntries = [];
    try {
      // Fetch from standards collection with B1, B2, B3 groups
      const allEntries = await db
        .collection("standards")
        .find({
          DS_GroupId: { $in: ["B1", "B2", "B3"] },
        })
        .toArray();

      if (allEntries && Array.isArray(allEntries)) {
        checklistEntries = allEntries;
        console.log(
          `✅ Found ${checklistEntries.length} standards/checklist entries (7.1, 7.2, 7.3)`
        );

        // Group by ItemId prefix (7.1, 7.2, 7.3)
        const entries71 = checklistEntries.filter(
          (e) => e.ItemId && e.ItemId.startsWith("7.1")
        );
        const entries72 = checklistEntries.filter(
          (e) => e.ItemId && e.ItemId.startsWith("7.2")
        );
        const entries73 = checklistEntries.filter(
          (e) => e.ItemId && e.ItemId.startsWith("7.3")
        );

        console.log(`   7.1 entries: ${entries71.length}`);
        console.log(`   7.2 entries: ${entries72.length}`);
        console.log(`   7.3 entries: ${entries73.length}`);
      }
    } catch (error) {
      console.error("Error fetching standards:", error);
    }

    // 8. Get additional entries (7.4, 7.5, 7.6) from "controls of static report" collection
    try {
      console.log(
        "📋 Fetching 7.4, 7.5, 7.6 entries from 'controls of static report'..."
      );

      // Normalize euroCodes to strings
      const euroCodesStr = euroCodes
        .map((v) => String(v).trim())
        .filter(Boolean);
      console.log("   EuroCodes to match:", euroCodesStr);

      const pipeline = [
        // Convert euroCode to string for comparison
        { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },

        // Match any requested euro code
        { $match: { euroCodeStr: { $in: euroCodesStr } } },

        // Unwind entries array
        { $unwind: { path: "$entries", includeArrayIndex: "entryIndex" } },

        // Project the fields we need
        {
          $project: {
            _id: 0,
            pos: "$entries.pos",
            checkingThe: "$entries.checkingThe",
            subject: "$entries.subject",
            constructionPart: "$entries.constructionPart",
            basis: "$entries.basis",
            controlMethod: "$entries.controlMethod",
            circumference: "$entries.circumference",
            acceptanceCriteria: "$entries.acceptanceCriteria",
            time: "$entries.time",
            documentId: { $toString: "$_id" },
            subjectMatterId: "$subjectMatterId",
            euroCode: "$euroCode",
            language: "$language",
            entryIndex: "$entryIndex",
          },
        },
      ];

      const controlsEntries = await db
        .collection("controls of static report")
        .aggregate(pipeline)
        .toArray();

      console.log(`✅ Found ${controlsEntries.length} total controls entries`);

      // Log first entry to see raw data structure
      if (controlsEntries.length > 0) {
        console.log("   First raw entry from controls collection:");
        console.log("      pos:", controlsEntries[0].pos);
        console.log("      checkingThe:", controlsEntries[0].checkingThe);
        console.log("      subject:", controlsEntries[0].subject);
      }

      // Filter for 7.4, 7.5, 7.6 only
      const entries74 = controlsEntries.filter(
        (e) => e.pos && e.pos.startsWith("7.4")
      );
      const entries75 = controlsEntries.filter(
        (e) => e.pos && e.pos.startsWith("7.5")
      );
      const entries76 = controlsEntries.filter(
        (e) => e.pos && e.pos.startsWith("7.6")
      );

      console.log(`   7.4 entries: ${entries74.length}`);
      console.log(`   7.5 entries: ${entries75.length}`);
      console.log(`   7.6 entries: ${entries76.length}`);

      // Log first 7.4 entry if exists
      if (entries74.length > 0) {
        console.log("   First 7.4 entry BEFORE edit replacement:");
        console.log("      pos:", entries74[0].pos);
        console.log("      checkingThe:", entries74[0].checkingThe);
      }

      // Combine all controls entries (7.4, 7.5, 7.6)
      let allControlsEntries = [...entries74, ...entries75, ...entries76];

      // Check for edited data and replace entries
      if (allControlsEntries.length > 0 && projectId && subjectMatterId) {
        console.log(
          "🔄 Checking for edited data in editcontrols collection..."
        );
        console.log(`   ProjectId: ${projectId}`);
        console.log(`   SubjectMatterId: ${subjectMatterId}`);

        try {
          // Get all edited controls for this project + subjectMatterId
          const editedControls = await db
            .collection("editcontrols")
            .find({
              projectId: projectId,
              subjectMatterId: subjectMatterId,
            })
            .toArray();

          console.log(`📝 Found ${editedControls.length} edited controls`);

          if (editedControls.length > 0) {
            // Create a map of edited data by projectId + subjectMatterId + pos
            const editedDataMap = new Map();
            editedControls.forEach((editedControl) => {
              if (
                editedControl.editedFields &&
                editedControl.editedFields.pos
              ) {
                const key = `${editedControl.projectId}_${editedControl.subjectMatterId}_${editedControl.editedFields.pos}`;
                editedDataMap.set(key, editedControl.editedFields);
                console.log(
                  `🔑 Added to map - key: ${key}, pos: ${editedControl.editedFields.pos}`
                );
              }
            });

            console.log(
              `🗺️ Total keys in editedDataMap: ${editedDataMap.size}`
            );

            // Replace entries with edited data if exists
            let replacedCount = 0;
            allControlsEntries = allControlsEntries.map((entry) => {
              const key = `${projectId}_${subjectMatterId}_${entry.pos}`;
              const editedData = editedDataMap.get(key);

              if (editedData) {
                replacedCount++;
                console.log(
                  `✅ Replacing entry pos="${entry.pos}" with edited data`
                );
                console.log(`   Original checkingThe: "${entry.checkingThe}"`);
                console.log(
                  `   Edited checkingThe: "${editedData.checkingThe}"`
                );
                return {
                  ...entry,
                  ...editedData, // Replace with edited fields
                  _isEdited: true,
                };
              }
              return entry;
            });

            console.log(
              `📊 Total entries replaced: ${replacedCount} out of ${allControlsEntries.length}`
            );

            // Log first 7.4 entry AFTER replacement
            const first74AfterEdit = allControlsEntries.find(
              (e) => e.pos && e.pos.startsWith("7.4")
            );
            if (first74AfterEdit) {
              console.log("   First 7.4 entry AFTER edit replacement:");
              console.log("      pos:", first74AfterEdit.pos);
              console.log("      checkingThe:", first74AfterEdit.checkingThe);
              console.log("      _isEdited:", first74AfterEdit._isEdited);
            }
          }
        } catch (editError) {
          console.error("Error fetching edited controls:", editError);
        }
      }

      // Log before adding to checklistEntries
      if (allControlsEntries.length > 0) {
        const first74 = allControlsEntries.find(
          (e) => e.pos && e.pos.startsWith("7.4")
        );
        if (first74) {
          console.log("   7.4 entry BEFORE adding to checklistEntries:");
          console.log("      pos:", first74.pos);
          console.log("      checkingThe:", first74.checkingThe);
        }
      }

      // Add these entries to checklistEntries array
      if (allControlsEntries.length > 0) {
        checklistEntries.push(...allControlsEntries);
      }

      // Log after adding to checklistEntries
      const first74InList = checklistEntries.find(
        (e) => e.pos && e.pos.startsWith("7.4")
      );
      if (first74InList) {
        console.log("   7.4 entry AFTER adding to checklistEntries:");
        console.log("      pos:", first74InList.pos);
        console.log("      checkingThe:", first74InList.checkingThe);
      }

      console.log(
        `✅ Total checklist entries after adding 7.4, 7.5, 7.6: ${checklistEntries.length}`
      );
    } catch (error) {
      console.error("Error fetching controls of static report:", error);
    }

    const signatures = await db
      .collection("static report signatures")
      .find({
        companyId: companyId,
        projectId: projectId,
      })
      .sort({ signatureType: 1, createdAt: -1 })
      .toArray();

    // 9. Prepare PDF data
    const pdfData = {
      company: {
        name: company.name || "Company Name",
        address: company.address || "",
        postalCode:
          company.postalCode || company.postal_code || company.zipCode || "",
        cvr: company.cvr || company.cvrNumber || company.CVR || "",
        email: company.email || "",
        contactPerson: company.contactPerson || company.contact_person || "",
      },
      project: {
        name: project.name || "Project Name",
        address: project.address || "",
        createdAt: project.createdAt
          ? new Date(project.createdAt).toLocaleDateString("en-GB")
          : "",
        caseNumber:
          project.caseNumber ||
          project.case_number ||
          project.projectNumber ||
          "",
        specialText: projectSpecialText, // Special text from project
      },
      gamma: {
        _id: gamma._id ? String(gamma._id) : "", // Gamma document ID
        profession:
          gamma.profession?.GroupName || gamma.profession?.name || "N/A",
        subjectMatterId: gamma.profession?.SubjectMatterId || subjectMatterId,
        x: gamma.x || "",
        text: gamma.text || "", // Keep gamma text as well
        item: gamma.item || "",
        exc: gamma.exc || "",
        cc: gamma.cc || "",
        currentVersion: gamma.currentVersion || 1,
        description: gamma.description || gamma.note || "",
        specialControlId: gamma.specialControlId || "",
      },
      euroCodes: euroCodes,
      drawings: projectDrawings.map((drawing) => ({
        name:
          drawing.originalname || drawing.filename || drawing.name || "Drawing",
        path: drawing.s3Location || drawing.path || "",
        s3Key: drawing.s3Key || "",
        uploadedAt: drawing.uploadedAt || drawing.createdAt || "",
      })),
      checklistEntries: (() => {
        let logged74 = false;
        return checklistEntries.map((entry) => {
          const mappedEntry = {
            // Support both data sources (standards and controls of static report)
            pos: entry.pos || entry.ItemId || "",
            controlOf:
              entry.checkingThe ||
              entry["Contol of"] ||
              entry["Control of"] ||
              "",
            checkingThe:
              entry.checkingThe ||
              entry["Contol of"] ||
              entry["Control of"] ||
              "",
            subject: entry.subject || entry.Subject || "",
            constructionPart:
              entry.constructionPart || entry["Construction part"] || "",
            basis: entry.basis || entry.Basis || "",
            controlMethod:
              entry.controlMethod ||
              entry["Control methode"] ||
              entry["Control method"] ||
              "",
            scope:
              entry.circumference ||
              (entry.extent ? `${entry.extent * 100}%` : ""),
            circumference:
              entry.circumference || (entry.extent ? entry.extent : ""),
            acceptanceCriteria:
              entry.acceptanceCriteria || entry["Acceptance criteria"] || "",
            time: entry.time || entry.Time || "",
          };

          // Log first 7.4 entry during mapping
          if (
            mappedEntry.pos &&
            mappedEntry.pos.startsWith("7.4") &&
            !logged74
          ) {
            logged74 = true;
            console.log("   7.4 entry DURING MAPPING:");
            console.log("      Original entry.checkingThe:", entry.checkingThe);
            console.log(
              "      Mapped entry.checkingThe:",
              mappedEntry.checkingThe
            );
            console.log("      Mapped entry.controlOf:", mappedEntry.controlOf);
          }

          return mappedEntry;
        });
      })(),
      signatures,
    };

    return pdfData;
  };

  // Generate Static Control Plan PDF
  router.post("/generate-static-control-plan-pdf", async (req, res) => {
    try {
      const { companyId, projectId, subjectMatterId } = req.body;

      const pdfData = await fetchStaticControlPlanData(
        companyId,
        projectId,
        subjectMatterId
      );

      res.status(200).json({
        success: true,
        data: pdfData,
      });
    } catch (error) {
      console.error("❌ Error generating static control plan PDF:", error);
      const status = error.status || 500;
      res.status(status).json({
        error: error.message || "Failed to generate static control plan PDF",
      });
    }
  });

  router.get("/static-control-plan.pdf", async (req, res) => {
    try {
      const { companyId, projectId, subjectMatterId } = req.query;

      const pdfData = await fetchStaticControlPlanData(
        companyId,
        projectId,
        subjectMatterId
      );

      const pdfBuffer = generateStaticControlPlanPDFBuffer(pdfData);

      const filenameSubject =
        subjectMatterId ||
        pdfData?.gamma?.subjectMatterId ||
        "static-control-plan";

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${filenameSubject}.pdf`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error("❌ Error streaming static control plan PDF:", error);
      const status = error.status || 500;
      res.status(status).json({
        error: error.message || "Failed to stream static control plan PDF",
      });
    }
  });

  router.get("/static-control-plan.html", async (req, res) => {
    try {
      const { companyId, projectId, subjectMatterId } = req.query;

      const pdfData = await fetchStaticControlPlanData(
        companyId,
        projectId,
        subjectMatterId
      );

      const companyName = pdfData?.company?.name || "Static Control Plan";
      const reportTitle =
        pdfData?.gamma?.profession ||
        pdfData?.gamma?.item ||
        "Static Control Plan";

      const safeCompanyName = escapeHtml(companyName);
      const safeReportTitle = escapeHtml(reportTitle);

      const xValue = pdfData.gamma?.x || "";
      const specialText = pdfData.project?.specialText || "Special text";
      const createdDate =
        formatDate(pdfData.project?.createdAt) ||
        formatDate(pdfData.gamma?.createdAt) ||
        formatDate(new Date());

      const selectedEuroCodes =
        Array.isArray(pdfData.euroCodes) && pdfData.euroCodes.length > 0
          ? pdfData.euroCodes
          : Object.keys(euroCodeDescriptions);

      const euroCodeMarkup = selectedEuroCodes
        .map((code) => `<li>${escapeHtml(getEuroCodeName(code))}</li>`)
        .join("");

      const drawingsMarkup =
        pdfData.drawings && pdfData.drawings.length
          ? pdfData.drawings
              .map((drawing, index) => {
                const drawingName =
                  drawing.name ||
                  drawing.originalname ||
                  drawing.filename ||
                  drawing.s3Key ||
                  `Drawing ${index + 1}`;
                const drawingDate = formatDate(
                  drawing.uploadedAt || drawing.createdAt
                );
                const drawingUrl =
                  drawing.s3Location || drawing.path || drawing.url;
                return `<div class="scp-drawing-item">
                  <span>${escapeHtml(drawingName)}</span>
                  ${
                    drawingDate
                      ? `<span class="scp-meta-light">${escapeHtml(
                          drawingDate
                        )}</span>`
                      : ""
                  }
                  ${
                    drawingUrl
                      ? `<a href="${escapeHtml(
                          drawingUrl
                        )}" target="_blank" rel="noopener">Open file</a>`
                      : ""
                  }
                </div>`;
              })
              .join("")
          : `<p class="scp-muted">No drawings uploaded.</p>`;

      const sanitizeCell = (value, fallback = "—") => {
        if (value === undefined || value === null) {
          return fallback;
        }
        const stringValue =
          typeof value === "string" ? value.trim() : String(value);
        if (!stringValue) {
          return fallback;
        }
        return escapeHtml(stringValue);
      };

      const checklistBySection = (prefix) =>
        (pdfData.checklistEntries || []).filter((entry) =>
          entry.pos?.toString().startsWith(prefix)
        );

      const renderChecklistTable = (title, prefix) => {
        const entries = checklistBySection(prefix);
        const rows =
          entries
            .map((entry) => {
              const scope = entry.scope || entry.circumference;
              const method =
                entry.controlMethod || entry.method || entry["Control method"];
              return `<tr>
              <td>${sanitizeCell(entry.pos)}</td>
              <td>${sanitizeCell(entry.checkingThe || entry.controlOf)}</td>
              <td>${sanitizeCell(entry.subject)}</td>
              <td class="highlight">${sanitizeCell(specialText)}</td>
              <td>${sanitizeCell(entry.basis)}</td>
              <td>${sanitizeCell(method)}</td>
              <td>${sanitizeCell(scope)}</td>
              <td>${sanitizeCell(entry.acceptanceCriteria)}</td>
              <td>${sanitizeCell(entry.time)}</td>
            </tr>`;
            })
            .join("") ||
          `<tr><td colspan="9" class="scp-empty-row">No entries captured for ${escapeHtml(
            title
          )}</td></tr>`;

        return `<section class="scp-card">
          <h2 class="scp-section-title">${escapeHtml(title)}</h2>
          <div class="scp-table-wrapper">
            <table class="scp-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Control Of</th>
                  <th>Subject</th>
                  <th>Construction Part</th>
                  <th>Basis</th>
                  <th>Control Method</th>
                  <th>Scope</th>
                  <th>Acceptance Criteria</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
      };

      const roles = [
        { label: "Prepared by", signatureType: 1 },
        { label: "Self-control (EK)", signatureType: 2 },
        { label: "Independent controller (EK)", signatureType: 3 },
      ].map((role) => {
        const signature = (pdfData.signatures || []).find(
          (sig) => Number(sig.signatureType) === Number(role.signatureType)
        );

        return {
          ...role,
          signature,
          name: signature?.name || signature?.fullName || signature?.email,
          description: signature?.description,
          signedAt: formatDate(
            signature?.signatureDate || signature?.createdAt
          ),
          company: signature?.company,
        };
      });

      const phases = [
        { name: "UDARBEJDELSESFASE", status: "Under udarbejdelse" },
        { name: "GODKENDELSESFASE", status: "Under kontrol" },
        { name: "UDGIVELSESFASE", status: "Godkendt" },
        { name: "AKTIVFASE", status: "Udgivet" },
        { name: "REVISIONSPASE", status: "Under revision" },
        { name: "ARKIVERINGSFASE", status: "Enkelt / arkiveret" },
      ];

      const basisList = [
        "Building Regulations 2018",
        "SBi271 'Documentation and Control of Load-Bearing Structures'",
        "DS/EN 1990 DK NA:2021, Annex B5",
        "DS 1140:2019 'Execution of Load-Bearing Structures - General Control'",
        "DS/INF 1140:2022 'Guidance for DS 1140'",
      ];

      const qaList = [
        "System updates and approval by management",
        "Procedures followed",
        "Review of execution basis from design phase",
        "Materials in accordance with execution basis",
        "Execution basis controlled/approved",
        "Execution basis from the design phase",
        "Employee qualifications",
        "Self-control and independent control described in plans",
        "Controls documented in reports",
        "Deviations handled by procedure",
        "Documentation of construction as executed",
      ];

      const deviationProcedure = [
        "Work on the construction part is halted and may not continue until the deviation is corrected.",
        "The inspector prepares a deviation report that may include illustrations of the deviation and proposed solutions.",
        "The controller assesses together with the executors whether the defect has a nature that necessitates a reassessment of the working basis for execution and the associated controls.",
        "The controller assesses together with the executors the implications of the deviation for the further execution and suitability in relation to the intended purpose in the design.",
        "The controller assesses together with the executors the necessary measures to make the component acceptable.",
        "The controller assesses together with the executors the necessity of rejection and replacement of the non-repairable building part.",
        "After rectifying the deviation, this is checked again and the result is documented.",
        "If it is not possible to correct the deviation, the structural designer must approve the deviation.",
      ];

      const topBullets = [
        "Presence of assembly components",
        "Bearing depths during the assembly of prefabricated construction components",
        "The subsoil for geotechnical constructions regarding whether the soil is as assumed in the execution basis from the design.",
      ];

      const requirements = [
        "Familiarity with best practices for executing construction parts and sections.",
        "Ability to create an overview and wonder.",
        "Knowledge of their own limitations and use of professional experts.",
        "Competencies at least equivalent to the person who performed the work.",
        "Professional qualifications and competencies for construction work.",
        "Ability to understand standards, control plans, and good craftsmanship.",
        "Capability of familiarizing oneself with documents forming the basis for execution.",
      ];

      const registerRows = [
        { id: `B2. ${xValue}`, description: "Static control plan" },
        { id: `B3. ${xValue}`, description: "Static Control Report" },
        { id: `A5. ${xValue}`, description: "A5 as performed" },
      ];

      const tocEntries = [
        { label: "Static documentation", page: 1 },
        { label: "Eurocode:", page: 1, highlight: true },
        ...selectedEuroCodes.map((code) => ({
          label: `• ${getEuroCodeName(code)}`,
          page: null,
          indent: true,
        })),
        { label: "Construction case:", page: 1 },
        { label: "Construction section for execution:", page: 1 },
        { label: "1. General", page: 4, section: true },
        { label: "1.1 Description of the Control Work", page: 4, indent: true },
        { label: "1.2 Types of control", page: 4, indent: true },
        { label: "1.3 Control level", page: 5, indent: true },
        { label: "1.4 Organization of control work", page: 5, indent: true },
        { label: "1.5 Controllers", page: 6, indent: true },
        { label: "1.6 Use of assistance", page: 6, indent: true },
        { label: "1.7 Follow-up on deviations", page: 7, indent: true },
        { label: "2. General controls", page: 7, section: true },
        { label: "2.1 General", page: 7, indent: true },
        { label: "2.3 Controlsection", page: 7, indent: true },
        {
          label: "2.4 Explanation of the selection of controls",
          page: 8,
          indent: true,
        },
        { label: "2.5 Controlpoints", page: 8, indent: true },
        { label: "3. Special controls", page: 8, section: true },
        { label: "3.1 General", page: 8, indent: true },
        { label: "3.2 Special control points", page: 8, indent: true },
        { label: "4. Documentation", page: 9, section: true },
        {
          label: "4.1 General description of documentation",
          page: 9,
          indent: true,
        },
        {
          label: "4.2 Documentation of general controls",
          page: 9,
          indent: true,
        },
        {
          label: "4.3 Documentation of special controls",
          page: 9,
          indent: true,
        },
        {
          label: "4.4 Documentation for deviations and follow-up",
          page: 9,
          indent: true,
        },
        {
          label: "4.5 Control of Control Documentation",
          page: 9,
          indent: true,
        },
        { label: "5.1 registers", page: 10 },
        { label: "5.2 Scope of control", page: 10 },
        { label: "6. Selected control locations", page: 11, section: true },
        { label: "7. Static control (table)", page: 12, section: true },
        { label: "7.0 Static Control Plan table for", page: 12, indent: true },
        {
          label: "7.3 Control of Documentation of Materials and Products",
          page: 14,
          indent: true,
        },
        { label: "7.4 Receiving control deliveries", page: 16, indent: true },
        { label: "7.5 Control of execution", page: 17, indent: true },
        { label: "7.6 Final control", page: 18, indent: true },
      ];

      const brandLogoMarkup = STATIC_CONTROL_BRAND_LOGO
        ? `<img class="scp-logo-img" src="${STATIC_CONTROL_BRAND_LOGO}" alt="Assurement Logo" />`
        : `<span class="scp-logo-placeholder">A</span>`;

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeCompanyName} - ${safeReportTitle}</title>
    <style>
      :root {
        color-scheme: light;
      }
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        background: #f7f9fc;
        color: #1f2933;
        line-height: 1.5;
      }
      a {
        color: inherit;
      }
      .scp-toolbar {
        background: #ffffff;
        border-bottom: 1px solid #dfe3eb;
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .scp-toolbar-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      .scp-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .scp-logo-circle {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 1px solid #dfe3eb;
        background: #edf2f7;
        display: grid;
        place-items: center;
        overflow: hidden;
      }
      .scp-logo-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .scp-logo-placeholder {
        font-weight: 600;
        font-size: 1.1rem;
        color: #0f172a;
      }
      .scp-logo-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .scp-logo-title {
        font-size: 1rem;
        font-weight: 600;
        color: #0f172a;
      }
      .scp-logo-subtitle {
        font-size: 0.85rem;
        color: #475569;
      }
      .scp-logo-muted {
        font-size: 0.75rem;
        color: #94a3b8;
      }
      .scp-toolbar-heading {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .scp-toolbar-heading h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 600;
        color: #0f172a;
      }
      .scp-toolbar-heading .scp-meta-light {
        margin-top: 0;
      }
      .scp-container {
        max-width: 960px;
        margin: 0 auto;
        padding: 24px 16px 48px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .scp-page,
      .scp-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
      }
      .scp-card {
        padding: 20px;
      }
      .scp-page h2,
      .scp-section-title {
        margin-top: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #0f172a;
      }
      .scp-page h3 {
        margin-top: 24px;
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
      }
      .scp-meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .scp-meta-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 999px;
        background: #e5e7eb;
        color: #334155;
        font-size: 0.85rem;
      }
      .scp-highlight-box,
      .scp-note {
        margin-top: 20px;
        border: 1px solid #dfe3eb;
        border-radius: 12px;
        background: #f8fafc;
        padding: 16px;
      }
      .scp-duo {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-top: 24px;
      }
      .scp-list {
        margin: 0;
        padding-left: 20px;
      }
      .scp-list li {
        margin-bottom: 8px;
      }
      .scp-muted {
        color: #64748b;
        font-size: 0.95rem;
      }
      .scp-meta-light {
        font-size: 0.85rem;
        color: #94a3b8;
      }
      .scp-drawing-item {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .scp-info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 20px;
      }
      .scp-info-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        padding: 16px;
      }
      .scp-info-card h4 {
        margin: 0 0 6px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .scp-info-card p {
        margin: 0;
        font-weight: 600;
        color: #0f172a;
      }
      .scp-table-wrapper {
        margin-top: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 640px;
      }
      th,
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 12px;
        text-align: left;
        font-size: 0.9rem;
      }
      thead th {
        background: #f8fafc;
        font-weight: 600;
        color: #1f2937;
      }
      tbody tr:nth-child(even) td {
        background: #f9fbfc;
      }
      .scp-table-simple {
        margin-top: 16px;
      }
      .scp-table-simple th,
      .scp-table-simple td {
        border: 1px solid #e2e8f0;
        background: transparent;
      }
      .scp-empty-row {
        text-align: center;
        color: #94a3b8;
      }
      .highlight {
        background: #fef9c3;
      }
      .scp-signature-table {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
      }
      .scp-signature-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px;
        background: #f8fafc;
      }
      .scp-signature-header {
        margin: 0 0 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #475569;
        letter-spacing: 0.06em;
      }
      .scp-signature-date {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
      }
      .scp-signature-meta {
        margin: 4px 0 0;
        font-size: 0.85rem;
        color: #475569;
      }
      .scp-signature-placeholder {
        font-size: 0.85rem;
        color: #94a3b8;
      }
      .scp-signature-image {
        max-width: 140px;
        max-height: 60px;
        object-fit: contain;
        border: 1px solid #d9e2ec;
        border-radius: 4px;
        background: #ffffff;
        padding: 4px;
        margin-top: 8px;
      }
      .scp-step-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;
      }
      .scp-step {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        background: #f8fafc;
      }
      .scp-pill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 16px 0 0;
        list-style: none;
        padding: 0;
      }
      .scp-pill {
        padding: 4px 12px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .scp-signature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      .scp-signature-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        padding: 16px;
      }
      .scp-signature-card h4 {
        margin: 0 0 6px;
        font-size: 0.8rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #475569;
      }
      .scp-signature-card p {
        margin: 4px 0;
        font-size: 0.9rem;
      }
      .scp-toc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid #e2e8f0;
        font-size: 0.9rem;
      }
      .scp-toc-row span:last-child {
        margin-left: 16px;
        color: #475569;
        font-weight: 500;
      }
      .scp-toc-row.scp-toc-indent {
        padding-left: 18px;
        font-size: 0.85rem;
      }
      .scp-toc-row.scp-toc-section {
        font-weight: 600;
        color: #0f172a;
      }
      .scp-toc-row.scp-toc-highlight {
        color: #0369a1;
      }
      @media (max-width: 720px) {
        body {
          background: #ffffff;
        }
        .scp-toolbar {
          padding: 16px;
        }
        .scp-container {
          padding: 16px;
          gap: 16px;
        }
        table {
          min-width: 0;
        }
        th,
        td {
          font-size: 0.85rem;
          padding: 8px 10px;
        }
      }
    </style>
  </head>
  <body>
    <div class="scp-toolbar">
      <div class="scp-toolbar-content">
        <div class="scp-brand">
          <div class="scp-logo-circle">
            ${brandLogoMarkup}
          </div>
          <div class="scp-logo-text">
            <span class="scp-logo-title">Assurement</span>
            <span class="scp-logo-subtitle">Report · system</span>
            <span class="scp-logo-muted">Part of Quality Assurance Denmark</span>
          </div>
        </div>
        <div class="scp-toolbar-heading">
          <h1>${safeReportTitle}</h1>
          <p class="scp-meta-light">${safeCompanyName}</p>
        </div>
      </div>
      <!-- Toolbar actions hidden per request -->
    </div>
    <div class="scp-container">
      <section class="scp-page">
        <h2>Static Control Plan</h2>
        <p class="scp-muted">For udførende indenfor konstruktionsafsnit</p>
        <div class="scp-meta-bar">
          <span class="scp-meta-chip">Company ID: ${escapeHtml(
            companyId
          )}</span>
          <span class="scp-meta-chip">Project ID: ${escapeHtml(
            projectId
          )}</span>
          <span class="scp-meta-chip">Subject Matter: ${escapeHtml(
            subjectMatterId
          )}</span>
          <span class="scp-meta-chip">Version: v${escapeHtml(
            pdfData.gamma?.currentVersion || 1
          )}</span>
        </div>
        <div class="scp-highlight-box">
          <p><strong>Company:</strong> ${escapeHtml(
            pdfData.company?.name || "[Company Name]"
          )}</p>
          <p><strong>B3.</strong> ${escapeHtml(xValue)}<br />“${escapeHtml(
        specialText
      )}”</p>
        </div>
        <div class="scp-note">
          <h3>Static Documentation</h3>
          <p>For load-bearing structures according to DS1140 applicable for:</p>
          <p><strong>Eurocode:</strong> ${escapeHtml(specialText)}</p>
        </div>
        <div class="scp-duo">
          <div>
            <h3>Applicable EU standards 2024</h3>
            <ul class="scp-list">
              ${euroCodeMarkup}
            </ul>
          </div>
          <div>
            <h3>Uploaded Drawings</h3>
            ${drawingsMarkup}
          </div>
        </div>
        <p class="scp-meta-light">Static Control Plan - Version ${escapeHtml(
          pdfData.gamma?.currentVersion || 1
        )}</p>
      </section>

      <section class="scp-page">
        <h2>Construction Case</h2>
        <div class="scp-info-grid">
          <div class="scp-info-card">
            <h4>Created</h4>
            <p>${escapeHtml(createdDate || "N/A")}</p>
          </div>
          <div class="scp-info-card">
            <h4>Project Name/ID</h4>
            <p>${escapeHtml(pdfData.project?.name || "N/A")}</p>
            <p class="scp-meta-light">${escapeHtml(
              pdfData.project?.caseNumber ||
                pdfData.project?.projectNumber ||
                "N/A"
            )}</p>
            <p class="scp-meta-light">${escapeHtml(
              pdfData.project?.address || "N/A"
            )}</p>
          </div>
          <div class="scp-info-card">
            <h4>Prepared by</h4>
            <p>${escapeHtml(pdfData.company?.name || "N/A")}</p>
            <p class="scp-meta-light">${escapeHtml(
              pdfData.company?.address || "N/A"
            )}</p>
            <p class="scp-meta-light">Postal code: ${escapeHtml(
              pdfData.company?.postalCode || "N/A"
            )}</p>
            <p class="scp-meta-light">CVR: ${escapeHtml(
              pdfData.company?.cvr || pdfData.company?.cvrNumber || "N/A"
            )}</p>
            <p class="scp-meta-light">Email: ${escapeHtml(
              pdfData.company?.email || "N/A"
            )}</p>
            <p class="scp-meta-light">Contact: ${escapeHtml(
              pdfData.company?.contactPerson || "N/A"
            )}</p>
          </div>
        </div>
      </section>

      <section class="scp-page">
        <h2>Construction Section for Execution</h2>
        <div class="scp-highlight-box">
          <p><strong>B2.</strong> ${escapeHtml(`${xValue} ${specialText}`)}</p>
          <p><strong>Version:</strong> v${escapeHtml(
            pdfData.gamma?.currentVersion || 1
          )} &nbsp; <strong>Construction CL.</strong> ${escapeHtml(
        pdfData.gamma?.cc || "KK3"
      )}</p>
        </div>
        <div class="scp-signature-table">
          ${roles
            .map((role) => {
              const signedDate = role.signedAt
                ? escapeHtml(role.signedAt)
                : "Select date";
              const primaryLine = escapeHtml(
                role.name || role.signature?.value || "Select an element."
              );
              const descriptionLine = role.description
                ? `<p class="scp-signature-meta">${escapeHtml(
                    role.description
                  )}</p>`
                : "";
              const companyLine = role.company
                ? `<p class="scp-signature-meta">${escapeHtml(
                    role.company
                  )}</p>`
                : "";
              let signatureImage = "";
              const base64 = role.signature?.signature;
              if (
                base64 &&
                typeof base64 === "string" &&
                base64.startsWith("data:image")
              ) {
                signatureImage = `<img class="scp-signature-image" src="${base64}" alt="Signature" />`;
              }

              return `<div class="scp-signature-row">
                <div>
                  <p class="scp-signature-header">Signed</p>
                  <p class="scp-signature-date">${signedDate}</p>
                </div>
                <div>
                  <p class="scp-signature-header">${escapeHtml(role.label)}</p>
                  <p>${primaryLine}</p>
                  ${descriptionLine}
                  ${companyLine}
                </div>
                <div>
                  <p class="scp-signature-header">Company</p>
                  ${
                    role.signature?.company
                      ? `<p>${escapeHtml(role.signature.company)}</p>`
                      : '<p class="scp-signature-placeholder">CONTRACTOR</p>'
                  }
                  ${signatureImage}
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </section>

      <section class="scp-page">
        <h2>Status of document completion</h2>
        <div class="scp-duo">
          <div>
            <h3>Workflow</h3>
            <div class="scp-step-list">
              ${phases
                .map(
                  (phase) => `<div class="scp-step">
                  <strong>${escapeHtml(
                    phase.name
                  )}</strong><br />Status: ${escapeHtml(phase.status)}
                </div>`
                )
                .join("")}
            </div>
          </div>
          <div>
            <h3>Guidance</h3>
            <p>The figure to the right indicates which phase you are in regarding your document submissions, and should also assist both the contractor and the advisor in proactively communicating back and forth regarding any potential corrections.</p>
            <p>The document is signed when it is approved by the project engineer of the structure; until then, the document is a dynamic document.</p>
            <p>Expected approval time is 14 days; thereafter, the content of the document is considered approved.</p>
          </div>
        </div>
        <div class="scp-table-wrapper">
          <table class="scp-table">
            <thead>
              <tr>
                <th>Status indication</th>
                <th>Version</th>
                <th>Approval</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(createdDate || "N/A")}</td>
                <td>v${escapeHtml(pdfData.gamma?.currentVersion || 1)}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="scp-page">
        <h2>Table of Contents</h2>
        <div class="scp-highlight-box">
          ${tocEntries
            .map((entry) => {
              const label = escapeHtml(entry.label);
              const page = entry.page
                ? `<span>${escapeHtml(entry.page)}</span>`
                : "";
              const indent = entry.indent ? "scp-toc-indent" : "";
              const sectionClass = entry.section ? "scp-toc-section" : "";
              const highlight = entry.highlight ? "scp-toc-highlight" : "";
              return `<div class="scp-toc-row ${indent} ${sectionClass} ${highlight}">
                <span>${label}</span>
                ${page}
              </div>`;
            })
            .join("")}
        </div>
      </section>

      <section class="scp-page">
        <h2>1. General</h2>
        <h3>1.1 Description of the Control Work</h3>
        <p>The static control plan covers the execution of construction and related works, carried out in accordance with the building project's designer. The control focuses on examining materials and execution, with particular attention to material dimensions, placement, and compliance with tolerances.</p>
        <h3>Basis for the control performed:</h3>
        <ul class="scp-list">
          ${basisList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <p>Supplementary rules and regulations according to the mentioned euro code.</p>
        <p>Rules and regulations form eurocode details. Later version.</p>
        <p>Control is also based on the executor's documented quality assurance system, which is periodically reviewed.</p>
        <h3>Quality assurance system includes:</h3>
        <ul class="scp-list">
          ${qaList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <p>Independent control is carried out by the executing party, with exceptions for special control points where it's performed by the design organization.</p>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document</th>
              <th>Construction Section: Execution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>B.2. ${escapeHtml(xValue)}</td>
              <td>Static Control Plan</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="scp-page">
        <h2>1.2 Types of control &amp; 1.3 Control level</h2>
        <p>The structure is classified into construction class <span class="highlight">${escapeHtml(
          pdfData.gamma?.exc || "CCX"
        )} / ${escapeHtml(
        pdfData.gamma?.cc || "KKX"
      )}</span>. Self-control and independent control of the executed works are carried out. There is no requirement for third-party control.</p>
        <h3>Self-control</h3>
        <p>Self-control is carried out by the person who performed the construction upon completion of parts or the whole. Self-control is performed during execution for concealed parts.</p>
        <p>Self-control includes assessment of whether:</p>
        <ul class="scp-list">
          <li>The entire construction and its parts have been executed.</li>
          <li>The construction has been executed correctly based on craftsmanship and good building practice.</li>
          <li>The construction aligns with the execution basis and agreements with the designer/construction management.</li>
          <li>Tolerances during execution adhere to relevant standards, good practices, and project-specific tolerances.</li>
          <li>Documentation of execution has been carried out, collected, and systematized according to SBi 271 section 2.6.</li>
        </ul>
        <p>Self-control is always performed and documented in a control report.</p>
        <h3>Independent control</h3>
        <p>Independent control is carried out by individuals who did not directly participate in the execution of the relevant control section. All independent controls within a section are performed by the same person and not by the work team leader.</p>
        <p>Independent control is carried out after self-control has been performed and reported.</p>
        <p>The independent control is performed in accordance with the project-specific static control plan for execution.</p>
        <h3>1.3 Control level</h3>
        <p>The control level for general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.</p>
      </section>

      <section class="scp-page">
        <h2>1.4 Organization of control work &amp; 1.5 Controllers</h2>
        <p>One and only one controller must be assigned per control section, and they must not have participated in the execution of that section.</p>
        <p>The executing party or their representative has prepared the control plan and will act as the lead controller for selecting controllers and verifying the control report.</p>
        <p>The goal is for the lead controller to perform on-site control to simplify the work.</p>
        <h3>1.5 Controllers</h3>
        <p>Independent control is carried out by an actor who has not acted as the executing party on site.</p>
        <p>Control is handled by the same organization as the executing party.</p>
        <p>Controllers must have the right and necessary competencies for performing control, acquired through education and experience.</p>
        <h3>Minimum requirements for controllers:</h3>
        <ul class="scp-list">
          ${requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <p>The inspector's qualifications and competencies should be documented in the control report, e.g., by their CV.</p>
        <h3>1.6 Use of assistance</h3>
        <p>Assisting inspectors must have at least the competencies described in section 1.3.</p>
        <p>The ultimate responsibility for the inspection at all times rests with the inspector and is therefore not transferred to the assisting inspector.</p>
        <p>The inspector must follow up on inspections by assistants, ensure reasonable conduct, and sign the documentation.</p>
      </section>

      <section class="scp-page">
        <h2>1.7 Follow-up on deviations</h2>
        <p>If deviations are found during the inspection, the following procedure is applied:</p>
        <ul class="scp-list">
          ${deviationProcedure
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
        <p>If there are serious or multiple repeated errors at a control point, the inspection may be extended to a maximum inspection of the current control point and/or the structural designer may be involved in the assessment of the deviation.</p>
        <h2>2. General controls</h2>
        <p>The general control is performed in accordance with DS 1140. In addition, the general control is carried out in accordance with the rules in DS/EN 1992-DS/EN 1999, including the associated national annexes and in accordance with the rules in the related execution standards, including the associated national application documents. The general control is carried out based on the division in DS 1140, annex B.</p>
        <table class="scp-table-simple">
          <thead>
            <tr><th>Control item</th></tr>
          </thead>
          <tbody>
            <tr><td>B.1 Execution basis from design</td></tr>
            <tr><td>B.2 Execution basis for the work</td></tr>
            <tr><td>B.3 Materials and products</td></tr>
            <tr><td>B.4 Receiving control</td></tr>
            <tr><td>B.5 Execution</td></tr>
            <tr><td>B.5.1 Transport and storage on site</td></tr>
            <tr><td>B.5.2 Previously executed construction</td></tr>
            <tr><td>B.5.3 Assembly of prefabricated construction components</td></tr>
            <tr><td>B.5.4 Execution of non-certified construction components</td></tr>
            <tr><td>B.6 Final control</td></tr>
          </tbody>
        </table>
        <p>The independent control of whether the self-control has been performed is always carried out as a maximum control.</p>
      </section>

      <section class="scp-page">
        <h2>2.3 Control section &amp; 2.5 Control plan</h2>
        <p>A construction section is subdivided into control sections based on factors like construction types, scope, or execution timing. Control sections must be well-defined, delineated, and bounded by a production period of a maximum of 4 weeks. The execution of the construction section is divided according to the tender control plan for the following control sections.</p>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document</th>
              <th>Construction Section: Execution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>B2. ${escapeHtml(xValue)}</td>
              <td>Static Control Plan</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
          </tbody>
        </table>
        <h3>2.4 Explanation of the selection of controls</h3>
        <p>Since the present construction section is classified in construction class ${escapeHtml(
          pdfData.gamma?.cc || "KK"
        )}, an explanation of the selected control points must be provided, which is done in connection with the control report.</p>
        <h3>2.5 Control plan</h3>
        <p>Control points are specified in the control plan prepared by the executing Contractor.</p>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document</th>
              <th>Construction Section: Execution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>B2. ${escapeHtml(xValue)}</td>
              <td>Static Control Plan</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="scp-page">
        <h2>3. Special controls</h2>
        <h3>3.1 General</h3>
        <p>There are no special controls indicated by the building project designers according to the present construction section. If there are special controls, they will be listed under section 3.2.</p>
        <h3>3.2 Special control points</h3>
        <p>According to section 3.1, no requirements for special controls have been set. If there are special controls, they will be indicated below in the table; otherwise, none exist.</p>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(pdfData.gamma?._id || "Special control id")}</td>
              <td>Special control</td>
              <td>${escapeHtml(
                pdfData.gamma?.description ||
                  pdfData.gamma?.note ||
                  "Note form note"
              )}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="scp-page">
        <h2>4. Documentation</h2>
        <h3>4.1 General description of documentation</h3>
        <p>Documentation for the current construction section includes a control plan, associated appendices, control reports, and their appendices.</p>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Construction Section: Execution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>B3. ${escapeHtml(xValue)}</td>
              <td>Static Control Report</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
            <tr>
              <td>A5. ${escapeHtml(xValue)}</td>
              <td>A5 as performed</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
          </tbody>
        </table>
        <p>The above is updated each time a change occurs regarding the execution.</p>
        <p>Documentation must include actual control results and a follow-up on comments.</p>
        <h3>4.2 Documentation of general controls</h3>
        <p>Documentation of general controls includes a completed control report, clarification of all points, approval and signing by the controller, and documentation of deviations. Documentation must be retained for at least 5 years.</p>
        <h3>4.3 Documentation of special controls</h3>
        <p>The structural designer has not specified requirements for special controls in their documentation.</p>
        <h3>4.4 Documentation for deviations and follow-up</h3>
        <p>Deviations are recorded and deviation reports are created as appendices to control reports. The building designer is involved if remedies deviate from the execution basis.</p>
        <h3>4.5 Control of Control Documentation</h3>
        <p>Control documentation is collected and reviewed by the controller to ensure all documents are present, and all controls are completed, dated, and signed.</p>
      </section>

      <section class="scp-page">
        <h2>5. Registers &amp; Scope of control</h2>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Construction Section: Execution</th>
            </tr>
          </thead>
          <tbody>
            ${registerRows
              .map(
                (row) => `<tr>
                <td>${escapeHtml(row.id)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td>${escapeHtml(specialText)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <p>The naming of the documents above is determined by the building designer.</p>
        <p>The aforementioned documents will be part of the overall static documentation for the current construction section when the work is completed.</p>
        <p>See also the table further down in the control plan under item 7.1.</p>
        <h3>5.2 Scope of control</h3>
        <p>The scope of controls is indicated in the tables under item 7.1 and is determined based on which (classes) the Building Project Designers have specified in the project materials.</p>
      </section>

      <section class="scp-page">
        <h2>6. Selected control locations</h2>
        <div class="scp-note">
          <p>Marked main drawing.</p>
          <p class="scp-meta-light">Control locations are selected below on the drawing.</p>
        </div>
        <p>Control locations are indicated above where the executive party intends to perform control.</p>
        <p class="scp-muted">Drawing preview area (link to drawing if available)</p>
      </section>

      <section class="scp-page">
        <h2>7. Static control (table)</h2>
        <table class="scp-table-simple">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document</th>
              <th>Construction Section</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>B2. ${escapeHtml(xValue)}</td>
              <td>Static Control plan</td>
              <td>${escapeHtml(specialText)}</td>
            </tr>
          </tbody>
        </table>
        <p>In the table below, control of the project materials provided at the submission of prices has been carried out, forming the basis for the intended and executed work, which is a dynamic process until design approval.</p>
      </section>

      ${renderChecklistTable("7.1 Execution basis from design", "7.1")}
      ${renderChecklistTable("7.2 Execution basis for the work", "7.2")}
      ${renderChecklistTable(
        "7.3 Control of Documentation of Materials and Products",
        "7.3"
      )}
      ${renderChecklistTable("7.4 Reception control", "7.4")}
      ${renderChecklistTable("7.5 Control of execution", "7.5")}
      ${renderChecklistTable("7.6 Final control", "7.6")}
    </div>
  </body>
</html>`;

      res.set("Content-Type", "text/html");
      res.status(200).send(html);
    } catch (error) {
      console.error("❌ Error rendering static control plan HTML:", error);
      const status = error.status || 500;
      const message =
        error.message ||
        "Unable to render static control plan viewer. Please try again later.";
      res.status(status).type("text/html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Static Control Plan</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background-color: #0f172a;
        color: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      .error-card {
        background-color: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 16px;
        padding: 2rem 2.5rem;
        max-width: 480px;
        text-align: center;
        box-shadow: 0 20px 45px rgba(2, 132, 199, 0.3);
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
        color: #38bdf8;
      }
      p {
        margin: 0;
        line-height: 1.6;
        font-size: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="error-card">
      <h1>Unable to load report</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`);
    }
  });

  return router;
};
