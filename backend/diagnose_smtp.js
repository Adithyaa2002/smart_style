require("dotenv").config();
const nodemailer = require("nodemailer");

async function diagnose() {
    console.log("--- SMTP DIAGNOSTIC ---");
    console.log("HOST:", process.env.EMAIL_HOST);
    console.log("PORT:", process.env.EMAIL_PORT);
    console.log("USER:", process.env.EMAIL_USER);
    console.log("PASS:", process.env.EMAIL_PASS ? "PRESENT" : "MISSING");

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        console.log("Verifying transporter...");
        await transporter.verify();
        console.log("✅ Transporter is ready to take our messages");

        const mailOptions = {
            from: `"SmartStyle" <${process.env.EMAIL_USER}>`,
            to: "sisira_23l001cs@gecwyd.ac.in",
            subject: "SmartStyle Diagnostic Test",
            text: "This is a diagnostic test email.",
        };

        console.log("Sending mail...");
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Mail sent successfully:", info.messageId);
    } catch (error) {
        console.error("❌ Diagnostic Failed:");
        console.error("Error Message:", error.message);
        console.error("Error Code:", error.code);
        console.error("Full Error:", error);
    }
}

diagnose();
