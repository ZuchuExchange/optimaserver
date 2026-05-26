const express = require('express');
const cors = require('cors'); // Required to bypass browser CORS blocks
const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for all origins
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Pull credentials from Render Environment Variables
const API_KEY = process.env.OPTIMA_API_KEY;
const API_SECRET = process.env.OPTIMA_API_SECRET;
const PAYMENT_ACCOUNT_ID = 17; // Fixed as requested

app.post('/pay', async (req, res) => {
    try {
        const { phone, amount } = req.body;

        // Validation check for mandatory inputs
        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: phone and amount are required."
            });
        }

        // Generate a dynamic reference automatically (e.g., REF1716942000000)
        const autoReference = `REF${Date.now()}`;
        const autoDescription = `Payment via API`;

        const url = "https://optimapaybridge.co.ke/api/v2/stkpush.php";

        const payload = {
            payment_account_id: PAYMENT_ACCOUNT_ID,
            phone: phone.toString().trim(),
            amount: Number(amount),
            reference: autoReference,
            description: autoDescription
        };

        // Network request wrapped in a promise-based fetch block
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Get the response body
        const data = await response.json();

        // Return the exact response from OptimaPay back to whoever requested it
        return res.status(response.status).json(data);

    } catch (error) {
        // Catch network errors, gateway timeouts, or JSON parsing crashes
        console.error("Payment Initiation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing STK push request.",
            error: error.message
        });
    }
});

// Set port for Render dynamically, fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Payment backend running on port ${PORT}`);
});
