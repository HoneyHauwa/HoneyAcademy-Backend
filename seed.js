require('dotenv').config();

const { MongoClient } = require('mongodb');
const activities = require('./activities.js');

async function seedDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();

        const db = client.db('HoneyAcademy');

        const collection = db.collection('activities');

        await collection.insertMany(activities);

        console.log('Activities successfully added to MongoDB!');

    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

seedDatabase();