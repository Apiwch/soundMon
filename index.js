const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    credentials: true,
    origin: '*'
}));

const mqttClient = mqtt.connect({
    host: '119.59.102.18',
    port: "1883",
    username: 'keng',
    password: 'kG0882521310',
    clean: true
});

const db = mysql.createPool({
    host: '119.59.102.18',
    port: '3306',
    user: 'keng',
    password: 'kG0882521310',
    database: 'noiseMon',
    connectionLimit: 10, // Adjust according to your needs
    // host: 'localhost',
    // port: '3306',
    // user: 'root',
    // password: '',
    // database: 'iot',
    // connectionLimit: 10, // Adjust according to your needs
});


const server = http.createServer(app);
const PORT = 5000;

server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

mqttMessageArray = [];
var parsedMessages = "";
var parsedMessage = "";

mqttClient.on('connect', () => {
    console.log('MQTT connected');

    mqttClient.subscribe('NoiseMon/#');
});




mqttClient.on('message', (topic, message) => {
    const mqttMessage = message.toString();
    const mqttMessageInsert = JSON.parse(mqttMessage)
    // console.log(mqttMessage)
    
    const tableName = topic.replace(/\//g, '_'); // Replace '/' with '_' for table name
    // const tableEventName = topic.replace(/\//g, '_') +"event"; // Replace '/' with '_' for table name
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        value TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    // console.log(topic)
    // console.log(tableName);
//     const createTableEvent = `
//     CREATE TABLE IF NOT EXISTS ${tableEventName} (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       leq TEXT,
//       timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     )
//   `;

    db.query(createTableQuery, (error, results, fields) => {
        if (error) throw error;
        // console.log(`Table ${tableName} created or already exists`);

        // Save message to the corresponding table

    });
    // db.query(createTableEvent, (error, results, fields) => {
    //     if (error) throw error;
    //     // console.log(`Table ${tableName} created or already exists`);

    //     // Save message to the corresponding table

    // });

    const getDevices = `SELECT DeviceName FROM devices WHERE DeviceName =?`
    db.query(getDevices, [topic.split('/')[1]], (error, results) => {
        try{
            if (results[0]) {

                const insertMessageQuery = `
                INSERT INTO ${tableName} (value) VALUES (?)
                `;
    
                    db.query(insertMessageQuery, [ mqttMessage], (error, results, fields) => {
                        if (error) throw error;
    
                    });
    
                // if (mqttMessageInsert.valueLeq != 0){
                //     const insertMessageEvent = `
                //     INSERT INTO ${tableEventName} (leq) VALUES (?)
                //     `;
                    
                //     db.query(insertMessageEvent, [ mqttMessageInsert.valueLeq.toString()], (error, results, fields) => {
                //         if (error) throw error;
    
                //     });
                // }
            }
        }catch (error){
            console.log(error)
        }
        
    })


    const existingMqttMessageIndex = mqttMessageArray.findIndex(msg => msg.topic === topic);
    if (existingMqttMessageIndex !== -1) {
        mqttMessageArray[existingMqttMessageIndex] = {
            topic: topic,
            message: mqttMessage,
            timestamp: new Date().toLocaleString('en-GB', {
                hour12: false
            })
        }
    } else {
        mqttMessageArray.push({
            topic: topic,
            message: mqttMessage,
            timestamp: new Date().toLocaleString('en-GB', {
                hour12: false
            })
        })

    }

    // parsedMessages = mqttMessageArray.map(item => {
    //     parsedMessage = JSON.parse(item.message);

    //     return {
    //         name: parsedMessage.name,
    //         serial: parsedMessage.serial,
    //         // date: parsedMessage.date,
    //         // time: Date.parse(parsedMessage.time),
    //         timestamp: item.timestamp,
    //         value: parsedMessage.value,
    //         valueLeq: parsedMessage.valueLeq,
    //         batt: parsedMessage.batt
    //     };
    // });








})

// const wss = new WebSocket.Server({
//     server
// });
// setInterval(sendMessagesToWebSocketClients, 1000);

// wss.on('connection', (ws, req) => {
//     const token = req.headers['sec-websocket-protocol'];
//         // Verify the JWT token
//         jwt.verify(token, secretKey, (err, decoded) => {
//             if (err) {
//                 // If verification fails, close the WebSocket connection
//                 ws.close(1008, 'WebSocket Authentication Failed');
//             } 
//         });
// });

// function sendMessagesToWebSocketClients() {
//     const messageString = JSON.stringify(parsedMessages);
//     wss.clients.forEach((client) => {
//         if (client.readyState === WebSocket.OPEN) {
//             client.send(messageString);
//         }
//     });
// }

// const verifyToken = (req, res, next) => {
//     const token = req.header('Authorization');

//     if (!token) return res.status(401).json({
//         success: false,
//         loginMessage: 'Access denied'
//     });

//     try {
//         const decoded = jwt.verify(token, secretKey);
//         req.user = decoded;
//         next();
//     } catch (error) {
//         res.status(400).json({
//             success: false,
//             loginMessage: 'Invalid token'
//         });
//     }
// };


app.get('/api/data/:tableName', (req, res) => {

    function padTo2Digits(num) {
        return num.toString().padStart(2, '0');
    }

    function formatDate(date) {
        return (
            [
                date.getFullYear(),
                padTo2Digits(date.getMonth() + 1),
                padTo2Digits(date.getDate()),
            ].join('-') +
            ' ' + [
                padTo2Digits(date.getHours()),
                padTo2Digits(date.getMinutes()),
                padTo2Digits(date.getSeconds()),
            ].join(':')
        );
    }

    const {
        tableName
    } = req.params;
    console.log(tableName)


    // Calculate the timestamp for 10 minutes ago
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);


    const selectDataQuery = `
      SELECT * FROM ${tableName}
      WHERE timestamp > '${formatDate(tenMinutesAgo)}';
    `;

    db.query(selectDataQuery, (error, results, fields) => {
        if (error) {
            console.error(`Error fetching data from table ${tableName}:`, error);
            res.status(500).json({
                error: 'Internal Server Error'
            });
            return;
        }
        const formattedData = results.map(result => ({
            // id: result.id,
            // name: result.name,
            value: result.value,
            timestamp: result.timestamp,
        }));

        res.json(formattedData);

    });
});

