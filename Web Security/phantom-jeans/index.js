import express from 'express';
import path from 'path';


const app = express();
const PORT = 3000;


// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory item store
const items = new Map([
    [1, { id: 1, name: "Classic Blue Jeans", price: 1299, description: "Timeless blue denim with perfect fit", image: "https://plus.unsplash.com/premium_photo-1674828601362-afb73c907ebe?q=80&w=453&auto=format&fit=crop"}],
    [2, { id: 2, name: "Slim Fit Dark Wash", price: 1599, description: "Modern slim fit with dark wash finish", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop" }],
    [3, { id: 3, name: "Ripped Street Style", price: 1899, description: "Trendy ripped jeans for urban look", image: "https://images.unsplash.com/photo-1510734790177-c931e3956547?w=400&h=500&fit=crop" }],
    [4, { id: 4, name: "High Waist Skinny", price: 1799, description: "High waisted skinny fit jeans", image: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&h=500&fit=crop" }],
    [5, { id: 5, name: "Premium Black Jeans", price: -999, description: "Ultra premium black denim with exclusive discount", image: "https://images.unsplash.com/photo-1631112230741-446762ee05ac?w=400&h=600&fit=crop" }], // Hidden item
    [6, { id: 6, name: "Black Jeans", price: 999, description: "Classic black denim jeans", image: "https://images.unsplash.com/photo-1718252540617-6ecda2b56b57?w=400&h=500&fit=crop" }],
    [7, { id: 7, name: "Bootcut Vintage", price: 1399, description: "Vintage style bootcut jeans", image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop" }],
    [8, { id: 8, name: "Cargo Denim", price: 2099, description: "Utility cargo style denim pants", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=500&fit=crop" }],
    [9, { id: 9, name: "Designer Distressed", price: 2499, description: "Designer distressed denim with premium details", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop" }],
    [10, { id: 10, name: "Raw Selvedge", price: 3299, description: "Premium raw selvedge denim for enthusiasts", image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop" }]
]);

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"&]/g, (char) => {
        const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        };
        return entities[char];
    });
}

// Get all visible items (exclude id=5)
app.get('/api/items', (req, res) => {
    const visibleItems = Array.from(items.values()).filter(item => item.id !== 5);
    res.json(visibleItems);
});

// Get specific item by ID
app.get('/api/items/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    // Validate ID
    if (isNaN(id) || id < 1 || id > 10) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = items.get(id);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
});

// Calculate cart total
app.post('/api/cart/total', (req, res) => {
    try {
        const { cartItems } = req.body;
        
        if (!Array.isArray(cartItems)) {
            return res.status(400).json({ error: 'Invalid cart data' });
        }
        
        let total = 0;
        const validatedItems = [];
        
        for (const cartItem of cartItems) {
            const id = parseInt(cartItem.id);
            const quantity = parseInt(cartItem.quantity);
            
            // Validate inputs
            if (isNaN(id) || isNaN(quantity) || quantity < 0 || quantity > 99) {
                return res.status(400).json({ error: 'Invalid item data' });
            }
            
            const item = items.get(id);
            if (!item) {
                return res.status(404).json({ error: `Item ${id} not found` });
            }
            
            const itemTotal = item.price * quantity;
            total += itemTotal;
            
            validatedItems.push({
                id: item.id,
                name: sanitizeInput(item.name),
                price: item.price,
                quantity: quantity,
                total: itemTotal
            });
        }
        
        res.json({
            items: validatedItems,
            total: total
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Checkout endpoint
app.post('/api/checkout', (req, res) => {
    try {
        const { cartItems } = req.body;
        
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ 
                error: 'Cart is empty',
                message: 'Add some items to your cart first!'
            });
        }
        
        let total = 0;
        let hasHiddenItem = false;
        
        for (const cartItem of cartItems) {
            const id = parseInt(cartItem.id);
            const quantity = parseInt(cartItem.quantity);
            
            if (isNaN(id) || isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ error: 'Invalid cart data' });
            }
            
            if (id === 5) {
                hasHiddenItem = true;
            }
            
            const item = items.get(id);
            if (!item) {
                return res.status(404).json({ error: `Item ${id} not found` });
            }
            
            total += item.price * quantity;
        }
        
        // Check if total is exactly 0 (CTF condition)
        if (total === 0) {
            return res.json({
                success: true,
                flag: 'HXN{FR33L0@D#R!}',
                message: 'Congratulations! You found the hidden discount!',
                total: 0
            });
        }
        
        // If total is not 0, deny checkout
        if (hasHiddenItem && total !== 0) {
            return res.status(400).json({
                success: false,
                message: 'Hmm, something\'s not quite right with your cart total. Keep exploring! 🤔',
                total: total
            });
        }
        
        // Normal checkout (should fail for this CTF)
        return res.status(400).json({
            success: false,
            message: 'Oops! This isn\'t the way. Try exploring more... there might be hidden treasures! 💎',
            total: total
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(8080, () => {
    console.log("Server started on 8080");
});