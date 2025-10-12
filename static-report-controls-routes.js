const express = require("express");

// Function to create routes with database connection
function createStaticReportControlsRoutes(db) {
  const router = express.Router();

  // New endpoint for "controls of static report" collection
  router.post("/get-controls-of-static-report", async (req, res) => {
    try {
      const { subjectMatterId, projectId } = req.body;

      const filter = {};

      if (subjectMatterId) filter.subjectMatterId = subjectMatterId;

      const docs = await db
        .collection("controls of static report")
        .find(filter, {
          projection: { _id: 1, euroCode: 1, entries: 1 },
        })
        .toArray();

      if (!docs.length) {
        return res.status(404).json({
          error:
            "No controls found for the given EuroCode(s) and language rule",
          filter,
        });
      }

      const entries = docs.flatMap((d) =>
        Array.isArray(d.entries) ? d.entries : []
      );

      return res.status(200).json({
        meta: {
          subjectMatterId,
          euroCodes: euroCodesStr,
          euroCodeSource: euroCodeSource, // Show where EuroCodes came from
          projectId: projectId || null,
          usedFallbackProjectId: !projectId, // Show if fallback was used
          docsMatched: docs.length,
          entriesCount: entries.length,
        },
        entries,
      });
    } catch (error) {
      console.error("Error fetching controls of static report:", error);
      return res
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

  return router;
}

module.exports = createStaticReportControlsRoutes;
