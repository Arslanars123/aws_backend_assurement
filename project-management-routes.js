const express = require("express");
const { ObjectId } = require("mongodb");
const { upload } = require("./services/upload");

// Helper function to check if object is not empty
const isObjectNotEmpty = (obj) =>
  obj &&
  Object.keys(obj).length > 0 &&
  Object.values(obj).some(
    (v) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0)
  );

// Function to create routes with database connection
function createProjectManagementRoutes(db) {
  const router = express.Router();

  // Helper function to add or update professions
  async function addOrUpdateProfessions({ professions, projectsId }) {
    if (!professions || professions.length === 0) {
      throw new Error("No professions provided in the request!");
    }

    let SubjectMatterIdArray = [];

    const staticDocumentCheckList = await db
      .collection("standards")
      .find({ DS_GroupId: { $in: ["B1", "B2", "B3"] } })
      .toArray();

    const staticReportRegistration = await db
      .collection("standards")
      .find({ DS_GroupId: { $nin: ["B1", "B2", "B3"] } })
      .toArray();

    const professionAssociatedData = {};

    for (const profession of professions) {
      delete profession?._id;
      const { professionID, companyId, ...professionDetails } = profession;
      SubjectMatterIdArray.push(profession.SubjectMatterId);

      const existingProfession = await db.collection("professions").findOne({
        professionID,
        companyId,
      });

      const subjectMatterIdKey = `${profession.SubjectMatterId}`;

      professionAssociatedData[subjectMatterIdKey] = {
        staticDocumentCheckList,
        staticReportRegistration,
      };

      if (existingProfession) {
        await db
          .collection("professions")
          .updateOne({ professionID, companyId }, { $set: professionDetails });
      } else {
        await db.collection("professions").insertOne({
          ...profession,
        });
      }
    }

    if (projectsId) {
      const allTasks = await db
        .collection("tasks")
        .aggregate([
          {
            $match: {
              SubjectMatterId: { $in: SubjectMatterIdArray },
            },
          },
          {
            $lookup: {
              from: "inputs",
              localField: "SubjectMatterId",
              foreignField: "SubjectMatterId",
              as: "inputs",
            },
          },
          {
            $unwind: {
              path: "$inputs",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              Index: 1,
            },
          },
        ])
        .toArray();

      const project = await db
        .collection("projects")
        .findOne({ _id: new ObjectId(projectsId) });

      const existingProfessionData = project?.professionAssociatedData || {};

      const mergedProfessionData = {
        ...professionAssociatedData,
        ...existingProfessionData,
      };

      await db.collection("projects").updateOne(
        { _id: new ObjectId(projectsId) },
        {
          $push: { tasks: { $each: allTasks } },
          $set: { professionAssociatedData: mergedProfessionData },
        }
      );
    }
  }

  router.post(
    "/add-project",
    upload.fields([
      { name: "mainDrawings", maxCount: 50 },
      { name: "childDrawings", maxCount: 200 },
      { name: "documents", maxCount: 50 },
      { name: "planPictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        const {
          basicDetails,
          professions,
          addUsers,
          addDrawing,
          plan,
          certificateSchema,
          companyId,
        } = req.body;

        const parsedBasicDetails =
          typeof basicDetails === "string"
            ? JSON.parse(basicDetails)
            : basicDetails;

        const isBasicDetailsValid = parsedBasicDetails?.name?.trim();

        if (!isBasicDetailsValid) {
          return res
            .status(400)
            .json({ error: "All basic details must be filled." });
        }

        const parsedProfessions =
          typeof professions === "string"
            ? JSON.parse(professions)
            : professions;

        const parsedAddUsers =
          typeof addUsers === "string" ? JSON.parse(addUsers) : addUsers;

        const parsedAddDrawing =
          typeof addDrawing === "string" ? JSON.parse(addDrawing) : addDrawing;

        const parsedPlan = typeof plan === "string" ? JSON.parse(plan) : plan;

        const parsedCertificateSchema =
          typeof certificateSchema === "string"
            ? JSON.parse(certificateSchema)
            : certificateSchema;

        // Safely handle file uploads
        const addDrawingPictures =
          req.files && req.files["addDrawingPictures"]
            ? req.files["addDrawingPictures"].map((file) => file.filename)
            : [];
        const planPictures =
          req.files && req.files["planPictures"]
            ? req.files["planPictures"].map((file) => file.filename)
            : [];

        const checks = await db.collection("checks").find({}).toArray();
        const checksWithCreatedAt = checks.map((check) => ({
          ...check,
          createdAt: new Date(),
        }));

        const result = await db.collection("projects").insertOne({
          ...parsedBasicDetails,
          companyId,
          checks: checksWithCreatedAt,
          createdAt: new Date(),
        });

        const newProjectId = result.insertedId?.toString();

        if (!newProjectId) {
          return res.status(500).json({ error: "Failed to create project" });
        }

        const supervisionchecklist = await db
          .collection("supervision-check-list")
          .find({})
          .toArray();

        if (supervisionchecklist.length > 0) {
          const supervisionInsertPromises = supervisionchecklist.map(
            (check) => {
              return db.collection("project-supervision-check-list").insertOne({
                projectId: new ObjectId(newProjectId),
                checkId: check._id,
                checkDetails: check,
                createdAt: new Date(),
              });
            }
          );

          await Promise.all(supervisionInsertPromises);
        }

        if (parsedProfessions?.length > 0) {
          const updatedProfessions = parsedProfessions.map((profession) => {
            const filteredProjectsId =
              profession?.projectsId?.filter((id) => id !== null) || [];

            return {
              ...profession,
              projectsId: [...filteredProjectsId, newProjectId],
            };
          });

          await addOrUpdateProfessions({
            professions: updatedProfessions,
            projectsId: newProjectId,
          });
        }

        if (parsedAddUsers) {
          const allUserIds = Object.values(parsedAddUsers)
            .flat()
            .map((user) => user._id);

          if (allUserIds?.length) {
            const objectIds = allUserIds.map((id) => new ObjectId(id));

            const bulkOps = objectIds.map((userId) => ({
              updateOne: {
                filter: { _id: userId },
                update: {
                  $addToSet: {
                    projectsId: newProjectId,
                  },
                },
              },
            }));

            await db.collection("users").bulkWrite(bulkOps);
          }
        }

        if (isObjectNotEmpty(parsedCertificateSchema)) {
          await db.collection("schemes").insertOne({
            ...parsedCertificateSchema,
            projectsId: [newProjectId],
            companyId,
          });
        }

        let planId = "";
        if (isObjectNotEmpty(parsedPlan)) {
          const plan = await db.collection("plans").insertOne({
            ...parsedPlan,
            pictures: planPictures,
            projectsId: [newProjectId],
            companyId,
          });

          planId = plan.insertedId?.toString();
        }

        if (isObjectNotEmpty(parsedAddDrawing)) {
          await db.collection("draws").insertOne({
            ...parsedAddDrawing,
            pictures: addDrawingPictures,
            companyId,
            projectsId: [newProjectId],
            planId,
          });
        }

        res.status(201).json(result);
      } catch (error) {
        console.log("=== PROJECT CREATION ERROR ===");
        console.log("Error details:", error);
        console.log("Request body:", req.body);
        console.log("Request files:", req.files);
        console.log("===============================");
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  );

  // POST /store-project - Simple project creation
  router.post(
    "/store-project",
    upload.fields([
      { name: "picture", maxCount: 1 },
      { name: "pictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        const { name, address, postCode, city, startDate, companyId } =
          req.body;
        console.log(req.files);

        let picture = null;
        let pictures = [];

        // Handle single picture upload
        if (req.files["picture"] && req.files["picture"].length > 0) {
          picture = req.files["picture"][0].filename;
        }

        // Handle multiple pictures upload
        if (req.files["pictures"] && req.files["pictures"].length > 0) {
          pictures = req.files["pictures"].map((file) => file.filename);
        }

        // Insert the data into the database
        const result = await db.collection("projects").insertOne({
          name,
          address,
          postCode,
          city,
          startDate,
          picture,
          pictures,
          companyId,
        });

        res.status(201).json(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  );

  // POST /update-project/:id - Update existing project
  router.post(
    "/update-project/:id",
    upload.fields([
      { name: "picture", maxCount: 1 },
      { name: "pictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        const {
          name,
          address,
          postalCode,
          city,
          startDate,
          picture2,
          pictures2,
        } = req.body;
        console.log(pictures2);

        const updateData = {};

        // Dynamically add provided fields to updateData
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (postalCode) updateData.postalCode = postalCode;
        if (city) updateData.city = city;
        if (startDate) updateData.startDate = startDate;
        if (picture2) {
          updateData.picture = picture2;
        }

        // Handle single file upload (picture)
        if (req.files["picture"] && req.files["picture"].length > 0) {
          updateData.picture = req.files["picture"][0].filename;
        }

        let picturesArray = [];
        if (!pictures2) {
          updateData.pictures = [];
        }
        if (pictures2) {
          picturesArray = pictures2.split(",");
          updateData.pictures = picturesArray;
        }

        // Handle multiple file uploads (pictures)
        if (req.files["pictures"] && req.files["pictures"].length > 0) {
          const newFiles = req.files["pictures"].map((file) => file.filename);

          const existingFiles = picturesArray;
          updateData.pictures = [...existingFiles, ...newFiles];
        }

        // Update the project document in the database
        const result = await db
          .collection("projects")
          .updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
          );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Project not found" });
        }

        res
          .status(200)
          .json({ message: "Project updated successfully", result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update project" });
      }
    }
  );

  return router;
}

module.exports = createProjectManagementRoutes;
