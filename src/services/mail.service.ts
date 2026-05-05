// mail.service.ts
import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: this.configService.get<string>('mail.user'),
                pass: this.configService.get<string>('mail.pass'),
            }
        });
    }

    async sendPasswordResetEmail(to: string, token: string) {
        const resetLink = `http://yourapp.com/reset-password?token=${token}`;
        const mailOptions = {
            from: 'Auth-backend service',
            to: to,
            subject: 'Password Reset Request',
            html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`,
        };

        await this.transporter.sendMail(mailOptions);
    }

    async sendVerificationEmail(to: string, token: string) {
        const verifyLink = `http://yourapp.com/auth/verify-email?token=${token}`;
        const mailOptions = {
            from: 'Auth-backend service',
            to: to,
            subject: 'Please Verify Your Email',
            html: `<p>Welcome! Please verify your email address by clicking the link below:</p><p><a href="${verifyLink}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
        };

        await this.transporter.sendMail(mailOptions);
    }
}