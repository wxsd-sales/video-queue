import { WebexReq } from './webex-req';
import type { Json } from '../../types';

export class WebexReqPeopleResource extends WebexReq {
  /**
   * Creates a Webex Request wrapper instance for the `people` HTTP API endpoint.
   *
   * @param accessToken
   */
  constructor(accessToken: string) {
    super('people', accessToken);
  }

  /**
   * Get details for a person, by their Webex HTTP API identifier.
   *
   * @param personId
   * @param query
   *
   * @return {Promise<Json | string>}
   */
  getPersonDetails(personId: string, query?: { callingData: boolean }) {
    return super.get(personId, query);
  }

  /**
   * Get the profile for the person associated with the access token.
   *
   * @param query
   *
   * @return {Promise<Json | string>}
   */
  getMyOwnDetails(query?: { callingData: boolean }) {
    return super.get('me', query);
  }

  /**
   * List people in the organization associated with the access token.
   *
   * @param query
   *
   * @return {Promise<Json[] | string>}
   */
  listPeople(query?: {
    email?: string;
    displayName?: string;
    id?: string;
    orgId?: string;
    callingData?: boolean;
    locationId?: string;
    max?: number;
  }) {
    return super.get(undefined, query).then((r: { items: Json[] }) => r.items);
  }
}

/**
 * Instantiates the Webex request wrapper for the `people` HTTP API endpoint.
 *
 * @param accessToken
 *
 * @return {WebexReqPeopleResource}
 */
export const webexReqPeopleResource = (accessToken: string) => new WebexReqPeopleResource(accessToken);