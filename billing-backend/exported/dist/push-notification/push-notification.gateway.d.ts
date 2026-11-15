import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class PushNotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    static roomFor(userId: string | number, organizationId?: string | number | null): string;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    emitToUser(userId: string | number, payload: any, organizationId?: string | number | null): void;
}
