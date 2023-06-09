export class WebexSdkMessagesPlugin {
  /**
   * Starts listening for message events by establishing a websocket connection.
   *
   * @param {Webex} webex
   * @param {function(event): boolean} filter
   * @param {function(event): void} onCreate
   * @param {function(event): void} onDelete
   */
  startListening(webex, filter, onCreate, onDelete) {
    webex.messages.listen().then(() => {
      webex.messages.on('created', (event) => onCreate(event));
      webex.messages.on('deleted', (event) => onDelete(event));
    });
  }

  /**
   * Stops listening for message events on an established websocket connection.
   *
   * @param {Webex} webex
   */
  stopListening(webex) {
    webex.messages.stopListening();
    webex.messages.off('created');
    webex.messages.off('deleted');
  }
}

/**
 * Instantiates the Webex SDK Messages Plugin wrapper.
 *
 * @returns {WebexSdkMessagesPlugin}
 */
export const webexSdkMessagesPlugin = () => new WebexSdkMessagesPlugin();
