import Graph from 'graphology'
import { willCreateCycle } from 'graphology-dag'
import { parse } from 'yaml'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

export const TaskState = {
  Pending: 'pending',
  Scheduled: 'scheduled',
  Completed: 'completed',
  InProgress: 'in-progress',
  Failed: 'failed'
}

export default class Process {
  constructor(graph) {
    this.id = uuid()
    this.version = null

    /** @type {Graph} */
    this.graph = graph
  }

  get progress() {
    const percentage = this.graph.reduceNodes((total, node, attributes) => {
      if (attributes.state === TaskState.Completed) {
        total += (1 / this.graph.order)
      }

      return total
    }, 0)

    return Math.floor(percentage * 100)
  }

  static start(definitionSource) {
    let definition 
    
    try {
      definition = parse(definitionSource)
    } catch (error) {
      throw new Error(`Could not load process definition.`)
    }

    // Guard that task names are unique.
    const uniqueTasks = [...new Set(definition.tasks.map(task => task.name))].length
    if (uniqueTasks !== definition.tasks.length) {
      throw new Error(`Task names must be unique.`)
    }

    // Create a directed, acyclic graph that does not allow self loops.
    const graph = new Graph({ allowSelfLoops: false, type: 'directed' })

    // Add nodes to graph...
    definition.tasks.forEach(task => {
      graph.addNode(task.name, { state: TaskState.Pending })
    })

    // Add directed edges to graph based on step dependencies
    definition.tasks.forEach((task, index) => {
      if (task.needs && task.needs.length > 0) {
        // Dependencies are explicitly declared in process definition
        task.needs.forEach(name => {
          if (graph.hasNode(name) === false) {
            throw new Error(`"${task.name}" references non-existent "${name}" task.`)
          }

          if (willCreateCycle(graph, name, task.name)) {
            throw new Error(`Loops in the process definition are not allowed.`)
          }

          graph.addDirectedEdgeWithKey(`${name}->${task.name}`, name, task.name)
        })
      } else if (index > 0) {
        // Dependencies are implied via task ordering in process definition.
        const previousTask = definition.tasks[index - 1]

        graph.addDirectedEdgeWithKey(`${previousTask.name}->${task.name}`, previousTask.name, task.name)
      }
    })

    return new Process(graph)
  }

  getActiveTasks() {
    return this.graph.reduceNodes((nodes, name, attributes) => {
      if (this.graph.inboundNeighbors(name).length === 0 && attributes.state !== TaskState.Completed) {
        // The node has no dependencies and is not complete.
        nodes.push({ 
          pid: this.id, 
          name, 
          attributes 
        })
      } else if (this.graph.everyInNeighbor(name, (name, attributes) => attributes.state === TaskState.Completed) && attributes.state !== TaskState.Completed) {
        // All dependencies of the node are complete and the node is not complete.
        nodes.push({ 
          pid: this.id, 
          name, 
          attributes 
        })
      }

      return nodes
    }, [])
  }

  complete(task) {
    this.graph.mergeNodeAttributes(task, { state: TaskState.Completed })
  }

  fail(task) {
    this.graph.mergeNodeAttributes(task, { state: TaskState.Failed })
  }

  isComplete() {
    return this.getActiveTasks().length === 0
  }

  export() {
    return {
      id: this.id,
      version: this.version,
      graph: this.graph.export()
    }
  }

  static import(data) {
    const graph = new Graph(data.graph.options)
    graph.import(data.graph)

    const process = new Process(graph)
    process.id = data.id
    process.version = data.version

    return process
  }
}