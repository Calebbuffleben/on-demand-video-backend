export interface WebhookEvent {
    type: string;
    data: any;
    object: string;
    id: string;
}
