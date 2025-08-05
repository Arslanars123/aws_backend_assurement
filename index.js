// Import required modules
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
require("dotenv").config();
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// PDF to PNG conversion function
async function convertPdfToPng(pdfPath, outputDir) {
  try {
    const { fromPath } = require("pdf2pic");
    const options = {
      density: 300,
      saveFilename: path.basename(pdfPath, '.pdf'),
      savePath: outputDir,
      format: "png",
      width: 2048,
      height: 2048
    };
    
    const convert = fromPath(pdfPath, options);
    const pageData = await convert(1); // Convert first page
    
    if (pageData && pageData.path) {
      return path.basename(pageData.path);
    }
    return null;
  } catch (error) {
    console.error("Error converting PDF to PNG:", error);
    return null;
  }
}

// Initialize app and middleware
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use(express.json()); // to parse JSON body

app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Server is running"
  });
});

// Try cloud MongoDB first, fallback to local MongoDB
const cloudUri = process.env.MONGODB_BASE_URI || "mongodb+srv://testusername:testuserpassword@cluster0.nfgli.mongodb.net/construction_db?retryWrites=true&w=majority&appName=Cluster0";
const localUri = "mongodb://localhost:27017/construction_db";
let uri = cloudUri;
let client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 60000, // Increased timeout
  connectTimeoutMS: 60000, // Increased timeout
  socketTimeoutMS: 60000, // Increased timeout
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  // Add connection pool options
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  // Add heartbeat options
  heartbeatFrequencyMS: 10000
});
const dbName = "construction_db";
let db;

// JWT Secret Key
const JWT_SECRET = "your_jwt_secret_key";

// Connect to MongoDB with retry logic and fallback
async function connectToMongoDB() {
  const maxRetries = 3;
  let retryCount = 0;
  
  // Try cloud MongoDB first
  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting to connect to cloud MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
      uri = cloudUri;
      const cloudClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000
      });
      
      await cloudClient.connect();
      console.log("Connected to cloud MongoDB successfully!");
      client = cloudClient;
      db = client.db(dbName);
      return; // Success, exit the function
    } catch (error) {
      retryCount++;
      console.error(`Error connecting to cloud MongoDB (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount >= maxRetries) {
        console.log("Cloud MongoDB connection failed, trying local MongoDB...");
        break; // Try local MongoDB
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Try local MongoDB as fallback
  retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting to connect to local MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
      uri = localUri;
      const localClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true
      });
      
      await localClient.connect();
      console.log("Connected to local MongoDB successfully!");
      client = localClient;
      db = client.db(dbName);
      return; // Success, exit the function
    } catch (error) {
      retryCount++;
      console.error(`Error connecting to local MongoDB (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error("Failed to connect to both cloud and local MongoDB after all retry attempts");
        console.log("Starting server without database connection...");
        return; // Don't exit, let the server start without DB
      }
      
      // Wait before retrying
      const waitTime = 2000;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Start the server after database connection
async function startServer() {
  try {
    await connectToMongoDB();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token." });
    }
    req.user = user;
    next();
  });
}

// Middleware to check user roles
function authorizeRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

// Middleware to check database connection
function checkDatabaseConnection(req, res, next) {
  if (!db) {
    return res.status(503).json({ 
      error: "Database connection not available. Please try again later.",
      details: "The server is running but cannot connect to the database."
    });
  }
  next();
}

// Define API routes
app.get("/", async (req, res) => {
  try {
    // Respond with the retrieved records
    res.json({
      success: true, // Return the list of image links
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while fetching images");
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      server: "running",
      timestamp: new Date().toISOString(),
      database: db ? "connected" : "disconnected",
      port: 3000
    };
    
    res.status(200).json(healthStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      server: "error",
      error: err.message 
    });
  }
});

// KS Report PDF Generation endpoint
app.get("/api/generate-pdf-report/:companyId/:projectId/:professionId", async (req, res) => {
  try {
    const { companyId, projectId, professionId } = req.params;
    
    console.log(`Generating KS Report PDF for Company: ${companyId}, Project: ${projectId}, Profession: ${professionId}`);
    
    // Validate parameters
    if (!companyId || !projectId || !professionId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // Get profession details
    const profession = await db.collection("professions").findOne({ _id: new ObjectId(professionId) });
    if (!profession) {
      return res.status(404).json({ error: "Profession not found" });
    }
    
    // Get project details
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get company details
    const company = await db.collection("companies").findOne({ _id: new ObjectId(companyId) });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Generate a unique filename for the PDF
    const timestamp = Date.now();
    const filename = `ks_report_${companyId}_${projectId}_${professionId}_${timestamp}.pdf`;
    
    // For now, return a mock PDF URL
    // In a real implementation, you would generate the actual PDF here
    const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    
    // Create a simple PDF content (mock)
    const pdfContent = {
      title: "KS Report",
      company: company.name || "Unknown Company",
      project: project.name || "Unknown Project",
      profession: profession.GroupName || "Unknown Profession",
      generatedAt: new Date().toISOString(),
      reportType: "KS Report",
      content: "This is a sample KS report content. In a real implementation, this would contain the actual report data."
    };
    
    // Save the PDF content to database (mock)
    await db.collection("reports").insertOne({
      filename: filename,
      companyId: companyId,
      projectId: projectId,
      professionId: professionId,
      reportType: "KS",
      content: pdfContent,
      createdAt: new Date(),
      url: pdfUrl
    });
    
    console.log(`KS Report PDF generated successfully: ${filename}`);
    
    res.status(200).json({
      success: true,
      message: "KS Report PDF generated successfully",
      pdfUrl: pdfUrl,
      filename: filename,
      reportData: pdfContent
    });
    
  } catch (error) {
    console.error("Error generating KS Report PDF:", error);
    res.status(500).json({ 
      error: "Failed to generate KS Report PDF",
      details: error.message 
    });
  }
});
// 1. Create a new user
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the folder where uploaded files are saved
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Create a unique filename
  },
});

const upload = multer({ storage });
// Route to handle user creation with file upload
app.post(
  "/store-user",
  upload.fields([
    { name: "picture", maxCount: 1 },
    { name: "contactPicture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        username,
        password,
        role,
        phone,
        name,
        address,
        postalCode,
        city,
        startDate,
        projectsId,
        companyId,
        isProjectManager,
        type,
        mainId,
        cvr,
        contactPerson,
        contactPhone,
      } = req.body;

      const picture = req.files?.picture?.[0]?.filename || null;
      const contactPicture = req.files?.contactPicture?.[0]?.filename || null;

      let parsedUserProfession;
      if (req?.body?.userProfession) {
        parsedUserProfession = JSON.parse(req.body.userProfession);
      }

      const result = await db.collection("users").insertOne({
        username,
        password,
        role,
        phone,
        name,
        address,
        postalCode,
        city,
        startDate,
        picture,
        contactPicture,
        contactPerson,
        contactPhone,
        cvr,
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
        companyId,
        isProjectManager,
        type,
        mainId,
        userProfession: parsedUserProfession,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

app.post("/updateUser", async (req, res) => {
  try {
    const { userIds, projectId, userRole } = req.body;

    const objectIds = userIds.map((id) => new ObjectId(id));

    const bulkOps = objectIds.map((userId) => {
      const updateQuery = {
        $addToSet: {
          projectsId: projectId,
        },
      };

      // Conditionally update userRole if it's provided
      if (userRole !== undefined) {
        updateQuery.$set = { userRole };
      }

      return {
        updateOne: {
          filter: { _id: userId },
          update: updateQuery,
        },
      };
    });

    const result = await db.collection("users").bulkWrite(bulkOps);

    res.json({
      message: "Users updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to update users" });
  }
});

// 2. Get all users
app.get(
  "/get-usersbb",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const users = await db
        .collection("users")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

app.get(
  "/get-advisors",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId } = req.query; // Get query parameters

      // Build the query object dynamically
      const query = { role: "Advisor" };
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }

      const users = await db.collection("users").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch advisors" });
    }
  }
);
app.get(
  "/get-inputs",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId, profession } = req.query; // Get query parameters
      const query = {};
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }
      if (profession) {
        query.profession = profession;
      }

      const users = await db.collection("inputs").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inputs" });
    }
  }
);
app.get(
  "/get-standards",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId, profession } = req.query; // Get query parameters
      const query = {};
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }
      if (profession) {
        query.profession = profession;
      }

      const users = await db.collection("standards").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standards" });
    }
  }
);
app.get("/get-superadmins", async (req, res) => {
  try {
    const query = {
      role: {
        $in: ["Superadmin", "SupportFlowSuperadmin", "GeneralFlowSuperadmin"],
      },
    };

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Superadmins" });
  }
});
app.get("/get-safety", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Safety Coordinator" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Safety Coordinators" });
  }
});

app.get("/get-cons", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Construction Manager" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    const populatedUsers = await Promise.all(
      users.map(async (user) => {
        if (user.mainId) {
          const mainUser = await db
            .collection("users")
            .findOne({ _id: new ObjectId(user.mainId) });
          return {
            ...user,
            mainUser: mainUser || null, // Attach the main user data
          };
        }
        return user;
      })
    );

    res.status(200).json(populatedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch Construction Managers" });
  }
});

app.get("/get-mains", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Main Constructor" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Main Constructors" });
  }
});

app.get("/get-inspectors", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Inspector" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Inspectors" });
  }
});

app.get("/get-independent-controller", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Independent Controller" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Inspectors" });
  }
});

app.get("/get-subs", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Sub Contractor" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Sub Contractors" });
  }
});

app.post("/get-filter-users", async (req, res) => {
  try {
    const { companyId, projectId, roles, taskId, professionsIds, projectsId } =
      req.body;

    let task;
    if (taskId) {
      const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
      });
      task = project?.tasks?.find((t) => t._id.toString() === taskId);
    }

    const query = {};

    if (companyId && companyId !== "null") query.companyId = companyId;

    if (projectId && projectId !== "null")
      query.projectsId = { $in: [projectId] };

    if (projectsId?.length)
      query.projectsId = { $in: projectsId.split(",").map((id) => id.trim()) };

    if (task) {
      query["userProfession.SubjectMatterId"] = task?.SubjectMatterId;
    }

    if (professionsIds?.length) {
      query["userProfession._id"] = { $in: professionsIds };
    }
    if (roles?.length) {
      query.role = { $in: roles };
    }

    // Fetch users from the database
    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users); // Respond with the filtered users
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /get-workers?companyId=123&projectId=999&professionsId=abc,xyz
app.get("/get-workers", async (req, res) => {
  try {
    const { companyId, projectId, professionsId } = req.query;

    // Base query: fetch only "Workers"
    const query = { role: "Worker" };

    // If we have a valid companyId, add to query
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    // If we have a valid projectId, split them into an array
    // e.g. projectId=111,222 -> [ "111", "222" ]
    if (projectId && projectId !== "null") {
      const projectArr = projectId.split(",").map((p) => p.trim());
      query.projectsId = { $in: projectArr };
    }

    // If we have professionsId, find all groups that match those professions
    if (professionsId && professionsId !== "null") {
      const professionsArr = professionsId.split(",").map((p) => p.trim());

      // groups contain: { professionId, workerId, ... }
      const groupDocs = await db
        .collection("groups")
        .find({
          professionId: { $in: professionsArr },
        })
        .toArray();

      // Extract workerId from each group document
      const workerIds = groupDocs.map((doc) => doc.worker).filter(Boolean);

      // If no matching workers in groups, force an empty result
      // Otherwise, filter by _id in [ workerIds... ]
      if (workerIds.length > 0) {
        // If your "users" collection `_id` is stored as **string**,
        // you can use them directly:
        //query._id = { $in: workerIds };

        // If your "users" _id is an **ObjectId**, do:
        const objectIds = workerIds.map((id) => new ObjectId(id));
        query._id = { $in: objectIds };
      } else {
        // ensures no matching users
        query._id = { $in: [] };
      }
    }

    // Execute final query on "users"
    const users = await db.collection("users").find(query).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching Workers:", error);
    res.status(500).json({ error: "Failed to fetch Workers" });
  }
});

app.get("/get-admins", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Admin" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Admins" });
  }
});

app.get("/get-project-managers", async (req, res) => {
  try {
    const { companyId, projectId, userRole } = req.query;

    const query = { isProjectManager: "yes" };
    if (companyId && companyId !== "null") query.companyId = companyId;

    if (projectId && projectId !== "null")
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };

    if (userRole && userRole !== "null") query.userRole = userRole;

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Admins" });
  }
});

app.get("/get-users", async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {};

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }
    console.log(query);

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

const addFilters = (query, companyId, projectId) => {
  if (companyId && companyId !== "null") {
    query.companyId = companyId;
  }

  if (projectId && projectId !== "null") {
    // Convert comma-separated projectId to an array
    query.projectsId = projectId.split(",").map((id) => id.trim());

    // Use $in for projectsId in MongoDB
    query.projectsId = { $in: query.projectsId };
  }

  return query;
};

app.post("/update-company-status/:id", async (req, res) => {
  const companyId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const result = await db
      .collection("companies")
      .updateOne({ _id: new ObjectId(companyId) }, { $set: { status } });

    if (result.modifiedCount === 1) {
      res.json({ message: "Company status updated successfully" });
    } else {
      res.status(404).json({ error: "Company not found or status unchanged" });
    }
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-tasks", async (req, res) => {
  try {
    const tasks = await db.collection("tasks").find({}).toArray();

    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.get("/get-matters", async (req, res) => {
  try {
    // distinct() with no second argument, or an empty object {}
    // returns unique values from the entire collection
    const uniqueMatters = await db
      .collection("tasks")
      .distinct("SubjectMatterId");

    res.status(200).json(uniqueMatters);
  } catch (error) {
    console.error("Error fetching matters:", error);
    res.status(500).json({ error: "Failed to fetch matters" });
  }
});

app.get("/get-types", async (req, res) => {
  try {
    // distinct() with no second argument, or an empty object {}
    // returns unique values from the entire collection
    const uniqueMatters = await db.collection("tasks").distinct("Type");

    res.status(200).json(uniqueMatters);
  } catch (error) {
    console.error("Error fetching matters:", error);
    res.status(500).json({ error: "Failed to fetch matters" });
  }
});

app.get("/get-checks", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const checks = await db.collection("checks").find({}).toArray();

    res.status(200).json(checks);
  } catch (error) {
    console.error("Error in /get-checks:", error);
    res.status(500).json({ error: "Failed to fetch checks" });
  }
});

app.get("/get-controls", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const controls = await db
      .collection("controls")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch controls" });
  }
});
app.get("/get-gammas", async (req, res) => {
  try {
    const { companyId, projectId, point } = req.query;
    const query = addFilters({}, companyId, projectId);

    if (point) {
      query.point = point;
    }
    const controls = await db.collection("gammas").find(query).toArray();
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch gammas" });
  }
});

app.get("/get-descriptions", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const descriptions = await db
      .collection("descriptions")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(descriptions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch descriptions" });
  }
});

app.get("/get-draws", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const draws = await db
      .collection("draws")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(draws);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch draws" });
  }
});

app.get("/get-mentions", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const mentions = await db
      .collection("mentions")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(mentions);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/get-news", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;

    // 1. Build your filter for the "news" collection
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    // e.g. add { companyId, ... } if needed

    // 2. Get all news that match the filter
    const newsArray = await db.collection("news").find(query).toArray();

    // 3. Iterate over each news item to find and attach project names
    for (const item of newsArray) {
      const validProjectIds = (item.projectsId || []).filter(ObjectId.isValid);
      const objectIds = validProjectIds.map((id) => new ObjectId(id));

      const projectsArray = await db
        .collection("projects")
        .find({
          _id: { $in: objectIds },
        })
        .toArray();

      const projectNames = projectsArray.map((proj) => proj.name).join(", ");
      item.projectNames = projectNames;
    }

    // Finally return the enriched array
    res.status(200).json(newsArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});

app.get("/get-notes", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const notes = await db.collection("notes").find(query).toArray();
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/get-plans", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const plans = await db
      .collection("plans")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

app.get("/get-requests", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const requests = await db
      .collection("requests")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.get("/get-schemes", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const schemes = await db
      .collection("schemes")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(schemes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schemes" });
  }
});
app.get("/get-items", async (req, res) => {
  try {
    const items = await db.collection("items").find({}).toArray();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});
app.get("/get-levels", async (req, res) => {
  try {
    const levels = await db.collection("levels").find({}).toArray();
    res.status(200).json(levels);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

app.get("/get-statics", async (req, res) => {
  try {
    const statics = await db
      .collection("standards")
      .find({ DS_GroupId: { $nin: ["B1", "B2", "B3"] } })
      .toArray();
    res.status(200).json(statics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statics" });
  }
});

app.get("/get-supers", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const supers = await db.collection("supers").find(query).toArray();
    res.status(200).json(supers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch supers" });
  }
});

app.get("/get-global-professions", async (req, res) => {
  try {
    const professions = await db.collection("inputs").find({}).toArray();
    res.status(200).json(professions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch professions" });
  }
});

app.get("/get-company-professions", async (req, res) => {
  try {
    const { companyId, projectId, SubjectMatterId } = req.query;

    const query = {};

    if (companyId && companyId !== "null" && companyId !== "undefined") {
      query.companyId = companyId;
    }
    if (projectId && projectId !== "null" && projectId !== "undefined") {
      query.projectsId = { $in: [projectId] };
    }
    if (
      SubjectMatterId &&
      SubjectMatterId !== "null" &&
      SubjectMatterId !== "undefined"
    )
      query.SubjectMatterId = { $in: SubjectMatterId };

    const professions = await db
      .collection("professions")
      .find(query)
      .toArray();
    res.status(200).json(professions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch professions" });
  }
});

// Signature CRUD Operations
// 1. Create signature
app.post(
  "/add-signature",
  upload.fields([
    { name: "signature1", maxCount: 1 },
    { name: "signature2", maxCount: 1 },
    { name: "signature3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { person1Name, person2Name, person3Name, companyId, projectId } =
        req.body;

      // Validate required fields
      if (!companyId || !projectId) {
        return res.status(400).json({
          error: "Company ID and Project ID are required",
        });
      }

      // Handle signature file uploads
      const signature1 = req.files?.signature1?.[0]?.filename || null;
      const signature2 = req.files?.signature2?.[0]?.filename || null;
      const signature3 = req.files?.signature3?.[0]?.filename || null;

      // Create signature document
      const signatureData = {
        person1Name: person1Name || null,
        person2Name: person2Name || null,
        person3Name: person3Name || null,
        signature1,
        signature2,
        signature3,
        companyId,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("signatures").insertOne(signatureData);

      res.status(201).json({
        message: "Signature added successfully",
        signatureId: result.insertedId,
        signature: signatureData,
      });
    } catch (error) {
      console.error("Error adding signature:", error);
      res.status(500).json({ error: "Failed to add signature" });
    }
  }
);

// 2. Get all signatures for a project
app.get("/get-signatures", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    // Build query
    const query = {};
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }
    if (projectId && projectId !== "null") {
      query.projectId = projectId;
    }

    const signatures = await db
      .collection("signatures")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(201).json(signatures);
  } catch (error) {
    console.error("Error getting signatures:", error);
    res.status(500).json({ error: "Failed to get signatures" });
  }
});

// 3. Get single signature by ID
app.get("/get-signature-detail/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid signature ID" });
    }

    const signature = await db
      .collection("signatures")
      .findOne({ _id: new ObjectId(id) });

    if (!signature) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.status(201).json(signature);
  } catch (error) {
    console.error("Error getting signature:", error);
    res.status(500).json({ error: "Failed to get signature" });
  }
});

// 4. Update signature
app.post(
  "/update-signature/:id",
  upload.fields([
    { name: "signature1", maxCount: 1 },
    { name: "signature2", maxCount: 1 },
    { name: "signature3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { person1Name, person2Name, person3Name, companyId, projectId } =
        req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid signature ID" });
      }

      // Get existing signature to preserve existing files
      const existingSignature = await db
        .collection("signatures")
        .findOne({ _id: new ObjectId(id) });

      // Handle signature file uploads (only update if new files are provided)
      const signature1 =
        req.files?.signature1?.[0]?.filename || existingSignature.signature1;
      const signature2 =
        req.files?.signature2?.[0]?.filename || existingSignature.signature2;
      const signature3 =
        req.files?.signature3?.[0]?.filename || existingSignature.signature3;

      // Build update object
      const updateData = {
        updatedAt: new Date(),
      };

      if (person1Name !== undefined) updateData.person1Name = person1Name;
      if (person2Name !== undefined) updateData.person2Name = person2Name;
      if (person3Name !== undefined) updateData.person3Name = person3Name;
      if (companyId !== undefined) updateData.companyId = companyId;
      if (projectId !== undefined) updateData.projectId = projectId;
      if (signature1 !== existingSignature.signature1)
        updateData.signature1 = signature1;
      if (signature2 !== existingSignature.signature2)
        updateData.signature2 = signature2;
      if (signature3 !== existingSignature.signature3)
        updateData.signature3 = signature3;

      const result = await db
        .collection("signatures")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );

      res.status(201).json({
        message: "Signature updated successfully",
      });
    } catch (error) {
      console.error("Error updating signature:", error);
      res.status(500).json({ error: "Failed to update signature" });
    }
  }
);

