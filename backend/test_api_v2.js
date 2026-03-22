require("dotenv").config();
const Brevo = require("@getbrevo/brevo");

async function testApi() {
    console.log("--- BREVO API TEST (V2) ---");

    try {
        let apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

        let sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = "SmartStyle API Test";
        sendSmtpEmail.htmlContent = "<html><body><h1>This is a test from the Brevo API</h1></body></html>";
        sendSmtpEmail.sender = { "name": "SmartStyle", "email": "a42368001@smtp-brevo.com" };
        sendSmtpEmail.to = [{ "email": "sisira_23l001cs@gecwyd.ac.in" }];

        console.log("Sending email via API...");
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("✅ API SUCCESS! Message ID:", data.messageId);
    } catch (error) {
        console.error("❌ API FAILURE:");
        if (error.response && error.response.body) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else if (error.message) {
            console.error(error.message);
        } else {
            console.error(error);
        }
    }
}

testApi();
