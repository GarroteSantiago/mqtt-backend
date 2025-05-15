'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Invoice extends Model {
        static associate(models) {
            Invoice.belongsTo(models.Borrower, {
                foreignKey: 'borrower_id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            })
            Invoice.belongsTo(models.Book, {
                foreignKey: 'book_id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            })
        }
    }

    Invoice.init
    (
        {
            borrower_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'borrowers',
                    key: 'id'
                }
            },
            book_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'books',
                    key: 'id'
                }
            },
            retrieval_date:{
                type: DataTypes.DATE,
                allowNull: false,
            },
            devolution_expected_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            devolution_date: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        },
        {
            sequelize,
            modelName: 'Invoice',
            tableName: 'invoices',
            timestamps: true,
            createdAt: 'devolution_date',
            updatedAt: false,
        }
    );

    return Invoice;
}