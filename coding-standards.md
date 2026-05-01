# Backend Assessment — Node.js + Express
## Track: Backend | Language: JavaScript (Node.js)

---

## Before You Start

- Repo name = your college roll number
- One repo, one branch (main or master — do NOT push to any other branch)
- Each question gets its own folder: `q1/`, `q2/`, `q3/`
- Add `.gitignore` before your first commit (template at the bottom of this file)
- 3 hours total. Pace yourself — read all questions first, then start

---

## Folder Structure (follow this)

```
<roll-number>/
├── q1/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── models/
│   ├── app.js
│   └── package.json
├── q2/
│   └── (same pattern)
├── q3/
│   └── (same pattern)
└── .gitignore
```

---

## Architecture — Layered Pattern

Every question should follow this same structure. Don't dump everything in one file.

```
Request
  └── routes/          (just maps URL to controller)
        └── controllers/   (handles req/res, calls service)
              └── services/    (actual business logic)
                    └── models/    (data, DB queries)

Middleware runs before controller (auth, validation, error handling)
```

Why this matters — if an interviewer or evaluator opens your code, they'll see clean separation. It also means bugs are easier to find because each layer has one job.

---

## Project Setup (do this first for each question folder)

```bash
mkdir q1 && cd q1
npm init -y
npm install express bcryptjs jsonwebtoken dotenv
```

Create a `.env` file:
```
PORT=3000
JWT_SECRET=somethinglong_and_random_here
```

---

## app.js — Entry Point

```js
const express = require('express')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
app.use(express.json())

const userRoutes = require('./routes/userRoutes')
app.use('/api/users', userRoutes)

const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})

module.exports = app
```

---

## Layer 1 — Routes

Routes should do nothing except map a URL + HTTP method to a controller function. No logic here.

`routes/userRoutes.js`
```js
const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/profile', protect, userController.getProfile)

module.exports = router
```

---

## Layer 2 — Controllers

Controllers receive the request, call the service, and send back the response. They don't contain business logic — they just coordinate.

`controllers/userController.js`
```js
const userService = require('../services/userService')

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body
        const result = await userService.registerUser(name, email, password)
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

const getProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.id)
        res.status(200).json(user)
    } catch (err) {
        next(err)
    }
}

module.exports = { register, login, getProfile }
```

---

## Layer 3 — Services (Business Logic)

This is where all the actual work happens — hashing passwords, checking credentials, generating tokens, etc.

`services/userService.js`
```js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const registerUser = async (name, email, password) => {
    const existing = userModel.findByEmail(email)
    if (existing) {
        const err = new Error('email already in use')
        err.status = 400
        throw err
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = userModel.create({ name, email, password: hashed })

    return { message: 'user created', userId: user.id }
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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' })
    return { token }
}

const getUserById = (id) => {
    const user = userModel.findById(id)
    if (!user) {
        const err = new Error('user not found')
        err.status = 404
        throw err
    }
    const { password, ...safeUser } = user
    return safeUser
}

module.exports = { registerUser, loginUser, getUserById }
```

---

## Layer 4 — Models (Data Layer)

If there's no database, use an in-memory array. This is totally fine for a 3-hour exam.

`models/userModel.js`
```js
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

module.exports = { create, findByEmail, findById }
```

If you're using a real DB (like MongoDB with mongoose), your model file would export a mongoose schema and the service layer would call `.save()`, `.findOne()`, etc.

---

## Middleware — Auth Layer

`middleware/authMiddleware.js`
```js
const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'no token provided' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ message: 'invalid or expired token' })
    }
}

module.exports = { protect }
```

---

## Middleware — Error Handler

`middleware/errorHandler.js`
```js
const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500
    res.status(statusCode).json({
        message: err.message || 'something went wrong'
    })
}

module.exports = errorHandler
```

This is why every controller wraps things in `try/catch` and calls `next(err)` — it all flows here and you get consistent error responses.

---

## DSA — Patterns You Should Know

These will likely show up in one of the questions. Written as plain functions, not classes, to keep it readable.

### Array — Two Sum

```js
function twoSum(nums, target) {
    const seen = {}
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i]
        if (seen[complement] !== undefined) {
            return [seen[complement], i]
        }
        seen[nums[i]] = i
    }
    return []
}
```

### Stack — Balanced Brackets

```js
function isBalanced(str) {
    const stack = []
    const pairs = { ')': '(', ']': '[', '}': '{' }

    for (let ch of str) {
        if ('([{'.includes(ch)) {
            stack.push(ch)
        } else if (')]}'. includes(ch)) {
            if (stack.pop() !== pairs[ch]) return false
        }
    }
    return stack.length === 0
}
```

