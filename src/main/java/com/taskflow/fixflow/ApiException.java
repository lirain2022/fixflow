package com.taskflow.fixflow;
public class ApiException extends RuntimeException {
    public final int status;
    public ApiException(int status,String message){super(message);this.status=status;}
    public static ApiException missing(){return new ApiException(404,"找不到工單或沒有存取權限");}
}
