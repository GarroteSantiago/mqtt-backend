'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Campus extends Model {
        static associate(models) {
            Campus.hasMany(models.Book, {
                foreignKey: 'campus_id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            })
        }
    }

    Campus.init
    (
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
        },
        {
            sequelize,
            modelName: 'Campus',
            tableName: 'campuses',
            timestamps: false,
        }
    );

    return Campus;
};
