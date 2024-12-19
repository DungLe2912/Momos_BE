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
      images: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      videos: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      accountId: {
        type: DataTypes.UUID,
        allowNull: false, // Khoá ngoại không thể null
        references: {
          model: "accounts", // Tên bảng liên kết
          key: "id", // Khoá chính của bảng accounts
        },
        onDelete: "CASCADE", // Xoá media khi account bị xoá
        onUpdate: "CASCADE", // Cập nhật media khi account thay đổi id
      },
    },
    {
      sequelize,
      modelName: "media",
      timestamps: true,
      paranoid: true,
    }
  );

  return Media;
};
