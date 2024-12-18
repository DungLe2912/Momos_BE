module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("accounts", "email", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      'UPDATE "accounts" SET "email" = \'default@gmail.com\' WHERE "email" IS NULL'
    );

    await queryInterface.changeColumn("accounts", "email", {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("accounts", "email");
  },
};
