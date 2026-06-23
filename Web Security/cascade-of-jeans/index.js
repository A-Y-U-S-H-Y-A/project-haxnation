import express from 'express';
import path from 'path';



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory data storage
const giftCards = {
    'WELCOME25': { value: 25},
    'DENIM50': { value: 50}
};

const products = [
    {
        id: 1,
        name: "Classic Blue Jeans",
        description: "Timeless straight-fit jeans in classic blue wash",
        price: 299,
        image: "https://plus.unsplash.com/premium_photo-1674828601362-afb73c907ebe?q=80&w=453&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        id: 2,
        name: "Dark Wash Slim",
        description: "Modern slim-fit jeans with dark indigo wash",
        price: 3499,
        image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=600&fit=crop"
    },
    {
        id: 3,
        name: "Vintage Relaxed",
        description: "Comfortable relaxed-fit with vintage distressing",
        price: 4299,
        image: "https://images.unsplash.com/photo-1714729382668-7bc3bb261662?w=400&h=600&fit=crop"
    },
    {
        id: 4,
        name: "Premium Raw Denim",
        description: "Unwashed selvedge denim for a custom fit over time",
        price: 6999,
        image: "https://images.unsplash.com/photo-1631112230741-446762ee05ac?w=400&h=600&fit=crop"
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

// Get available gift cards (for display purposes)
app.get('/api/gift-cards', (req, res) => {
    const availableCards = Object.keys(giftCards).map(code => ({
        code,
        value: giftCards[code].value,
        used: giftCards[code].used
    }));
    res.json(availableCards);
});

app.post('/api/checkout', (req, res) => {
    const { cartItems, giftCodes = [] } = req.body;

    if (!cartItems || cartItems.length === 0) {
        return res.json({
            success: false,
            message: 'Your cart is empty!'
        });
    }

    // ✅ Calculate cart total based on trusted server-side prices
    let cartTotal = 0;
    const validatedCart = [];

    for (let item of cartItems) {
        const product = products.find(p => p.id === item.id);
        if (!product) {
            return res.json({
                success: false,
                message: `Invalid product with id ${item.id}`
            });
        }
        const totalForItem = product.price * item.quantity;
        cartTotal += totalForItem;

        validatedCart.push({
            id: product.id,
            name: product.name,
            quantity: item.quantity,
            price: product.price,
            subtotal: totalForItem
        });
    }

    // Process gift cards with VULNERABILITY
    let giftCardDiscount = 0;
    let lastUsedCode = null;
    let appliedCodes = [];

    for (let code of giftCodes) {
        if (!giftCards[code]) {
            continue;
        }
        if (lastUsedCode === code) {
            continue; // flawed logic: only prevents consecutive duplicates
        }

        giftCardDiscount += giftCards[code].value;
        appliedCodes.push(code);
        lastUsedCode = code;
    }

    // Calculate final amount
    const finalAmount = Math.max(0, cartTotal - giftCardDiscount);

    if (finalAmount > 0) {
        return res.json({
            success: false,
            message: `Insufficient gift card balance! You need ₹${finalAmount} more.`,
            cartTotal,
            giftCardDiscount,
            finalAmount,
            validatedCart
        });
    }

    // Successful checkout
    return res.json({
        success: true,
        message: `Order completed successfully! Cart total: ₹${cartTotal}, Gift card discount: ₹${giftCardDiscount}, HXN{G!FT_C4RD-M4ST3R}`,
        cartTotal,
        giftCardDiscount,
        appliedCodes,
        validatedCart,
        orderCompleted: true
    });
});


// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(8080, () => {
    console.log("Server started on 8080");
});