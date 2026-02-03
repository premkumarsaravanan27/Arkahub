const config = {
    apiPath: '/device/real/query',
    token: 'interview_token_123',
    batchSize: 10,
    totalDevices: 500,
    intervalMs: 1050, // Slightly more than 1000 for safety
    retryDelay: 2000
};

const state = {
    isProcessing: false,
    allDevices: [],
    stats: {
        requests: 0,
        success: 0,
        retries: 0
    }
};

const dom = {
    startBtn: document.getElementById('start-btn'),
    log: document.getElementById('log'),
    statsTotal: document.getElementById('stats-total'),
    statsRequests: document.getElementById('stats-requests'),
    statsSuccess: document.getElementById('stats-success'),
    statsRetries: document.getElementById('stats-retries'),
    progress: document.getElementById('progress'),
    progressText: document.getElementById('progress-text'),
    deviceList: document.getElementById('device-list')
};

function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    dom.log.prepend(entry);
    if (dom.log.childNodes.length > 100) dom.log.lastChild.remove();
}

function updateStats() {
    dom.statsTotal.innerText = state.allDevices.length;
    dom.statsRequests.innerText = state.stats.requests;
    dom.statsSuccess.innerText = state.stats.success;
    dom.statsRetries.innerText = state.stats.retries;

    const percent = Math.round((state.allDevices.length / config.totalDevices) * 100);
    dom.progress.style.width = `${percent}%`;
    dom.progressText.innerText = `${percent}% Complete`;
}

function generateSignature(path, token, timestamp) {
    return CryptoJS.MD5(path + token + timestamp).toString();
}

function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = 'device-card';
    const isOnline = device.status.toLowerCase() === 'online';

    card.innerHTML = `
        <div class="device-header">
            <span class="sn-badge">${device.sn}</span>
            <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                ${isOnline ? '● Online' : '○ Offline'}
            </span>
        </div>
        <div class="power-value">
            ${device.power.split(' ')[0]} <span class="power-unit">kW</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">
            Updated: ${new Date(device.last_updated).toLocaleTimeString()}
        </div>
    `;
    return card;
}

async function fetchBatch(snList, attempt = 1) {
    const timestamp = Date.now().toString();
    const signature = generateSignature(config.apiPath, config.token, timestamp);

    try {
        state.stats.requests++;
        updateStats();

        const response = await fetch(config.apiPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Signature': signature,
                'Timestamp': timestamp
            },
            body: JSON.stringify({ sn_list: snList })
        });

        if (response.status === 429) throw new Error('Rate limit exceeded');
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const result = await response.json();
        state.stats.success++;
        return result.data;
    } catch (err) {
        log(`Batch failed: ${err.message}`, 'warning');
        if (attempt < 3) {
            state.stats.retries++;
            log(`Retrying in ${config.retryDelay}ms... (Attempt ${attempt + 1})`, 'info');
            await new Promise(r => setTimeout(r, config.retryDelay));
            return fetchBatch(snList, attempt + 1);
        }
        throw err;
    }
}

async function startAggregation() {
    if (state.isProcessing) return;

    state.isProcessing = true;
    state.allDevices = [];
    state.stats = { requests: 0, success: 0, retries: 0 };
    dom.deviceList.innerHTML = '';
    dom.startBtn.disabled = true;
    dom.startBtn.innerHTML = '<span>⚡</span> Processing...';

    log('Starting aggregation of 500 serial numbers...', 'info');
    updateStats();

    const serialNumbers = Array.from({ length: config.totalDevices }, (_, i) =>
        `SN-${String(i).padStart(3, '0')}`
    );

    const batches = [];
    for (let i = 0; i < serialNumbers.length; i += config.batchSize) {
        batches.push(serialNumbers.slice(i, i + config.batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
        const startTime = Date.now();
        const batch = batches[i];

        log(`Fetching batch ${i + 1}/${batches.length}...`, 'info');

        try {
            const data = await fetchBatch(batch);
            state.allDevices.push(...data);

            // Render first 50 devices
            if (state.allDevices.length <= 50) {
                data.forEach(device => {
                    dom.deviceList.appendChild(createDeviceCard(device));
                });
            }

            updateStats();
            log(`Success: Received ${data.length} records.`, 'success');
        } catch (err) {
            log(`Failed to fetch batch ${i + 1}: ${err.message}`, 'error');
        }

        // Rate limiting
        const elapsed = Date.now() - startTime;
        const wait = Math.max(0, config.intervalMs - elapsed);
        if (wait > 0 && i < batches.length - 1) {
            await new Promise(r => setTimeout(r, wait));
        }
    }

    log('Aggregation complete!', 'success');
    dom.startBtn.disabled = false;
    dom.startBtn.innerHTML = '<span>🚀</span> Start Aggregation';
    state.isProcessing = false;
}

dom.startBtn.addEventListener('click', startAggregation);
dom.progress.style.width = '0%';
