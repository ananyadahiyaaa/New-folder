const express = require('express')
const router = express.Router()
const ticketController = require('../controllers/ticketController')
const { protect, requireRole } = require('../middleware/authMiddleware')

// every ticket route needs a valid token
router.use(protect)

router.post('/', ticketController.createTicket)
router.get('/', ticketController.listTickets)
router.get('/:id', ticketController.getOne)

router.put('/:id/assign', requireRole('admin'), ticketController.assign)
router.put('/:id/status', ticketController.updateStatus)

module.exports = router
