package com.taskflow.entity;
import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import lombok.Setter;
@Entity
@Getter
@Setter
public class Task {
    //規範
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
//   Title
//   必填  
// → nullable = false → title 不能是空值 NULL
// → length=100 → 最多設定 100 個字元
    @Column(nullable = false, length = 100)
    private String title;
    

//   description
// → 可以不填
// → 最多 500 字元
    @Column(length = 500)
    private String description;



// TaskStatus
//     ↓
// 只能選 TODO / IN_PROGRESS / DONE 
//     ↓
// 存進 PostgreSQL
//     ↓
// "TODO"
// "IN_PROGRESS"
// "DONE"
// TaskStatus
// 只能選 TODO / IN_PROGRESS / DONE
// 存進 PostgreSQL

@Enumerated(EnumType.STRING)
@Column(nullable = false)
private TaskStatus status = TaskStatus.TODO;


// 現在兩個時間欄位：createdAt 和 updatedAt
// LocalDateTime 用來表示時間
// 年 / 月 / 日 / 時 / 分 / 秒
// 2026-09-17 13:25:30
//createdAt  → 這筆 Task「什麼時候建立」
@Column(nullable = false)
private LocalDateTime createdAt = LocalDateTime.now();



// updatedAt  → 這筆 Task「最後什麼時候修改」
@Column(nullable = false)
private LocalDateTime updatedAt = LocalDateTime.now();



// JPA 準備把這筆 Task 的修改存進資料庫「之前」，先執行下面的方法。
@PreUpdate
public void preUpdate() {
    this.updatedAt = LocalDateTime.now();


//以上流程
// 修改 Task
//    ↓
// JPA 準備 UPDATE
//    ↓
// @PreUpdate
//    ↓
// updatedAt = 現在時間
//    ↓
// UPDATE 到 PostgreSQL
}
}