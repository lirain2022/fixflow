package com.taskflow.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.taskflow.entity.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {

}