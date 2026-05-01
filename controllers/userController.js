const userService = require('../services/userService')

const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body
        const result = await userService.registerUser(name, email, password, role)
        res.status(201).json(result)
    } catch (err) {
        next(err)
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body
        const result = await userService.loginUser(email, password)
        res.status(200).json(result)
    } catch (err) {
        next(err)
    }
}

module.exports = { register, login }
