import * as Yup from 'yup';
import { isBefore, parseISO, startOfHour, addMonths, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Registration from '../models/Registration';
import Students from '../models/Students';
import Plans from '../models/Plans';
import Queue from '../../lib/Queue';

import CancellationMail from '../jobs/CancellationMail';
import RegistrationMail from '../jobs/RegistrationMail';

class RegistrationController {
  async store(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      plan_id: Yup.number().required(),
      start_date: Yup.date().required(),
      end_date: Yup.date(),
      price: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation fails' });
    }

    const { student_id, plan_id, start_date } = req.body;

    /**
     * Check if student exists
     */
    const student = await Students.findOne({
      where: {
        id: student_id,
      },
    });

    if (!student) {
      return res.status(401).json({ error: 'This student does not exists' });
    }

    /**
     * Check if plan exists
     */
    const plan = await Plans.findOne({
      where: {
        id: plan_id,
      },
    });

    if (!plan) {
      return res.status(401).json({ error: 'This plan does not exists' });
    }

    /**
     * Date valitation
     */
    const hourStart = await startOfHour(parseISO(start_date));

    if (isBefore(hourStart, new Date())) {
      return res.status(401).json({ error: 'Past dates are not permitted' });
    }

    const end_date = await addMonths(hourStart, plan.duration);

    const formattedEndDate = format(end_date, "dd'/'MM'/'yyyy", {
      locale: pt,
    });

    const price = plan.price * plan.duration;

    const registration = await Registration.create({
      student_id,
      plan_id,
      start_date,
      end_date,
      price,
    });

    await Queue.add(RegistrationMail.key, {
      student,
      plan,
      price,
      formattedEndDate,
    });

    return res.json(registration);
  }

  async index(req, res) {
    const registrations = await Registration.findAll({
      where: {
        student_id: req.params.id,
        cancelled_at: null,
      },
    });

    return res.json(registrations);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      plan_id: Yup.number(),
      start_date: Yup.date(),
      end_date: Yup.date(),
      price: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation error' });
    }

    const { plan_id, start_date } = req.body;

    const { id } = req.params;
    const registration = await Registration.findByPk(id);

    if (!registration) {
      return res
        .status(401)
        .json({ error: 'This registration does not exist' });
    }

    const plan = await Plans.findOne({
      where: {
        id: plan_id,
      },
    });

    if (!plan) {
      return res.status(401).json({ error: 'This plan does not exists' });
    }

    const hourStart = startOfHour(parseISO(start_date));

    if (isBefore(hourStart, new Date())) {
      return res.status(401).json({ error: 'Past dates are not permitted' });
    }

    const end_date = await addMonths(hourStart, plan.duration);

    const price = plan.price * plan.duration;

    await registration.update({ plan_id, start_date, end_date, price });

    return res.json({
      plan_id,
      start_date,
      end_date,
      price,
    });
  }

  async delete(req, res) {
    const registration = await Registration.findByPk(req.params.id, {
      include: [
        {
          model: Students,
          as: 'student',
          attributes: ['name', 'email'],
        },
        {
          model: Plans,
          as: 'plan',
          attributes: ['title'],
        },
      ],
    });

    if (!registration) {
      return res.status(400).json({ error: 'Registration not found' });
    }

    registration.cancelled_at = new Date();

    await registration.save();

    await Queue.add(CancellationMail.key, {
      registration,
    });

    return res.json(registration);
  }
}

export default new RegistrationController();
