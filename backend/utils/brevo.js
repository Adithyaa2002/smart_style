require("dotenv").config();
const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
    try {
        console.log("--- SMTP SEND ATTEMPT ---");
        console.log(`Host: ${process.env.EMAIL_HOST}, Port: ${process.env.EMAIL_PORT}, User: ${process.env.EMAIL_USER}`);

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: '"SmartStyle" <smartstyleproject@gmail.com>',
            to: email,
            subject: "Your SmartStyle Login OTP",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>SmartStyle Security</h2>
                    <p>Use the following OTP to complete your login. This OTP is valid for 10 minutes.</p>
                    <h1 style="color: #2874f0;">${otp}</h1>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error sending OTP via SMTP:", error.message);
        // Fallback to console for development
        console.log(`\n\n📧 [SMTP FALLBACK] OTP for ${email}: ${otp}\n\n`);
    }
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    try {
        console.log("--- SMTP SEND ATTEMPT (PASSWORD RESET) ---");
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: '"SmartStyle Support" <smartstyleproject@gmail.com>',
            to: email,
            subject: "SmartStyle Password Reset Request",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>SmartStyle Password Reset</h2>
                    <p>You recently requested to reset your password for your SmartStyle account. Click the button below to reset it.</p>
                    <a href="${resetUrl}" style="background-color: #2874f0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
                    <p style="margin-top: 20px;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset link is only valid for the next 60 minutes.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error sending password reset email via SMTP:", error.message);
        console.log(`\n\n📧 [SMTP FALLBACK] Password Reset Link for ${email}: \n${resetUrl}\n\n`);
    }
};

module.exports = { sendOTP, sendPasswordResetEmail };
