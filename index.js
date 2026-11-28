require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

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

// Middleware
app.use(cors());
app.use(express.json());

// Serve activity images
app.use('/images', express.static(path.join(__dirname, 'Images')));

// Log incoming requests
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});


// ======================================================
// TEACHERS
// ======================================================

// Get all teachers
app.get('/teachers', async (req, res) => {
    try {
        const teachers = await db.collection('teachers').find({}).toArray();

        res.json(teachers);

    } catch (error) {
        console.error('Error retrieving teachers:', error);

        res.status(500).json({
            message: 'Failed to retrieve teachers.'
        });
    }
});


// Get activities by teacher
app.get('/teachers/:id/activities', async (req, res) => {
    try {
        const teacherId = Number(req.params.id);

        const activities = await db.collection('activities').find({
            teacherId: teacherId
        }).toArray();

        res.json(activities);

    } catch (error) {
        console.error('Error retrieving teacher activities:', error);

        res.status(500).json({
            message: 'Failed to retrieve teacher activities.'
        });
    }
});


// ======================================================
// ACTIVITIES / LESSONS
// ======================================================

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


// Coursework-compatible route: Get all lessons
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('activities').find({}).toArray();

        res.json(lessons);

    } catch (error) {
        console.error('Error retrieving lessons:', error);

        res.status(500).json({
            message: 'Failed to retrieve lessons.'
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


// Coursework-compatible route: Get one lesson by ID
app.get('/lessons/:id', async (req, res) => {
    try {
        const lesson = await db.collection('activities').findOne({
            id: Number(req.params.id)
        });

        if (!lesson) {
            return res.status(404).json({
                message: 'Lesson not found.'
            });
        }

        res.json(lesson);

    } catch (error) {
        console.error('Error retrieving lesson:', error);

        res.status(500).json({
            message: 'Failed to retrieve lesson.'
        });
    }
});


// ======================================================
// SEARCH
// ======================================================

// Search activities by title, location, price and available spaces
app.get('/search', async (req, res) => {
    try {
        const {
            q,
            title,
            topic,
            location,
            price,
            space,
            availableInventory,
            minPrice,
            maxPrice,
            minSpace,
            maxSpace
        } = req.query;

        const filters = [];

        // General search
        if (q) {
            const searchConditions = [
                {
                    title: {
                        $regex: q,
                        $options: 'i'
                    }
                },
                {
                    location: {
                        $regex: q,
                        $options: 'i'
                    }
                }
            ];

            const number = Number(q);

            if (q.trim() !== '' && Number.isFinite(number)) {
                searchConditions.push({
                    price: number
                });

                searchConditions.push({
                    availableInventory: number
                });
            }

            filters.push({
                $or: searchConditions
            });
        }

        // Search by title/topic
        if (title || topic) {
            filters.push({
                title: {
                    $regex: title || topic,
                    $options: 'i'
                }
            });
        }

        // Search by location
        if (location) {
            filters.push({
                location: {
                    $regex: location,
                    $options: 'i'
                }
            });
        }

        // Exact price
        if (price !== undefined) {
            const value = Number(price);

            if (!Number.isFinite(value)) {
                return res.status(400).json({
                    message: 'Invalid price value.'
                });
            }

            filters.push({
                price: value
            });
        }

        // Exact available spaces
        if (
            space !== undefined ||
            availableInventory !== undefined
        ) {
            const value = Number(
                space ?? availableInventory
            );

            if (!Number.isFinite(value)) {
                return res.status(400).json({
                    message: 'Invalid available space value.'
                });
            }

            filters.push({
                availableInventory: value
            });
        }

        // Price range
        if (
            minPrice !== undefined ||
            maxPrice !== undefined
        ) {
            const priceFilter = {};

            if (minPrice !== undefined) {
                const value = Number(minPrice);

                if (!Number.isFinite(value)) {
                    return res.status(400).json({
                        message: 'Invalid minimum price value.'
                    });
                }

                priceFilter.$gte = value;
            }

            if (maxPrice !== undefined) {
                const value = Number(maxPrice);

                if (!Number.isFinite(value)) {
                    return res.status(400).json({
                        message: 'Invalid maximum price value.'
                    });
                }

                priceFilter.$lte = value;
            }

            filters.push({
                price: priceFilter
            });
        }

        // Available spaces range
        if (
            minSpace !== undefined ||
            maxSpace !== undefined
        ) {
            const spaceFilter = {};

            if (minSpace !== undefined) {
                const value = Number(minSpace);

                if (!Number.isFinite(value)) {
                    return res.status(400).json({
                        message: 'Invalid minimum space value.'
                    });
                }

                spaceFilter.$gte = value;
            }

            if (maxSpace !== undefined) {
                const value = Number(maxSpace);

                if (!Number.isFinite(value)) {
                    return res.status(400).json({
                        message: 'Invalid maximum space value.'
                    });
                }

                spaceFilter.$lte = value;
            }

            filters.push({
                availableInventory: spaceFilter
            });
        }

        const searchQuery =
            filters.length > 0
                ? { $and: filters }
                : {};

        const results = await db
            .collection('activities')
            .find(searchQuery)
            .toArray();

        res.json(results);

    } catch (error) {
        console.error('Error searching activities:', error);

        res.status(500).json({
            message: 'Failed to search activities.'
        });
    }
});


// ======================================================
// UPDATE ACTIVITY / LESSON
// ======================================================

async function updateActivity(req, res) {
    try {
        const activityId = Number(req.params.id);

        if (!Number.isInteger(activityId)) {
            return res.status(400).json({
                message: 'Invalid activity ID.'
            });
        }

        const updates = {
            ...req.body
        };

        // Protect MongoDB and application IDs
        delete updates._id;
        delete updates.id;

        // Support coursework-style "space" field
        if (updates.space !== undefined) {
            updates.availableInventory = Number(
                updates.space
            );

            delete updates.space;
        }

        // Support "spaces" field
        if (updates.spaces !== undefined) {
            updates.availableInventory = Number(
                updates.spaces
            );

            delete updates.spaces;
        }

        // Validate available inventory
        if (updates.availableInventory !== undefined) {
            updates.availableInventory = Number(
                updates.availableInventory
            );

            if (
                !Number.isInteger(
                    updates.availableInventory
                ) ||
                updates.availableInventory < 0
            ) {
                return res.status(400).json({
                    message:
                        'Available spaces must be a non-negative integer.'
                });
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message:
                    'Please provide at least one attribute to update.'
            });
        }

        const result = await db
            .collection('activities')
            .updateOne(
                {
                    id: activityId
                },
                {
                    $set: updates
                }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: 'Activity not found.'
            });
        }

        const updatedActivity = await db
            .collection('activities')
            .findOne({
                id: activityId
            });

        res.json({
            message: 'Activity updated successfully.',
            activity: updatedActivity
        });

    } catch (error) {
        console.error(
            'Error updating activity:',
            error
        );

        res.status(500).json({
            message: 'Failed to update activity.'
        });
    }
}


