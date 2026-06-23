import express from 'express';
import path from 'path';    
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static('public'));

// Product data
const products = [
    {
        id: 1,
        name: "Classic Blue Denim",
        description: "Timeless straight-fit jeans in classic blue wash",
        price: 2999,
        image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop"
    },
    {
        id: 2,
        name: "Slim Fit Black",
        description: "Modern slim-fit jeans in deep black",
        price: 3499,
        image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop"
    },
    {
        id: 3,
        name: "Vintage Distressed",
        description: "Trendy distressed jeans with vintage wash",
        price: 3999,
        image: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&h=500&fit=crop"
    },
    {
        id: 4,
        name: "Dark Indigo",
        description: "Premium dark indigo denim with raw hem",
        price: 4499,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop"
    },
    {
        id: 5,
        name: "Light Wash Relaxed",
        description: "Comfortable relaxed-fit in light wash",
        price: 2799,
        image: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=400&h=500&fit=crop"
    },
    {
        id: 6,
        name: "Skinny Fit Grey",
        description: "Sleek skinny-fit jeans in charcoal grey",
        price: 3299,
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop"
    }
];

// API endpoint to get all products
app.get('/api/items', (req, res) => {
    res.json(products);
});

// API endpoint to get a specific product
app.get('/api/items/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const product = products.find(p => p.id === productId);
    
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

// Checkout endpoint (not used in CTF, just for completeness)
app.post('/api/checkout', (req, res) => {
    const { cartItems } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
        return res.json({
            success: false,
            message: 'Your cart is empty!'
        });
    }
    
    res.json({
        success: false,
        message: 'Checkout functionality is not available in this demo.'
    });
});

// Redirect endpoint - THE VULNERABLE ENDPOINT
app.get('/redirect', (req, res) => {
    const redirectUrl = req.query.url;
    
    if (!redirectUrl) {
        return res.status(400).send('Missing redirect URL parameter');
    }
    
    // Check if it's a file:// protocol - THIS IS THE INTENDED VULNERABILITY
    if (redirectUrl == ('file://flag.txt')) {
        try {
            return res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Flag Found!</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
                            <div class="text-center">
                                <div class="mb-8">
                                    <i class="text-8xl">🎉</i>
                                </div>
                                <h1 class="text-4xl font-bold mb-4">Congratulations!</h1>
                                <p class="text-xl mb-8">You found the flag:</p>
                                <div class="bg-gray-800 p-6 rounded-lg inline-block">
                                    <code class="text-green-400 text-2xl font-mono">HXN{Wher3Am1!}</code>
                                </div>
                                <p class="mt-8 text-gray-400">You successfully exploited the local file redirect vulnerability!</p>
                            </div>
                        </body>
                        </html>
                    `);
        } catch (error) {
            return res.status(500).send('Error reading file');
        }
    }
    
    // For regular URLs, perform redirect
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
        return res.redirect(redirectUrl);
    }
    
    res.status(400).send('Invalid redirect URL');
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`CTF Challenge server running on http://localhost:${PORT}`);
    console.log(`\n🎯 CTF Challenge: "Where Am I?"`);
    console.log(`📝 Objective: Find and retrieve the flag`);
    console.log(`💡 Hint: Look carefully at the HTML comments...\n`);
});