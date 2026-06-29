// Application State
let state = {
    vendor: '商榮',
    date: getTodayDateString(),
    bundles: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    const tgInstance = window.Telegram?.WebApp;
    // Tell Telegram WebApp we are ready
    if (tgInstance) {
        tgInstance.ready();
        tgInstance.expand?.(); // Expand WebApp to full height for better UI layout in Telegram
    }
    initDefaultDate();
    loadStateFromStorage();
    setupGlobalEventListeners();
    render();
});

// Helper: Get local date string in YYYY-MM-DD format
function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function initDefaultDate() {
    const dateInput = document.getElementById('shipping-date');
    if (dateInput) {
        dateInput.value = state.date;
        dateInput.addEventListener('change', (e) => {
            state.date = e.target.value;
            saveStateToStorage();
            updateStats();
        });
    }

    const vendorSelect = document.getElementById('vendor-select');
    if (vendorSelect) {
        vendorSelect.value = state.vendor;
        vendorSelect.addEventListener('change', (e) => {
            state.vendor = e.target.value;
            saveStateToStorage();
        });
    }
}

// LocalStorage Handlers
function loadStateFromStorage() {
    const stored = localStorage.getItem('anthurium_shipping_state');
    if (stored) {
        try {
            state = JSON.parse(stored);
            // Ensure date is updated if loaded empty or older date, or keep stored
            if (!state.date) state.date = getTodayDateString();
        } catch (e) {
            console.error('Error parsing stored state:', e);
            initDefaultState();
        }
    } else {
        initDefaultState();
    }
}

function initDefaultState() {
    state = {
        vendor: '商榮',
        date: getTodayDateString(),
        bundles: [
            {
                id: 'bundle-' + Date.now(),
                items: [
                    { id: 'item-' + Date.now() + '-1', size: 'M', boxes: 10 }
                ]
            }
        ]
    };
    saveStateToStorage();
}

function saveStateToStorage() {
    localStorage.setItem('anthurium_shipping_state', JSON.stringify(state));
}

// Setup Global Event Listeners
function setupGlobalEventListeners() {
    // Add Bundle
    document.getElementById('add-bundle-btn').addEventListener('click', () => {
        addBundle();
    });

    // Copy Text Summary
    document.getElementById('copy-summary-btn').addEventListener('click', () => {
        copySummaryToClipboard();
    });

    // Export CSV
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        exportCSV();
    });

    // Send to Telegram
    const submitTgBtn = document.getElementById('submit-tg-btn');
    if (submitTgBtn) {
        submitTgBtn.addEventListener('click', () => {
            sendToTelegram();
        });
    }

    // Reset All
    document.getElementById('reset-all-btn').addEventListener('click', () => {
        if (confirm('確定要清除所有出貨資料嗎？此動作無法復原。')) {
            localStorage.removeItem('anthurium_shipping_state');
            initDefaultState();
            
            // Reset UI inputs
            document.getElementById('vendor-select').value = state.vendor;
            document.getElementById('shipping-date').value = state.date;
            
            render();
            showToast('資料已重設');
        }
    });
}

// State Mutation Logic
function addBundle() {
    const newBundle = {
        id: 'bundle-' + Date.now(),
        items: [
            { id: 'item-' + Date.now() + '-1', size: 'M', boxes: 10 }
        ]
    };
    state.bundles.push(newBundle);
    saveStateToStorage();
    render();
    
    // Smooth scroll to the newly added bundle
    const newCard = document.getElementById(newBundle.id);
    if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function deleteBundle(bundleId) {
    state.bundles = state.bundles.filter(b => b.id !== bundleId);
    saveStateToStorage();
    render();
}

function addItemToBundle(bundleId) {
    const bundle = state.bundles.find(b => b.id === bundleId);
    if (bundle) {
        bundle.items.push({
            id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 100),
            size: 'M',
            boxes: 10
        });
        saveStateToStorage();
        render();
    }
}

function deleteItemFromBundle(bundleId, itemId) {
    const bundle = state.bundles.find(b => b.id === bundleId);
    if (bundle) {
        bundle.items = bundle.items.filter(i => i.id !== itemId);
        // If it was the last item, we keep an empty items array, or we can add a default item
        if (bundle.items.length === 0) {
            bundle.items.push({
                id: 'item-' + Date.now(),
                size: 'M',
                boxes: 10
            });
        }
        saveStateToStorage();
        render();
    }
}

function updateItemSize(bundleId, itemId, newSize) {
    const bundle = state.bundles.find(b => b.id === bundleId);
    if (bundle) {
        const item = bundle.items.find(i => i.id === itemId);
        if (item) {
            item.size = newSize;
            saveStateToStorage();
            updateStats();
        }
    }
}

