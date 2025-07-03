'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Book extends Model {
        static associate(models) {
            Book.belongsTo(models.Campus, {
                foreignKey: 'campus_id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            })
            Book.hasOne(models.Loan, {
                foreignKey: 'book_id',
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            })
            Book.hasOne(models.Invoice, {
                foreignKey: 'book_id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            })
        }
    }

    Book.init
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
                unique: false
            },
            campus_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'campuses',
                    key: 'id'
                }
            }
        },
        {
            sequelize,
            modelName: 'Book',
            tableName: 'books',
            timestamps: false,
        }
    );

    return Book;
};
