'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Career extends Model {
        static associate(models) {
            Career.hasMany(models.Borrower, {
                foreignKey: "career_id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            })
        }
    }

    Career.init
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
            modelName: 'Career',
            tableName: 'careers',
            timestamps: false,
        }
    );

    return Career;
};
