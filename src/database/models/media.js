import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Media extends Model {
    static associate(models) {
      Media.belongsTo(models.accounts, {
        foreignKey: "accountId",
        as: "accounts",
      });
    }
  }

  Media.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("image", "video"),
        allowNull: false,
      },
      src: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      accountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "accounts",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "media",
      timestamps: true,
      paranoid: true, // Soft delete
    }
  );

  return Media;
};
