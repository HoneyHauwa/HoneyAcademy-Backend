
require('dotenv').config();

const { MongoClient } = require('mongodb');
const activities = require('./activities.js');

async function seedDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();

        const db = client.db('HoneyAcademy');
        const collection = db.collection('activities');

        const operations = activities.map(activity => ({
            updateOne: {
                filter: { id: activity.id },
                update: { $set: activity },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(operations);

        console.log('Activities successfully updated!');
        console.log('Matched:', result.matchedCount);
        console.log('Modified:', result.modifiedCount);
        console.log('Inserted:', result.upsertedCount);

    } catch (error) {
        console.error('Database update failed:', error);
    } finally {
        await client.close();
    }
}

seedDatabase();
