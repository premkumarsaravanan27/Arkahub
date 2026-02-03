const crypto = require('crypto');

/**
 * Configuration for the EnergyGrid API client
 */
const config = {
    apiUrl: 'http://localhost:3000/device/real/query',
    apiPath: '/device/real/query', // Added specifically for signature generation
    token: 'interview_token_123',
    rateLimit: {
        requestsPerSecond: 1,
        intervalMs: 1000 // Keeping 1000ms to be safe with the 950ms buffer
    },
    batchSize: 10,
    retry: {
        maxAttempts: 3,
        backoffMs: 2000
    }
};

/**
 * Generate MD5 signature for API authentication
 * @param {string} urlPath - The API endpoint path (e.g. /device/real/query)
 * @param {string} token - Authentication token
 * @param {string} timestamp - Current timestamp
 * @returns {string} MD5 hash signature
 */
function generateSignature(urlPath, token, timestamp) {
    return crypto
        .createHash('md5')
        .update(urlPath + token + timestamp)
        .digest('hex');
}

/**
 * Generate a list of serial numbers
 * @param {number} count - Number of serial numbers to generate
 * @returns {string[]} Array of serial numbers
 */
function generateSerialNumbers(count) {
    return Array.from({ length: count }, (_, i) =>
        `SN-${String(i).padStart(3, '0')}`
    );
}

/**
 * Split array into chunks of specified size
 * @param {Array} array - Array to split
 * @param {number} size - Chunk size
 * @returns {Array[]} Array of chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    config,
    generateSignature,
    generateSerialNumbers,
    chunkArray,
    sleep
};