// PUT activity
app.put('/activities/:id', updateActivity);

// Coursework-compatible PUT lesson
app.put('/lessons/:id', updateActivity);


// ======================================================
// ORDERS
// ======================================================

// Create a booking order
app.post('/orders', async (req, res) => {
    try {
        const {
            name,
            phone,
            lessonIds
        } = req.body;

        // Validate customer information
        if (
            !name ||
            !phone ||
            !Array.isArray(lessonIds) ||
            lessonIds.length === 0
        ) {
            return res.status(400).json({
                message:
                    'Please provide customer details and at least one activity.'
            });
        }

        let total = 0;
        const bookedActivities = [];

        // First check every requested activity
        // before making changes to inventory.
        for (const item of lessonIds) {

            if (
                !Number.isInteger(item.spaces) ||
                item.spaces < 1
            ) {
                return res.status(400).json({
                    message:
                        'Invalid booking quantity.'
                });
            }

            const activity = await db
                .collection('activities')
                .findOne({
                    id: Number(item.lessonId)
                });

            if (!activity) {
                return res.status(404).json({
                    message:
                        'One of the selected activities was not found.'
                });
            }

            if (
                activity.availableInventory <
                item.spaces
            ) {
                return res.status(400).json({
                    message:
                        `Not enough spaces available for ${activity.title}.`
                });
            }

            total +=
                activity.price *
                item.spaces;

            bookedActivities.push({
                activityId: activity.id,
                title: activity.title,
                quantity: item.spaces,
                price: activity.price
            });
        }

        // Create the order
        const newOrder = {
            name,
            phone,
            activities: bookedActivities,
            total,
            bookingDate: new Date()
        };

        const result = await db
            .collection('orders')
            .insertOne(newOrder);

        // Update available inventory after
        // successfully creating the order.
        for (const item of lessonIds) {

            const activityId = Number(
                item.lessonId
            );

            const quantity = Number(
                item.spaces
            );

            await db
                .collection('activities')
                .updateOne(
                    {
                        id: activityId,
                        availableInventory: {
                            $gte: quantity
                        }
                    },
                    {
                        $inc: {
                            availableInventory:
                                -quantity
                        }
                    }
                );
        }

        res.status(201).json({
            message: 'Booking successful!',
            order: {
                _id: result.insertedId,
                ...newOrder
            }
        });

    } catch (error) {
        console.error(
            'Error creating booking:',
            error
        );

        res.status(500).json({
            message:
                'Failed to create booking.'
        });
    }
});


// Get all bookings
app.get('/orders', async (req, res) => {
    try {
        const orders = await db
            .collection('orders')
            .find({})
            .toArray();

        res.json(orders);

    } catch (error) {
        console.error(
            'Error retrieving bookings:',
            error
        );

        res.status(500).json({
            message:
                'Failed to retrieve bookings.'
        });
    }
});


// ======================================================
// ENROLMENT
// ======================================================

// Get number of purchased spaces for a lesson
app.get('/enrolment/:lessonid', async (req, res) => {
    try {
        const lessonId = Number(
            req.params.lessonid
        );

        if (!Number.isInteger(lessonId)) {
            return res.status(400).json({
                message:
                    'Invalid lesson ID.'
            });
        }

        const orders = await db
            .collection('orders')
            .find({
                'activities.activityId':
                    lessonId
            })
            .toArray();

        let totalSpaces = 0;

        orders.forEach(order => {

            order.activities.forEach(
                activity => {

                    if (
                        activity.activityId ===
                        lessonId
                    ) {
                        totalSpaces +=
                            activity.quantity;
                    }

                }
            );

        });

        res.json({
            lessonId: lessonId,
            numberOfPurchasedSlots:
                totalSpaces
        });

    } catch (error) {
        console.error(
            'Error retrieving enrolment:',
            error
        );

        res.status(500).json({
            message:
                'Failed to retrieve enrolment.'
        });
    }
});


// ======================================================
// HOME
// ======================================================

app.get('/', (req, res) => {
    res.send(
        'HoneyAcademy API is running.'
    );
});


// ======================================================
// UNKNOWN ROUTES
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found.'
    });
});


// ======================================================
// START SERVER
// ======================================================

connectToMongoDB().then(() => {

    app.listen(PORT, () => {
        console.log(
            `Server running on port ${PORT}`
        );
    });

});