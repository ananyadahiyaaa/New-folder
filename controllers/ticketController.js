const ticketService = require('../services/ticketService')

const createTicket = async (req, res, next) => {
    try {
        const ticket = ticketService.createTicket(req.body, req.user.id)
        res.status(201).json(ticket)
    } catch (err) {
        next(err)
    }
}

const listTickets = async (req, res, next) => {
    try {
        const tickets = ticketService.listTickets(req.query)
        res.status(200).json(tickets)
    } catch (err) {
        next(err)
    }
}

const getOne = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10)
        const ticket = ticketService.getTicket(id)
        res.status(200).json(ticket)
    } catch (err) {
        next(err)
    }
}

const assign = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10)
        const { assigneeId } = req.body
        if (assigneeId === undefined) {
            const err = new Error('assigneeId is required')
            err.status = 400
            throw err
        }
        const updated = ticketService.assignTicket(id, parseInt(assigneeId, 10), req.user.id)
        res.status(200).json(updated)
    } catch (err) {
        next(err)
    }
}

const updateStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10)
        const { status } = req.body
        if (!status) {
            const err = new Error('status is required')
            err.status = 400
            throw err
        }
        const updated = ticketService.updateStatus(id, status, req.user)
        res.status(200).json(updated)
    } catch (err) {
        next(err)
    }
}

module.exports = { createTicket, listTickets, getOne, assign, updateStatus }
