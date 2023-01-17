import Graph from 'graphology'
import { hasCycle, willCreateCycle } from 'graphology-dag'

test('verify cycle detection works as expected', () => {
  const graph = new Graph({
    allowSelfLoops: false,
    type: 'directed'
  })

  graph.addNode('A')
  graph.addNode('B')
  graph.addNode('C')

  graph.addDirectedEdge('A', 'B')
  graph.addDirectedEdge('B', 'C')
  graph.addDirectedEdge('C', 'A')

  // Able to detect cycles after-the-fact...
  expect(hasCycle(graph)).toBe(true)

  graph.dropDirectedEdge('C', 'A')

  expect(hasCycle(graph)).toBe(false)

  // Also able to detect cycles before they occur...
  expect(willCreateCycle(graph, 'C', 'A')).toBe(true)
})