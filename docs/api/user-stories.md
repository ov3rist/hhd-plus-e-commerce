# 사용자 스토리 (User Stories)

> 본 문서는 이커머스 시스템의 주요 기능을 사용자 관점에서 정의하며, 클라이언트와의 소통 및 인수 테스트 시나리오의 기반으로 활용됩니다.

## 목차

1. [상품 조회](#1-상품-조회)
2. [잔액 관리](#2-잔액-관리)
3. [장바구니](#3-장바구니)
4. [주문/결제](#4-주문결제)
5. [쿠폰](#5-쿠폰)

---

## 1. 상품 조회

### US-001: 상품 목록 조회

**As a** 고객  
**I want to** 판매 중인 상품 목록을 조회하고 싶다  
**So that** 구매할 상품을 탐색할 수 있다

#### 인수 기준 (Acceptance Criteria)

- [ ] 상품 목록에는 상품ID, 이름, 가격, 카테고리가 포함된다
- [ ] "판매중" 플래그가 있는 상품만 조회된다
- [ ] 카테고리별 필터링이 가능하다
- [ ] 정렬 옵션(가격순, 인기순, 최신순)을 선택할 수 있다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/products
    API->>DB: SELECT products WHERE is_available = TRUE
    DB-->>API: 상품 목록
    API-->>Customer: 200 OK (상품 목록)
```

#### 시나리오 예시

```gherkin
Given 상품 데이터베이스에 10개의 상품이 있고
And 그 중 3개는 판매중 플래그가 FALSE이다
When 고객이 상품 목록을 조회하면
Then 판매중인 7개의 상품만 응답받는다
```

---

### US-002: 상품 상세 조회

**As a** 고객  
**I want to** 특정 상품의 상세 정보를 확인하고 싶다  
**So that** 구매 전 상품 정보를 자세히 파악할 수 있다

#### 인수 기준

- [ ] 상품 ID로 상세 정보를 조회할 수 있다
- [ ] 실시간 재고 수량이 표시된다
- [ ] 상품명, 가격, 설명, 카테고리 정보, 옵션 정보가 포함된다
- [ ] 존재하지 않는 상품 조회 시 404 에러를 반환한다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/products/{productId}
    API->>DB: SELECT * FROM products WHERE id = {productId}

    alt 상품 존재
        DB-->>API: 상품 정보
        API-->>Customer: 200 OK (상품 상세)
    else 상품 없음
        DB-->>API: NULL
        API-->>Customer: 404 Not Found
    end
```

#### 시나리오 예시

```gherkin
Given 상품 "P001"이 존재하고 재고가 10개일 때
When 고객이 상품 "P001"을 조회하면
Then 상품 상세 정보와 재고 10개가 표시된다

Given 상품 "P999"가 존재하지 않을 때
When 고객이 상품 "P999"를 조회하면
Then 404 에러가 반환된다
```

---

### US-003: 인기 상품 조회 (캐시 기반)

**As a** 고객  
**I want to** 최근 인기 있는 상품을 확인하고 싶다  
**So that** 트렌디한 상품을 빠르게 찾을 수 있다

#### 인수 기준

- [ ] API는 하루에 한 번 배치로 생성된 인기상품 캐시 테이블에서 데이터를 조회한다
- [ ] 캐시에는 Top 5 상품의 순위, 상품 정보(상품ID, 이름, 가격, 카테고리), 마지막 판매 시각이 포함된다
- [ ] 캐시에 5개가 저장될 만큼 팔리지 않았다면, 만족하는 상품 갯수만 반환한다. 3일 간 전체 판매 수량이 0이라면 빈 배열을 반환한다.
- [ ] 캐시는 최근 3일간의 결제 완료된 주문만 집계하여 배치 시점 기준으로 계산되어 저장된다
- [ ] 판매 수가 동일한 경우 더 최근에 결제된 상품이 우선순위로 정렬되어 캐시에 저장된다

#### 시퀀스 다이어그램 (배치 — 하루 1회)

```mermaid
sequenceDiagram
  participant Scheduler as 배치 스케줄러 (daily)
  participant DB as Database
  Note over Scheduler,DB: 매일 정해진 시간에 실행 (UTC 00:00)

  Scheduler->>DB: INSERT INTO product_popularity_snapshot<br/>(상품별 옵션수량 총계의 최근 3일 판매 집계로 Top 5 생성)
  DB-->>Scheduler: 캐시 업데이트 완료
```

#### 시퀀스 다이어그램 (조회)

```mermaid
sequenceDiagram
  actor Customer as 고객
  participant API as API Server
  participant DB as Database

  Customer->>API: GET /api/products/top
  API->>DB: SELECT * FROM product_popularity_snapshot<br/>ORDER BY created_at DESC LIMIT 1
  DB-->>API: Top 5 캐시된 인기상품 목록 (상품정보 리스트)
  API-->>Customer: 200 OK (인기 상품, created_at)
```

#### 시나리오 예시

```gherkin
Given 배치가 매일 실행되어 최근 3일간의 판매 집계를 생성하고 있고
And 오늘 캐시에 Top 5 상품 정보가 저장되어 있을 때
When 고객이 인기 상품을 조회하면
Then API는 product_popularity_snapshot에서 Top 5의 배열을 반환한다
```

---

## 2. 잔액 관리

### US-004: 잔액 조회

**As a** 고객  
**I want to** 내 계정의 잔액을 확인하고 싶다  
**So that** 구매 가능 금액을 파악할 수 있다

#### 인수 기준

- [ ] 로그인한 사용자의 현재 잔액을 조회할 수 있다
- [ ] 잔액은 원(KRW) 단위로 표시된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/users/{userId}/balance
    API->>DB: SELECT balance FROM users WHERE id = {userId}
    DB-->>API: 잔액 정보
    API-->>Customer: 200 OK (잔액)
```

---

## 3. 장바구니

### US-005: 장바구니 상품 추가

**As a** 고객  
**I want to** 상품을 장바구니에 담고 싶다  
**So that** 나중에 한 번에 주문할 수 있다

#### 인수 기준

- [ ] 상품ID와 수량을 지정하여 장바구니에 추가할 수 있다
- [ ] 이미 담긴 상품은 수량이 증가한다
- [ ] 실시간 재고보다 많은 수량은 추가할 수 없다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: POST /api/users/{userId}/cart<br/>{productOptionId, quantity}
    API->>DB: SELECT stock FROM product_options<br/>WHERE id = {productOptionId}
    DB-->>API: 재고 정보

    alt 재고 충분
        API->>DB: INSERT OR UPDATE cart_items
        DB-->>API: 추가 완료
        API-->>Customer: 201 Created
    else 재고 부족
        API-->>Customer: 400 Bad Request<br/>(INSUFFICIENT_STOCK)
    end
```

#### 시나리오 예시

```gherkin
Given 상품 "P001"의 재고가 10개이고
And 고객의 장바구니가 비어있을 때
When 고객이 상품 "P001"을 수량 3개로 장바구니에 추가하면
Then 장바구니에 해당 상품이 추가된다

Given 장바구니에 이미 상품 "P001"이 3개 담겨있을 때
When 고객이 상품 "P001"을 수량 2개로 추가하면
Then 장바구니의 수량이 5개로 증가한다
```

---

### US-006: 장바구니 조회

**As a** 고객  
**I want to** 장바구니에 담긴 상품을 확인하고 싶다  
**So that** 구매할 상품을 검토할 수 있다

#### 인수 기준

- [ ] 장바구니에 담긴 모든 상품 목록을 조회할 수 있다
- [ ] 각 상품의 이름, 가격, 수량, 소계가 표시된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/users/{userId}/cart
    API->>DB: SELECT cart_items JOIN products JOIN product_options<br/>WHERE user_id = {userId}
    DB-->>API: 장바구니 상품 목록
    API-->>Customer: 200 OK (장바구니 정보)
```

---

### US-007: 장바구니 상품 삭제

**As a** 고객  
**I want to** 장바구니에서 상품을 삭제하고 싶다  
**So that** 구매하지 않을 상품을 제거할 수 있다

#### 인수 기준

- [ ] 특정 상품을 장바구니에서 삭제할 수 있다
- [ ] 존재하지 않는 장바구니 항목 삭제 시 404 에러를 반환한다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: DELETE /api/users/{userId}/cart/{cartItemId}
    API->>DB: DELETE FROM cart_items<br/>WHERE id = {cartItemId}<br/>AND user_id = {userId}

    alt 삭제 성공
        DB-->>API: 1 row affected
        API-->>Customer: 204 No Content
    else 항목 없음
        DB-->>API: 0 rows affected
        API-->>Customer: 404 Not Found
    end
```

---

## 4. 주문/결제

### US-008: 주문서 생성

**As a** 고객  
**I want to** 장바구니 상품으로 주문서를 생성하고 싶다  
**So that** 결제를 진행할 수 있다

#### 인수 기준

- [ ] 장바구니 상품 기반으로 주문서가 생성된다
- [ ] 주문서 생성 시 재고를 검증하고 임시 선점한다
- [ ] 재고 부족 시 주문서 생성이 실패한다
- [ ] 주문서 상태는 PENDING으로 설정된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: POST /api/orders<br/>{userId, items[]}

    API->>DB: BEGIN TRANSACTION

    loop 각 상품 옵션별
        API->>DB: SELECT stock<br/>FROM product_options WHERE id = {productOptionId}<br/>FOR UPDATE
        DB-->>API: 재고 정보
        API->>API: Check: stock >= quantity
    end

    alt 재고 충분
        API->>DB: UPDATE product_options<br/>SET reserved_stock = reserved_stock + quantity,<br/>stock = stock - quantity
        API->>DB: INSERT INTO orders (status = 'PENDING')
        API->>DB: INSERT INTO order_items

        DB-->>API: 주문서 생성 완료
        API->>DB: COMMIT
        API-->>Customer: 201 Created (주문서 정보)
    else 재고 부족
        API->>DB: ROLLBACK
        API-->>Customer: 400 Bad Request<br/>(INSUFFICIENT_STOCK)
    end
```

#### 시나리오 예시

```gherkin
Given 장바구니에 상품 "P001" 3개가 담겨있고
And 상품 "P001"의 재고가 10개일 때
When 고객이 주문서를 생성하면
Then 주문서가 PENDING 상태로 생성된다
And 상품 "P001"의 선점 재고가 3개 증가한다

Given 상품 "P001"의 재고가 2개이고
And 장바구니에 상품 "P001" 5개가 담겨있을 때
When 고객이 주문서를 생성하면
Then 재고 부족 에러가 반환된다
And 주문서는 생성되지 않는다
```

---

### US-009: 결제 처리

**As a** 고객  
**I want to** 주문서에 대한 결제를 완료하고 싶다  
**So that** 상품을 구매할 수 있다

#### 인수 기준

- [ ] PENDING 상태인 주문서만 결제할 수 있다
- [ ] 쿠폰을 선택하여 적용할 수 있다
- [ ] 잔액이 부족하면 결제가 실패한다
- [ ] 결제 성공 시 재고가 확정 차감되고 선점이 해제된다
- [ ] 결제 성공 시 주문 상태가 PAID로 변경된다
- [ ] 사용된 쿠폰은 USED 상태로 변경된다
- [ ] 결제 완료 후 외부 데이터 플랫폼으로 전송된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database
    participant External as 외부 데이터 플랫폼

    Customer->>API: POST /api/orders/{orderId}/payment<br/>{userId, couponId?}

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT * FROM orders<br/>WHERE id = {orderId} FOR UPDATE
    DB-->>API: 주문 정보
    API->>API: Validate: status == 'PENDING'

    opt 쿠폰 적용
        API->>DB: SELECT * FROM user_coupons<br/>WHERE id = {couponId}
        DB-->>API: 쿠폰 정보
        API->>API: Validate coupon (유효기간, 사용여부, 소유권)
        API->>API: Calculate discount (finalAmount)
    end

    API->>DB: SELECT balance FROM users<br/>WHERE id = {userId} FOR UPDATE
    DB-->>API: 잔액 정보
    API->>API: Check: balance >= finalAmount

    alt 잔액 충분
        API->>DB: UPDATE users<br/>SET balance = balance - finalAmount

        API->>DB: UPDATE product_options<br/>SET reserved_stock = reserved_stock - quantity

        API->>DB: UPDATE orders<br/>SET status = 'PAID', paid_at = NOW()

        opt 쿠폰 사용
            API->>DB: UPDATE user_coupons<br/>SET status = 'USED', used_at = NOW()
        end

        API->>DB: COMMIT
        API-->>Customer: 200 OK (결제 완료)

        API->>External: POST /data-platform/orders<br/>(비동기)

        alt 전송 성공
            External-->>API: 200 OK
        else 전송 실패
            External-->>API: Error
            API->>DB: INSERT INTO transaction_out_failure_log
        end

    else 잔액 부족
        API->>DB: ROLLBACK
        API-->>Customer: 400 Bad Request<br/>(INSUFFICIENT_BALANCE)
    end
```

#### 시나리오 예시

```gherkin
Given 주문서 "ORDER-001"이 PENDING 상태이고
And 결제 금액이 50,000원이며
And 고객 잔액이 100,000원일 때
When 고객이 결제를 진행하면
Then 잔액이 50,000원 차감되어 50,000원이 된다
And 재고가 확정 차감되고 선점이 해제된다
And 주문 상태가 PAID로 변경된다
And 외부 데이터 플랫폼으로 주문 정보가 전송된다

Given 주문서 결제 금액이 150,000원이고
And 고객 잔액이 100,000원일 때
When 고객이 결제를 진행하면
Then 잔액 부족 에러가 반환된다
And 주문 상태는 PENDING으로 유지된다
```

---

### US-010: 결제 실패 시 선점된 재고 복원

**As a** 시스템  
**I want to** 결제 실패 시 선점한 재고를 복원하고 싶다  
**So that** 재고 정합성을 유지할 수 있다

#### 인수 기준

- [ ] 결제 실패 시 선점된 재고가 즉시 해제된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor System as 시스템
    participant API as API Server
    participant DB as Database

    API->>DB: ROLLBACK TRANSACTION
    DB->>DB: Restore reserved_stock
    DB->>DB: Restore stock
    DB-->>API: Rollback 완료

    API->>API: Log payment failure
```

---

### US-011: 재고 선점 자동 해제

**As a** 시스템  
**I want to** 10분간 미결제 시 선점 재고를 자동 해제하고 싶다  
**So that** 재고가 무한정 잠기지 않도록 한다

#### 인수 기준

- [ ] 주문서 생성 후 10분이 지나면 선점 재고가 자동 해제된다
- [ ] 해제된 주문서로 결제 시도 시 안내 메시지가 표시된다
- [ ] 고객은 주문서를 다시 생성해야 한다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    participant Scheduler as 스케줄러
    participant DB as Database
    participant Customer as 고객
    participant API as API Server

    loop 매 1분마다
        Scheduler->>DB: SELECT * FROM orders<br/>WHERE status = 'PENDING'<br/>AND created_at < NOW() - 10 minutes
        DB-->>Scheduler: 만료된 주문서 목록

        loop 각 주문서별
            Scheduler->>DB: UPDATE product_options<br/>SET reserved_stock = reserved_stock - quantity,<br>stock = stock + quantity
            Scheduler->>DB: UPDATE orders<br/>SET status = 'EXPIRED'
        end
    end

    Note over Customer: 만료된 주문서로 결제 시도
    Customer->>API: POST /api/orders/{orderId}/payment
    API->>DB: SELECT status FROM orders
    DB-->>API: status = 'EXPIRED'
    API-->>Customer: 400 Bad Request<br/>(ORDER_EXPIRED: 주문서를 다시 생성하세요)
```

---

### US-012: 주문 내역 조회

**As a** 고객  
**I want to** 내 주문 내역을 확인하고 싶다  
**So that** 구매 이력을 관리할 수 있다

#### 인수 기준

- [ ] 본인의 모든 주문 내역을 조회할 수 있다
- [ ] 주문 상태별 필터링이 가능하다
- [ ] 각 주문의 상품 목록과 결제 금액이 표시된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/users/{userId}/orders?status=PAID
    API->>DB: SELECT orders JOIN order_items<br/>WHERE user_id = {userId}<br/>AND status = 'PAID'<br/>ORDER BY created_at DESC
    DB-->>API: 주문 내역
    API-->>Customer: 200 OK (주문 목록)
```

---

## 5. 쿠폰

### US-013: 쿠폰 발급 (선착순)

**As a** 고객  
**I want to** 한정 수량의 쿠폰을 발급받고 싶다  
**So that** 할인 혜택을 받을 수 있다

#### 인수 기준

- [ ] 선착순으로 쿠폰을 발급받을 수 있다
- [ ] 한 사용자는 동일 쿠폰을 1회만 발급받을 수 있다
- [ ] 발급 수량이 총 수량에 도달하면 발급이 불가능하다
- [ ] 동시 요청 시에도 수량 정합성이 보장된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: POST /api/coupons/{couponId}/issue<br/>{userId}

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT * FROM coupons<br/>WHERE id = {couponId} FOR UPDATE
    DB-->>API: 쿠폰 정보

    API->>API: Check: issued_quantity < total_quantity

    alt 수량 여유 있음
        API->>DB: SELECT COUNT(*) FROM user_coupons<br/>WHERE user_id = {userId}<br/>AND coupon_id = {couponId}
        DB-->>API: 발급 이력

        alt 미발급 사용자
            API->>DB: UPDATE coupons<br/>SET issued_quantity = issued_quantity + 1
            API->>DB: INSERT INTO user_coupons<br/>(status = 'AVAILABLE')
            API->>DB: COMMIT
            API-->>Customer: 201 Created (쿠폰 정보)
        else 이미 발급됨
            API->>DB: ROLLBACK
            API-->>Customer: 400 Bad Request<br/>(ALREADY_ISSUED)
        end
    else 품절
        API->>DB: ROLLBACK
        API-->>Customer: 400 Bad Request<br/>(COUPON_SOLD_OUT)
    end
```

#### 시나리오 예시

```gherkin
Given 쿠폰 "COUPON_10"의 총 수량이 100개이고
And 현재 발급된 수량이 95개일 때
When 고객 "user1"이 쿠폰을 발급받으면
Then 쿠폰이 성공적으로 발급된다
And 발급 수량이 96개로 증가한다

Given 쿠폰 "COUPON_10"이 이미 품절되었을 때
When 고객이 쿠폰을 발급받으려 하면
Then 품절 에러가 반환된다

Given 고객 "user1"이 이미 쿠폰 "COUPON_10"을 발급받았을 때
When 고객 "user1"이 동일 쿠폰을 다시 발급받으려 하면
Then 중복 발급 에러가 반환된다
```

---

### US-014: 보유 쿠폰 조회

**As a** 고객  
**I want to** 내가 보유한 쿠폰을 확인하고 싶다  
**So that** 주문 시 사용할 쿠폰을 선택할 수 있다

#### 인수 기준

- [ ] 보유한 모든 쿠폰을 조회할 수 있다
- [ ] 쿠폰명, 할인율, 만료일, 사용 여부가 표시된다
- [ ] 사용 가능한 쿠폰만 필터링할 수 있다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database

    Customer->>API: GET /api/users/{userId}/coupons?status=AVAILABLE
    API->>DB: SELECT user_coupons JOIN coupons<br/>WHERE user_id = {userId}<br/>AND status = 'AVAILABLE'<br/>AND expired_at > NOW()
    DB-->>API: 쿠폰 목록
    API-->>Customer: 200 OK (보유 쿠폰)
```

#### 시나리오 예시

```gherkin
Given 고객이 3개의 쿠폰을 보유하고 있고
And 그 중 1개는 만료되었고 1개는 사용되었을 때
When 고객이 사용 가능한 쿠폰을 조회하면
Then 1개의 사용 가능한 쿠폰만 반환된다
```

---

### US-015: 쿠폰 유효성 검증

**As a** 시스템  
**I want to** 주문 시 쿠폰의 유효성을 검증하고 싶다  
**So that** 유효한 쿠폰만 사용되도록 한다

#### 인수 기준

- [ ] 만료된 쿠폰은 사용할 수 없다
- [ ] 이미 사용된 쿠폰은 재사용할 수 없다
- [ ] 다른 사용자의 쿠폰은 사용할 수 없다
- [ ] 유효하지 않은 쿠폰 사용 시 적절한 에러가 반환된다

#### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor System as 시스템
    participant API as API Server
    participant DB as Database

    Note over API: 결제 시 호출

    API->>DB: SELECT * FROM user_coupons<br/>WHERE id = {userCouponId}
    DB-->>API: 쿠폰 정보

    API->>API: Validate user_id matches
    API->>API: Validate status == 'AVAILABLE'
    API->>API: Validate expired_at > NOW()

    alt 모든 검증 통과
        API->>API: Apply discount
    else 검증 실패
        alt 만료됨
            API->>API: Return EXPIRED_COUPON error
        else 이미 사용됨
            API->>API: Return ALREADY_USED error
        else 권한 없음
            API->>API: Return INVALID_COUPON error
        end
    end
```

#### 시나리오 예시

```gherkin
Given 고객 "user1"이 쿠폰 "UC-001"을 보유하고 있고
And 쿠폰이 만료되었을 때
When 주문 시 해당 쿠폰을 적용하려 하면
Then 만료된 쿠폰 에러가 반환된다

Given 고객 "user1"이 쿠폰 "UC-002"를 이미 사용했을 때
When 동일 쿠폰을 다시 사용하려 하면
Then 이미 사용된 쿠폰 에러가 반환된다
```

---

## 부록: 전체 주문 플로우

### 전체 프로세스 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Customer as 고객
    participant API as API Server
    participant DB as Database
    participant External as 외부 시스템

    rect rgb(240, 248, 255)
        Note right of Customer: 1. 상품 탐색
        Customer->>API: GET /api/products
        API->>DB: 상품 조회
        DB-->>Customer: 상품 목록
    end

    rect rgb(255, 250, 240)
        Note right of Customer: 2. 장바구니 담기
        Customer->>API: POST /api/cart
        API->>DB: 장바구니 추가
        DB-->>Customer: 추가 완료
    end

    rect rgb(240, 255, 240)
        Note right of Customer: 3. 쿠폰 발급
        Customer->>API: POST /api/coupons/{id}/issue
        API->>DB: 쿠폰 발급 (선착순)
        DB-->>Customer: 발급 완료
    end

    rect rgb(255, 240, 245)
        Note right of Customer: 4. 주문서 생성
        Customer->>API: POST /api/orders
        API->>DB: 재고 검증 및 선점
        API->>DB: 주문서 생성 (PENDING)
        DB-->>Customer: 주문서 정보
    end

    rect rgb(245, 245, 220)
        Note right of Customer: 5. 결제 처리
        Customer->>API: POST /api/orders/{id}/payment
        API->>DB: 잔액 차감
        API->>DB: 재고 확정 차감
        API->>DB: 주문 상태 변경 (PAID)
        API->>DB: 쿠폰 사용 처리
        DB-->>Customer: 결제 완료

        API->>External: 주문 데이터 전송 (비동기)
        External-->>API: 전송 완료
    end
```

---

## 요약

본 문서는 이커머스 시스템의 **15개 사용자 스토리**를 정의하며, 각 스토리는 다음을 포함합니다:

- **사용자 관점의 목표** (As a, I want to, So that)
- **인수 기준** (Acceptance Criteria)
- **시퀀스 다이어그램** (Mermaid 기반)
- **시나리오 예시** (Gherkin 형식)

이를 통해 클라이언트와의 원활한 소통과 명확한 인수 테스트 시나리오를 확보할 수 있습니다.
