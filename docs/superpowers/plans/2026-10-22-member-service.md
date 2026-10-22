# RE:FIX 會員服務實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for native execution) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 會員在首頁風格的介面管理自己的報修與零件需求，管理員在原工作區處理工單及回覆。

**Architecture:** 新增獨立會員入口與 `/api/member` 介面，沿用既有帳號、工單、附件與費用資料。會員 DTO 排除內部草稿與管理欄位；零件需求另存資料表，不作為維修費用。原內部 API 改由管理員使用。

**Tech Stack:** 現有 Java 21、Spring Boot、Spring Security、JPA、Flyway、React、Vite、Vitest、Playwright；不新增第三方套件。

**Spec:** `docs/superpowers/specs/2026-10-22-member-service-design.md`

## Global Constraints

- 保留既有帳號、歷史工單與費用；不變更使用者角色、不清除正式資料庫。
- 一般登入回首頁；報修及進度查詢有明確登入後目的地。
- 會員只能存取本人建立的工單；即使被指派到別人工單也不能經會員端讀取。
- 零件名稱最多 120 字、數量 1–99、用途最多 2000 字、HTTP/HTTPS 連結最多 1000 字；伺服器不抓取連結。
- 零件需求狀態：PENDING／REVIEWED／REJECTED／WITHDRAWN；不計入維修費用。
- 會員不使用內部派工、維修紀錄編輯、設備管理與費用草稿功能。
- 本次完成會員介面、需求回覆、通知與下一步提示；正式報價同意、付款、商城與保固另案，不顯示尚未實作的按鈕。
- 所有驗證使用隔離資料庫；原專案套用及 GitHub 推送分開處理。

## Review Focus

1. 舊登入 token 與舊網址不可繞過會員權限限制（Task 1、4）。
2. 工單在會員填需求時被結案，提交必須拒絕且保留輸入（Task 3、5）。
3. 原有通知含被指派的他人工單，會員通知不得洩漏標題或位置（Task 2、6）。
4. 需求送出後網路中斷，重新載入確認後才重送，費用不可變動（Task 3、5）。
5. 管理員回覆與會員撤回同時發生，只能一方成功（Task 3、5）。

## Task 1：會員 API 與內部 API 分離

**Files:** 新增 `src/main/java/com/taskflow/fixflow/MemberController.java`、`MemberService.java`、`MemberViews.java`；修改 `SecurityConfig.java`；新增 `src/test/java/com/taskflow/MemberApiIntegrationTest.java`。

**Interfaces:** GET `/api/member/tickets?status=&query=&page=0&size=10` → `{items,total,page,totalPages}`；GET `/api/member/tickets/{id}` → 明確列出的會員詳細 DTO。MemberService.requireOwned(Long id, User actor, boolean lock) → Ticket，不符合所有權回 404。MemberViews 不回傳 repairDraft、全站設備清單、人員 email。

- [ ] 寫測試：匿名 401、會員甲讀會員乙工單／附件為 404、指定 ASSIGNED/ALL 參數不擴大範圍、會員呼叫 `/api/tickets` 與 `/api/assets` 等內部路由為 403、舊 `/api/auth/login` token 也受相同限制、管理員仍能派工。
- [ ] 執行 `mvn -Dtest=MemberApiIntegrationTest test`，確認新端點／限制未存在而失敗。
- [ ] 實作所有權查詢及 DTO，於 SecurityConfig 依序保留 auth、本人帳號與改密碼端點，再允許會員端點，將其餘既有業務端點限制 ADMIN。會員端拒絕 ADMIN，提示使用管理入口；原安全設定的公開文件端點維持。
- [ ] 盤點並測試 tickets/export、workspace、notifications、users/technicians、assets、cost-reports 等實際 controller 路徑；不得僅覆蓋前端目前使用的端點。
- [ ] 跑目標測試與既有安全測試，依新規格更新原先預期一般帳號可派工的案例，再提交這一組變更。

## Task 2：會員報修、驗收、照片與通知

**Files:** 修改 MemberController、MemberService；新增 `MemberRequests.java`、`MemberAttachmentController.java`；抽出 `AttachmentService.java` 供既有 AttachmentController 與會員入口共用；修改 NotificationRepository／NotificationService 的會員專用查詢；新增 `MemberWorkflowIntegrationTest.java`。

**Interfaces:** POST `/api/member/tickets`（標題、描述、位置、category、priority，無 assetId）；POST `/{id}/comments`；POST `/{id}/cancel`、`/{id}/accept`、`/{id}/rework`。附件路由 `/api/member/tickets/{id}/attachments` 沿用 PNG/JPEG、5 MB、10 張限制。GET `/api/member/summary` → `{active,awaitingAcceptance,closed}`。GET `/api/member/notifications` 與 POST `/{id}/read`，只查本人收件且工單 createdBy 為本人。

