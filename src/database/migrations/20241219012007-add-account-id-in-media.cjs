import { DataTypes } from "sequelize";

export default {
  up: async (queryInterface) => {
    await queryInterface.addColumn("media", "accountId", {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "accounts",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("media", "accountId");
  },
};
