const ticketModel = require('../models/ticketModel')
const userModel = require('../models/userModel')

const ALLOWED_PRIORITIES = ['low', 'medium', 'high']
const ALLOWED_CATEGORIES = ['ventilator', 'monitor', 'imaging', 'other']

// legal forward-only transitions through the /status endpoint
// open->assigned is intentionally NOT in here, that path goes through /assign
const NEXT_STATUS = {
    'assigned': 'in-progress',
    'in-progress': 'resolved',
    'resolved': 'closed'
}

const createTicket = (data, reportedBy) => {
    const { title, description, priority, category, equipmentId, hospitalLocation } = data

    if (!title || !description || !priority || !category || !equipmentId || !hospitalLocation) {
        const err = new Error('title, description, priority, category, equipmentId and hospitalLocation are required')
        err.status = 400
        throw err
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
        const err = new Error(`priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`)
        err.status = 400
        throw err
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
        const err = new Error(`category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`)
        err.status = 400
        throw err
    }

    const ticket = ticketModel.create({
        title,
        description,
        priority,
        category,
        equipmentId,
        hospitalLocation,
        reportedBy
    })

    return ticket
}

const listTickets = (query) => {
    const filter = {}
    if (query.status) filter.status = query.status
    if (query.assigneeId) {
        const parsed = parseInt(query.assigneeId, 10)
        if (!isNaN(parsed)) filter.assigneeId = parsed
    }
    return ticketModel.findAll(filter)
}

const getTicket = (id) => {
    const ticket = ticketModel.findById(id)
    if (!ticket) {
        const err = new Error('ticket not found')
        err.status = 404
        throw err
    }
    return ticket
}

const assignTicket = (ticketId, assigneeId, adminId) => {
    const ticket = ticketModel.findById(ticketId)
    if (!ticket) {
        const err = new Error('ticket not found')
        err.status = 404
        throw err
    }

    if (ticket.status !== 'open') {
        const err = new Error('ticket already assigned or beyond')
        err.status = 400
        throw err
    }

    const assignee = userModel.findById(assigneeId)
    if (!assignee) {
        const err = new Error('assignee user not found')
        err.status = 404
        throw err
    }

    if (assignee.role !== 'technician') {
        const err = new Error('can only assign tickets to technicians')
        err.status = 400
        throw err
    }

    ticketModel.update(ticketId, { status: 'assigned', assigneeId })
    ticketModel.addEvent(ticketId, {
        type: 'assigned',
        by: adminId,
        assigneeId
    })

    return ticketModel.findById(ticketId)
}

const updateStatus = (ticketId, newStatus, user) => {
    const ticket = ticketModel.findById(ticketId)
    if (!ticket) {
        const err = new Error('ticket not found')
        err.status = 404
        throw err
    }

    // block assigning via this endpoint - that is what /assign is for
    if (newStatus === 'assigned') {
        const err = new Error('use the /assign endpoint to assign a ticket')
        err.status = 400
        throw err
    }

    const expectedNext = NEXT_STATUS[ticket.status]
    if (!expectedNext || expectedNext !== newStatus) {
        const err = new Error(`illegal status transition: ${ticket.status} → ${newStatus}`)
        err.status = 400
        throw err
    }

    // who is allowed to do this transition?
    if (newStatus === 'closed') {
        // only admin can close
        if (user.role !== 'admin') {
            const err = new Error('only admin can close a ticket')
            err.status = 403
            throw err
        }
    } else {
        // in-progress, resolved -- only the assigned technician
        if (user.role !== 'technician' || ticket.assigneeId !== user.id) {
            const err = new Error('only the assigned technician can update this status')
            err.status = 403
            throw err
        }
    }

    const fromStatus = ticket.status
    ticketModel.update(ticketId, { status: newStatus })
    ticketModel.addEvent(ticketId, {
        type: 'status_changed',
        by: user.id,
        from: fromStatus,
        to: newStatus
    })

    return ticketModel.findById(ticketId)
}

module.exports = {
    createTicket,
    listTickets,
    getTicket,
    assignTicket,
    updateStatus
}
