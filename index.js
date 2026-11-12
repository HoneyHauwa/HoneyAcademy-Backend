require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGODB_URI);

let db;

async function connectToMongoDB() {
    try {
        await client.connect();

        db = client.db('HoneyAcademy');

        console.log('Successfully connected to HoneyAcademy database!');

    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}

const cors = require('cors');
const path = require('path');

//const myActivities = require('./activities.js');

// Middleware
app.use(cors());
app.use(express.json());

// Serve activity images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Store orders temporarily in memory
//let orders = [];

// Log incoming requests
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});

// Get all activities
app.get('/activities', async (req, res) => {
    try {
        const activities = await db.collection('activities').find({}).toArray();

        res.json(activities);

    } catch (error) {
        console.error('Error retrieving activities:', error);

        res.status(500).json({
            message: 'Failed to retrieve activities.'
        });
    }
});

// Get one activity by ID
app.get('/activities/:id', async (req, res) => {
    try {
        const activity = await db.collection('activities').findOne({
            id: Number(req.params.id)
        });

        if (!activity) {
            return res.status(404).json({
                message: 'Activity not found.'
            });
        }

        res.json(activity);

    } catch (error) {
        console.error('Error retrieving activity:', error);

        res.status(500).json({
            message: 'Failed to retrieve activity.'
        });
    }
});

// Create a booking order
app.post('/orders', async (req, res) => {
    try {
        const { name, phone, lessonIds } = req.body;

        if (!name || !phone || !Array.isArray(lessonIds) || lessonIds.length === 0) {
            return res.status(400).json({
                message: 'Please provide customer details and at least one activity.'
            });
        }

        let total = 0;
        const bookedActivities = [];

        for (const item of lessonIds) {
            if (!Number.isInteger(item.spaces) || item.spaces < 1) {
                return res.status(400).json({
                    message: 'Invalid booking quantity.'
                });
            }

            const activity = await db.collection('activities').findOne({
                id: Number(item.lessonId)
            });

            if (!activity) {
                return res.status(404).json({
                    message: 'One of the selected activities was not found.'
                });
            }

            if (activity.availableInventory < item.spaces) {
                return res.status(400).json({
                    message: `Not enough spaces available for ${activity.title}.`
                });
            }

            const updateResult = await db.collection('activities').updateOne(
                {
                    id: activity.id,
                    availableInventory: { $gte: item.spaces }
                },
                {
                    $inc: { availableInventory: -item.spaces }
                }
            );

            if (updateResult.modifiedCount === 0) {
                return res.status(400).json({
                    message: `Not enough spaces available for ${activity.title}.`
                });
            }

            total += activity.price * item.spaces;

            bookedActivities.push({
                activityId: activity.id,
                title: activity.title,
                quantity: item.spaces,
                price: activity.price
            });
        }

        const newOrder = {
            name,
            phone,
            activities: bookedActivities,
            total,
            bookingDate: new Date()
        };

        const result = await db.collection('orders').insertOne(newOrder);

        res.status(201).json({
            message: 'Booking successful!',
            order: {
                _id: result.insertedId,
                ...newOrder
            }
        });

    } catch (error) {
        console.error('Error creating booking:', error);

        res.status(500).json({
            message: 'Failed to create booking.'
        });
    }
});

// Get all bookings
app.get('/orders', async (req, res) => {
    try {
        const orders = await db.collection('orders').find({}).toArray();

        res.json(orders);

    } catch (error) {
        console.error('Error retrieving orders:', error);

        res.status(500).json({
            message: 'Failed to retrieve bookings.'
        });
    }
});

// Home route
app.get('/', (req, res) => {
    res.send('HoneyAcademy API is running.');
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found.'
    });
});

// Connect to MongoDB and start server
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});