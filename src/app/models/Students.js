import Sequelize, { Model } from 'sequelize';

class Students extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        years_old: Sequelize.STRING,
        weight: Sequelize.STRING,
        height: Sequelize.STRING,
      },
      {
        sequelize,
      }
    );

    return this;
  }
}

export default Students;
