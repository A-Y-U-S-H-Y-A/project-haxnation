import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

// HXN{4dm!n_c00k13$}

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Sample products data
const products = [
    {
        id: 1,
        name: "Classic Blue Jeans",
        description: "Timeless straight-fit jeans in classic blue wash",
        price: 2999,
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

// Encoding functions for the cookie
function base64Encode(str) {
    return Buffer.from(str).toString('base64');
}

function base64Decode(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

const BASE45_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

// Encode string → Base45
function stringToBase45(str) {
  const buf = Buffer.from(str, "utf8");
  let result = "";

  for (let i = 0; i < buf.length; i += 2) {
    if (i + 1 < buf.length) {
      let x = (buf[i] << 8) + buf[i + 1];
      let e = x % 45;
      let d = Math.floor(x / 45) % 45;
      let c = Math.floor(x / (45 * 45));
      result += BASE45_ALPHABET[c] + BASE45_ALPHABET[d] + BASE45_ALPHABET[e];
    } else {
      let x = buf[i];
      let d = Math.floor(x / 45);
      let e = x % 45;
      result += BASE45_ALPHABET[d] + BASE45_ALPHABET[e];
    }
  }

  return result;
}

// Decode Base45 → string
function base45ToString(base45Str) {
  let values = [...base45Str].map(c => BASE45_ALPHABET.indexOf(c));
  let bytes = [];

  for (let i = 0; i < values.length; ) {
    if (i + 2 < values.length) {
      let x = values[i] * 45 * 45 + values[i + 1] * 45 + values[i + 2];
      if (x > 0xFFFF) throw new Error("Invalid base45 triplet");
      bytes.push(x >> 8, x & 0xFF);
      i += 3;
    } else {
      let x = values[i] * 45 + values[i + 1];
      if (x > 0xFF) throw new Error("Invalid base45 pair");
      bytes.push(x);
      i += 2;
    }
  }

  return Buffer.from(bytes).toString("utf8");
}


const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Encode string → Base32
function stringToBase32(str) {
  const buffer = Buffer.from(str, "utf8");
  let bits = "";
  let output = "";

  // Convert each byte to binary
  for (let byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  // Split into 5-bit groups
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) {
      // pad with zeros
      output += BASE32_ALPHABET[parseInt(chunk.padEnd(5, "0"), 2)];
    } else {
      output += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
  }

  // Add padding "=" so length is multiple of 8 (per RFC 4648)
  while (output.length % 8 !== 0) {
    output += "=";
  }

  return output;
}

// Decode Base32 → string
function base32ToString(base32Str) {
  // Remove padding
  let cleanInput = base32Str.replace(/=+$/, "");
  let bits = "";
  let output = [];

  // Convert each Base32 char to 5-bit binary
  for (let char of cleanInput) {
    const val = BASE32_ALPHABET.indexOf(char.toUpperCase());
    if (val === -1) throw new Error("Invalid Base32 character");
    bits += val.toString(2).padStart(5, "0");
  }

  // Split into 8-bit groups
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    output.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(output).toString("utf8");
}



function stringToHex(str) {
  return Buffer.from(str, 'utf8').toString('hex');
}

function hexToString(hexStr) {
  return Buffer.from(hexStr, 'hex').toString('utf8');
}


// Encode auth data: JSON → base64 → base56 → hex
function encodeAuth(authData) {
    const json = JSON.stringify(authData);
    const b64 = base64Encode(json);
    const b56 = stringToBase32(b64);
    const rot = stringToHex(b56);
    return rot;
}

// Decode auth data: hex → base56 → base64 → JSON
function decodeAuth(encodedAuth) {
    try {
        const unrot = hexToString(encodedAuth);
        const b56decoded = base32ToString(unrot);
        if (!b56decoded) return null;
        
        const b64decoded = base64Decode(b56decoded);
        if (!b64decoded) return null;
        
        return JSON.parse(b64decoded);
    } catch (e) {
        return null;
    }
}

// Middleware to check auth cookie
function checkAuth(req, res, next) {
    const authCookie = req.cookies.auth;
    
    if (authCookie) {
        const authData = decodeAuth(authCookie);
        if (authData) {
            req.user = authData;
        }
    }
    
    // If no valid auth, set default user role
    if (!req.user) {
        const defaultAuth = { role: 'user', username: 'guest', security: '4ea8755ff84410f7aa722c7961e1fbdf8fc00e6e93d96888dd601b3dcaaaeba5' };
        const encodedAuth = encodeAuth(defaultAuth);
        res.cookie('auth', encodedAuth, { httpOnly: false }); // Make it accessible to JS for CTF
        req.user = defaultAuth;
    }
    
    next();
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/items', checkAuth, (req, res) => {
    res.json(products);
});

app.get('/api/items/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);
    
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.post('/api/checkout', checkAuth, (req, res) => {
    const { cartItems } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
        return res.json({
            success: false,
            message: 'Your cart is empty!'
        });
    }
    
    // Check if user is admin
    if (req.user.role === 'admin' && !req.user.security) {
        return res.json({
            success: true,
            message: 'Congratulations! You have admin access!',
            flag: 'HXN{4dm!n_c00k13$}'
        });
    }
    
    // Regular user checkout
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
        success: false,
        message: `Sorry, checkout is only available for admin users. Your cart total would be ₹${total}.`
    });
});

// Admin panel route (bonus)
app.get('/admin', checkAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send(`
            <html>
                <head>
                    <title>Access Denied</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-gray-100 min-h-screen flex items-center justify-center">
                    <div class="bg-white p-8 rounded-lg shadow-md text-center">
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                        <p class="text-gray-700 mb-4">You need admin privileges to access this page.</p>
                        <p class="text-sm text-gray-500">Current role: ${req.user.role}</p>
                        <a href="/" class="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go Back</a>
                    </div>
                </body>
            </html>
        `);
    }

        if (req.user.role == 'admin' && req.user.security) {
        return res.status(403).send(`
            <html>
                <head>
                    <title>Access Denied</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-gray-100 min-h-screen flex items-center justify-center">
                    <div class="bg-white p-8 rounded-lg shadow-md text-center">
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                        <p class="text-gray-700 mb-4">Your admin privileges fail the security check.</p>
                        <a href="/" class="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go Back</a>
                    </div>
                </body>
            </html>
        `);
    }
    
    res.send(`
        <html>
            <head>
                <title>Admin Panel</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 min-h-screen flex items-center justify-center">
                <div class="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 class="text-2xl font-bold text-green-600 mb-4">🎉 Admin Panel 🎉</h1>
                    <p class="text-gray-700 mb-4">Welcome, admin! You've successfully exploited the cookie vulnerability.</p>
                    <div class="bg-green-100 p-4 rounded-lg font-mono text-lg font-bold text-green-800 mb-4">
                        HXN{4dm!n_c00k13$}
                    </div>
                    <p class="text-sm text-gray-600 mb-4">The cookie was encoded using: JSON → base64 → base32 → hex</p>
                    <a href="/" class="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Back to Store</a>
                </div>
            </body>
        </html>
    `);
});


app.listen(PORT, () => {
    console.log(`🚀 CTF Server running on http://localhost:${PORT}`);
    console.log(`📝 Challenge: Change your role to 'admin' to get the flag!`);
    console.log(`🔍 The cookie uses multiple encoding layers...`);
});