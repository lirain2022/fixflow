package com.taskflow.fixflow;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ApiException.class) ResponseEntity<?> business(ApiException e){return error(e.status,e.getMessage());}
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e){return error(400,"請檢查必填欄位、格式與長度："+e.getBindingResult().getFieldErrors().getFirst().getField());}
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class}) ResponseEntity<?> malformed(Exception e){return error(400,"輸入格式或選項不正確");}
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(Exception e){return error(409,"資料重複或已被修改，請重新整理後再試");}
    @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<?> large(Exception e){return error(413,"圖片不可超過 5 MB");}
    private ResponseEntity<?> error(int status,String message){return ResponseEntity.status(status).body(Map.of("status",status,"message",message));}
}
