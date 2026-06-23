import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

// Recreate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory storage for products and logs
let products = [
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
        price: 2799,
        image: "https://images.unsplash.com/photo-1718252540617-6ecda2b56b57?w=400&h=500&fit=crop"
    },
    {
        id: 3,
        name: "Vintage Wash Jeans",
        description: "Distressed denim with vintage appeal",
        price: 3299,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=400&h=500&fit=crop"
    },
    {
        id: 4,
        name: "High-Waist Jeans",
        description: "Flattering high-waist design",
        price: 2899,
        image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop"
    }
];

let compilationLogs = [
    {
        id: 1,
        timestamp: new Date('2024-01-15T10:30:00Z').toISOString(),
        template: 'product-card.ejs',
        status: 'success',
        code: `<div class="product">
  <h3><%= product.name %></h3>
  <p>Price: ₹<%= product.price %></p>
</div>`,
        output: 'Template compiled successfully'
    },
    {
        id: 2,
        timestamp: new Date('2024-01-15T11:45:00Z').toISOString(),
        template: 'banner.ejs',
        status: 'error',
        code: `<div class="banner">
  <% const data = fetch_legacy({'item':['name', 'type'], 'system':null}); %>
  <h2><%= data.title %></h2>
</div>`,
        output: 'ReferenceError: fetch_legacy is not defined'
    },
    {
        id: 3,
        timestamp: new Date('2024-01-15T14:20:00Z').toISOString(),
        template: 'footer.ejs',
        status: 'success',
        code: `<footer>
  <p>&copy; 2024 DenimCraft</p>
</footer>`,
        output: 'Template compiled successfully'
    }
];

// Legacy function for CTF challenge
function fetch_legacy(config) {
    if (!config || typeof config !== 'object') {
        throw new Error('Invalid configuration object');
    }
    
    const validItemVars = ['name', 'type', 'id', 'description', 'price'];
    const validSystemVars = ['version', 'env', 'flag', 'status'];
    
    if (config.item && Array.isArray(config.item)) {
        const invalidVars = config.item.filter(v => !validItemVars.includes(v));
        if (invalidVars.length > 0) {
            throw new Error(`Invalid item variables: ${invalidVars.join(', ')}. Valid variables: ${validItemVars.join(', ')}`);
        }
    }
    
    if (config.system !== null && config.system !== undefined) {
        if (Array.isArray(config.system)) {
            const invalidVars = config.system.filter(v => !validSystemVars.includes(v));
            if (invalidVars.length > 0) {
                throw new Error(`Invalid system variables: ${invalidVars.join(', ')}. Valid variables: ${validSystemVars.join(', ')}`);
            }
            
            // If flag is requested, return the flag
            if (config.system.includes('flag')) {
                return {
                    flag: 'HXN{T3MPL4T3_H4ck3rs_Y0u}',
                    message: 'Legacy system flag retrieved successfully'
                };
            }
        } else {
            throw new Error(`System must be an array or null. Valid variables: ${validSystemVars.join(', ')}`);
        }
    }
    
    return { status: 'ok', data: 'Legacy fetch completed' };
}

// Cookie middleware to set default permissions
app.use((req, res, next) => {
    if (!req.cookies.perms) {
        res.cookie('perms', 'user', { httpOnly: true });
    }
    next();
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



app.get('/sitemap.xml', (req, res) => {
    const baseUrl = ``;
    
    let urls = [
        { loc: `${baseUrl}/`, priority: 1.0 },
        { loc: `${baseUrl}/api/items`, priority: 0.8 },
        { loc: `${baseUrl}/admin/add-item`, priority: 0.6 }
    ];

    // Add product-specific links dynamically
    products.forEach(product => {
        urls.push({
            loc: `${baseUrl}/api/items/${product.id}`,
            priority: 0.7
        });
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `
    <url>
        <loc>${u.loc}</loc>
        <changefreq>daily</changefreq>
        <priority>${u.priority}</priority>
    </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
});


// API Routes
app.get('/api/items', (req, res) => {
    res.json(products);
});

app.get('/api/items/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);
    
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
});

app.post('/api/checkout', (req, res) => {
    const { cartItems } = req.body;
    const userRole = req.cookies.perms || 'user';
    
    if (userRole !== 'admin') {
        return res.json({
            success: false,
            message: 'Checkout is restricted to admin users only. Please contact an administrator.'
        });
    }
    
    res.json({
        success: true,
        message: 'Order placed successfully!',
        flag: 'This is a simulated checkout. No real transaction occurred.'
    });
});

// Admin routes (protected by cookie)
// app.get('/admin', (req, res) => {
//     if (req.cookies.perms !== 'admin') {
//         return res.status(403).send(`
//             <html>
//                 <head>
//                     <title>Access Denied</title>
//                     <script src="https://cdn.tailwindcss.com"></script>
//                 </head>
//                 <body class="bg-gray-100 min-h-screen flex items-center justify-center">
//                     <div class="bg-white p-8 rounded-lg shadow-md text-center">
//                         <h1 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
//                         <p class="text-gray-600 mb-4">You need admin permissions to access this page.</p>
//                         <a href="/" class="text-blue-600 hover:underline">← Back to Store</a>
//                     </div>
//                 </body>
//             </html>
//         `);
//     }
    
//     res.redirect('/admin/add-item');
// });

app.get('/admin/add-item', (req, res) => {
    if (req.cookies.perms !== 'admin') {
        return res.status(403).send('Access denied. Admin permissions required.');
    }
    
    res.render('admin', { logs: compilationLogs });
});

app.post('/admin/compile', (req, res) => {
    if (req.cookies.perms !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { template, preview } = req.body;
    
    try {
        // Create a safe context for template compilation
        const templateContext = {
            fetch_legacy: fetch_legacy,
            product: {
                name: "Sample Product",
                price: 1999,
                description: "Sample description",
                id: 999
            }
        };
        
        const compiled = ejs.render(template, templateContext);
        
        const log = {
            id: compilationLogs.length + 1,
            timestamp: new Date().toISOString(),
            template: `custom-${Date.now()}.ejs`,
            status: 'success',
            code: template,
            output: preview ? compiled : 'Template compiled successfully'
        };
        
        compilationLogs.unshift(log);
        
        res.json({
            success: true,
            output: preview ? compiled : 'Template compiled successfully',
            log: log
        });
        
    } catch (error) {
        const log = {
            id: compilationLogs.length + 1,
            timestamp: new Date().toISOString(),
            template: `custom-${Date.now()}.ejs`,
            status: 'error',
            code: template,
            output: error.message
        };
        
        compilationLogs.unshift(log);
        
        res.json({
            success: false,
            output: error.message,
            log: log
        });
    }
});

app.get('/admin/logs', (req, res) => {
    if (req.cookies.perms !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(compilationLogs);
});

// Start server
app.listen(8080, () => { console.log("Server started on 8080"); });