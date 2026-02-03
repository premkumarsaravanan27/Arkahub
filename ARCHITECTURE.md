# EnergyGrid Data Aggregator - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EnergyGrid Data Aggregator                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│   Client Application │                    │   Mock API Server    │
│   (Node.js)          │                    │   (Express.js)       │
│                      │                    │                      │
│  ┌────────────────┐  │                    │  ┌────────────────┐  │
│  │  index.js      │  │                    │  │  server.js     │  │
│  │  (Main Entry)  │  │                    │  │                │  │
│  └────────┬───────┘  │                    │  │ • Rate Limiter │  │
│           │          │                    │  │ • Signature    │  │
│           ▼          │                    │  │   Validator    │  │
│  ┌────────────────┐  │    HTTP POST       │  │ • Telemetry    │  │
│  │  client.js     │  │   with Signature   │  │   Generator    │  │
│  │                │  │ ─────────────────► │  │                │  │
│  │ • Queue        │  │                    │  └────────────────┘  │
│  │ • Rate Limiter │  │                    │                      │
│  │ • Retry Logic  │  │ ◄───────────────── │  Port: 3000         │
│  └────────┬───────┘  │   JSON Response    │  Rate: 1 req/sec    │
│           │          │                    │  Batch: 10 devices  │
│           ▼          │                    └──────────────────────┘
│  ┌────────────────┐  │
│  │  utils.js      │  │
│  │                │  │
│  │ • MD5 Sign     │  │
│  │ • Batching     │  │
│  │ • Config       │  │
│  └────────────────┘  │
│                      │
│  Output: JSON file   │
└──────────────────────┘
```

## Data Flow

```
Step 1: Generate Serial Numbers
┌─────────────────────────────────┐
│ Generate 500 Serial Numbers     │
│ SN-000, SN-001, ..., SN-499     │
└────────────┬────────────────────┘
             │
             ▼
Step 2: Batch Creation
┌─────────────────────────────────┐
│ Split into 50 batches of 10     │
│ Batch 1: [SN-000 ... SN-009]    │
│ Batch 2: [SN-010 ... SN-019]    │
│ ...                             │
│ Batch 50: [SN-490 ... SN-499]   │
└────────────┬────────────────────┘
             │
             ▼
Step 3: Queue Processing (Sequential)
┌─────────────────────────────────┐
│ For each batch:                 │
│   1. Generate signature         │
│   2. Make HTTP POST request     │
│   3. Wait for response          │
│   4. Handle errors/retry        │
│   5. Wait for rate limit        │
│   6. Move to next batch         │
└────────────┬────────────────────┘
             │
             ▼
Step 4: Aggregation
┌─────────────────────────────────┐
│ Collect all responses           │
│ Aggregate device data           │
│ Calculate statistics            │
└────────────┬────────────────────┘
             │
             ▼
Step 5: Output
┌─────────────────────────────────┐
│ Save to JSON file               │
│ Display summary                 │
└─────────────────────────────────┘
```

## Request Flow Detail

```
Client                                          Server
  │                                               │
  │  1. Create batch [SN-000 ... SN-009]         │
  │                                               │
  │  2. Generate timestamp                       │
  │     timestamp = Date.now()                   │
  │                                               │
  │  3. Generate signature                       │
  │     sig = MD5(url + token + timestamp)       │
  │                                               │
  │  4. Send POST request                        │
  ├──────────────────────────────────────────────►│
  │     Headers:                                  │
  │       Signature: [sig]                        │
  │       Timestamp: [timestamp]                  │
  │     Body:                                     │
  │       { serialNumbers: [...] }                │
  │                                               │
  │                                          5. Validate
  │                                             signature
  │                                               │
  │                                          6. Check rate
  │                                             limit
  │                                               │
  │                                          7. Generate
  │                                             telemetry
  │                                               │
  │  8. Receive response                          │
  │◄──────────────────────────────────────────────┤
  │     {                                         │
  │       success: true,                          │
  │       data: [...]                             │
  │     }                                         │
  │                                               │
  │  9. Wait 1 second (rate limit)               │
  │                                               │
  │  10. Process next batch                      │
  │                                               │
```

## Rate Limiting Mechanism

```
Time (seconds)    Action
─────────────────────────────────────────────────
0.0               Request 1 sent
0.5               Request 1 response received
1.0               Wait complete → Request 2 sent
1.5               Request 2 response received
2.0               Wait complete → Request 3 sent
...
49.0              Request 50 sent
49.5              Request 50 response received
50.0              All requests complete
```

## Error Handling Flow

```
┌─────────────────┐
│  Make Request   │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ Success?│
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    │         ▼
    │    ┌─────────────┐
    │    │ Retry < 3?  │
    │    └──────┬──────┘
    │           │
    │      ┌────┴────┐
    │      │         │
    │     Yes       No
    │      │         │
    │      │         ▼
    │      │    ┌─────────┐
    │      │    │  Log    │
    │      │    │  Error  │
    │      │    └─────────┘
    │      │
    │      ▼
    │  ┌──────────────┐
    │  │ Wait 2 sec   │
    │  └──────┬───────┘
    │         │
    │         └──────┐
    │                │
    ▼                ▼
┌────────────────────┐
│  Continue to Next  │
│      Batch         │
└────────────────────┘
```

## Component Responsibilities

```
┌─────────────────────────────────────────────────────────┐
│ index.js (Main Application)                             │
├─────────────────────────────────────────────────────────┤
│ • Orchestrate the entire process                        │
│ • Generate serial numbers                               │
│ • Display progress and results                          │
│ • Save output to file                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ client.js (API Client)                                  │
├─────────────────────────────────────────────────────────┤
│ • Manage request queue                                  │
│ • Implement rate limiting                               │
│ • Handle retries and errors                             │
│ • Track statistics                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ utils.js (Utilities)                                    │
├─────────────────────────────────────────────────────────┤
│ • Generate MD5 signatures                               │
│ • Create serial numbers                                 │
│ • Chunk arrays for batching                             │
│ • Store configuration                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ server.js (Mock API)                                    │
├─────────────────────────────────────────────────────────┤
│ • Enforce rate limits                                   │
│ • Validate signatures                                   │
│ • Generate mock telemetry data                          │
│ • Return appropriate responses                          │
└─────────────────────────────────────────────────────────┘
```

## Configuration

```
┌──────────────────────────────────────┐
│ API Configuration                    │
├──────────────────────────────────────┤
│ URL:        localhost:3000           │
│ Token:      interview_token_123      │
│ Rate Limit: 1 request/second         │
│ Batch Size: 10 devices               │
│ Max Retry:  3 attempts               │
│ Backoff:    2000ms                   │
└──────────────────────────────────────┘
```

## Performance Metrics

```
┌─────────────────────────────────────────────┐
│ Metric              │ Value                 │
├─────────────────────┼───────────────────────┤
│ Total Devices       │ 500                   │
│ Batch Size          │ 10                    │
│ Total Batches       │ 50                    │
│ Rate Limit          │ 1 req/sec             │
│ Expected Time       │ ~50 seconds           │
│ Actual Time         │ ~100 seconds          │
│ Success Rate        │ 100%                  │
│ Throughput          │ ~10 devices/sec       │
└─────────────────────┴───────────────────────┘
```
