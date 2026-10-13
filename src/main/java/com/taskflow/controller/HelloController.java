package com.taskflow.controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
@GetMapping("/hello")
public String hello() {
    return "Hello TaskFlow!";
}
}

//專門接api請求的controller

//流程
//HelloController.java
       //↓
//@RestController
       //↓
//Spring Boot：我知道這個 Class 是 Controller 了