const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPTIMA_API_KEY;
const API_SECRET = process.env.OPTIMA_API_SECRET;

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
                'X-API-KEY': API_KEY,
                'X-API-SECRET': API_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("OptimaPay Gateway Response:", data);

        return res.status(response.status).json(data);

    } catch (error) {
        console.error("Topup Request Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
});

// 2. UPDATED LIVE STATUS CHECK ENDPOINT (Matches your Frontend HTML Requirements)
// Your HTML script sends a POST here with { checkoutRequestId: "..." }
app.post('/callback', async (req, res) => {
    try {
        const { checkoutRequestId } = req.body;

        // Validation
        if (!checkoutRequestId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing 'checkoutRequestId' in request body." 
            });
        }

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({ 
                success: false, 
                message: "Server configuration error: API keys are missing on Render." 
            });
        }

        // Live Query directly to OptimaPayBridge API
        const response = await fetch('https://optimapaybridge.co.ke/api/v2/status.php', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ checkout_request_id: checkoutRequestId })
        });

        const data = await response.json();
        console.log(`Live Status check for ${checkoutRequestId}:`, data);

        // Return the raw or processed status data straight back to your HTML frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error("Live Status Check Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch live payment status from gateway.",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));