// 5. Delete signature
app.post("/delete-signature/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid signature ID" });
    }

    // Get signature to delete associated files
    const signature = await db
      .collection("signatures")
      .findOne({ _id: new ObjectId(id) });

    if (!signature) {
      return res.status(404).json({ error: "Signature not found" });
    }

    // Delete signature files from uploads folder
    const fs = require("fs");
    const path = require("path");

    const deleteFile = (filename) => {
      if (filename) {
        const filePath = path.join(__dirname, "uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    deleteFile(signature.signature1);
    deleteFile(signature.signature2);
    deleteFile(signature.signature3);

    // Delete from database
    const result = await db
      .collection("signatures")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.status(201).json({
      message: "Signature deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting signature:", error);
    res.status(500).json({ error: "Failed to delete signature" });
  }
});

// 6. Get signature file
app.get("/signature-file/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving signature file:", error);
    res.status(500).json({ error: "Failed to serve signature file" });
  }
});

// Name and Signature CRUD Operations
// 1. Create name and signature
app.post(
  "/add-name-signature",
  upload.single("signature"),
  async (req, res) => {
    try {
      const { name, companyId, projectId } = req.body;

      // Validate required fields
      if (!name || !companyId || !projectId) {
        return res.status(400).json({
          error: "Name, Company ID and Project ID are required",
        });
      }

      // Handle signature file upload
      const signature = req.file?.filename || null;

      // Create name and signature document
      const signatureData = {
        name,
        signature,
        companyId,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("nameSignatures").insertOne(signatureData);

      res.status(201).json({
        message: "Name and signature added successfully",
        signatureId: result.insertedId,
        signature: signatureData,
      });
    } catch (error) {
      console.error("Error adding name and signature:", error);
      res.status(500).json({ error: "Failed to add name and signature" });
    }
  }
);

// 2. Get all name and signatures for a project
app.get("/get-name-signatures", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    if (!companyId || !projectId) {
      return res.status(400).json({
        error: "Company ID and Project ID are required",
      });
    }

    const signatures = await db
      .collection("nameSignatures")
      .find({ companyId, projectId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(signatures);
  } catch (error) {
    console.error("Error getting name and signatures:", error);
    res.status(500).json({ error: "Failed to get name and signatures" });
  }
});

// 3. Get single name and signature
app.get("/get-name-signature/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid signature ID" });
    }

    const signature = await db
      .collection("nameSignatures")
      .findOne({ _id: new ObjectId(id) });

    if (!signature) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.status(200).json(signature);
  } catch (error) {
    console.error("Error getting name and signature:", error);
    res.status(500).json({ error: "Failed to get name and signature" });
  }
});

// 4. Update name and signature
app.put(
  "/update-name-signature/:id",
  upload.single("signature"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, companyId, projectId } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid signature ID" });
      }

      // Get existing signature to preserve existing file
      const existingSignature = await db
        .collection("nameSignatures")
        .findOne({ _id: new ObjectId(id) });

      if (!existingSignature) {
        return res.status(404).json({ error: "Signature not found" });
      }

      // Handle signature file upload (only update if new file is provided)
      const signature = req.file?.filename || existingSignature.signature;

      // Build update object
      const updateData = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (companyId !== undefined) updateData.companyId = companyId;
      if (projectId !== undefined) updateData.projectId = projectId;
      if (signature !== existingSignature.signature) updateData.signature = signature;

      const result = await db
        .collection("nameSignatures")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );

      if (!result.value) {
        return res.status(404).json({ error: "Signature not found" });
      }

      res.status(200).json({
        message: "Name and signature updated successfully",
        signature: result.value,
      });
    } catch (error) {
      console.error("Error updating name and signature:", error);
      res.status(500).json({ error: "Failed to update name and signature" });
    }
  }
);

// 5. Delete name and signature
app.delete("/delete-name-signature/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid signature ID" });
    }

    // Get signature to delete associated file
    const signature = await db
      .collection("nameSignatures")
      .findOne({ _id: new ObjectId(id) });

    if (!signature) {
      return res.status(404).json({ error: "Signature not found" });
    }

    // Delete signature file from uploads folder
    const fs = require("fs");
    const path = require("path");

    if (signature.signature) {
      const filePath = path.join(__dirname, "uploads", signature.signature);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    const result = await db
      .collection("nameSignatures")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.status(200).json({
      message: "Name and signature deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting name and signature:", error);
    res.status(500).json({ error: "Failed to delete name and signature" });
  }
});

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
      .find({ SubjectMatterId: { $in: SubjectMatterIdArray } })
      .sort({ Index: 1 })
      .toArray();

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(projectsId) });

    const existingProfessionData = project?.professionAssociatedData || {};

    const mergedProfessionData = {
      ...professionAssociatedData,
      ...existingProfessionData,
      // ...Object.fromEntries(
      //   Object.entries(professionAssociatedData).filter(
      //     ([key]) => !existingProfessionData.hasOwnProperty(key)
      //   )
      // ),
    };

    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectsId) },
      {
        $push: { tasks: { $each: allTasks } },
        $set: { professionAssociatedData: mergedProfessionData },
      },

      { upsert: true }
    );
  }

  return true;
}

app.post("/add/professions_in_a_company", async (req, res) => {
  try {
    const { professions, projectsId } = req.body;

    if (professions?.length > 0) {
      await addOrUpdateProfessions({
        professions,
        projectsId,
      });
    }

    res
      .status(200)
      .json({ success: "Professions added/updated successfully!" });
  } catch (error) {
    console.error("Error adding/updating professions:", error);
    res.status(500).json({ error: "Failed to add or update professions" });
  }
});

app.post("/get-project-detail", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Database connection not available" });
    }

    const { projectId } = req.body;
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "project not found" });
    }

    // If project has professionAssociatedData, merge in full profession info
    if (project.professionAssociatedData) {
      // Get all profession ids from the keys (SubjectMatterId or similar)
      const professionKeys = Object.keys(project.professionAssociatedData);
      // Find all professions in the professions collection
      const professions = await db.collection("professions").find({
        SubjectMatterId: { $in: professionKeys }
      }).toArray();
      // Map by SubjectMatterId for quick lookup
      const professionMap = {};
      professions.forEach(prof => {
        if (prof.SubjectMatterId) {
          professionMap[prof.SubjectMatterId] = prof;
        }
      });
      // Merge each profession object into the professionAssociatedData
      for (const key of professionKeys) {
        const base = project.professionAssociatedData[key];
        const full = professionMap[key];
        if (full) {
          project.professionAssociatedData[key] = { ...full, ...base };
        }
      }
    }

    res.status(200).json(project);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-groups", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const groups = await db
      .collection("groups")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

app.get("/get-deviations", async (req, res) => {
  try {
    const { companyId, projectId, type } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (type) {
      query.type = type;
    }
    const deviations = await db.collection("deviations").find(query).toArray();
    res.status(200).json(deviations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deviations" });
  }
});

app.get("/get-special-control", async (req, res) => {
  try {
    const { companyId, projectId, specialControleId } = req.query;
    const query = addFilters({}, companyId, projectId);

    if (specialControleId) query._id = new ObjectId(specialControleId);

    const specialControl = await db
      .collection("specialcontrol")
      .find(query)
      .toArray();
    res.status(200).json(specialControl);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deviations" });
  }
});

app.get("/get-parts", async (req, res) => {
  try {
    const { SubjectMatterId } = req.query;
    const query = {};
    
    if (SubjectMatterId && SubjectMatterId !== "null")
      query.SubjectMatterId = SubjectMatterId;

    const parts = await db.collection("parts").find(query).toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch parts" });
  }
});

// 3. Get a single user by ID
app.get(
  "/get-user-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);
app.get(
  "/get-input-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const input = await db
        .collection("inputs")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!input) {
        return res.status(404).json({ error: "Input not found" });
      }
      res.status(200).json(input);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch input" });
    }
  }
);
app.get(
  "/get-standard-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const input = await db
        .collection("standards")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!input) {
        return res.status(404).json({ error: "Standard not found" });
      }
      res.status(200).json(input);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standard" });
    }
  }
);

