// --- 1. 配置與全域變數 ---
const APPID_JSON_URL = "https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json";
let GAME_MAP = {}; // AppID 映射表 {標準化名稱: AppId}
let INPUT_FOLDER_NAMES = []; // 步驟 1 收集到的原始資料夾名稱
let IDENTIFIED_GAMES = []; // 步驟 2 匹配成功的遊戲清單 {folderName, appId, officialName}
let GAMES_TO_PROCESS = []; // 儲存步驟 1 的資料夾列表，用於表格顯示和處理 {id, folderName, appId, officialName, status}

// --- 2. 核心工具函數 ---

function normalizeName(name) {
    /** * 標準化遊戲名稱。 */
    let normalized = name.toUpperCase();
    normalized = normalized.replace(/[^A-Z0-9]/g, ''); 
    return normalized;
}

function buildDefaultTemplate() {
    /** * 創建一個最小化的通用 ACF 範本內容。 */
    const unixTime = Math.floor(Date.now() / 1000);
    return `"AppState"
{
	"appid"		"999999"
	"universe"		"1"
	"name"		"Generic ACF Template"
	"StateFlags"		"4"
	"installdir"		"GenericTemplate"
	"LastUpdated"		"${unixTime}"
	"SizeOnDisk"		"0"
	"buildid"		"1"
	"LastOwner"		"0"
	"DownloadType"		"1"
	"UpdateResult"		"0"
	"BytesToDownload"		"0"
	"BytesDownloaded"		"0"
	"BytesToStage"		"0"
	"BytesStaged"		"0"
	"AutoUpdateBehavior"		"0"
	"AllowOtherDownloadsWhileRunning"		"0"
	"ScheduledAutoUpdate"		"0"
}`;
}

function generateAcfContent(folderName, targetAppId, officialName) {
    /** * 根據範本、資料夾名稱和 AppID 生成新的 ACF 內容。 */
    
    let content = buildDefaultTemplate(); 
    const unixTime = Math.floor(Date.now() / 1000).toString();

    // 替換關鍵欄位
    content = content.replace(/("appid"\s+)".*?"/, `$1"${targetAppId}"`);
    content = content.replace(/("installdir"\s+)".*?"/, `$1"${folderName}"`);
    const nameToUse = officialName || folderName; 
    content = content.replace(/("name"\s+)".*?"/, `$1"${nameToUse}"`);
    
    // 確保關鍵狀態欄位設置正確，以觸發 Steam 驗證
    content = content.replace(/("StateFlags"\s+)".*?"/, '$1"4"');
    content = content.replace(/("LastUpdated"\s+)".*?"/, `$1"${unixTime}"`);
    content = content.replace(/("SizeOnDisk"\s+)".*?"/, '$1"0"'); 
    
    // 確保下載/階段計數為 0
    content = content.replace(/("BytesToDownload"\s+)".*?"/g, '$1"0"');
    content = content.replace(/("BytesDownloaded"\s+)".*?"/g, '$1"0"');
    content = content.replace(/("BytesToStage"\s+)".*?"/g, '$1"0"');
    content = content.replace(/("BytesStaged"\s+)".*?"/g, '$1"0"');

    return content;
}

function simpleSimilarity(str1, str2) {
    /** * 簡化相似度計算 */
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 0;

    let matchCount = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
        if (str1[i] === str2[i]) {
            matchCount++;
        }
    }
    return (matchCount * 2) / (len1 + len2);
}