- [ ] 寫測試：會員建立者取自登入帳號；傳入 createdBy、assetId 不可擴權；只有 OPEN/ASSIGNED 可取消，RESOLVED 可驗收或退回；已結束工單不能留言／上傳；他人附件與舊通知不可讀取。
- [ ] 執行 `mvn -Dtest=MemberWorkflowIntegrationTest test` 確認失敗。
- [ ] 實作會員驗證後重用 TicketService 的狀態及日誌操作；改密碼沿用 `/api/users/me/password`。附件共用服務保留驗證、下載與交易失敗清理，不複製一份未驗證的儲存邏輯。
- [ ] 詳細 DTO 僅提供正式維修紀錄、已登錄費用、公開留言與照片。摘要以伺服器查詢取得，不以當頁工單數假裝總數。
- [ ] 測試上述流程及停用帳號／改密碼後 token 失效，確認舊管理端附件流程可用，再提交。

## Task 3：零件需求資料與流程

**Files:** 新增 `PartRequest.java`、`PartRequestRepository.java`、`PartRequestService.java`、`PartRequestController.java`；新增 `src/main/resources/db/migration/V6__part_requests.sql`；新增 `PartRequestIntegrationTest.java`。

**Interfaces:** entity 欄位 id、ticket、requestedBy、name、quantity、purpose、referenceUrl、status、reply、reviewedBy、createdAt、updatedAt、version（@Version）。POST `/api/member/tickets/{id}/part-requests`；GET `/api/member/part-requests?page=&size=`；POST `/api/member/part-requests/{id}/withdraw` body `{version}`；GET `/api/tickets/{id}/part-requests`；POST `/api/part-requests/{id}/reply` body `{version,status,reply}`（status 僅 REVIEWED/REJECTED，reply 1–2000 字）。回傳明確 DTO，不序列化 JPA entity。

- [ ] 寫測試：字數／數量邊界、空白名稱用途、javascript/file 連結拒絕、他人需求不可讀寫、工單已結案拒絕新需求、回覆與撤回版本衝突為 409、只可操作 PENDING、費用合計完全不變。
- [ ] 執行 `mvn -Dtest=PartRequestIntegrationTest test` 確認失敗。
- [ ] 實作獨立資料表與外鍵索引；先鎖工單再鎖需求，建立及狀態轉換在單一交易完成。保留需求原文，回覆／撤回不覆寫原需求內容。
- [ ] 驗證正式 Flyway schema 與本機 H2 entity schema 一致；資料遷移只新增，不改既有 repair_parts。
- [ ] 確認待驗收工單不能新增需求，但管理員可以回覆既存待確認需求；結案歷史可讀。執行目標測試並提交。

## Task 4：首頁風格會員入口與報修工作區

**Files:** 新增 `frontend/member.html`、`frontend/src/member/main.jsx`、`MemberApp.jsx`、`MemberLogin.jsx`、`MemberTickets.jsx`、`MemberTicketDetail.jsx`、`member.css`、`memberSession.js`；修改 landing/Navigation.jsx、HomeSupport.jsx、RepairPage.jsx、system/landingHandoff.js、system/main.jsx（以實際入口檔為準）、vite.system.config.js。

**Interfaces:** `/member.html` 顯示會員中心；`?screen=login` 登入後回 `/`；白名單 `next=report`／`next=tickets` 接續表單或列表。會員 session key 沿用 `fixflow.session.v1`，管理員 key 不變；首頁姓名必須經 `/api/users/me` 驗證。MemberTicketDetail 僅呼叫 `/member` 介面，不重用含派工操作的內部 TicketDetail。

- [ ] 新增 MemberApp.test.jsx：會員 session 過期導回登入且保留報修草稿，管理員 session 不被誤用，未知 next 回會員中心，登出清除個人資料。
- [ ] 執行 `npx vitest run --config vite.system.config.js src/member/MemberApp.test.jsx` 確認失敗。
- [ ] 實作深色冰藍會員導覽、狀態摘要、分頁篩選、詳情、正式費用、照片留言與驗收；每種載入／錯誤／空白狀態提供可操作提示。
- [ ] 新增報修頁沿用完整欄位暫存；會員建立表單不顯示全站設備搜尋。改密碼後回登入，保留既有密碼驗證。
- [ ] 修正首頁入口與舊 `/system.html` 會員網址，保留 action=new／view=tickets；管理員入口仍進入原工作區。不要藉任意網址 query 改變權限。
- [ ] 執行會員單元測試與既有登入／報修測試，再提交。

