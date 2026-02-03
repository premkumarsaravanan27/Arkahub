# EnergyGrid Data Aggregator - Client Application

A robust Node.js client application to fetch real-time telemetry data from 500 solar inverters via the EnergyGrid API, with intelligent rate limiting, batching, and error handling.

## Features

✅ **Intelligent Rate Limiting**: Respects strict 1 request/second limit using queue-based processing  
✅ **Optimal Batching**: Automatically batches requests (10 devices per request) to minimize total requests  
✅ **Secure Authentication**: Implements MD5 signature generation for API security  
✅ **Robust Error Handling**: Automatic retry logic with exponential backoff  
✅ **Progress Tracking**: Real-time console output showing progress and statistics  
✅ **Data Persistence**: Saves aggregated results to JSON file  
✅ **Clean Architecture**: Modular code structure separating concerns  

## Architecture

```
client/
├── src/
│   ├── index.js      # Main application entry point
│   ├── client.js     # EnergyGrid API client with rate limiting
│   ├── utils.js      # Utility functions and configuration
│   └── test.js       # Test suite
├── output/           # Generated output files (created at runtime)
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## How It Works

### 1. **Serial Number Generation**
Generates 500 unique serial numbers (`SN-000` to `SN-499`)

### 2. **Batching Strategy**
- Splits 500 devices into 50 batches of 10 devices each
- Minimizes total requests while respecting API batch limit

### 3. **Rate Limiting Implementation**
- Uses a **queue-based approach** to process batches sequentially
- Measures elapsed time for each request
- Enforces minimum 1-second interval between requests
- Prevents HTTP 429 errors

### 4. **Signature Generation**
```javascript
Signature = MD5(URL + Token + Timestamp)
```
- Generates fresh signature for each request
- Includes current timestamp for security

### 5. **Error Handling & Retry Logic**
- Catches network errors and API errors
- Automatically retries failed requests (up to 3 attempts)
- Uses exponential backoff (2 seconds between retries)
- Continues processing even if individual batches fail

## Installation

```bash
cd client
npm install
```

## Usage

### Prerequisites
Make sure the mock API server is running:
```bash
cd ../mock-api
npm install
npm start
```

### Run the Client
```bash
npm start
```

### Run Tests
```bash
npm test
```

## Configuration

Edit `src/utils.js` to customize settings:

```javascript
const config = {
  apiUrl: 'http://localhost:3000/device/real/query',
  token: 'interview_token_123',
  rateLimit: {
    requestsPerSecond: 1,
    intervalMs: 1000
  },
  batchSize: 10,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000
  }
};
```

## Output

### Console Output
The application provides detailed progress information:
- Batch processing status (e.g., `[1/50] Fetching data...`)
- Success/failure indicators
- Rate limiting wait times
- Final statistics summary

### JSON Output
Results are saved to `output/telemetry_[timestamp].json`:

```json
{
  "success": true,
  "totalDevices": 500,
  "devices": [
    {
      "serialNumber": "SN-000",
      "timestamp": "2026-02-03T18:06:32.000Z",
      "power": 4523,
      "voltage": 235,
      "current": "18.45",
      "temperature": "42.3",
      "efficiency": "98.76",
      "status": "online"
    }
  ],
  "errors": [],
  "statistics": {
    "totalRequests": 50,
    "successfulRequests": 50,
    "failedRequests": 0,
    "retriedRequests": 0,
    "totalDevices": 500,
    "totalBatches": 50,
    "duration": 50234,
    "averageRequestTime": 1004.68
  }
}
```

## Performance

- **Total Devices**: 500
- **Total Batches**: 50 (10 devices per batch)
- **Expected Duration**: ~50 seconds (1 request/second)
- **Throughput**: ~10 devices/second (via batching)

## Code Quality

### Modular Design
- **`client.js`**: API client logic, rate limiting, retry mechanism
- **`utils.js`**: Utility functions, configuration, helpers
- **`index.js`**: Application orchestration, output formatting
- **`test.js`**: Unit tests for core functionality

### Error Handling
- Validates API responses
- Catches network errors
- Implements retry logic
- Provides detailed error messages

### Best Practices
- Clear separation of concerns
- Comprehensive error handling
- Detailed logging and progress tracking
- Configuration externalization
- JSDoc documentation

## Approach Explanation

### Rate Limiting Strategy
I chose a **queue-based sequential processing** approach:
1. Pre-batch all 500 devices into chunks of 10
2. Process batches one at a time in a queue
3. Measure elapsed time for each request
4. Wait for remaining time to reach 1 second before next request

**Why this approach?**
- Simple and predictable
- Guarantees no rate limit violations
- Easy to debug and monitor
- No complex concurrency management needed

### Alternative Approaches Considered
- **Token Bucket**: More complex, allows bursting (not needed here)
- **Sliding Window**: Overkill for simple 1 req/sec limit
- **Parallel with Semaphore**: Risk of timing issues with strict 1s limit

### Batching Optimization
By using the maximum batch size (10 devices), we reduce:
- Total requests: 500 → 50 (90% reduction)
- Total time: ~500s → ~50s (90% reduction)

## Assumptions

1. **API Availability**: Mock server is running on `localhost:3000`
2. **Network Reliability**: Reasonable network stability (retries handle transient failures)
3. **Data Freshness**: Timestamp-based signatures are acceptable (no clock sync issues)
4. **Sequential Processing**: No requirement for parallel processing across multiple clients

## Troubleshooting

### Error: "ECONNREFUSED"
- Ensure the mock API server is running
- Check that port 3000 is not blocked

### Error: "Invalid signature"
- Verify token matches server configuration
- Check system clock is accurate

### HTTP 429 Errors
- Should not occur with proper rate limiting
- If it does, increase `intervalMs` in config

## License

ISC
