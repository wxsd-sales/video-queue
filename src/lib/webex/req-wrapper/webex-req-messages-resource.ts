import { WebexReq } from './webex-req';
import type { Json } from '../../types';

export class WebexReqMessagesResource extends WebexReq {
  /**
   * Creates a Webex Request wrapper instance for the `messages` HTTP API endpoint.
   *
   * @param accessToken
   */
  constructor(accessToken: string) {
    super('messages', accessToken);
  }

  /**
   * Lists all messages in a 1:1 (direct) room.
   *
   * @param query
   *
   * @return {Promise<Json[]> | string}
   */
  listDirectMessages(query: { parentId?: string; personId: string } | { parentId?: string; personEmail: string }) {
    return super.get('direct', query).then((r: { items: Json[] }) => r.items);
  }

  /**
   * Lists all messages in a room.
   *
   * @param query
   *
   * @return {Promise<Json[]> | string}
   */
  listMessages(query: {
    roomId: string;
    parentId?: string;
    mentionedPeople?: string[];
    before?: string;
    beforeMessage?: string;
    max?: number;
  }) {
    return super.get(undefined, query).then((r: { items: Json[] }) => r.items);
  }
}

/**
 * Instantiates the Webex request wrapper for the `messages` HTTP API endpoint.
 *
 * @param accessToken
 *
 * @return {WebexReqMessagesResource}
 */
export const webexReqMessagesResource = (accessToken: string) => new WebexReqMessagesResource(accessToken);