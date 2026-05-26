const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPTIMA_API_KEY;
const API_SECRET = process.env.OPTIMA_API_SECRET;

app.post('/pay', async (req, res) => {
    try {
        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: phone and amount are required."
            });
        }

        // Updated to the Topup Endpoint from your documentation screenshot
        const url = "https://optimapaybridge.co.ke/api/v2/topup.php";

        // Structured exactly as required by the Topup API parameters
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
        return res.status(response.status).json(data);

    } catch (error) {
        console.error("Wallet Topup Initiation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing wallet topup request.",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Topup backend running on port ${PORT}`);
});
