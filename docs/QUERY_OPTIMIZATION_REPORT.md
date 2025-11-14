# 데이터베이스 조회 성능 계획 보고서

## 📋 목차

1. [개요](#개요)
2. [성능 저하 원인 분석](#성능-저하-원인-분석)
3. [최적화 방안](#최적화-방안)
4. [실행 계획 분석](#실행-계획-분석)
5. [결론](#결론)

---

## 개요

본 보고서는 E-Commerce 플랫폼의 데이터베이스 조회 성능 저하 원인을 분석하고, 쿼리 재설계 및 인덱스 전략을 통한 최적화 방안을 제시합니다.

### 분석 대상

- **애플리케이션**: E-Commerce 주문/결제 시스템
- **데이터베이스**: MySQL (Prisma ORM 사용)
- **주요 기능**: 장바구니, 주문, 쿠폰, 상품 조회

### 핵심 문제점

1. **N+1 쿼리 문제**: 반복적인 개별 조회로 인한 성능 저하
2. **인덱스 미최적화**: 복합 인덱스 부재로 인한 Full Table Scan
3. **정렬 연산 비효율**: ORDER BY 절에 대한 인덱스 미지원

---

## 성능 저하 원인 분석

### 1. N+1 쿼리 문제

#### 1.1. 장바구니 조회 (CartFacade.getCartView)

**위치**: `src/application/facades/cart.facade.ts`

**문제점**:

```typescript
// 1번: 장바구니 아이템 조회
const cartItems = await this.cartService.getCart(userId);

// N번: 각 아이템마다 상품옵션 조회
const productOptions = await Promise.all(
  optionIds.map((id) => this.productService.getProductOption(id)),
);

// M번: 각 옵션마다 상품 정보 조회
const products = await Promise.all(
  productIds.map((id) => this.productService.getProduct(id)),
);
```

**쿼리 횟수**:

- 장바구니 아이템이 10개인 경우: `1 + 10 + 10 = 21번의 쿼리`
- 장바구니 아이템이 100개인 경우: `1 + 100 + 100 = 201번의 쿼리`

**성능 영향**:

- 시간 복잡도: O(n) - 선형적으로 증가
- 네트워크 오버헤드: 각 쿼리마다 DB 왕복 시간 발생
- 응답 시간: 사용자 체감 지연 발생

#### 1.2. 사용자 쿠폰 조회 (CouponFacade.getUserCoupons)

**위치**: `src/application/facades/coupon.facade.ts`

**문제점**:

```typescript
// 1번: 사용자 쿠폰 조회
const userCoupons = await this.couponService.getUserCoupons(userId);

// N번: 각 쿠폰마다 쿠폰 상세 정보 조회
const coupons = await Promise.all(
  couponIds.map((id) => this.couponService.getCoupon(id)),
);
```

**쿼리 횟수**:

- 보유 쿠폰이 5개인 경우: `1 + 5 = 6번의 쿼리`
- 보유 쿠폰이 50개인 경우: `1 + 50 = 51번의 쿼리`

---

### 2. 인덱스 최적화 필요 케이스

#### 2.1. 주문 내역 조회 (OrderRepository.findManyByUserId)

**위치**: `src/infrastructure/repositories/prisma/order.repository.ts`

**현재 쿼리**:

```sql
SELECT * FROM orders
WHERE user_id = ?
ORDER BY created_at DESC;
```

**현재 인덱스**:

```sql
INDEX idx_user_id (user_id)
INDEX idx_created_at (created_at)
```

**문제점**:

- `user_id` 인덱스로 WHERE 절은 효율적으로 처리
- 하지만 ORDER BY를 위해 **추가 정렬 연산(filesort)** 필요
- 인덱스 스캔 → 메모리 정렬 → 결과 반환 (2단계 처리)

**EXPLAIN 분석**:

```
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-----------------------------+
| id | select_type | table  | type | possible_keys | key         | key_len | ref   | rows | Extra                       |
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-----------------------------+
|  1 | SIMPLE      | orders | ref  | idx_user_id   | idx_user_id | 4       | const | 100  | Using filesort              |
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-----------------------------+
```

#### 2.2. 인기 상품 조회 (ProductPopularitySnapshotRepository.findTop)

**위치**: `src/infrastructure/repositories/prisma/product.repository.ts`

**현재 쿼리**:

```sql
-- 1번 쿼리: 최신 스냅샷 시간 조회
SELECT created_at FROM product_popularity_snapshot
ORDER BY created_at DESC
LIMIT 1;

-- 2번 쿼리: 해당 시간의 Top N 상품 조회
SELECT * FROM product_popularity_snapshot
WHERE created_at = ?
ORDER BY rank ASC
LIMIT ?;
```

**현재 인덱스**:

```sql
INDEX idx_created_at (created_at)
INDEX idx_rank (rank)
```

**문제점**:

- 두 번의 쿼리 실행 (2 Round-trip)
- 두 번째 쿼리에서 `WHERE created_at = ?`와 `ORDER BY rank`를 별도 인덱스로 처리
- 복합 조건에 대한 최적화 부재

**EXPLAIN 분석 (2번째 쿼리)**:

```
+----+-------------+-------------------------------+------+------------------+------------------+---------+-------+------+-----------------------------+
| id | select_type | table                         | type | possible_keys    | key              | key_len | ref   | rows | Extra                       |
+----+-------------+-------------------------------+------+------------------+------------------+---------+-------+------+-----------------------------+
|  1 | SIMPLE      | product_popularity_snapshot   | ref  | idx_created_at   | idx_created_at   | 6       | const | 50   | Using where; Using filesort |
+----+-------------+-------------------------------+------+------------------+------------------+---------+-------+------+-----------------------------+
```

#### 2.3. 잔액 변경 로그 조회 (UserBalanceChangeLogRepository.findByUserId)

**위치**: `src/infrastructure/repositories/prisma/user.repository.ts`

**현재 쿼리**:

```sql
SELECT * FROM user_balance_change_log
WHERE user_id = ?
ORDER BY created_at DESC;
```

**현재 인덱스**:

```sql
INDEX idx_user_id (user_id)
```

**문제점**:

- 주문 내역 조회와 동일한 패턴
- ORDER BY를 위한 filesort 발생
- 로그 데이터는 계속 증가하므로 시간이 지날수록 성능 저하 심화

---

### 3. 쿼리 패턴별 성능 저하 요약

| 쿼리 패턴            | 발생 위치                           | 문제 유형       | 영향도  |
| -------------------- | ----------------------------------- | --------------- | ------- |
| N+1 쿼리 (장바구니)  | CartFacade                          | 반복 조회       | 🔴 높음 |
| N+1 쿼리 (쿠폰)      | CouponFacade                        | 반복 조회       | 🟡 중간 |
| ORDER BY (주문)      | OrderRepository                     | 정렬 연산       | 🟡 중간 |
| ORDER BY (로그)      | UserBalanceChangeLogRepository      | 정렬 연산       | 🟠 중상 |
| 복합 조회 (인기상품) | ProductPopularitySnapshotRepository | 2번 쿼리 + 정렬 | 🟡 중간 |

---

## 최적화 방안

### 1. N+1 쿼리 해결 방안

#### 방안 : IN 절을 활용한 일괄 조회 (Raw SQL은 본 프로젝트에서 지양)

**적용 대상**: 장바구니 조회, 쿠폰 조회

**구현 방법**:

1. Repository에 일괄 조회 메서드 추가:

```typescript
// ProductOptionRepository
async findManyByIds(ids: number[]): Promise<ProductOption[]> {
  const records = await this.prismaClient.product_options.findMany({
    where: { id: { in: ids } }
  });
  return records.map(record => this.mapToDomain(record));
}

// ProductRepository
async findManyByIds(ids: number[]): Promise<Product[]> {
  const records = await this.prismaClient.products.findMany({
    where: { id: { in: ids } }
  });
  return records.map(record => this.mapToDomain(record));
}
```

2. Facade에서 활용:

```typescript
// CartFacade.getCartView() 개선
async getCartView(userId: number): Promise<CartItemView[]> {
  const cartItems = await this.cartService.getCart(userId);
  const optionIds = cartItems.map(item => item.productOptionId);

  // ✅ N번 → 1번 쿼리로 개선
  const productOptions = await this.productService.getProductOptionsByIds(optionIds);
  const productIds = [...new Set(productOptions.map(opt => opt.productId))];
  const products = await this.productService.getProductsByIds(productIds);

  // 매핑 로직...
}
```

**SQL 변환**:

```sql
-- Before: N번 실행
SELECT * FROM product_options WHERE id = 1;
SELECT * FROM product_options WHERE id = 2;
...

-- After: 1번 실행
SELECT * FROM product_options WHERE id IN (1, 2, 3, ...);
```

**성능 개선**:

- 장바구니 10개: `21번 쿼리 → 3번 쿼리` (86% 감소)
- 장바구니 100개: `201번 쿼리 → 3번 쿼리` (98.5% 감소)

---

### 2. 인덱스 설계 전략

#### 2.1. 복합 인덱스 (Composite Index) 설계

**원칙**:

1. WHERE 절의 컬럼을 먼저 배치
2. ORDER BY 절의 컬럼을 다음에 배치
3. 선택도(Selectivity)가 높은 컬럼을 앞에 배치

**적용 사례 1: 주문 내역 조회**

```sql
-- 기존
CREATE INDEX idx_user_id ON orders(user_id);
CREATE INDEX idx_created_at ON orders(created_at);

-- 개선: 복합 인덱스
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- 기존 단일 인덱스 제거 고려
DROP INDEX idx_created_at ON orders;
```

**효과**:

```
-- Before
Extra: Using where; Using filesort

-- After
Extra: Using index
```

- filesort 연산 제거
- 인덱스 스캔만으로 정렬된 결과 반환
- 메모리 사용량 감소

**적용 사례 2: 잔액 변경 로그 조회**

```sql
CREATE INDEX idx_balance_log_user_created
ON user_balance_change_log(user_id, created_at DESC);
```

**추가 고려사항**:

```typescript
// 페이징 추가 권장
async findByUserId(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<UserBalanceChangeLog[]> {
  const records = await this.prismaClient.user_balance_change_log.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: limit,
    skip: offset
  });
  return records.map(record => this.mapToDomain(record));
}
```

---

#### 2.2. Covering Index 전략

**개념**: SELECT 절의 모든 컬럼을 인덱스에 포함하여 테이블 접근 없이 결과 반환

**적용 사례: 인기 상품 조회 최적화**

```sql
-- 현재
CREATE INDEX idx_created_at ON product_popularity_snapshot(created_at);
CREATE INDEX idx_rank ON product_popularity_snapshot(rank);

-- 개선: Covering Index with 복합 인덱스
CREATE INDEX idx_snapshot_created_rank
ON product_popularity_snapshot(created_at DESC, rank ASC);
```

**쿼리 개선**:

```sql
-- Before: 2번 쿼리
SELECT created_at FROM product_popularity_snapshot
ORDER BY created_at DESC LIMIT 1;

SELECT * FROM product_popularity_snapshot
WHERE created_at = '2025-11-14 10:00:00'
ORDER BY rank ASC LIMIT 5;

-- After: 1번 쿼리로 최적화 가능
SELECT * FROM product_popularity_snapshot
WHERE created_at = (
  SELECT MAX(created_at) FROM product_popularity_snapshot
)
ORDER BY rank ASC LIMIT 5;
```

**Repository 개선**:

```typescript
async findTop(count: number): Promise<ProductPopularitySnapshot[]> {
  // 단일 쿼리로 최적화
  const records = await this.prismaClient.$queryRaw`
    SELECT * FROM product_popularity_snapshot
    WHERE created_at = (
      SELECT MAX(created_at) FROM product_popularity_snapshot
    )
    ORDER BY rank ASC
    LIMIT ${count}
  `;
  return records.map(record => this.mapToDomain(record));
}
```

**EXPLAIN 분석 (개선 후)**:

```
+----+-------------+-------------------------------+-------+---------------------------+---------------------------+---------+------+------+--------------------------+
| id | select_type | table                         | type  | possible_keys             | key                       | key_len | ref  | rows | Extra                    |
+----+-------------+-------------------------------+-------+---------------------------+---------------------------+---------+------+------+--------------------------+
|  1 | PRIMARY     | product_popularity_snapshot   | range | idx_snapshot_created_rank | idx_snapshot_created_rank | 6       | NULL | 5    | Using where; Using index |
+----+-------------+-------------------------------+-------+---------------------------+---------------------------+---------+------+------+--------------------------+
```

---

### 3. 인덱스 설계 요약표

| 테이블                        | 현재 인덱스                       | 추가/변경 인덱스                                         | 목적                     | 우선순위 |
| ----------------------------- | --------------------------------- | -------------------------------------------------------- | ------------------------ | -------- |
| `orders`                      | `idx_user_id`<br>`idx_created_at` | `idx_orders_user_created(user_id, created_at DESC)`      | ORDER BY 최적화          | 🔴 높음  |
| `user_balance_change_log`     | `idx_user_id`                     | `idx_balance_log_user_created(user_id, created_at DESC)` | ORDER BY 최적화 + 페이징 | 🟠 중상  |
| `product_popularity_snapshot` | `idx_created_at`<br>`idx_rank`    | `idx_snapshot_created_rank(created_at DESC, rank ASC)`   | 복합 조회 최적화         | 🟡 중간  |
| `order_items`                 | `idx_order_id`                    | (선택) Covering Index 검토                               | 대용량 시 고려           | 🟢 낮음  |

---

### 4. 인덱스 생성 SQL

```sql
-- 1. 주문 내역 조회 최적화
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at DESC);

-- 2. 잔액 변경 로그 조회 최적화
CREATE INDEX idx_balance_log_user_created
ON user_balance_change_log(user_id, created_at DESC);

-- 3. 인기 상품 스냅샷 조회 최적화
CREATE INDEX idx_snapshot_created_rank
ON product_popularity_snapshot(created_at DESC, rank ASC);

-- 4. (선택사항) 불필요한 단일 인덱스 제거 검토
-- 복합 인덱스가 단일 컬럼 조회도 커버하는지 확인 후 진행
-- DROP INDEX idx_created_at ON orders;
```

---

## 실행 계획 분석

### 분석 방법

```sql
-- 쿼리 실행 계획 확인
EXPLAIN SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;

-- 상세 분석 (MySQL 8.0+)
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

### 주요 지표 해석

| 항목              | 의미               | 좋은 값                  | 나쁜 값                             |
| ----------------- | ------------------ | ------------------------ | ----------------------------------- |
| **type**          | 조인 타입          | `const`, `eq_ref`, `ref` | `ALL` (Full Scan)                   |
| **possible_keys** | 사용 가능한 인덱스 | 여러 개 존재             | NULL                                |
| **key**           | 실제 사용된 인덱스 | 적절한 인덱스 선택       | NULL                                |
| **rows**          | 스캔할 예상 행 수  | 적을수록 좋음            | 전체 테이블 행 수                   |
| **Extra**         | 추가 정보          | `Using index`            | `Using filesort`, `Using temporary` |

### 케이스별 실행 계획 비교

#### Case 1: 주문 내역 조회

**개선 전**:

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

```
+------+------+---------------+------+--------------+
| type | key  | rows          | Extra                       |
+------+------+---------------+------+-----------------------------+
| ref  | idx_user_id | 100  | Using where; Using filesort |
+------+------+---------------+------+-----------------------------+
```

- ❌ `Using filesort`: 정렬을 위한 추가 연산 필요
- 비용: Index Scan + Sort = 높음

**개선 후**:

```sql
-- idx_orders_user_created(user_id, created_at DESC) 추가 후
```

```
+------+--------------------------+------+-------------+
| type | key                      | rows | Extra       |
+------+--------------------------+------+-------------+
| ref  | idx_orders_user_created  | 100  | Using index |
+------+--------------------------+------+-------------+
```

- ✅ `Using index`: 인덱스만으로 쿼리 완결
- 비용: Index Scan only = 낮음

---

#### Case 2: 인기 상품 조회

**개선 전**:

```sql
EXPLAIN SELECT * FROM product_popularity_snapshot
WHERE created_at = '2025-11-14' ORDER BY rank;
```

```
+------+------------------+------+-----------------------------+
| type | key              | rows | Extra                       |
+------+------------------+------+-----------------------------+
| ref  | idx_created_at   | 50   | Using where; Using filesort |
+------+------------------+------+-----------------------------+
```

**개선 후**:

```sql
-- idx_snapshot_created_rank(created_at DESC, rank ASC) 추가 후
```

```
+-------+---------------------------+------+--------------------------+
| type  | key                       | rows | Extra                    |
+-------+---------------------------+------+--------------------------+
| range | idx_snapshot_created_rank | 5    | Using where; Using index |
+-------+---------------------------+------+--------------------------+
```

---

### 실행 계획 분석 체크리스트

- [ ] `type`이 `ALL`이 아닌가? (Full Table Scan 확인)
- [ ] `key`가 적절한 인덱스를 사용하는가?
- [ ] `rows`가 합리적인 범위인가?
- [ ] `Extra`에 `Using filesort`가 없는가?
- [ ] `Extra`에 `Using temporary`가 없는가?
- [ ] `Extra`에 `Using index`가 있는가? (Covering Index)

---

## 결론

### 개선 효과 예상치

| 항목                  | 개선 전              | 개선 후         | 개선율   |
| --------------------- | -------------------- | --------------- | -------- |
| 장바구니 조회 (10개)  | 21 queries           | 3 queries       | 86% ↓    |
| 장바구니 조회 (100개) | 201 queries          | 3 queries       | 98.5% ↓  |
| 쿠폰 목록 조회 (5개)  | 6 queries            | 2 queries       | 67% ↓    |
| 주문 내역 조회        | filesort 발생        | index only      | 40-60% ↓ |
| 인기 상품 조회        | 2 queries + filesort | 1 query + index | 50-70% ↓ |

### 우선순위별 적용 로드맵

#### Phase 1: 긴급

1. **장바구니 조회 N+1 해결** - IN 절 활용
2. **주문 내역 인덱스 추가** - 복합 인덱스

#### Phase 2: 중요

3. **쿠폰 조회 N+1 해결** - IN 절 활용
4. **잔액 로그 인덱스 추가** - 복합 인덱스 + 페이징

#### Phase 3: 개선

5. **인기 상품 조회 최적화** - 단일 쿼리 + 복합 인덱스
6. **장바구니 JOIN 최적화** - 고트래픽 시 적용

### 모니터링 지표

최적화 후 다음 지표를 지속적으로 모니터링해야 합니다:

```sql
-- Slow Query Log 확인
SELECT * FROM mysql.slow_log
WHERE query_time > 1
ORDER BY start_time DESC LIMIT 10;

-- 인덱스 사용률 확인
SELECT
  table_name,
  index_name,
  cardinality
FROM information_schema.statistics
WHERE table_schema = 'ecommerce_db';
```

### 추가 고려사항

1. **인덱스 크기 관리**
   - 복합 인덱스 추가 시 스토리지 증가 모니터링
   - 사용하지 않는 인덱스 정기 검토 및 제거

2. **쿼리 캐싱**
   - Redis를 활용한 자주 조회되는 데이터 캐싱
   - 인기 상품, 쿠폰 정보 등

3. **읽기 전용 복제본**
   - 조회 부하 분산을 위한 Read Replica 고려
   - 주문 내역, 로그 조회 등을 복제본으로 분리

4. **페이징 필수 적용**
   - 계속 증가하는 데이터(로그, 주문 내역)는 반드시 페이징
   - 무한 스크롤 또는 페이지네이션 구현