// 4. Update a user by ID
app.post(
  "/update-user/:id",
  upload.single("picture"), // Handles a single file upload with the field name "picture"
  async (req, res) => {
    try {
      const {
        username,
        password,
        role,
        address,
        city,
        postalCode,
        startDate,
        phone,
        name,
        picture2,
        isProjectManager,
        type,
        mainId,
        userProfession,
      } = req.body;

      const updateData = {};

      // Add fields dynamically to the updateData object if they are provided
      if (username) updateData.username = username;
      if (password) updateData.password = password; //await bcrypt.hash(password, 10);
      if (role) updateData.role = role;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (postalCode) updateData.postalCode = postalCode;
      if (startDate) updateData.startDate = startDate;
      if (phone) updateData.phone = phone;
      if (name) updateData.name = name;
      if (mainId) updateData.mainId = mainId;
      if (isProjectManager) {
        const parsedProjectManager = JSON.parse(isProjectManager);
        updateData.isProjectManager = parsedProjectManager;
      }
      if (userProfession) {
        const parsedUserProfession = JSON.parse(userProfession);
        updateData.userProfession = parsedUserProfession;
      }
      updateData.picture = picture2;
      // If an image is uploaded, include its path in the update
      if (req.file) {
        updateData.picture = req.file.filename; // Store only the filename in the database
      }
      if (type) updateData.type = type;

      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// 5. Delete a user by ID
app.post(
  "/delete-user/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("users")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

// 6. Simple user login
app.post("/users/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection("users").findOne({ username, password });
    
    if (!user) {
      return res.status(404).json({ error: "Invalid username or password" });
    }
    
    // Check if user account is active
    if (user.status === "inactive" || user.status === "deactivated") {
      return res.status(403).json({ error: "Your account is deactivated" });
    }
    
    // Check if company is deactivated (for admin users)
    if (user.role === "Admin" && user.companyId) {
      try {
        const company = await db.collection("companies").findOne({ 
          _id: new ObjectId(user.companyId) 
        });

        if (company?.status === "deactivate") {
          return res.status(403).json({ error: "Your company is deactivated" });
        }
      } catch (error) {
        console.error("Error checking company status:", error);
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        companyId: user.companyId,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    // Return simple user object
    const userResponse = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyId: user.companyId,
      projectsId: user.projectsId || [],
      status: user.status
    };
    
    res.status(200).json({ 
      token, 
      user: userResponse,
      message: "Login successful"
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. Check if user is admin of any company
app.post("/check-admin", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user is admin of any company
    const isAdmin = user.role === "Admin";
    
    // Get company details if admin
    let companyInfo = null;
    if (isAdmin && user.companyId) {
      try {
        const company = await db.collection("companies").findOne({ 
          _id: new ObjectId(user.companyId) 
        });
        if (company) {
          companyInfo = {
            companyId: company._id,
            companyName: company.name,
            companyStatus: company.status
          };
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    }
    
    res.status(200).json({ 
      isAdmin: isAdmin,
      companyInfo: companyInfo,
      message: isAdmin ? "User is admin of a company" : "User is not admin of any company"
    });
  } catch (error) {
    console.error("Check admin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. Check if user is project manager in any project
app.post("/check-project-manager", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user is project manager in any project
    const isProjectManager = user.isProjectManager === "yes";
    
    // Get project details if project manager
    let projectInfo = [];
    if (isProjectManager && user.projectsId && user.projectsId.length > 0) {
      try {
        const validProjectIds = user.projectsId
          .filter(id => id && typeof id === 'string' && id.length === 24)
          .map(id => new ObjectId(id));
        
        if (validProjectIds.length > 0) {
          const projects = await db.collection("projects").find({
            _id: { $in: validProjectIds }
          }).toArray();
          
          projectInfo = projects.map(project => ({
            projectId: project._id,
            projectName: project.name,
            projectStatus: project.status
          }));
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }
    
    res.status(200).json({ 
      isProjectManager: isProjectManager,
      projectInfo: projectInfo,
      message: isProjectManager ? "User is project manager in projects" : "User is not project manager in any project"
    });
  } catch (error) {
    console.error("Check project manager error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Check if user is worker in any project
app.post("/check-worker", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user is worker in any project
    const isWorker = user.role === "Worker";
    
    // Get project and profession details if worker
    let projectInfo = [];
    let professionInfo = [];
    
    if (isWorker) {
      // Get project details
      if (user.projectsId && user.projectsId.length > 0) {
        try {
          const validProjectIds = user.projectsId
            .filter(id => id && typeof id === 'string' && id.length === 24)
            .map(id => new ObjectId(id));
          
          if (validProjectIds.length > 0) {
            const projects = await db.collection("projects").find({
              _id: { $in: validProjectIds }
            }).toArray();
            
            projectInfo = projects.map(project => ({
              projectId: project._id,
              projectName: project.name,
              projectStatus: project.status
            }));
          }
        } catch (error) {
          console.error("Error fetching projects:", error);
        }
      }
      
      // Get profession details
      if (user.userProfession) {
        try {
          let professionIds = [];
          
          if (Array.isArray(user.userProfession)) {
            professionIds = user.userProfession.map(prof => 
              typeof prof === 'object' ? prof._id : prof
            ).filter(id => id);
          } else if (typeof user.userProfession === 'object') {
            professionIds = user.userProfession._id ? [user.userProfession._id] : [];
          } else {
            professionIds = user.userProfession ? [user.userProfession] : [];
          }
          
          if (professionIds.length > 0) {
            const validProfessionIds = professionIds
              .filter(id => id && typeof id === 'string' && id.length === 24)
              .map(id => new ObjectId(id));
            
            if (validProfessionIds.length > 0) {
              const professions = await db.collection("professions").find({
                _id: { $in: validProfessionIds }
              }).toArray();
              
              professionInfo = professions.map(profession => ({
                professionId: profession._id,
                professionName: profession.name,
                professionDescription: profession.description
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching professions:", error);
        }
      }
    }
    
    res.status(200).json({ 
      isWorker: isWorker,
      projectInfo: projectInfo,
      professionInfo: professionInfo,
      message: isWorker ? "User is worker in projects" : "User is not worker in any project"
    });
  } catch (error) {
    console.error("Check worker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 10. Get all projects associated with user
app.post("/get-user-projects", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    let projects = [];
    
    // Get projects if user has project IDs
    if (user.projectsId && user.projectsId.length > 0) {
      try {
        const validProjectIds = user.projectsId
          .filter(id => id && typeof id === 'string' && id.length === 24)
          .map(id => new ObjectId(id));
        
        if (validProjectIds.length > 0) {
          const projectList = await db.collection("projects").find({
            _id: { $in: validProjectIds }
          }).toArray();
          
          projects = projectList.map(project => ({
            projectId: project._id,
            projectName: project.name,
            address: project.address,
            city: project.city,
            postalCode: project.postalCode,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
            companyId: project.companyId,
            description: project.description
          }));
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }
    
    res.status(200).json({ 
      userId: user._id,
      projects: projects
    });
  } catch (error) {
    console.error("Get user projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 11. Check user role in specific project (both, worker, or project manager)
app.post("/check-user-project-role", async (req, res) => {
  try {
    const { userId, projectId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }
    
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user has access to this specific project
    console.log('Debug - User projectsId:', user.projectsId);
    console.log('Debug - Checking projectId:', projectId);
    const hasProjectAccess = user.projectsId && user.projectsId.some(id => {
      console.log('Debug - Checking project ID:', id, 'against:', projectId, 'result:', id && id.toString() === projectId);
      return id && id.toString() === projectId;
    });
    console.log('Debug - Has project access:', hasProjectAccess);
    
    if (!hasProjectAccess) {
      return res.status(403).json({ 
        error: "User does not have access to this project",
        userRole: "none",
        isWorker: false,
        isProjectManager: false,
        isIndependentController: false
      });
    }
    
    // Check user roles in this specific project
    const isWorker = user.role === "Worker";
    const isProjectManager = user.isProjectManager === "yes";
    const isIndependentController = user.role === "Independent Controller";
    
    console.log('Debug - User role:', user.role);
    console.log('Debug - isWorker:', isWorker);
    console.log('Debug - isProjectManager:', isProjectManager);
    console.log('Debug - isIndependentController:', isIndependentController);
    
    let userRole = "none";
    
    if (isIndependentController) {
      userRole = "independent controller";
    } else if (isWorker && isProjectManager) {
      userRole = "both";
    } else if (isWorker) {
      userRole = "worker";
    } else if (isProjectManager) {
      userRole = "project manager";
    }
    
    console.log('Debug - Final userRole:', userRole);
    
    res.status(200).json({ 
      userId: user._id,
      projectId: projectId,
      userRole: userRole,
      isWorker: isWorker,
      isProjectManager: isProjectManager,
      isIndependentController: isIndependentController
    });
  } catch (error) {
    console.error("Check user project role error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Forgot Password API Endpoint
app.post("/users/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists with this email
    const user = await db.collection("users").findOne({ username: email });

    // Don't reveal if user exists or not for security reasons
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive password reset instructions shortly.",
      });
    }
    // Generate a random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set token expiry (10 minutes from now)
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Update user with reset token information
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry,
        },
      }
    );
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({
      success: true,
      message:
        "If your email is registered, you will receive password reset instructions shortly.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    logger: true,
    debug: true,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request",
    text: `You requested a password reset. Click the link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset. Click the link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

app.post("/users/reset-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    // Find user with the token and check if it's not expired
    const user = await db.collection("users").findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update user's password and clear reset token fields
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { password },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      }
    );

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/updateCheck", async (req, res) => {
  try {
    const { userId, checkId, checked } = req.body;

    // Validate required fields
    if (!userId || !checkId || typeof checked !== "boolean") {
      return res.status(400).json({
        error: "userId, checkId, and checked (boolean) are required.",
      });
    }

    // Access the users collection (adjust if your collection name differs)
    const usersCollection = db.collection("users");

    // Prepare the update operation:
    // - If checked is true, add checkId to the checks array using $addToSet
    // - If false, remove checkId from the checks array using $pull
    const updateOperation = checked
      ? { $addToSet: { checks: checkId } }
      : { $pull: { checks: checkId } };

    // Execute the update
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      updateOperation
    );

    // Check if a user was actually updated
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "User not found or check not updated." });
    }
    const updatedUser = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    res.json({
      message: "User check updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating check:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get(
  "/get-task-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("tasks")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "task not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  }
);
app.post(
  "/delete-task/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("tasks")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "task not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  }
);
app.post(
  "/delete-input/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("inputs")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "input not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete input" });
    }
  }
);
app.post(
  "/delete-standard/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("standards")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "standard not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete standard" });
    }
  }
);

app.get(
  "/get-check-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("checks")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "check not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch check" });
    }
  }
);
app.post(
  "/delete-check/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("checks")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "check not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete check" });
    }
  }
);

app.get(
  "/get-gamma-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("gammas")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "gamma not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gamma" });
    }
  }
);
app.post(
  "/delete-gamma/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("gammas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "gamma not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gamma" });
    }
  }
);

app.get(
  "/get-description-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("descriptions")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "description not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch description" });
    }
  }
);
app.post(
  "/delete-description/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("descriptions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "description not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete description" });
    }
  }
);

app.get(
  "/get-draw-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("draws")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "draw not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draw" });
    }
  }
);
app.post(
  "/delete-draw/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("draws")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "draw not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete draw" });
    }
  }
);

app.get(
  "/get-mention-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("mentions")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "mention not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mention" });
    }
  }
);
app.post(
  "/delete-mention/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("mentions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "mention not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete mention" });
    }
  }
);

app.get(
  "/get-new-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("news")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "new not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch new" });
    }
  }
);
app.post(
  "/delete-new/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("news")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "new not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete new" });
    }
  }
);

app.get(
  "/get-note-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("notes")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "note not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  }
);
app.post(
  "/delete-note/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("notes")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "note not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  }
);

app.get("/get-plan-detail/:id", async (req, res) => {
  try {
    const plan = await db
      .collection("plans")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Fetch draw details if drawIds exist
    let populatedDraws = [];
    if (Array.isArray(plan.drawIds) && plan.drawIds.length > 0) {
      // Convert string IDs to ObjectId
      const drawObjectIds = plan.drawIds.map((id) => new ObjectId(id));

      populatedDraws = await db
        .collection("draws")
        .find({ _id: { $in: drawObjectIds } })
        .toArray();
    }

    // Return plan with populated draws
    res.status(200).json({
      ...plan,
      drawIds: populatedDraws,
    });
  } catch (error) {
    console.error("Failed to fetch plan:", error);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

app.post(
  "/delete-plan/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("plans")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "plan not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete plan" });
    }
  }
);
app.get("/get-projects", async (req, res) => {
  try {
    const { companyId } = req.query;

    const query =
      companyId && companyId != "null" ? { companyId: companyId } : {};

    const projects = await db.collection("projects").find(query).toArray();

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get(
  "/get-project-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("projects")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "project not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  }
);
app.post(
  "/delete-project/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("projects")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "project not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  }
);

app.get(
  "/get-request-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("requests")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { requestion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "request not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch request" });
    }
  }
);
app.post(
  "/delete-request/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("requests")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "request not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete request" });
    }
  }
);

app.get(
  "/get-scheme-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("schemes")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { schemeion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "scheme not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheme" });
    }
  }
);
app.post(
  "/delete-scheme/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("schemes")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "scheme not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scheme" });
    }
  }
);

app.get(
  "/get-static-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("statics")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { staticion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "static not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch static" });
    }
  }
);
app.get(
  "/get-item-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("items")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!user) {
        return res.status(404).json({ error: "item not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  }
);
app.get(
  "/get-level-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const level = await db
        .collection("levels")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!level) {
        return res.status(404).json({ error: "level not found" });
      }
      res.status(200).json(level);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch level" });
    }
  }
);
app.post(
  "/delete-static/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("statics")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "static not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete static" });
    }
  }
);

app.get(
  "/get-super-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("supers")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { superion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "super not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch super" });
    }
  }
);
app.post(
  "/delete-super/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("supers")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "super not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete super" });
    }
  }
);

app.get(
  "/get-profession-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("inputs")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "profession not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draw" });
    }
  }
);

app.get("/get-profession-detail-in-company-projects/:id", async (req, res) => {
  try {
    const user = await db
      .collection("professions")
      .findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { password: 0 } }
      );
    if (!user) {
      return res.status(404).json({ error: "profession not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch draw" });
  }
});

app.post(
  "/delete-profession/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("professions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "profession not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profession" });
    }
  }
);

app.get(
  "/get-group-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("groups")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "group not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  }
);
app.post(
  "/delete-group/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("groups")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "group not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete group" });
    }
  }
);

app.get(
  "/get-deviation-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("deviations")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "deviation not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deviation" });
    }
  }
);
app.post(
  "/delete-deviation/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("deviations")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "deviation not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deviation" });
    }
  }
);

app.get(
  "/get-part-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("parts")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "part not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch part" });
    }
  }
);
app.post(
  "/delete-part/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("parts")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "part not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete part" });
    }
  }
);
app.get(
  "/get-companies",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const companies = await db
        .collection("companies")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  }
);
app.get(
  "/get-company-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("companies")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "company not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  }
);
app.post(
  "/delete-company/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("companies")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "company not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  }
);
app.post(
  "/delete-item/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("items")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "item not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  }
);
app.post(
  "/delete-level/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("levels")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "level not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete level" });
    }
  }
);
app.post(
  "/store-part",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    console.log("arslan ye task submit ho rahe hn");
    try {
      const { name, description, projectsId, companyId } = req.body; // Extract the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("parts").insertOne({
        name, // New field
        description,
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create part" });
    }
  }
);

app.post(
  "/submit-task",
  upload.fields([
    { name: "mainPictures", maxCount: 10 },
    { name: "markPictures", maxCount: 50 }, // More for multiple marks
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 }, // Add support for PNG images
  ]),
  checkDatabaseConnection,
  async (req, res) => {
    try {
      const {
        comment,
        buildingParts,
        drawing,
        projectId,
        taskId,
        user,
        independentController,
        mainPictureDescriptions,
        mainPictureCreatedDates,
        markPictureDescriptions,
        markPictureCreatedDates,
        markNumbers,
        submissionCreatedDate,
      } = req.fields || req.body; // Handle both multipart and JSON

      const parsedBuildingParts = buildingParts
        ? JSON.parse(buildingParts)
        : null;

      const parsedDrawing = drawing ? JSON.parse(drawing) : null;
      const parsedUser = user ? JSON.parse(user) : null;
      
      // Only parse independentController if it exists
      let parsedIndependentController = null;
      if (independentController) {
        parsedIndependentController = JSON.parse(independentController);
      }

      // Initialize variables
      let mainPictures = [];
      let mainPictureObjects = [];
      let markPictures = [];
      let markPictureObjects = [];

      // Handle main pictures (separate from mark pictures)
      if (req.files["mainPictures"] && req.files["mainPictures"].length > 0) {
        mainPictures = req.files["mainPictures"].map((file) => file.filename);

        const descriptions = Array.isArray(mainPictureDescriptions)
          ? mainPictureDescriptions
          : [mainPictureDescriptions];

        const createdDates = Array.isArray(mainPictureCreatedDates)
          ? mainPictureCreatedDates
          : [mainPictureCreatedDates];

        mainPictureObjects = req.files["mainPictures"].map((file, index) => ({
          filename: file.filename,
          description: descriptions[index] || "",
          originalName: file.originalname,
          createdDate: createdDates[index] || new Date().toISOString(),
        }));
      }

      // Handle mark-specific pictures
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        markPictures = req.files["markPictures"].map((file) => file.filename);

        const descriptions = Array.isArray(markPictureDescriptions)
          ? markPictureDescriptions
          : [markPictureDescriptions];
        
        const createdDates = Array.isArray(markPictureCreatedDates)
          ? markPictureCreatedDates
          : [markPictureCreatedDates];
        
        const markNums = Array.isArray(markNumbers)
          ? markNumbers
          : [markNumbers];

        markPictureObjects = req.files["markPictures"].map((file, index) => ({
          filename: file.filename,
          description: descriptions[index] || "",
          originalName: file.originalname,
          createdDate: createdDates[index] || new Date().toISOString(),
          markNumber: parseInt(markNums[index]) || 1,
        }));
      }

      // Handle annotated PDFs
      let annotatedPdfs = [];
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        annotatedPdfs = req.files["annotatedPdfs"].map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
        }));
      }

      // Handle annotated PDF images (PNG versions)
      let annotatedPdfImages = [];
      if (req.files["annotatedPdfImages"] && req.files["annotatedPdfImages"].length > 0) {
        annotatedPdfImages = req.files["annotatedPdfImages"].map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
        }));
      }

      // Create a new task entry
      const taskEntry = {
        _id: new ObjectId(),
        comment: comment,
        buildingParts: parsedBuildingParts,
        drawing: parsedDrawing,
        pictures: mainPictures, // Main pictures field (unchanged for backward compatibility)
        pictureObjects: mainPictureObjects, // Main picture objects
        markPictures: markPictures, // New: mark-specific pictures
        markPictureObjects: markPictureObjects, // New: mark picture objects with descriptions and dates
        annotatedPdfs: annotatedPdfs,
        annotatedPdfImages: annotatedPdfImages, // Add PNG images for annotated PDFs
        user: parsedUser,
        submittedAt: new Date(),
        submissionCreatedDate: submissionCreatedDate || new Date().toISOString(), // New: submission created date
        entryNumber: 1 // Will be updated below
      };

      // Only add independentController if it exists
      if (parsedIndependentController) {
        taskEntry.independentController = parsedIndependentController;
      }

      // First, get the current task to determine entry number
      const currentProject = await db.collection("projects").findOne(
        {
          _id: new ObjectId(projectId),
          "tasks._id": new ObjectId(taskId),
        }
      );

      if (!currentProject) {
        return res.status(404).json({ error: "Project or task not found" });
      }

      const currentTask = currentProject.tasks.find(t => t._id.toString() === taskId);
      
      // Initialize taskEntries array if it doesn't exist
      if (!currentTask.taskEntries) {
        currentTask.taskEntries = [];
      }

      // Set the entry number
      taskEntry.entryNumber = currentTask.taskEntries.length + 1;

      // Update the specific task in the project to add the new entry
      const result = await db.collection("projects").findOneAndUpdate(
        {
          _id: new ObjectId(projectId),
          "tasks._id": new ObjectId(taskId),
        },
        {
          $push: {
            "tasks.$.taskEntries": taskEntry
          },
          $set: {
            "tasks.$.isSubmitted": true,
            "tasks.$.updatedAt": new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return res.status(404).json({ error: "Project or task not found" });
      }

      res.status(200).json({
        message: "Task updated successfully",
        check: result.value,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.get("/get-user-professions", async (req, res) => {
  try {
    const { userId } = req.query;

    console.log('=== GET USER PROFESSIONS API ===');
    console.log('Requested userId:', userId);

    if (!userId) {
      console.log('Error: User ID is required');
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get user's professions from the database
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    
    console.log('Found user:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User data:', {
        _id: user._id,
        name: user.name,
        email: user.email,
        professions: user.professions
      });
    }
    
    if (!user) {
      console.log('Error: User not found');
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's professions (check both 'professions' and 'userProfession' fields)
    const userProfessions = user.professions || user.userProfession || [];
    
    console.log('User professions:', userProfessions);
    console.log('=== END GET USER PROFESSIONS API ===');
    
    res.status(200).json({
      success: true,
      professions: userProfessions
    });
  } catch (error) {
    console.error("Error getting user professions:", error);
    res.status(500).json({ error: "Failed to get user professions" });
  }
});

// Add endpoint to assign professions to a user (for testing)
app.post("/assign-user-professions", async (req, res) => {
  try {
    const { userId, professions } = req.body;

    if (!userId || !professions) {
      return res.status(400).json({ error: "User ID and professions are required" });
    }

    // Update user with professions
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { professions: professions } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Professions assigned successfully",
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error assigning professions:", error);
    res.status(500).json({ error: "Failed to assign professions" });
  }
});

app.get("/get-project-task", async (req, res) => {
  try {
    const { projectId, taskId } = req.query;

    if (!projectId || !taskId) {
      return res
        .status(400)
        .json({ error: "Project ID and Task ID are required" });
    }

    const project = await db
      .collection("projects")
      .findOne(
        { _id: new ObjectId(projectId) },
        { projection: { tasks: { $elemMatch: { _id: new ObjectId(taskId) } } } }
      );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.tasks || project.tasks.length === 0) {
      return res.status(404).json({ error: "Task not found in this project" });
    }

    res.status(200).json(project.tasks[0]);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

app.post("/submit-checklist", async (req, res) => {
  try {
    const { projectId, checkId, note } = req.body;

    const result = await db.collection("projects").findOneAndUpdate(
      {
        _id: new ObjectId(projectId),
        "checks._id": new ObjectId(checkId),
      },
      {
        $set: {
          "checks.$.isAproved": true,
          "checks.$.approvedDate": Date.now(),
          "checks.$.approvalNote": note || "",
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ error: "Project or task not found" });
    }

    res.status(200).json({
      message: "check list updated successfully",
      check: result.value,
    });
  } catch (error) {
    console.error("Error updating check:", error);
    res.status(500).json({ error: "Failed to update check" });
  }
});

app.post("/approv-task", async (req, res) => {
  try {
    const { projectId, taskId, isActive } = req.body;

    const result = await db.collection("projects").findOneAndUpdate(
      {
        _id: new ObjectId(projectId),
        "tasks._id": new ObjectId(taskId),
      },
      {
        $set: {
          "tasks.$.isActive": isActive,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ error: "Project or task not found" });
    }

    res.status(200).json({
      message: "task list  updated successfully",
      check: result.value,
    });
  } catch (error) {
    console.error("Error updating check:", error);
    res.status(500).json({ error: "Failed to update check" });
  }
});

// API endpoint to get task submission analytics
app.get("/get-task-submission-analytics", checkDatabaseConnection, async (req, res) => {
  try {
    const { 
      profession, 
      type, 
      users, 
      independentControllers,
      companyId,
      projectId 
    } = req.query;

    // Build the base query for projects
    const projectQuery = {};
    
    if (companyId && companyId !== "null") {
      projectQuery.companyId = companyId;
    }
    
    if (projectId && projectId !== "null") {
      projectQuery._id = new ObjectId(projectId);
    }

    // Get all projects that match the base criteria
    const projects = await db.collection("projects").find(projectQuery).toArray();

    // Structure to store analytics data
    const analyticsData = {
      totalTasks: 0,
      submittedTasks: 0,
      editedTasks: 0,
      users: new Map(),
      independentControllers: new Map(),
      tasksByProfession: new Map(),
      tasksByType: {
        Worker: 0,
        "Independent Controller": 0
      }
    };

    // Process each project
    for (const project of projects) {
      if (!project.tasks || !Array.isArray(project.tasks)) continue;

      for (const task of project.tasks) {
        // Skip if task doesn't have user information
        if (!task.user) continue;

        // Filter by profession if specified
        if (profession && profession !== "null") {
          if (!task.profession || task.profession.name !== profession) {
            continue;
          }
        }

        // Filter by type if specified
        if (type && type !== "null") {
          const userType = task.user.role === "Independent Controller" ? "Independent Controller" : "Worker";
          if (userType !== type) {
            continue;
          }
        }

        // Filter by specific users if specified
        if (users && users !== "null") {
          const userIds = Array.isArray(users) ? users : [users];
          if (!userIds.includes(task.user._id)) {
            continue;
          }
        }

        // Filter by specific independent controllers if specified
        if (independentControllers && independentControllers !== "null") {
          const controllerIds = Array.isArray(independentControllers) ? independentControllers : [independentControllers];
          if (task.user.role !== "Independent Controller" || !controllerIds.includes(task.user._id)) {
            continue;
          }
        }

        // Count total tasks
        analyticsData.totalTasks++;

        // Count submitted tasks
        if (task.isSubmitted) {
          analyticsData.submittedTasks++;
        }

        // Count edited tasks (has updatedAt and isSubmitted)
        if (task.updatedAt && task.isSubmitted) {
          analyticsData.editedTasks++;
        }

        // Track by user type
        const userType = task.user.role === "Independent Controller" ? "Independent Controller" : "Worker";
        analyticsData.tasksByType[userType]++;

        // Track by profession
        if (task.profession && task.profession.name) {
          const professionName = task.profession.name;
          if (!analyticsData.tasksByProfession.has(professionName)) {
            analyticsData.tasksByProfession.set(professionName, {
              name: professionName,
              totalTasks: 0,
              submittedTasks: 0,
              editedTasks: 0
            });
          }
          const professionData = analyticsData.tasksByProfession.get(professionName);
          professionData.totalTasks++;
          if (task.isSubmitted) professionData.submittedTasks++;
          if (task.updatedAt && task.isSubmitted) professionData.editedTasks++;
        }

        // Track by individual users
        if (task.user.role === "Independent Controller") {
          const controllerId = task.user._id;
          if (!analyticsData.independentControllers.has(controllerId)) {
            analyticsData.independentControllers.set(controllerId, {
              id: controllerId,
              name: task.user.name || "Independent Controller",
              role: "Independent Controller",
              totalTasks: 0,
              submittedTasks: 0,
              editedTasks: 0,
              tasks: []
            });
          }
          const controllerData = analyticsData.independentControllers.get(controllerId);
          controllerData.totalTasks++;
          if (task.isSubmitted) controllerData.submittedTasks++;
          if (task.updatedAt && task.isSubmitted) controllerData.editedTasks++;
          
          // Add task details
          controllerData.tasks.push({
            taskId: task._id,
            projectId: project._id,
            projectName: project.name,
            profession: task.profession?.name,
            comment: task.comment,
            isSubmitted: task.isSubmitted,
            updatedAt: task.updatedAt,
            submittedAt: task.updatedAt // Assuming updatedAt is when it was submitted
          });
        } else {
          const userId = task.user._id;
          if (!analyticsData.users.has(userId)) {
            analyticsData.users.set(userId, {
              id: userId,
              name: task.user.name || task.user.username,
              role: task.user.role,
              totalTasks: 0,
              submittedTasks: 0,
              editedTasks: 0,
              tasks: []
            });
          }
          const userData = analyticsData.users.get(userId);
          userData.totalTasks++;
          if (task.isSubmitted) userData.submittedTasks++;
          if (task.updatedAt && task.isSubmitted) userData.editedTasks++;
          
          // Add task details
          userData.tasks.push({
            taskId: task._id,
            projectId: project._id,
            projectName: project.name,
            profession: task.profession?.name,
            comment: task.comment,
            isSubmitted: task.isSubmitted,
            updatedAt: task.updatedAt,
            submittedAt: task.updatedAt
          });
        }
      }
    }

    // Convert Maps to arrays for JSON response
    const response = {
      success: true,
      summary: {
        totalTasks: analyticsData.totalTasks,
        submittedTasks: analyticsData.submittedTasks,
        editedTasks: analyticsData.editedTasks,
        submissionRate: analyticsData.totalTasks > 0 ? (analyticsData.submittedTasks / analyticsData.totalTasks * 100).toFixed(2) : 0,
        tasksByType: analyticsData.tasksByType
      },
      byProfession: Array.from(analyticsData.tasksByProfession.values()),
      byUsers: Array.from(analyticsData.users.values()),
      byIndependentControllers: Array.from(analyticsData.independentControllers.values()),
      filters: {
        profession: profession || null,
        type: type || null,
        users: users || null,
        independentControllers: independentControllers || null,
        companyId: companyId || null,
        projectId: projectId || null
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching task submission analytics:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch task submission analytics" 
    });
  }
});

// API endpoint to get task entries count for a specific project
app.get("/get-task-entries-count", checkDatabaseConnection, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Get the project with tasks
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(projectId) }
    );

    if (!project || !project.tasks) {
      return res.status(200).json({ tasks: [] });
    }

    // Process each task to count entries
    const tasksWithEntries = project.tasks.map(task => {
      let entryCount = 0;
      let isSubmitted = false;

      // Count entries from taskEntries array
      if (task.taskEntries && Array.isArray(task.taskEntries)) {
        entryCount = task.taskEntries.length;
        isSubmitted = entryCount > 0;
      } else {
        // Fallback: Check if task has been submitted (for backward compatibility)
        if (task.isSubmitted) {
          entryCount = 1;
          isSubmitted = true;
        }

        // Also check if task has user data (indicating it's been submitted)
        if (task.user) {
          entryCount = 1;
          isSubmitted = true;
        }
      }

      return {
        ...task,
        entryCount,
        isSubmitted
      };
    });

    res.status(200).json({
      success: true,
      tasks: tasksWithEntries
    });
  } catch (error) {
    console.error("Error fetching task entries count:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch task entries count" 
    });
  }
});

app.post("/submit-static-document-checklist", async (req, res) => {
  try {
    const {
      projectId,
      staticDocumentCheckListId,
      profession,
      controlPlan,
      comment,
      date,
      projectManager,
      approvedDate,
      independentControl // allow for future use
    } = req.body;

    // Parse objects if sent as JSON strings
    let parsedProfession = profession;
    let parsedProjectManager = projectManager;
    let parsedIndependentControl = independentControl;
    try {
      if (typeof profession === 'string') parsedProfession = JSON.parse(profession);
    } catch {}
    try {
      if (typeof projectManager === 'string') parsedProjectManager = JSON.parse(projectManager);
    } catch {}
    try {
      if (typeof independentControl === 'string') parsedIndependentControl = JSON.parse(independentControl);
    } catch {}

    const professionKey = parsedProfession.SubjectMatterId;
    const updatePath = `professionAssociatedData.${professionKey}.staticDocumentCheckList`;

    // Update the project as before
    const result = await db.collection("projects").findOneAndUpdate(
      {
        _id: new ObjectId(projectId),
        [`${updatePath}._id`]: new ObjectId(staticDocumentCheckListId),
      },
      {
        $set: {
          [`${updatePath}.$.profession`]: parsedProfession,
          [`${updatePath}.$.controlPlan`]: controlPlan,
          [`${updatePath}.$.comment`]: comment,
          [`${updatePath}.$.selectedDate`]: date,
          [`${updatePath}.$.isSubmitted`]: true,
          [`${updatePath}.$.projectManager`]: parsedProjectManager,
          [`${updatePath}.$.approvedDate`]: approvedDate, // Initially null, will be set when approved
        },
      },
      { returnDocument: "after" }
    );

    // Fetch the full checklist item object
    let checklistItem = null;
    try {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId) });
      if (project && project.professionAssociatedData && project.professionAssociatedData[professionKey]) {
        const checklistArray = project.professionAssociatedData[professionKey].staticDocumentCheckList;
        if (Array.isArray(checklistArray)) {
          checklistItem = checklistArray.find(item => item._id && item._id.toString() === staticDocumentCheckListId);
        }
      }
    } catch (err) {
      console.error("Error fetching checklist item:", err);
    }

    // Insert into the new collection
    const checklistEntry = {
      ...req.body, // all form data
      projectId: projectId,
      staticDocumentCheckListId: staticDocumentCheckListId,
      projectManager: parsedProjectManager, // full user object
      profession: parsedProfession, // full profession object
      submittedDate: new Date(), // current timestamp
      status: "Submitted", // default value
      approvedBy: false, // default value
      approvedDate: approvedDate, // Initially null, will be set when approved
      independentControl: parsedIndependentControl || null, // default value
      checklistItem: checklistItem, // full checklist item object
    };
    
    console.log("Inserting into staticDocumentChecklistProjectAndProfessionWise collection:", {
      projectId,
      staticDocumentCheckListId,
      submittedDate: checklistEntry.submittedDate,
      status: checklistEntry.status
    });
    
    const insertResult = await db.collection("staticDocumentChecklistProjectAndProfessionWise").insertOne(checklistEntry);
    console.log("Successfully inserted document with ID:", insertResult.insertedId);

    if (!result) {
      return res
        .status(404)
        .json({ error: "Project or checklist item not found" });
    }

    res.status(200).json({
      message: "Checklist item updated successfully",
      check: result,
    });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});

// API endpoint to check submitted status for static document checklist items
app.get("/check-static-document-checklist-status", async (req, res) => {
  try {
    const { projectId, professionId, checklistIds } = req.query;
    
    console.log("API called with params:", { projectId, professionId, checklistIds });
    
    if (!projectId || !professionId || !checklistIds) {
      return res.status(400).json({ 
        error: "Missing required parameters: projectId, professionId, checklistIds" 
      });
    }

    // Parse checklistIds if it's a string
    let parsedChecklistIds = checklistIds;
    if (typeof checklistIds === 'string') {
      try {
        parsedChecklistIds = JSON.parse(checklistIds);
      } catch (e) {
        parsedChecklistIds = [checklistIds];
      }
    }

    // Convert string IDs to ObjectIds
    const checklistObjectIds = parsedChecklistIds.map(id => new ObjectId(id));

    const query = {
      projectId: projectId,
      "profession._id": professionId,
      staticDocumentCheckListId: { $in: checklistObjectIds }
    };

    // Also try with string values in case staticDocumentCheckListId is stored as string
    const queryWithStringIds = {
      projectId: projectId,
      "profession._id": professionId,
      staticDocumentCheckListId: { $in: parsedChecklistIds }
    };

    console.log("Trying ObjectId query first...");
    let submittedEntries = await db.collection("staticDocumentChecklistProjectAndProfessionWise")
      .find(query)
      .toArray();

    if (submittedEntries.length === 0) {
      console.log("No results with ObjectId query, trying string query...");
      submittedEntries = await db.collection("staticDocumentChecklistProjectAndProfessionWise")
        .find(queryWithStringIds)
        .toArray();
    }

    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    console.log("Found entries:", submittedEntries.length);
    console.log("Entries:", JSON.stringify(submittedEntries, null, 2));

    // Create a map of submitted checklist IDs and approval status
    const submittedChecklistIds = submittedEntries.map(entry => entry.staticDocumentCheckListId.toString());
    const approvalStatus = {};
    
    submittedEntries.forEach(entry => {
      approvalStatus[entry.staticDocumentCheckListId.toString()] = {
        approvedBy: entry.approvedBy || false,
        approvedDate: entry.approvedDate || null
      };
    });

    console.log("Returning submittedChecklistIds:", submittedChecklistIds);
    console.log("Returning approvalStatus:", approvalStatus);

    res.status(200).json({
      success: true,
      submittedChecklistIds: submittedChecklistIds,
      approvalStatus: approvalStatus,
      count: submittedEntries.length
    });
  } catch (error) {
    console.error("Error checking static document checklist status:", error);
    res.status(500).json({ error: "Failed to check checklist status" });
  }
});

// API endpoint to approve static document checklist items
app.post("/approve-static-document-checklist", async (req, res) => {
  try {
    const { projectId, staticDocumentCheckListId, professionId, independentControllerId } = req.body;
    
    if (!projectId || !staticDocumentCheckListId || !professionId || !independentControllerId) {
      return res.status(400).json({ 
        error: "Missing required parameters: projectId, staticDocumentCheckListId, professionId, independentControllerId" 
      });
    }

    // Get the independent controller details
    const independentController = await db.collection("users").findOne({
      _id: new ObjectId(independentControllerId)
    });

    if (!independentController) {
      return res.status(404).json({ error: "Independent controller not found" });
    }

    // Update the approval status in the collection
    console.log("Approval query params:", {
      projectId,
      professionId,
      staticDocumentCheckListId,
      staticDocumentCheckListIdType: typeof staticDocumentCheckListId
    });

    // First, let's see what documents exist in the collection
    const existingDocs = await db.collection("staticDocumentChecklistProjectAndProfessionWise").find({
      projectId: projectId
    }).toArray();
    
    console.log("Existing documents in collection:", existingDocs.length);
    console.log("Sample document structure:", existingDocs[0]);

    // Try different query variations
    let result = await db.collection("staticDocumentChecklistProjectAndProfessionWise").updateOne(
      {
        projectId: projectId,
        "profession._id": professionId,
        staticDocumentCheckListId: staticDocumentCheckListId.toString()
      },
      {
        $set: {
          approvedBy: true,
          approvedDate: new Date(),
          independentController: independentController
        }
      }
    );

    // If not found, try with ObjectId comparison
    if (result.matchedCount === 0) {
      console.log("Trying with ObjectId comparison...");
      result = await db.collection("staticDocumentChecklistProjectAndProfessionWise").updateOne(
        {
          projectId: projectId,
          "profession._id": professionId,
          staticDocumentCheckListId: new ObjectId(staticDocumentCheckListId)
        },
        {
          $set: {
            approvedBy: true,
            approvedDate: new Date(),
            independentController: independentController
          }
        }
      );
    }

    // If still not found, try without profession._id constraint
    if (result.matchedCount === 0) {
      console.log("Trying without profession constraint...");
      result = await db.collection("staticDocumentChecklistProjectAndProfessionWise").updateOne(
        {
          projectId: projectId,
          staticDocumentCheckListId: staticDocumentCheckListId.toString()
        },
        {
          $set: {
            approvedBy: true,
            approvedDate: new Date(),
            independentController: independentController
          }
        }
      );
    }

    console.log("Update result:", result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Checklist item not found" });
    }

    res.status(200).json({
      success: true,
      message: "Checklist item approved successfully",
      approvedDate: new Date(),
      independentController: independentController
    });
  } catch (error) {
    console.error("Error approving checklist item:", error);
    res.status(500).json({ error: "Failed to approve checklist item" });
  }
});

app.post(
  "/submit-static-report",
  upload.fields([
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 },
    { name: "mainPictures", maxCount: 50 },
    { name: "markPictures", maxCount: 50 }
  ]),
  async (req, res) => {
    try {
      console.log('=== SUBMIT STATIC REPORT ===');
      console.log('Request body fields:', Object.keys(req.body));
      console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
    
      const {
        projectId,
        staticReportId,
        comment,
        date,
        independentController,
      } = req.body;
      
      // Safely parse JSON fields with null checks
      const profession = req.body.profession ? JSON.parse(req.body.profession) : null;
      const selectedWorkers = req.body.selectedWorkers ? JSON.parse(req.body.selectedWorkers) : [];
      const controlPlan = req.body.controlPlan ? JSON.parse(req.body.controlPlan) : null;
      const drawing = req.body.drawing ? JSON.parse(req.body.drawing) : null;
      const submittedStaticReportItem = req.body.staticReportItem ? JSON.parse(req.body.staticReportItem) : null;

      console.log('Parsed fields:');
      console.log('  - profession:', profession ? 'Present' : 'Null');
      console.log('  - selectedWorkers:', selectedWorkers.length, 'items');
      console.log('  - controlPlan:', controlPlan ? 'Present' : 'Null');
      console.log('  - drawing:', drawing ? 'Present' : 'Null');
      console.log('  - independentController:', independentController ? 'Present' : 'Null');
      console.log('  - comment:', comment ? 'Present' : 'Null');
      console.log('  - date:', date ? 'Present' : 'Null');

      const professionKey = profession ? profession.SubjectMatterId : null;
      const updatePath = professionKey ? `professionAssociatedData.${professionKey}.staticReportRegistration` : null;

      // Handle multiple annotated PDFs and convert to PNG
      let annotatedPdfs = [];
      let annotatedPdfImages = [];
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        for (const file of req.files["annotatedPdfs"]) {
          const pdfInfo = {
          filename: file.filename,
          originalName: file.originalname,
          };
          annotatedPdfs.push(pdfInfo);
          
          // Convert PDF to PNG
          try {
            const pdfPath = path.join(__dirname, "uploads", file.filename);
            const outputDir = path.join(__dirname, "uploads");
            const pngFilename = await convertPdfToPng(pdfPath, outputDir);
            
            if (pngFilename) {
              annotatedPdfImages.push({
                filename: pngFilename,
                originalName: file.originalname.replace('.pdf', '.png'),
                sourcePdf: file.filename
              });
              console.log(`Converted PDF ${file.filename} to PNG ${pngFilename}`);
            }
          } catch (error) {
            console.error(`Error converting PDF ${file.filename} to PNG:`, error);
          }
        }
      }

      // Handle main pictures with descriptions
      let mainPictures = [];
      if (req.files["mainPictures"] && req.files["mainPictures"].length > 0) {
        const mainPictureDescriptions = req.body.mainPictureDescriptions ? 
          (Array.isArray(req.body.mainPictureDescriptions) ? req.body.mainPictureDescriptions : [req.body.mainPictureDescriptions]) : 
          [];
        const mainPictureCreatedDates = req.body.mainPictureCreatedDates ? 
          (Array.isArray(req.body.mainPictureCreatedDates) ? req.body.mainPictureCreatedDates : [req.body.mainPictureCreatedDates]) : 
          [];
        
        mainPictures = req.files["mainPictures"].map((file, index) => ({
          filename: file.filename,
          originalName: file.originalname,
          description: mainPictureDescriptions[index] || "",
          createdDate: mainPictureCreatedDates[index] || new Date().toISOString(),
        }));
      }

      // Handle mark pictures with descriptions
      let markPictures = [];
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        const markPictureDescriptions = req.body.markPictureDescriptions ? 
          (Array.isArray(req.body.markPictureDescriptions) ? req.body.markPictureDescriptions : [req.body.markPictureDescriptions]) : 
          [];
        const markPictureCreatedDates = req.body.markPictureCreatedDates ? 
          (Array.isArray(req.body.markPictureCreatedDates) ? req.body.markPictureCreatedDates : [req.body.markPictureCreatedDates]) : 
          [];
        const markNumbers = req.body.markNumbers ? 
          (Array.isArray(req.body.markNumbers) ? req.body.markNumbers : [req.body.markNumbers]) : 
          [];
        
        markPictures = req.files["markPictures"].map((file, index) => ({
          filename: file.filename,
          originalName: file.originalname,
          description: markPictureDescriptions[index] || "",
          createdDate: markPictureCreatedDates[index] || new Date().toISOString(),
          markNumber: markNumbers[index] || null,
        }));
      }

      // Update the existing static report registration
      // First, let's check if the project exists
      const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId)
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get the complete static report item object
      let staticReportItem = null;
      if (professionKey && project.professionAssociatedData && project.professionAssociatedData[professionKey]) {
        const staticReportRegistration = project.professionAssociatedData[professionKey].staticReportRegistration;
        if (staticReportRegistration) {
          staticReportItem = staticReportRegistration.find(item => 
            item._id && item._id.toString() === staticReportId
          );
        }
      }

            // Try to update the existing static report registration (only if we have valid data)
      let result = null;
      if (updatePath && professionKey) {
        const updateFields = {
          [`${updatePath}.$.isSubmitted`]: true,
          [`${updatePath}.$.annotatedPdfs`]: annotatedPdfs,
          [`${updatePath}.$.annotatedPdfImages`]: annotatedPdfImages, // New field for PNG images
          [`${updatePath}.$.mainPictures`]: mainPictures,
          [`${updatePath}.$.markPictures`]: markPictures,
          [`${updatePath}.$.updatedAt`]: new Date(),
        };

        // Only add fields that are not null
        if (profession !== null) updateFields[`${updatePath}.$.profession`] = profession;
        if (selectedWorkers !== null) updateFields[`${updatePath}.$.selectedWorkers`] = selectedWorkers;
        if (controlPlan !== null) updateFields[`${updatePath}.$.controlPlan`] = controlPlan;
        if (comment !== null) updateFields[`${updatePath}.$.comment`] = comment;
        if (date !== null) updateFields[`${updatePath}.$.selectedDate`] = date;
        if (drawing !== null) updateFields[`${updatePath}.$.drawing`] = drawing;
        if (independentController !== null) updateFields[`${updatePath}.$.independentController`] = independentController;

        result = await db.collection("projects").findOneAndUpdate(
          {
            _id: new ObjectId(projectId),
            [`${updatePath}._id`]: new ObjectId(staticReportId),
          },
          {
            $set: updateFields,
          },
          { returnDocument: "after" }
        );
      }

      // If the static report doesn't exist in the original structure, that's okay
      // We'll still create the entry in our new collection
      if (!result || !result.value) {
        console.log("Static report not found in original structure, but continuing to save to new collection");
      }

      // Create complete static report entry for the new collection
      const staticReportEntry = {
        projectId: new ObjectId(projectId),
        staticReportId: new ObjectId(staticReportId),
        annotatedPdfs: annotatedPdfs,
        annotatedPdfImages: annotatedPdfImages, // New field for PNG images
        mainPictures: mainPictures,
        markPictures: markPictures,
        isSubmitted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        submissionCreatedDate: req.body.submissionCreatedDate || new Date().toISOString(),
        // Additional metadata - use project data we already fetched
        companyId: project.companyId || null,
        projectName: project.name || "Unknown Project",
        // Include the complete static report item object
        staticReportItem: submittedStaticReportItem || staticReportItem,
      };

      // Only add fields that are not null
      if (profession !== null) {
        staticReportEntry.professionId = profession._id;
        staticReportEntry.profession = profession;
        staticReportEntry.professionKey = professionKey;
        staticReportEntry.professionName = profession.GroupName;
      }
      if (selectedWorkers !== null) staticReportEntry.selectedWorkers = selectedWorkers;
      if (independentController !== null) staticReportEntry.independentController = independentController;
      if (controlPlan !== null) staticReportEntry.controlPlan = controlPlan;
      if (comment !== null) staticReportEntry.comment = comment;
      if (date !== null) staticReportEntry.date = date;
      if (drawing !== null) staticReportEntry.drawing = drawing;

      // Save to the new StaticReportRegistrationEntries collection
      await db.collection("StaticReportRegistrationEntries").insertOne(staticReportEntry);

      res.status(200).json({
        message: "Static report updated successfully and entry saved to StaticReportRegistrationEntries",
        check: result && result.value ? result.value : { success: true },
      });
    } catch (error) {
      console.error('Error in submit-static-report:', error);
      res.status(500).json({ 
        error: "Failed to submit static report", 
        details: error.message 
      });
    }
  }
);

// API endpoint to get static report registration entries
app.get("/get-static-report-entries", async (req, res) => {
  try {
    const { companyId, projectId, professionId } = req.query;
    
    const query = {};
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }
    if (projectId && projectId !== "null") {
      query.projectId = new ObjectId(projectId);
    }
    if (professionId && professionId !== "null") {
      query.professionId = professionId;
    }

    const entries = await db.collection("StaticReportRegistrationEntries")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching static report entries:", error);
    res.status(500).json({ error: "Failed to fetch static report entries" });
  }
});

// API endpoint to get static report entries by specific IDs
app.get("/get-static-report-entries-by-ids", async (req, res) => {
  try {
    const { staticReportId, professionId, projectId } = req.query;
    
    if (!staticReportId || !professionId || !projectId) {
      return res.status(400).json({ 
        error: "Missing required parameters: staticReportId, professionId, projectId" 
      });
    }

    const query = {
      staticReportId: new ObjectId(staticReportId),
      professionId: professionId,
      projectId: new ObjectId(projectId)
    };

    const entries = await db.collection("StaticReportRegistrationEntries")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get the complete static report item object from the project
    let staticReportItem = null;
    try {
      const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId)
      });

      if (project && project.professionAssociatedData) {
        for (const professionKey in project.professionAssociatedData) {
          const professionData = project.professionAssociatedData[professionKey];
          
          if (professionData?.staticReportRegistration) {
            const item = professionData.staticReportRegistration.find(
              report => report._id && report._id.toString() === staticReportId
            );
            if (item) {
              staticReportItem = item;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching static report item:", error);
    }

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
      staticReportItem: staticReportItem
    });
  } catch (error) {
    console.error("Error fetching static report entries by IDs:", error);
    res.status(500).json({ error: "Failed to fetch static report entries" });
  }
});

// New API endpoint to get hierarchical data structure
app.get("/get-static-report-hierarchy", async (req, res) => {
  try {
    const { companyId, projectId, taskId } = req.query;

    // Build query for projects
    const projectQuery = {};
    if (companyId && companyId !== "null") {
      projectQuery.companyId = companyId;
    }

    // If projectId is provided, filter by specific project
    if (projectId && projectId !== "null") {
      projectQuery._id = new ObjectId(projectId);
    }

    // Get projects with their static report data
    const projects = await db
      .collection("projects")
      .find(projectQuery)
      .toArray();

    // Structure to store the hierarchical data
    const usersMap = new Map();

    // Process each project
    for (const project of projects) {
      const projectName = project.name;
      const projectId = project._id.toString();

      // Process profession associated data
      if (project.professionAssociatedData) {
        for (const [professionKey, professionData] of Object.entries(
          project.professionAssociatedData
        )) {
          // If taskId is provided, only process the specific task
          if (taskId && taskId !== "null" && professionKey !== taskId) {
            continue;
          }

          if (professionData.staticReportRegistration) {
            for (const report of professionData.staticReportRegistration) {
              if (report.isSubmitted) {
                // Determine the user (either independentController or user)
                let userId = null;
                let userName = null;
                let userRole = null;

                if (report.independentController) {
                  userId = report.independentController;
                  userName = "Independent Controller";
                  userRole = "Independent Controller";
                } else if (report.user && report.user._id) {
                  userId = report.user._id;
                  userName =
                    report.user.name || report.user.username || "Unknown User";
                  userRole = report.user.role || "User";
                }

                if (userId) {
                  // Get or create user entry
                  if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                      userId,
                      userName,
                      userRole,
                      projects: new Map(),
                    });
                  }

                  const user = usersMap.get(userId);

                  // Get or create project entry
                  if (!user.projects.has(projectId)) {
                    user.projects.set(projectId, {
                      projectId,
                      projectName,
                      tasks: new Map(),
                      totalEntries: 0,
                    });
                  }

                  const projectEntry = user.projects.get(projectId);

                  // Get or create task entry
                  const taskId = professionKey;
                  const taskName = report.profession?.name || professionKey;

                  if (!projectEntry.tasks.has(taskId)) {
                    projectEntry.tasks.set(taskId, {
                      taskId,
                      taskName,
                      entries: [],
                      entryCount: 0,
                    });
                  }

                  const taskEntry = projectEntry.tasks.get(taskId);

                  // Add form data entry
                  const formData = {
                    id: report._id?.toString() || Math.random().toString(),
                    comment: report.comment,
                    date: report.selectedDate,
                    controlPlan: report.controlPlan,
                    drawing: report.drawing,
                    annotatedPdfs: report.annotatedPdfs || [],
                    updatedAt: report.updatedAt,
                    profession: report.profession,
                  };

                  taskEntry.entries.push(formData);
                  taskEntry.entryCount = taskEntry.entries.length;
                  projectEntry.totalEntries += 1;
                }
              }
            }
          }
        }
      }
    }

    // Convert Maps to arrays for JSON response
    const result = Array.from(usersMap.values()).map((user) => ({
      userId: user.userId,
      userName: user.userName,
      userRole: user.userRole,
      projects: Array.from(user.projects.values()).map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        totalEntries: project.totalEntries,
        tasks: Array.from(project.tasks.values()).map((task) => ({
          taskId: task.taskId,
          taskName: task.taskName,
          entryCount: task.entryCount,
          entries: task.entries,
        })),
      })),
    }));

    res.status(200).json({
      success: true,
      data: result,
      totalUsers: result.length,
      totalProjects: result.reduce(
        (sum, user) => sum + user.projects.length,
        0
      ),
      totalTasks: result.reduce(
        (sum, user) =>
          sum +
          user.projects.reduce(
            (pSum, project) => pSum + project.tasks.length,
            0
          ),
        0
      ),
      totalEntries: result.reduce(
        (sum, user) =>
          sum +
          user.projects.reduce(
            (pSum, project) => pSum + project.totalEntries,
            0
          ),
        0
      ),
    });
  } catch (error) {
    console.error("Error fetching static report hierarchy:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch static report hierarchy",
    });
  }
});

// API endpoint to get control plan data hierarchy
app.get("/get-control-plan-hierarchy", async (req, res) => {
  try {
    const { companyId, projectId, taskId } = req.query;

    // Build query for controls
    const controlQuery = {};
    if (companyId && companyId !== "null") {
      controlQuery.companyId = companyId;
    }

    // If projectId is provided, filter by specific project
    if (projectId && projectId !== "null") {
      controlQuery.projectsId = { $in: [projectId] };
    }

    // If taskId (professionId) is provided, filter by specific task
    if (taskId && taskId !== "null") {
      controlQuery.professionId = taskId;
    }

    // Get controls data
    const controls = await db
      .collection("controls")
      .find(controlQuery)
      .toArray();

    // Structure to store the hierarchical data
    const usersMap = new Map();

    // Process each control entry
    for (const control of controls) {
      // Determine the user (either independentController or controllerT/controllerD)
      let userId = null;
      let userName = null;
      let userRole = null;

      if (control.independentController) {
        userId = control.independentController;
        userName = "Independent Controller";
        userRole = "Independent Controller";
      } else if (control.controllerT) {
        userId = control.controllerT;
        userName = "Controller T";
        userRole = "Controller T";
      } else if (control.controllerD) {
        userId = control.controllerD;
        userName = "Controller D";
        userRole = "Controller D";
      }

      if (userId) {
        // Get or create user entry
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            userId,
            userName,
            userRole,
            projects: new Map(),
          });
        }

        const user = usersMap.get(userId);

        // Get project details for each project in projectsId array
        const projectIds = Array.isArray(control.projectsId)
          ? control.projectsId
          : [control.projectsId];

        for (const projectId of projectIds) {
          if (!projectId) continue;

          // Get or create project entry
          if (!user.projects.has(projectId)) {
            // Get project name from projects collection
            const project = await db
              .collection("projects")
              .findOne({ _id: new ObjectId(projectId) });
            const projectName = project ? project.name : `Project ${projectId}`;

            user.projects.set(projectId, {
              projectId,
              projectName,
              tasks: new Map(),
              totalEntries: 0,
            });
          }

          const projectEntry = user.projects.get(projectId);

          // Get or create task entry
          const taskId = control.professionId || "Unknown Task";
          const taskName = control.professionId || "Unknown Task";

          if (!projectEntry.tasks.has(taskId)) {
            projectEntry.tasks.set(taskId, {
              taskId,
              taskName,
              entries: [],
              entryCount: 0,
            });
          }

          const taskEntry = projectEntry.tasks.get(taskId);

          // Add control data entry
          const controlData = {
            id: control._id?.toString() || Math.random().toString(),
            euroCode: control.euroCode,
            independent: control.independent,
            b222x: control.b222x,
            b322x: control.b322x,
            a5x: control.a5x,
            specialText: control.specialText,
            exc: control.exc,
            cc: control.cc,
            controllerT: control.controllerT,
            controllerD: control.controllerD,
            independentController: control.independentController,
            picture: control.picture,
            pictures: control.pictures || [],
            createdAt: control.createdAt,
            updatedAt: control.updatedAt,
          };

          taskEntry.entries.push(controlData);
          taskEntry.entryCount = taskEntry.entries.length;
          projectEntry.totalEntries += 1;
        }
      }
    }

    // Convert Maps to arrays for JSON response
    const result = Array.from(usersMap.values()).map((user) => ({
      userId: user.userId,
      userName: user.userName,
      userRole: user.userRole,
      projects: Array.from(user.projects.values()).map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        totalEntries: project.totalEntries,
        tasks: Array.from(project.tasks.values()).map((task) => ({
          taskId: task.taskId,
          taskName: task.taskName,
          entryCount: task.entryCount,
          entries: task.entries,
        })),
      })),
    }));

    res.status(200).json({
      success: true,
      data: result,
      totalUsers: result.length,
      totalProjects: result.reduce(
        (sum, user) => sum + user.projects.length,
        0
      ),
      totalTasks: result.reduce(
        (sum, user) =>
          sum +
          user.projects.reduce(
            (pSum, project) => pSum + project.tasks.length,
            0
          ),
        0
      ),
      totalEntries: result.reduce(
        (sum, user) =>
          sum +
          user.projects.reduce(
            (pSum, project) => pSum + project.totalEntries,
            0
          ),
        0
      ),
    });
  } catch (error) {
    console.error("Error fetching control plan hierarchy:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch control plan hierarchy",
    });
  }
});

app.post(
  "/update-part/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, picture2, pictures2, projectsId } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      if (name) updateData.name = name; // Add name
      if (description) updateData.description = description;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      if (projectsId) {
        const projectsArray = projectsId.split(",");
        updateData.projectsId = projectsArray;
      }

      // Update the user document in the database
      const result = await db
        .collection("parts")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);
app.post(
  "/store-profession",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { project, name, indexNumber, companyId } = req.body; // Extract the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("professions").insertOne({
        project, // New field
        name, // New field
        indexNumber, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create profession" });
    }
  }
);

app.post(
  "/update-profession/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        name,
        indexNumber,
        picture2,
        pictures2, // Optional field for single file reference
      } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project; // Add project
      if (name) updateData.name = name; // Add name
      if (indexNumber) updateData.indexNumber = indexNumber;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the user document in the database
      const result = await db
        .collection("professions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);
///test
app.post(
  "/store-group",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field (no '[]' here)
  ]),
  async (req, res) => {
    try {
      const { project, type, worker, projectsId, companyId, professionId } =
        req.body; // Extract new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("groups").insertOne({
        project, // New field
        type, // New field
        worker, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  }
);

app.post(
  "/update-group/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        type,
        worker,
        picture2,
        pictures2, // Optional field for single file reference
        projectsId,

        professionId,
      } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project; // Add project
      if (type) updateData.type = type; // Add type
      if (worker) updateData.worker = worker; // Add worker
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the user document in the database
      const result = await db
        .collection("groups")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Group not found" });
      }

      res.status(200).json({ message: "Group updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update group" });
    }
  }
);
app.post(
  "/store-task",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // const {
      //   project,
      //   Index,
      //   professionGroup,
      //   Type,
      //   item,
      //   Activity,
      //   criteria,
      //   time,
      //   method,
      //   serialNumber,
      //   comment,
      //   drawing,
      //   buildingPart,
      //   projectsId,
      //   companyId,
      //   SubjectMatterId,
      //   ControlId,
      // } = req.body;

      // console.log(req.files); // Log files to inspect

      // Initialize variables for files
      // let picture = null;
      let file = null;
      // let pictures = [];

      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[0]; // Use the first sheet
        const sheetName2 = workbook.SheetNames[6]; // Use the first sheet

        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON
        let excelRows2 = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName2]); // Convert sheet to JSON

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }
        if (excelRows2.length > 50) {
          excelRows2 = excelRows2.slice(0, 50); // Limit to the first 50 rows
        }

        if (excelRows2.length > 0) {
          excelRows2 = excelRows2.map((row) => {
            if (row.EuroCode && typeof row.EuroCode === "string") {
              row.EuroCode = row.EuroCode.replace(/\s*(and|&)\s*/gi, ",")
                .split(",")
                .map((code) => code.trim())
                .filter(Boolean);
            } else if (row.EuroCode && !Array.isArray(row.EuroCode)) {
              row.EuroCode = [row.EuroCode];
            }
            return row;
          });
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("tasks").insertMany(excelRows);
        }
        if (excelRows2.length > 0) {
          await db.collection("inputs").insertMany(excelRows2);
        }
      }

      // Handle multiple pictures upload
      // if (req.files["pictures"] && req.files["pictures"].length > 0) {
      //   pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      // }

      // Insert the main task data into the database
      // const result = await db.collection("tasks").insertOne({
      //   project,
      //   Index,
      //   professionGroup,
      //   Type,
      //   item,
      //   Activity,
      //   criteria,
      //   time,
      //   method,
      //   serialNumber,
      //   comment,
      //   drawing,
      //   buildingPart,
      //   picture, // Single picture (null if not uploaded)
      //   pictures, // Array of multiple files (empty if not uploaded)
      //   projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
      //   companyId,
      //   SubjectMatterId,
      //   ControlId,
      // });

      res.status(201).json({
        message: "Task and Excel data stored successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

app.post(
  "/update-task/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        Index,
        professionGroup,
        Type,
        item,
        Activity,
        criteria,
        time,
        method,
        serialNumber,
        comment,
        drawing,
        buildingPart,
        picture2,
        pictures2,
        SubjectMatterId,
        ControlId,
        projectsId,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project;
      if (Index) updateData.Index = Index;
      if (professionGroup) updateData.professionGroup = professionGroup;
      if (Type) updateData.Type = Type;
      if (item) updateData.item = item;
      if (Activity) updateData.Activity = Activity;
      if (criteria) updateData.criteria = criteria;
      if (time) updateData.time = time;
      if (method) updateData.method = method;
      if (serialNumber) updateData.serialNumber = serialNumber;
      if (comment) updateData.comment = comment;
      if (drawing) updateData.drawing = drawing;
      if (buildingPart) updateData.buildingPart = buildingPart;
      if (projectsId) updateData.projectsId = projectsId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }
      if (SubjectMatterId) updateData.SubjectMatterId = SubjectMatterId;
      if (ControlId) updateData.ControlId = ControlId;
      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      if (projectsId) {
        const projectsArray = projectsId.split(",");
        updateData.projectsId = projectsArray;
      }

      // Update the task document in the database
      const result = await db
        .collection("tasks")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);
app.post(
  "/store-input",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { projectsId, companyId } = req.body;

      console.log(req.files); // Log files to inspect

      // Initialize variables for files

      let file = null;

      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[6]; // Use the first sheet
        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON

        // Log the parsed Excel rows
        console.log("Excel Rows:", excelRows);

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }

        if (excelRows.length > 0) {
          excelRows = excelRows.map((row) => ({
            ...row,
            projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
            companyId,
          }));
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("inputs").insertMany(excelRows);
        }
      }

      res.status(201).json({
        message: "Excel data stored successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create input" });
    }
  }
);

app.post(
  "/store-standard",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
  ]),
  async (req, res) => {
    try {
      let file = null;
      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[0]; // Use the first sheet
        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
          range: 4,
        }); // Convert sheet to JSON
        console.log(excelRows[0]);

        // Log the parsed Excel rows

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("standards").insertMany(excelRows);
        }
      }

      res.status(201).json({
        message: "Excel data stored successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create standard" });
    }
  }
);

app.post(
  "/store-deviation",
  upload.fields([
    { name: "pictures", maxCount: 50 }, // Add support for pictures field
    { name: "generalPictures", maxCount: 10 },
    { name: "markPictures", maxCount: 10 },
    { name: "annotatedImage", maxCount: 10 },
    { name: "originalPdf", maxCount: 1 },
    { name: "annotatedPdf", maxCount: 1 },
    { name: "annotatedPdfs", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log('Received deviation submission:', {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'No files',
        fileDetails: req.files ? Object.keys(req.files).map(key => ({
          field: key,
          count: req.files[key].length,
          filenames: req.files[key].map(f => f.filename)
        })) : 'No files'
      });
      
      // Validate required fields
      if (!req.body.companyId || !req.body.projectId || !req.body.type) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          required: ['companyId', 'projectId', 'type'],
          received: Object.keys(req.body)
        });
      }
      
      // Check database connection
      if (!db) {
        return res.status(500).json({ error: "Database connection not available" });
      }
      
      const {
        companyId,
        projectId,
        comment,
        profession,
        buildingParts,
        drawing,
        type,
        generalPictureDescriptions,
        markPictureDescriptions,
        markPictureIndices,
        selectedWorker,
        selectedIndependentController,
        selectedProjectManager,
      } = req.body;

      console.log('Parsing JSON fields...');
      
      let parsedBuildingParts = null;
      try {
        parsedBuildingParts = buildingParts ? JSON.parse(buildingParts) : null;
        console.log('Building parts parsed successfully');
      } catch (e) {
        console.error('Error parsing buildingParts:', e);
        return res.status(400).json({ error: 'Invalid buildingParts JSON' });
      }

      let parsedDrawing = null;
      try {
        parsedDrawing = drawing ? JSON.parse(drawing) : null;
        console.log('Drawing parsed successfully');
      } catch (e) {
        console.error('Error parsing drawing:', e);
        return res.status(400).json({ error: 'Invalid drawing JSON' });
      }

      let parsedProfession = null;
      try {
        parsedProfession = profession ? JSON.parse(profession) : null;
        console.log('Profession parsed successfully');
      } catch (e) {
        console.error('Error parsing profession:', e);
        return res.status(400).json({ error: 'Invalid profession JSON' });
      }

      let pictures = [];

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      let annotatedImage = null;
      if (
        req.files["annotatedImage"] &&
        req.files["annotatedImage"].length > 0
      ) {
        annotatedImage = req.files["annotatedImage"][0].filename;
      }

      let originalPdfFilename = null;
      if (req.files["originalPdf"] && req.files["originalPdf"].length > 0) {
        originalPdfFilename = req.files["originalPdf"][0].filename;
      }

      // Handle annotated PDF
      let annotatedPdfFilename = null;
      if (req.files["annotatedPdf"] && req.files["annotatedPdf"].length > 0) {
        annotatedPdfFilename = req.files["annotatedPdf"][0].filename;
      }

      // Handle multiple annotated PDFs
      let annotatedPdfs = [];
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        annotatedPdfs = req.files["annotatedPdfs"].map((file) => file.filename);
      }

      // Prepare data for insertion
      const deviationData = {
        companyId,
        projectsId: Array.isArray(projectId) ? projectId : [projectId], // Convert to array if it's not already an array
        type,
        comment,
        submittedDate: req.body.submittedDate || new Date().toISOString(),
        profession: parsedProfession,
        buildingParts: parsedBuildingParts,
        drawing: parsedDrawing,
        selectedWorker: selectedWorker ? (() => {
          try { return JSON.parse(selectedWorker); } catch (e) { console.error('Error parsing selectedWorker:', e); return null; }
        })() : null,
        selectedIndependentController: selectedIndependentController ? (() => {
          try { return JSON.parse(selectedIndependentController); } catch (e) { console.error('Error parsing selectedIndependentController:', e); return null; }
        })() : null,
        selectedProjectManager: selectedProjectManager ? (() => {
          try { return JSON.parse(selectedProjectManager); } catch (e) { console.error('Error parsing selectedProjectManager:', e); return null; }
        })() : null,
        pictures, // Add pictures field
        pictureDescriptions: req.body.pictureDescriptions ? (() => {
          try { return JSON.parse(req.body.pictureDescriptions); } catch (e) { console.error('Error parsing pictureDescriptions:', e); return []; }
        })() : [], // Parse JSON array
        generalPictures: [], // Fix undefined variable
        generalPictureDescriptions: generalPictureDescriptions || [],
        markPictures: [], // Fix undefined variable
        markPictureDescriptions: markPictureDescriptions || [],
        originalPdf: originalPdfFilename,
        annotatedPdf: annotatedPdfFilename,
        annotatedPdfs,
      };
      
      console.log('Attempting to insert deviation data:', deviationData);
      
      // Insert the data into the database
      const result = await db.collection("deviations").insertOne(deviationData);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating deviation:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to create deviation", 
        details: error.message,
        stack: error.stack 
      });
    }
  }
);

app.post(
  "/store-special-control",
  upload.fields([
    { name: "pictures", maxCount: 10 },
    { name: "annotatedImage", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        companyId,
        projectId,
        comment,
        profession,
        buildingParts,
        drawing,
        type,
      } = req.body;

      const parsedBuildingParts = buildingParts
        ? JSON.parse(buildingParts)
        : null;

      const parsedDrawing = drawing ? JSON.parse(drawing) : null;

      const parsedProfession = profession ? JSON.parse(profession) : null;

      let pictures = [];

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      let annotatedImage = null;
      if (
        req.files["annotatedImage"] &&
        req.files["annotatedImage"].length > 0
      ) {
        annotatedImage = req.files["annotatedImage"][0].filename;
      }

      // Insert the data into the database
      const result = await db.collection("specialcontrol").insertOne({
        companyId,
        projectsId: Array.isArray(projectId) ? projectId : [projectId], // Convert to array if it's not already an array
        type,
        comment,
        profession: parsedProfession,
        buildingParts: parsedBuildingParts,
        drawing: parsedDrawing,
        pictures,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create deviation" });
    }
  }
);

app.post(
  "/update-deviation/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        serialNumber,
        comment,
        picture2,
        pictures2,
        profession,
        projectsId,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (serialNumber) updateData.serialNumber = serialNumber;
      if (comment) updateData.comment = comment;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the deviation document in the database
      const result = await db
        .collection("deviations")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Deviation not found" });
      }

      res
        .status(200)
        .json({ message: "Deviation updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update deviation" });
    }
  }
);

app.post(
  "/store-company",
  upload.fields([{ name: "picture", maxCount: 1 }]),
  async (req, res) => {
    try {
      // Destructure all your expected fields from req.body
      const {
        name,

        phone,
        address,

        email,
        city,
        cvr,
        postalCode,
        companyPhone,
      } = req.body;

      console.log("Files:", req.files); // Log files to inspect

      // Handle single picture upload (logo)
      let picture = null;
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename;
      }

      // Prepare company document
      const companyData = {
        name,

        phone,
        address,

        email,
        city,
        cvr,
        postalCode,
        companyPhone,
        picture,

        status: "activate",
        createdAt: new Date(),
      };

      // Insert into DB
      const result = await db.collection("companies").insertOne(companyData);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create company" });
    }
  }
);

app.post(
  "/update-company/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, casenr, phone, address, contactPerson } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (casenr) updateData.casenr = casenr;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (contactPerson) updateData.contactPerson = contactPerson;

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the deviation document in the database
      const result = await db
        .collection("companies")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.status(200).json({ message: "Company updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update company" });
    }
  }
);

app.post(
  "/store-check",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        receiveDate,
        note,
        approvedDate,
        projectsId,
        companyId,
        professionId,
      } = req.body; // Receive the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("checks").insertOne({
        name, // Add the name
        receiveDate, // Add the receiveDate
        note, // Add the note
        approvedDate, // Add the approvedDate
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
        createdAt: new Date(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-check/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        receiveDate,
        note,
        approvedDate,
        picture2,
        pictures2,
        professionId,
        projectsId,
      } = req.body; // Receive new fields
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (receiveDate) updateData.receiveDate = receiveDate;
      if (note) updateData.note = note;
      if (approvedDate) updateData.approvedDate = approvedDate;

      if (professionId) updateData.professionId = professionId;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("checks")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-control",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the fields you specified
      const {
        euroCode,
        independent,
        b222x,
        b322x,
        a5x,
        specialText,
        exc,
        cc,
        controllerT,
        controllerD,
        independentController,
        projectsId,
        companyId,
        professionId,
      } = req.body;

      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("controls").insertOne({
        euroCode, // Add the euroCode field
        independent, // Add the independent field
        b222x, // Add the b222x field
        b322x, // Add the b322x field
        a5x, // Add the a5x field
        specialText, // Add the specialText field
        exc, // Add the exc field
        cc, // Add the cc field
        controllerT, // Add the controllerT field
        controllerD, // Add the controllerD field
        independentController, // Add the independentController field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-control/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the fields you specified
      const {
        euroCode,
        independent,
        b222x,
        b322x,
        a5x,
        specialText,
        exc,
        cc,
        controllerT,
        controllerD,
        independentController,
        picture2,
        pictures2,
        professionId,
        projectsId,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (euroCode) updateData.euroCode = euroCode;
      if (independent) updateData.independent = independent;
      if (b222x) updateData.b222x = b222x;
      if (b322x) updateData.b322x = b322x;
      if (a5x) updateData.a5x = a5x;
      if (specialText) updateData.specialText = specialText;
      if (exc) updateData.exc = exc;
      if (cc) updateData.cc = cc;
      if (controllerT) updateData.controllerT = controllerT;
      if (controllerD) updateData.controllerD = controllerD;
      if (independentController)
        updateData.independentController = independentController;
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("controls")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post("/store-description", async (req, res) => {
  try {
    // Receive the new fields: desc1 and desc2
    const {
      desc1,
      desc2,
      desc3,
      foundationDocumentDescription,
      productionPreparation,
      weatherIssues,
      descriptionOfControlledWork,
      aliqRelationship,
    } = req.body;

    const result = await db.collection("descriptions").insertOne({
      desc1,
      desc2,
      desc3,
      foundationDocumentDescription,
      productionPreparation,
      weatherIssues,
      descriptionOfControlledWork,
      aliqRelationship,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.post(
  "/update-description/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { desc1, desc2, picture2, pictures2 } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (desc1) updateData.desc1 = desc1;
      if (desc2) updateData.desc2 = desc2;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the task document in the database
      const result = await db
        .collection("descriptions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-item",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1 and desc2
      const { name } = req.body;
      console.log(name);

      // Insert the data into the database
      const result = await db.collection("items").insertOne({
        name,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  }
);
app.post(
  "/store-level",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1 and desc2
      const { name } = req.body;
      console.log(req.files); // Log files to inspect

      // Insert the data into the database
      const result = await db.collection("levels").insertOne({
        name,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create level" });
    }
  }
);

app.post(
  "/update-item/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { name } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      // Update the task document in the database
      const result = await db
        .collection("items")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "item not found" });
      }

      res.status(200).json({ message: "item updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update item" });
    }
  }
);
app.post(
  "/update-level/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { name } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      // Update the task document in the database
      const result = await db
        .collection("levels")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "level not found" });
      }

      res.status(200).json({ message: "level updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update level" });
    }
  }
);

app.post(
  "/store-draw",
  upload.fields([
    { name: "mainDrawings", maxCount: 50 }, // Main drawings
    { name: "childDrawings", maxCount: 200 }, // Child drawings
  ]),
  async (req, res) => {
    try {
      const { companyId, projectsId, mainDrawingGroups } = req.body;
      const mainFiles = req.files["mainDrawings"] || [];
      const childFiles = req.files["childDrawings"] || [];

      // Parse the mainDrawingGroups to understand the structure
      const groups = JSON.parse(mainDrawingGroups || '[]');
      
      // Create the drawings array to store all drawing groups
      const drawings = [];

      // Process each main drawing group
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const mainDrawingIndex = group.mainIndex;
        const childIndices = group.childIndices || [];
        
        // Get the main drawing file
        const mainFile = mainFiles[mainDrawingIndex];
        if (!mainFile) continue;

        // Create main drawing object
        const mainDrawing = {
          stored: mainFile.filename,
          original: mainFile.originalname,
          uploadedAt: new Date(),
        };

        // Get associated child drawings
        const childDrawings = childIndices.map(childIndex => {
          const childFile = childFiles[childIndex];
          if (!childFile) return null;
          
          return {
            stored: childFile.filename,
            original: childFile.originalname,
            parentMainIndex: mainDrawingIndex,
            uploadedAt: new Date(),
          };
        }).filter(child => child !== null);

        // Create drawing group
        const drawingGroup = {
          mainDrawing,
          childDrawings,
          createdAt: new Date(),
        };

        drawings.push(drawingGroup);
      }

      // Insert all drawing groups into the database
      const results = [];
      for (const drawingGroup of drawings) {
        const result = await db.collection("draws").insertOne({
          companyId,
          projectsId,
          mainDrawings: [drawingGroup.mainDrawing],
          childDrawings: drawingGroup.childDrawings,
          createdAt: drawingGroup.createdAt,
        });
        results.push(result.insertedId);
      }

      res.status(201).json({ 
        message: "Upload successful", 
        insertedIds: results,
        totalDrawings: drawings.length 
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to store drawings" });
    }
  }
);

app.post(
  "/update-draw/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        name,
        type,
        description,
        plan,
        checkbox,
        date,
        updatedDate,
        picture2,
        pictures2,
        planId,
        projectsId,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (description) updateData.description = description;
      if (plan) updateData.plan = plan;
      if (checkbox !== undefined) updateData.checkbox = checkbox; // Ensure checkbox is added correctly
      if (date) updateData.date = date;
      if (updatedDate) updateData.updatedDate = updatedDate;
      if (planId) updateData.planId = planId;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("draws")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post("/store-gamma", upload.single("picture"), async (req, res) => {
  try {
    // Receive the new fields - use req.fields for multipart form data
    const {
      profession,
      item,
      independentController,
      x,
      text,
      exc,
      cc,
      name,
      email,
      projectsId,
      companyId,
    } = req.fields || req.body; // Handle both multipart and JSON

    const parsedProfessions =
      typeof profession === "string" ? JSON.parse(profession) : profession;

    // Only parse independentController if it exists (not null/undefined)
    let parsedIndependentController = null;
    if (independentController) {
      parsedIndependentController =
        typeof independentController === "string"
          ? JSON.parse(independentController)
          : independentController;
    }

    const picture = req.file ? req.file.filename : null;

    // Build the document object, only including fields that exist
    const documentToInsert = {
      profession: parsedProfessions,
      item,
      x,
      text,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      companyId,
      picture,
    };

    // Only add optional fields if they exist and are not empty
    if (parsedIndependentController) {
      documentToInsert.independentController = parsedIndependentController;
    }
    if (exc && exc.trim() !== '') {
      documentToInsert.exc = exc;
    }
    if (cc && cc.trim() !== '') {
      documentToInsert.cc = cc;
    }
    if (name && name.trim() !== '') {
      documentToInsert.name = name;
    }
    if (email && email.trim() !== '') {
      documentToInsert.email = email;
    }

    // Insert the data into the database
    const result = await db.collection("gammas").insertOne(documentToInsert);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create gamma" });
  }
});
app.post(
  "/update-gamma/:id",
  upload.single("picture"), // Handles a single file upload with the field name "picture"
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        profession,
        item,
        independentD,
        x,
        text,
        exc,
        cc,
        name,
        email,
        picture2,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;
      if (item) updateData.item = item;
      if (independentD) updateData.independentD = independentD;
      if (x) updateData.x = x;
      if (text) updateData.text = text;
      if (exc) updateData.exc = exc;
      if (cc) updateData.cc = cc;
      if (cc) updateData.name = name;
      if (cc) updateData.email = email;

      updateData.picture = picture2;
      // If an image is uploaded, include its path in the update
      if (req.file) {
        updateData.picture = req.file.filename; // Store only the filename in the database
      }

      // Update the task document in the database
      const result = await db
        .collection("gammas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "gamma not found" });
      }

      res.status(200).json({ message: "gamma updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update gamma" });
    }
  }
);

app.post(
  "/store-mention",
  upload.fields([
    { name: "pictures", maxCount: 10 },
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 },
    { name: "markPictures", maxCount: 50 }, // Add mark pictures field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        projectManager,
        recipients,
        drawing,
        projectsId,
        companyId,
        comment,
        pictureDescriptions,
        profession,
        buildingPart,
        selectedWorkers,
        markDescriptions,
      } = req.body;

      let pictures = [];
      let pictureDescs = [];
      let annotatedPdfs = [];
      let annotatedPdfImages = [];
      let markPictures = [];
      let markDescs = [];

      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files

        if (pictureDescriptions) {
          if (!Array.isArray(pictureDescriptions)) {
            pictureDescs = [pictureDescriptions];
          } else {
            pictureDescs = pictureDescriptions;
          }
        }
      }

      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        annotatedPdfs = req.files["annotatedPdfs"].map((file) => ({
          originalName: file.originalname,
          filename: file.filename,
        }));
      }

      if (req.files["annotatedPdfImages"] && req.files["annotatedPdfImages"].length > 0) {
        annotatedPdfImages = req.files["annotatedPdfImages"].map((file) => ({
          originalName: file.originalname,
          filename: file.filename,
        }));
      }

      // Handle mark pictures and descriptions
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        markPictures = req.files["markPictures"].map((file) => file.filename);
        
        if (markDescriptions) {
          if (!Array.isArray(markDescriptions)) {
            markDescs = [markDescriptions];
          } else {
            markDescs = markDescriptions;
          }
        }
      }

      const pictureObjects = pictures.map((filename, index) => ({
        filename,
        description: pictureDescs[index] || "",
      }));

      const markPictureObjects = markPictures.map((filename, index) => ({
        filename,
        description: markDescs[index] || "",
      }));

      // Convert PDFs to PNGs for store-mention endpoint
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        for (const file of req.files["annotatedPdfs"]) {
          try {
            const pdfPath = path.join(__dirname, "uploads", file.filename);
            const outputDir = path.join(__dirname, "uploads");
            const pngFilename = await convertPdfToPng(pdfPath, outputDir);
            
            if (pngFilename) {
              annotatedPdfImages.push({
                originalName: file.originalname.replace('.pdf', '.png'),
                filename: pngFilename,
              });
              console.log(`Converted PDF ${file.filename} to PNG ${pngFilename}`);
            }
          } catch (error) {
            console.error(`Error converting PDF ${file.filename} to PNG:`, error);
          }
        }
      }

      const parsedDrawing = drawing ? (typeof drawing === 'string' ? JSON.parse(drawing) : drawing) : null;
      const parsedProjectManager = projectManager
        ? (typeof projectManager === 'string' ? JSON.parse(projectManager) : projectManager)
        : null;

      const parsedRecipients = recipients ? (typeof recipients === 'string' ? JSON.parse(recipients) : recipients) : null;
      const parsedProfession = profession ? (typeof profession === 'string' ? JSON.parse(profession) : profession) : null;
      const parsedBuildingPart = buildingPart ? (typeof buildingPart === 'string' ? JSON.parse(buildingPart) : buildingPart) : null;
      const parsedSelectedWorkers = selectedWorkers ? (typeof selectedWorkers === 'string' ? JSON.parse(selectedWorkers) : selectedWorkers) : null;

      // Insert the data into the database
      const result = await db.collection("mentions").insertOne({
        item,
        recipients: parsedRecipients,
        drawing: parsedDrawing,
        projectManager: parsedProjectManager,
        pictureObjects,
        annotatedPdfs,
        annotatedPdfImages, // Add the converted PNG images
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        comment,
        profession: parsedProfession,
        buildingPart: parsedBuildingPart,
        selectedWorkers: parsedSelectedWorkers,
        markPictureObjects,
        created_at: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create mention" });
    }
  }
);

app.post(
  "/update-mention/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("mentions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-new",
  upload.fields([
    { name: "pictures", maxCount: 10 },
    { name: "annotatedImage", maxCount: 10 },
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 },
    { name: "markPictures", maxCount: 50 }, // Add mark pictures field
  ]),
  async (req, res) => {
    try {
      const {
        supplementory,
        time,
        item,
        projectManager,
        recipients,
        projectsId,
        companyId,
        drawing,
        pictureDescriptions,
        profession,
        buildingPart,
        selectedWorkers,
        markDescriptions,
      } = req.body;

      let annotatedImage = null;
      let pictures = [];
      let pictureDescs = [];
      let annotatedPdfs = [];
      let annotatedPdfImages = [];
      let markPictures = [];
      let markDescs = [];

      if (
        req.files["annotatedImage"] &&
        req.files["annotatedImage"].length > 0
      ) {
        annotatedImage = req.files["annotatedImage"][0].filename;
      }

      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename);

        if (pictureDescriptions) {
          if (!Array.isArray(pictureDescriptions)) {
            pictureDescs = [pictureDescriptions];
          } else {
            pictureDescs = pictureDescriptions;
          }
        }
      }

      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        annotatedPdfs = req.files["annotatedPdfs"].map((file) => ({
          originalName: file.originalname,
          filename: file.filename,
        }));
      }

      if (req.files["annotatedPdfImages"] && req.files["annotatedPdfImages"].length > 0) {
        annotatedPdfImages = req.files["annotatedPdfImages"].map((file) => ({
          originalName: file.originalname,
          filename: file.filename,
        }));
      }

      // Handle mark pictures and descriptions
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        markPictures = req.files["markPictures"].map((file) => file.filename);
        
        if (markDescriptions) {
          if (!Array.isArray(markDescriptions)) {
            markDescs = [markDescriptions];
          } else {
            markDescs = markDescriptions;
          }
        }
      }

      const pictureObjects = pictures.map((filename, index) => ({
        filename,
        description: pictureDescs[index] || "",
      }));

      const markPictureObjects = markPictures.map((filename, index) => ({
        filename,
        description: markDescs[index] || "",
      }));

      const parsedDrawing = drawing ? JSON.parse(drawing) : null;
      const parsedProjectManager = projectManager
        ? JSON.parse(projectManager)
        : null;

      const parsedRecipients = recipients ? JSON.parse(recipients) : null;
      const parsedProfession = profession ? JSON.parse(profession) : null;
      const parsedBuildingPart = buildingPart ? JSON.parse(buildingPart) : null;
      const parsedSelectedWorkers = selectedWorkers ? JSON.parse(selectedWorkers) : null;

      // Insert the data into the database
      const result = await db.collection("news").insertOne({
        supplementory,
        time,
        item,
        projectManager: parsedProjectManager,
        recipients: parsedRecipients,
        companyId,
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
        annotatedImage,
        drawing: parsedDrawing,
        pictureObjects,
        annotatedPdfs,
        annotatedPdfImages, // Add the converted PNG images
        profession: parsedProfession,
        buildingPart: parsedBuildingPart,
        selectedWorkers: parsedSelectedWorkers,
        markPictureObjects,
        created_at: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create agreement" });
    }
  }
);

app.post(
  "/update-new/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        supplementory,
        time,
        discipline,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (supplementory) updateData.supplementory = supplementory;
      if (time) updateData.time = time;
      if (discipline) updateData.discipline = discipline;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("news")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-note",
  upload.fields([
    { name: "pictures", maxCount: 10 },
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 },
    { name: "markPictures", maxCount: 50 }, // Add mark pictures field
  ]),
  async (req, res) => {
    try {
      const {
        companyId,
        projectsId,
        item,
        projectUsers,
        drawing,
        projectManager,
        comment,
        pictureDescriptions,
        profession,
        buildingPart,
        selectedWorkers,
        markDescriptions,
      } = req.body;
      let pictures = [];
      let pictureDescs = [];
      let annotatedPdfs = [];
      let annotatedPdfImages = [];
      let markPictures = [];
      let markDescs = [];

      const parsedDrawing = drawing ? JSON.parse(drawing) : null;
      const parsedProjectUsers = projectUsers ? JSON.parse(projectUsers) : null;
      const parsedProjectManager = projectManager
        ? JSON.parse(projectManager)
        : null;
      const parsedProfession = profession ? JSON.parse(profession) : null;
      const parsedBuildingPart = buildingPart ? JSON.parse(buildingPart) : null;
      const parsedSelectedWorkers = selectedWorkers ? JSON.parse(selectedWorkers) : null;

      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename);

        if (pictureDescriptions) {
          if (!Array.isArray(pictureDescriptions)) {
            pictureDescs = [pictureDescriptions];
          } else {
            pictureDescs = pictureDescriptions;
          }
        }
      }

      // Handle annotated PDFs and convert to PNG images
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        for (const file of req.files["annotatedPdfs"]) {
          const pdfInfo = {
          filename: file.filename,
            originalName: file.originalname,
          };
          annotatedPdfs.push(pdfInfo);
          
          // Convert PDF to PNG
          try {
            const pdfPath = path.join(__dirname, "uploads", file.filename);
            const outputDir = path.join(__dirname, "uploads");
            const pngFilename = await convertPdfToPng(pdfPath, outputDir);
            
            if (pngFilename) {
              annotatedPdfImages.push({
                filename: pngFilename,
                originalName: file.originalname.replace('.pdf', '.png'),
                sourcePdf: file.filename
              });
              console.log(`Converted PDF ${file.filename} to PNG ${pngFilename}`);
            }
          } catch (error) {
            console.error(`Error converting PDF ${file.filename} to PNG:`, error);
          }
        }
      }

      // Handle mark pictures and descriptions
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        markPictures = req.files["markPictures"].map((file) => file.filename);
        
        if (markDescriptions) {
          if (!Array.isArray(markDescriptions)) {
            markDescs = [markDescriptions];
          } else {
            markDescs = markDescriptions;
          }
        }
      }

      const pictureObjects = pictures.map((filename, index) => ({
        filename,
        description: pictureDescs[index] || "",
      }));

      const markPictureObjects = markPictures.map((filename, index) => ({
        filename,
        description: markDescs[index] || "",
      }));

      // Insert the data into the database
      const result = await db.collection("notes").insertOne({
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
        companyId,
        item,
        users: parsedProjectUsers,
        projectManager: parsedProjectManager,
        drawing: parsedDrawing,
        pictureObjects,
        annotatedPdfs,
        annotatedPdfImages, // Add the converted PNG images
        comment,
        profession: parsedProfession,
        buildingPart: parsedBuildingPart,
        selectedWorkers: parsedSelectedWorkers,
        markPictureObjects,
        created_at: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  }
);

app.post(
  "/update-note/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;
      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("notes")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post("/store-plan", async (req, res) => {
  try {
    const { name, description, projectsId, companyId, drawIds } = req.body;

    if (!name || !companyId || !projectsId || !Array.isArray(drawIds)) {
      return res
        .status(400)
        .json({ error: "Missing required fields or invalid drawIds format" });
    }

    const result = await db.collection("plans").insertOne({
      name,
      description,
      companyId,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      drawIds,
      createdAt: new Date(),
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ error: "Failed to create plan" });
  }
});

app.post(
  "/update-plan/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, picture2, pictures2, projectsId } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name; // Add 'name' field
      if (description) updateData.description = description;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the plan document in the database
      const result = await db
        .collection("plans")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Plan not found" });
      }

      res.status(200).json({ message: "Plan updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  }
);

const isObjectNotEmpty = (obj) =>
  obj &&
  Object.keys(obj).length > 0 &&
  Object.values(obj).some(
    (v) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0)
  );

app.post(
  "/add-project",
  upload.fields([
    { name: "addDrawingPictures", maxCount: 10 },
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
        typeof professions === "string" ? JSON.parse(professions) : professions;

      const parsedAddUsers =
        typeof addUsers === "string" ? JSON.parse(addUsers) : addUsers;

      const parsedAddDrawing =
        typeof addDrawing === "string" ? JSON.parse(addDrawing) : addDrawing;

      const parsedPlan = typeof plan === "string" ? JSON.parse(plan) : plan;

      const parsedCertificateSchema =
        typeof certificateSchema === "string"
          ? JSON.parse(certificateSchema)
          : certificateSchema;

      // Safely handle file uploads - check if req.files exists and has the expected arrays
      const addDrawingPictures = req.files && req.files["addDrawingPictures"] 
        ? req.files["addDrawingPictures"].map((file) => file.filename) 
        : [];
      const planPictures = req.files && req.files["planPictures"] 
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

app.post(
  "/store-project",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, address, postCode, city, startDate, companyId } = req.body; // Use the new fields instead of 'username'
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("projects").insertOne({
        name, // Use 'name' instead of 'username'
        address,
        postCode,
        city,
        startDate,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  }
);
app.post(
  "/update-project/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        address,
        postCode,
        city,
        startDate,
        picture2,
        pictures2, // Optional field for single file reference
      } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name; // Add 'name' field
      if (address) updateData.address = address; // Add 'address' field
      if (postCode) updateData.postCode = postCode; // Add 'postCode' field
      if (city) updateData.city = city; // Add 'city' field
      if (startDate) updateData.startDate = startDate; // Add 'startDate' field
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the project document in the database
      const result = await db
        .collection("projects")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.status(200).json({ message: "Project updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update project" });
    }
  }
);

app.post(
  "/store-request",
  upload.fields([
    { name: "annotatedPdfs", maxCount: 10 },
    { name: "annotatedPdfImages", maxCount: 10 },
    { name: "pictures", maxCount: 10 },
    { name: "markPictures", maxCount: 50 }, // Add mark pictures field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        projectManager,
        projectUsers,
        drawing,
        projectsId,
        companyId,
        pictureDescriptions,
        profession,
        buildingPart,
        selectedWorkers,
        markDescriptions,
      } = req.body;

      let pictures = [];
      let pictureObjects = [];
      let annotatedPdfImages = [];
      let markPictures = [];
      let markDescs = [];

      // Handle multiple pictures upload with descriptions
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // For backward compatibility

        // Create picture objects with descriptions
        const descriptions = Array.isArray(pictureDescriptions)
          ? pictureDescriptions
          : [pictureDescriptions];

        pictureObjects = req.files["pictures"].map((file, index) => ({
          filename: file.filename,
          description: descriptions[index] || "",
          originalName: file.originalname,
        }));
      }

      // Handle mark pictures and descriptions
      if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
        markPictures = req.files["markPictures"].map((file) => file.filename);
        
        if (markDescriptions) {
          if (!Array.isArray(markDescriptions)) {
            markDescs = [markDescriptions];
          } else {
            markDescs = markDescriptions;
          }
        }
      }

      let annotatedPdfs = [];

      // Handle annotated PDFs and convert to PNG images
      if (req.files["annotatedPdfs"] && req.files["annotatedPdfs"].length > 0) {
        for (const file of req.files["annotatedPdfs"]) {
          const pdfInfo = {
          filename: file.filename,
          originalName: file.originalname,
          };
          annotatedPdfs.push(pdfInfo);
          
          // Convert PDF to PNG
          try {
            const pdfPath = path.join(__dirname, "uploads", file.filename);
            const outputDir = path.join(__dirname, "uploads");
            const pngFilename = await convertPdfToPng(pdfPath, outputDir);
            
            if (pngFilename) {
              annotatedPdfImages.push({
                filename: pngFilename,
                originalName: file.originalname.replace('.pdf', '.png'),
                sourcePdf: file.filename
              });
              console.log(`Converted PDF ${file.filename} to PNG ${pngFilename}`);
            }
          } catch (error) {
            console.error(`Error converting PDF ${file.filename} to PNG:`, error);
          }
        }
      }

      // Handle annotatedPdfImages sent from frontend
      if (req.files["annotatedPdfImages"] && req.files["annotatedPdfImages"].length > 0) {
        annotatedPdfImages = req.files["annotatedPdfImages"].map((file) => ({
          originalName: file.originalname,
          filename: file.filename,
        }));
      }

      const markPictureObjects = markPictures.map((filename, index) => ({
        filename,
        description: markDescs[index] || "",
      }));

      const parsedDrawing = drawing ? JSON.parse(drawing) : null;
      const parsedProjectManager = projectManager
        ? JSON.parse(projectManager)
        : null;

      const parsedRecipients = projectUsers ? JSON.parse(projectUsers) : null;
      const parsedProfession = profession ? JSON.parse(profession) : null;
      const parsedBuildingPart = buildingPart ? JSON.parse(buildingPart) : null;
      const parsedSelectedWorkers = selectedWorkers ? JSON.parse(selectedWorkers) : null;

      // Insert the data into the database
      const result = await db.collection("requests").insertOne({
        item,
        recipients: parsedRecipients,
        drawing: parsedDrawing,
        projectManager: parsedProjectManager,
        pictures, // Keep for backward compatibility
        pictureObjects, // New field with descriptions
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        annotatedPdfs, // Replace annotatedImage with annotatedPdfs array
        annotatedPdfImages, // Add the converted PNG images
        profession: parsedProfession,
        buildingPart: parsedBuildingPart,
        selectedWorkers: parsedSelectedWorkers,
        markPictureObjects,
        created_at: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  }
);

app.post(
  "/update-request/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("requests")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post("/store-scheme", upload.none(), async (req, res) => {
  const { item, level, startDate, projectsId, companyId } = req.body;

  const result = await db.collection("schemes").insertOne({
    item,
    level,
    startDate,
    projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
    companyId,
  });

  res.status(201).json(result);
});

app.post(
  "/update-scheme/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { item, level, startDate, picture2, pictures2, projectsId } =
        req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item; // Add 'item' field
      if (level) updateData.level = level; // Add 'level' field
      if (startDate) updateData.startDate = startDate;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the scheme document in the database
      const result = await db
        .collection("schemes")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      res.status(200).json({ message: "Scheme updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update scheme" });
    }
  }
);
app.post(
  "/store-static",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { activity, controlPlan, items, projectsId, professionId } =
        req.body; // Replace 'username' with the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("statics").insertOne({
        activity, // New field
        controlPlan, // New field
        items, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create static entry" });
    }
  }
);
app.post(
  "/update-static/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        activity,
        controlPlan,
        items,
        picture2,
        pictures2, // Optional field for single file reference
        projectsId,
        professionId,
      } = req.body;

      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (activity) updateData.activity = activity; // Add 'activity' field
      if (controlPlan) updateData.controlPlan = controlPlan; // Add 'controlPlan' field
      if (items) updateData.items = items; // Add 'ite
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Split by comma
        updateData.pictures = picturesArray;
      }
      //
      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the static document in the database
      const result = await db
        .collection("statics")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Static entry not found" });
      }

      res
        .status(200)
        .json({ message: "Static entry updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update static entry" });
    }
  }
);
app.post(
  "/store-super",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        title,
        what,
        when,
        where,
        scope,
        executedDate,
        projectsId,
        companyId,
        profession,
        professionObject,
        users,
      } = req.body; // Replace 'username' with the new fields
      console.log('Request body:', req.body); // Log the entire request body
      console.log('Profession:', profession);
      console.log('Profession Object:', professionObject);
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Parse professionObject if it's a string
      let parsedProfessionObject = null;
      if (professionObject) {
        try {
          parsedProfessionObject = typeof professionObject === 'string' ? JSON.parse(professionObject) : professionObject;
        } catch (e) {
          console.error('Error parsing professionObject:', e);
        }
      }

      // Insert the data into the database
      const result = await db.collection("supers").insertOne({
        title, // New field
        what, // New field
        when, // New field
        scope: scope || 100, // Default to 100 if not provided
        executedDate, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        professionObject: parsedProfessionObject, // Store parsed profession object
        where,
        users: users ? users.split(",") : [],
        createdAt: new Date(),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create super entry" });
    }
  }
);
app.post(
  "/update-super/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        title,
        what,
        when,
        scope,
        executedDate,
        picture2,
        pictures2,
        profession,
        professionObject,
        projectsId,
        where,
        users,
      } = req.body;

      console.log(pictures2);

      const updateData = {};
      //
      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Dynamically add provided fields to updateData
      if (title) updateData.title = title; // Add 'title' field
      if (what) updateData.what = what; // Add 'what' field
      if (when) updateData.when = when; // Add 'when' field
      if (where) updateData.where = where;
      if (scope) updateData.scope = scope; // Add 'scope' field
      if (executedDate) updateData.executedDate = executedDate; // Add 'executedDate' field

      if (profession) updateData.profession = profession;
      if (professionObject) {
        try {
          const parsedProfessionObject = typeof professionObject === 'string' ? JSON.parse(professionObject) : professionObject;
          updateData.professionObject = parsedProfessionObject;
        } catch (e) {
          console.error('Error parsing professionObject in update:', e);
        }
      }
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Split by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the super document in the database
      const result = await db
        .collection("supers")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Super entry not found" });
      }

      res
        .status(200)
        .json({ message: "Super entry updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update super entry" });
    }
  }
);

app.get("/get-profession-row/:id/:projectId", async (req, res) => {
  try {
    const { id, projectId } = req.params;
    // Assuming that the profession is stored in the 'inputs' collection
    const doc = await db
      .collection("inputs")
      .findOne({ SubjectMatterId: id, projectsId: { $in: [projectId] } });
    if (!doc) {
      return res.status(404).json({ message: "Profession not found" });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get rows based on selected B value
app.get("/get-rows-by-b/:bValue/:projectId", async (req, res) => {
  try {
    const { bValue, projectId } = req.params;
    // Replace 'rows' with your actual collection name and adjust query
    const rows = await db
      .collection("standards")
      .find({
        DS_GroupId: bValue,
        projectsId: { $in: [projectId] }, // Checks if projectId is in the projectsId array
      })
      .toArray();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to store the new Alpha document
// Using multer to handle file uploads if needed (adjust fields and file handling as necessary)
app.post("/store-alpha", upload.none(), async (req, res) => {
  try {
    // Access fields from req.body (if files, you might use upload.single('file') etc.)
    const {
      profession,
      euroCode,
      bValue,
      standardsIds, // May be an array of values
      control,
      status,
      date,
      comment,
      companyId,
      projectsId,
    } = req.body;

    // Create your new document (adjust fields as needed)
    const newAlpha = {
      profession,
      euroCode,
      bValue,
      standardsIds: Array.isArray(standardsIds) ? standardsIds : [standardsIds],
      control,
      status,
      date,
      comment,
      companyId,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      createdAt: new Date(),
    };

    // Insert the document into a collection, e.g., 'alphas'
    const result = await db.collection("alphas").insertOne(newAlpha);
    res.json({ message: "Alpha stored successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/store-beta", upload.none(), async (req, res) => {
  try {
    // Access fields from req.body (if files, you might use upload.single('file') etc.)
    const {
      profession,

      bValue,
      standardsIds, // May be an array of values
      buildingPart,
      status,
      drawing,
      comment,
      companyId,
      projectsId,
    } = req.body;

    // Create your new document (adjust fields as needed)
    const newBeta = {
      profession,

      bValue,
      standardsIds: Array.isArray(standardsIds) ? standardsIds : [standardsIds],
      buildingPart,
      status,
      drawing,
      comment,
      companyId,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      createdAt: new Date(),
    };

    // Insert the document into a collection, e.g., 'alphas'
    const result = await db.collection("betas").insertOne(newBeta);
    res.json({ message: "Beta stored successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post(
  "/update-alpha/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        profession,
        bValue,
        standardsIds, // May be an array of values
        control,
        status,
        date,
        comment,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;

      if (bValue) updateData.bValue = bValue;
      if (standardsIds)
        updateData.standardsIds = Array.isArray(standardsIds)
          ? standardsIds
          : [standardsIds];

      if (control) updateData.control = control;
      if (status) updateData.status = status;
      if (date) updateData.date = date;
      if (comment) updateData.comment = comment;

      // Update the task document in the database
      const result = await db
        .collection("alphas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);
app.post(
  "/update-beta/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        profession,
        bValue,
        standardsIds, // May be an array of values
        buildingPart,
        status,
        drawing,
        comment,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;

      if (bValue) updateData.bValue = bValue;
      if (standardsIds)
        updateData.standardsIds = Array.isArray(standardsIds)
          ? standardsIds
          : [standardsIds];

      if (buildingPart) updateData.buildingPart = buildingPart;
      if (status) updateData.status = status;
      if (drawing) updateData.drawing = drawing;
      if (comment) updateData.comment = comment;

      // Update the task document in the database
      const result = await db
        .collection("betas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Beta not found" });
      }

      res.status(200).json({ message: "Beta updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update beta" });
    }
  }
);
app.get("/get-alphas", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;

    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    console.log(query);
    const parts = await db.collection("alphas").find(query).toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alphas" });
  }
});
app.get("/get-betas", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const parts = await db.collection("betas").find(query).toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch betas" });
  }
});
app.get("/get-alpha-detail/:id", async (req, res) => {
  try {
    // First, find the alpha document
    const alpha = await db
      .collection("alphas")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!alpha) {
      return res.status(404).json({ error: "Alpha not found" });
    }

    // Check if standardIds exists and is an array
    if (
      alpha.standardsIds &&
      Array.isArray(alpha.standardsIds) &&
      alpha.standardsIds.length > 0
    ) {
      // Convert each id to ObjectId if necessary.
      const standardObjectIds = alpha.standardsIds.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
      // Fetch all standards documents where _id is in the standardObjectIds array.
      const standards = await db
        .collection("standards")
        .find({ _id: { $in: standardObjectIds } })
        .toArray();

      // Attach the standards records to the alpha document as rowsData.
      alpha.rowsData = standards;
    } else {
      alpha.rowsData = [];
    }

    res.status(200).json(alpha);
  } catch (error) {
    console.error("Error fetching alpha detail:", error);
    res.status(500).json({ error: "Failed to fetch alpha" });
  }
});
app.get("/get-beta-detail/:id", async (req, res) => {
  try {
    // First, find the alpha document
    const alpha = await db
      .collection("betas")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!alpha) {
      return res.status(404).json({ error: "Beta not found" });
    }

    // Check if standardIds exists and is an array
    if (
      alpha.standardsIds &&
      Array.isArray(alpha.standardsIds) &&
      alpha.standardsIds.length > 0
    ) {
      // Convert each id to ObjectId if necessary.
      const standardObjectIds = alpha.standardsIds.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
      // Fetch all standards documents where _id is in the standardObjectIds array.
      const standards = await db
        .collection("standards")
        .find({ _id: { $in: standardObjectIds } })
        .toArray();

      // Attach the standards records to the alpha document as rowsData.
      alpha.rowsData = standards;
    } else {
      alpha.rowsData = [];
    }

    res.status(200).json(alpha);
  } catch (error) {
    console.error("Error fetching beta detail:", error);
    res.status(500).json({ error: "Failed to fetch beta" });
  }
});
app.post(
  "/delete-alpha/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("alphas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "alpha not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alpha" });
    }
  }
);
app.post(
  "/delete-beta/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("betas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "beta not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete beta" });
    }
  }
);

// Activation endpoint: now uses selectedCompany and checkId
app.post("/api/activate-check", async (req, res) => {
  const { selectedCompany, checkId, selectedProjects } = req.body;
  if (!selectedCompany || !checkId || !selectedProjects) {
    return res
      .status(400)
      .json({ error: "selectedCompany and checkId required" });
  }
  try {
    // Prevent duplicate activation
    const existing = await db
      .collection("user_checks")
      .findOne({ selectedCompany, checkId, selectedProjects });
    if (existing) {
      return res.status(400).json({ error: "Check already activated" });
    }
    const result = await db
      .collection("user_checks")
      .insertOne({ selectedCompany, checkId, selectedProjects });
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deactivation endpoint: remove document with selectedCompany and checkId
app.post("/api/deactivate-check", async (req, res) => {
  const { selectedCompany, checkId, selectedProjects } = req.body;
  if (!selectedCompany || !checkId) {
    return res
      .status(400)
      .json({ error: "selectedCompany and checkId required" });
  }
  try {
    const result = await db
      .collection("user_checks")
      .deleteOne({ selectedCompany, checkId, selectedProjects });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No matching record found" });
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all activated checks for a given selectedCompany
app.get("/api/company-checks", async (req, res) => {
  const { selectedCompany, selectedProjects } = req.query;
  console.log(selectedCompany, selectedProjects);
  try {
    const docs = await db
      .collection("user_checks")
      .find({ selectedCompany, selectedProjects })
      .toArray();
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-checklist", async (req, res) => {
  try {
    const docs = await db
      .collection("standards")
      .find({ DS_GroupId: { $in: ["B1", "B2", "B3"] } })
      .toArray();
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/remove-user-from-project", async (req, res) => {
  try {
    const { userId, projectId, isRemovedProjectManagerRole } = req.body;

    // Validate required fields
    if (!userId || !projectId) {
      return res.status(400).json({
        error: "Both userId and projectId are required",
      });
    }

    // Build update operation
    const updateOperation = {
      $pull: { projectsId: projectId },
    };

    if (isRemovedProjectManagerRole) {
      updateOperation.$set = { userRole: null };
    }

    // Update user document
    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(userId) }, updateOperation);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        error: "User was not assigned to this project",
      });
    }

    res.status(200).json({
      message: "User removed from project successfully",
      result,
    });
  } catch (error) {
    console.error("Error removing user from project:", error);
    res.status(500).json({
      error: "Failed to remove user from project",
    });
  }
});
async function processAndInsertParts() {
  try {
    const inputCollection = db.collection("inputs");
    const partsCollection = db.collection("parts");

    const documents = await inputCollection.find({}).toArray();

    const parts = [];

    for (const doc of documents) {
      const groupName = doc.GroupName;
      const subjectMatterId = doc.SubjectMatterId;
      let iconValues = doc["Building part ICON"];

      if (!iconValues) continue;
      if (typeof iconValues === "string") {
        iconValues = iconValues.split(",").map(Number);
      } else if (typeof iconValues === "number") {
        iconValues = [iconValues];
      }

      for (const icon of iconValues) {
        parts.push({
          GroupName: groupName,
          SubjectMatterId: subjectMatterId,
          name: icon,
        });
      }
    }

    if (parts.length > 0) {
      await partsCollection.insertMany(parts);
      console.log(`${parts.length} records inserted into 'parts' collection.`);
    } else {
      console.log("No parts to insert.");
    }
  } catch (error) {
    console.error("Error processing documents:", error);
  }
}

// 7. Check authentication status
app.get("/users/authenticated", authenticateToken, (req, res) => {
  res.status(200).json({ authenticated: true, user: req.user });
});

// PDF Generation API
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const fs = require('fs').promises;

// Test API to verify data fetching
app.get("/api/test-report-data/:companyId/:projectId/:professionId", async (req, res) => {
  try {
    const { companyId, projectId, professionId } = req.params;

    // Fetch data from existing APIs
    const [companyResponse, projectResponse, professionResponse] = await Promise.all([
      fetch(`${req.protocol}://${req.get('host')}/get-company-detail/${companyId}`),
      fetch(`${req.protocol}://${req.get('host')}/get-project-detail/${projectId}`),
      fetch(`${req.protocol}://${req.get('host')}/get-profession-detail-in-company-projects/${professionId}`)
    ]);

    if (!companyResponse.ok || !projectResponse.ok || !professionResponse.ok) {
      return res.status(404).json({
        error: "One or more entities not found"
      });
    }

    const [company, project, profession] = await Promise.all([
      companyResponse.json(),
      projectResponse.json(),
      professionResponse.json()
    ]);

    res.json({
      company,
      project,
      profession
    });

  } catch (error) {
    console.error('Data fetching error:', error);
    res.status(500).json({
      error: "Failed to fetch report data",
      details: error.message
    });
  }
});

app.get("/api/generate-pdf-report/:companyId/:projectId/:professionId", async (req, res) => {
  try {
    const { companyId, projectId, professionId } = req.params;

    // Validate required parameters
    if (!companyId || !projectId || !professionId) {
      return res.status(400).json({
        error: "companyId, projectId, and professionId are required"
      });
    }

    // Fetch data from existing APIs
    const [companyResponse, projectResponse, professionResponse] = await Promise.all([
      fetch(`${req.protocol}://${req.get('host')}/get-company-detail/${companyId}`),
      fetch(`${req.protocol}://${req.get('host')}/get-project-detail/${projectId}`),
      fetch(`${req.protocol}://${req.get('host')}/get-profession-detail-in-company-projects/${professionId}`)
    ]);

    if (!companyResponse.ok || !projectResponse.ok || !professionResponse.ok) {
      return res.status(404).json({
        error: "One or more entities not found"
      });
    }

    const [company, project, profession] = await Promise.all([
      companyResponse.json(),
      projectResponse.json(),
      professionResponse.json()
    ]);

    // Initialize all variables at the beginning
    let mainContractor = {};
    let constructionManager = {};
    let safetyCoordinator = {};
    let certificationScheme = {};
    let advisorsByType = {};
    let inspectors = [];
    let drawings = [];
    let documents = [];
    let checks = [];
    let subcontractors = [];
    let projectManagers = [];
    let independentControllers = [];
    let workers = [];

    try {
      // Fetch main contractors (can be multiple, use first one)
      const mainContractorsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-mains?companyId=${companyId}&projectId=${projectId}`);
      if (mainContractorsResponse.ok) {
        const mainContractors = await mainContractorsResponse.json();
        mainContractor = mainContractors[0] || company; // Use first main contractor, fallback to company
      } else {
        mainContractor = company; // Fallback to company if API fails
      }

      // Fetch construction managers (can be multiple, use first one)
      const constructionManagersResponse = await fetch(`${req.protocol}://${req.get('host')}/get-cons?companyId=${companyId}&projectId=${projectId}`);
      if (constructionManagersResponse.ok) {
        const managers = await constructionManagersResponse.json();
        constructionManager = managers[0] || {};
      }

      // Fetch safety coordinators (can be multiple, use first one)
      const safetyCoordinatorsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-safety?companyId=${companyId}&projectId=${projectId}`);
      if (safetyCoordinatorsResponse.ok) {
        const coordinators = await safetyCoordinatorsResponse.json();
        safetyCoordinator = coordinators[0] || {};
      }

      // Fetch all certification schemes (can be multiple)
      const schemesResponse = await fetch(`${req.protocol}://${req.get('host')}/get-schemes?companyId=${companyId}&projectId=${projectId}`);
      if (schemesResponse.ok) {
        const schemes = await schemesResponse.json();
        certificationScheme = {
          schemes: schemes, // Pass all schemes to template
          name: schemes.length > 0 ? schemes[0].item?.name || "" : "",
          level: schemes.length > 0 ? schemes[0].level?.name || "" : ""
        };
      } else {
        certificationScheme = {
          schemes: [],
          name: "",
          level: ""
        };
      }

      // Fetch advisors and group by type
      const advisorsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-advisors?companyId=${companyId}&projectId=${projectId}`);
      if (advisorsResponse.ok) {
        const advisors = await advisorsResponse.json();
        // Group advisors by their type field
        advisors.forEach(advisor => {
          const type = advisor.type || 'Unknown Type';
          if (!advisorsByType[type]) {
            advisorsByType[type] = [];
          }
          advisorsByType[type].push(advisor);
        });
      }

      // Fetch inspectors
      const inspectorsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-inspectors?companyId=${companyId}&projectId=${projectId}`);
      if (inspectorsResponse.ok) {
        inspectors = await inspectorsResponse.json();
      }

      // Fetch drawings
      const drawingsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-draws?companyId=${companyId}&projectId=${projectId}`);
      if (drawingsResponse.ok) {
        drawings = await drawingsResponse.json();
      }

      // Fetch documents
      const documentsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-documents?companyId=${companyId}&projectId=${projectId}`);
      if (documentsResponse.ok) {
        documents = await documentsResponse.json();
      }

      // Fetch checklist data from project details
      const projectDetailResponse = await fetch(`${req.protocol}://${req.get('host')}/get-project-detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId })
      });
      if (projectDetailResponse.ok) {
        const projectDetail = await projectDetailResponse.json();
        checks = projectDetail.checks || [];
      }

      // Fetch subcontractors
      const subcontractorsResponse = await fetch(`${req.protocol}://${req.get('host')}/get-subs?companyId=${companyId}&projectId=${projectId}`);
      if (subcontractorsResponse.ok) {
        subcontractors = await subcontractorsResponse.json();
      }

      // Fetch project managers (can be multiple, use first one)
      const projectManagersResponse = await fetch(`${req.protocol}://${req.get('host')}/get-project-managers?companyId=${companyId}&projectId=${projectId}`);
      if (projectManagersResponse.ok) {
        const allProjectManagers = await projectManagersResponse.json();
        projectManagers = allProjectManagers.slice(0, 1); // Only use first project manager
      }

      // Fetch independent controllers
      const independentControllersResponse = await fetch(`${req.protocol}://${req.get('host')}/get-independent-controller?companyId=${companyId}&projectId=${projectId}`);
      if (independentControllersResponse.ok) {
        independentControllers = await independentControllersResponse.json();
      }

      // Fetch workers for the specific profession
      const workersResponse = await fetch(`${req.protocol}://${req.get('host')}/get-workers?companyId=${companyId}&projectId=${projectId}`);
      if (workersResponse.ok) {
        const allWorkers = await workersResponse.json();
        
        // Filter workers by the specific profession ID
        workers = allWorkers.filter(worker => {
          if (worker.userProfession && Array.isArray(worker.userProfession)) {
            return worker.userProfession.some(profession => 
              profession._id === professionId || profession.professionID === professionId
            );
          }
          return false;
        });
        
        // Process worker images to base64
        for (let worker of workers) {
          if (worker.picture) {
            try {
              const imagePath = path.join(__dirname, 'uploads', worker.picture);
              const imageBuffer = await fs.readFile(imagePath);
              worker.pictureBase64 = imageBuffer.toString('base64');
            } catch (error) {
              console.log('Error reading worker image:', error);
              worker.pictureBase64 = null;
            }
          }
        }
      }
    } catch (error) {
      console.log('Error fetching additional data:', error);
      // Continue with empty objects if data fetching fails
    }

    // Read and compile all HTML templates
    const reportTemplatePath = path.join(__dirname, 'templates', 'report-template.html');
    const tocTemplatePath = path.join(__dirname, 'templates', 'toc-template.html');
    const projectDetailsTemplatePath = path.join(__dirname, 'templates', 'project-details-template.html');
    const advisorsInspectorsTemplatePath = path.join(__dirname, 'templates', 'advisors-inspectors-template.html');
    const documentsInfoTemplatePath = path.join(__dirname, 'templates', 'documents-info-template.html');
    const documentsDrawingsTemplatePath = path.join(__dirname, 'templates', 'documents-drawings-template.html');
    const checklistTemplatePath = path.join(__dirname, 'templates', 'checklist-template.html');
    const companyOrganizationTemplatePath = path.join(__dirname, 'templates', 'company-organization-template.html');
    const employeeListTemplatePath = path.join(__dirname, 'templates', 'employee-list-template.html');
    const preparingProductionTemplatePath = path.join(__dirname, 'templates', 'preparing-production-template.html');
    
    const [reportTemplateContent, tocTemplateContent, projectDetailsTemplateContent, advisorsInspectorsTemplateContent, documentsInfoTemplateContent, documentsDrawingsTemplateContent, checklistTemplateContent, companyOrganizationTemplateContent, employeeListTemplateContent, preparingProductionTemplateContent] = await Promise.all([
      fs.readFile(reportTemplatePath, 'utf8'),
      fs.readFile(tocTemplatePath, 'utf8'),
      fs.readFile(projectDetailsTemplatePath, 'utf8'),
      fs.readFile(advisorsInspectorsTemplatePath, 'utf8'),
      fs.readFile(documentsInfoTemplatePath, 'utf8'),
      fs.readFile(documentsDrawingsTemplatePath, 'utf8'),
      fs.readFile(checklistTemplatePath, 'utf8'),
      fs.readFile(companyOrganizationTemplatePath, 'utf8'),
      fs.readFile(employeeListTemplatePath, 'utf8'),
      fs.readFile(preparingProductionTemplatePath, 'utf8')
    ]);
    
    // Register date formatting helper
    Handlebars.registerHelper('formatDate', function(dateString) {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      } catch (e) {
        return dateString;
      }
    });

    // Register add helper for indexing
    Handlebars.registerHelper('add', function(a, b) {
      return a + b;
    });
    
    const reportTemplate = Handlebars.compile(reportTemplateContent);
    const tocTemplate = Handlebars.compile(tocTemplateContent);
    const projectDetailsTemplate = Handlebars.compile(projectDetailsTemplateContent);
    const advisorsInspectorsTemplate = Handlebars.compile(advisorsInspectorsTemplateContent);
    const documentsInfoTemplate = Handlebars.compile(documentsInfoTemplateContent);
    const documentsDrawingsTemplate = Handlebars.compile(documentsDrawingsTemplateContent);
    const checklistTemplate = Handlebars.compile(checklistTemplateContent);
    const companyOrganizationTemplate = Handlebars.compile(companyOrganizationTemplateContent);
    const employeeListTemplate = Handlebars.compile(employeeListTemplateContent);
    const preparingProductionTemplate = Handlebars.compile(preparingProductionTemplateContent);
    
    // Debug: Check if template content is loaded
    console.log('Preparing Production Template Content Length:', preparingProductionTemplateContent.length);

    // Read and encode the Assurement logo
    const logoPath = path.join(__dirname, 'templates', 'assurement-logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    const assurmentLogo = logoBuffer.toString('base64');

    // Prepare data for templates
    const templateData = {
      company,
      project,
      profession,
      assurmentLogo,
      mainContractor,
      constructionManager,
      safetyCoordinator,
      certificationScheme,
      advisorsByType,
      inspectors,
      drawings,
      documents,
      checks,
      subcontractors,
      projectManagers,
      independentControllers,
      workers,
      currentDate: new Date().toLocaleDateString()
    };

    // Render all HTML pages
    const reportHtml = reportTemplate(templateData);
    const tocHtml = tocTemplate(templateData);
    const projectDetailsHtml = projectDetailsTemplate(templateData);
    const advisorsInspectorsHtml = advisorsInspectorsTemplate(templateData);
    const documentsInfoHtml = documentsInfoTemplate(templateData);
    const documentsDrawingsHtml = documentsDrawingsTemplate(templateData);
    const checklistHtml = checklistTemplate(templateData);
    const companyOrganizationHtml = companyOrganizationTemplate(templateData);
    const employeeListHtml = employeeListTemplate(templateData);
    const preparingProductionHtml = preparingProductionTemplate(templateData);
    
    // Debug: Check if HTML is generated
    console.log('Preparing Production HTML Length:', preparingProductionHtml.length);

    // Generate PDF using Puppeteer with multiple pages
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Create combined HTML with page breaks
    const combinedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .page { page-break-after: always; }
          .page:last-child { page-break-after: avoid; }
        </style>
      </head>
      <body>
        <div class="page">${reportHtml}</div>
        <div class="page">${tocHtml}</div>
        <div class="page">${projectDetailsHtml}</div>
        <div class="page">${advisorsInspectorsHtml}</div>
        <div class="page">${documentsInfoHtml}</div>
        <div class="page">${documentsDrawingsHtml}</div>
        <div class="page">${checklistHtml}</div>
        <div class="page">${companyOrganizationHtml}</div>
        <div class="page">${employeeListHtml}</div>
        <div class="page">${preparingProductionHtml}</div>
      </body>
      </html>
    `;
    
    await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quality-assurance-report-${projectId}.pdf`);
    res.setHeader('Content-Length', pdf.length);

    res.send(pdf);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: "Failed to generate PDF report",
      details: error.message
    });
  }
});

// Document upload and management endpoints
app.post(
  "/store-documents",
  upload.fields([
    { name: "documents", maxCount: 50 }, // Multiple documents
  ]),
  async (req, res) => {
    try {
      const { companyId, projectsId, category, description } = req.body;
      const files = req.files["documents"] || [];

      if (!companyId || !projectsId || !category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Create document entries for each uploaded file
      const documentEntries = files.map(file => ({
        originalName: file.originalname,
        storedName: file.filename,
        category: category,
        description: description || '',
        uploadedAt: new Date(),
        companyId: companyId,
        projectId: projectsId
      }));

      // Insert documents into database
      const result = await db.collection("documents").insertMany(documentEntries);

      res.status(201).json({
        message: "Documents uploaded successfully",
        documentIds: Object.values(result.insertedIds),
        count: files.length
      });

    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ error: "Failed to upload documents" });
    }
  }
);

app.get("/get-documents", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    if (!companyId || !projectId) {
      return res.status(400).json({ error: "Missing companyId or projectId" });
    }

    const documents = await db
      .collection("documents")
      .find({
        companyId: companyId,
        projectId: projectId
      })
      .sort({ uploadedAt: -1 })
      .toArray();

    res.status(200).json(documents);

  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.get("/download-document/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = path.join(__dirname, "uploads", document.storedName);

    if (!require("fs").existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(filePath, document.originalName);

  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
});

app.delete("/delete-document/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Delete file from server
    const filePath = path.join(__dirname, "uploads", document.storedName);
    if (require("fs").existsSync(filePath)) {
      require("fs").unlinkSync(filePath);
    }

    // Delete from database
    await db.collection("documents").deleteOne({ _id: new ObjectId(documentId) });

    res.status(200).json({ message: "Document deleted successfully" });

  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
