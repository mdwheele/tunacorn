import { v4 as uuid } from 'uuid'
import { TaskState } from './Process.js'

export default class TaskList {
  constructor() {
    this.board = new Map()
  }

  get size() {
    return this.fetch().length
  }

  schedule(task) {
    if (Array.from(this.board.values()).find(t => t.pid === task.pid && t.name === task.name)) {
      return
    }

    const id = uuid()

    this.board.set(id, {
      id,
      name: task.name,
      pid: task.pid,
      state: TaskState.Scheduled,
      assignedTo: null
    })
    
    return id
  }

  fetch() {
    return Array.from(this.board.values())
      .filter(task => [TaskState.Scheduled, TaskState.InProgress].includes(task.state))
  }

  claim(id, worker) {
    if (this.board.has(id) === false) {
      throw new Error(`Task does not exist.`)
    }

    const task = this.board.get(id)

    if (task.state !== TaskState.Scheduled && task.assignedTo !== worker) {
      throw new Error(`Task is already claimed.`)
    }

    task.state = TaskState.InProgress
    task.assignedTo = worker

    this.board.set(task.id, task)
  }

  release(id) {
    if (this.board.has(id) === false) {
      return
    }

    const task = this.board.get(id)

    task.state = TaskState.Scheduled
    task.assignedTo = null

    this.board.set(task.id, task)
  }

  complete(id, worker) {
    const task = this.board.get(id)

    if (task.assignedTo !== worker) {
      throw new Error(`Task not assigned to ${worker}.`)
    }

    task.state = TaskState.Completed

    this.board.set(id, task)
  }

  fail(id, worker) {
    const task = this.board.get(id)

    if (task.assignedTo !== worker) {
      throw new Error(`Task not assigned to ${worker}.`)
    }

    task.state = TaskState.Failed

    this.board.set(id, task)
  }
}