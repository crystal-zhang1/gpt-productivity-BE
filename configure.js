import dotenv  from "dotenv";

dotenv.config();

const config = {
    dbPort: process.env.DB_PORT || 27017,
    dbHost: process.env.DB_HOST || "127.0.0.1",
    dbName: process.env.DB_NAME || "gptproj",
    session: process.env.SESSION || "session",
    message: process.env.MESSAGE || "message",
    calendar: process.env.CALENDAR || "calendar"
};

export default config;