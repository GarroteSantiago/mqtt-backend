// services/mqttService.js
const mqtt = require('mqtt');
const db = require('../models');
const Borrower = require("../models").Borrower;
const Loan = require("../models").Loan;
const Book = require("../models").Book;
const Invoice = require("../models").Invoice;
const { BrowserQRCodeReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource} = require('@zxing/library');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const Jimp = require('jimp');

const reader = new BrowserQRCodeReader();

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

        // For accumulating image chunks by client_id
        this.imageChunksMap = new Map();   // Map<client_id, Map<partIndex, base64Chunk>>
        this.expectedPartsMap = new Map(); // Map<client_id, totalParts>
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
            const payloadStr = message.toString();
            const request = JSON.parse(payloadStr);
            console.log(`Received MQTT message on ${topic}:`, request);

            if (topic.startsWith('esp32/auth/request')) {
                this.publishAuthResponse(request);
            } else if (topic.startsWith('esp32/status/request')) {
                this.publishStatusResponse(request);
            } else if (topic.startsWith('esp32/loan/request')) {
                this.publishLoanResponse(request);
            } else if (topic.startsWith('esp32/image/request')) {
                const client_id = request.client_id;
                if (!client_id) {
                    console.warn('Imagen sin client_id');
                    return;
                }

                // Initialize buffers if missing
                if (!this.imageChunksMap.has(client_id)) {
                    this.imageChunksMap.set(client_id, new Map());
                }

                if (topic.endsWith('/part')) {
                    const part = request.part;
                    const total_parts = request.total_parts;
                    const image_chunk = request.image_chunk;

                    if (typeof part !== 'number' || typeof total_parts !== 'number' || !image_chunk) {
                        console.warn('Chunk de imagen inválido');
                        return;
                    }

                    // Save chunk
                    const chunks = this.imageChunksMap.get(client_id);
                    chunks.set(part, image_chunk);
                    this.expectedPartsMap.set(client_id, total_parts);

                    console.log(`Recibido chunk ${part + 1} de ${total_parts} para cliente ${client_id}`);

                    // If received all chunks, reconstruct and process
                    if (chunks.size === total_parts) {
                        console.log(`Todos los chunks recibidos para cliente ${client_id}, reconstruyendo imagen...`);

                        let fullBase64 = '';
                        for (let i = 0; i < total_parts; i++) {
                            const chunkBase64 = chunks.get(i);
                            if (!chunkBase64) {
                                console.error(`Falta el chunk ${i} para cliente ${client_id}`);
                                return;
                            }
                            fullBase64 += chunkBase64;
                        }

                        // Prepare full request for processing
                        const fullRequest = {
                            client_id: client_id,
                            image: fullBase64
                        };

                        // Clear buffers before processing next image
                        this.imageChunksMap.delete(client_id);
                        this.expectedPartsMap.delete(client_id);

                        this.publishImageResponse(fullRequest).catch(err => {
                            console.error(`Error procesando imagen para cliente ${client_id}:`, err);
                        });
                    }
                } else if (topic.endsWith('/final')) {
                    console.log(`Mensaje final recibido para cliente ${client_id}`);
                    // Optional additional logic if needed
                }
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

    async publishLoanResponse(request) {
        if (!this.client || !this.client.connected) {
            console.error('MQTT Client not connected');
            return false;
        }

        let payload={}
        const book = await Book.findByPk(request.book_code, {});
        if (book === null) {
            payload = JSON.stringify({
                auth: null,
                status: null,
                loan: false,
            })
        } else {
            const existingLoan = await Loan.findOne({where: {book_id:book.id}})
            if (existingLoan !== null) {
                payload = JSON.stringify({
                    auth: null,
                    status: null,
                    loan: false,
                })
            } else {
                try{
                    const loan = await Loan.create({
                        borrower_id: request.user_id,
                        book_id: book.id,
                    });
                    payload = JSON.stringify({
                        auth: null,
                        status: null,
                        loan: true,
                    })
                } catch (Error) {
                    payload = JSON.stringify({
                        auth: null,
                        status: null,
                        loan: false,
                    })
                }
            }
        }

        const topic = `esp32/loan/response/${request.client_id}`;
        const options = {}

        this.client.publish(topic, payload, options, (err) => {
            if (err) {
                console.error(`Failed to publish to ${topic}:`, err);
            } else {
                console.log(`Published to ${topic}:`, payload);
            }
        });
    }

    async publishImageResponse(request) {
        if (!this.client || !this.client.connected) {
            console.error('MQTT Client not connected');
            return false;
        }

        let code = null;

        try {
            // Decode base64 to buffer
            const imageBuffer = Buffer.from(request.image, 'base64');
            fs.writeFileSync('debug_image.jpg', imageBuffer);

            // Load image with Jimp
            const jimpImage = await Jimp.read(imageBuffer);

            // Extract RGB data
            const width = jimpImage.bitmap.width;
            const height = jimpImage.bitmap.height;
            const bitmapData = jimpImage.bitmap.data;

            // Create luminance array (grayscale)
            const luminanceData = new Uint8ClampedArray(width * height);
            for (let i = 0; i < width * height; i++) {
                const r = bitmapData[i * 4];
                const g = bitmapData[i * 4 + 1];
                const b = bitmapData[i * 4 + 2];
                luminanceData[i] = Math.round((r + g + b) / 3);
            }

            // ZXing luminance source
            const luminanceSource = new RGBLuminanceSource(luminanceData, width, height);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

            try {
                const result = reader.decode(binaryBitmap);
                code = result.getText();
            } catch (decodeError) {
                // No code detected
                code = null;
            }

        } catch (err) {
            console.warn('No se detectó código:', err.message);
        }

        const payload = JSON.stringify({
            image: !!code,
            code: code
        });

        const topic = `esp32/loan/response/${request.client_id}`;
        const options = {};

        this.client.publish(topic, payload, options, (err) => {
            if (err) {
                console.error(`Failed to publish to ${topic}:`, err);
            } else {
                console.log(`Published to ${topic}:`, payload);
            }
        });

        return !!code;
    }

    disconnect() {
        if (this.client) {
            this.client.end();
        }
    }
}

module.exports = new MqttService();
