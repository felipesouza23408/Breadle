package com.breadle.backend.service;

import com.breadle.backend.entity.Usuario;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetEmailService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PasswordResetEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromAddress;
    private final String frontendBaseUrl;

    public PasswordResetEmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${breadle.email.from:no-reply@breadle.com}") String fromAddress,
        @Value("${breadle.frontend-url:http://localhost:4200}") String frontendBaseUrl
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromAddress = fromAddress;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public void sendResetLink(Usuario usuario, String token) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new EmailDeliveryException("O envio de e-mail não está configurado.");
        }

        String link = frontendBaseUrl + "/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(usuario.getEmail());
        message.setSubject("Redefinição de senha do Breadle");
        message.setText("""
            Olá, %s!

            Recebemos uma solicitação para redefinir a senha da sua conta Breadle.
            Para escolher uma nova senha, acesse o link abaixo. Ele expira em 30 minutos e só pode ser usado uma vez:

            %s

            Se você não solicitou esta alteração, ignore esta mensagem. Sua senha continuará a mesma.
            """.formatted(usuario.getNome(), link));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.error("Não foi possível enviar o e-mail de redefinição de senha.");
            throw new EmailDeliveryException("Não foi possível enviar o e-mail de redefinição.", exception);
        }
    }
}
