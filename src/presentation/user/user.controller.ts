import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from '@application/user.service';
import {
  GetBalanceResponseDto,
  GetBalanceLogsQueryDto,
  GetBalanceLogsResponseDto,
} from './dto';

/**
 * User Controller
 * 사용자 잔액 관리 API
 */
@ApiTags('Users')
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 잔액 조회 (US-004)
   * GET /api/users/:userId/balance
   */
  @Get(':userId/balance')
  @ApiOperation({
    summary: '잔액 조회',
    description: '사용자의 현재 잔액을 조회합니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: GetBalanceResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getBalance(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<GetBalanceResponseDto> {
    return await this.userService.getBalance(userId);
  }

  /**
   * 잔액 변경 이력 조회 (US-016)
   * GET /api/users/:userId/balance/logs
   */
  @Get(':userId/balance/logs')
  @ApiOperation({
    summary: '잔액 변경 이력 조회',
    description: '사용자의 잔액 변경 이력을 조회합니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: GetBalanceLogsResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 파라미터' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getBalanceLogs(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetBalanceLogsQueryDto,
  ): Promise<GetBalanceLogsResponseDto> {
    const filter = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      code: query.code,
      refId: query.refId,
      page: query.page,
      size: query.size,
    };

    return await this.userService.getBalanceLogs(userId, filter);
  }
}
