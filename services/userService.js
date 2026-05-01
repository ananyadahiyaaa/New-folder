const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const ALLOWED_ROLES_ON_REGISTER = ['technician', 'staff']

const registerUser = async (name, email, password, role) => {
    if (!name || !email || !password) {
        const err = new Error('name, email and password are required')
        err.status = 400
        throw err
    }

    const finalRole = role || 'staff'

    if (!ALLOWED_ROLES_ON_REGISTER.includes(finalRole)) {
        const err = new Error('role must be technician or staff')
        err.status = 400
        throw err
    }

    const existing = userModel.findByEmail(email)
    if (existing) {
        const err = new Error('email already in use')
        err.status = 400
        throw err
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = userModel.create({ name, email, password: hashed, role: finalRole })

    return { message: 'user created', userId: user.id, role: user.role }
}

const loginUser = async (email, password) => {
    const user = userModel.findByEmail(email)
    if (!user) {
        const err = new Error('invalid credentials')
        err.status = 401
        throw err
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        const err = new Error('invalid credentials')
        err.status = 401
        throw err
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
    return { token, role: user.role }
}

const seedAdmin = async () => {
    const existing = userModel.findByEmail('admin@hospital.com')
    if (existing) return existing
    const hashed = await bcrypt.hash('admin123', 10)
    const admin = userModel.create({
        name: 'System Admin',
        email: 'admin@hospital.com',
        password: hashed,
        role: 'admin'
    })
    return admin
}

module.exports = { registerUser, loginUser, seedAdmin }
