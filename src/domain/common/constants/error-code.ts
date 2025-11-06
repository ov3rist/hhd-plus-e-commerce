export const ErrorCode = {
  // Product
  PRODUCT_NOT_FOUND: {
    code: 'P001',
    message: '상품을 찾을 수 없음',
  },
  INSUFFICIENT_STOCK: {
    code: 'P002',
    message: '재고 부족',
  },
  INVALID_STOCK_QUANTITY: {
    code: 'P003',
    message: '잘못된 재고 수량',
  },

  // Order
  INVALID_QUANTITY: {
    code: 'O001',
    message: '잘못된 수량',
  },
  ORDER_NOT_FOUND: {
    code: 'O002',
    message: '주문을 찾을 수 없음',
  },
  ORDER_EXPIRED: {
    code: 'O003',
    message: '주문서 만료 (10분 초과)',
  },
  ALREADY_PAID: {
    code: 'O004',
    message: '이미 결제된 주문',
  },

  // Payment
  INSUFFICIENT_BALANCE: {
    code: 'PAY001',
    message: '잔액 부족',
  },
  PAYMENT_FAILED: {
    code: 'PAY002',
    message: '결제 실패',
  },

  // Coupon
  COUPON_SOLD_OUT: {
    code: 'C001',
    message: '쿠폰 품절',
  },
  INVALID_COUPON: {
    code: 'C002',
    message: '유효하지 않은 쿠폰',
  },
  EXPIRED_COUPON: {
    code: 'C003',
    message: '만료된 쿠폰',
  },
  ALREADY_USED: {
    code: 'C004',
    message: '이미 사용된 쿠폰',
  },
  ALREADY_ISSUED: {
    code: 'C005',
    message: '이미 발급된 쿠폰',
  },

  // User
  USER_NOT_FOUND: {
    code: 'U001',
    message: '사용자를 찾을 수 없음',
  },

  // Cart
  CART_ITEM_NOT_FOUND: {
    code: 'CART001',
    message: '장바구니 항목을 찾을 수 없음',
  },
} as const;