function updateItemBoxes(bundleId, itemId, newBoxes) {
    const bundle = state.bundles.find(b => b.id === bundleId);
    if (bundle) {
        const item = bundle.items.find(i => i.id === itemId);
        if (item) {
            // Cap at 21 as requested
            let count = parseInt(newBoxes, 10);
            if (isNaN(count) || count < 1) count = 1;
            if (count > 21) count = 21;
            
            item.boxes = count;
            saveStateToStorage();
            updateStats();
        }
    }
}

// Rendering Logic
function render() {
    const container = document.getElementById('bundles-container');
    container.innerHTML = '';

    if (state.bundles.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 30px; text-align: center; color: var(--neutral-600); border: 2px dashed var(--neutral-200);">
                <p style="margin-bottom: 15px;">目前沒有任何出貨捆數</p>
                <p style="font-size: 13px;">請點擊下方「新增一捆」按鈕開始填單</p>
            </div>
        `;
        updateStats();
        return;
    }

    state.bundles.forEach((bundle, index) => {
        const bundleCard = document.createElement('div');
        bundleCard.className = 'bundle-card';
        bundleCard.id = bundle.id;

        // Card Header
        const header = document.createElement('div');
        header.className = 'bundle-card-header';
        
        const title = document.createElement('div');
        title.className = 'bundle-title';
        title.innerHTML = `📦 <span>第 ${index + 1} 捆</span>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-text-danger';
        deleteBtn.innerHTML = '🗑️ 刪除此捆';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`確定要刪除 第 ${index + 1} 捆 嗎？`)) {
                deleteBundle(bundle.id);
            }
        });

        header.appendChild(title);
        header.appendChild(deleteBtn);
        bundleCard.appendChild(header);

        // Card Body
        const body = document.createElement('div');
        body.className = 'bundle-card-body';

        // Items List Container
        const itemsList = document.createElement('div');
        itemsList.className = 'bundle-items-list';

        bundle.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'bundle-item-row';

            // Size Dropdown
            const sizeGroup = document.createElement('div');
            sizeGroup.className = 'form-group';
            
            const sizeSelect = document.createElement('select');
            ['S', 'M', 'L', '2L'].forEach(size => {
                const opt = document.createElement('option');
                opt.value = size;
                opt.textContent = `尺寸: ${size}`;
                if (size === item.size) opt.selected = true;
                sizeSelect.appendChild(opt);
            });
            sizeSelect.addEventListener('change', (e) => {
                updateItemSize(bundle.id, item.id, e.target.value);
            });
            sizeGroup.appendChild(sizeSelect);
            row.appendChild(sizeGroup);

            // Boxes Dropdown
            const boxesGroup = document.createElement('div');
            boxesGroup.className = 'form-group';
            
            const boxesSelect = document.createElement('select');
            for (let i = 1; i <= 21; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `${i} 盒`;
                if (i === item.boxes) opt.selected = true;
                boxesSelect.appendChild(opt);
            }
            boxesSelect.addEventListener('change', (e) => {
                updateItemBoxes(bundle.id, item.id, e.target.value);
            });
            boxesGroup.appendChild(boxesSelect);
            row.appendChild(boxesGroup);

            // Delete Item Row Button
            const deleteItemBtn = document.createElement('button');
            deleteItemBtn.className = 'btn-text-danger';
            deleteItemBtn.style.padding = '10px';
            deleteItemBtn.innerHTML = '✕';
            deleteItemBtn.title = '移除此尺寸';
            deleteItemBtn.addEventListener('click', () => {
                deleteItemFromBundle(bundle.id, item.id);
            });
            row.appendChild(deleteItemBtn);

            itemsList.appendChild(row);
        });

        body.appendChild(itemsList);

        // Add Item Row Button inside Bundle
        const addItemBtn = document.createElement('button');
        addItemBtn.className = 'btn btn-outline-primary';
        addItemBtn.innerHTML = '+ 新增尺寸/盒數';
        addItemBtn.addEventListener('click', () => {
            addItemToBundle(bundle.id);
        });
        body.appendChild(addItemBtn);

        bundleCard.appendChild(body);
        container.appendChild(bundleCard);
    });

    updateStats();
}

// Calculate and Update Statistics Panel
function updateStats() {
    let totalBundles = state.bundles.length;
    let totalBoxes = 0;
    
    let sizeCounts = {
        'S': 0,
        'M': 0,
        'L': 0,
        '2L': 0
    };

    state.bundles.forEach(bundle => {
        bundle.items.forEach(item => {
            const boxes = parseInt(item.boxes, 10) || 0;
            totalBoxes += boxes;
            if (sizeCounts.hasOwnProperty(item.size)) {
                sizeCounts[item.size] += boxes;
            }
        });
    });

    // Update numbers
    document.getElementById('stat-total-bundles').textContent = totalBundles;
    document.getElementById('stat-total-boxes').textContent = totalBoxes;

    // Update size values and progress bars
    ['S', 'M', 'L', '2L'].forEach(size => {
        const count = sizeCounts[size];
        document.getElementById(`val-${size}`).textContent = count;
        
        // Progress bar width
        const percentage = totalBoxes > 0 ? (count / totalBoxes) * 100 : 0;
        document.getElementById(`bar-${size}`).style.width = `${percentage}%`;
    });
}

