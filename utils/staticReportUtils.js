const { ObjectId } = require("mongodb");

/**
 * Get static report registration entries
 * @param {Object} db - Database connection
 * @param {string} companyId - Company ID
 * @param {string} projectId - Project ID
 * @param {string} subjectMatterId - Subject Matter ID
 * @returns {Promise<Object>} - Processed entries with success status
 */
async function getStaticReportRegistrationEntries(
  db,
  companyId,
  projectId,
  subjectMatterId
) {
  try {
    console.log("=== GET STATIC REPORT REGISTRATION ENTRIES ===");
    console.log("Company ID:", companyId);
    console.log("Project ID:", projectId);
    console.log("Subject Matter ID:", subjectMatterId);

    if (!companyId || !projectId || !subjectMatterId) {
      throw new Error(
        "Missing required parameters: companyId, projectId, subjectMatterId"
      );
    }

    // Fetch project details
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Get special text from the separate API endpoint
    let specialText = "";
    try {
      const specialTextData = await db
        .collection("projectspecialtext")
        .findOne({
          projectId: projectId,
        });

      if (
        specialTextData.success &&
        specialTextData.data &&
        specialTextData.data.specialText
      ) {
        specialText = specialTextData.data.specialText;
      }
    } catch (error) {
      console.log("Error fetching special text:", error);
      // Continue without special text if API fails
    }

    // Fetch static report registration entries
    const entries = await db
      .collection("StaticReportRegistrationEntries")
      .find({
        companyId: companyId,
        projectId: new ObjectId(projectId),
      })
      .toArray();

    console.log("Found entries:", entries.length);

    // Process entries to include required fields
    const processedEntries = await Promise.all(
      entries.map(async (entry) => {
        const pos = entry.staticReportItem?.pos || "";
        const constructionPart = entry.staticReportItem?.constructionPart || "";

        // Determine DS Group based on pos
        let dsGroup = "";
        if (pos.startsWith("7.4")) {
          dsGroup = "B4";
        } else if (pos.startsWith("7.5")) {
          dsGroup = "B5";
        } else if (pos.startsWith("7.6")) {
          dsGroup = "B6";
        }

        // Get user object (independent controller or worker)
        let userObject = null;
        if (
          entry.independentController &&
          entry.independentController !== "null"
        ) {
          const controller = await db.collection("users").findOne({
            _id: new ObjectId(entry.independentController),
          });
          if (controller) {
            userObject = {
              _id: controller._id,
              name: controller.name,
              role: controller.role,
              type: "independent_controller",
            };
          }
        } else if (entry.selectedWorkers && entry.selectedWorkers.length > 0) {
          const worker = await db.collection("users").findOne({
            _id: new ObjectId(entry.selectedWorkers[0]),
          });
          if (worker) {
            userObject = {
              _id: worker._id,
              name: worker.name,
              role: worker.role,
              type: "worker",
            };
          }
        }

        return {
          ...entry,
          _id: entry._id,
          registrationDate: entry.submissionCreatedDate,
          registrationId: `${pos}_${Math.random().toString(36).substr(2, 9)}`,
          controlType: `${constructionPart} ${specialText}`.trim(),
          dsGroup: dsGroup,
          pos: pos,
          subject: entry.staticReportItem?.subject || "",
          constructionPart: constructionPart,
          basis: entry.staticReportItem?.basis || "",
          controlMethod: entry.staticReportItem?.controlMethod || "",
          acceptanceCriteria: entry.staticReportItem?.acceptanceCriteria || "",
          time: entry.staticReportItem?.time || "",
          comment: entry.comment || "",
          controlPlan: entry.controlPlan || "",
          date: entry.date || "",
          user: userObject,
          // Media files
          annotatedPdfImages:
            entry.annotatedPdfImages?.map((img) => ({
              filename: img.filename,
              originalName: img.originalName,
              description: img.description || "",
            })) || [],
          mainPictures:
            entry.mainPictures?.map((pic) => ({
              filename: pic.filename,
              originalName: pic.originalName,
              description: pic.description || "",
            })) || [],
          markPictures:
            entry.markPictures?.map((mark) => ({
              filename: mark.filename,
              originalName: mark.originalName,
              description: mark.description || "",
              markNumber: mark.markNumber || "",
            })) || [],
        };
      })
    );

    return {
      success: true,
      data: {
        projectId: projectId,
        companyId: companyId,
        subjectMatterId: subjectMatterId,
        specialText: specialText,
        entries: processedEntries,
        totalEntries: processedEntries.length,
      },
    };
  } catch (error) {
    console.error("Error fetching static report registration entries:", error);
    throw error;
  }
}

module.exports = {
  getStaticReportRegistrationEntries,
};
