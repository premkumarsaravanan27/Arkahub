const { generateSignature, generateSerialNumbers, chunkArray, config } = require('./utils');
const crypto = require('crypto');

/**
 * Test suite for utility functions
 */
function runTests() {
    console.log('🧪 Running Tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Signature Generation
    console.log('Test 1: Signature Generation');
    try {
        const path = '/device/real/query';
        const token = 'interview_token_123';
        const timestamp = '1234567890';

        const signature = generateSignature(path, token, timestamp);
        // Updated expectation: MD5(path + token + timestamp)
        const expected = crypto.createHash('md5').update(path + token + timestamp).digest('hex');

        if (signature === expected) {
            console.log('  ✅ PASSED: Signature matches expected value');
            passed++;
        } else {
            console.log('  ❌ FAILED: Signature mismatch');
            console.log(`     Expected: ${expected}`);
            console.log(`     Got: ${signature}`);
            failed++;
        }
    } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        failed++;
    }

    // Test 2: Serial Number Generation
    console.log('\nTest 2: Serial Number Generation');
    try {
        const serialNumbers = generateSerialNumbers(500);

        if (serialNumbers.length === 500 &&
            serialNumbers[0] === 'SN-000' &&
            serialNumbers[499] === 'SN-499') {
            console.log('  ✅ PASSED: Generated 500 serial numbers correctly');
            passed++;
        } else {
            console.log('  ❌ FAILED: Serial number generation incorrect');
            failed++;
        }
    } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        failed++;
    }

    // Test 3: Array Chunking
    console.log('\nTest 3: Array Chunking');
    try {
        const array = Array.from({ length: 25 }, (_, i) => i);
        const chunks = chunkArray(array, 10);

        if (chunks.length === 3 &&
            chunks[0].length === 10 &&
            chunks[1].length === 10 &&
            chunks[2].length === 5) {
            console.log('  ✅ PASSED: Array chunking works correctly');
            passed++;
        } else {
            console.log('  ❌ FAILED: Array chunking incorrect');
            failed++;
        }
    } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');

    return failed === 0;
}

// Run tests
if (require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = runTests;
