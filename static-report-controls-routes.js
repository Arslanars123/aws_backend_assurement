const express = require("express");

// Function to create routes with database connection
function createStaticReportControlsRoutes(db) {
  const router = express.Router();

  // New endpoint for "controls of static report" collection
  router.post("/get-controls-of-static-report", async (req, res) => {
    try {
      const { projectId } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "projectId is required" });
      }
      const filter = { projectId };

      const docs = await db
        .collection("projectcontrolsofstaticreport")
        .find(filter)
        .toArray();

      if (!docs.length) {
        return res.status(404).json({
          error: "No controls found for the given projectId",
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
