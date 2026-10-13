# FixFlow 前端

這一版包含工單列表、搜尋、狀態篩選、新增工單、欄位驗證與手機版。
目前是展示模式，資料保存在瀏覽器 localStorage，尚未串接 Spring Boot，不需要啟動後端。

## 這台電腦啟動

```powershell
cd C:\Projects\taskflow\frontend
.\start.cmd
```

或雙擊本資料夾的 `start.cmd`，開啟 http://127.0.0.1:5173 。
保留啟動的終端機，停止時按 Ctrl+C。若 5173 已被使用，請先停止前一個前端。
不要直接雙擊 `index.html`，React 原始碼需要透過 Vite 開啟。

啟動器使用 PATH 中的 Node；找不到時使用本機既有的 Codex Node runtime，不修改系統 PATH。
這台電腦的套件已安裝。其他電腦請先安裝 Node.js 24 LTS（24.15.0 以上，含 npm），然後執行：

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

依賴鎖定於 `package-lock.json`。Node 下限同時考量測試工具需求；Vite 官方文件：https://vite.dev/guide/

## 試著操作

1. 搜尋「冷氣」，搭配「待派工」篩選。
2. 點「新增工單」，填入標題、描述、分類、優先級與位置。
3. 建立成功後，新工單顯示在最上方，狀態為「待派工」。
4. 重新整理，剛建立的工單仍會保留。
5. 縮小視窗，列表會變成手機版卡片。

資料只保存在同一瀏覽器與同一網址來源（包含 port）。清除網站資料會移除新增的展示工單。
目前工單編號只供單一瀏覽器展示，正式編號、角色權限及跨使用者同步會在後端串接時處理。

## 程式學習順序

| 檔案 | 負責什麼 |
| --- | --- |
| `src/App.jsx` | 版面、搜尋、篩選與開關新增視窗 |
| `src/components/TicketList.jsx` | 桌面表格與手機卡片 |
| `src/components/CreateTicketDialog.jsx` | 表單、驗證、儲存錯誤及鍵盤焦點 |
| `src/tickets/ticketStore.js` | 讀取、驗證與儲存展示工單，之後接 API 的位置 |
| `src/tickets/constants.js` | 狀態、優先級與分類的中英文對照 |
| `src/tickets/seedTickets.js` | 首次開啟的示範工單 |
| `src/styles.css` | 顏色、間距與響應式版面 |

## 測試與打包

```powershell
npm test
npm run build
npm run test:e2e
```

端對端測試使用本機 Google Chrome，在 5174 啟動獨立測試伺服器。
測試瀏覽器資料不會影響一般使用的瀏覽器。建置檔放在 `dist/`，並未對外部署。

若執行環境無法結束測試子伺服器，可自行先啟動 5174 的 Vite，再於另一終端機執行：

```powershell
$env:FIXFLOW_EXTERNAL_SERVER = '1'
npm run test:e2e
```

這種模式需自行停止測試伺服器；一般使用不需要設定此環境變數。
