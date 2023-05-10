import express, { json } from "express";
import cors from "cors";

import { Configuration, OpenAIApi } from "openai";
import { addMessage, addSession, getMessages, getLastMessage, addSchedule, getActiveEvents, getEventsInRage } from "./mongo-access.js";
import { initialReq, parseCsv, parseSchedule, convertToEvents, mapAttributeTitles } from "./utils/schedule-helper.js";
import nodemailer from "nodemailer";
import { getCalendarEvents, addCalendarEvents } from "./calendar-api.js";

// test string (delete laters)
// const test = "Great! Here is an updated version of your schedule with the additional events:\n\nstart time,end time,event\n2023-03-16T08:55:00-05:00,2023-03-16T09:00:00-05:00,start of schedule\n2023-03-16T09:00:00-05:00,2023-03-16T10:00:00-05:00,Standup meeting\n2023-03-16T10:00:00-05:00,2023-03-16T11:00:00-05:00,Work on CRM project\n2023-03-16T11:00:00-05:00,2023-03-16T12:00:00-05:00,Lunch break\n2023-03-16T12:00:00-05:00,2023-03-16T13:00:00-05:00,Write emails\n2023-03-16T13:00:00-05:00,2023-03-16T15:00:00-05:00,Work on CRM project\n2023-03-16T15:00:00-05:00,2023-03-16T16:00:00-05:00,Sprint retrospective\n2023-03-16T16:00:00-05:00,2023-03-16T17:00:00-05:00,Work on CRM project\n2023-03-16T17:00:00-05:00,2023-03-16T17:05:00-05:00,end of schedule\n\nPlease note that I have assumed that your lunch break is from 11:00 am to 12:00 pm. You can adjust the timing to your preference. Also, the end time of the last event is set to 5:00 pm, but you can adjust this according to your work schedule.";

const configuration = new Configuration({
    apiKey: "YOUR-API-KEY",
});
const openai = new OpenAIApi(configuration);

// Set up the server
const app = express();
app.use(json());
app.use(cors())

await getCalendarEvents();

// Set up the GPT endpoint
app.post("/chat", async (req, res) => {
    // Get the prompt from the request
    let prompt = req.body.prompt;
    const modeId = req.body.mode; // modeId is the chat mode (1 - small talk, 2 - scheduler, 3 - email assistant)

    const userId = 1;

    let messages = [];
    let role = "user";
    let orderNum = 0;

    let sessionId = req.body.sessionId;

    if (sessionId) {
        const msgObj = await getMessages(sessionId);
        if (msgObj.orderNum) {
            orderNum = msgObj.orderNum + 1;
        }
        if (msgObj.messages) {
            const msgs = msgObj.messages;
            messages = msgs.sort((a, b) => a.orderNum - b.orderNum);
        }
    } else { // If session id doesn't exist, create new session
        sessionId = await addSession(userId);
        if (modeId === 2) {
            const timeRange = req.body.timeRange;
            const scheduleStart = new Date(timeRange[0]);
            const scheduleEnd = new Date(timeRange[1]);
            const currentEvents = await getEventsInRage(scheduleStart, scheduleEnd);
            const formatPrompt = initialReq(currentEvents, scheduleStart, scheduleEnd);
            const systemMsg = { sessionId, role: "system", content: formatPrompt, orderNum };
            await addMessage(systemMsg);
            messages.push(systemMsg);
        } else if (modeId == 3) {
            const formatPrompt = "You are helping write an email. Please use below format and include both headings: \n\n Subject: [subject here] \n Content: [content here] \n";
            const systemMsg = { sessionId, role: "system", content: formatPrompt, orderNum };
            await addMessage(systemMsg);
            messages.push(systemMsg);
        }
    }

    const userMsg = { sessionId, role, content: prompt, orderNum };
    await addMessage(userMsg);

    messages.push(userMsg);

    const openaiObj = {
        model: "gpt-3.5-turbo",
        messages: cleanupMessages(messages),
        max_tokens: 1000,
        temperature: 0,
    };

    // Generate a response with ChatGPT
    const completion = await openai.createChatCompletion(openaiObj);

    const resMsg = completion.data.choices[0].message;
    orderNum++;
    const newMsg = { sessionId, role: resMsg.role, content: resMsg.content, orderNum }
    messages.push(newMsg);

    // Insert assistant's response to db
    await addMessage(newMsg);
    res.send(messages);

});

// add event to calendar (add to calendar btn press)
app.post("/events/new", async (req, res) => {
    let tentative = req.body.tentative;

    if (tentative && tentative.length > 0) {
        // converts tentative events to existing
        const existingEvents = convertToEvents(tentative, "existing");
        const eventsWithId = await addSchedule(existingEvents);
        await addCalendarEvents(eventsWithId);
    }
    res.send({ msg: "Success!" });
});

app.get("/events/active", async (req, res) => {
    const activeEvents = await getActiveEvents();
    res.send(mapAttributeTitles(activeEvents));
});

// Send email
app.post("/email/send", async (req, res) => {
    let transporter;

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: "davin.mann83@ethereal.email",
            pass: "yourPass"
        }
    });
    const sender = "examplesender@gmail.com";
    const mailOptions = {
        from: sender,
        to: req.body.mailto,
        subject: req.body.subject,
        text: req.body.content
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.send({ msg: "Error!" });
        } else {
            console.log('Email sent: ' + info.response);
            res.send({ msg: "Success!" });
        }
    });

});

// Start the server
const port = 8080;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

function cleanupMessages(messages) {
    return messages.map(({ _id, orderNum, sessionId, ...keepItems }) => keepItems);
}
