'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Request extends Model {
        static associate(models) {
            Request.belongsTo(models.Borrower, {
                foreignKey: 'borrower_id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            })
        }
    }

    Request.init
    (
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            borrower_id: {
                type: DataTypes.CHAR(8),
                allowNull: false,
                references: {
                    model: 'borrowers',
                    key: 'id'
                }
            }
        },
        {
            sequelize,
            modelName: 'Request',
            tableName: 'requests',
            timestamps: true,
            createdAt: 'devolution_date',
            updatedAt: false,
        }
    );

    return Request;
}