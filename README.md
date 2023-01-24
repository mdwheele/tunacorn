# TunaCorn

A flexible task orchestration engine.

> Disclaimer: This project is a work-in-progress and is provided as-is with no warranty whatsoever. We welcome contributions
>             and ideas, but would not consider this feature-complete for use in a production environment.

## Guiding Principles 

- This package is agnostic of any particular application. It provides a high-level means for orchestrating tasks in general.
  There's nothing domain-specific baked into the package. You should be able to model any process regardless of domain.

- As much as possible, we constrain Process Definitions to reduce potential live-lock (or similar) runtime issues so that we 
  can keep our execution model simple.

- The process definition language must be easily maintainable by humans.

- Provide low-level APIs for process management, orchestration, task scheduling, etc., but also provide Express middleware that 
  provide immediately useful API endpoints for workflow management. This allows folks to implement their own applications around
  this package as a low-level library, but also allows for others access to a first-party fully-baked task orchestration engine.

## Process Definitions

A Process Definition specifies the flow of a particular business process by listing a collection of unique `Tasks` 
that can depend on one another. 

Each `Task` must have a unique `name` and optionally can provide an array of `Tasks` that must complete before 
the `Task` can be worked on. This allows us to build more complex fork and join flows for parallelization of work.

The Definition language does not allow for loops (or cycles) in the Process. In other words, you cannot have a 
two tasks that depend on one another directly (e.g. `A -> B -> A`), nor can you have larger loops of `Task` dependencies 
(e.g. `A -> B -> C -> A`). This constraint eliminates the possibility that a `Process` may continue forever.

```yaml
tasks: 
  - name: Open Loan Application

  - name: Review Credit
    needs: [Open Loan Application]

  - name: Review Assets
    needs: [Open Loan Application]

  - name: Review Application Details
    needs: [Open Load Application]
  
  - name: Send Email
    needs: 
      - Review Credit
      - Check House
      - Review Assets
```

> Note: The Definition language is currently very "bare bones" and focused primarily on ordering tasks.
>       In the future, we could include things like `retryLimits` and stuff like that.

## Processes

A `Process` is a unique invocation of a `ProcessDefinition`. Multiple Processes can be started from the same 
Definition and will run independent of one another and carry their own runtime state.

Once a `Process` is started, it will always have at least one active `Task` that can be acted upon. Some processes
may even have more than one active `Task` immediately after the `Process` starts. Clients can query the list of 
active `Task` and "complete" or "fail" them by interacting with the `Process` API.

Once a `Task` is completed, all other `Task` which are solely dependent on the completed `Task` become "active", 
meaning there is opportunity for work to be done. If a `Task` has more than one dependency, then all dependencies 
must be completed before that `Task` becomes "active".

Once all `Tasks` are completed (or the number of active `Task` reaches `0`), the `Process` is considered "complete".

```js
const process = Process.start(pathToDefinition)

// Each process gets a universally unique identifier.
process.id // 7279f550-a051-4716-a529-f76bd5b5df6a

// Returns list of tasks ready for work.
process.getActiveTasks() 

// Can complete tasks and provide data for task completion.
process.complete('Open Loan Application', { amount: 1_000_000 })

// There are other tasks to complete after "Open Loan Application"
process.isComplete() // false 

process.getActiveTasks() // Returns all tasks that were waiting on 
                   // "Open Loan Application" to complete.

// We're able to fail individual tasks with relevant data.
process.fail('Review Credit', { message: 'Credit score was too low!' })

process.isFailed() // true
```

## Task Lifecycle

When a Process is started, all Tasks are marked as `Pending`. From there, Tasks can then be `Completed` or `Failed`. 

> Note: Tasks will eventually be scheduled instead of immediately completed or failed from pending status.

**When does a Task become "available for work"?**

