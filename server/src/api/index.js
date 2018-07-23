const express = require('express')
const ListsController = require('../controllers/lists')

const router = new express.Router()

router.post('/api/lists', ListsController.createList)
router.get('/api/lists/:id', ListsController.getList)
router.post('/api/lists/:id/join', ListsController.joinList)

module.exports = router
