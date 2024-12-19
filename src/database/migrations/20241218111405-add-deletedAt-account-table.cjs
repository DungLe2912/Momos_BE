module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("accounts", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("accounts", "deletedAt");
  },
};