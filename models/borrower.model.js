'use strict';

const { Model, Sequelize } = require('sequelize');

/**
 * @param {Sequelize} sequelize
 * @param {typeof import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    class Borrower extends Model {
        static associate(models) {
            Borrower.belongsTo(models.Role, {
                foreignKey: 'role_id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            })
            Borrower.belongsTo(models.Career, {
                foreignKey: 'career_id',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            })
            Borrower.hasOne(models.Loan, {
                foreignKey: 'borrower_id',
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            })
            Borrower.hasOne(models.Invoice, {
                foreignKey: 'borrower_id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            })
        }
    }

    Borrower.init
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
            role_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'roles',
                    key: 'id'
                }
            },
            career_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: {
                    model: 'careers',
                    key: 'id'
                }
            }
        },
        {
            sequelize,
            modelName: 'Borrower',
            tableName: 'borrowers',
            timestamps: false,
        }
    );

    return Borrower;
};
