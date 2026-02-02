/* eslint-disable @typescript-eslint/no-var-requires, no-undef */
/**
 * Example: Using FormData for custom multipart requests
 *
 * This example shows how to create custom FormData requests
 * for Canvas API endpoints that require multipart/form-data.
 */

require("dotenv").config();
const { CanvasApi } = require("@kth/canvas-api");
const { FormData, File } = require("undici");
const fs = require("fs");

const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;

const canvas = new CanvasApi(canvasApiUrl, canvasApiToken);

async function uploadFile() {
  // Read file content
  const fileContent = fs.readFileSync("./test.csv");

  // Create FormData
  const formData = new FormData();
  formData.append("name", "uploaded-file.csv");
  formData.append("content_type", "text/csv");

  // Create a File object from the buffer
  const file = new File([fileContent], "test.csv", { type: "text/csv" });
  formData.append("attachment", file);

  try {
    // Use the request method with FormData
    // Note: For SIS imports, use canvas.sisImport() instead
    const response = await canvas.request("users/self/files", "POST", formData);

    console.log("Upload response:", response.json);
  } catch (error) {
    console.error("Upload failed:", error.message);
  }
}

// Note: This is an example structure. The actual Canvas file upload
// process involves multiple steps (quota check, upload, confirm).
// See Canvas API documentation for the complete file upload workflow.

uploadFile();
