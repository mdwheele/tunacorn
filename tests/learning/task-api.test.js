import Graph from 'graphology'

test('learning test for low-level task apis', () => {
  const graph = new Graph({
    allowSelfLoops: false,
    type: 'directed'
  })

  graph.addNode('A', { complete: false })
  graph.addNode('B', { complete: false })
  graph.addNode('C', { complete: false })
  graph.addNode('D', { complete: false })

  graph.addDirectedEdge('A', 'B')
  graph.addDirectedEdge('A', 'C')
  graph.addDirectedEdge('B', 'D')
  graph.addDirectedEdge('C', 'D')

  expect(graph.order).toBe(4)
  expect(graph.size).toBe(4)
  
  // Passes when D's dependents (B and C) are complete.
  expect(graph.everyInNeighbor('D', (id, state) => state.complete === true)).toBe(false)

  // First Node does not have any inbound neighbors.
  expect(graph.inboundNeighbors('A')).toHaveLength(0)

  /**
   * @param {Graph} graph 
   */
  function getActiveTasks(graph) {
    return graph.reduceNodes((nodes, id, state) => {
      if (graph.inboundNeighbors(id).length === 0 && state.complete !== true) {
        // The node has no dependencies and is not complete.
        nodes.push({ id, state })
      } else if (graph.everyInNeighbor(id, (id, state) => state.complete) && state.complete !== true) {
        // All dependencies of the node are complete and the node is not complete.
        nodes.push({ id, state })
      }

      return nodes
    }, [])
  }

  function complete(id) {
    graph.setNodeAttribute(id, 'complete', true)
  }

  expect(getActiveTasks(graph)).toHaveLength(1)

  complete('A')
  expect(getActiveTasks(graph)).toHaveLength(2)

  complete('B')
  expect(getActiveTasks(graph)).toHaveLength(1)

  complete('C')
  expect(getActiveTasks(graph)).toHaveLength(1)

  complete('D')
  expect(getActiveTasks(graph)).toHaveLength(0)

  const serialized = graph.export()

  expect(serialized.nodes).toHaveLength(4)
  expect(serialized.edges).toHaveLength(4)
  expect(serialized.nodes.every(node => node.attributes.complete)).toBe(true)
})