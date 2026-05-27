const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPTIMA_API_KEY;
const API_SECRET = process.env.OPTIMA_API_SECRET;

// Object to store active transaction statuses temporarily in memory
const transactionStatusStore = {};

// 1. Triggers the initial STK Push
app.post('/pay', async (req, res) => {
    try {
        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({ success: false, message: "Phone and amount are required." });
        }

        const url = "https://optimapaybridge.co.ke/api/v2/topup.php";
        const payload = {
            phone: phone.toString().trim(),
            amount: Number(amount)
        };

        // FIXED: Header casing matched exactly to OptimaPay API Specifications
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'X-API-SECRET': API_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("OptimaPay Gateway Response:", data);

        // If it successfully initiated, track the checkout request ID
        if (data.success && data.status === "pending" && data.checkout_request_id) {
            transactionStatusStore[data.checkout_request_id] = "pending";
        }

        return res.status(response.status).json(data);

    } catch (error) {
        console.error("Topup Request Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
});

// 2. OptimaPay Webhook Gateway Callback Listener
// IMPORTANT: You must register https://server100-847a.onrender.com/callback in your OptimaPay dashboard!
app.post('/callback', (req, res) => {
    try {
        const callbackData = req.body;
        console.log("Received Webhook From OptimaPay:", callbackData);

        const checkoutRequestId = callbackData.checkout_request_id;
        const isSuccess = callbackData.success;
        const status = callbackData.status;

        if (checkoutRequestId) {
            // Check variations of success definitions from gateway responses
            if (isSuccess === true || status === "completed" || status === "Success") {
                transactionStatusStore[checkoutRequestId] = "completed";
                console.log(`Transaction ${checkoutRequestId} marked as COMPLETED.`);
            } else {
                transactionStatusStore[checkoutRequestId] = "failed";
                console.log(`Transaction ${checkoutRequestId} marked as FAILED.`);
            }
        }

        // Always return a 200 OK to OptimaPay so they stop retrying the webhook
        return res.status(200).json({ success: true, message: "Callback processed successfully" });
    } catch (error) {
        console.error("Callback Route Processing Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Status Check Route for Frontend Polling
app.get('/status/:checkout_id', (req, res) => {
    const checkoutId = req.params.checkout_id;
    const currentStatus = transactionStatusStore[checkoutId] || "unknown";
    
    return res.json({
        checkout_request_id: checkoutId,
        status: currentStatus
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));
