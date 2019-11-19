import Sequelize, { Model } from 'sequelize';

class Checkins extends Model {
  static init(sequelize) {
    super.init(
      {
        student_id: Sequelize.NUMBER,
      },
      {
        sequelize,
      }
    );
    return this;
  }

  static associate(models) {
    this.belongsTo(models.Students, {
      foreignKey: 'student_id',
      as: 'student',
    });
  }
}
export default Checkins;
