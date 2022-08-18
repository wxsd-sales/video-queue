import type { GetSession, Handle, HandleError } from '@sveltejs/kit';
import { webexHttpMessagesResource } from '$lib/webex/http-wrapper';
import { dev, prerendering } from '$app/env';
import { MikroORM } from '@mikro-orm/core';
import { User, Session } from './database/entities';
import config from '../mikro-orm.config';
import env from '$lib/environment';
import * as cookie from 'cookie';

const loginRoute = '/login';

function createLoginRedirect(uuid?: string, maxAge = 2147483648) {
  const response = new Response(undefined, { status: 302, headers: { Location: loginRoute } });
  if (uuid != null) {
    const session = cookie.serialize('sessionId', uuid, { path: '/', maxAge: maxAge, sameSite: 'strict' });
    response.headers.set('Set-Cookie', session);
  }

  return response;
}

function createSession(userAgent?: string, ipAddress = '127.0.0.1', lastActivityAt = Date.now()) {
  return new Session({
    user: undefined,
    userAgent: userAgent,
    ipAddress: ipAddress,
    lastActivityAt: lastActivityAt
  });
}

export const handle: Handle = async ({ event, resolve }) => {
  const d1 = new Date();
  const ipAddress = prerendering || dev ? 'unknown' : event.clientAddress;
  const userAgent = event.request.headers.get('User-Agent') || undefined;
  const isProtected = event.url.pathname !== '/' && !event.url.pathname.startsWith('/api');

  let response = event.url.pathname === loginRoute ? await resolve(event) : createLoginRedirect();

  if (isProtected) {
    const cookies = cookie.parse(event.request.headers.get('Cookie') ?? '');
    const db = await MikroORM.init({ ...config, ...{ entities: [User, Session] } }).then((r) => r.em.fork());
    const session = cookies.sessionId ? await db.findOne(Session, cookies.sessionId) : null;
    // response requires an active anonymous or user session
    if (session?.uuid == null || session.isExpired === true) {
      // no active session found
      const session = createSession(userAgent, ipAddress, d1.getTime());
      await db.persistAndFlush(session).then(() => (event.locals.session = session));
      response = createLoginRedirect(session.uuid);
    } else if (session.user?.uuid != null && session.lastActivityAt + 60 * 60 * 1000 * 2 < d1.getTime()) {
      // user session has expired due to inactivity
      const session = createSession(userAgent, ipAddress, d1.getTime());
      await db.persistAndFlush(session).then(() => (event.locals.session = session));
      response = createLoginRedirect(session.uuid);
    } else if (session.user?.uuid != null && session.lastActivityAt + 60 * 60 * 1000 * 2 >= d1.getTime()) {
      // user session is valid and is currently active
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      session.lastActivityAt = d1.getTime();
      await db.persistAndFlush(session).then(() => (event.locals.session = session));
      response = await resolve(event);
    }
    if (session?.uuid != null && session.user?.uuid == null) {
      // anonymous session
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      session.lastActivityAt = d1.getTime();
      await db.persistAndFlush(session).then(() => (event.locals.session = session));
    }
  } else {
    response = await resolve(event);
  }

  const fileType = new RegExp(/^.*\.(webm|mp4|jpg|jpeg|png|gif|ico|svg|eot|otf|ttf|woff|woff2)$/i);
  const isStatic = event.url.pathname.match(fileType);
  const skipReporting = !!response.headers.get('Skip-Reporting');
  const message = [
    d1.toISOString(),
    'INFO',
    ipAddress,
    event.request.method,
    event.url.href,
    isStatic ? '' : response.status, // static assets not handled by svelte-kit
    isStatic ? '' : Date.now() - d1.getTime() + ' ms' // static assets not handled by svelte-kit
  ].join(' ');

  if (import.meta.env.PROD && !isStatic && !skipReporting && response.status >= 400) {
    webexHttpMessagesResource(env.WEBEX_NOTIFICATION_CHANNEL_TOKEN)
      .createMessage({
        roomId: env.WEBEX_NOTIFICATION_CHANNEL_ID,
        markdown: ['```text', message, '```'].join('\n')
      })
      .catch()
      .finally();
  }

  console.info('\x1b[34m' + message + '\x1b[0m');

  return response;
};

export const handleError: HandleError = async ({ error, event }) => {
  const date = new Date();
  const message = [
    [
      date.toISOString(),
      'ERROR',
      prerendering || dev ? 'unknown' : event.clientAddress,
      event.request.method,
      event.url.href,
      error.name,
      error.message
    ].join(' '),
    error.stack || '\b',
    error.frame || '\b',
    error.cause || '\b'
  ].join('\n');

  if (import.meta.env.PROD) {
    webexHttpMessagesResource(env.WEBEX_NOTIFICATION_CHANNEL_TOKEN)
      .createMessage({
        roomId: env.WEBEX_NOTIFICATION_CHANNEL_ID,
        markdown: ['```text', message, '```'].join('\n')
      })
      .catch()
      .finally();
  }

  console.error('\x1b[31m' + message + '\x1b[0m');
};

export const getSession: GetSession = async (event) => {
  const isAuthenticated = event.locals.session?.user?.uuid != null;

  return { isAuthenticated };
};
