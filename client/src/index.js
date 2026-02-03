const EnergyGridClient = require('./client');
const { generateSerialNumbers } = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * Main application entry point
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        EnergyGrid Data Aggregator - Client Application     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Generate 500 serial numbers
    const serialNumbers = generateSerialNumbers(500);
    console.log(`📋 Generated ${serialNumbers.length} serial numbers`);
    console.log(`   Range: ${serialNumbers[0]} to ${serialNumbers[serialNumbers.length - 1]}\n`);

    // Create client instance
    const client = new EnergyGridClient();

    try {
        // Fetch data for all devices
        console.log('🚀 Starting data aggregation...');
        const result = await client.fetchDevices(serialNumbers);

        // Display results
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                      RESULTS SUMMARY                       ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log(`✅ Success: ${result.success}`);
        console.log(`📊 Total Devices Fetched: ${result.totalDevices}/${serialNumbers.length}`);
        console.log(`⏱️  Total Duration: ${(result.statistics.duration / 1000).toFixed(2)}s`);
        console.log(`📈 Total Requests: ${result.statistics.totalRequests}`);
        console.log(`✔️  Successful Requests: ${result.statistics.successfulRequests}`);
        console.log(`❌ Failed Requests: ${result.statistics.failedRequests}`);
        console.log(`🔄 Retried Requests: ${result.statistics.retriedRequests}`);
        console.log(`⚡ Average Request Time: ${result.statistics.averageRequestTime.toFixed(2)}ms`);

        if (result.errors.length > 0) {
            console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.error}`);
            });
        }

        // Save aggregated data to file
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFile = path.join(outputDir, `telemetry_${Date.now()}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

        console.log(`\n💾 Results saved to: ${outputFile}`);

        // Display sample data
        if (result.devices.length > 0) {
            console.log('\n📝 Sample Device Data (first 3 devices):');
            result.devices.slice(0, 3).forEach((device, index) => {
                console.log(`\n   Device ${index + 1}: ${device.sn}`);
                console.log(`   - Power: ${device.power}`);
                console.log(`   - Status: ${device.status}`);
                console.log(`   - Last Updated: ${device.last_updated}`);
            });
        }

        console.log('\n✨ Data aggregation completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run the application
if (require.main === module) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = main;
