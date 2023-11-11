import { format, URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface BasicAuthorization {
  username?: string;
  password?: string;
}

export interface ProxyOptions {
  host: string;
  port: number;
  auth?: BasicAuthorization;
}

function serializeAuth({ username, password }: BasicAuthorization = {}) {
  if (!username) {
    return '';
  }

  if (!password) {
    return username;
  }

  return `${username}:${password}`;
}

export function proxyStringToObject(proxyString: string) {
  if (!proxyString.startsWith('http')) {
    return proxyStringToObject(`http://${proxyString}`);
  }

  const parsedUrl = new URL(proxyString);

  const host = parsedUrl.hostname;
  const port = parseInt(parsedUrl.port);
  const protocol = parsedUrl.protocol;

  const auth = {
    username: parsedUrl.username,
    password: parsedUrl.password,
  };

  return {
    host,
    port,
    isHttps: protocol === 'https:',
    auth: auth?.username ? auth : undefined,
  };
}

export function proxyObjectToString(proxyObject: ProxyOptions) {
  const { host: hostname, port, auth: authObject } = proxyObject;
  const auth = serializeAuth(authObject);

  const formatted = format({ hostname, port, auth });

  // Ugly fix for Node 6 vs Node 8 behavior
  return formatted.replace(/^\/\//, '');
}

export function agentFromProxy(proxy?: ProxyOptions) {
  if (!proxy) {
    return {};
  }
  ['http_proxy', 'https_proxy'].forEach((envStr) => {
    delete process.env[envStr];
    delete process.env[envStr.toUpperCase()];
  });

  return new HttpsProxyAgent(proxyObjectToString(proxy));
}
