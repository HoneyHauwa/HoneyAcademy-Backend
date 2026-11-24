require('dotenv').config();

const { MongoClient } = require('mongodb');
const activities = require('./activities.js');
const teachers = require('./teachers.js');

async function seedDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();

        const db = client.db('HoneyAcademy');

        const collection = db.collection('activities');
        const teachersCollection = db.collection('teachers');

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

        const teacherOperations = teachers.map(teacher => ({
            updateOne: {
                filter: { id: teacher.id },
                update: { $set: teacher },
                upsert: true
            }
        }));

        const teacherResult = await teachersCollection.bulkWrite(teacherOperations);

        console.log('Teachers successfully updated!');
        console.log('Teacher Matched:', teacherResult.matchedCount);
        console.log('Teacher Modified:', teacherResult.modifiedCount);
        console.log('Teacher Inserted:', teacherResult.upsertedCount);

    } catch (error) {
        console.error('Database update failed:', error);
    } finally {
        await client.close();
    }
}

seedDatabase();