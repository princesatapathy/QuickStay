package com.quickstay.Exceptions;

public class UnAuthorisedException extends RuntimeException{
    public UnAuthorisedException(String message) {
        super(message);
    }
}
