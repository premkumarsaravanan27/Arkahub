# EnergyGrid Data Aggregator

A complete solution for fetching real-time telemetry data from 500 solar inverters via a rate-limited API.

## Project Structure

```
Arkahub/
├── mock-api/          # Mock EnergyGrid API server
│   ├── server.js      # Express server with rate limiting
│   ├── package.json   # Server dependencies
│   └── README.md      # Server documentation
│
├── client/            # Client application
│   ├── src/
│   │   ├── index.js   # Main application
│   │   ├── client.js  # API client with rate limiting
│   │   ├── utils.js   # Utilities and configuration
│   │   └── test.js    # Test suite
│   ├── output/        # Generated output files
│   ├── package.json   # Client dependencies
│   └── README.md      # Client documentation
│
└── README.md          # This file
```

## Quick Start

### 1. Start the Mock API Server

```bash
cd mock-api
npm install
npm start
```

The server will start on `http://localhost:3000`

### 2. Run the Client Application

In a new terminal:

```bash
cd client
npm install
npm start
```

The client will:
- Generate 500 serial numbers
- Fetch telemetry data in batches of 10
- Respect the 1 request/second rate limit
- Save results to `client/output/`

## Features

### Mock API Server
- ✅ Rate limiting (1 request/second)
- ✅ Batch limit enforcement (max 10 devices)
- ✅ MD5 signature verification
- ✅ Realistic telemetry data generation

### Client Application
- ✅ Intelligent queue-based rate limiting
- ✅ Optimal batching (10 devices per request)
- ✅ Automatic retry with exponential backoff
- ✅ Comprehensive error handling
- ✅ Progress tracking and statistics
- ✅ JSON output with aggregated results

## Technical Highlights

### Rate Limiting Implementation
The client uses a **queue-based sequential processing** approach:
1. Pre-batches 500 devices into 50 chunks of 10
2. Processes batches sequentially
3. Measures request duration
4. Enforces minimum 1-second interval

This guarantees no rate limit violations while maximizing throughput.

### Security
Every request includes:
- **Signature**: `MD5(Path + Token + Timestamp)`
- **Timestamp**: Current Unix timestamp
- **Token**: Shared secret (`interview_token_123`)

### Performance
- **Total Devices**: 500
- **Total Requests**: 50 (via batching)
- **Expected Duration**: ~50 seconds
- **Throughput**: ~10 devices/second

## Testing

Run the test suite:

```bash
cd client
npm test
```

Tests cover:
- Signature generation
- Serial number generation
- Array chunking
- Configuration validation

## Output Example

```json
{
  "success": true,
  "totalDevices": 500,
  "devices": [...],
  "statistics": {
    "totalRequests": 50,
    "successfulRequests": 50,
    "failedRequests": 0,
    "duration": 50234,
    "averageRequestTime": 1004.68
  }
}
```

## Architecture Decisions

### Why Queue-Based Rate Limiting?
- **Simplicity**: Easy to understand and debug
- **Reliability**: Guarantees no rate limit violations
- **Predictability**: Consistent timing behavior

### Why Sequential Processing?
- **API Constraint**: Strict 1 req/sec limit makes parallelism unnecessary
- **Simplicity**: No complex concurrency management
- **Reliability**: Easier to track and debug

### Why Batching?
- **Efficiency**: Reduces 500 requests to 50 (90% reduction)
- **Speed**: Reduces total time from ~500s to ~50s
- **Optimization**: Maximizes throughput within constraints

## Requirements Met

✅ Generate 500 dummy Serial Numbers  
✅ Fetch data for all 500 devices  
✅ Aggregate results into single report  
✅ Optimize throughput with batching  
✅ Handle errors gracefully (retries, logging)  
✅ Respect 1s rate limit  
✅ Implement MD5 signature security  
✅ Clean, modular code structure  
✅ Comprehensive documentation  

## Technologies Used

- **Runtime**: Node.js
- **HTTP Client**: Axios
- **Server**: Express.js
- **Crypto**: Node.js built-in crypto module

## License

ISC

## Author

Created as a solution to the EnergyGrid Data Aggregator coding assignment.
