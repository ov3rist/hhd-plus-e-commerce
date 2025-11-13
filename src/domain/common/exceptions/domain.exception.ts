import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * 도메인 비즈니스 규칙 위반 예외
 * ErrorCode를 사용하여 비즈니스 에러를 명확히 표현
 */
export class DomainException extends Error {
  constructor(
    public readonly errorCode: (typeof ErrorCode)[keyof typeof ErrorCode],
  ) {
    super(errorCode.message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}

/**
 * 엔티티 검증 실패 예외
 * 엔티티 내부 데이터 무결성 검증 실패 시 사용
 */
export class ValidationException extends Error {
  constructor(
    public readonly errorCode: (typeof ErrorCode)[keyof typeof ErrorCode],
  ) {
    super(errorCode.message);
    this.name = 'ValidationException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}