Only "active" `Tasks` are "available for work". A Task is "active"" when ALL of it's dependencies have been successfully 
`Completed`. Until then, these Tasks sit in a `Pending` state. Under the hood, when querying our Directed Acyclic 
Graph (DAG) for Tasks available for work, we filter all Nodes (Tasks) whose inbound neighbor Nodes are all in 
a `Completed` state.

## Working with Tasks

Workers will retrieve active Tasks from the Process and depending on the Task, will perform an operation and then
mark the task complete or failed.

> Note: In reality, workers will not likely interact directly with an instance of `Process`. Instead, they would 
>       ask for work over an appropriate RESTful API endpoint that would then fetch the appropriate Task and Process
>       to fulfill a `Complete` or `Fail` operation.

```js
const process = Process.start(pathToDefinition)

// Get the first task in the Tasks available for work.
const tasks = process.getActiveTasks() 

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]

  try {
    // This worker can do any of the following tasks...
    switch(task.name) {
      case "Create S3 Bucket": {
        const bucket = await s3.createBucket()
        
        process.complete(task.name, { bucketName: bucket.name })
        break
      }
      
      case "Upload File": {
        const file = await s3.uploadFile(task.attributes.bucketName, task.attributes.file)

        process.complete(task.name, { url: file.url })
        break
      }
    
      case "Destroy S3 Bucket": {
        await d3.destroyBucket(task.attributes.bucketName)
        break
      }
    }
  } catch (error) {
    process.fail(task.name, { message: error.message })
  }
}
```

## Architecture

At the boundary of the architecture is the `Engine` class. The Engine is responsible for orchestrating
all internal API calls and whose likely immediate client would be an Express request handler. The 
Engine provides APIs for:

- Process Management
- Process Definition Management
- Task Operations
- Logging

The Engine collaborates with the `ProcessList` and `TaskList` objects given to it during construction.

**What is the `ProcessList`?**

The `ProcessList` is responsible for persistence of Process instances to a storage backend. The Process List
provides an interface to `fetch`, `persist`, and `destroy` processes. Process Lists must implement a mechanism
for Optimistic Locking to prevent conflicts arising from concurrent manipulation of processes.

**What is the `TaskList`?**

Rather than operate directly with a `Process` when performing `Task` operations, Workers will instead 
interact with a "Work Board" representing `Tasks` that have most recently been scheduled after 
becoming active. The `TaskList` provides assurances that two workers cannot acquire the same `Task` (to prevent
duplication of work and conflicts).

The `TaskList` provides an interface to `fetch`, `claim`, `complete`, or `fail` Tasks.

**Process Lifecycle**

When a `Process` is started, the `Engine` immediately queries it for active `Tasks`. If there are any, they 
are scheduled onto the `TaskList` and the `Tasks` are marked as `Scheduled`.

Workers can query the `Engine` for `Tasks` (optionally matching specific criteria) from the `TaskList`. Workers
can `claim` individual `Tasks`, which prevent other Workers from claiming the same `Task`. Once a `Task` is claimed,
the Worker will see the full details of the `Task` including prior `Process` state and outputs from prior `Task`. 
This information may or may not be used in the fulfillment of the claimed `Task`.

Workers can mark `Tasks` as `complete` or `failed` through the `Engine`. In either case, additional data may be 
provided as input to the task. In the case of errors, a Worker might include any relevant error message or data.
In the case of success, a Worker might include any relevant output from the operation.

When a `Task` is completed, the `Engine` immediately queries active `Tasks` of the given process and schedules them
onto the `TaskList`. This proceeds until the entire `Process` is complete. 

When a `Task` is failed, the `Engine` cancels all `Tasks` currently on the `TaskList` for the given `Process` and
subsequently cancels the `Process` itself. 

> Note: Eventually, a failed `Task` may be retried for a configured amount of time and there may even be room for 
>       specification of a "failureProcess" which would point at a "cleanup" Process Definition to effectively 
>       "reverse" work that had been done.

This loop of acting on `Tasks` repeats until the `Process` reaches a terminal state. All along this process,
the client which started the `Process` can query progress of the `Process` by it's Process ID (PID). 