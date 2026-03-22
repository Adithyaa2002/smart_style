const Brevo = require("@getbrevo/brevo");
console.log("Brevo exports:", Object.keys(Brevo));

try {
    if (Brevo.TransactionalEmailsApi) {
        console.log("TransactionalEmailsApi is available.");
        const apiInstance = new Brevo.TransactionalEmailsApi();
        console.log("apiInstance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(apiInstance)));
    } else {
        console.log("TransactionalEmailsApi is NOT available in Brevo exports.");
    }
} catch (e) {
    console.error("Error Checking SDK:", e.message);
}