// app.get('/api/leq/:tableName', verifyToken, (req, res) => {

//     function padTo2Digits(num) {
//         return num.toString().padStart(2, '0');
//     }

//     function formatDate(date) {
//         return (
//             [
//                 date.getFullYear(),
//                 padTo2Digits(date.getMonth() + 1),
//                 padTo2Digits(date.getDate()),
//             ].join('-') +
//             ' ' + [
//                 padTo2Digits(date.getHours()),
//                 padTo2Digits(date.getMinutes()),
//                 padTo2Digits(date.getSeconds()),
//             ].join(':')
//         );
//     }

//     const {
//         tableName
//     } = req.params;


//     // Calculate the timestamp for 10 minutes ago
//     const tenMinutesAgo = new Date();
//     tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);


//     const selectDataQuery = `
//       SELECT * FROM ${tableName}
//       WHERE timestamp > '${formatDate(tenMinutesAgo)}';
//     `;

//     db.query(selectDataQuery, (error, results, fields) => {
//         if (error) {
//             console.error(`Error fetching data from table ${tableName}:`, error);
//             res.status(500).json({
//                 error: 'Internal Server Error'
//             });
//             return;
//         }
//         const formattedData = results.map(result => ({
//             // id: result.id,
//             // name: result.name,
//             leq: result.leq,
//             timestamp: result.timestamp,
//         }));

//         res.json(formattedData);

//     });
// });


// //login api//

// const secretKey = '12345';
// // Endpoint for user authentication
// app.post('/api/login', (req, res) => {
//     const {
//         username,
//         password
//     } = req.body;

//     const selectUserQuery = `
//       SELECT id, username, password, role
//       FROM users
//       WHERE username = ?;
//     `;

//     db.query(selectUserQuery, [username], (error, results, fields) => {
//         if (error) {
//             console.error('Error checking user credentials:', error);
//             res.status(500).json({
//                 success: false,
//                 loginMessage: 'Internal Server Error',
//             });
//             return;
//         }

//         const user = results[0];

//         if (user) {
//             bcrypt.compare(password, user.password, (compareError, passwordMatch) => {
//                 if (compareError) {
//                     console.error('Error comparing passwords:', compareError);
//                     res.status(500).json({
//                         success: false,
//                         loginMessage: 'Internal Server Error',
//                     });
//                     return;
//                 }

//                 if (passwordMatch) {
//                     const expiresIn = 3600;
//                     const token = jwt.sign({
//                             userId: user.id,
//                             username: user.username,
//                             role: user.role
//                         },
//                         secretKey, {
//                             expiresIn
//                         }
//                     );
//                     res.json({
//                         success: true,
//                         token,
//                         username: user.username,
//                     });
//                 } else {
//                     res.status(401).json({
//                         success: false,
//                         loginMessage: 'Invalid credentials',
//                     });
//                 }
//             });
//         } else {
//             res.status(401).json({
//                 success: false,
//                 loginMessage: 'Invalid credentials',
//             });
//         }
//     });
// });



// app.post('/api/register', (req, res) => {
//     const {
//         username,
//         password, 
//         role
//     } = req.body;

//     // Hash the password before storing it
//     bcrypt.hash(password, 10, (hashError, hashedPassword) => {
//         if (hashError) {
//             console.error('Error hashing password:', hashError);
//             res.status(500).json({
//                 success: false,
//                 registerMessage: 'Internal Server Error',
//             });
//             return;
//         }

