package com.breadle.backend.ai;

public class AiQuotaExceededException extends RuntimeException {

    public AiQuotaExceededException() {
        super("Você atingiu o limite diário do assistente. Sua cota será renovada à meia-noite UTC.");
    }
}
