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

// 1. 상품 조회
// 1.1 상품 목록 조회
app.get("/api/products", (req, res) => {
  const db = getDb();
  let products = db.products
    .filter((p) => p.is_available)
    .filter((p) => {
      if (req.query.category) {
        return p.category === req.query.category;
      }
      return true;
    });

  res.json({
    products: products.map((p) => ({
      productId: String(p.id),
      name: p.name,
      price: p.price,
      category: p.category,
      isAvailable: p.is_available,
    })),
  });
});

// 1.3 인기 상품 조회
app.get("/api/products/top", (req, res) => {
  const db = getDb();
  const snapshot = db.product_popularity_snapshot
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (snapshot.length === 0) {
    return res.json({
      products: [],
      createdAt: new Date().toISOString(),
    });
  }

  const createdAt = snapshot[0].created_at;

  res.json({
    products: snapshot.map((s) => ({
      rank: s.rank,
      productId: String(s.product_id),
      name: s.product_name,
      price: s.price,
      category: s.category,
      salesCount: s.sales_count,
      lastSoldAt: s.last_sold_at,
    })),
    createdAt: createdAt,
  });
});

// 1.2 상품 상세 조회
app.get("/api/products/:productId", (req, res) => {
  const db = getDb();
  const product = db.products.find(
    (p) => p.id === parseInt(req.params.productId)
  );

  if (!product) {
    return errorResponse(res, "P001", "상품을 찾을 수 없음", 404);
  }

  const options = db.product_options.filter((o) => o.product_id === product.id);

  res.json({
    productId: String(product.id),
    name: product.name,
    price: product.price,
    description: product.description,
    category: product.category,
    isAvailable: product.is_available,
    options: options.map((o) => ({
      productOptionId: String(o.id),
      color: o.color,
      size: o.size,
      stock: o.stock - o.reserved_stock,
    })),
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});