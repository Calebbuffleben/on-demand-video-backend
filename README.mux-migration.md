# MUX Migration Setup

This document outlines the steps required to migrate from Cloudflare Stream to MUX for video hosting.

## Environment Variables

Add these environment variables to your `.env` file:

```
# MUX Video
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_secret
```

## MUX Account Setup

1. Create a MUX account at [mux.com](https://mux.com)
2. Create API access credentials in the MUX dashboard
3. Set up a webhook endpoint in MUX dashboard pointing to:
   - `https://your-api-domain.com/api/webhooks/mux`
   - Set up signing secret and save it as `MUX_WEBHOOK_SECRET`

## Database Changes

The following fields have been added to support MUX integration:

### Organization Table
- `muxTokenId`: For organization-specific MUX credentials
- `muxTokenSecret`: For organization-specific MUX credentials

### Video Table
- `muxAssetId`: MUX asset identifier
- `muxPlaybackId`: MUX playback identifier
- `muxUploadId`: MUX upload identifier for tracking upload status

The `cloudflareId` field has been made optional to allow for a smooth migration.

## Testing MUX Integration

You can test the MUX integration using the following API endpoint:

```
GET /api/mux/test-connection
```

This will verify that your MUX credentials are working correctly.

## Migration Strategy

The migration will happen in multiple phases:

1. Setup & Preparation (current phase)
2. Core MUX Service Implementation
3. Integration & Testing
4. Frontend Integration
5. Controlled Rollout
6. Complete Migration & Cleanup

Each phase will be implemented progressively to ensure a smooth transition with minimal disruption to existing services. 