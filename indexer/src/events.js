import { EventEmitter } from "node:events";

export const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100);

/**
 * Build a human-readable description for a decoded contract event.
 *
 * @param {string} type - The event type (e.g. "transfer").
 * @param {Array} args - The decoded event topics.
 * @param {*} data - The decoded event data field.
 * @returns {string} A description of the event.
 */
export function buildDescription(type, args = [], data) {
  switch (type) {
    case "transfer": {
      // SEP-41 `transfer` events encode the amount in the event *data*
      // field, not in the topics (`args`).
      const amount = data;
      return `Transfer of ${amount}`;
    }
    default:
      return `${type} event`;
  }
}
