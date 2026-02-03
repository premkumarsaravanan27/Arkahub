const axios = require('axios');
const { config, generateSignature, sleep } = require('./utils');

/**
 * EnergyGrid API Client
 * Handles rate limiting, batching, and retry logic
 */
class EnergyGridClient {
    constructor() {
        this.apiUrl = config.apiUrl;
        this.token = config.token;
        this.requestQueue = [];
        this.isProcessing = false;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            totalDevices: 0
        };
    }

    /**
     * Make a single API request with signature authentication
     * @param {string[]} serialNumbers - Array of serial numbers (max 10)
     * @returns {Promise<Object>} API response data
     */
    async makeRequest(serialNumbers) {
        const timestamp = Date.now().toString();
        // IMPORTANT: Signature now uses the path segment only, not the full URL.
        const signature = generateSignature(config.apiPath, this.token, timestamp);

        try {
            const response = await axios.post(
                this.apiUrl,
                { sn_list: serialNumbers }, // Field name changed from serialNumbers to sn_list
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Signature': signature,
                        'Timestamp': timestamp // Header case insensitive, but good to match
                        // 'signature': signature, // User's server checks req.headers["signature"] which is lowercased by Express/Node
                        // 'timestamp': timestamp 
                    }
                }
            );

            this.stats.successfulRequests++;
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(
                    `API Error ${error.response.status}: ${error.response.data.error || error.message}`
                );
            }
            throw error;
        }
    }

    /**
     * Make a request with retry logic
     * @param {string[]} serialNumbers - Array of serial numbers
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} API response data
     */
    async makeRequestWithRetry(serialNumbers, attempt = 1) {
        try {
            const result = await this.makeRequest(serialNumbers);
            return result;
        } catch (error) {
            if (attempt < config.retry.maxAttempts) {
                console.log(
                    `  ⚠️  Request failed (attempt ${attempt}/${config.retry.maxAttempts}): ${error.message}`
                );
                console.log(`  ⏳ Retrying in ${config.retry.backoffMs}ms...`);

                this.stats.retriedRequests++;
                await sleep(config.retry.backoffMs);
                return this.makeRequestWithRetry(serialNumbers, attempt + 1);
            }

            this.stats.failedRequests++;
            throw error;
        }
    }

    /**
     * Process the request queue with rate limiting
     * @returns {Promise<Object[]>} Array of all responses
     */
    async processQueue() {
        if (this.isProcessing) {
            throw new Error('Queue is already being processed');
        }

        this.isProcessing = true;
        const results = [];
        const totalBatches = this.requestQueue.length;

        console.log(`\n📊 Processing ${totalBatches} batches...`);
        console.log(`⏱️  Rate limit: ${config.rateLimit.requestsPerSecond} request/second\n`);

        for (let i = 0; i < this.requestQueue.length; i++) {
            const batch = this.requestQueue[i];
            const startTime = Date.now();

            console.log(
                `[${i + 1}/${totalBatches}] Fetching data for ${batch.length} devices (${batch[0]} to ${batch[batch.length - 1]})...`
            );

            try {
                const result = await this.makeRequestWithRetry(batch);
                results.push({ success: true, data: result.data }); // User API returns { data: [...] }
                this.stats.totalRequests++;
                this.stats.totalDevices += batch.length;

                const count = result.data ? result.data.length : 0;
                console.log(`  ✅ Success: Received ${count} device records`);
            } catch (error) {
                console.error(`  ❌ Failed: ${error.message}`);
                results.push({ success: false, error: error.message, batch });
            }

            // Rate limiting: ensure at least 1 second between requests
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, config.rateLimit.intervalMs - elapsed);

            if (waitTime > 0 && i < this.requestQueue.length - 1) {
                console.log(`  ⏸️  Waiting ${waitTime}ms (rate limit)...\n`);
                await sleep(waitTime);
            } else if (i < this.requestQueue.length - 1) {
                console.log('');
            }
        }

        this.isProcessing = false;
        return results;
    }

    /**
     * Fetch data for multiple devices
     * @param {string[]} serialNumbers - Array of all serial numbers
     * @returns {Promise<Object>} Aggregated results and statistics
     */
    async fetchDevices(serialNumbers) {
        // Split into batches
        const batches = [];
        for (let i = 0; i < serialNumbers.length; i += config.batchSize) {
            batches.push(serialNumbers.slice(i, i + config.batchSize));
        }

        this.requestQueue = batches;

        const startTime = Date.now();
        const responses = await this.processQueue();
        const endTime = Date.now();

        // Aggregate all device data
        const allDevices = [];
        const errors = [];

        responses.forEach(response => {
            if (response.success && response.data) {
                allDevices.push(...response.data);
            } else if (!response.success) {
                errors.push(response);
            }
        });

        return {
            success: errors.length === 0,
            totalDevices: allDevices.length,
            devices: allDevices,
            errors,
            statistics: {
                ...this.stats,
                totalBatches: batches.length,
                duration: endTime - startTime,
                averageRequestTime: this.stats.totalRequests > 0 ? (endTime - startTime) / this.stats.totalRequests : 0
            }
        };
    }

    /**
     * Get current statistics
     * @returns {Object} Current statistics
     */
    getStats() {
        return { ...this.stats };
    }
}

module.exports = EnergyGridClient;
