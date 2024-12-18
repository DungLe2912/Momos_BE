// models/user.js
import { Model, DataTypes } from "sequelize";

class Accounts extends Model {}

export default (sequelize) => {
  Accounts.init(
    {
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "accounts",
    }
  );

  return Accounts;
};