### Linked List — Detect Cycle

```js
function hasCycle(head) {
    let slow = head
    let fast = head

    while (fast !== null && fast.next !== null) {
        slow = slow.next
        fast = fast.next.next
        if (slow === fast) return true
    }
    return false
}
```

### Binary Search

```js
function binarySearch(arr, target) {
    let left = 0
    let right = arr.length - 1

    while (left <= right) {
        let mid = Math.floor((left + right) / 2)
        if (arr[mid] === target) return mid
        else if (arr[mid] < target) left = mid + 1
        else right = mid - 1
    }
    return -1
}
```

### Reverse a String / Array (common in-place trick)

```js
function reverseArray(arr) {
    let left = 0
    let right = arr.length - 1
    while (left < right) {
        let temp = arr[left]
        arr[left] = arr[right]
        arr[right] = temp
        left++
        right--
    }
    return arr
}
```

### Fibonacci — Memoized

```js
function fib(n, memo = {}) {
    if (n <= 1) return n
    if (memo[n]) return memo[n]
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]
}
```

---

## OOP Concepts — In JavaScript

JavaScript uses prototypal inheritance but the `class` syntax makes it look familiar. Use classes when the question specifically asks for OOP.

### Class + Inheritance Example

```js
class Animal {
    constructor(name) {
        this.name = name
    }

    speak() {
        return `${this.name} makes a sound`
    }
}

class Dog extends Animal {
    speak() {
        return `${this.name} barks`
    }
}

const d = new Dog('Bruno')
console.log(d.speak())
```

### Encapsulation — using closures (pre-ES2022 way, simpler)

```js
function createCounter() {
    let count = 0

    return {
        increment() { count++ },
        decrement() { count-- },
        getCount() { return count }
    }
}

const counter = createCounter()
counter.increment()
counter.increment()
console.log(counter.getCount())
```

### OOP Applied to a REST service — UserService as a class

Sometimes you'll want to wrap your service as a class if the question says OOP explicitly.

```js
class UserService {
    constructor() {
        this.users = []
        this.nextId = 1
    }

    addUser(name, email) {
        const user = { id: this.nextId++, name, email }
        this.users.push(user)
        return user
    }

    getUser(id) {
        return this.users.find(u => u.id === id) || null
    }

    getAllUsers() {
        return this.users
    }
}

module.exports = new UserService()
```

By exporting `new UserService()` instead of the class, you get a singleton — one shared instance across the app.

---

## REST API Design — Quick Reference

| Action | Method | URL |
|---|---|---|
| Get all items | GET | /api/items |
| Get one item | GET | /api/items/:id |
| Create item | POST | /api/items |
| Update item | PUT | /api/items/:id |
| Delete item | DELETE | /api/items/:id |

Status codes to use correctly:
- `200` — OK (GET, PUT success)
- `201` — Created (POST success)
- `400` — Bad request (missing fields, validation failed)
- `401` — Unauthorized (no/bad token)
- `403` — Forbidden (valid token but no permission)
- `404` — Not found
- `500` — Something broke server side

---

## Full CRUD Example — Products API

This is a full working example you can adapt for any CRUD question.

`routes/productRoutes.js`
```js
const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')

router.get('/', productController.getAll)
router.get('/:id', productController.getOne)
router.post('/', productController.create)
router.put('/:id', productController.update)
router.delete('/:id', productController.remove)

module.exports = router
```

`controllers/productController.js`
```js
const productService = require('../services/productService')

const getAll = async (req, res, next) => {
    try {
        const products = await productService.getAll()
        res.json(products)
    } catch (err) {
        next(err)
    }
}

const getOne = async (req, res, next) => {
    try {
        const product = await productService.getById(parseInt(req.params.id))
        res.json(product)
    } catch (err) {
        next(err)
    }
}

const create = async (req, res, next) => {
    try {
        const { name, price } = req.body
        const product = await productService.create(name, price)
        res.status(201).json(product)
    } catch (err) {
        next(err)
    }
}

const update = async (req, res, next) => {
    try {
        const updated = await productService.update(parseInt(req.params.id), req.body)
        res.json(updated)
    } catch (err) {
        next(err)
    }
}

const remove = async (req, res, next) => {
    try {
        await productService.remove(parseInt(req.params.id))
        res.json({ message: 'deleted' })
    } catch (err) {
        next(err)
    }
}

module.exports = { getAll, getOne, create, update, remove }
```

