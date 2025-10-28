const express = require("express");
const { ObjectId } = require("mongodb");

function createProfessionRoutes(db) {
  const router = express.Router();

  // GET route to fetch professions by SubjectMatterId
  router.get("/get-professions", async (req, res) => {
    try {
      const { SubjectMatterId } = req.query;

      // Validate required fields
      if (!SubjectMatterId) {
        return res.status(400).json({
          success: false,
          message: "SubjectMatterId is required",
        });
      }

      // Query the professions collection
      const professions = await db
        .collection("professions")
        .find({ SubjectMatterId: SubjectMatterId })
        .toArray();

      return res.status(200).json(professions);
    } catch (err) {
      console.error("get-professions error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  });

  // GET route to fetch all professions
  router.get("/get-all-professions", async (req, res) => {
    try {
      // Query all professions
      const professions = await db.collection("professions").find({}).toArray();

      return res.status(200).json(professions);
    } catch (err) {
      console.error("get-all-professions error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  });

  return router;
}

module.exports = createProfessionRoutes;
