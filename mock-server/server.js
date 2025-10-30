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

// 4. 주문/결제
// 4.1 주문서 생성
app.post("/api/orders", (req, res) => {
  const db = getDb();
  const { userId, items } = req.body;

  // 사용자 확인
  const user = db.users.find((u) => u.id === parseInt(userId));
  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  // 재고 검증
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const option = db.product_options.find(
      (o) => o.id === parseInt(item.productOptionId)
    );
    if (!option) {
      return errorResponse(res, "P001", "상품 옵션을 찾을 수 없음", 404);
    }

    const product = db.products.find((p) => p.id === option.product_id);
    const availableStock = option.stock - option.reserved_stock;

    if (availableStock < item.quantity) {
      return errorResponse(res, "P002", "재고 부족", 400);
    }

    // 재고 선점
    option.reserved_stock += item.quantity;
    option.stock -= item.quantity;

    const subtotal = product.price * item.quantity;
    totalAmount += subtotal;

    orderItems.push({
      productId: product.id,
      productName: product.name,
      productOptionId: option.id,
      price: product.price,
      quantity: item.quantity,
      subtotal: subtotal,
    });
  }

  // 주문 생성
  const newOrderId =
    db.orders.length > 0 ? Math.max(...db.orders.map((o) => o.id)) + 1 : 1;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분 후

  const order = {
    id: newOrderId,
    user_id: parseInt(userId),
    coupon_id: null,
    total_amount: totalAmount,
    discount_amount: 0,
    final_amount: totalAmount,
    status: "PENDING",
    created_at: now,
    paid_at: null,
    expired_at: expiresAt,
    updated_at: now,
  };

  db.orders.push(order);

  // 주문 아이템 생성
  orderItems.forEach((item, index) => {
    const newItemId =
      db.order_items.length > 0
        ? Math.max(...db.order_items.map((oi) => oi.id)) + 1
        : index + 1;
    db.order_items.push({
      id: newItemId + index,
      order_id: newOrderId,
      product_id: item.productId,
      product_option_id: item.productOptionId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      created_at: now,
    });
  });

  saveDb(db);

  res.status(201).json({
    orderId: String(order.id),
    userId: String(order.user_id),
    items: orderItems.map((item, index) => ({
      orderItemId: String(
        (db.order_items.length > 0
          ? Math.max(...db.order_items.map((oi) => oi.id))
          : 0) -
          orderItems.length +
          index +
          1
      ),
      productId: String(item.productId),
      productName: item.productName,
      productOptionId: String(item.productOptionId),
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    totalAmount: totalAmount,
    status: "PENDING",
    createdAt: now,
    expiresAt: expiresAt,
  });
});

// 4.2 결제 처리
app.post("/api/orders/:orderId/payment", (req, res) => {
  const db = getDb();
  const orderId = parseInt(req.params.orderId);
  const { userId, couponId } = req.body;

  // 주문 확인
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) {
    return errorResponse(res, "O002", "주문을 찾을 수 없음", 404);
  }

  // 주문 상태 확인
  if (order.status === "PAID") {
    return errorResponse(res, "O004", "이미 결제된 주문", 400);
  }

  if (order.status === "EXPIRED") {
    return errorResponse(res, "O003", "주문서 만료 (10분 초과)", 400);
  }

  // 만료 시간 확인
  if (new Date(order.expired_at) < new Date()) {
    order.status = "EXPIRED";

    // 선점 재고 해제
    const orderItems = db.order_items.filter((oi) => oi.order_id === orderId);
    orderItems.forEach((item) => {
      const option = db.product_options.find(
        (o) => o.id === item.product_option_id
      );
      option.reserved_stock -= item.quantity;
      option.stock += item.quantity;
    });

    saveDb(db);
    return errorResponse(res, "O003", "주문서 만료 (10분 초과)", 400);
  }

  // 사용자 확인
  const user = db.users.find((u) => u.id === parseInt(userId));
  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  // 쿠폰 적용
  let discountAmount = 0;
  let appliedCouponId = null;
  let userCoupon = null;

  if (couponId) {
    const coupon = db.coupons.find((c) => c.id === parseInt(couponId));
    if (!coupon) {
      return errorResponse(res, "C002", "유효하지 않은 쿠폰", 400);
    }

    userCoupon = db.user_coupons.find(
      (uc) =>
        uc.user_id === parseInt(userId) && uc.coupon_id === parseInt(couponId)
    );

    if (!userCoupon) {
      return errorResponse(res, "C002", "발급받지 않은 쿠폰", 400);
    }

    if (userCoupon.used_at) {
      return errorResponse(res, "C004", "이미 사용된 쿠폰", 400);
    }

    if (new Date(userCoupon.expired_at) < new Date()) {
      return errorResponse(res, "C003", "만료된 쿠폰", 400);
    }

    // 할인 금액 계산 (소수점 첫째자리 버림)
    discountAmount = Math.floor(
      order.total_amount * (coupon.discount_rate / 100)
    );
    appliedCouponId = coupon.id;
  }

  const finalAmount = order.total_amount - discountAmount;

  // 잔액 확인
  if (user.balance < finalAmount) {
    return errorResponse(res, "PAY001", "잔액 부족", 400);
  }

  // 주문에 쿠폰 정보 업데이트
  order.coupon_id = appliedCouponId;
  order.discount_amount = discountAmount;
  order.final_amount = finalAmount;

  // 결제 처리
  user.balance -= finalAmount;
  user.updated_at = new Date().toISOString();

  // 주문 상태 업데이트
  const now = new Date().toISOString();
  order.status = "PAID";
  order.paid_at = now;
  order.updated_at = now;

  // 재고 확정 차감 (이미 선점됨)
  const orderItems = db.order_items.filter((oi) => oi.order_id === orderId);
  orderItems.forEach((item) => {
    const option = db.product_options.find(
      (o) => o.id === item.product_option_id
    );
    option.reserved_stock -= item.quantity;
    option.updated_at = now;
  });

  // 쿠폰 사용 처리
  if (userCoupon) {
    userCoupon.used_at = now;
    userCoupon.order_id = orderId;
    userCoupon.updated_at = now;
  }

  saveDb(db);

  // 외부 데이터 플랫폼 전송 시뮬레이션 (비동기, 로그만)
  console.log(`[External Data Platform] Order ${orderId} sent successfully`);

  res.json({
    orderId: String(order.id),
    status: "PAID",
    paidAmount: finalAmount,
    remainingBalance: user.balance,
    paidAt: now,
  });
});

// 4.3 주문 내역 조회
app.get("/api/users/:userId/orders", (req, res) => {
  const db = getDb();
  const userId = parseInt(req.params.userId);

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, "U001", "사용자를 찾을 수 없음", 404);
  }

  let orders = db.orders.filter((o) => o.user_id === userId);

  // 상태 필터
  if (req.query.status) {
    orders = orders.filter((o) => o.status === req.query.status);
  }

  const result = orders.map((order) => {
    const items = db.order_items.filter((oi) => oi.order_id === order.id);

    return {
      orderId: String(order.id),
      items: items.map((item) => ({
        productId: String(item.product_id),
        productName: item.product_name,
        productOptionId: String(item.product_option_id),
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount,
      finalAmount: order.final_amount,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
    };
  });

  res.json({ orders: result });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});