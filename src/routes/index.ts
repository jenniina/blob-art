import { Router, Response, Request, NextFunction } from 'express'
import { rateLimit } from '../middleware/rateLimit'
const { body, check, validationResult } = require('express-validator')
const { sendEmailForm, sendEmailSelect } = require('../controllers/email')
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  loginUser,
  registerUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  resetPasswordToken,
  verifyEmailToken,
  generateToken,
  findUserByUsername,
  checkIfAdmin,
  authenticateUser,
  getPublicUserNamesByIds,
  comparePassword,
  updateUsername,
  resetUsernameChange,
  confirmEmail,
  addToBlacklistedJokes,
  removeJokeFromBlacklisted,
  revokeUserSessions,
  authPing,
} from '../controllers/users'
import { ELanguage } from '../types'
import {
  getAllBlobsByUser,
  getBlobsVersionByUser,
  saveBlobsByUser,
  deleteBlobsVersionByUser,
  editBlobsByUser,
} from '../controllers/blobs'

const router = Router()

const rateLimitMessage = 'Too many requests, please try again later.'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: rateLimitMessage,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: rateLimitMessage,
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: rateLimitMessage,
})

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: rateLimitMessage,
})

const tokenIssueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: rateLimitMessage,
})

router.post('/login', loginLimiter, loginUser)

router.get('/auth/ping', [authenticateUser], authPing)

router.post('/users/forgot', forgotPasswordLimiter, forgotPassword)
router.get('/users/reset/:token', resetPassword)
router.post('/users/reset/:token', resetPasswordLimiter, resetPasswordToken)
router.get('/users/reset-username/:token', resetUsernameChange)

// Public, non-admin endpoint for displaying authors (returns only {_id, name})
router.post('/users/public/names', getPublicUserNamesByIds)

router.get('/users', [authenticateUser, checkIfAdmin], getUsers)
router.get('/users/:id', [authenticateUser], getUser)
//router.post('/users', addUser)
router.put('/users/:id', [authenticateUser, comparePassword, updateUser])
router.put('/users/', [authenticateUser, comparePassword, updateUsername])
router.get('/users/:username/confirm-email/:token', confirmEmail)
router.delete('/users/:id/:deleteJokes', [authenticateUser, deleteUser])
router.post('/users/register', registerLimiter, registerUser)
router.get('/users/verify/:token', verifyEmailToken)
router.get('/users/logout', logoutUser)
//router.get('/users/verify/:token', [verifyTokenMiddleware, verifyEmailToken])
router.post('/users/:id', tokenIssueLimiter, generateToken)
router.get('/users/username/:username', findUserByUsername)
router.post(
  '/users/:id/revoke-sessions',
  [authenticateUser],
  revokeUserSessions
)

router.get('/blobs/:user/:d', [authenticateUser], getAllBlobsByUser)
router.get(
  '/blobs/:user/:d/:versionName/:language',
  [authenticateUser],
  getBlobsVersionByUser
)
router.post(
  '/blobs/:user/:d/:versionName/:language',
  [authenticateUser],
  saveBlobsByUser
)
router.delete(
  '/blobs/:user/:d/:versionName/:language',
  [authenticateUser],
  deleteBlobsVersionByUser
)
router.put(
  '/blobs/:user/:d/:versionName/:language',
  [authenticateUser],
  editBlobsByUser
)

router.get('/', (_req, res) => {
  res.send('Nothing to see here')
})

router.post(
  '/send-email-form',
  [
    body('firstName').trim().escape(),
    body('lastName').trim().escape(),
    body('email').isEmail(),
    body('message').trim().escape(),
    body('encouragement').trim().escape(),
    body('color').trim().escape(),
    body('dark').trim().escape(),
    body('light').trim().escape(),
    body('select').trim().escape(),
    body('selectmulti').trim().escape(),
  ],
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().join('\n'),
        errors: errors.array(),
      })
    }
    next()
  },
  sendEmailForm
)

router.post(
  '/send-email-select',
  [
    body('language')
      .optional({ checkFalsy: true })
      .isIn(Object.values(ELanguage)),
    body('issues').trim().escape(),
    body('favoriteHero').trim().escape(),
    body('clarification').optional({ checkFalsy: true }).trim().escape(),
    body('email').optional({ checkFalsy: true }).trim().escape(),
  ],
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors
          .array()
          .map((error: { msg: string | Object }) => {
            if (typeof error.msg === 'object') {
              return JSON.stringify(error.msg)
            }
            return String(error.msg)
          })
          .join('\n'),
        errors: errors.array(),
      })
    }
    next()
  },
  sendEmailSelect
)

export default router
