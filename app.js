const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

// Core middleware
// Increase body size limit for translation batches and file uploads
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static assets
app.use("/uploads", express.static("uploads"));
app.use("/uploads/previews", express.static("uploads/previews"));
app.use("/templates", express.static("static-report-templates"));
app.use(
  "/abdullahksreport",
  express.static(path.join(__dirname, "abdullahksreport"))
);
app.use(
  "/combined_report",
  express.static(path.join(__dirname, "combined_report"))
);
app.use(express.static(path.join(__dirname, "public")));

// Shared assets used by multiple static HTML reports
app.get("/logo.png", (req, res) => {
  res.sendFile(path.join(__dirname, "logo.png"));
});

// NOTE: Removed serving static files from root directory to prevent 
// conflicts with React Router. HTML files from root should be accessed via API routes.

console.log("app.js loaded");
module.exports = app;
