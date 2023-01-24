import Process from './Process.js'
import ProcessList from './ProcessList.js'
import TaskList from './TaskList.js'

export default class Engine {
  constructor(processList, taskList) {
    /** @type ProcessList */
    this.processes = processList || new ProcessList()

    /** @type TaskList */
    this.taskList = taskList || new TaskList()
  }

  startProcess(definition) {
    const process = Process.start(definition)
    const activeTasks = process.getActiveTasks()

    // Schedule tasks...
    activeTasks.forEach(task => this.taskList.schedule(task))

    // Persist process...
    this.processes.persist(process)

    return process.id
  }

  fetchTasks() {
    return this.taskList.fetch()
  }

  claimTask(id, worker) {
    this.taskList.claim(id, worker)
  }

  completeTask(id, worker, output) {
    const task = this.taskList.fetch().find(task => task.id == id)
    const process = this.processes.get(task.pid)

    process.complete(task.name)

    this.taskList.complete(id, worker)

    process.getActiveTasks().forEach(task => this.taskList.schedule(task))

    this.processes.persist(process)
  }

  getProgress(pid) {
    const process = this.processes.get(pid)

    return process.progress
  }
}