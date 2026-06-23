import express from 'express';

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory shipment data - no database needed
const shipments = {
    1: {
        id: 1,
        trackingNumber: 'DC001234567',
        status: 'In Transit',
        origin: 'Mumbai, India',
        destination: 'Delhi, India',
        estimatedDelivery: '2025-09-25',
        carrier: 'DenimExpress',
        items: [
            { name: 'Classic Blue Jeans', quantity: 2, price: 2999 },
            { name: 'Black Denim Jacket', quantity: 1, price: 4999 }
        ],
        totalValue: 10997,
        currentLocation: 'Pune Distribution Center',
        updates: [
            { timestamp: '2025-09-20 10:30', status: 'Package picked up', location: 'Mumbai Warehouse' },
            { timestamp: '2025-09-21 14:15', status: 'In transit', location: 'Pune Distribution Center' },
            { timestamp: '2025-09-21 18:45', status: 'Out for delivery', location: 'Pune Distribution Center' }
        ]
    },
    2: {
        id: 2,
        trackingNumber: 'DC001234568',
        status: 'Delivered',
        origin: 'Bangalore, India',
        destination: 'Chennai, India',
        estimatedDelivery: '2025-09-22',
        actualDelivery: '2025-09-22',
        carrier: 'DenimExpress',
        items: [
            { name: 'Slim Fit Jeans', quantity: 1, price: 3499 },
            { name: 'Vintage Wash Jeans', quantity: 1, price: 3999 }
        ],
        totalValue: 7498,
        currentLocation: 'Delivered',
        updates: [
            { timestamp: '2025-09-19 09:00', status: 'Package picked up', location: 'Bangalore Warehouse' },
            { timestamp: '2025-09-20 16:30', status: 'In transit', location: 'Chennai Distribution Center' },
            { timestamp: '2025-09-21 08:15', status: 'Out for delivery', location: 'Chennai Distribution Center' },
            { timestamp: '2025-09-22 11:45', status: 'Delivered', location: 'Customer Address' }
        ]
    },
    3: {
        id: 3,
        trackingNumber: 'DC001234569',
        status: 'Processing',
        origin: 'Kolkata, India',
        destination: 'Hyderabad, India',
        estimatedDelivery: '2025-09-28',
        carrier: 'DenimExpress',
        items: [
            { name: 'Straight Fit Jeans', quantity: 3, price: 2799 },
            { name: 'Denim Shirt', quantity: 2, price: 2499 }
        ],
        totalValue: 13395,
        currentLocation: 'Kolkata Warehouse',
        updates: [
            { timestamp: '2025-09-21 14:20', status: 'Order received', location: 'Kolkata Warehouse' },
            { timestamp: '2025-09-21 16:45', status: 'Processing', location: 'Kolkata Warehouse' }
        ]
    },
    // Hidden shipment with the flag - users need to discover this via IDOR
    4: {
        id: 4,
        trackingNumber: 'CONFIDENTIAL_SHIPMENT',
        status: 'Classified',
        origin: 'Secret Facility',
        destination: 'CTF Player',
        estimatedDelivery: 'When you find it',
        carrier: 'SecureTransport',
        items: [
            { name: 'HXN{sh!p_id0r}', quantity: 1, price: 'Priceless' }
        ],
        totalValue: 'Priceless',
        currentLocation: 'Waiting for discovery',
        updates: [
            { timestamp: '2025-09-21 00:01', status: 'Flag created', location: 'CTF Server' },
            { timestamp: '2025-09-21 12:00', status: 'Waiting for IDOR', location: 'Hidden in plain sight' }
        ],
        specialMessage: 'Congratulations! You found the hidden shipment via IDOR vulnerability!'
    }
};

// API Routes

// Get all available tracking numbers (only show 2 and 3)
app.get('/api/available-shipments', (req, res) => {
    const availableShipments = [
        { id: 2, trackingNumber: 'DC001234568', status: 'Delivered' },
        { id: 3, trackingNumber: 'DC001234569', status: 'Processing' }
    ];
    res.json(availableShipments);
});

// IDOR Vulnerability: Get shipment by ID without authorization
app.get('/api/shipment/:id', (req, res) => {
    const shipmentId = parseInt(req.params.id);
    
    // Input validation to prevent XSS/SQLi (but allow IDOR)
    if (!Number.isInteger(shipmentId) || shipmentId < 1 || shipmentId > 1000) {
        return res.status(400).json({
            error: 'Invalid shipment ID. Must be a number between 1 and 1000.'
        });
    }
    
    const shipment = shipments[shipmentId];
    
    if (!shipment) {
        return res.status(404).json({
            error: 'Shipment not found',
            message: 'The requested shipment does not exist or has been removed.'
        });
    }
    
    // Return shipment data (this is the IDOR vulnerability)
    res.json(shipment);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 CTF Challenge "Shipment Tracking Logic" running on http://localhost:${PORT}`);
    console.log(`📦 Available shipments: 2, 3`);
    console.log(`🏃‍♂️ Hidden flag shipment: 4 (discover via IDOR)`);
    console.log(`🎯 Challenge: Find the hidden shipment containing HXN{sh!p_id0r}`);
    console.log("Server started on 8080");
});