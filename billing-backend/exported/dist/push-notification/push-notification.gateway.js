"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PushNotificationGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const userRoom = (organizationId, userId) => `org:${organizationId}:user:${userId}`;
const legacyRoom = (userId) => `user:${userId}`;
const queryValue = (v) => {
    const s = Array.isArray(v) ? v[0] : v;
    if (s === undefined || s === null)
        return null;
    const t = String(s).trim();
    return t && t !== 'undefined' && t !== 'null' ? t : null;
};
let PushNotificationGateway = PushNotificationGateway_1 = class PushNotificationGateway {
    static roomFor(userId, organizationId) {
        const org = organizationId !== undefined && organizationId !== null && `${organizationId}` !== ''
            ? String(organizationId)
            : null;
        return org ? `org:${org}:user:${userId}` : `user:${userId}`;
    }
    handleConnection(client) {
        const userId = queryValue(client.handshake.query.userId);
        const organizationId = queryValue(client.handshake.query.organizationId);
        if (!userId) {
            console.warn('🔌 Socket without userId — not subscribed:', client.id);
            return;
        }
        const room = PushNotificationGateway_1.roomFor(userId, organizationId);
        client.join(room);
        console.log('🔌 Socket', client.id, 'joined', room);
    }
    handleDisconnect(client) {
        console.log('❌ WebSocket Disconnected:', client.id);
    }
    emitToUser(userId, payload, organizationId) {
        const org = queryValue(organizationId);
        const room = PushNotificationGateway_1.roomFor(userId, org);
        const listeners = this.server?.sockets?.adapter?.rooms?.get(room)?.size ?? 0;
        console.log(`🎯 Emitting bell-notification to ${room} (${listeners} socket(s))`);
        this.server.to(room).emit('bell-notification', {
            ...payload,
            organization_id: org ?? null,
        });
    }
};
exports.PushNotificationGateway = PushNotificationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PushNotificationGateway.prototype, "server", void 0);
exports.PushNotificationGateway = PushNotificationGateway = PushNotificationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        path: '/socket.io',
        transports: ['polling', 'websocket'],
    })
], PushNotificationGateway);
