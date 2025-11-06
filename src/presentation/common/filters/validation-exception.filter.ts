import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationException } from '@domain/common/exceptions';

/**
 * Validation Exception Filter
 * 엔티티 검증 실패 예외를 HTTP 응답으로 변환
 */
@Catch(ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      errorCode: 'VALIDATION_ERROR',
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
