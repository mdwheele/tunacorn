import Process from './Process.js'

export default class ProcessList {
  constructor() {
    this.map = new Map()
  }

  get size() {
    return this.map.size
  }
  
  get(id) {
    if (this.map.has(id) === false) {
      throw new Error('Process not found.')
    }

    const deserialized = JSON.parse(this.map.get(id))

    return Process.import(deserialized)
  }

  all() {
    return Array.from(this.map, ([id, data]) => {
      const deserialized = JSON.parse(data)
      
      return Process.import(deserialized)
    })
  }
  
  persist(process) {
    if (this.map.has(process.id)) { 
      const current = this.get(process.id)
      
      if (current && current.version !== process.version) {
        throw new Error('Process has changed since last fetched. Try again.')
      }
    }

    process.version = (new Date).getTime()

    const serialized = JSON.stringify(process.export())

    this.map.set(process.id, serialized)
  }
}