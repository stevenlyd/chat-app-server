require('dotenv').config()
const express = require('express')
const app = express()
const http = require('http')
const cors = require('cors')
const {Server} = require('socket.io')
const harperSaveMessage = require('./services/harper-save-message')
const harperGetMessages = require("./services/harper-get-messages");

app.use(cors())

const server = http.createServer(app)

app.get('/', (req, res) => {
    res.send('Hello world')
})
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    }
})

const CHAT_BOT = 'ChatBot'
let chatRoom = ''
let allUsers = []

io.on('connection', (socket) => {
    console.log(`User connected ${socket.id}`)

    //Add a user to a room
    socket.on('join_room', (data) => {
        const {username, room} = data
        socket.join(room)

        let __createdtime__ = Date.now()
        socket.to(room).emit('receive_message', {
            message: `${username} has jointed the chat room`,
            username: CHAT_BOT,
            __createdtime__
        })

        socket.emit('receive_message', {
            message: `Welcome ${username}`,
            username: CHAT_BOT,
            __createdtime__,
        })

        chatRoom = room
        allUsers.push({id: socket.id, username, room})
        let chatRoomUsers = allUsers.filter((user) => user.room === room)
        socket.to(room).emit(`chatroom_users`, chatRoomUsers)
        socket.emit(`chatroom_users`, chatRoomUsers)

        harperGetMessages(room)
            .then((last100Messages) => {
                // console.log('latest messages', last100Messages);
                socket.emit('last_100_messages', last100Messages);
            })
            .catch((err) => console.log(err));
    })

    socket.on('send_message', (data) => {
        const { message, username, room, __createdtime__ } = data
        io.in(room).emit('receive_message', data) // Send to all users in room, including sender
        harperSaveMessage(message, username, room, __createdtime__) // Save message in db
            .then((response) => console.log(response))
            .catch((err) => console.log(err))
    });
})


server.listen(4000, () => 'Server is running on port 4000')


