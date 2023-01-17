import path from 'path'
import { makeProcess } from '../tests/factories.js'

import WorkBoard from "./WorkBoard.js"
import { TaskState, default as Process } from "./Process.js"

describe('WorkBoard', () => {
  const board = new WorkBoard()
  const process = makeProcess('sync')
  const [task] = process.getActiveTasks()

  test('A Task can be scheduled onto the WorkBoard', () => {
    board.schedule(task)

    expect(board.size).toBe(1)
  })

  test('Scheduling a Task is idempotent', () => {
    expect(board.size).toBe(1)

    board.schedule(task)

    expect(board.size).toBe(1)
  })

  test('Scheduled Tasks can be retrieved from the WorkBoard', () => {
    const [job] = board.fetch()

    expect(job.pid).toEqual(process.id)
    expect(job.name).toEqual(task.name)
    expect(job.state).toEqual(TaskState.Scheduled)
  })
  
  test('Tasks can be claimed by a Worker', () => {
    const [job] = board.fetch()

    board.claim(job.id, 'svc.worker')

    const [claimed] = board.fetch()

    expect(claimed.assignedTo).toBe('svc.worker')
    expect(claimed.state).toBe(TaskState.InProgress)
  })

  test('A claimed Task can be released back to the WorkBoard', () => {
    const [claimed] = board.fetch()

    board.release(claimed.id)

    const [unclaimed] = board.fetch()

    expect(unclaimed.assignedTo).toBe(null)
    expect(unclaimed.state).toBe(TaskState.Scheduled)
  })

  test('A Task cannot be claimed by multiple workers.', () => {
    const [task] = board.fetch()

    board.claim(task.id, 'svc.worker.1')

    expect(() => board.claim(task.id, 'svc.worker.2')).toThrow()

    board.release(task.id)
  })
  
  test('Tasks can be completed', () => {
    const [task] = board.fetch()

    board.claim(task.id, 'worker')

    expect(() => board.complete(task.id, 'other.worker')).toThrow()

    board.complete(task.id, 'worker')

    expect(board.size).toBe(0)
  })
  
  test('Tasks can be failed', () => {
    board.schedule(makeProcess('sync').getActiveTasks()[0])

    const [task] = board.fetch()

    board.claim(task.id, 'worker')
    
    expect(() => board.complete(task.id, 'other.worker')).toThrow()

    board.fail(task.id, 'worker')

    expect(board.size).toBe(0)
  })
})