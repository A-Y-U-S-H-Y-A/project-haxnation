import express from 'express';
// const path = require('path');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static('public'));

// In-memory data (no database)
const products = [
    {
        id: 1,
        name: "Classic Blue Jeans",
        description: "Timeless straight-leg denim with premium cotton blend",
        price: 2999,
        image: "https://plus.unsplash.com/premium_photo-1674828601362-afb73c907ebe?q=80&w=453&auto=format&fit=crop"
    },
    {
        id: 2,
        name: "Slim Fit Dark Wash",
        description: "Modern slim-fit jeans in dark indigo wash",
        price: 3499,
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop"
    },
    {
        id: 3,
        name: "Vintage Distressed",
        description: "Authentic vintage look with carefully crafted distressing",
        price: 4299,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop"
    },
    {
        id: 4,
        name: "Premium Selvedge",
        description: "Japanese selvedge denim for the discerning enthusiast",
        price: 7999,
        image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop"
    }
];

// Expired discount codes (the CTF challenge)
const discountCodes = [
    {
        code: "SUMMER2023",
        discount: 100,
        validUntil: "2023-08-31T23:59:59Z",
        description: "Get an item for free off the summer collection"
    }
];

// API Routes
app.get('/api/items', (req, res) => {
    res.json(products);
});

app.get('/api/items/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// Discounts page route
app.get('/discounts', (req, res) => {
    res.sendFile("discounts.html", { root: "public" });
});

// Get available discount codes
app.get('/api/discounts', (req, res) => {
    res.json(discountCodes);
});

// Vulnerable discount application endpoint
app.post('/api/apply-discount', (req, res) => {
    const { code, validUntil } = req.body;

    // Input validation
    if (!code || !validUntil) {
        return res.status(400).json({
            success: false,
            message: 'Missing discount code or validity timestamp'
        });
    }

    // Find the discount code
    const discount = discountCodes.find(d => d.code === code);
    if (!discount) {
        return res.status(404).json({
            success: false,
            message: 'Invalid discount code'
        });
    }

    // VULNERABILITY: Trust client-provided timestamp instead of using server time
    // This is the intended vulnerability for the CTF
    try {
        const clientTimestamp = new Date(validUntil);

        // Validate that the timestamp format is correct
        if (isNaN(clientTimestamp.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timestamp format'
            });
        }

        // The vulnerable logic: using client-provided timestamp instead of server time
        if (clientTimestamp <= new Date(discount.validUntil)) {
            // Success! The client manipulated the timestamp
            return res.json({
                success: true,
                message: 'Congratulations! You\'ve successfully exploited the time loop vulnerability!',
                discount: discount.discount,
                code: code
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Discount code "${code}" has expired. Valid until: ${discount.validUntil}`
            });
        }

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timestamp format'
        });
    }
});

// Regular checkout endpoint (non-vulnerable)
app.post('/api/checkout', (req, res) => {
    const { cartItems } = req.body;

    // 1. Basic validation: Ensure cartItems is a non-empty array.
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart is empty or in an invalid format.'
        });
    }

    let total = 0;
    const sanitizedOrderItems = []; // A new, trusted list of items for the order.

    // 2. Loop through each item from the client's cart.
    for (const item of cartItems) {
        // Find the corresponding product on the server to get its real price.
        const product = products.find(p => p.id === item.id);

        // 3. Validation: If the product doesn't exist on the server, it's an invalid request.
        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product with ID ${item.id} not found.`
            });
        }

        // It's also good practice to validate the quantity.
        const quantity = parseInt(item.quantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid quantity for product ID ${item.id}.`
            });
        }

        // 4. Build the sanitized list and calculate total using server-side data.
        sanitizedOrderItems.push({
            id: product.id,
            name: product.name,
            price: product.price, // **Crucially, using the price from the server.**
            quantity: quantity
        });

        total += product.price * quantity;
    }

    const { discountCode, validUntil } = req.body;

    // Input validation
    if (!discountCode || !validUntil) {
        return res.status(400).json({
            success: false,
            message: 'Missing discount code or validity timestamp'
        });
    }

    // Find the discount code
    const discount = discountCodes.find(d => d.code === discountCode);
    if (!discount) {
        return res.status(404).json({
            success: false,
            message: 'Invalid discount code'
        });
    }

    // VULNERABILITY: Trust client-provided timestamp instead of using server time
    // This is the intended vulnerability for the CTF
    try {
        const clientTimestamp = new Date(validUntil);

        // Validate that the timestamp format is correct
        if (isNaN(clientTimestamp.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timestamp format'
            });
        }

        // The vulnerable logic: using client-provided timestamp instead of server time
        if (clientTimestamp <= new Date(discount.validUntil)) {
            // Success! The client manipulated the timestamp
            total = 0;

        } else {
            return res.status(400).json({
                success: false,
                message: `Discount code "${code}" has expired. Valid until: ${discount.validUntil}`
            });
        }

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timestamp format'
        });
    }
    if (total === 0) {
        res.json({
            success: true,
            message: 'Order placed successfully!',
            total: total,
            flag: 'HXN{t1m3_l00p_succ3$$}',
            orderId: Math.random().toString(36).substr(2, 9).toUpperCase()
        });
    }
    else {
        res.json({
            success: false,
            message: 'Insufficient funds!',
            total: total,
            orderId: Math.random().toString(36).substr(2, 9).toUpperCase()
        });
    }

});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 CTF Server running on http://localhost:${PORT}`);
    console.log(`📋 Challenge: Navigate to /discounts to start the challenge`);
    console.log(`🎯 Objective: Apply an expired discount by manipulating the timestamp`);
});