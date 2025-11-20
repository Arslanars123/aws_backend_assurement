const express = require("express");
const { ObjectId } = require("mongodb");
const { upload } = require("./services/upload");

// Function to create routes with database connection
function createStandardsRoutes(db) {
  const router = express.Router();

  // POST update standard by ID
  router.post("/update-standard/:id", upload.any(), async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      // Prepare update data - exclude DS_GroupId, ItemId, and _id from being updated
      const updateData = {};
      const readonlyFields = ["DS_GroupId", "ItemId", "_id"];

      // Add fields from request body, excluding readonly fields
      Object.keys(req.body).forEach((key) => {
        if (!readonlyFields.includes(key) && req.body[key] !== undefined) {
          // Handle empty strings - convert to null or skip
          const value = req.body[key] === "" ? null : req.body[key];
          if (value !== null) {
            // Handle JSON strings
            if (
              typeof value === "string" &&
              (value.startsWith("{") || value.startsWith("["))
            ) {
              try {
                updateData[key] = JSON.parse(value);
              } catch (e) {
                updateData[key] = value;
              }
            } else {
              updateData[key] = value;
            }
          }
        }
      });

      // Handle file uploads from req.files
      if (req.files && req.files.length > 0) {
        const fileGroups = {};
        req.files.forEach((file) => {
          const fieldName = file.fieldname.replace("[]", "");
          if (!fileGroups[fieldName]) {
            fileGroups[fieldName] = [];
          }
          fileGroups[fieldName].push(file);
        });

        Object.keys(fileGroups).forEach((fieldName) => {
          if (fileGroups[fieldName].length === 1) {
            updateData[fieldName] = fileGroups[fieldName][0];
          } else {
            updateData[fieldName] = fileGroups[fieldName];
          }
        });
      }

      // Use findOneAndUpdate with new: true to return updated document
      const updatedStandard = await db
        .collection("standards")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );

      if (!updatedStandard.value) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Standard updated successfully",
        data: updatedStandard.value,
      });
    } catch (err) {
      console.error("update-standard error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  });

  return router;
}

module.exports = createStandardsRoutes;
