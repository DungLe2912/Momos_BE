import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Media extends Model {}

  Media.init(
    {
      // 'id' will be of UUID type, with auto-generation of UUID values.
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Automatically generate a UUID when a new record is created.
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSONB, // Store images as an array of URLs
        allowNull: false,
      },
      videos: {
        type: DataTypes.JSONB, // Store videos as an array of URLs
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "media",
      timestamps: true, // Automatically manage 'createdAt' and 'updatedAt' columns.
      paranoid: true, // Soft deletes ('deletedAt' column for logical deletions).
    }
  );

  return Media;
};
