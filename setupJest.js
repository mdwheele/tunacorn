import { isDeepStrictEqual } from 'util'

expect.extend({
  toHaveActiveTasks(received, expectedTaskNames) {
    const receivedTaskNames = received.map(task => task.name)

    return isDeepStrictEqual(receivedTaskNames, expectedTaskNames) 
      ? {
        pass: true,
        message: () => `Expected [${receivedTaskNames}] not to match [${expectedTaskNames}].`
      }
      : {
        pass: false,
        message: () => `Expected [${receivedTaskNames}] to match [${expectedTaskNames}].`
      }
  }
})