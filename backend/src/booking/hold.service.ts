import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException, ErrorCode } from '../common/errors';
import { RedisService } from '../redis/redis.service';

// Chỉ xóa / gia hạn khóa khi khóa đang thuộc đúng người (so sánh và thao tác trong 1 lệnh nguyên tử).
const DEL_IF_OWNER = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
const EXPIRE_IF_OWNER = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end`;

/**
 * Giữ ghế tạm thời bằng Redis: key hold:{tripId}:{seatId} = userId, tự hết hạn sau ttl giây.
 * SET ... NX đảm bảo khi nhiều người bấm cùng một ghế, chỉ đúng 1 người giữ được.
 */
@Injectable()
export class HoldService {
  constructor(private readonly redis: RedisService) {}

  private key(tripId: number, seatId: number) {
    return `hold:${tripId}:${seatId}`;
  }

  /** Trả về id người đang giữ từng ghế (null nếu không ai giữ), theo đúng thứ tự seatIds. */
  async holders(tripId: number, seatIds: number[]): Promise<(number | null)[]> {
    if (!seatIds.length) return [];
    const values = await this.redis.client.mget(seatIds.map((id) => this.key(tripId, id)));
    return values.map((v) => (v === null ? null : Number(v)));
  }

  async ttl(tripId: number, seatId: number): Promise<number> {
    return this.redis.client.ttl(this.key(tripId, seatId));
  }

  /**
   * Giữ tất cả ghế hoặc không giữ ghế nào. Ghế người này đã giữ trước đó thì được gia hạn.
   * Nếu một ghế đã có người khác giữ → trả lại các ghế vừa giữ trong lần gọi này và báo SEAT_TAKEN.
   */
  async holdAll(tripId: number, seatIds: number[], userId: number, ttlSeconds: number): Promise<void> {
    const acquired: number[] = [];
    for (const seatId of seatIds) {
      const key = this.key(tripId, seatId);
      const ok = await this.redis.client.set(key, String(userId), 'EX', ttlSeconds, 'NX');
      if (ok === 'OK') {
        acquired.push(seatId);
        continue;
      }
      const refreshed = await this.redis.client.eval(EXPIRE_IF_OWNER, 1, key, String(userId), String(ttlSeconds));
      if (refreshed === 1) continue;

      await this.release(tripId, acquired, userId);
      throw new AppException(ErrorCode.SEAT_TAKEN, 'Ghế vừa có người khác chọn, vui lòng chọn ghế khác', HttpStatus.CONFLICT, {
        seatId,
      });
    }
  }

  /** Gia hạn các ghế người này đang giữ. Trả về số ghế gia hạn được. */
  async extend(tripId: number, seatIds: number[], userId: number, ttlSeconds: number): Promise<number> {
    let n = 0;
    for (const seatId of seatIds) {
      n += Number(await this.redis.client.eval(EXPIRE_IF_OWNER, 1, this.key(tripId, seatId), String(userId), String(ttlSeconds)));
    }
    return n;
  }

  /** Bỏ giữ các ghế của chính người này. Trả về danh sách ghế đã bỏ giữ. */
  async release(tripId: number, seatIds: number[], userId: number): Promise<number[]> {
    const released: number[] = [];
    for (const seatId of seatIds) {
      const n = await this.redis.client.eval(DEL_IF_OWNER, 1, this.key(tripId, seatId), String(userId));
      if (n === 1) released.push(seatId);
    }
    return released;
  }

  /** Xóa khóa giữ bất kể ai giữ (dùng sau khi ghế đã bán hoặc khi hệ thống hủy đơn). */
  async forceRelease(tripId: number, seatIds: number[]): Promise<void> {
    if (seatIds.length) await this.redis.client.del(...seatIds.map((id) => this.key(tripId, id)));
  }
}
