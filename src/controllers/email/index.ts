import { Request, Response } from 'express'
import { generateToken } from '../users'
import { IUser } from '../../types'

const { validationResult } = require('express-validator')
const sanitizeHtml = require('sanitize-html')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASSWORD,
  },
})

export const sendMail = (
  subject: string,
  message: string,
  username: IUser['username'] | undefined,
  link: string
) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(
      {
        from: process.env.NODEMAILER_USER,
        to: username,
        subject,
        text: `${message}\n\n ${link}`,
      },
      (error: Error, info: { response: unknown }) => {
        if (error) {
          console.error(error)
          reject(error)
          return error
        }

        resolve(info.response)
        return info.response
      }
    )
  })
}

export const sendVerificationLink = async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.error(errors)
    return res.status(400).json({ errors: errors.array() })
  }

  const { email } = req.body
  const token = generateToken(email)

  const mailTransporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  })

  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to: email,
    subject: 'Verify your email address for jenniina.fi',
    text: `
            Click the link below to verify your email address.
            ${process.env.BASE_URI}/verify/${token}
        `,
  }

  try {
    await mailTransporter.sendMail(mailOptions)
    res.status(200).send('Email sent')
  } catch (error) {
    console.error(error)
    res.status(500).send('Error sending email')
  }
}

export const sendEmailForm = async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.error(errors)
    return res.status(400).json({ errors: errors.array() })
  }

  const sanitizedMessage = sanitizeHtml(req.body.message)
  const sanitizedEncouragement = sanitizeHtml(req.body.encouragement)
  const sanitizedClarification = sanitizeHtml(req.body.clarification)
  const { firstName, lastName, email } = req.body

  const mailTransporter = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: process.env.NODEMAILER_PORT,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  })

  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to: process.env.NODEMAILER_USER,
    subject: `Message from ${firstName} ${lastName}`,
    text: `
    Subject: ${req.body.select}
    Message: ${sanitizedMessage}
    Encouragement: ${sanitizedEncouragement}
    Color: ${req.body.color}
    Preference: ${req.body.dark}${req.body.light}
    Select Multi: ${req.body.selectmulti}
    Clarification: ${sanitizedClarification}
    From: ${email}
  `,
  }

  try {
    await mailTransporter.sendMail(mailOptions)
    res.status(200).send('Email sent')
  } catch (error) {
    console.error(error)
    res.status(500).send('Error sending email')
  }
}

export const sendEmailSelect = async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.error(errors)
    return res.status(400).json({ errors: errors.array() })
  }

  const sanitizedMessage = sanitizeHtml(req.body.clarification)
  const sanitizedEmail = sanitizeHtml(req.body.email)
  const { favoriteHero, issues } = req.body

  const mailTransporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  })

  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to: process.env.NODEMAILER_USER,
    subject: 'Message from React Custom Select Page',
    text: `
        Issues: ${issues}
        Favorite Hero Section: ${favoriteHero}
        Clarification: ${sanitizedMessage} 
        Email: ${sanitizedEmail}
    `,
  }

  try {
    await mailTransporter.sendMail(mailOptions)
    res.status(200).send('Email sent')
  } catch (error) {
    console.error(error)
    res.status(500).send('Error sending email')
  }
}
