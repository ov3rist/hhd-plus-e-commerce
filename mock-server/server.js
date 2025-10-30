import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Load OpenAPI spec
const openapiPath = path.join(__dirname, "..", "openapi.yaml");
const openapiSpec = yaml.load(fs.readFileSync(openapiPath, "utf8"));

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Helper functions
const getDb = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "db.json"), "utf-8"));
const saveDb = (db) =>
  fs.writeFileSync(
    path.join(__dirname, "db.json"),
    JSON.stringify(db, null, 2)
  );

const errorResponse = (res, code, message, status = 400) => {
  res.status(status).json({
    errorCode: code,
    message: message,
    timestamp: new Date().toISOString(),
  });
};

// Custom routes

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});