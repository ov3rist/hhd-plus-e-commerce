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

// 2. 잔액 관리
// 2.1 잔액 조회
app.get("/api/users/:userId/balance", (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === parseInt(req.params.userId));

  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  res.json({
    userId: String(user.id),
    balance: user.balance,
  });
});

// 3. 장바구니
// 3.1 장바구니 상품 추가
app.post("/api/users/:userId/cart", (req, res) => {
  const db = getDb();
  const userId = parseInt(req.params.userId);
  const { productOptionId, quantity } = req.body;

  // 사용자 확인
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  // 상품 옵션 확인
  const option = db.product_options.find(
    (o) => o.id === parseInt(productOptionId)
  );
  if (!option) {
    return errorResponse(res, "P001", "상품 옵션을 찾을 수 없음", 404);
  }

  // 재고 확인
  const availableStock = option.stock - option.reserved_stock;
  if (availableStock < quantity) {
    return errorResponse(res, "P002", "재고 부족", 400);
  }

  // 기존 장바구니 항목 확인
  const existingItem = db.cart_items.find(
    (c) =>
      c.user_id === userId && c.product_option_id === parseInt(productOptionId)
  );

  let cartItem;
  const now = new Date().toISOString();

  if (existingItem) {
    // 수량 업데이트
    existingItem.quantity += quantity;
    existingItem.updated_at = now;
    cartItem = existingItem;
  } else {
    // 새 항목 추가
    const newId =
      db.cart_items.length > 0
        ? Math.max(...db.cart_items.map((c) => c.id)) + 1
        : 1;
    cartItem = {
      id: newId,
      user_id: userId,
      product_option_id: parseInt(productOptionId),
      quantity: quantity,
      created_at: now,
      updated_at: now,
    };
    db.cart_items.push(cartItem);
  }

  saveDb(db);

  res.status(201).json({
    cartItemId: String(cartItem.id),
    productOptionId: String(cartItem.product_option_id),
    quantity: cartItem.quantity,
  });
});

// 3.2 장바구니 조회
app.get("/api/users/:userId/cart", (req, res) => {
  const db = getDb();
  const userId = parseInt(req.params.userId);

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  const cartItems = db.cart_items.filter((c) => c.user_id === userId);
  let totalAmount = 0;

  const items = cartItems.map((item) => {
    const option = db.product_options.find(
      (o) => o.id === item.product_option_id
    );
    const product = db.products.find((p) => p.id === option.product_id);
    const subtotal = product.price * item.quantity;
    totalAmount += subtotal;

    return {
      cartItemId: String(item.id),
      productId: String(product.id),
      productName: product.name,
      productOptionId: String(option.id),
      optionColor: option.color,
      optionSize: option.size,
      price: product.price,
      quantity: item.quantity,
      subtotal: subtotal,
    };
  });

  res.json({
    items: items,
    totalAmount: totalAmount,
  });
});

// 3.3 장바구니 상품 삭제
app.delete("/api/users/:userId/cart/:cartItemId", (req, res) => {
  const db = getDb();
  const userId = parseInt(req.params.userId);
  const cartItemId = parseInt(req.params.cartItemId);

  const index = db.cart_items.findIndex(
    (c) => c.id === cartItemId && c.user_id === userId
  );

  if (index === -1) {
    return errorResponse(res, "CART001", "장바구니 항목을 찾을 수 없음", 404);
  }

  db.cart_items.splice(index, 1);
  saveDb(db);

  res.status(204).send();
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});