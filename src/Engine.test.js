import Engine from './Engine.js'
import ProcessList from './ProcessList.js'
import WorkBoard from './WorkBoard.js'
import { getDefinitionSource } from '../tests/factories.js'

describe('Engine', () => {
  const processes = new ProcessList()
  const board = new WorkBoard()
  const engine = new Engine(processes, board)
  let pid

  test('Can start a new process and active Tasks are scheduled to the WorkBoard', () => {
    const definition = getDefinitionSource('sync')

    expect(board.size).toBe(0)

    pid = engine.startProcess(definition)

    expect(board.size).toBe(1)
    expect(processes.size).toBe(1)

    const [scheduledTask] = board.fetch()
    const [process] = processes.all()

    expect(scheduledTask.name).toEqual('A')
    expect(process.id).toEqual(scheduledTask.pid)
  })

  test('Completing Tasks schedules new Tasks onto the WorkBoard', () => {
    const [task] = engine.fetchTasks()

    expect(task.name).toEqual('A')

    engine.claimTask(task.id, 'worker')

    engine.completeTask(task.id, 'worker')

    const [nextTask] = engine.fetchTasks()

    expect(nextTask.name).toEqual('B')
  })

  test('Can report status of a running Process.', () => {
    expect(engine.getProgress(pid)).toEqual(33)
  })
})