// Copy Summary Text to Clipboard
function copySummaryToClipboard() {
    if (state.bundles.length === 0) {
        showToast('請先新增出貨資料！');
        return;
    }

    let sizeCounts = { 'S': 0, 'M': 0, 'L': 0, '2L': 0 };
    let totalBoxes = 0;

    let bundleDetails = state.bundles.map((bundle, index) => {
        let itemsDesc = bundle.items.map(item => {
            const boxes = parseInt(item.boxes, 10) || 0;
            totalBoxes += boxes;
            sizeCounts[item.size] = (sizeCounts[item.size] || 0) + boxes;
            return `${item.size}: ${boxes}盒`;
        }).join(', ');
        return `第 ${index + 1} 捆: [${itemsDesc}]`;
    }).join('\n');

    let summaryText = `📋 【火鶴花出貨明細】\n`;
    summaryText += `出貨日期：${state.date}\n`;
    summaryText += `出貨廠商：${state.vendor}\n`;
    summaryText += `總計捆數：${state.bundles.length} 捆\n`;
    summaryText += `總計盒數：${totalBoxes} 盒\n\n`;
    
    summaryText += `【尺寸統計】\n`;
    summaryText += `S  尺寸：${sizeCounts['S']} 盒\n`;
    summaryText += `M  尺寸：${sizeCounts['M']} 盒\n`;
    summaryText += `L  尺寸：${sizeCounts['L']} 盒\n`;
    summaryText += `2L 尺寸：${sizeCounts['2L']} 盒\n\n`;
    
    summaryText += `【每捆詳細明細】\n`;
    summaryText += bundleDetails;

    navigator.clipboard.writeText(summaryText).then(() => {
        showToast('明細已複製到剪貼簿！');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('複製失敗，請手動選取複製');
    });
}

