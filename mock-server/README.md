# E-Commerce Mock Server

이커머스 시스템의 REST API Mock 서버입니다.

## 시작하기

```bash
# 패키지 설치
pnpm install

# 서버 실행
pnpm start
```

서버는 `http://localhost:3001`에서 실행됩니다.

## Swagger UI

API 문서는 Swagger UI에서 확인할 수 있습니다:

🔗 **http://localhost:3001/api-docs**

Swagger UI에서 다음을 수행할 수 있습니다:

- 모든 API 엔드포인트 확인
- 각 API의 요청/응답 스키마 확인
- "Try it out" 기능으로 직접 API 테스트
- 에러 코드 및 예시 확인

## API 엔드포인트

### 1. 상품 조회

#### 1.1 상품 목록 조회

```http
GET /api/products?category={category}&sortBy={sortBy}
```

**Query Parameters:**

- `category` (optional): 카테고리 필터링
- `sortBy` (optional): price_asc, price_desc, latest

**예시:**

```bash
curl http://localhost:3001/api/products
curl http://localhost:3001/api/products?category=의류
curl http://localhost:3001/api/products?sortBy=price_asc
```

#### 1.2 상품 상세 조회

```http
GET /api/products/{productId}
```

**예시:**

```bash
curl http://localhost:3001/api/products/1
```

#### 1.3 인기 상품 조회

```http
GET /api/products/top
```

**예시:**

```bash
curl http://localhost:3001/api/products/top
```

### 2. 잔액 관리

#### 2.1 잔액 조회

```http
GET /api/users/{userId}/balance
```

**예시:**

```bash
curl http://localhost:3001/api/users/1/balance
```

### 3. 장바구니

#### 3.1 장바구니 상품 추가

```http
POST /api/users/{userId}/cart
Content-Type: application/json

{
  "productOptionId": "1",
  "quantity": 2
}
```

**예시:**

```bash
curl -X POST http://localhost:3001/api/users/1/cart \
  -H "Content-Type: application/json" \
  -d '{"productOptionId":"1","quantity":2}'
```

#### 3.2 장바구니 조회

```http
GET /api/users/{userId}/cart
```

**예시:**

```bash
curl http://localhost:3001/api/users/1/cart
```

#### 3.3 장바구니 상품 삭제

```http
DELETE /api/users/{userId}/cart/{cartItemId}
```

**예시:**

```bash
curl -X DELETE http://localhost:3001/api/users/1/cart/1
```

### 4. 주문/결제

#### 4.1 주문서 생성

```http
POST /api/orders
Content-Type: application/json

{
  "userId": "1",
  "items": [
    {
      "productOptionId": "1",
      "quantity": 2
    }
  ]
}
```

**예시:**

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"1",
    "items":[{"productOptionId":"1","quantity":2}]
  }'
```

#### 4.2 결제 처리

```http
POST /api/orders/{orderId}/payment
Content-Type: application/json

{
  "userId": "1",
  "couponId": "1"
}
```

**Parameters:**

- `userId`: 결제할 사용자 ID (required)
- `couponId`: 사용할 쿠폰 ID (optional)

**예시:**

```bash
# 쿠폰 없이 결제
curl -X POST http://localhost:3001/api/orders/1/payment \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}'

# 쿠폰과 함께 결제
curl -X POST http://localhost:3001/api/orders/1/payment \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","couponId":"1"}'
```

#### 4.3 주문 내역 조회

```http
GET /api/users/{userId}/orders?status={status}
```

**Query Parameters:**

- `status` (optional): PENDING, PAID, EXPIRED

**예시:**

```bash
curl http://localhost:3001/api/users/1/orders
curl http://localhost:3001/api/users/1/orders?status=PAID
```

### 5. 쿠폰

#### 5.1 쿠폰 발급 (선착순)

```http
POST /api/coupons/{couponId}/issue
Content-Type: application/json

