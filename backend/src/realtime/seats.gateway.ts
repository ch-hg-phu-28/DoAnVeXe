import { Module } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export type SeatEventStatus = 'HELD' | 'SOLD' | 'AVAILABLE';

const room = (tripId: number) => `trip:${tripId}`;

/**
 * Kênh realtime trạng thái ghế. Frontend:
 *   const s = io('http://localhost:3000/seats');
 *   s.emit('join', { tripId: 12 });
 *   s.on('seats:update', ({ tripId, seatIds, status }) => ...);
 * Khi mất kết nối rồi kết nối lại: gọi lại GET /api/trips/:id/seats để lấy trạng thái mới nhất.
 */
@WebSocketGateway({ namespace: '/seats', cors: { origin: true } })
export class SeatsGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join')
  join(@ConnectedSocket() client: Socket, @MessageBody() body: { tripId?: unknown }) {
    const tripId = Number(body?.tripId);
    if (!Number.isInteger(tripId) || tripId <= 0) return { ok: false };
    void client.join(room(tripId));
    return { ok: true };
  }

  @SubscribeMessage('leave')
  leave(@ConnectedSocket() client: Socket, @MessageBody() body: { tripId?: unknown }) {
    void client.leave(room(Number(body?.tripId)));
    return { ok: true };
  }

  emitSeats(tripId: number, seatIds: number[], status: SeatEventStatus) {
    if (!seatIds.length) return;
    this.server?.to(room(tripId)).emit('seats:update', { tripId, seatIds, status });
  }
}

@Module({ providers: [SeatsGateway], exports: [SeatsGateway] })
export class RealtimeModule {}
