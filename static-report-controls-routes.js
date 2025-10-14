const express = require("express");

// Function to create routes with database connection
function createStaticReportControlsRoutes(db) {
  const router = express.Router();

  // New endpoint for "controls of static report" collection
  router.post("/get-controls-of-static-report", async (req, res) => {
    try {
      const { projectEuroCodes = [], subjectMatterId } = req.body;

      if (!Array.isArray(projectEuroCodes) || projectEuroCodes.length === 0) {
        return res.status(400).json({ error: "projectEuroCodes array is required" });
      }

      // Normalize to strings so 5 and "5" match the same docs
      const euroCodesStr = projectEuroCodes.map(v => String(v).trim()).filter(Boolean);

      console.log("🔍 Pipeline debug - subjectMatterId:", subjectMatterId);
      console.log("🔍 Pipeline debug - euroCodesStr:", euroCodesStr);

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
            entryIndex: 1
          }
        }
      ];

      console.log("🔍 Pipeline stages:", JSON.stringify(pipeline, null, 2));

      // Debug: Check what documents match the first few stages
      const debugPipeline = [
        { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },
        { $match: { euroCodeStr: { $in: euroCodesStr } } },
        { $limit: 5 }
      ];
      
      const debugDocs = await db.collection("controls of static report").aggregate(debugPipeline).toArray();
      console.log("🔍 Documents matching EuroCode filter:", debugDocs.length);
      if (debugDocs.length > 0) {
        console.log("🔍 Sample matching document:", {
          _id: debugDocs[0]._id,
          subjectMatterId: debugDocs[0].subjectMatterId,
          euroCode: debugDocs[0].euroCode,
          euroCodeStr: debugDocs[0].euroCodeStr,
          entriesCount: debugDocs[0].entries?.length || 0
        });
      }

      const rows = await db.collection("controls of static report").aggregate(pipeline).toArray();

      if (!rows.length) {
        // Debug: Check what EuroCodes actually exist in the database
        const allEuroCodes = await db.collection("controls of static report").distinct("euroCode");
        console.log("🔍 All EuroCodes in database:", allEuroCodes);
        console.log("🔍 Requested EuroCodes:", euroCodesStr);
        
        return res.status(404).json({
          error: "No controls matched the given euro codes",
          requestedEuroCodes: euroCodesStr,
          availableEuroCodes: allEuroCodes
        });
      }

      const entries = rows.map(r => ({
        ...r.entry,
        _id: `${r.documentId}_${r.entryIndex}`,
        documentId: r.documentId,
        subjectMatterId: r.subjectMatterId,
        euroCode: r.euroCode,
        language: r.language,
        entryIndex: r.entryIndex
      }));

      res.status(200).json({
        meta: {
          requestedProjectEuroCodes: euroCodesStr,
          docsMatched: new Set(rows.map(r => String(r.documentId))).size,
          entriesCount: entries.length
        },
        entries
      });
    } catch (err) {
      console.error("get-controls-of-static-report error:", err);
      res.status(500).json({ error: "Failed to fetch controls of static report" });
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

  return router;
}

module.exports = createStaticReportControlsRoutes;
