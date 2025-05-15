const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const mqtt = require('mqtt');
const db = require('./models'); // Your Sequelize models

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org';
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const MQTT_TOPICS = ['sensors/#', 'devices/+/status'];

class Server {
    constructor() {
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.mqttClient = null;

        this._configureExpress();
        this._setupRoutes();
    }

    _configureExpress() {
        // Middleware
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                db: db.sequelize.authenticate() ? 'connected' : 'disconnected',
                mqtt: this.mqttClient?.connected ? 'connected' : 'disconnected'
            });
        });
    }

    _setupRoutes() {
        // Example API route
        this.app.get('/api/sensor-data', async (req, res) => {
            try {
                const data = await db.SensorReading.findAll({
                    limit: 100,
                    order: [['created_at', 'DESC']]
                });
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Add more routes as needed
    }

    async _connectToDatabase() {
        try {
            await db.sequelize.authenticate();
            console.log('Database connection established');

            if (process.env.NODE_ENV === 'development') {
                await db.sequelize.sync({ alter: true });
                console.log('Database models synchronized');
            }
        } catch (error) {
            console.error('Database connection failed:', error);
            process.exit(1);
        }
    }

    _connectToMqtt() {
        this.mqttClient = mqtt.connect(MQTT_BROKER_URL, {
            clientId: `server-${Math.random().toString(16).substr(2, 8)}`,
            reconnectPeriod: 5000
        });

        this.mqttClient.on('connect', () => {
            console.log(`Connected to MQTT broker at ${MQTT_BROKER_URL}`);

            // Subscribe to topics
            MQTT_TOPICS.forEach(topic => {
                this.mqttClient.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to ${topic}:`, err);
                    } else {
                        console.log(`Subscribed to ${topic}`);
                    }
                });
            });
        });

        this.mqttClient.on('message', (topic, message) => {
            this._handleMqttMessage(topic, message);
        });

        this.mqttClient.on('error', (err) => {
            console.error('MQTT error:', err);
        });
    }

    _handleMqttMessage(topic, message) {
        try {
            const payload = message.toString();
            console.log(`MQTT [${topic}]: ${payload}`);

            // Example: Store sensor data in database
            if (topic.startsWith('sensors/')) {
                const parts = topic.split('/');
                const deviceId = parts[1];
                const sensorType = parts[2];
                const value = parseFloat(payload);

                if (!isNaN(value)) {
                    db.SensorReading.create({
                        topic,
                        value,
                        device_id: deviceId,
                        unit: sensorType === 'temperature' ? '°C' : '%'
                    });
                }
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    }

    start() {
        this._connectToDatabase();
        this._connectToMqtt();

        this.httpServer.listen(HTTP_PORT, () => {
            console.log(`Server running on port ${HTTP_PORT}`);
            console.log(`MQTT connected to ${MQTT_BROKER_URL}`);
        });
    }

    async stop() {
        console.log('Shutting down server...');

        if (this.mqttClient) {
            this.mqttClient.end();
        }

        await db.sequelize.close();
        this.httpServer.close();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await new Server().stop();
    process.exit(0);
});

const server = new Server();
server.start();
