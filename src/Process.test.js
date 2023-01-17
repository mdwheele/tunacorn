import path from 'path'
import { validate } from 'uuid'
import { makeProcess } from '../tests/factories.js'

import Process from './Process.js'

describe('Process', () => {
  test('PID is captured on Active Tasks', () => {
    const process = makeProcess('sync')
    const [task] = process.getActiveTasks()

    expect(task.pid).toEqual(process.id)
  })

  test('Can report percent completion', () => {
    const process = makeProcess('sync')

    expect(process.progress).toEqual(0)
    process.complete(process.getActiveTasks()[0].name)

    expect(process.progress).toEqual(33)
    process.complete(process.getActiveTasks()[0].name)
    
    expect(process.progress).toEqual(66)
    process.complete(process.getActiveTasks()[0].name)

    expect(process.progress).toEqual(100)
  })
})

describe('Synchronous Process', () => {
  const process = makeProcess('sync')

  test('completing tasks opens new tasks for work', () => {
    expect(process.getActiveTasks()).toHaveActiveTasks(['A'])

    process.complete('A')
    expect(process.getActiveTasks()).toHaveActiveTasks(['B'])

    process.complete('B')
    expect(process.getActiveTasks()).toHaveActiveTasks(['C'])

    process.complete('C')

    expect(process.isComplete()).toBe(true)
  })
})

describe('Parallel Process', () => {
  const process = makeProcess('parallel')

  test('Process can be started from Definition and returns instance', () => {
    expect(process.constructor.name).toBe('Process')
    expect(validate(process.id)).toBe(true)
  })

  test('Process has active Tasks', () => {
    const tasks = process.getActiveTasks()

    expect(tasks).toHaveLength(1)
  })

  test('Completing Task opens up new Tasks for work', () => {
    expect(process.getActiveTasks()).toHaveActiveTasks(['A'])

    process.complete('A')
    expect(process.getActiveTasks()).toHaveActiveTasks(['B', 'C'])

    process.complete('B')
    expect(process.getActiveTasks()).toHaveActiveTasks(['C'])

    process.complete('C')
    expect(process.getActiveTasks()).toHaveActiveTasks(['D'])

    process.complete('D')
    
    expect(process.isComplete()).toBe(true)
  })
})

describe('Serialization', () => {
  const process = makeProcess('sync')

  test('Can be exported and imported', () => {
    process.complete('A')

    const data = process.export()

    expect(data).toEqual({
      id: process.id,
      version: null,
      graph: {
        attributes: {},
        edges: [
          { key: 'A->B', source: 'A', target: 'B' },
          { key: 'B->C', source: 'B', target: 'C' },
        ],
        nodes: [
          { key: 'A', attributes: { state: 'completed' }},
          { key: 'B', attributes: { state: 'pending' }},
          { key: 'C', attributes: { state: 'pending' }},
        ],
        options: {
          allowSelfLoops: false,
          multi: false,
          type: 'directed'
        }
      },
    })

    const restoredProcess = Process.import(data)

    expect(restoredProcess.getActiveTasks()).toHaveActiveTasks(['B'])

    restoredProcess.complete('B')

    // The restored process does not share any references from
    // the original process. It should still only have "B" available
    // for work.
    expect(process.getActiveTasks()).toHaveActiveTasks(['B'])

    // However, since "B" was completed in the restored process,
    // we expect that "C" is now available for work.
    expect(restoredProcess.getActiveTasks()).toHaveActiveTasks(['C'])
  })
})

describe('Invalid Process Definitions', () => {
  test('Tasks cannot "need" Tasks that are not in the Process Definition', () => {
    expect(() => makeProcess('invalid-task-ref'))
      .toThrow('"Stop" references non-existent "Missing" task.')
  })
})