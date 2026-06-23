import express from 'express';



const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (no database)
let redeemedCodes = new Set();
let userBalance = 0;

// Items data
const items = [
    {
        id: 1,
        name: "Classic Blue Jeans",
        description: "Timeless comfort meets modern style",
        price: 200,
        image: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&h=500&fit=crop"
    },
    {
        id: 2,
        name: "Premium Black Jeans",
        description: "Sleek and sophisticated for any occasion",
        price: 300,
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop"
    },
    {
        id: 3,
        name: "Vintage Wash Jeans",
        description: "Distressed perfection with character",
        price: 350,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop"
    },
    {
        id: 4,
        name: "Designer Slim Fit",
        description: "Contemporary cut for the modern individual",
        price: 450,
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop"
    },
    {
        id: 5,
        name: "Luxury Raw Denim",
        description: "Unprocessed excellence for the connoisseur",
        price: 600,
        image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop"
    },
    {
        id: 6,
        name: "Limited Edition Jeans",
        description: "Exclusive design with premium materials",
        price: 800,
        image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=500&fit=crop"
    }
];


// Helper function to validate redeem code format
function isValidRedeemCodeFormat(code) {
    return /^REDEEM\d+$/.test(code);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile("index.html", { root: "public" });
});

app.get('/redeem', (req, res) => {
    res.sendFile("redeem.html", { root: "public" });
});

// API Routes
app.get('/api/items', (req, res) => {
    res.json(items);
});

app.get('/api/balance', (req, res) => {
    res.json({ balance: userBalance });
});

app.post('/api/redeem', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ 
            success: false, 
            message: 'Redeem code is required' 
        });
    }

    // Validate code format
    if (!isValidRedeemCodeFormat(code)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid redeem code format' 
        });
    }

    // Check if code has already been redeemed
    if (redeemedCodes.has(code)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Code has already been redeemed' 
        });
    }

    // Extract user ID from code (REDEEM123 -> 123)
    const userId = parseInt(code.replace('REDEEM', ''));
    
    // Simple validation - user ID should be a positive number
    if (!userId || userId <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid redeem code' 
        });
    }

    // Add code to redeemed set
    redeemedCodes.add(code);
    
    // Add 100 to user balance
    userBalance += 100;

    res.json({ 
        success: true, 
        message: 'Code redeemed successfully! +₹100 added to your balance',
        balance: userBalance 
    });
});

app.post('/api/checkout', (req, res) => {
    const { itemId, redeemedCodes: clientRedeemedCodes } = req.body;
    
    if (!itemId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Item ID is required' 
        });
    }

    if (!clientRedeemedCodes || !Array.isArray(clientRedeemedCodes)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Redeemed codes array is required' 
        });
    }

    // Find the item
    const item = items.find(i => i.id === itemId);
    if (!item) {
        return res.status(400).json({ 
            success: false, 
            message: 'Item not found' 
        });
    }

    // Calculate balance from redeemed codes
    let calculatedBalance = 0;
    const validCodes = new Set();

    for (const code of clientRedeemedCodes) {
        if (isValidRedeemCodeFormat(code) && redeemedCodes.has(code)) {
            if (!validCodes.has(code)) {
                validCodes.add(code);
                calculatedBalance += 100;
            }
        }
    }

    // Check if user has enough balance
    if (calculatedBalance < item.price) {
        return res.status(400).json({ 
            success: false, 
            message: `Insufficient balance. You have ₹${calculatedBalance}, but need ₹${item.price}` 
        });
    }

    // Process purchase - deduct from user balance
    userBalance = calculatedBalance - item.price;

    // Check if this purchase qualifies for the flag
    if (item.price === 200) { // Cheapest item
        return res.json({ 
            success: true, 
            message: 'Purchase successful!',
            flag: 'HXN{r3d33m_expl01t!}',
            item: item.name,
            remainingBalance: userBalance
        });
    }

    res.json({ 
        success: true, 
        message: 'Purchase successful!',
        item: item.name,
        remainingBalance: userBalance
    });
});

// Get redeemed codes (for debugging - this endpoint should be discoverable)
app.get('/api/redeemed-codes', (req, res) => {
    res.json({ 
        codes: Array.from(redeemedCodes),
        count: redeemedCodes.size 
    });
});

// Reset endpoint for testing
app.post('/api/reset', (req, res) => {
    redeemedCodes.clear();
    userBalance = 0;
    res.json({ success: true, message: 'System reset successfully' });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('CTF Challenge: No More Refer');
    console.log('Objective: Exploit the predictable redeem code pattern to get enough balance');
    console.log('Hint: Codes follow pattern REDEEM<userId> where userId is sequential');
});