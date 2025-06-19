// services/mqttService.js
const mqtt = require('mqtt');
const db = require('../models');
const Borrower = require("../models").Borrower;
const Loan = require("../models").Loan;
const Invoice = require("../models").Invoice;

class Request {
    constructor(client_id, user_id) {
        this.client_id = client_id;
        this.user_id = user_id;
    }
}

class Response {
    constructor(auth, status) {
        this.auth = auth;
        this.status = status;
    }
}

class MqttService {

    constructor() {
        this.client = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
    }

    async connect(MQTT_TOPICS) {
        const MQTT_BROKER = process.env.MQTT_BROKER;

        const options = {
            clientId: `server-${Math.random().toString(16).substr(2, 8)}`,
            reconnectPeriod: this.reconnectDelay,
            connectTimeout: 10000, // 10 seconds
            //username: process.env.MQTT_USERNAME,
            //password: process.env.MQTT_PASSWORD
        };

        this.client = mqtt.connect(MQTT_BROKER, options);

        this.client.on('connect', () => {
            console.log(`Connected to MQTT broker at ${MQTT_BROKER}`);
            this.reconnectAttempts = 0; // Reset counter on successful connection

            // Subscribe to topics
            MQTT_TOPICS.forEach(topic => {
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to ${topic}:`, err);
                    } else {
                        console.log(`Subscribed to ${topic}`);
                    }
                });
            });
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (err) => {
            console.error('MQTT error:', err.message);
        });

        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.attemptReconnect();
        });

        this.client.on('offline', () => {
            console.log('MQTT client offline');
            this.attemptReconnect();
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached. Giving up.');
        }
    }

    handleMessage(topic, message) {
        try {
            const payload = message.toString();

            if (topic.startsWith('esp32/auth/request')) {
                const request = JSON.parse(payload.toString(), );
                console.log(`Received MQTT message on ${topic}:`, request);
                this.publishAuthResponse(request);
            } else if (topic.startsWith('esp32/status/request')) {
                const request = JSON.parse(payload.toString(), );
                console.log(`Received MQTT message on ${topic}:`, request);
                this.publishStatusResponse(request);
            }
        } catch (err) {
            console.error('Error processing MQTT message:', err);
        }
    }

    async publishAuthResponse(request) {
        if (!this.client || !this.client.connected) {
            console.error('MQTT Client not connected');
            return false;
        }

        const user = await Borrower.findByPk(request.user_id);

        let payload = {}
        if (!user) {
            payload = JSON.stringify({
                auth: false,
                status: null,
            })
        } else{
            payload = JSON.stringify({
                auth: true,
                status: null,
            })
        }

        const topic = `esp32/auth/response/${request.client_id}`;
        const options = {}

        this.client.publish(topic, payload, options, (err) => {
            if (err) {
                console.error(`Failed to publish to ${topic}:`, err);
            } else {
                console.log(`Published to ${topic}:`, payload);
            }
        });
    }
    async publishStatusResponse(request) {
        if (!this.client || !this.client.connected) {
            console.error('MQTT Client not connected');
            return false;
        }

        let payload={}
        const loansByUser = await Loan.findAll({where: {borrower_id: request.user_id}});

        if (loansByUser.length >= 3) {
            payload = JSON.stringify({
                auth: null,
                status: false,
            })
        } else {
            payload = JSON.stringify({
                auth: null,
                status: true,
            })
        }

        const topic = `esp32/status/response/${request.client_id}`;
        const options = {}

        this.client.publish(topic, payload, options, (err) => {
            if (err) {
                console.error(`Failed to publish to ${topic}:`, err);
            } else {
                console.log(`Published to ${topic}:`, payload);
            }
        });
    }


    disconnect() {
        if (this.client) {
            this.client.end();
        }
    }
}

module.exports = new MqttService();