// Export CSV File
function exportCSV() {
    if (state.bundles.length === 0) {
        showToast('沒有資料可供匯出！');
        return;
    }

    // CSV Headers
    let csvContent = '\uFEFF'; // Add BOM for Excel Chinese character compatibility
    csvContent += `出貨日期,${state.date}\n`;
    csvContent += `出貨廠商,${state.vendor}\n\n`;
    csvContent += `捆序號,尺寸,盒數\n`;

    state.bundles.forEach((bundle, index) => {
        bundle.items.forEach(item => {
            csvContent += `${index + 1},${item.size},${item.boxes}\n`;
        });
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = `火鶴花出貨單_${state.vendor}_${state.date}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV 檔案已下載');
}

// Show Toast Alerts
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Compile and send shipping order to Telegram Bot
function sendToTelegram() {
    if (state.bundles.length === 0) {
        showToast('請先新增出貨資料！');
        return;
    }

    // Calculate totals and statistics
    let totalBoxes = 0;
    let sizeCounts = { 'S': 0, 'M': 0, 'L': 0, '2L': 0 };
    
    state.bundles.forEach(bundle => {
        bundle.items.forEach(item => {
            const boxes = parseInt(item.boxes, 10) || 0;
            totalBoxes += boxes;
            if (sizeCounts.hasOwnProperty(item.size)) {
                sizeCounts[item.size] += boxes;
            }
        });
    });

    // Structure JSON Payload
    const orderData = {
        vendor: state.vendor,
        date: state.date,
        total_bundles: state.bundles.length,
        total_boxes: totalBoxes,
        size_summary: sizeCounts,
        bundles: state.bundles.map((bundle, index) => ({
            bundle_index: index + 1,
            id: bundle.id,
            items: bundle.items.map(item => ({
                size: item.size,
                boxes: item.boxes
            }))
        })),
        submitted_at: new Date().toISOString()
    };

    // Capture URL Query Parameters (e.g., chat_id or other variables from Telegram bot)
    const urlParams = new URLSearchParams(window.location.search);
    const queryParams = {};
    for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
    }
    if (Object.keys(queryParams).length > 0) {
        orderData.query_params = queryParams;
    }

    // Include Telegram WebApp context if available
    const tgInstance = window.Telegram?.WebApp;
    if (tgInstance && tgInstance.initDataUnsafe && Object.keys(tgInstance.initDataUnsafe).length > 0) {
        orderData.telegram = {
            user: tgInstance.initDataUnsafe.user,
            query_id: tgInstance.initDataUnsafe.query_id,
            auth_date: tgInstance.initDataUnsafe.auth_date,
            hash: tgInstance.initDataUnsafe.hash
        };
    }

    const jsonString = JSON.stringify(orderData);
    
    let sent = false;

    if (tgInstance) {
        // 1. 優先嘗試使用 Telegram 官方推薦的 sendData 方法 (支援最大 17 KB，能無縫將 JSON 傳回 Bot)
        // 注意：這需要您的 WebApp 是透過 Reply Keyboard Button (對話框底部的回覆鍵盤按鈕) 開啟
        try {
            tgInstance.sendData(jsonString);
            showToast('出貨單資料已傳送！');
            sent = true;
        } catch (sendDataError) {
            console.log('tg.sendData is not available or failed:', sendDataError);
        }

        // 2. 如果 sendData 失敗 (例如是從 Inline Keyboard 或主選單開啟)，且 JSON 長度小於等於 256 字元，才使用 switchInlineQuery
        if (!sent) {
            if (typeof tgInstance.switchInlineQuery === 'function' && jsonString.length <= 256) {
                try {
                    tgInstance.switchInlineQuery(jsonString);
                    showToast('已傳送指令至 Telegram！');
                    sent = true;
                } catch (inlineQueryError) {
                    console.error('tg.switchInlineQuery failed:', inlineQueryError);
                    fallbackCopyToClipboard(jsonString, tgInstance, inlineQueryError);
                    sent = true;
                }
            } else if (jsonString.length > 256) {
                // 如果 JSON 大於 256 字元，呼叫 switchInlineQuery 會必報 WebAppInlineQueryInvalid 錯誤，因此直接引導複製
                const lengthError = new Error(`出貨單 JSON 長度為 ${jsonString.length} 字元，已超過 Telegram switchInlineQuery API 的 256 字元長度限制。`);
                fallbackCopyToClipboard(jsonString, tgInstance, lengthError);
                sent = true;
            }
        }
    }

    // 3. 一般網頁環境，使用剪貼簿複製作為退路
    if (!sent) {
        fallbackCopyToClipboard(jsonString, tgInstance);
    }
}

// Fallback to copy JSON data to clipboard when not running in Telegram WebApp
function fallbackCopyToClipboard(text, tgInstance, error = null) {
    const isTelegram = tgInstance && tgInstance.platform !== 'unknown';
    let msg = isTelegram 
        ? '由於您的開啟管道限制（例如從主選單或 Inline 鍵盤開啟），無法直接傳送資料。\n系統已自動將「出貨單 JSON」複製至剪貼簿，您可以手動貼上發送給您的 Telegram Bot。'
        : '目前非處於 Telegram 應用程式環境。\n系統已自動將「出貨單 JSON」複製至剪貼簿，您可以手動貼上發送給您的 Telegram Bot。';

    // 檢查是否為 Bot 尚未啟用 Inline Mode 的錯誤
    if (error) {
        const errorStr = error.message || error.toString();
        if (errorStr.includes('InlineModeDisable') || errorStr.includes('InlineModeDisabled')) {
            msg = '您的 Telegram Bot 尚未啟用「Inline Mode (行內內嵌模式)」，因此無法直接傳送出貨單。\n\n【解決步驟】：\n1. 請在 Telegram 中搜尋並私訊 @BotFather\n2. 輸入指令 /mybots 並選擇您的 Bot\n3. 點擊 [Bot Settings] -> [Inline Mode]\n4. 點擊 [Turn on] 啟用 Inline Mode\n\n系統已先將「出貨單 JSON」複製至剪貼簿，您可以手動貼上發送。';
        }
    }

    // 加上詳細的偵錯資訊
    msg += '\n\n--- 偵錯資訊 (Debug Info) ---';
    msg += `\n- window.Telegram: ${typeof window.Telegram !== 'undefined' ? '已載入' : '未載入'}`;
    msg += `\n- WebApp 實例: ${tgInstance ? '已初始化' : '未初始化'}`;
    if (tgInstance) {
        msg += `\n- 平台 (Platform): ${tgInstance.platform || '未知'}`;
        msg += `\n- initData 長度: ${tgInstance.initData ? tgInstance.initData.length : 0}`;
        msg += `\n- switchInlineQuery: ${typeof tgInstance.switchInlineQuery === 'function' ? '存在' : '不存在'}`;
    }
    if (error) {
        msg += `\n- 錯誤詳情: ${error.message || error}`;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert(msg);
    }).catch(err => {
        console.error('Could not copy JSON to clipboard: ', err);
        // Backup selection copy
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert(msg);
        } catch (e) {
            console.error('execCommand copy failed', e);
            alert('複製失敗，請手動複製以下 JSON 資料：\n\n' + text);
        }
        document.body.removeChild(textarea);
    });
}
