# Steam Library Rescuer (ACF File Generator)

This is a browser-based tool designed to fix the issue of missing `appmanifest_xxxxx.acf` files in the Steam library. When the Steam client loses track of installed games, but the game folders still exist in `steamapps/common`, this tool can automatically match the AppID based on the game folder names and generate the necessary `.acf` files, allowing Steam to recognize the games again.

---

## 🇬🇧 English

# Steam Library Rescuer (ACF File Generator)

This is a browser-based tool designed to fix the issue of missing `appmanifest_xxxxx.acf` files in the Steam library. When the Steam client loses track of installed games, but the game folders still exist in `steamapps/common`, this tool can automatically match the AppID based on the game folder names and generate the necessary `.acf` files, allowing Steam to recognize the games again.

### Features

* **Offline Operation:** All processing, file scanning, and ACF generation is done entirely within the browser. **No data is uploaded to any server.**
* **Folder Name Matching:** Automatically scans the top-level folders in the `steamapps/common` directory.
* **AppID Look-up:** Uses a local or external database to map folder names to their corresponding Steam AppIDs.
* **ACF File Generation:** Creates properly formatted `appmanifest_xxxxx.acf` files for all matched games.
* **ZIP Download:** Packages all generated ACF files into a single ZIP archive for easy transfer.

### 🚀 Usage

1.  **Open the Tool:** Open the `index.html` file in a web browser (Chrome, Firefox, Edge, etc.).
2.  **Select Folder (Option A - Recommended):** Click the file input button and select the Steam installation's `steamapps/common` folder (e.g., `C:\Program Files (x86)\Steam\steamapps\common`). The tool will quickly extract all first-level game folder names.
    * **Manual Input (Option B):** If Option A fails or is too slow, expand **Option B** and manually enter the list of game folder names, one per line.
3.  **Step 2: Scan & Identify:** Click "Confirm Folders and Go to Step 2". Then click "Identify Games".
    * The tool will attempt an exact match. If no exact match is found, it will use a **similarity check** and prompt for manual confirmation of the AppID via a pop-up window.
4.  **Step 3: Download Fix:** Once identification is complete, proceed to Step 3. Click "Generate ACF Files and Download (.zip)".
5.  **Apply the Fix:**
    * Extract the contents of the downloaded ZIP file.
    * Copy all the generated `appmanifest_xxxxx.acf` files.
    * Paste them directly into Steam's `steamapps` folder (e.g., `C:\Program Files (x86)\Steam\steamapps`).
    * Restart the Steam client. The games should now appear as installed.
    * **Crucial:** Right-click each recovered game in Steam and select "Properties" -> "Installed Files" -> "Verify integrity of game files..." to ensure Steam fully validates the installation.

### 🛠️ Development Setup

The tool is split into three files:

1.  `index.html`: The main structure, styles, and links to scripts.
2.  `app.js`: All JavaScript logic, including folder scanning, AppID matching, and ACF generation.
3.  `README.md`: This file.

Ensure all files are in the same directory to run the tool correctly.

---

## 🇹🇼 繁體中文

# Steam 遊戲庫救援工具 (ACF 檔案產生器)

這是一個基於瀏覽器的工具，用於修復 Steam 遊戲庫中遺失 `appmanifest_xxxxx.acf` 檔案的問題。當 Steam 客戶端遺失了遊戲安裝記錄，但遊戲資料夾 (位於 `steamapps/common` 中) 仍然存在時，本工具可以根據遊戲資料夾名稱，自動匹配 AppID 並生成必要的 `.acf` 檔案，讓 Steam 重新識別遊戲。

### 功能特色

* **離線操作：** 所有處理、檔案掃描和 ACF 產生均完全在瀏覽器內部完成。**不會有任何資料被上傳至任何伺服器。**
* **資料夾名稱匹配：** 自動掃描 `steamapps/common` 目錄中的所有頂層資料夾。
* **AppID 查詢：** 使用本地或外部資料庫將資料夾名稱對應到其相對應的 Steam AppID。
* **ACF 檔案生成：** 為所有匹配成功的遊戲建立格式正確的 `appmanifest_xxxxx.acf` 檔案。
* **ZIP 下載：** 將所有生成的 ACF 檔案打包成一個 ZIP 壓縮檔，便於傳輸。

### 🚀 使用方法

1.  **開啟工具：** 在網頁瀏覽器 (Chrome, Firefox, Edge 等) 中開啟 `index.html` 檔案。
2.  **選擇資料夾 (選項 A - 推薦)：** 點擊檔案輸入按鈕，選擇 Steam 安裝路徑下的 `steamapps/common` 資料夾 (例如：`C:\Program Files (x86)\Steam\steamapps\common`)。工具將快速提取所有第一層的遊戲資料夾名稱。
    * **手動輸入 (選項 B)：** 如果選項 A 失敗或速度過慢，請展開**選項 B**，並手動輸入遊戲資料夾名稱清單，每行一個名稱。
3.  **步驟 2: 掃描與識別：** 點擊「Confirm Folders and Go to Step 2」。接著點擊「Identify Games」。
    * 工具將嘗試精確匹配。如果找不到精確匹配，它將使用**相似度檢查**，並透過彈出視窗提示手動確認 AppID。
4.  **步驟 3: 下載修復檔：** 識別完成後，進入步驟 3。點擊「Generate ACF Files and Download (.zip)」。
5.  **應用修復：**
    * 解壓縮下載的 ZIP 檔案。
    * 複製所有生成的 `appmanifest_xxxxx.acf` 檔案。
    * 將它們直接貼上到 Steam 的 `steamapps` 資料夾中 (例如：`C:\Program Files (x86)\Steam\steamapps`)。
    * 重新啟動 Steam 客戶端。遊戲現在應該會顯示為已安裝。
    * **重要步驟：** 在 Steam 中對每個恢復的遊戲點擊右鍵，選擇「內容」->「已安裝檔案」->「驗證遊戲檔案的完整性...」，以確保 Steam 完整驗證安裝。

### 🛠️ 開發結構

本工具分為三個檔案：

1.  `index.html`: 主結構、樣式，以及腳本連結。
2.  `app.js`: 所有 JavaScript 邏輯，包括資料夾掃描、AppID 匹配和 ACF 生成。
3.  `README.md`: 本說明文件。

請確保所有檔案位於同一個目錄中，以確保工具能正確運行。