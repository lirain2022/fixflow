package com.taskflow.entity;

/**
 * 維修工單可使用的狀態。
 * enum 只定義選項；允許的狀態轉換會在 Service 中檢查。
 */
public enum TicketStatus {
    OPEN,        // 已建立，等待派工
    ASSIGNED,    // 已指派技術人員
    IN_PROGRESS, // 正在維修
    RESOLVED,    // 維修完成，等待客戶確認
    CLOSED,      // 客戶確認完成，正式結案
    CANCELLED    // 已取消
}