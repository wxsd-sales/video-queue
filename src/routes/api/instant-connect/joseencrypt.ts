import 'reflect-metadata';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import type { JSONObject, JSONValue, ToJSON } from '@sveltejs/kit/types/private';
import { Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { jsonRequest } from '$lib/shared/json-request';
import { classTransformOptions, classValidationOptions, onFailure } from '../../.utils';
import env from '$lib/environment';

/** @typedef {import('class-validator').ValidationError} ValidationError */

/**
 * @param {RequestEvent} requestEvent
 *
 * @returns {Promise<
 *   | { body: { query: ValidationError[] }; status: 400 }
 *   | { body: ResponseDTO; status: 200; headers: { 'Cache-Control': 'public, max-age=600'; 'Expires': string } }
 *   | { body: any; status: number }
 *   | { status: 500 }
 * >}
 */
export const POST: RequestHandler = async (requestEvent: RequestEvent) => {
  class RequestQueryDTO {
    @Expose()
    public readonly sub!: string;
  }
  class ResponseDTO implements ToJSON {
    @Expose()
    public readonly guest!: Array<string>;

    @Expose()
    public readonly host!: Array<string>;

    toJSON(): Exclude<JSONValue, ToJSON> {
      return instanceToPlain(this);
    }
  }

  // validate request query
  const searchParams = Object.fromEntries(requestEvent.url.searchParams);
  const query = plainToInstance(RequestQueryDTO, searchParams, classTransformOptions);
  const queryValidationErrors = validateSync(query, classValidationOptions);
  if (queryValidationErrors.length > 0) {
    return { status: 400, body: { query: queryValidationErrors } };
  }

  return jsonRequest(env.INSTANT_CONNECT_REST_URL, undefined, 'Bearer', env.INSTANT_CONNECT_USER_TOKEN)
    .post('joseencrypt', undefined, { verticalType: 'gen', aud: env.INSTANT_CONNECT_AUD, jwt: { sub: query.sub } })
    .then((r: Response) => r.json())
    .then((r: JSONObject) => ({
      status: 200,
      body: plainToInstance(ResponseDTO, r, classTransformOptions)
    }))
    .catch((e) => onFailure(e));
};
