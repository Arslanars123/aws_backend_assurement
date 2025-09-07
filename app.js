const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

// Core middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Static assets
app.use("/uploads", express.static("uploads"));
app.use("/uploads/previews", express.static("uploads/previews"));
app.use("/templates", express.static("static-report-templates"));
app.use(express.static(path.join(__dirname, "public")));

module.exports = app;
