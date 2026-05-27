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

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // If it timed out out after 5s but successfully sent, track the checkout request ID
        if (data.success && data.status === "pending" && data.checkout_request_id) {
            transactionStatusStore[data.checkout_request_id] = "pending";
        }

        return res.status(response.status).json(data);

    } catch (error) {
        console.error("Topup Request Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
});

// 2. NEW: OptimaPay Webhook Gateway Callback Listener
// OptimaPay will automatically post transaction updates here in the background
app.post('/callback', (req, res) => {
    try {
        const callbackData = req.body;
        console.log("Received Webhook From OptimaPay:", callbackData);

        // Map data parameters based on OptimaPay callback keys
        const checkoutRequestId = callbackData.checkout_request_id;
        const isSuccess = callbackData.success;
        const status = callbackData.status;

        if (checkoutRequestId) {
            if (isSuccess === true || status === "completed" || status === "Success") {
                transactionStatusStore[checkoutRequestId] = "completed";
            } else {
                transactionStatusStore[checkoutRequestId] = "failed";
            }
        }

        // Always return a 200 OK to OptimaPay so they know you received the data
        return res.status(200).json({ success: true, message: "Callback processed successfully" });
    } catch (error) {
        console.error("Callback Route Processing Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 3. NEW: Status Check Route for Frontend Polling
// Your HTML page can hit this route to ask "Did the user pay yet?"
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
