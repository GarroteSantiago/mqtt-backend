require('dotenv').config();

const getConfig = (env) => {
    const common = {
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        timezone: '+00:00',
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            timestamps: true
        },
        logging: env === 'development' ? console.log : false
    };

    const configs = {
        development: {
            database: process.env.DB_NAME_DEV,
            username: process.env.DB_USER_DEV,
            password: process.env.DB_PASSWORD_DEV,
            host: process.env.DB_HOST_DEV,
            port: process.env.DB_PORT,
            ...common
        }
    };

    return configs[env] || configs.development;
};

module.exports = {
    development: getConfig('development'),
};