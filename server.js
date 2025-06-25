// server.js
const express = require('express');
const db = require('./models');
const mqttService = require('./services/mqtt');

async function startServer() {
    try {
        // 1. Test database connection
        await db.sequelize.authenticate();
        console.log('Database connection established');

        // 2. Sync models (only alter in development)
        if (process.env.NODE_ENV === 'development') {
            await db.sequelize.sync({});
            console.log('Database models synchronized');
        } else{
            await db.sequelize.sync({});
        }

        const MQTT_TOPICS = ["esp32/auth/request", "esp32/status/request", "esp32/loan/make"]
        // 3. Start MQTT service
        await mqttService.connect(MQTT_TOPICS);
        console.log('MQTT service started');

        // 4. Create Express app
        const app = express();
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                database: 'connected',
                mqtt: mqttService.client.connected ? 'connected' : 'disconnected'
            });
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down...');
            await mqttService.disconnect();
            await db.sequelize.close();
            process.exit(0);
        });

    } catch (err) {
        console.error('Server startup failed:', err);
        process.exit(1);
    }
}

startServer();