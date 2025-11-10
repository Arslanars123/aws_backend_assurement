const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const {
  generateStaticControlPlanPDFBuffer,
} = require("./services/staticControlPlanPdf");

module.exports = (db) => {
  const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };

  const fetchStaticControlPlanData = async (companyId, projectId, subjectMatterId) => {
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
      const specialTextDoc = await db
        .collection("projectspecialtext")
        .findOne({
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
        console.log("🔄 Checking for edited data in editcontrols collection...");
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
              console.log(
                "      checkingThe:",
                first74AfterEdit.checkingThe
              );
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
          drawing.originalname ||
          drawing.filename ||
          drawing.name ||
          "Drawing",
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
          if (mappedEntry.pos && mappedEntry.pos.startsWith("7.4") && !logged74) {
            logged74 = true;
            console.log("   7.4 entry DURING MAPPING:");
            console.log("      Original entry.checkingThe:", entry.checkingThe);
            console.log(
              "      Mapped entry.checkingThe:",
              mappedEntry.checkingThe
            );
            console.log(
              "      Mapped entry.controlOf:",
              mappedEntry.controlOf
            );
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
        error:
          error.message || "Failed to generate static control plan PDF",
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
        subjectMatterId || pdfData?.gamma?.subjectMatterId || "static-control-plan";

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
        error:
          error.message || "Failed to stream static control plan PDF",
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

      const params = new URLSearchParams({
        companyId,
        projectId,
        subjectMatterId,
      }).toString();
      const pdfUrl = `/static-control-plan.pdf?${params}`;

      const companyName = pdfData?.company?.name || "Static Control Plan";
      const reportTitle =
        pdfData?.gamma?.profession || pdfData?.gamma?.item || "Static Control Plan";

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${companyName} - ${reportTitle}</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background-color: #0f172a;
        color: #f1f5f9;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      header {
        padding: 1.25rem 1.5rem;
        background: linear-gradient(120deg, #1e293b, #0369a1);
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.3);
      }
      header h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      header p {
        margin: 0.25rem 0 0;
        font-size: 0.95rem;
        opacity: 0.8;
      }
      main {
        flex: 1;
        display: flex;
        background-color: #0f172a;
        padding: 1rem 1.5rem 1.5rem;
      }
      iframe {
        width: 100%;
        height: calc(100vh - 190px);
        border: none;
        border-radius: 0;
        background: #fff;
        box-shadow: 0 25px 50px -12px rgba(15, 118, 110, 0.45);
      }
      .info-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .info-chip {
        background-color: rgba(148, 163, 184, 0.15);
        border: 1px solid rgba(148, 163, 184, 0.2);
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
      }
      @media (max-width: 768px) {
        header h1 {
          font-size: 1.1rem;
        }
        header p {
          font-size: 0.85rem;
        }
        main {
          padding: 0.5rem;
        }
        iframe {
          height: calc(100vh - 150px);
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${companyName}</h1>
      <p>${reportTitle}</p>
      <div class="info-bar">
        <span class="info-chip">Company ID: ${companyId}</span>
        <span class="info-chip">Project ID: ${projectId}</span>
        <span class="info-chip">Subject Matter: ${subjectMatterId}</span>
        <span class="info-chip">Version: v${pdfData?.gamma?.currentVersion || 1}</span>
      </div>
    </header>
    <main>
      <iframe src="${pdfUrl}" title="Static Control Plan PDF"></iframe>
    </main>
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
      res
        .status(status)
        .type("text/html")
        .send(`<!DOCTYPE html>
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
