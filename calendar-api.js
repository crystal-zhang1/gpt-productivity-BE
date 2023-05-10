// Code for integrating Google Calendar

import { google } from 'googleapis';

const SCOPES = 'SCOPE';
const GOOGLE_PRIVATE_KEY = "PRIVATE KEY"
const GOOGLE_CLIENT_EMAIL = "CLIENT-EMAIL"
const GOOGLE_PROJECT_NUMBER = "PROJ-NUM"
const GOOGLE_CALENDAR_ID = "CALENDAR-ID"

// Create JWT for authentication
const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    SCOPES
);

// Create Google calendar api client
const calendar = google.calendar({
    version: 'v3',
    project: GOOGLE_PROJECT_NUMBER,
    auth: jwtClient
});

// Gets events from Google calendar
export async function getCalendarEvents() {

    await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });
}

// Convert event data to the format expected by API
function convertEventFormat(events) {
    return events.map(obj => {

        const id = obj.id;

        return {
            id: obj.id,
            start: { dateTime: obj.start, timeZone: "Canada/Eastern" },
            end: { dateTime: obj.end, timeZone: "Canada/Eastern" },
            summary: obj.title
        }

    });
}

// Add events to Google calendar
export async function addCalendarEvents(events) {
    const formatedEvents = convertEventFormat(events);

    await Promise.all(formatedEvents.map(async (event) => {
        try {
            await insertEventToCalendar(event);
        } catch (ex) {
            console.log("Error:" + ex);
        }
    }));
}

// Insert an event into Google calendar 
async function insertEventToCalendar(event) {
    const result = await calendar.events.insert({
        auth: jwtClient,
        calendarId: GOOGLE_CALENDAR_ID,
        resource: event,
    });

    return result;
}

