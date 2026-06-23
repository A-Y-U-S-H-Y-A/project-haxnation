import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Mock products data
const products = [
    {
        id: 1,
        name: "Classic Blue Jeans",
        description: "Timeless blue denim with a perfect fit",
        price: 2499,
        image: "https://plus.unsplash.com/premium_photo-1674828601362-afb73c907ebe?q=80&w=453&auto=format&fit=crop"
    },
    {
        id: 2,
        name: "Black Skinny Jeans",
        description: "Sleek black jeans for a modern look",
        price: 2899,
        image: "https://images.unsplash.com/photo-1718252540617-6ecda2b56b57?w=400&h=500&fit=crop"
    },
    {
        id: 3,
        name: "Distressed Denim",
        description: "Trendy ripped jeans with vintage appeal",
        price: 3299,
        image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=600&fit=crop"
    },
    {
        id: 4,
        name: "High-Waist Jeans",
        description: "Retro-style high-waisted comfort fit",
        price: 2799,
        image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop"
    },
    {
        id: 5,
        name: "Dark Wash Straight",
        description: "Professional dark wash for office wear",
        price: 3199,
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop"
    },
    {
        id: 6,
        name: "Light Blue Bootcut",
        description: "Classic bootcut in light blue wash",
        price: 2699,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop"
    }
];

// Valid discount codes (expired for the main challenge)
const discountCodes = {
    'WELCOME10': { percentage: 10, validUntil: '2023-12-31T23:59:59Z' },
    'SUMMER20': { percentage: 20, validUntil: '2023-08-31T23:59:59Z' },
    'DENIM15': { percentage: 15, validUntil: '2023-12-31T23:59:59Z' }
};

// Permission levels
const VALID_PERMS = ['user', 'admin'];

