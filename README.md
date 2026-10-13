# FixFlow 維修工單管理系統

Java / Spring Boot 與 React 維修管理專案，整合報修、派工、維修費用、驗收與設備履歷。

## 功能

- 註冊、JWT 登入、修改密碼與管理員帳號管理。
- 工單新增、編輯、搜尋、分頁、優先級、逾期篩選及 CSV 匯出。
- 在工單詳細資訊內派工、開始維修、填寫費用、提交完成與驗收退回。
- 「返回列表」回到清單；「上一步」讓維修中退回已派工、已派工退回待派工，保留已儲存費用與操作歷程。
- 人工費、零件明細與費用草稿；草稿不計入正式維修費用。
- 設備維修履歷；漏建設備的工單可在「未連結工單與費用」補連結，結案費用仍可追溯。
- 照片附件、留言、站內通知與手機版介面。

一般帳號可管理自己建立或目前指派給自己的工單，不必另外建立技師帳號；管理員可管理全系統工單。所有登入帳號都可維護設備基本資料，設備履歷中的工單與費用依工單權限顯示。

## 技術

Java 21、Spring Boot、Spring Security / JWT、JPA、Flyway、React、Vite。開發模式使用 H2 檔案資料庫，正式環境支援 PostgreSQL，Redis 為選用設定。測試採 JUnit、Vitest、Playwright。

## 本機啟動

需要 Java 21、Node.js 24.15 以上。第一次安裝套件需要網路。

在專案根目錄啟動後端：

~~~powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=complete"
~~~

另開終端機啟動完整版前端：

~~~powershell
cd frontend
npm ci
npm run dev:system
~~~

開啟 **http://127.0.0.1:5175/system.html**，後端使用 8080。
Windows 也可執行根目錄的 start-backend.cmd 與 frontend/start-system.cmd。
macOS / Linux 使用 sh mvnw spring-boot:run -Dspring-boot.run.profiles=complete。
完整版入口為 system.html；index.html 是獨立展示版。

## 本機示範帳號

complete 模式建立以下帳號，共同密碼為 FixFlow123!；也可自行註冊。

| 帳號 | 權限 |
| --- | --- |
| customer@fixflow.local | 一般帳號 |
| tech@fixflow.local | 一般帳號（相容舊技師角色） |
| admin@fixflow.local | 管理員 |

正式部署請使用 prod 模式與自己的環境變數，參考 .env.example。示範帳號與開發設定僅供本機使用。

## 驗證

~~~powershell
.\mvnw.cmd verify
cd frontend
npm ci
npm run test:system
npm run build:system
~~~

瀏覽器測試會建立測試帳號和工單，應使用獨立測試資料庫。參考 .github/workflows/fixflow.yml 的隔離環境，再執行 npm run test:e2e:system，勿指向日常使用資料。

## 結構與資料

- src/main/java/com/taskflow/fixflow：完整版 API、權限與業務邏輯。
- src/main/resources/db：Flyway 資料庫遷移。
- frontend/src/system：完整版 React 頁面。
- frontend/tests-system：瀏覽器流程測試。
- .github/workflows：自動驗證流程。

本機資料庫與照片位於 data/，不會上傳 Git；備份、環境密鑰與編譯產物也已排除。尚未提供備品庫存與定期保養排程。
