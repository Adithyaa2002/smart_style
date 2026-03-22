require("dotenv").config();
const nodemailer = require("nodemailer");

async function testSMTP() {
    console.log("--- ADVANCED SMTP TEST ---");
    console.log("HOST:", process.env.EMAIL_HOST);
    console.log("PORT:", process.env.EMAIL_PORT);
    console.log("USER:", process.env.EMAIL_USER);

    // Try with port 587 and rejectUnauthorized: false
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log("Attempting to verify transporter...");
        await transporter.verify();
        console.log("✅ Transporter verification successful!");

        const mailOptions = {
            from: `"SmartStyle Test" <${process.env.EMAIL_USER}>`,
            to: "sisira_23l001cs@gecwyd.ac.in", // User's test email from previous logs
            subject: "SmartStyle SMTP Test - Fixed",
            text: "If you see this, the SMTP connection is working correctly with the new settings.",
        };

        console.log("Attempting to send test email...");
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ SMTP Test Failed");
        console.error("Error Message:", error.message);
        console.error("Error Code:", error.code);
        if (error.response) {
            console.error("SMTP Response:", error.response);
        }
    }
}

testSMTP();
