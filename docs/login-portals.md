# 登入入口

- 會員登入：/member.html?screen=login。可自行註冊；一般登入後回首頁，會員中心只顯示自己的報修。
- 管理員登入：/system.html?portal=admin。不提供公開建立管理員帳號。
- 兩個入口各自保存登入狀態；會員頁不因 portal 參數讀取管理員 session。
- /api/auth/admin-login、/api/auth/member-login 會驗證角色。舊 /api/auth/login 保留，但仍受後端業務端點權限限制。
- /api/member/** 限 CUSTOMER／TECHNICIAN，工單必須由本人建立；/api/users/me 與改密碼端點可供已登入者使用；其餘 /api/** 業務操作限 ADMIN。
- 不變更既有帳號或密碼。詳見 [會員中心](member-service.md)。
