# API 명세서

> 본 문서는 이커머스 시스템의 REST API 기술 명세를 정의하며, 개발팀 내부 레퍼런스로 활용됩니다.

## 목차

1. [상품 조회](#1-상품-조회)
2. [잔액 관리](#2-잔액-관리)
3. [장바구니](#3-장바구니)
4. [주문/결제](#4-주문결제)
5. [쿠폰](#5-쿠폰)
6. [에러 코드](#6-에러-코드)

---

## 1. 상품 조회

### 1.1 상품 목록 조회

**Endpoint**: `GET /api/products`

**Description**: 판매 중인 상품 목록을 조회합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| category | string | N | 카테고리 필터링 |
| sortBy | string | N | 정렬 기준 (price_asc, price_desc, popular, latest) |

**Response** (200 OK):

```json
{
  "products": [
    {
      "productId": "string",
      "name": "string",
      "price": "number",
      "category": "string",
      "isAvailable": "boolean"
    }
  ]
}
```

**Error Responses**:

- `500 Internal Server Error`: 서버 오류

---

### 1.2 상품 상세 조회

**Endpoint**: `GET /api/products/{productId}`

**Description**: 특정 상품의 상세 정보를 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| productId | string | Y | 상품 ID |

**Response** (200 OK):

```json
{
  "productId": "string",
  "name": "string",
  "price": "number",
  "description": "string",
  "category": "string",
  "isAvailable": "boolean",
  "options": [
    {
      "productOptionId": "string",
      "color": "string",
      "size": "string",
      "stock": "number"
    }
  ]
}
```

**Error Responses**:

- `404 Not Found`: 상품을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 1.3 인기 상품 조회

**Endpoint**: `GET /api/products/top`

**Description**: 최근 3일간 판매량 기준 인기 상품 Top 5를 조회합니다.

**Response** (200 OK):

```json
{
  "products": [
    {
      "rank": "number",
      "productId": "string",
      "name": "string",
      "price": "number",
      "category": "string",
      "salesCount": "number",
      "lastSoldAt": "string"
    }
  ],
  "createdAt": "string"
}
```

**Notes**:

- 매일 배치로 생성된 캐시 데이터를 조회합니다
- 최근 3일간 결제 완료된 주문만 집계됩니다
- 판매 수가 동일한 경우 최근 결제 시각 기준으로 정렬됩니다

**Error Responses**:

- `500 Internal Server Error`: 서버 오류

---

## 2. 잔액 관리

### 2.1 잔액 조회

**Endpoint**: `GET /api/users/{userId}/balance`

**Description**: 사용자의 현재 잔액을 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |

**Response** (200 OK):

```json
{
  "userId": "string",
  "balance": "number"
}
```

**Error Responses**:

- `404 Not Found`: 사용자를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 3. 장바구니

### 3.1 장바구니 상품 추가

**Endpoint**: `POST /api/users/{userId}/cart`

**Description**: 장바구니에 상품을 추가합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |

**Request Body**:

```json
{
  "productOptionId": "string",
  "quantity": "number"
}
```

**Response** (201 Created):

```json
{
  "cartItemId": "string",
  "productOptionId": "string",
  "quantity": "number"
}
```

**Error Responses**:

- `400 Bad Request`: 재고 부족 (INSUFFICIENT_STOCK)
- `404 Not Found`: 상품 옵션을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 3.2 장바구니 조회

**Endpoint**: `GET /api/users/{userId}/cart`

**Description**: 장바구니에 담긴 상품 목록을 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |

**Response** (200 OK):

```json
{
  "items": [
    {
      "cartItemId": "string",
      "productId": "string",
      "productName": "string",
      "productOptionId": "string",
      "optionColor": "string",
      "optionSize": "string",
      "price": "number",
      "quantity": "number",
      "subtotal": "number"
    }
  ],
  "totalAmount": "number"
}
```

**Error Responses**:

- `404 Not Found`: 사용자를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 3.3 장바구니 상품 삭제

**Endpoint**: `DELETE /api/users/{userId}/cart/{cartItemId}`

**Description**: 장바구니에서 특정 상품을 삭제합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |
| cartItemId | string | Y | 장바구니 항목 ID |

**Response** (204 No Content):

- 응답 본문 없음

**Error Responses**:

- `404 Not Found`: 장바구니 항목을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 4. 주문/결제

### 4.1 주문서 생성

**Endpoint**: `POST /api/orders`

**Description**: 장바구니 상품 기반으로 주문서를 생성하고 재고를 임시 선점합니다.

**Request Body**:

```json
{
  "userId": "string",
  "items": [
    {
      "productOptionId": "string",
      "quantity": "number"
    }
  ]
}
```

**Response** (201 Created):

```json
{
  "orderId": "string",
  "userId": "string",
  "items": [
    {
      "orderItemId": "string",
      "productId": "string",
      "productName": "string",
      "productOptionId": "string",
      "price": "number",
      "quantity": "number",
      "subtotal": "number"
    }
  ],
  "totalAmount": "number",
  "status": "PENDING",
  "createdAt": "string",
  "expiresAt": "string"
}
```

**Notes**:

- 재고를 검증하고 `reserved_stock`을 증가시킵니다
- 주문서는 생성 후 10분간 유효합니다

**Error Responses**:

- `400 Bad Request`: 재고 부족 (INSUFFICIENT_STOCK)
- `404 Not Found`: 사용자 또는 상품을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 4.2 결제 처리

**Endpoint**: `POST /api/orders/{orderId}/payment`

**Description**: 주문서에 대한 결제를 처리합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| orderId | string | Y | 주문 ID |

**Request Body**:

```json
{
  "userId": "string",
  "couponId": "string (optional)"
}
```

**Response** (200 OK):

```json
{
  "orderId": "string",
  "status": "PAID",
  "paidAmount": "number",
  "remainingBalance": "number",
  "paidAt": "string"
}
```

**Notes**:

- 쿠폰 적용 시 할인 금액이 계산됩니다
- 잔액을 차감하고 재고를 확정 차감합니다
- 사용된 쿠폰은 USED 상태로 변경됩니다
- 결제 완료 후 외부 데이터 플랫폼으로 전송됩니다 (비동기)

**Error Responses**:

- `400 Bad Request`: 잔액 부족 (INSUFFICIENT_BALANCE)
- `400 Bad Request`: 주문서 만료 (ORDER_EXPIRED)
- `400 Bad Request`: 이미 결제됨 (ALREADY_PAID)
- `400 Bad Request`: 쿠폰 사용 불가 (INVALID_COUPON)
- `404 Not Found`: 주문을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 4.3 주문 내역 조회

**Endpoint**: `GET /api/users/{userId}/orders`

**Description**: 사용자의 주문 내역을 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| status | string | N | 주문 상태 필터 (PENDING, PAID, EXPIRED, CANCELLED) |

**Response** (200 OK):

```json
{
  "orders": [
    {
      "orderId": "string",
      "items": [
        {
          "productId": "string",
          "productName": "string",
          "productOptionId": "string",
          "price": "number",
          "quantity": "number",
          "subtotal": "number"
        }
      ],
      "totalAmount": "number",
      "discountAmount": "number",
      "finalAmount": "number",
      "status": "string",
      "createdAt": "string",
      "paidAt": "string (nullable)"
    }
  ]
}
```

**Error Responses**:

- `404 Not Found`: 사용자를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 5. 쿠폰

### 5.1 쿠폰 발급 (선착순)

**Endpoint**: `POST /api/coupons/{couponId}/issue`

**Description**: 선착순으로 쿠폰을 발급받습니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| couponId | string | Y | 쿠폰 ID |

**Request Body**:

```json
{
  "userId": "string"
}
```

**Response** (201 Created):

```json
{
  "userCouponId": "string",
  "couponName": "string",
  "discountRate": "number",
  "expiresAt": "string",
  "remainingQuantity": "number"
}
```

**Notes**:

- 동시 요청 시에도 수량 정합성이 보장됩니다
- 사용자당 동일 쿠폰은 1회만 발급 가능합니다

**Error Responses**:

- `400 Bad Request`: 쿠폰 품절 (COUPON_SOLD_OUT)
- `400 Bad Request`: 이미 발급됨 (ALREADY_ISSUED)
- `404 Not Found`: 쿠폰을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 5.2 보유 쿠폰 조회

**Endpoint**: `GET /api/users/{userId}/coupons`

**Description**: 사용자가 보유한 쿠폰 목록을 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | Y | 사용자 ID |

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| status | string | N | 쿠폰 상태 필터 (AVAILABLE, USED, EXPIRED) |

**Response** (200 OK):

```json
{
  "coupons": [
    {
      "userCouponId": "string",
      "couponId": "string",
      "couponName": "string",
      "discountRate": "number",
      "status": "AVAILABLE | USED | EXPIRED",
      "expiresAt": "string",
      "issuedAt": "string",
      "usedAt": "string (nullable)"
    }
  ]
}
```

**Error Responses**:

- `404 Not Found`: 사용자를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 6. 에러 코드

### 6.1 HTTP 상태 코드

| 상태 코드                 | 설명                      |
| ------------------------- | ------------------------- |
| 200 OK                    | 요청 성공                 |
| 201 Created               | 리소스 생성 성공          |
| 204 No Content            | 요청 성공, 응답 본문 없음 |
| 400 Bad Request           | 잘못된 요청               |
| 404 Not Found             | 리소스를 찾을 수 없음     |
| 500 Internal Server Error | 서버 내부 오류            |

### 6.2 비즈니스 에러 코드

**에러 응답 형식**:

```json
{
  "errorCode": "string",
  "message": "string",
  "timestamp": "string"
}
```

**에러 코드 목록**:

| 에러 코드            | 코드    | HTTP 상태 | 설명                         |
| -------------------- | ------- | --------- | ---------------------------- |
| PRODUCT_NOT_FOUND    | P001    | 404       | 상품을 찾을 수 없음          |
| INSUFFICIENT_STOCK   | P002    | 400       | 재고 부족                    |
| INVALID_QUANTITY     | O001    | 400       | 잘못된 수량                  |
| ORDER_NOT_FOUND      | O002    | 404       | 주문을 찾을 수 없음          |
| ORDER_EXPIRED        | O003    | 400       | 주문서 만료 (10분 초과)      |
| ALREADY_PAID         | O004    | 400       | 이미 결제된 주문             |
| INSUFFICIENT_BALANCE | PAY001  | 400       | 잔액 부족                    |
| PAYMENT_FAILED       | PAY002  | 400       | 결제 실패                    |
| COUPON_SOLD_OUT      | C001    | 400       | 쿠폰 품절                    |
| INVALID_COUPON       | C002    | 400       | 유효하지 않은 쿠폰           |
| EXPIRED_COUPON       | C003    | 400       | 만료된 쿠폰                  |
| ALREADY_USED         | C004    | 400       | 이미 사용된 쿠폰             |
| ALREADY_ISSUED       | C005    | 400       | 이미 발급된 쿠폰             |
| USER_NOT_FOUND       | U001    | 404       | 사용자를 찾을 수 없음        |
| CART_ITEM_NOT_FOUND  | CART001 | 404       | 장바구니 항목을 찾을 수 없음 |

---

## 부록: 데이터베이스 테이블 참조

본 API는 다음 데이터베이스 테이블을 사용합니다:

- `users`: 사용자 정보 및 잔액
- `products`: 상품 정보
- `product_options`: 상품 옵션 및 재고
- `cart_items`: 장바구니 항목
- `orders`: 주문 정보
- `order_items`: 주문 상품 상세
- `coupons`: 쿠폰 마스터 정보
- `user_coupons`: 사용자별 발급된 쿠폰
- `product_popularity_snapshot`: 인기 상품 캐시

상세한 스키마는 `data-models.md`를 참조하세요.