// Middleware to check X-Perms header
function checkPerms(requiredLevel) {
    return (req, res, next) => {
        const userPerms = req.headers['x-perms'];
        
        if (!userPerms) {
            return res.status(401).json({
                error: 'Access denied',
            });
        }

        if (!VALID_PERMS.includes(userPerms)) {
            return res.status(403).json({
                error: 'Invalid permissions',
                message: `Valid permissions are: ${VALID_PERMS.join(', ')}`
            });
        }

        const permLevel = VALID_PERMS.indexOf(userPerms);
        const requiredLevelIndex = VALID_PERMS.indexOf(requiredLevel);

        if (permLevel < requiredLevelIndex) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Required: ${requiredLevel}, Current: ${userPerms}`,
                upgrade_hint: 'Contact system administrator for higher access levels'
            });
        }

        req.userPerms = userPerms;
        next();
    };
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/items', checkPerms('user'), (req, res) => {
    res.json(products);
});

// Discount code application - hint about headers
app.post('/api/apply-discount', checkPerms('user'), (req, res) => {
    const { code, validUntil } = req.body;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            message: 'Discount code required'
        });
    }

    const discount = discountCodes[code.toUpperCase()];
    if (!discount) {
        return res.status(404).json({
            success: false,
            message: 'Invalid discount code',
            debug_info: 'Available codes expire periodically. Check system logs for active promotions.'
        });
    }

    // Check if code is expired (always will be for this challenge)
    const now = new Date();
    const expiryDate = new Date(validUntil || discount.validUntil);
    
    if (now > expiryDate) {
        return res.status(400).json({
            success: false,
            message: 'Discount code has expired',
            expired_on: discount.validUntil
        });
    }

    res.json({
        success: true,
        code: code,
        discount: discount.percentage,
        message: `${discount.percentage}% discount applied successfully!`
    });
});

// Checkout endpoint
app.post('/api/checkout', checkPerms('user'), (req, res) => {
    const { cartItems, discountCode, validUntil } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart is empty'
        });
    }

    let total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountApplied = 0;

    if (discountCode) {
        const discount = discountCodes[discountCode.toUpperCase()];
        if (discount) {
            const now = new Date();
            const expiryDate = new Date(validUntil || discount.validUntil);
            
            if (now <= expiryDate) {
                discountApplied = Math.round((total * discount.percentage) / 100);
                total -= discountApplied;
            }
        }
    }

    // Simulate successful checkout
    res.json({
        success: true,
        message: `Order placed successfully! Total: ₹${total}`,
        orderId: 'DC' + Date.now(),
        total: total,
        discountApplied: discountApplied
    });
});

// Dead end - requires editor perms but doesn't lead anywhere useful
app.get('/api/inventory', checkPerms('editor'), (req, res) => {
    res.json({
        message: 'Inventory system access granted',
        items: products.map(p => ({
            id: p.id,
            name: p.name,
            stock: Math.floor(Math.random() * 100) + 10,
            location: 'Warehouse-A'
        })),
        note: 'Full system access requires elevated permissions'
    });
});

// Another dead end - user level access
app.get('/api/profile', checkPerms('user'), (req, res) => {
    res.json({
        message: 'User profile access',
        permissions: req.userPerms,
        available_endpoints: ['/api/items', '/api/apply-discount', '/api/checkout'],
        note: 'Limited access - contact administrator for more features'
    });
});

// The main challenge endpoints - require admin
app.get('/api/files', checkPerms('admin'), (req, res) => {
    try {
        // List files in current directory (simulated)
        const files = [
            'package.json',
            'server.js', 
            'README.md',
            'config.json',
            'flag.txt',
            '.env.example'
        ];
        
        res.json({
            message: 'Administrative file system access',
            available_files: files,
            permissions: req.userPerms,
            usage: 'Use /api/read?file=<filename> to read file contents',
            warning: 'Restricted access - admin permissions required'
        });
    } catch (error) {
        res.status(500).json({
            error: 'File system error',
            message: error.message
        });
    }
});

app.get('/api/read', checkPerms('admin'), (req, res) => {
    const filename = req.query.file;
    
    if (!filename) {
        return res.status(400).json({
            error: 'Missing parameter',
            message: 'file parameter is required',
            usage: '/api/read?file=<filename>'
        });
    }

    // Only allow reading flag.txt for security
    if (filename !== 'flag.txt') {
        return res.status(403).json({
            error: 'Access denied',
            message: `Cannot read file: ${filename}`,
            allowed_files: ['flag.txt'],
            security_note: 'Only specific files are accessible via this endpoint'
        });
    }

    if (filename === 'flag.txt') {
        return res.json({
            filename: 'flag.txt',
            content: 'HXN{h3ader_p0w3rful_4cc3ss}',
            message: 'Congratulations! You successfully exploited the header-based access control.',
        });
    }

    res.status(404).json({
        error: 'File not found',
        message: `File ${filename} does not exist`
    });
});

// Hidden endpoint discovery hint in robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Disallow: /api/docs/
Disallow: /internal/
Allow: /api/items
Allow: /api/apply-discount
Allow: /api/checkout
`);
});

// Fake API docs endpoint that hints at headers
app.get('/api/docs',checkPerms('admin'), (req, res) => {
    res.json({
        title: 'DenimCraft Internal API Documentation',
        version: '2.1',
        endpoints: {
            '/api/items': {
                method: 'GET',
                description: 'Get product catalog',
                auth: 'None required'
            },
            '/api/apply-discount': {
                method: 'POST', 
                description: 'Apply discount codes',
                auth: 'None required'
            },
            '/api/checkout': {
                method: 'POST',
                description: 'Process orders',
                auth: 'None required'
            },
            '/api/inventory': {
                method: 'GET',
                description: 'View inventory levels',
                auth: 'X-Perms: editor (minimum)'
            },
            '/api/files': {
                method: 'GET',
                description: 'File system access',
                auth: 'X-Perms: admin (required)',
                note: 'Restricted administrative endpoint'
            },
            '/api/read': {
                method: 'GET',
                description: 'Read file contents',
                auth: 'X-Perms: admin (required)',
                parameters: 'file=<filename>',
                security: 'Limited file access for security'
            }
        },
        authentication: {
            type: 'Custom Header',
            header: 'X-Perms',
            valid_values: ['user', 'editor', 'admin'],
            note: 'Permission escalation handled by system administrators'
        },
        contact: 'devteam@denimcraft.com'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Endpoint not found'
    });
});

// Start server
app.listen(8080, () => {
    console.log(`🚀 DenimCraft CTF Server running on http://localhost:8080`);
    console.log(`📁 Static files served from 'public' directory`);
    console.log(`🏴 Challenge: Header Mishap`);
    console.log(`💡 Hint: Check /robots.txt and explore API endpoints`);
});