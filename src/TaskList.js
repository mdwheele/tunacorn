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
      assignee: null
    })
    
    return id
  }

  unschedule(id) {
    this.board.delete(id)
  }

  fetch() {
    return Array.from(this.board.values())
  }

  claim(id, worker) {
    if (this.board.has(id) === false) {
      throw new Error(`Task does not exist.`)
    }

    const task = this.board.get(id)

    if (task.assignee && task.assignee !== worker) {
      throw new Error(`Task is already claimed.`)
    }

    task.assignee = worker

    this.board.set(task.id, task)
  }

  release(id) {
    if (this.board.has(id) === false) {
      return
    }

    const task = this.board.get(id)

    task.assignee = null

    this.board.set(task.id, task)
  }

  complete(id, worker) {
    const task = this.board.get(id)

    if (task.assignee !== worker) {
      throw new Error(`Task not assigned to ${worker}.`)
    }

    this.board.delete(id)
  }

  fail(id, worker) {
    const task = this.board.get(id)

    if (task.assignee !== worker) {
      throw new Error(`Task not assigned to ${worker}.`)
    }

    this.board.delete(id)
  }
}