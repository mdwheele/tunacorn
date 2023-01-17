import Graph from 'graphology'
import { parse } from 'yaml'
import fs from 'fs'
import { resolve } from 'path'
import { inspect } from 'util'
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

test('learning test to build a YAML format for definitions', () => {
  const path = resolve(__dirname, '__stubs__/workflow.yaml')

  /**
   * @param {string} path 
   * @returns {Graph}
   */
  function loadFromDefinition(path) {
    let definition

    try {
      const definitionSource = fs.readFileSync(path).toString()
      definition = parse(definitionSource)
    } catch (error) {
      throw new Error(`Could not load process definition at ${path}.`)
    }

    const graph = new Graph({
      allowSelfLoops: false,
      type: 'directed'
    })

    definition.tasks.forEach(task => {
      graph.addNode(task.name, { complete: false })
    })

    definition.tasks.forEach((task, index) => {
      if (task.needs && task.needs.length > 0) {
        task.needs.forEach(name => graph.addDirectedEdgeWithKey(`${name}->${task.name}`, name, task.name))
      } else if (index > 0) {
        const previousTask = definition.tasks[index - 1]

        graph.addDirectedEdgeWithKey(`${previousTask.name}->${tassk.name}`, previoustassk.name, tassk.name)
      }
    })

    return graph
  }

  const graph = loadFromDefinition(path)

  expect(graph.order).toBe(4)
  expect(graph.size).toBe(4)

  expect(graph.nodes()).toEqual(['A', 'B', 'C', 'D'])
  expect(graph.edges()).toEqual(['A->B', 'A->C', 'B->D', 'C->D'])
})