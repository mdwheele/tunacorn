import path from 'path'
import { makeProcess } from '../tests/factories.js'

import TaskList from "./TaskList.js"
import { TaskState, default as Process } from "./Process.js"

describe('TaskList', () => {
  const taskList = new TaskList()
  const process = makeProcess('sync')
  const [task] = process.getActiveTasks()

  test('A Task can be scheduled and unscheduled onto the TaskList', () => {
    const tid = taskList.schedule(task)

    expect(taskList.size).toBe(1)

    taskList.unschedule(tid)

    expect(taskList.size).toBe(0)

    taskList.schedule(task)
  })

  test('Scheduling a Task is idempotent', () => {
    expect(taskList.size).toBe(1)

    taskList.schedule(task)

    expect(taskList.size).toBe(1)
  })

  test('Scheduled Tasks can be retrieved from the TaskList', () => {
    const [task] = taskList.fetch()

    expect(task.pid).toEqual(process.id)
    expect(task.name).toEqual(task.name)
  })
  
  test('Tasks can be claimed by a Worker', () => {
    const [job] = taskList.fetch()

    taskList.claim(job.id, 'svc.worker')

    const [claimed] = taskList.fetch()

    expect(claimed.assignee).toBe('svc.worker')
  })

  test('A claimed Task can be released back to the TaskList', () => {
    const [claimed] = taskList.fetch()

    taskList.release(claimed.id)

    const [unclaimed] = taskList.fetch()

    expect(unclaimed.assignee).toBe(null)
  })

  test('A Task cannot be claimed by multiple workers.', () => {
    const [task] = taskList.fetch()

    taskList.claim(task.id, 'svc.worker.1')

    expect(() => taskList.claim(task.id, 'svc.worker.2')).toThrow()

    taskList.release(task.id)
  })
  
  test('Tasks can be completed', () => {
    const [task] = taskList.fetch()

    taskList.claim(task.id, 'worker')

    expect(() => taskList.complete(task.id, 'other.worker')).toThrow()

    taskList.complete(task.id, 'worker')

    expect(taskList.size).toBe(0)
  })
  
  test('Tasks can be failed', () => {
    taskList.schedule(makeProcess('sync').getActiveTasks()[0])

    const [task] = taskList.fetch()

    taskList.claim(task.id, 'worker')
    
    expect(() => taskList.complete(task.id, 'other.worker')).toThrow()

    taskList.fail(task.id, 'worker')

    expect(taskList.size).toBe(0)
  })
})