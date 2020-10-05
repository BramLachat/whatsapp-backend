//importing
import express from "express"; //(kan mogelijks niet werken als ge een te oude node versie gebruikt!!!)
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
//import pusher from "./pusher.js";
import Server from "socket.io";
//import cors from "cors"; you can use this to replace the res.setHeader (lines 16 - 20) by app.use(cors())
//const express = require("express");

//app config
const app = express();
const port = process.env.PORT || 9000;
const io = new Server({ wsEngine: "ws" });

//middleware
app.use(express.json()); //niet helemaal duidelijk wat dit juist doet, maar nodig om json messages correct in mongo te steken!!!

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

//DB config
const connection_url = "mongodb://localhost:27017/whatsappdb";

mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: "admin",
    pass: "admin",
});

const db = mongoose.connection;

db.once("open", () => {
    console.log("DB connected");

    //comment out the following 6 lines on first startup
    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on("change", (change) => {
        console.log("A Change occured", change);

        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;

            io.emit("chat message", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            });

            // pusher.trigger("messages", "inserted", {
            //     name: messageDetails.name,
            //     message: messageDetails.message,
            //     timestamp: messageDetails.timestamp,
            //     received: messageDetails.received,
            // });
        } else {
            console.log("Error triggering Pusher");
        }
    });
});

io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
    //console.log(socket);
});

//api routes
app.get("/", (req, res) => res.status(200).send("Hello world!"));

app.get("/messages/sync", (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post("/messages/new", (req, res) => {
    const dbMessage = req.body;

    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(`new message created: \n ${data}`);
        }
    });
});

//listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
io.listen(3000);
