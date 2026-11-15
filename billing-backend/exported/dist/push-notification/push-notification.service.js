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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const in_app_notifications_entity_1 = require("./entity/in-app-notifications.entity");
const push_notification_gateway_1 = require("./push-notification.gateway");
const notification_logs_service_1 = require("../notification-logs/notification-logs.service");
const rxjs_1 = require("rxjs");
const axios_1 = require("@nestjs/axios");
let PushNotificationService = class PushNotificationService {
    constructor(inAppRepo, gateway, notificationLogsService, httpService) {
        this.inAppRepo = inAppRepo;
        this.gateway = gateway;
        this.notificationLogsService = notificationLogsService;
        this.httpService = httpService;
    }
    async sendInAppNotification(params) {
        const { recipient, templateVersion, renderedBody, renderContext, eventId } = params;
        await this.createNotification({
            recipientType: recipient.recipient_type,
            recipientId: recipient.recipient_id,
            eventId,
            templateVersionId: templateVersion.version_id,
            title: templateVersion.subject || 'Notification',
            message: renderedBody,
            data: renderContext,
        });
        return { success: true };
    }
    async createNotification(params) {
        const notification = this.inAppRepo.create({
            recipient_type: params.recipientType,
            recipient_id: params.recipientId,
            event_id: params.eventId,
            template_version_id: params.templateVersionId,
            title: params.title,
            message: params.message,
            data: params.data,
            is_read: false,
            created_at: new Date(),
        });
        return await this.inAppRepo.save(notification);
    }
    async getNotifications(recipientId) {
        const list = await this.inAppRepo.find({
            where: { recipient_id: recipientId },
            order: { created_at: 'DESC' },
        });
        return {
            success: true,
            message: "Notifications fetched successfully",
            data: list,
        };
    }
    async markAsRead(notificationId) {
        await this.inAppRepo.update(notificationId, {
            is_read: true,
        });
        return {
            success: true,
            message: "Notification marked as read",
        };
    }
    async getUnreadCount(recipientId) {
        const count = await this.inAppRepo.count({
            where: {
                recipient_id: recipientId,
                is_read: false,
            },
        });
        return {
            success: true,
            message: "Unread count fetched successfully",
            data: { count },
        };
    }
    resolveRedirectParams(redirectParams, renderContext = {}, eventPayload = {}) {
        if (!redirectParams)
            return null;
        if (!Array.isArray(redirectParams) && typeof redirectParams === 'object') {
            return redirectParams;
        }
        const names = Array.isArray(redirectParams)
            ? redirectParams.map((n) => String(n))
            : [String(redirectParams)];
        const resolved = {};
        for (const name of names) {
            let value = renderContext?.[name];
            if (value === undefined || value === null || value === '') {
                value = eventPayload?.[name];
            }
            if (value === undefined || value === null || value === '') {
                for (const group of Object.values(eventPayload || {})) {
                    if (group && typeof group === 'object' && !Array.isArray(group)) {
                        const candidate = group[name];
                        if (candidate !== undefined && candidate !== null && candidate !== '') {
                            value = candidate;
                            break;
                        }
                    }
                }
            }
            if (value !== undefined && value !== null && value !== '') {
                resolved[name] = value;
            }
        }
        return Object.keys(resolved).length ? resolved : null;
    }
    async processPush(data) {
        const { recipient, templateVersion, renderedBody, renderContext, eventId, organization_id, redirect_key, redirect_params, event_payload, } = data;
        console.log("🏢 Organization ID received in Push Service:", organization_id);
        const resolvedRedirectParams = this.resolveRedirectParams(redirect_params, renderContext, event_payload);
        const saved = await this.inAppRepo.save({
            recipient_type: recipient.recipient_type,
            recipient_id: recipient.recipient_id,
            event_id: eventId,
            template_version_id: templateVersion.version_id,
            title: templateVersion.subject || 'Notification',
            message: renderedBody,
            data: renderContext,
            is_read: false,
            created_at: new Date(),
        });
        const assetNotificationApi = `${process.env.ASSET_API_URL}/organizational-profile/create-notification`;
        console.log("📤 Sending notification to Asset API:", assetNotificationApi);
        let assetSaved = null;
        try {
            const assetResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.post(assetNotificationApi, {
                recipient_type: recipient.recipient_type,
                recipient_id: recipient.recipient_id,
                event_id: eventId,
                template_version_id: templateVersion.version_id,
                title: saved.title,
                message: saved.message,
                data: renderContext,
                organization_id: organization_id,
                redirect_key: redirect_key,
                redirect_params: resolvedRedirectParams,
            }));
            assetSaved = assetResponse?.data ?? null;
            console.log("✅ Notification stored in Asset Backend");
        }
        catch (error) {
            console.error("❌ Error sending notification to Asset Backend:", error?.response?.data || error.message);
        }
        await this.notificationLogsService.updateStatusByTemplateVersion(templateVersion.version_id, recipient.recipient_id, 'sent');
        const notificationId = assetSaved?.notification_id ?? saved.notification_id;
        this.gateway.emitToUser(recipient.recipient_id, {
            id: notificationId,
            notification_id: notificationId,
            title: saved.title,
            message: saved.message,
            created_at: assetSaved?.created_at ?? saved.created_at,
            is_read: false,
            event_id: eventId,
            data: renderContext,
            redirect_key: redirect_key ?? null,
            redirect_params: resolvedRedirectParams,
            organization_id: organization_id ?? null,
        }, organization_id);
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(in_app_notifications_entity_1.InAppNotifications)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        push_notification_gateway_1.PushNotificationGateway,
        notification_logs_service_1.NotificationLogsService,
        axios_1.HttpService])
], PushNotificationService);
