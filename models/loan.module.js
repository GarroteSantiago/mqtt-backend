'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Loan extends Model {
        static associate(models) {
            Loan.belongsTo(models.Borrower, {
                foreignKey: 'borrower_id',
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            })
            Loan.belongsTo(models.Book, {
                foreignKey: 'book_id',
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            })
        }
    }

    Loan.init
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
            }
        },
        {
            sequelize,
            modelName: 'Loan',
            tableName: 'loans',
            timestamps: true,
            createdAt: 'retrieval_date',
            updatedAt: false,
        }
    );

    return Loan;
}