function findSimilarAppId(folderName, normalizedFolderName) {
    /** * 尋找最相似的 AppID，並通過 prompt 提示使用者選擇。 */
    const results = [];
    const minSimilarityThreshold = 0.8; 

    for (const normalizedGameName in GAME_MAP) {
        if (GAME_MAP.hasOwnProperty(normalizedGameName)) {
            const similarity = simpleSimilarity(normalizedFolderName, normalizedGameName);
            
            if (similarity >= minSimilarityThreshold) {
                const appId = GAME_MAP[normalizedGameName];
                results.push({
                    name: normalizedGameName,
                    id: appId,
                    score: similarity
                });
            }
        }
    }

    results.sort((a, b) => b.score - a.score); 

    if (results.length > 0) {
        let promptMessage = `🚨 WARNING: No exact match found for folder '${folderName}'.\n`;
        promptMessage += `\nPlease confirm which AppID corresponds to your folder:\n\n`;

        const choices = results.slice(0, 5); 

        choices.forEach((res, index) => {
            promptMessage += `${index + 1}. ${res.name} (AppID: ${res.id}) - Similarity: ${(res.score * 100).toFixed(1)}%\n`;
        });
        
        promptMessage += `\nPlease enter the number (1-${choices.length}) or enter '0' to skip this game.`;

        const choice = prompt(promptMessage);

        if (choice && choice !== '0') {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < choices.length) {
                return { 
                    appId: choices[index].id, 
                    officialName: choices[index].name 
                }; 
            }
        }
    }
    return null;
}


// --- 3. 步驟與狀態管理 (全域函數，供 HTML 呼叫) ---

let currentStep = 1;

