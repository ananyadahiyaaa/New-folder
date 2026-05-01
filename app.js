const express = require('express')
const dotenv = require('dotenv')

dotenv.config()

const userService = require('./services/userService')
const userRoutes = require('./routes/userRoutes')
const ticketRoutes = require('./routes/ticketRoutes')
const errorHandler = require('./middleware/errorHandler')

const app = express()
app.use(express.json())

app.get('/', (req, res) => {
    res.json({ message: 'hospital ticket api running' })
})

app.use('/api/users', userRoutes)
app.use('/api/tickets', ticketRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000

// seed the admin then start listening
userService.seedAdmin().then((admin) => {
    console.log(`seeded admin user: ${admin.email}`)
    app.listen(PORT, () => {
        console.log(`server running on port ${PORT}`)
    })
}).catch((err) => {
    console.error('failed to seed admin', err)
    process.exit(1)
})

module.exports = app
