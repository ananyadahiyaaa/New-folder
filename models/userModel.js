let users = []
let idCounter = 1

const create = (userData) => {
    const newUser = { id: idCounter++, ...userData }
    users.push(newUser)
    return newUser
}

const findByEmail = (email) => {
    return users.find(u => u.email === email) || null
}

const findById = (id) => {
    return users.find(u => u.id === id) || null
}

const findAll = () => users

module.exports = { create, findByEmail, findById, findAll }
