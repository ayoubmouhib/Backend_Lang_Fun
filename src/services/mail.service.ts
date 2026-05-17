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
    /*
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
            */

    async sendPasswordResetEmail(to: string, codenumber: string) {
        const resetLink = `http://yourapp.com/reset-password?token=${codenumber}`;
        const mailOptions = {
            from: 'Auth-backend service',
            to: to,
            subject: 'Password Reset Request',
            html: `<p>You requested a password reset. Use This Code for Continue The Process ${codenumber}</p>`,
        };

        await this.transporter.sendMail(mailOptions);
    }


    /*
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
        */

    async sendVerificationEmail(to: string, token: string) {
        // Change this to your actual backend URL!
        const verifyLink = `http://localhost:3000/auth/verify-email?token=${token}`;

        const mailOptions = {
            from: 'Auth-backend service',
            to: to,
            subject: 'Please Verify Your Email',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">Welcome!</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyLink}" 
                       style="background-color: #4CAF50; 
                              color: white; 
                              padding: 14px 28px; 
                              text-decoration: none; 
                              border-radius: 4px;
                              display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Or copy and paste this link into your browser:
                </p>
                <p style="background-color: #f5f5f5; 
                          padding: 10px; 
                          word-break: break-all;
                          font-size: 12px;">
                    ${verifyLink}
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    This link expires in 24 hours.
                </p>
            </div>
        `,
        };

        await this.transporter.sendMail(mailOptions);
    }
}