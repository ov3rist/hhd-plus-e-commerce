# E-Commerce 시스템

## 📌 프로젝트 개요

레이어드 아키텍처 기반 전자상거래 시스템 구현

### 폴더 구조

```
src/
├── presentation/          # API 계층
│   ├── cart/             # 장바구니 컨트롤러, DTO
│   ├── coupon/           # 쿠폰 컨트롤러, DTO
│   ├── order/            # 주문 컨트롤러, DTO
│   ├── product/          # 상품 컨트롤러, DTO
│   ├── user/             # 사용자 컨트롤러, DTO
│   └── common/           # 공통 미들웨어, Exception 필터 미들웨어 정의
│
├── application/           # 유스케이스 계층
│   ├── *.service.ts      # 비즈니스 로직 서비스
│   └── interfaces/       # 리포지토리 인터페이스 정의
│
├── domain/                # 도메인 계층
│   ├── cart/             # 장바구니 엔티티
│   ├── coupon/           # 쿠폰, 사용자쿠폰 엔티티
│   ├── order/            # 주문, 주문상품 엔티티
│   ├── product/          # 상품, 상품옵션, 인기상품스냅샷 엔티티
│   ├── user/             # 사용자, 잔액변경로그 엔티티
│   └── common/           # 공통 Exception 클래스 정의, 상수
│
└── infrastructure/        # 인프라 계층
    ├── common/           # 인프라 유틸 (MutexManager)
    ├── modules/          # NestJS 모듈 설정
    ├── repositories/     # 인메모리 리포지토리 구현체
    └── schedulers/       # 배치 스케줄러
```

**계층별 역할:**

- **Presentation**: HTTP 요청/응답 처리, DTO 변환
- **Application**: 유스케이스 조합, 트랜잭션 경계
- **Domain**: 핵심 비즈니스 규칙 및 엔티티
- **Infrastructure**: 외부 의존성 (Repository, Module)

## ⏰ 배치 스케줄러

### 1. 인기 상품 스냅샷 (매일 자정)

- 최근 3일간 결제 완료된 주문 기준 Top 5 집계
- 판매량 동일 시 최근 결제 상품 우선 정렬

### 2. 주문 만료 처리 (30초마다)

- 10분 미결제 주문 자동 만료
- 선점 재고 자동 해제

### ⚠️ 분산 환경 제약사항

현재 배치 스케줄러는 **단일 서버 인스턴스에서만 안전하게 작동**합니다.

## 🔒 동시성 제어

### 구현 방식: Mutex 기반 Lock

**적용 대상:**

- 사용자 잔액 변경 (UserRepository)
- 상품 재고 변경 (ProductOptionRepository)
- 쿠폰 발급 수량 관리 (CouponRepository)

### 구현 세부사항

```typescript
// MutexManager: ID별 Mutex 관리
private readonly mutexManager = new MutexManager();

async save(entity: Entity): Promise<Entity> {
  const unlock = await this.mutexManager.acquire(entityId);
  try {
    // 크리티컬 섹션: 데이터 읽기/쓰기
  } finally {
    unlock(); // 반드시 락 해제
  }
}
```

**동작 원리:**

1. 리소스 ID별로 독립적인 Mutex 생성 및 관리
2. 동일 ID에 대한 동시 요청은 직렬화 (순차 처리)
3. 다른 ID는 병렬 처리 가능
4. 사용 완료 후 자동 정리 (메모리 최적화)

### ⚠️ **중요: 한계점 및 실무 적용 시 주의사항**

#### 1. **트랜잭션 미지원**

현재 인메모리 구현은 **트랜잭션(Transaction)을 보장하지 않습니다.**

**문제 상황 예시:**

```typescript
// 주문 생성 시나리오
1. 재고 차감 ✅
2. 잔액 차감 ✅
3. 주문 생성 ❌ (실패)
// → 재고와 잔액은 이미 차감되었으나 주문은 생성되지 않음
// → 데이터 불일치 발생!
```

**해결 방법:**

- 실무에서는 **데이터베이스 트랜잭션 필수**
- ACID 속성 보장 필요
- Rollback 메커니즘 구현 필요

#### 2. **데이터베이스 사용 필수**

**현재 구현 (인메모리)의 한계:**

- ❌ 서버 재시작 시 데이터 손실
- ❌ 다중 서버 환경에서 동시성 제어 불가능
- ❌ 트랜잭션 보장 안 됨
- ❌ Durability(영속성) 없음

**실무 환경 필수 요구사항:**

- ✅ **관계형 데이터베이스 필수** (PostgreSQL, MySQL 등)
- ✅ **데이터베이스 레벨 Lock** (SELECT FOR UPDATE, Optimistic/Pessimistic Lock)
- ✅ **트랜잭션 격리 수준** 설정 (Isolation Level)
- ✅ **분산 환경 고려** (Redis Lock, DB Lock 등)

#### 3. **분산 환경 미지원**

현재 Mutex는 **단일 서버 인스턴스 내에서만 작동**합니다.

**다중 서버 환경에서 필요한 것:**

```
Server 1 ─┐
Server 2 ─┼─→ Redis Lock / Database Lock
Server 3 ─┘
```

### 실무 전환 체크리스트

프로덕션 환경 배포 전 반드시 구현해야 할 사항:

- [ ] **데이터베이스 도입** (PostgreSQL/MySQL)
- [ ] **트랜잭션 적용** (@Transactional 또는 BEGIN/COMMIT)
- [ ] **DB 락 메커니즘** (SELECT FOR UPDATE, Row Lock)
- [ ] **분산 락** (Redis, Redlock 등)
- [ ] **재시도 로직** (Retry with Exponential Backoff)
- [ ] **데드락 감지 및 해결**
- [ ] **모니터링 및 알림** (Lock 대기 시간, 타임아웃)

## 📊 **테스트 및 품질**

| 항목            | 결과   |
| --------------- | ------ |
| 테스트 커버리지 | 57.82% |
| 단위 테스트     | 16개   |
| 통합 테스트     | 5개    |
| 동시성 테스트   | 통과   |
