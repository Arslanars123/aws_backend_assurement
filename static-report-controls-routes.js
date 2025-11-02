const express = require("express");

// Function to create routes with database connection
function createStaticReportControlsRoutes(db) {
  const router = express.Router();

  // New endpoint for "controls of static report" collection
  router.post("/get-controls-of-static-report", async (req, res) => {
    try {
      const { projectEuroCodes = [], subjectMatterId, projectId } = req.body;

      if (!Array.isArray(projectEuroCodes) || projectEuroCodes.length === 0) {
        return res
          .status(400)
          .json({ error: "projectEuroCodes array is required" });
      }

      // Normalize to strings so 5 and "5" match the same docs
      const euroCodesStr = projectEuroCodes
        .map((v) => String(v).trim())
        .filter(Boolean);

      console.log("🔍 Pipeline debug - subjectMatterId:", subjectMatterId);
      console.log("🔍 Pipeline debug - euroCodesStr:", euroCodesStr);
      console.log("🔍 Pipeline debug - projectId:", projectId);

      const pipeline = [
        // coerce stored euroCode (number or string) to string
        { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },

        // match any requested euro code (ignore subjectMatterId - filter only by EuroCode)
        { $match: { euroCodeStr: { $in: euroCodesStr } } },

        // return each entry flattened with doc metadata
        { $unwind: { path: "$entries", includeArrayIndex: "entryIndex" } },
        {
          $project: {
            _id: 0,
            entry: "$entries",
            documentId: "$_id",
            subjectMatterId: 1,
            euroCode: 1,
            language: 1,
            entryIndex: 1,
          },
        },
      ];

      console.log("🔍 Pipeline stages:", JSON.stringify(pipeline, null, 2));

      // Debug: Check what documents match the first few stages
      const debugPipeline = [
        { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },
        { $match: { euroCodeStr: { $in: euroCodesStr } } },
        { $limit: 5 },
      ];

      const debugDocs = await db
        .collection("controls of static report")
        .aggregate(debugPipeline)
        .toArray();
      console.log("🔍 Documents matching EuroCode filter:", debugDocs.length);
      if (debugDocs.length > 0) {
        console.log("🔍 Sample matching document:", {
          _id: debugDocs[0]._id,
          subjectMatterId: debugDocs[0].subjectMatterId,
          euroCode: debugDocs[0].euroCode,
          euroCodeStr: debugDocs[0].euroCodeStr,
          entriesCount: debugDocs[0].entries?.length || 0,
        });
      }

      const rows = await db
        .collection("controls of static report")
        .aggregate(pipeline)
        .toArray();

      if (!rows.length) {
        // Debug: Check what EuroCodes actually exist in the database
        const allEuroCodes = await db
          .collection("controls of static report")
          .distinct("euroCode");
        console.log("🔍 All EuroCodes in database:", allEuroCodes);
        console.log("🔍 Requested EuroCodes:", euroCodesStr);

        return res.status(404).json({
          error: "No controls matched the given euro codes",
          requestedEuroCodes: euroCodesStr,
          availableEuroCodes: allEuroCodes,
        });
      }

      let entries = rows.map((r) => ({
        ...r.entry,
        _id: `${r.documentId}_${r.entryIndex}`,
        documentId: r.documentId,
        subjectMatterId: r.subjectMatterId,
        euroCode: r.euroCode,
        language: r.language,
        entryIndex: r.entryIndex,
      }));

      // If projectId is provided, check for edited data and replace entries
      if (projectId) {
        console.log(
          "🔄 Checking for edited data to replace original entries..."
        );
        console.log(
          `🔍 Query params - projectId: ${projectId}, subjectMatterId: ${subjectMatterId}`
        );

        // Get all edited controls for this project + subjectMatterId
        const editedControls = await db
          .collection("editcontrols")
          .find({
            projectId: projectId,
            subjectMatterId: subjectMatterId,
          })
          .toArray();

        console.log(
          `📝 Found ${editedControls.length} edited controls for projectId: ${projectId}, subjectMatterId: ${subjectMatterId}`
        );

        if (editedControls.length > 0) {
          console.log(
            "📋 Edited controls:",
            editedControls.map((ec) => ({
              pos: ec.editedFields?.pos,
              subjectMatterId: ec.subjectMatterId,
              projectId: ec.projectId,
            }))
          );
        }

        // Create a map of edited data by projectId + subjectMatterId + pos for precise lookup
        const editedDataMap = new Map();
        editedControls.forEach((editedControl) => {
          if (editedControl.editedFields && editedControl.editedFields.pos) {
            // Create composite key: projectId_subjectMatterId_pos
            const key = `${editedControl.projectId}_${editedControl.subjectMatterId}_${editedControl.editedFields.pos}`;
            editedDataMap.set(key, editedControl.editedFields);
            console.log(`🔑 Added to map - key: ${key}`);
          }
        });

        console.log(`🗺️ Total keys in editedDataMap: ${editedDataMap.size}`);

        // Replace entries with edited data if exists (matching projectId + subjectMatterId + pos)
        let replacedCount = 0;
        entries = entries.map((entry) => {
          // Create composite key using REQUEST's subjectMatterId (not entry's)
          const key = `${projectId}_${subjectMatterId}_${entry.pos}`;
          const editedData = editedDataMap.get(key);

          console.log(
            `🔍 Checking entry pos="${
              entry.pos
            }" - key: ${key}, hasEditedData: ${!!editedData}`
          );

          if (editedData) {
            replacedCount++;
            console.log(
              `✅ Replacing entry #${replacedCount} - projectId="${projectId}", subjectMatterId="${subjectMatterId}", pos="${entry.pos}"`
            );
            console.log(`   Original subject: "${entry.subject}"`);
            console.log(`   Edited subject: "${editedData.subject}"`);
            return {
              ...entry,
              ...editedData, // Replace with edited fields
              _isEdited: true, // Flag to indicate this was edited
            };
          }
          return entry;
        });

        console.log(
          `📊 Total entries replaced: ${replacedCount} out of ${entries.length}`
        );
      }

      res.status(200).json({
        meta: {
          requestedProjectEuroCodes: euroCodesStr,
          docsMatched: new Set(rows.map((r) => String(r.documentId))).size,
          entriesCount: entries.length,
        },
        entries,
      });
    } catch (err) {
      console.error("get-controls-of-static-report error:", err);
      res
        .status(500)
        .json({ error: "Failed to fetch controls of static report" });
    }
  });

  router.post("/get-global-controls-of-static-report", async (req, res) => {
    try {
      const docs = await db
        .collection("controls of static report")
        .find({})
        .toArray();

      if (!docs.length) {
        return res.status(404).json({
          error:
            "No controls found for the given EuroCode(s) and language rule",
          filter,
        });
      }

      return res.status(200).json(docs);
    } catch (error) {
      console.error("Error fetching controls of static report:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch controls of static report" });
    }
  });

  // New endpoint to save edited static report controls
  router.post("/save-edited-control", async (req, res) => {
    try {
      const {
        originalEntryId,
        originalEntry,
        projectId,
        companyId,
        profession,
        subjectMatterId,
        euroCodes,
        editedFields,
        editedAt,
        editedBy,
      } = req.body;

      // Validate required fields
      if (!originalEntryId || !projectId || !editedFields) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: originalEntryId, projectId, and editedFields are required",
        });
      }

      const finalSubjectMatterId = subjectMatterId || profession || null;

      // Find gamma document by projectId and profession.SubjectMatterId
      // projectsId in gamma can be array or single value
      const gammaDoc = await db.collection("gammas").findOne({
        $or: [
          { projectsId: projectId }, // If projectsId is single value
          { projectsId: { $in: [projectId] } }, // If projectsId is array
        ],
        "profession.SubjectMatterId": finalSubjectMatterId,
      });

      if (gammaDoc) {
        await db.collection("gammas").updateOne(
          { _id: gammaDoc._id },
          {
            $set: {
              lastEditedAt: new Date().toISOString(),
            },
          }
        );
      } else {
        console.log(
          `⚠️ No gamma document found for projectId: ${projectId}, subjectMatterId: ${finalSubjectMatterId}. Using version 1.`
        );
      }

      // Check if an editcontrol document already exists for this projectId + subjectMatterId + pos
      const existingEditControl = await db.collection("editcontrols").findOne({
        projectId: projectId,
        subjectMatterId: finalSubjectMatterId,
        "editedFields.pos": editedFields.pos, // Check position from editedFields
      });

      let result;
      let editedControlId;

      if (existingEditControl) {
        // Document exists, UPDATE it
        result = await db.collection("editcontrols").updateOne(
          {
            projectId: projectId,
            subjectMatterId: finalSubjectMatterId,
            "editedFields.pos": editedFields.pos,
          },
          {
            $set: {
              originalEntryId: originalEntryId,
              originalEntry: originalEntry || null,
              companyId: companyId || null,
              profession: profession || subjectMatterId || null,
              euroCodes: euroCodes || [],
              editedFields: editedFields,
              editedAt: editedAt || new Date().toISOString(),
              editedBy: editedBy || "unknown",
              updatedAt: new Date().toISOString(),
            },
          }
        );
        editedControlId = existingEditControl._id;
      } else {
        // Document doesn't exist, CREATE new one
        const editedControl = {
          originalEntryId: originalEntryId,
          originalEntry: originalEntry || null,
          projectId: projectId,
          companyId: companyId || null,
          profession: profession || subjectMatterId || null,
          subjectMatterId: finalSubjectMatterId,
          euroCodes: euroCodes || [],
          editedFields: editedFields,
          editedAt: editedAt || new Date().toISOString(),
          editedBy: editedBy || "unknown",
          createdAt: new Date().toISOString(),
        };

        result = await db.collection("editcontrols").insertOne(editedControl);
        editedControlId = result.insertedId;
      }

      if (result.acknowledged || result.modifiedCount > 0) {
        return res.status(200).json({
          success: true,
          message: existingEditControl
            ? "Edited control updated successfully"
            : "Edited control created successfully",
          editedControlId: editedControlId,
          version: gammaDoc.currentVersion || result?.values?.currentVersion,
          action: existingEditControl ? "updated" : "created",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to save edited control",
        });
      }
    } catch (error) {
      console.error("❌ Error saving edited control:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save edited control",
        error: error.message,
      });
    }
  });

  // New endpoint to get edited controls for a project
  router.post("/get-edited-controls", async (req, res) => {
    try {
      const { projectId, originalEntryId } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "projectId is required",
        });
      }

      const query = { projectId: projectId };
      if (originalEntryId) {
        query.originalEntryId = originalEntryId;
      }

      const editedControls = await db
        .collection("editcontrols")
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        editedControls: editedControls,
        count: editedControls.length,
      });
    } catch (error) {
      console.error("❌ Error fetching edited controls:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch edited controls",
        error: error.message,
      });
    }
  });

  // New endpoint to get current version for a project + subjectMatterId
  router.post("/get-current-version", async (req, res) => {
    try {
      const { projectId, subjectMatterId } = req.body;

      if (!projectId || !subjectMatterId) {
        return res.status(400).json({
          success: false,
          message: "projectId and subjectMatterId are required",
        });
      }

      const versionRecord = await db.collection("version").findOne({
        projectId: projectId,
        subjectMatterId: subjectMatterId,
      });

      if (versionRecord) {
        return res.status(200).json({
          success: true,
          currentVersion: versionRecord.currentVersion,
          lastEditedAt: versionRecord.lastEditedAt,
          lastEditedBy: versionRecord.lastEditedBy,
        });
      } else {
        return res.status(200).json({
          success: true,
          currentVersion: 0, // No edits yet
          message: "No version record found",
        });
      }
    } catch (error) {
      console.error("❌ Error fetching current version:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch current version",
        error: error.message,
      });
    }
  });

  // New endpoint to get edited control data by projectId + subjectMatterId + pos
  router.post("/get-edited-control-by-position", async (req, res) => {
    try {
      const { projectId, subjectMatterId, pos } = req.body;

      if (!projectId || !subjectMatterId || !pos) {
        return res.status(400).json({
          success: false,
          message: "projectId, subjectMatterId, and pos are required",
        });
      }

      const editedControl = await db.collection("editcontrols").findOne({
        projectId: projectId,
        subjectMatterId: subjectMatterId,
        "editedFields.pos": pos,
      });

      if (editedControl) {
        return res.status(200).json({
          success: true,
          hasEditedData: true,
          editedControl: editedControl,
        });
      } else {
        return res.status(200).json({
          success: true,
          hasEditedData: false,
          message: "No edited data found for this entry",
        });
      }
    } catch (error) {
      console.error("❌ Error fetching edited control:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch edited control",
        error: error.message,
      });
    }
  });

  // New endpoint to approve a profession for a project
  router.post("/approve-control-plan", async (req, res) => {
    try {
      const { projectId, subjectMatterId, approvedBy } = req.body;

      if (!projectId || !subjectMatterId) {
        return res.status(400).json({
          success: false,
          message: "projectId and subjectMatterId are required",
        });
      }

      // Check if already approved
      const existingApproval = await db
        .collection("approved control plan")
        .findOne({
          projectId: projectId,
          subjectMatterId: subjectMatterId,
        });

      if (existingApproval) {
        // Update existing approval
        await db.collection("approved control plan").updateOne(
          {
            projectId: projectId,
            subjectMatterId: subjectMatterId,
          },
          {
            $set: {
              status: "approved",
              approvedBy: approvedBy || "unknown",
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }
        );
        console.log(
          `✅ Control plan approval updated for projectId: ${projectId}, subjectMatterId: ${subjectMatterId}`
        );
      } else {
        // Create new approval
        await db.collection("approved control plan").insertOne({
          projectId: projectId,
          subjectMatterId: subjectMatterId,
          status: "approved",
          approvedBy: approvedBy || "unknown",
          approvedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        console.log(
          `✅ Control plan approved for projectId: ${projectId}, subjectMatterId: ${subjectMatterId}`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Control plan approved successfully",
      });
    } catch (error) {
      console.error("❌ Error approving control plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to approve control plan",
        error: error.message,
      });
    }
  });

  // New endpoint to check if a profession is approved
  router.post("/check-control-plan-approval", async (req, res) => {
    try {
      const { projectId, subjectMatterId } = req.body;

      if (!projectId || !subjectMatterId) {
        return res.status(400).json({
          success: false,
          message: "projectId and subjectMatterId are required",
        });
      }

      const approval = await db.collection("approved control plan").findOne({
        projectId: projectId,
        subjectMatterId: subjectMatterId,
        status: "approved",
      });

      if (approval) {
        return res.status(200).json({
          success: true,
          isApproved: true,
          approval: approval,
        });
      } else {
        return res.status(200).json({
          success: true,
          isApproved: false,
          message: "Control plan not approved yet",
        });
      }
    } catch (error) {
      console.error("❌ Error checking control plan approval:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check approval status",
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = createStaticReportControlsRoutes;
