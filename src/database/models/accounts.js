import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Accounts extends Model {
    static associate(models) {
      Accounts.hasMany(models.media, {
        foreignKey: "accountId",
        as: "media",
      });
    }
  }

  Accounts.init(
    {
      // 'id' will be of UUID type, with auto-generation of UUID values.
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Automatically generate a UUID when a new record is created.
        allowNull: false,
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "accounts",
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ["password"] },
        },
      },
      timestamps: true, // Automatically manage 'createdAt' and 'updatedAt' columns.
      paranoid: true, // Soft deletes ('deletedAt' column for logical deletions).
    }
  );

  return Accounts;
};
