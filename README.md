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
- 會員報修資料與零件需求合併成一張表單，一次送出；進度清單摘要顯示，詳細資訊按需展開。
- 管理員建立維修報價，會員確認或要求修改；保留各版報價，與實際維修費用分開記錄。

會員入口用來報修、追蹤自己的案件、提出零件需求與確認報價；管理員從管理入口進行派工、維修處理、設備與費用管理。

## 技術

Java 21、Spring Boot、Spring Security / JWT、JPA、Flyway、React、Vite。開發模式使用 H2 檔案資料庫，正式環境支援 PostgreSQL，Redis 為選用設定。測試採 JUnit、Vitest、Playwright。

## 本機啟動

### Windows：下載後雙擊開啟

1. 先安裝 Java **JDK 21**（包含 javac）及 **Node.js 24.15 以上**（包含 npm）。安裝後重新開啟終端機。
2. 從 GitHub 的 **Code → Download ZIP** 下載，完整解壓縮到固定資料夾。
3. 在有 `pom.xml` 的專案最外層，雙擊 **`開啟系統.cmd`**。第一次會安裝套件並下載 Maven 依賴，請保持網路連線並等待；就緒後自動開啟首頁。
4. 想從資料夾外開啟，雙擊 **`建立桌面捷徑.cmd`**，之後使用桌面的 **FixFlow** 捷徑即可。
5. 使用完畢可雙擊 **`關閉系統.cmd`**，資料會保留。

不需安裝 Maven；找不到 Maven 時會使用專案內的 Maven Wrapper。請勿只把 `開啟系統.cmd` 搬到桌面，它需要同資料夾的程式檔案；請建立捷徑。搬動整個專案後，刪除舊捷徑再重新建立。

啟動紀錄在 `.fixflow/logs/`。若 8080 或 5175 被其他程式占用，啟動器會提示，請先關閉原本開著的系統。重複點擊同一份專案的開啟入口，會使用已啟動的服務。詳細說明見 [開始使用.md](開始使用.md)。

### 手動啟動

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

首頁為 **http://127.0.0.1:5175/**，會員入口為 `/member.html`，管理員入口為 `/system.html?portal=admin`，展示頁為 `/demo.html`。後端使用 8080。
macOS / Linux 使用 sh mvnw spring-boot:run -Dspring-boot.run.profiles=complete。

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

本機資料庫與照片位於 data/，不會上傳 Git；備份、環境密鑰、啟動紀錄與編譯產物也已排除。從 GitHub 下載到新資料夾時，不會帶入舊電腦的會員、工單、密碼或照片，可使用上述示範帳號或重新註冊。需要搬移既有資料時，先關閉系統並備份原專案完整的 data/，再搬移至新版專案，勿覆蓋已有資料而未備份。尚未提供備品庫存與定期保養排程。