//         const insertUserQuery = `
//         INSERT INTO users (username, password, role)
//         VALUES (?, ?, ?);
//       `;

//         db.query(insertUserQuery, [username, hashedPassword, role], (error, results, fields) => {
//             if (error) {
//                 console.error('Error registering user:', error);
//                 res.status(500).json({
//                     success: false,
//                     registerMessage: 'Internal Server Error',
//                 });
//                 return;
//             }

//             res.json({
//                 success: true,
//                 registerMessage: 'User registered successfully',
//             });
//         });
//     });
// });


// app.get('/api/home', verifyToken, (req, res) => {
//     res.json({
//         success: true,
//         loginMessage: 'Welcome to the home page'
//     });
// });

// app.get('/api/Devices/:userName', verifyToken, (req, res) => {
//     const {
//         userName
//     } = req.params;
//     const selectDataQuery = `
//     SELECT * FROM devices;
//     `;
//     db.query(selectDataQuery, [userName], (error, results, fields) => {
//         if (error) {
//             console.error(`Error fetching data from table ${tableName}:`, error);
//             res.status(500).json({
//                 error: 'Internal Server Error'
//             });
//             return;
//         }

//         const formattedData = results.map(result => ({
//             id: result.id,
//             name: result.DeviceName,
//             serial: result.DeviceSerial,
//             lat: result.lat,
//             lon: result.lon
//             // user: result.user,
//         }));

//         res.json(formattedData);
//     });

// });

// app.post('/api/newDevice', verifyToken, (req, res) => {
//     const {
//         newDeviceName,
//         newDeviceSerial,
//         lat,
//         lon,
//         username
//     } = req.body;

//     // Check if the deviceName and user already exist
//     const checkExistingQuery = 'SELECT * FROM devices WHERE deviceName = ? AND user = ?';
//     db.query(checkExistingQuery, [newDeviceName, username], (checkError, checkResults) => {
//         if (checkError) {
//             console.log(checkError);
//             res.status(500).json({
//                 success: false,
//                 addDeviceMessage: 'Internal Server Error'
//             });
//             return;
//         }

//         if (checkResults.length > 0) {
//             // Device with the same name and user already exists
//             res.status(400).json({
//                 success: false,
//                 addDeviceMessage: 'Device with the same name and user already exists'
//             });
//             return;
//         }

//         // If not exists, proceed with the insert
//         const deviceInsert = 'INSERT INTO devices (deviceName, deviceSerial, lat, lon, user) VALUES (?, ?, ?, ?, ?)';
//         db.query(deviceInsert, [newDeviceName, newDeviceSerial, lat, lon, username], (insertError, insertResults) => {
//             if (insertError) {
//                 console.log(insertError);
//                 res.status(500).json({
//                     success: false,
//                     addDeviceMessage: 'Internal Server Error'
//                 });
//                 return;
//             }

//             res.json('Insert successfully');
//         });
//     });
// });


// app.delete('/api/deleteDevice/:id', verifyToken, (req, res) => {
//     const id = req.params.id;
//     const deviceDelete = 'DELETE FROM `devices` WHERE id =?';
//     db.query(deviceDelete, [id], (error, results) => {
//         if (error) {
//             console.log(error)
//             res.status(500).json({
//                 success: false,
//                 addDeviceMessage: 'Internal Server Error'
//             });
//             return;
//         } else {
//             res.json('Delete successfully');
//         }
//     });
// })

// app.put('/api/updateDevice/:id', verifyToken, (req, res) => {
//     const id = req.params.id;
//     const {
//         newDeviceName,
//         newDeviceSerial,
//         lat,
//         lon,
//         username
//     } = req.body;

//     // Check if the deviceName and user already exist
//     const checkExistenceQuery = 'SELECT * FROM devices WHERE `DeviceName` = ? AND `user` = ? AND `id` != ? ';
//     db.query(checkExistenceQuery, [newDeviceName, username, id], (error, results) => {
//         if (error) {
//             console.log(error);
//             res.status(500).json({
//                 success: false,
//                 addDeviceMessage: 'Internal Server Error'
//             });
//             return;
//         }
//         console.log(results)
//         // If the deviceName and user combination already exists, return an error
//         if (results.length > 0) {
//             res.status(400).json({
//                 success: false,
//                 addDeviceMessage: 'Device with the same name and user already exists'
//             });
//             return;
//         }

//         // If not, proceed with the update
//         const deviceUpdate = 'UPDATE devices SET `DeviceName` = ?, `DeviceSerial` = ?, `lat` = ?, `lon` = ? WHERE id = ?';
//         db.query(deviceUpdate, [newDeviceName, newDeviceSerial, lat, lon, id], (updateError, updateResults) => {
//             if (updateError) {
//                 console.log(updateError);
//                 res.status(500).json({
//                     success: false,
//                     addDeviceMessage: 'Internal Server Error'
//                 });
//                 return;
//             }

//             res.json('Update successfully');
//         });
//     });
// });
