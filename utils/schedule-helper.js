// The message to prompt the api to return schedule in this format
const description = ["Here is a schedule listed in the csv below: \n\n ",
    "start,end,title\n",
    ",Start of schedule\n",
    ",End of schedule\n\n",
    "where the first row is the title, the second row is the first event, and the last row is the very last event. I will give you more events to put in between."];


// Adds specified number of minutes to given date
export function addMinutes(date, num) {
    return new Date(date.setTime(date.getTime() + (num * 60 * 1000))); // 1000 * 60
}

// Initial request for calendar
export function initialReq(currentEvents, scheduleStart, scheduleEnd) {
    const sStart = addMinutes(scheduleStart, -1);
    const sEnd = addMinutes(scheduleEnd, 1);

    const startDesc = description[0] + description[1] + convertToIsoEdt(sStart) + "," + convertToIsoEdt(scheduleStart) + description[2];
    const endDesc = convertToIsoEdt(scheduleEnd) + "," + convertToIsoEdt(sEnd) + description[3] + description[4];
    let formatPrompt = "You are helping create a schedule and display as a csv. Please use below format:" + description[1] + convertToIsoEdt(sStart) + "," + convertToIsoEdt(scheduleStart) + description[2] + convertToIsoEdt(scheduleEnd) + "," + convertToIsoEdt(sEnd) + description[3] + description[4];
    if (!currentEvents || currentEvents.length === 0) {
        return formatPrompt;
    } else {
        const mEvents = currentEvents.map(obj => ({ start: convertToIsoEdt(obj.start), end: convertToIsoEdt(obj.end), title: obj.title }));
        const csv = mEvents.map(obj => Object.values(obj).map(val => `${val}`).join(',')).join('\n') + '\n';

        // Construct final prompt message using existing events and the given start and end times
        formatPrompt = "You are helping create a schedule and display as a csv. Please use the below format:" + description[1] + convertToIsoEdt(sStart) + "," + convertToIsoEdt(scheduleStart) + description[2] + csv + endDesc;
        return formatPrompt;
    }
}


// Convert CSV string to object
export function parseCsv(csv) {
    const rows = csv.split('\n');
    const headers = rows[0].split(',');

    return rows.slice(1).map((row) => {
        const values = row.split(',');
        return headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});
    });
}

// Parse schedule data from string (data is returned as string in csv format)
export function parseSchedule(content) {

    const regex = /\n[\s\S]*Start of schedule\n([\s\S]*)\n[\s\S]*End of schedule/i;
    const match = regex.exec(content);

    if (match && match[1]) {
        return description[1] + match[1].trim();
    }

    return '';
}

// Convert event data to new format
export function convertToEvents(events, status) {
    return events.map(obj => {
        return { start: new Date(obj.start), end: new Date(obj.end), title: obj.title, status: status }
    });
}

export function mapAttributeTitles(events) {
    return events.map(obj => {
        return { id: obj._id, start: obj.start, end: obj.end, title: obj.title, status: obj.status }
    });
}

// Convert given date to ISO 8610 format with EDT timezone
export function convertToIsoEdt(date) {
    // get the timezone offset in minutes for EDT
    let timezoneOffset = -4 * 60; // since EDT is UTC-4

    // add the timezone offset to the date
    let utcDate = new Date(date.getTime() + timezoneOffset * 60 * 1000);

    // convert the date to ISO 8601 format with EDT timezone
    let isoDate = utcDate.toISOString().replace("Z", "-04:00");

    return isoDate;
}