function updateStep(newStep) {
    /** * 控制網頁介面的步驟切換和視覺更新，並處理 completed 狀態。
     */
    const steps = document.querySelectorAll('.step');
    
    // 1. 移除所有步驟的 active 狀態
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    document.querySelectorAll('.step-content').forEach(content => content.classList.remove('active'));

    // 2. 標記已完成的步驟 (Completed)
    for (let i = 1; i < newStep; i++) {
        const completedStep = document.getElementById(`step${i}`);
        if (completedStep) {
            completedStep.classList.add('completed');
        }
    }
    
    // 3. 移除新步驟之後的 completed 狀態 (例如從 Step 3 返回 Step 2)
    for (let i = newStep; i <= steps.length; i++) {
        const futureStep = document.getElementById(`step${i}`);
        if (futureStep) {
            futureStep.classList.remove('completed');
        }
    }

    // 4. 設定新步驟的 active 狀態
    const targetStep = document.getElementById(`step${newStep}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // 5. 設定內容區塊 active 狀態
    document.getElementById(`content${newStep}`).classList.add('active');
    currentStep = newStep;
}

window.toggleOptionB = function() {
    /** * 展開/折疊 Option B 手動輸入區塊。 */
    const container = document.getElementById('optionBContainer');
    const button = document.getElementById('toggleOptionBButton');
    
    if (container.classList.contains('expanded')) {
        container.classList.remove('expanded');
        button.textContent = "Can't Select Folder? Click for Manual Entry";
    } else {
        container.classList.add('expanded');
        button.textContent = "Hide Manual Entry";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    /**
     * 頁面載入完成後的初始化設定。
     */
    updateStep(1);
    // 設置事件監聽器
    document.getElementById('folderDirectoryInput').addEventListener('change', handleFolderDirectory);
});


// --- 4. 步驟 1: Select Folder 處理 ---

function handleFolderDirectory(event) {
    /** * 處理選取 common 資料夾的事件 (使用 webkitdirectory 屬性)，只抓取第一層目錄。 */
    const files = event.target.files;
    const folderNamesSet = new Set();
    const statusDiv = document.getElementById('folderStatus');
    statusDiv.style.display = 'block'; 

    if (files.length === 0) {
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ No folder selected.';
        INPUT_FOLDER_NAMES = [];
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const relativePath = files[i].webkitRelativePath;
        const pathParts = relativePath.split('/');
        
        // pathParts[0] 是選取的 common 資料夾名稱
        // pathParts[1] 是第一層遊戲資料夾名稱
        // 只要路徑深度 >= 2 (即 pathParts[1] 存在)
        if (pathParts.length >= 2) { 
            const gameFolder = pathParts[1];
            
            // 忽略 Steam 常用但非遊戲的資料夾
            if (gameFolder && 
                gameFolder !== 'CommonRedist' && 
                gameFolder !== 'Steamworks Shared' && 
                gameFolder !== 'Steam Controller Configs' &&
                gameFolder !== '.DS_Store') 
            {
                 // 使用 Set 確保不重複，實現只收集第一層目錄
                 folderNamesSet.add(gameFolder);
            }
        }
    }
    
    INPUT_FOLDER_NAMES = Array.from(folderNamesSet);
    
    if (INPUT_FOLDER_NAMES.length > 0) {
        statusDiv.className = 'status-message status-success';
        statusDiv.textContent = `✅ Successfully found ${INPUT_FOLDER_NAMES.length} items. Ready to identify your games.`;

        document.getElementById('folderNamesInput').value = ''; 
    } else {
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ No game folders found. (Did you select the steamapps/common folder?)';
    }
}

window.checkStep1 = function() {
    /** * 確認資料夾清單，準備進入步驟 2 (Scan & Identify)。 */
    
    // 如果沒有通過資料夾選取，嘗試從手動輸入獲取清單
    if (INPUT_FOLDER_NAMES.length === 0) {
        const inputContent = document.getElementById('folderNamesInput').value;
        const manualFolders = inputContent.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        INPUT_FOLDER_NAMES = manualFolders;
    }
    
    if (INPUT_FOLDER_NAMES.length === 0) {
        const statusDiv = document.getElementById('folderStatus');
        statusDiv.style.display = 'block'; 
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ ERROR: Please select a folder or manually enter folder names.';
        return;
    }

    // 初始化 GAMES_TO_PROCESS
    GAMES_TO_PROCESS = INPUT_FOLDER_NAMES.map((folderName, index) => ({
        id: index, 
        folderName: folderName,
        appId: '-',
        officialName: 'Unknown',
        status: 'pending' // pending, loading, success, error, removed
    }));
    
    // 成功獲取清單，進入步驟 2 並觸發 AppID 下載
    updateStep(2);
    // 設置步驟 2 的初始表格 (全部顯示為 pending)
    updateGameTable();
    fetchAppIdMap(); 
}

// --- 5. 步驟 2: Scan & Identify 處理 ---

async function fetchAppIdMap() {
    /** * 下載並解析 JSON 格式的 Steam AppID 清單。 */
    const statusDiv = document.getElementById('appIdStatus');
    statusDiv.style.display = 'block';
    statusDiv.className = 'status-message'; 
    statusDiv.textContent = 'Downloading AppID list from GitHub (Please wait)...';
    
    try {
        const response = await fetch(APPID_JSON_URL);
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const json_data = await response.json();
        
        // 處理不同格式的 AppID JSON 來源
        if (Array.isArray(json_data)) {
            json_data.forEach(item => {
                if (item.appid && item.name) {
                    GAME_MAP[normalizeName(item.name)] = String(item.appid); 
                }
            });
        } else {
             for (const appidStr in json_data) {
                if (json_data.hasOwnProperty(appidStr)) {
                    GAME_MAP[normalizeName(json_data[appidStr])] = appidStr;
                }
            }
        }

        statusDiv.className = 'status-message status-success';
        statusDiv.textContent = `✅ AppID list loaded successfully. Total ${Object.keys(GAME_MAP).length} items. Ready to identify.`;

        document.getElementById('startIdentify').disabled = false;

    } catch (error) {
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = `❌ Failed to load AppID list. Please check your network: ${error.message}`;
        document.getElementById('startIdentify').disabled = true;
    }
}


function updateGameTable() {
    /** * 根據 GAMES_TO_PROCESS 陣列，動態更新步驟 2 的表格介面。 */
    const resultsBody = document.getElementById('identificationResults');
    const detectedCount = document.getElementById('detectedCount');
    resultsBody.innerHTML = '';
    
    let actualCount = 0;

    GAMES_TO_PROCESS.forEach(game => {
        if (game.status !== 'removed') {
            actualCount++;
            const row = resultsBody.insertRow();
            row.id = `game-row-${game.id}`;
            
            // Folder Name
            row.insertCell().textContent = game.folderName;
            
            // Detected Game
            row.insertCell().textContent = game.officialName;
            
            // App ID
            row.insertCell().textContent = game.appId;
            
            // Status Icon
            const statusCell = row.insertCell();
            const statusIcon = document.createElement('div');
            statusIcon.className = 'status-icon';
            
            if (game.status === 'loading') {
                statusIcon.classList.add('loading');
            } else if (game.status === 'success') {
                statusIcon.classList.add('success');
            } else if (game.status === 'error') {
                statusIcon.classList.add('error');
            } else if (game.status === 'pending') {
                statusIcon.classList.add('pending');
            }
            statusCell.appendChild(statusIcon);
            
            // Remove Button
            const removeCell = row.insertCell();
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove/Skip this game';
            removeBtn.onclick = () => removeGame(game.id);
            removeCell.appendChild(removeBtn);
        }
    });

    detectedCount.textContent = `Detected Folders ${actualCount}`;
}


function removeGame(gameId) {
    /** * 移除單個遊戲並更新表格。 */
    const index = GAMES_TO_PROCESS.findIndex(g => g.id === gameId);
    if (index !== -1) {
        GAMES_TO_PROCESS[index].status = 'removed'; 
        // 移除 DOM 元素 (優化效能)
        const row = document.getElementById(`game-row-${gameId}`);
        if (row) {
            row.remove();
        }
        // 更新計數器
        const detectedCount = document.getElementById('detectedCount');
        detectedCount.textContent = `Detected Folders ${GAMES_TO_PROCESS.filter(g => g.status !== 'removed').length}`;
    }
}

window.startIdentify = async function() {
    /** * 開始掃描資料夾名稱並與 AppID 匹配，更新表格。 */
    
    const gamesLeft = GAMES_TO_PROCESS.filter(g => g.status !== 'removed');
    if (gamesLeft.length === 0) {
        alert("No folders selected or left to process.");
        return;
    }
    if (Object.keys(GAME_MAP).length === 0) {
        alert("AppID database is not loaded. Please wait.");
        return;
    }

    IDENTIFIED_GAMES = []; // 清空成功清單
    document.getElementById('startIdentify').disabled = true;
    document.getElementById('appIdStatus').style.display = 'none';

    for (const game of GAMES_TO_PROCESS) {
        if (game.status === 'removed' || game.status === 'success') continue;

        // 設置狀態為 loading
        game.status = 'loading';
        game.appId = '-';
        game.officialName = 'Searching...';
        updateGameTable(); 
        
        const normalizedFolderName = normalizeName(game.folderName);
        let targetAppId = GAME_MAP[normalizedFolderName];
        let officialName = game.folderName; 

        if (!targetAppId) {
            // --- 執行相似度檢查與使用者互動 (Prompt) ---
            const similarMatch = findSimilarAppId(game.folderName, normalizedFolderName);
            
            if (similarMatch) {
                targetAppId = similarMatch.appId;
                officialName = similarMatch.officialName;
                game.status = 'success';
            } else {
                game.status = 'error';
                game.officialName = 'Not Found';
                updateGameTable(); 
                continue; // 跳過此遊戲
            }
        } else {
            // 精確匹配成功
            game.status = 'success';
            // 嘗試反查官方名稱 (近似值)
            officialName = Object.keys(GAME_MAP).find(key => GAME_MAP[key] === targetAppId);
            if (!officialName) officialName = game.folderName;
        }

        // 更新遊戲資訊並加入到最終清單
        game.appId = targetAppId;
        game.officialName = officialName;
        
        IDENTIFIED_GAMES.push({
            folderName: game.folderName,
            appId: targetAppId,
            officialName: officialName
        });
        
        // 更新表格顯示匹配結果
        updateGameTable(); 
        await new Promise(resolve => setTimeout(resolve, 50)); // 輕微延遲以允許 UI 渲染
    }

    document.getElementById('startIdentify').disabled = false;

    // 總結並進入下一步
    if (IDENTIFIED_GAMES.length > 0) {
        const totalFolders = GAMES_TO_PROCESS.filter(g => g.status !== 'removed').length;
        const successCount = IDENTIFIED_GAMES.length;
        
        // 成功完成 Step 2，標記 Step 2 為 completed
        document.getElementById('step2').classList.add('completed');
        document.getElementById('step2').classList.remove('active');
        
        const statusDiv = document.getElementById('appIdStatus');
        statusDiv.className = 'status-message status-success';
        statusDiv.textContent = `🌟 Identification complete! Matched ${successCount} of ${totalFolders} folders.`;
        statusDiv.style.display = 'block';

        // 顯示進入步驟 3 的按鈕
        document.getElementById('goToStep3Button').style.display = 'block';

    } else {
        const statusDiv = document.getElementById('appIdStatus');
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ No games were matched successfully. Please ensure folder names are correct.';
        statusDiv.style.display = 'block';
    }
}

window.checkStep2AndGoToStep3 = function() {
    /** * 點擊按鈕從步驟 2 進入步驟 3。 */
    if (IDENTIFIED_GAMES.length > 0) {
        // 確保狀態正確
        updateStep(3);
        // 更新步驟 3 的文字
        document.getElementById('finalGameCount').textContent = `Successfully matched ${IDENTIFIED_GAMES.length} games. Proceed to generate ACF files.`;
    } else {
        alert("Please click 'Identify Games' and ensure at least one game is successfully matched before proceeding.");
    }
}


// --- 6. 步驟 3: Download Fix 處理 (使用 JSZip) ---

window.startDownload = async function() {
    /** * 生成所有匹配成功的 ACF 檔案，並使用 JSZip 打包成單個 ZIP 文件供下載。 */
    
    document.getElementById('results').innerHTML = '';
    const statusDiv = document.getElementById('statusMessage');
    const downloadButton = document.getElementById('startDownload');

    if (IDENTIFIED_GAMES.length === 0) {
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ Cannot generate: No successfully matched games. Please return to Step 2.';
        statusDiv.style.display = 'block';
        return;
    }

    statusDiv.className = 'status-message';
    statusDiv.textContent = `Generating and compressing ${IDENTIFIED_GAMES.length} ACF files...`;
    statusDiv.style.display = 'block';
    downloadButton.disabled = true;

    // JSZip 是從 index.html 中載入的全域變數
    const zip = new JSZip();
    let repairedCount = 0;
    
    for (const game of IDENTIFIED_GAMES) {
        try {
            const acfContent = generateAcfContent(game.folderName, game.appId, game.officialName);
            const filename = `appmanifest_${game.appId}.acf`;
            
            zip.file(filename, acfContent);
            repairedCount++;

        } catch (e) {
            const container = document.createElement('div');
            container.className = 'status-message status-error';
            container.style.marginTop = '5px';
            container.style.display = 'block';
            container.textContent = `❌ Error processing '${game.folderName}', skipping: ${e.message}`;
            document.getElementById('results').appendChild(container);
        }
    }

    // 生成 ZIP 文件
    if (repairedCount > 0) {
        statusDiv.textContent = `Compressing ${repairedCount} files...`;

        try {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            
            // 創建下載連結
            const url = URL.createObjectURL(zipBlob);
            const zipFilename = `Steam_ACF_Manifests_${Date.now()}.zip`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = zipFilename;
            link.textContent = `Click to download all ${repairedCount} ACF files (.zip)`;
            link.className = 'download-link';
            
            const container = document.createElement('div');
            container.style.backgroundColor = '#4a6b83';
            container.style.padding = '15px';
            container.style.borderRadius = '4px';
            container.style.marginTop = '20px';
            container.appendChild(link);
            document.getElementById('results').appendChild(container);
            
            statusDiv.className = 'status-message status-success';
            statusDiv.textContent = `🌟 Process complete! Successfully generated and packed ${repairedCount} ACF files.`;
            alert(`Process complete! Successfully generated ${repairedCount} files packed in a ZIP.\n\nIMPORTANT: Extract all ACF files from the ZIP into your Steam/steamapps/ folder, restart Steam, and verify the integrity of the game files.`);

        } catch (error) {
            statusDiv.className = 'status-message status-error';
            statusDiv.textContent = `❌ ZIP file generation failed: ${error.message}`;
        }
    } else {
        statusDiv.className = 'status-message status-error';
        statusDiv.textContent = '❌ No ACF files were generated successfully.';
    }
    
    downloadButton.disabled = false;
}