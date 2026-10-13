// 展示資料獨立放置，之後換成後端 API 時不需要更改畫面元件。
export function seedTickets() {
  return [
    ['000006', '三樓會議室冷氣漏水', '開啟約二十分鐘後開始滴水，請協助檢查排水管。', 'AIR_CONDITIONING', 'HIGH', 'OPEN', '3F・會議室 A', null, '09:42'],
    ['000005', '辦公區 Wi-Fi 連線不穩定', '東側辦公區網路斷線，影響視訊會議。', 'NETWORK', 'CRITICAL', 'IN_PROGRESS', '5F・東側辦公區', '王小明', '09:18'],
    ['000004', '茶水間飲水機無法加熱', '熱水按鈕沒有反應，冷水供應正常。', 'EQUIPMENT', 'MEDIUM', 'ASSIGNED', '2F・茶水間', '陳怡君', '08:56'],
    ['000003', '走廊照明燈持續閃爍', '靠近電梯的兩盞燈持續閃爍。', 'ELECTRICAL', 'LOW', 'RESOLVED', '3F・電梯走廊', '林志遠', '08:30'],
    ['000002', '一樓入口門禁感應異常', '刷卡後門鎖偶爾沒有開啟。', 'EQUIPMENT', 'HIGH', 'CLOSED', '1F・主要入口', '陳怡君', '08:12'],
    ['000001', '接待區百葉窗拉繩鬆脫', '已確認由原廠保固處理，取消此次報修。', 'OTHER', 'LOW', 'CANCELLED', '1F・接待區', null, '08:00'],
  ].map(([number, title, description, category, priority, status, location, assignedTo, time]) => ({
    id: `demo-${number}`, ticketNo: `FIX-2026-${number}`, title, description,
    category, priority, status, location, assignedTo, createdAt: `2026-09-21T${time}:00+08:00`,
  }));
}