{
  "userId": "1"
}
```

**예시:**

```bash
curl -X POST http://localhost:3001/api/coupons/1/issue \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}'
```

#### 5.2 보유 쿠폰 조회

```http
GET /api/users/{userId}/coupons?status={status}
```

**Query Parameters:**

- `status` (optional): AVAILABLE, USED, EXPIRED

**예시:**

```bash
curl http://localhost:3001/api/users/1/coupons
curl http://localhost:3001/api/users/1/coupons?status=AVAILABLE
```

## 초기 데이터

### 사용자

- User 1: balance = 1,000,000원
- User 2: balance = 500,000원

### 상품

1. 프리미엄 티셔츠 (29,000원) - 의류
2. 스니커즈 (89,000원) - 신발
3. 백팩 (59,000원) - 가방
4. 청바지 (79,000원) - 의류
5. 모자 (25,000원) - 악세서리

### 쿠폰

1. 신규회원 10% 할인 (45/100 발급)
2. VIP 20% 할인 (50/50 발급, 품절)
3. 블랙프라이데이 15% 할인 (120/200 발급)

## 에러 코드

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "errorCode": "P001",
  "message": "상품을 찾을 수 없음",
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### 에러 코드 목록

- `P001`: 상품을 찾을 수 없음 (404)
- `P002`: 재고 부족 (400)
- `O001`: 잘못된 수량 (400)
- `O002`: 주문을 찾을 수 없음 (404)
- `O003`: 주문서 만료 (400)
- `O004`: 이미 결제된 주문 (400)
- `PAY001`: 잔액 부족 (400)
- `PAY002`: 결제 실패 (400)
- `C001`: 쿠폰 품절 (400)
- `C002`: 유효하지 않은 쿠폰 (400)
- `C003`: 만료된 쿠폰 (400)
- `C004`: 이미 사용된 쿠폰 (400)
- `C005`: 이미 발급된 쿠폰 (400)
- `U001`: 사용자를 찾을 수 없음 (404)
- `CART001`: 장바구니 항목을 찾을 수 없음 (404)

## 주요 비즈니스 로직

### 재고 관리

- 주문서 생성 시 재고를 선점합니다 (`reserved_stock` 증가, `stock` 감소)
- 결제 완료 시 선점 재고를 해제합니다 (`reserved_stock` 감소)
- 주문서 만료(10분) 시 자동으로 재고가 복원됩니다

### 쿠폰 시스템

- 동일 쿠폰은 사용자당 1회만 발급 가능
- 선착순으로 발급되며 품절 시 발급 불가
- 할인 금액은 소수점 첫째자리에서 버림 처리
- 결제 완료 시 쿠폰이 사용 처리됨

### 주문 상태

- `PENDING`: 주문서 생성 후 결제 대기 (10분간 유효)
- `PAID`: 결제 완료
- `EXPIRED`: 주문서 만료

## 테스트 시나리오

### 시나리오 1: 정상 주문 플로우

```bash
# 1. 상품 조회
curl http://localhost:3001/api/products/1

# 2. 장바구니 추가
curl -X POST http://localhost:3001/api/users/1/cart \
  -H "Content-Type: application/json" \
  -d '{"productOptionId":"1","quantity":2}'

# 3. 장바구니 조회
curl http://localhost:3001/api/users/1/cart

# 4. 쿠폰 발급
curl -X POST http://localhost:3001/api/coupons/1/issue \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}'

# 5. 주문서 생성
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","items":[{"productOptionId":"1","quantity":2}]}'

# 6. 결제 (쿠폰과 함께)
curl -X POST http://localhost:3001/api/orders/1/payment \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","couponId":"1"}'

# 7. 주문 내역 확인
curl http://localhost:3001/api/users/1/orders
```

### 시나리오 2: 재고 부족

```bash
# 많은 수량 주문 시도
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","items":[{"productOptionId":"1","quantity":999}]}'
```

### 시나리오 3: 쿠폰 품절

```bash
# 품절된 쿠폰 발급 시도
curl -X POST http://localhost:3001/api/coupons/2/issue \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}'
```

## 데이터 초기화

`db.json` 파일을 직접 수정하거나 서버를 재시작하면 초기 데이터로 복원됩니다.

## 참고 문서

- [API 명세서](../docs/api/api-specification.md)
- [사용자 스토리](../docs/api/user-stories.md)
- [데이터 모델](../docs/api/data-models.md)
- [요구사항](../docs/api/requirements.md)
