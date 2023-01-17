import path from 'path'

import Process from './Process.js'
import ProcessList from './ProcessList.js'

import { makeProcess } from '../tests/factories.js'

describe('ProcessList', () => {
  const list = new ProcessList()
  const process = makeProcess('sync')

  test('Processes can be persisted', () => {
    list.persist(process)

    expect(list.size).toBe(1)
  })

  test('Can retrieve a specific Process', () => {
    const fetched = list.get(process.id)

    expect(fetched.id).toEqual(process.id)
  })

  test('Optimistically locks persistence to prevent conflicting Process state', () => {
    // Imagine two workers grabbed the same Process and were acting on it.
    const p1 = list.get(process.id)
    const p2 = list.get(process.id)

    p1.complete('A')

    list.persist(p1) // Should persist as expected.

    // Should fail because it's "stale" and persisting the 
    // process may lead to loss of data.
    expect(() => list.persist(p2)).toThrow()

    // However, if we re-fetched, then we can proceed as usual.
    const p3 = list.get(process.id)
    
    p3.complete('B')

    expect(() => list.persist(p3)).not.toThrow()
  })

  test('Can retrieve list of all Processes', () => {
    const processes = list.all()

    expect(processes).toHaveLength(1)
    expect(processes[0].id).toEqual(process.id)

    list.persist(makeProcess('sync'))

    expect(list.all()).toHaveLength(2)
  })
})