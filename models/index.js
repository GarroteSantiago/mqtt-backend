'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database_config.js')[env];
const db = {};

// Validate config
if (!config) {
    throw new Error(`No database configuration found for environment: ${env}`);
}

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    // Check minimum required config
    const required = ['database', 'username', 'password', 'host'];
    const missing = required.filter(field => !config[field]);

    if (missing.length) {
        throw new Error(`Missing database config fields: ${missing.join(', ')}`);
    }

    sequelize = new Sequelize(
        config.database,
        config.username,
        config.password,
        {
            host: config.host,
            port: config.port || 3306,
            dialect: config.dialect || 'mysql',
            dialectModule: config.dialectModule || require('mysql2'),
            ...config
        }
    );
}

// Load models
fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== basename)
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

// Setup associations
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// Add connection test
db.testConnection = async () => {
    try {
        await sequelize.authenticate();
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    }
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;