## Task 5：會員需求表單與管理員回覆

**Files:** 新增 `frontend/src/member/PartRequestForm.jsx`、`MemberPartRequests.jsx`、`frontend/src/system/PartRequestPanel.jsx`；修改 MemberTicketDetail、TicketDetail；新增 `PartRequestForm.test.jsx`。

**Interfaces:** PartRequestForm({ticketId,api,onSaved})、PartRequestPanel({ticketId,api})，使用 Task 3 DTO。會員列表顯示所屬工單、名稱、數量、狀態及回覆；管理員在同一工單的「會員零件需求」區回覆。

- [ ] 寫測試：必填與範圍驗證、提交中不能連點、錯誤保留輸入、409 提示重新整理、需求不出現在正式維修零件清單。
- [ ] 跑目標 Vitest，確認缺功能失敗。
- [ ] 實作表單與回覆區，連結以 HTTP/HTTPS 驗證後顯示，外連加 rel=noopener noreferrer；所有需求文字以 React 文字節點呈現。
- [ ] 網路失敗時提供「重新載入確認是否已送出」，不自動重送；工單轉為待驗收後表單保留輸入但禁止送出並說明原因。
- [ ] 管理員回覆成功刷新列表；會員可撤回待確認需求，版本衝突不假裝成功。跑測試並提交。

## Task 6：通知與下一步提示

**Files:** 修改 NotificationService；新增 `frontend/src/member/MemberNotifications.jsx`、`memberNextStep.js` 與測試；整合 MemberApp、PartRequestService。

**Interfaces:** `memberNextStep(status)` 回傳文案與可用操作（OPEN/ASSIGNED 等待處理、IN_PROGRESS 維修中、RESOLVED 驗收、CLOSED 查看紀錄、CANCELLED 再次新增報修入口）。需求通知包含 ticketId、partRequestId；可用既有 TicketNotification 加 nullable partRequestId，於 V6 一併遷移。

- [ ] 寫測試：新需求只通知啟用管理員，回覆只通知提出者，失敗交易沒有通知，已讀動作只作用本人通知；會員不能從歷史派工通知讀別人的資料。
- [ ] 跑對應後端測試與 memberNextStep 測試，確認新邏輯失敗。
- [ ] 實作交易內通知及會員通知入口，點擊回覆直接開對應工單與需求；後端所有權仍獨立檢查。
- [ ] 更新 UI 顯示精確狀態，需求「已回覆」不使工單顯示完成；重跑測試並提交。

## Task 7：端到端驗證與交付

**Files:** 新增 `frontend/tests-system/member-portal.spec.js`；更新 playwright.system.config.js 及舊 portal／權限預期；更新 docs/login-portals.md、docs/landing-website.md、新增 docs/member-service.md。

- [ ] 建立真實隔離後端測試：會員甲首頁登入、送報修與需求；管理員登入回覆、派工、開始維修與完成；會員查看回覆並驗收。驗證正式費用沒有自動加上需求費。
- [ ] 加入會員乙無法經直接 API 讀取甲資料、舊 token 內部寫入被拒絕、退出登入後看不到甲資料；既有技師角色在會員入口同樣只見自己的報修。
- [ ] 測試 320／390／1440 寬度、鍵盤導覽、焦點、減少動態、表單重整草稿；檢視截圖，避免錯誤訊息被隱藏。
- [ ] 執行 `mvn test`、`npx vitest run --config vite.system.config.js`、`npm run build:system`、`npx playwright test --config playwright.system.config.js`，記錄命令與結果；任何環境限制須如實記錄，不當成通過。
- [ ] 對照設計逐項自查並做獨立程式碼審查；修正後只重跑受影響驗證。以原專案副本驗證更新包與資料遷移，保留檔案與資料備份，禁止自動刪除正式資料。
- [ ] 更新操作說明，交付來源碼與驗證紀錄；未取得本次推送指示前不自動推 GitHub。

## 自查結論與執行方式

計畫涵蓋已確認設計中的首頁登入導向、會員狀態、報修延續、權限、正式費用、照片留言驗收、零件需求與管理員回覆、通知及舊入口相容。正式報價確認是下一階段，沒有以空白按鈕假裝完成。

建議由目前助理在同一對話依序實作，完成後做獨立審查；這些任務共用 DTO 與權限規則，循序實作能減少介面分歧。另一方式是逐項交由子代理實作與審查。等待使用者確認本計畫與執行方式後開始產品程式修改。
