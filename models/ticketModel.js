let tickets = []
let idCounter = 1

const create = (data) => {
    const now = new Date().toISOString()
    const ticket = {
        id: idCounter++,
        ...data,
        status: 'open',
        assigneeId: null,
        createdAt: now,
        updatedAt: now,
        events: [
            { type: 'created', at: now, by: data.reportedBy }
        ]
    }
    tickets.push(ticket)
    return ticket
}

const findById = (id) => {
    return tickets.find(t => t.id === id) || null
}

const findAll = (filter = {}) => {
    let result = tickets
    if (filter.status) {
        result = result.filter(t => t.status === filter.status)
    }
    if (filter.assigneeId !== undefined && filter.assigneeId !== null) {
        result = result.filter(t => t.assigneeId === filter.assigneeId)
    }
    return result
}

const update = (id, changes) => {
    const t = findById(id)
    if (!t) return null
    Object.assign(t, changes, { updatedAt: new Date().toISOString() })
    return t
}

const addEvent = (id, event) => {
    const t = findById(id)
    if (!t) return null
    t.events.push({ at: new Date().toISOString(), ...event })
    return t
}

module.exports = { create, findById, findAll, update, addEvent }
