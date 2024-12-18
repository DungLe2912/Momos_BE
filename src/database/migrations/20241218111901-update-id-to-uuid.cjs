"use strict";

module.exports = {
  // 'up' function is used to apply the migration (e.g., change column types).
  up: async (queryInterface, Sequelize) => {
    // Step 1: Check if the 'new_id' column exists. If not, add it.
    const tableDescription = await queryInterface.describeTable("accounts");

    // Only add 'new_id' column if it doesn't already exist
    if (!tableDescription.new_id) {
      await queryInterface.addColumn("accounts", "new_id", {
        type: Sequelize.UUID,
        defaultValue: Sequelize.fn("uuid_generate_v4"), // Use PostgreSQL's uuid_generate_v4() function to generate UUID
        allowNull: true, // Ensure the new ID can be null temporarily
      });

      // Step 2: Add UNIQUE constraint after adding the column.
      await queryInterface.addConstraint("accounts", {
        fields: ["new_id"],
        type: "unique",
        name: "unique_new_id_constraint", // Optionally, provide a name for the constraint
      });
    }

    // Step 3: Populate the new 'new_id' column with UUIDs for existing records.
    const accounts = await queryInterface.sequelize.query(
      "SELECT id FROM accounts" // Fetch all existing 'id' values
    );
    const accountIds = accounts[0]; // Extract account IDs from query result

    // Update each row with a new UUID for 'new_id'
    for (let account of accountIds) {
      await queryInterface.bulkUpdate(
        "accounts",
        { new_id: Sequelize.fn("uuid_generate_v4") }, // Generate UUID for the 'new_id' column using PostgreSQL function
        { id: account.id } // Apply update to each account by original 'id'
      );
    }

    // Step 4: Remove the old 'id' column (which was an integer).
    await queryInterface.removeColumn("accounts", "id");

    // Step 5: Rename 'new_id' column to 'id' to preserve the column name.
    await queryInterface.renameColumn("accounts", "new_id", "id");

    // Step 6: Change 'id' column to UUID type with Sequelize.fn('uuid_generate_v4') as default
    await queryInterface.changeColumn("accounts", "id", {
      type: Sequelize.UUID,
      defaultValue: Sequelize.fn("uuid_generate_v4"), // Automatically generate UUID using PostgreSQL function
      allowNull: false, // 'id' cannot be null
    });
  },

  // The 'down' function is used to undo the migration (if needed).
  down: async (queryInterface, Sequelize) => {
    // Step 1: Add the old 'id' column back with INTEGER type.
    await queryInterface.addColumn("accounts", "new_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true, // Make it auto-incrementing (like original 'id')
    });

    // Step 2: Remove the current 'id' column (which is now a UUID).
    await queryInterface.removeColumn("accounts", "id");

    // Step 3: Rename 'new_id' column back to 'id'.
    await queryInterface.renameColumn("accounts", "new_id", "id");
  },
};
