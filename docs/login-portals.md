# 登入入口

- 首頁右上角次要按鈕：管理員登入（`/system.html?portal=admin`），不提供自助註冊。
- 首頁右上角與報修流程：會員登入（`/system.html`），可註冊會員。
- 兩個入口有各自的 sessionStorage 登入狀態，後端 `/api/auth/admin-login` 與 `/api/auth/member-login` 會驗證帳號類型。
- 既有 `/api/auth/login` 保留相容性；既有 API 權限檢查不變。
- 這次分開登入入口，不改變既有的派工授權與工單可見範圍。
