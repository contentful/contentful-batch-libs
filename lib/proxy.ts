import { URL, format } from 'url';
import HttpsProxyAgent from 'https-proxy-agent';
import type { Authorization, ProxyObject } from './types';

function serializeAuth({ username, password }: Authorization = {}) {
  if (!username) {
    return '';
  }

  if (!password) {
    return username;
  }

  return `${username}:${password}`;
}

export function proxyStringToObject(proxyString: string): Pick<ProxyObject, 'host' | 'isHttps' | 'port' | 'auth'> {
  if (!proxyString.startsWith('http')) {
    return proxyStringToObject(`http://${proxyString}`);
  }

  const parsedUrl = new URL(proxyString);

  const host = parsedUrl.hostname;
  const portString = parsedUrl.port;
  const protocol = parsedUrl.protocol;

  const auth = {
    username: parsedUrl.username,
    password: parsedUrl.password
  };

  const port = parseInt(portString);
  const isHttps = protocol === 'https:';

  if (!auth.username) {
    return { host, port, isHttps };
  }

  return {
    host,
    isHttps,
    port,
    auth
  };
}

export function proxyObjectToString(proxyObject: Pick<ProxyObject, 'host' | 'port' | 'auth'>): string {
  const { host: hostname, port, auth: authObject } = proxyObject;
  const auth = serializeAuth(authObject);

  const formatted = format({ hostname, port, auth });

  // Ugly fix for Node 6 vs Node 8 behavior
  return formatted.replace(/^\/\//, '');
}

export function agentFromProxy(proxy?: Pick<ProxyObject, 'host' | 'port' | 'protocol'>) {
  if (!proxy) {
    return {};
  }
  ['http_proxy', 'https_proxy'].forEach((envStr) => {
    delete process.env[envStr];
    delete process.env[envStr.toUpperCase()];
  });
  const { host, port, protocol } = proxy;
  const agent = new HttpsProxyAgent({ host, port, protocol });
  return agent;
}
