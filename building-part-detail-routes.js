const express = require("express");
const { ObjectId } = require("mongodb");
const { upload } = require("./services/upload");

// Function to create routes with database connection
function createBuildingPartDetailRoutes(db) {
  const router = express.Router();

  router.post(
    "/store-building-part-detail",
    upload.single("image"),
    async (req, res) => {
      try {
        const { buildingPartName, name, description } = req.body;
        const imageFile = req.file; // optional

        // Validate required fields
        if (!buildingPartName || !name || !description) {
          return res.status(400).json({
            message: "buildingPartName, name, and description are required",
          });
        }

        // Prepare image data
        let imageData = null;
        if (imageFile) {
          imageData = {
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            mimetype: imageFile.mimetype,
            size: imageFile.size,
            s3Location: imageFile.s3Location || null,
            s3Key: imageFile.s3Key || null,
            s3Error: imageFile.s3Error || null,
          };
        }

        const parts = await db
          .collection("parts")
          .find({ name: Number(buildingPartName) })
          .toArray();

        const buildingPartIds = parts.map((part) => part._id);
        // Create the building part detail document
        const buildingPartDetail = {
          buildingPartIds,
          name,
          description,
          image: imageData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save to MongoDB
        const result = await db
          .collection("buildingpartsdetail")
          .insertOne(buildingPartDetail);

        return res.status(201).json({
          message: "Building part detail created successfully",
          data: {
            id: result.insertedId,
            buildingPartIds,
            name,
            description,
            image: imageData,
          },
        });
      } catch (err) {
        console.error("store-building-part-detail error", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // GET all building part details
  router.get("/get-building-part-details", async (req, res) => {
    const startTime = Date.now();
    try {
      const { buildingPartId, page = 1, limit = 10 } = req.query;

      // Build query filter
      const query = {};
      if (buildingPartId) {
        query.buildingPartId = buildingPartId;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Create the aggregation pipeline
      const pipeline = [
        {
          $match: query,
        },
        {
          $lookup: {
            from: "parts", // The collection to join
            localField: "buildingPartIds", // Field in "buildingpartsdetail" that contains the ObjectIds
            foreignField: "_id", // Field in "parts" to match the ObjectId
            as: "partsDetails", // Output array containing matching "parts" documents
          },
        },
        {
          // Sort by createdAt in descending order
          $sort: { createdAt: -1 },
        },
        {
          // Pagination (skip and limit)
          $skip: skip,
        },
        {
          // Limit the number of documents to return
          $limit: parseInt(limit),
        },
      ];

      // Get the total count of matching documents for pagination
      const totalCount = await db
        .collection("buildingpartsdetail")
        .countDocuments(query);

      // Execute the aggregation pipeline
      const buildingPartDetails = await db
        .collection("buildingpartsdetail")
        .aggregate(pipeline)
        .toArray();

      const responseTime = Date.now() - startTime;
      console.log(`GET building-part-details completed in ${responseTime}ms`);

      return res.status(200).json({
        success: true,
        data: buildingPartDetails,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount: totalCount,
          limit: parseInt(limit),
        },
        responseTime: `${responseTime}ms`,
      });
    } catch (err) {
      console.error("get-building-part-details error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // GET specific building part detail by ID
  router.get("/get-building-part-detail/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      const pipeline = [
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "parts",
            localField: "buildingPartIds",
            foreignField: "_id",
            as: "partsDetails",
          },
        },
      ];

      // Execute the aggregation pipeline
      const buildingPartDetail = await db
        .collection("buildingpartsdetail")
        .aggregate(pipeline)
        .toArray();

      // Check if the document was found
      if (buildingPartDetail.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Building part detail not found",
        });
      }

      // Return the response
      return res.status(200).json({
        success: true,
        data: buildingPartDetail[0], // We return the first document since we are fetching by ID
      });
    } catch (err) {
      console.error("get-building-part-detail error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // PUT update building part detail
  router.put(
    "/update-building-part-detail/:id",
    upload.single("image"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { buildingPartId, name, description } = req.body;
        const imageFile = req.file; // optional

        // Validate ID format
        if (!id || id.length !== 24) {
          return res.status(400).json({
            success: false,
            message: "Invalid ID format",
          });
        }

        // Check if building part detail exists
        const existingDetail = await db
          .collection("buildingpartsdetail")
          .findOne({ _id: new ObjectId(id) });

        if (!existingDetail) {
          return res.status(404).json({
            success: false,
            message: "Building part detail not found",
          });
        }

        // Prepare update data
        const updateData = {
          updatedAt: new Date(),
        };

        // Add fields if provided
        if (buildingPartId) updateData.buildingPartId = buildingPartId;
        if (name) updateData.name = name;
        if (description) updateData.description = description;

        // Handle image update if provided
        if (imageFile) {
          updateData.image = {
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            mimetype: imageFile.mimetype,
            size: imageFile.size,
            s3Location: imageFile.s3Location || null,
            s3Key: imageFile.s3Key || null,
            s3Error: imageFile.s3Error || null,
          };
        }

        // Update the building part detail
        const result = await db
          .collection("buildingpartsdetail")
          .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        if (result.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: "No changes made",
          });
        }

        // Get updated document
        const updatedDetail = await db
          .collection("buildingpartsdetail")
          .findOne({ _id: new ObjectId(id) });

        return res.status(200).json({
          success: true,
          message: "Building part detail updated successfully",
          data: updatedDetail,
        });
      } catch (err) {
        console.error("update-building-part-detail error", err);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  );

  // DELETE specific building part detail by ID
  router.delete("/delete-building-part-detail/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      // Check if building part detail exists
      const existingDetail = await db
        .collection("buildingpartsdetail")
        .findOne({ _id: new ObjectId(id) });

      if (!existingDetail) {
        return res.status(404).json({
          success: false,
          message: "Building part detail not found",
        });
      }

      // Delete the building part detail
      const result = await db
        .collection("buildingpartsdetail")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete the building part detail",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Building part detail deleted successfully",
      });
    } catch (err) {
      console.error("delete-building-part-detail error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}

module.exports = createBuildingPartDetailRoutes;
