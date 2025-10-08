const express = require("express");
const { ObjectId } = require("mongodb");

// Function to create routes with database connection
function createSupervisionChecklistRoutes(db) {
  const router = express.Router();

  // POST API to get supervision details by project ID
  router.post("/get-supervision-detail", async (req, res) => {
    try {
      const { projectId } = req.body;

      // Validate required field
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "projectId is required",
        });
      }

      // Query to find all records where projectId exists in the projectID array field
      const supervisionDetails = await db
        .collection("supervision-check-list")
        .find({ projectID: new ObjectId(projectId) })
        .toArray();

      return res.status(200).json({
        success: true,
        data: supervisionDetails,
        count: supervisionDetails.length,
      });
    } catch (err) {
      console.error("get-supervision-detail error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // POST API to submit supervision checklist
  router.post("/submit-supervision-checklist", async (req, res) => {
    try {
      const { supervisionCheckListId, projectId, note } = req.body;

      // Validate required fields
      if (!supervisionCheckListId || !projectId) {
        return res.status(400).json({
          success: false,
          message: "supervisionCheckListId and projectId are required",
        });
      }
      // Check if the record exists
      const existingRecord = await db
        .collection("supervision-check-list")
        .findOne({ _id: new ObjectId(supervisionCheckListId) });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          message: "Supervision checklist not found",
        });
      }

      // Prepare update data
      const updateData = {
        updatedAt: new Date(),
        isAproved: true,
        approvedDate: Date.now(),
      };

      // Add note if provided
      if (note) {
        updateData.note = note;
      }

      // Update the record with projectId
      const result = await db
        .collection("supervision-check-list")
        .updateOne(
          { _id: new ObjectId(supervisionCheckListId) },
          { $set: updateData }
        );

      if (result.modifiedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Failed to update supervision checklist",
        });
      }

      // Get the updated record
      const updatedRecord = await db
        .collection("supervision-check-list")
        .findOne({ _id: new ObjectId(supervisionCheckListId) });

      return res.status(200).json({
        success: true,
        message: "Supervision checklist submitted successfully",
        data: updatedRecord,
      });
    } catch (err) {
      console.error("submit-supervision-checklist error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}

module.exports = createSupervisionChecklistRoutes;