`services/productService.js`
```js
const productModel = require('../models/productModel')

const getAll = () => {
    return productModel.findAll()
}

const getById = (id) => {
    const product = productModel.findById(id)
    if (!product) {
        const err = new Error('product not found')
        err.status = 404
        throw err
    }
    return product
}

const create = (name, price) => {
    if (!name || price === undefined) {
        const err = new Error('name and price are required')
        err.status = 400
        throw err
    }
    return productModel.create({ name, price })
}

const update = (id, data) => {
    const product = productModel.findById(id)
    if (!product) {
        const err = new Error('product not found')
        err.status = 404
        throw err
    }
    return productModel.update(id, data)
}

const remove = (id) => {
    const product = productModel.findById(id)
    if (!product) {
        const err = new Error('product not found')
        err.status = 404
        throw err
    }
    productModel.remove(id)
}

module.exports = { getAll, getById, create, update, remove }
```

`models/productModel.js`
```js
let products = []
let idCounter = 1

const findAll = () => products

const findById = (id) => products.find(p => p.id === id) || null

const create = (data) => {
    const product = { id: idCounter++, ...data }
    products.push(product)
    return product
}

const update = (id, data) => {
    const index = products.findIndex(p => p.id === id)
    products[index] = { ...products[index], ...data }
    return products[index]
}

const remove = (id) => {
    products = products.filter(p => p.id !== id)
}

module.exports = { findAll, findById, create, update, remove }
```

---

## How AI Code Gets Detected — And What To Avoid

Modern platforms don't just scan for copy-paste. They look at patterns. Here's what flags code as AI-generated:

**Structural tells:**
- Perfect symmetry in all functions (same length, same comment style everywhere)
- Every function has a docstring or JSDoc comment — humans don't always do this
- Variable names that are always perfectly descriptive (`userAuthenticationToken` vs just `token`)
- No dead code, no commented-out lines, zero typos in comments

**Style tells:**
- Consistent 2-space or 4-space indentation everywhere without fail
- Every edge case handled immediately and cleanly
- Error messages that read like documentation ("Invalid authentication credentials provided")
- Imports always alphabetically sorted

**Behavioral tells (platforms that track keystrokes):**
- Code appears all at once instead of being built incrementally
- No backspacing or correction patterns
- Copy-paste events

**What to do instead:**

1. Type the code yourself, even if you planned it out — keylogger-based platforms track edit history

2. Use slightly inconsistent style deliberately:
   - Mix `const` and `let` where either works
   - Leave one or two `console.log` statements in (then maybe remove them)
   - Write a variable name, then rename it partway through
   - Use `err` in some places and `error` in others

3. Keep comments minimal and casual, like:
   - `// checking if user exists`
   - `// TODO: add pagination later`
   - `// this took me a while, basically find the middle`

4. Write functions that are slightly imperfect:
   - Not every helper needs to be extracted — sometimes inline is fine
   - Leave a slightly redundant condition that you'd normally refactor

5. Build incrementally — start with the route, then add the controller stub, then fill in the service. Don't write everything perfectly from top to bottom.

6. Use slightly different patterns across questions — don't use the exact same error handling boilerplate in all three.

---

## Git Workflow

```bash
git init
git add .gitignore
git commit -m "add gitignore"

git add q1/
git commit -m "q1 done - user auth api"

git add q2/
git commit -m "q2 done - products crud"

git add q3/
git commit -m "q3 done - dsa stuff"

git remote add origin https://github.com/<your-username>/<roll-number>.git
git push -u origin main
```

Make multiple commits, not one giant commit at the end. It looks more natural and shows progression.

---

## .gitignore Template

```
node_modules/
.env
.DS_Store
*.log
dist/
build/
.vscode/
*.swp
```

Add this as the very first thing before any `git add .`

---

## Testing Your APIs (use curl or Postman)

Register:
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"ravi","email":"ravi@test.com","password":"pass123"}'
```

Login:
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ravi@test.com","password":"pass123"}'
```

Protected route (paste the token from login response):
```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <your_token_here>"
```

---

## Time Management

- First 10 min: read all questions, plan your folder structure
- Next 20 min: get app.js and routing skeleton running for all questions
- Remaining time: fill in controllers → services → models layer by layer
- Last 15 min: test endpoints, final git commit, fill Google form

Don't spend more than 1 hour on any single question. A partial but working solution is better than one perfect question and two empty folders.