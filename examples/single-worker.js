import Engine from '../src/Engine.js'
import ProcessList from '../src/ProcessList.js'
import TaskList from '../src/TaskList.js'
import { getDefinitionSource } from '../tests/factories.js'
import { v4 as uuid } from 'uuid'
import chalk from 'chalk'

const engine = new Engine(new ProcessList, new TaskList)

engine.startProcess(getDefinitionSource('loan-application'))

function createWorker(id, tickRate, log) {
  log(`Worker[${id}]: Starting...`)

  function execute() {
    const tasks = engine.fetchTasks()

    if (tasks.length > 0) {
      log(`Worker[${id}]: Discovered ${tasks.length} tasks: [${tasks.map(task => task.name)}].`)
    } else {
      log(`Worker[${id}]: There are no tasks I can do.`)
      return
    }

    const [task] = tasks
  
    engine.claimTask(task.id, id)

    log(`Worker[${id}]: Claimed "${task.name}" (${task.id}).`)

    switch(task.name) {
      case "Open Loan Application": {
        engine.completeTask(task.id, id)
        break
      }

      case "Review Credit": {
        engine.completeTask(task.id, id)
        break
      }

      case "Review Assets": {
        engine.completeTask(task.id, id)
        break
      }

      case "Review Application Details": {
        engine.completeTask(task.id, id)
        break
      }

      case "Send Email": {
        engine.completeTask(task.id, id)
        break
      }
    }

    log(`Worker[${id}]: Completed "${task.name}" (${task.id}).`)

    setTimeout(execute, tickRate)
  }

  execute()
}

createWorker(uuid(), 3000, message => console.log(chalk.blueBright(message)))
createWorker(uuid(), 1600, message => console.log(chalk.yellow(message)))

