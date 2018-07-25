module.exports = (SocketsUtils) => {
  const User = require('../models/user')
  const List = require('../models/list')
  const UsersController = require('./users')

  const ListsController = {}

  ListsController.createList = (req, res) => {
    console.log('Creating list')
    if (!req.body.userId) {
      console.log('Creating list with new user')
      createUserAndList(req, res)
      return
    }
    console.log('Creating list with existing user')
    User.findById(req.body.userId, (err, user) => {
      if (err) {
        console.log('Error while fetching existing user')
        createUserAndList(req, res)
      } else {
        console.log('User found')
        console.log(user)
        createList(req, res, user)
      }
    })
  }

  ListsController.joinList = (req, res) => {
    if (!req.body.userId) {
      createUserAndJoinList(req, res)
      return
    }
    User.findById(req.body.userId, (err, user) => {
      if (err) {
        createUserAndJoinList(req, res)
      } else {
        addAttendeeToList(req.params.id, user, res)
      }
    })
  }

  ListsController.getList = async (req, res) => {
    List.findById(req.params.id, (err, list) => {
      if (err) res.status(404).send(err)
      else {
        const data = {}
        User.findById(list.owner, (err, owner) => {
          if (err) res.status(404).send(err)
          else {
            buildAttendeesList(list).then((attendees) => {
              data.id = list._id
              data.title = list.title
              data.owner = UsersController.userBuilder(owner)
              data.attendees = attendees
              res.json(data)
            })
          }
        })
      }
    })
  }

  ListsController.getListsId = () => {
    return new Promise(resolve => {
      List.find({}, (err, lists) => {
        if (err) {
          console.log('ERROR WHILE FETCHING LISTS: ' + err)
          resolve([])
        }
        resolve(lists.map(l => l._id))
      })
    })
  }

  function createUserAndList (req, res) {
    const owner = new User()
    owner.name = req.body.displayName
    owner.email = req.body.userEmail
    console.log('Creating user')
    console.log(owner)
    owner.save((err, user) => {
      if (err) res.status(500).send(err)
      else {
        console.log('Success')
        createList(req, res, user)
      }
    })
  }

  function createList (req, res, owner) {
    const list = new List()
    list.title = req.body.listName
    list.owner = owner
    list.attendees = []
    list.attendees.push(owner)
    console.log('Creating list')
    console.log(list)
    list.save((err) => {
      if (err) res.status(500).send(err)
      else {
        console.log('success')
        res.status(201).send({
          id: list._id,
          owner: {
            id: owner._id,
            name: owner.name,
            email: owner.email
          }
        })
      }
    })
  }

  const buildAttendeesList = async (list) => {
    return new Promise(resolve => {
      const attendeesPromise = []
      for (let i = 0; i < list.attendees.length; ++i) {
        attendeesPromise.push(UsersController.fetchAndBuildUser(list.attendees[i]))
      }
      Promise.all(attendeesPromise).then((attendees) => {
        resolve(attendees)
      })
    })
  }

  function createUserAndJoinList (req, res) {
    const attendee = new User()
    attendee.name = req.body.displayName
    attendee.email = req.body.userEmail
    attendee.save((err, user) => {
      if (err) res.status(500).send(err)
      else {
        addAttendeeToList(req.params.id, user, res)
      }
    })
  }

  function addAttendeeToList (listId, user, res) {
    List.findById(listId, (err, list) => {
      if (err) res.status(404).send(err)
      else if (list.attendees.some((att) => att.id === user.id)) {
        res.status(400).send('User already attend this list')
      } else {
        list.attendees.push(user)
        list.save((err, list) => {
          if (err) res.status(500).send(err)
          else {
            const userJson = UsersController.userBuilder(user)
            res.json({
              listId: list._id,
              attendee: userJson
            })
            SocketsUtils.joinList(listId, userJson)
          }
        })
      }
    })
  }
  return ListsController
}
