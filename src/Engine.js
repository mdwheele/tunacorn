import Process from './Process.js'
import ProcessList from './ProcessList.js'
import WorkBoard from './WorkBoard.js'

export default class Engine {
  constructor(processList, workBoard) {
    /** @type ProcessList */
    this.processes = processList || new ProcessList()

    /** @type WorkBoard */
    this.board = workBoard || new WorkBoard()
  }

  startProcess(definition) {
    const process = Process.start(definition)
    const activeTasks = process.getActiveTasks()

    // Schedule tasks...
    activeTasks.forEach(task => this.board.schedule(task))

    // Persist process...
    this.processes.persist(process)

    return process.id
  }

  fetchTasks() {
    return this.board.fetch()
  }

  claimTask(id, worker) {
    this.board.claim(id, worker)
  }

  completeTask(id, worker, output) {
    const task = this.board.fetch().find(task => task.id == id)
    const process = this.processes.get(task.pid)

    process.complete(task.name)

    this.board.complete(id, worker)

    process.getActiveTasks().forEach(task => this.board.schedule(task))

    this.processes.persist(process)
  }

  getProgress(pid) {
    const process = this.processes.get(pid)

    return process.progress
  }
}