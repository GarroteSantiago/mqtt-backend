const db = require('./models');

async function startApp() {
    try {
        // Sync models if in development
        if (process.env.NODE_ENV === 'development') {
            await db.sequelize.sync({alter: true});
        }

    } catch (error) {
        console.error('Application startup failed:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    process.exit(0);
});

startApp();