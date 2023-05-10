// Operations to interact with MongoDB database
import { MongoClient, ObjectId, Binary } from "mongodb";
import configure from "./configure.js";

const mClient = new MongoClient(
    `mongodb://${configure.dbHost}:${configure.dbPort}/${configure.dbName}`
);

let dbConnected = null;
let dbcChat;

// Connect to database
async function connectDb() {
    if (!dbConnected) {
        try {
            dbConnected = await mClient.connect();
        } catch (err) {
            console.log("Connection error: " + err.stack);
        }
    }
    return dbConnected;
}

// Initialize database
async function initDb() {
    await connectDb();
    console.log("MongoDB Connected");
    dbcChat = mClient.db(configure.dbName);
}

// Call initDb to initialize database
initDb();

// Closes connection to db (not used yet)
async function closeConnect() {
    if (dbConnected) {
        dbConnected = await mClient.close();
    }
}

// Adds session to database
export async function addSession(userId) {
    try {
        const collection = dbcChat.collection(configure.session);
        const insertedObj = await collection.insertOne({ userId });
        return insertedObj.insertedId;
    } catch (err) {
        console.log("Unable to insert" + err.stack);
    }
    return "";
}

// Adds a message to chat db
export async function addMessage({ sessionId, role, content, orderNum }) {
    try {
        const collection = dbcChat.collection(configure.message);
        const insertedObj = await collection.insertOne({ sessionId: new ObjectId(sessionId), role, content, orderNum });
        return insertedObj.insertedId;
    } catch (err) {
        console.log("Unable to insert:" + err.stack);
    }
    return "";
}

// Gets all messages for a given session from db
export async function getMessages(sessionId) {
    const results = { orderNum: 0, messages: [] }; // obj to store results
    let doc;

    try {
        const collection = dbcChat.collection(configure.message);
        const queryObj = { sessionId: new ObjectId(sessionId) };
        const cursor = collection.find(queryObj);

        while (await cursor.hasNext()) {
            doc = await cursor.next();
            if (doc.orderNum > results.orderNum) {
                results.orderNum = doc.orderNum;
            }
            results.messages.push(doc);
        }
    } catch (err) {
        console.log("Unable to get messages: " + err.stack);
    }
    return results;
}

// Get latest message
export async function getLastMessage(sessionId) {
    const results = { orderNum: 0, messages: [] };
    let doc;

    try {
        const collection = dbcChat.collection(configure.message);
        const queryObj = { sessionId: new ObjectId(sessionId) };
        // Find last
        const lastItem = await collection.find(queryObj).sort({ "orderNum": -1 }).limit(1).toArray();
        return lastItem[0];
    } catch (err) {
        console.log("Unable to get messages: " + err.stack);
    }
    return results;
}

// Get calendar events that are active (time/date that is greater than current time/date)
export async function getActiveEvents() {
    const results = [];
    let doc;

    try {
        const collection = dbcChat.collection(configure.calendar);
        const queryObj = { start: { $gte: new Date() } };
        // Find last
        return await collection.find(queryObj).toArray();

    } catch (err) {
        console.log("Unable to get events: " + err.stack);
    }
    return results;
}

// Add schedule to database
export async function addSchedule(events) {
    try {
        const collection = dbcChat.collection(configure.calendar);
        return await Promise.all(events.map(async (event) => {
            const eventExist = await collection.findOne({ start: event.start, end: event.end, title: event.title });
            let id = eventExist && eventExist._id;
            if (!id) {
                const newEvent = await collection.insertOne({ start: event.start, end: event.end, title: event.title },
                    { $set: { status: event.status } });
                id = newEvent.insertedId;
            }
            console.log("insert schedule: " + eventExist);
            return {id: id.toString(), ...event};
        }));
    } catch (err) {
        console.log("Unable to insert schedule: " + err.stack);
    }
}

// Retrieves all events that fall within time range
export async function getEventsInRage(scheduleStart, scheduleEnd) {
    const results = null;
    let doc;

    try {
        const collection = dbcChat.collection(configure.calendar);
        const queryObj = { start: { $gte: scheduleStart }, end: { $lte: scheduleEnd } };
        return await collection.find(queryObj).toArray();

    } catch (err) {
        console.log("Unable to get events in range: " + err.stack);
    }
    return results;
}
