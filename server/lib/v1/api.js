import account from './account.js';
import auth from './auth.js';
import csFee from '../csFee.js';
import express from 'express';
import fee from '../fee.js';
import github from '../github.js';
import openalias from '../openalias.js';
import semver from 'semver';
import tokens from '../tokens.js';

const api = express.Router();
let providersPromise;

const PROVIDERS = [
  {
    id: 'changenow',
    name: 'ChangeNOW',
    logo: 'changenow.svg',
  },
];

api.post('/register', validateAuthParams, (req, res) => {
  const walletId = req.body.wallet_id;
  auth.register(walletId, req.body.pin).then((token) => {
    console.log('registered wallet %s', walletId);
    res.status(200).send(token);
  }).catch((err) => {
    if (!['auth_failed', 'user_deleted'].includes(err.error)) {
      console.error('error', err);
    }
    return res.status(400).send(err);
  });
});

api.post('/login', validateAuthParams, (req, res) => {
  const walletId = req.body.wallet_id;
  auth.login(walletId, req.body.pin).then((token) => {
    console.log('authenticated wallet %s', walletId);
    res.status(200).send(token);
  }).catch((err) => {
    if (!['auth_failed', 'user_deleted'].includes(err.error)) {
      console.error('error', err);
    }
    res.status(400).send(err);
  });
});

api.get('/exist', (req, res) => {
  const walletId = req.query.wallet_id;
  if (!walletId) {
    return res.status(400).json({ error: 'Bad request' });
  }
  account.isExist(walletId).then((userExist) => {
    res.status(200).send(userExist);
  }).catch((err) => {
    return res.status(400).send(err);
  });
});

api.get('/openalias', (req, res) => {
  const { hostname } = req.query;
  if (!hostname) {
    return res.status(400).json({ error: 'Bad request' });
  }
  openalias.resolveTo(hostname)
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      return res.status(400).send({ error: err.message });
    });
});

api.put('/username', (req, res) => {
  const { id } = req.body;
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Bad request' });
  }
  account.setUsername(id, username).then((username) => {
    res.status(200).send({ username });
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.get('/details', (req, res) => {
  account.getDetails(req.query.id).then((details) => {
    res.status(200).json(details);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.put('/details', (req, res) => {
  if (!req.body.data) {
    return res.status(400).json({ error: 'Bad request' });
  }
  account.saveDetails(req.body.id, req.body.data).then((details) => {
    res.status(200).json(details);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.delete('/account', (req, res) => {
  const { id } = req.body;
  account.remove(id).then(() => {
    res.status(200).send();
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.get('/fees', (req, res) => {
  let network = req.query.network || 'bitcoin';
  if (network === 'bitcoincash') network = 'bitcoin-cash';
  if (network === 'bitcoinsv') network = 'bitcoin-sv';
  fee.getFees(`${network}@${network}`).then((fees) => {
    res.status(200).send(fees);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.get('/providers', async (req, res) => {
  const providers = await getEnabledProviders();
  res.status(200).send(providers.map(({ id }) => {
    return PROVIDERS.find((provider) => provider.id === id);
  }));
});

api.get('/estimate', async (req, res) => {
  const { from, to, amount } = req.query;
  const providers = getEnabledProviders();
  const estimations = [];
  let amountError;
  let hasInternalError = false;

  const results = await Promise.allSettled((await providers).map(async ({ id, exchange }) => {
    const data = await exchange.estimate({ from, to, amount });
    return { provider: id, data };
  }));

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      hasInternalError = true;
      continue;
    }
    const { provider, data } = result.value;
    if (data?.error) {
      if (!amountError && ['AmountError', 'SmallAmountError', 'BigAmountError'].includes(data.error)) {
        amountError = data;
      }
      continue;
    }
    estimations.push({
      provider,
      ...data,
    });
  }

  if (estimations.length) {
    return res.status(200).send(estimations);
  }
  if (amountError) {
    return res.status(200).send(amountError);
  }
  if (hasInternalError) {
    return res.status(200).send({ error: 'InternalExchangeError' });
  }
  return res.status(200).send({ error: 'ExchangeDisabled' });
});

api.get('/validate/:provider', (req, res, next) => {
  getProvider(req.params.provider).then((exchange) => {
    if (!exchange) {
      return res.status(400).send({ error: 'Unknown provider' });
    }
    exchange.validateAddress({
      cryptoId: req.query.cryptoId,
      address: req.query.address,
      extraId: req.query.extraId,
    }).then((data) => {
      res.status(200).send(data);
    }).catch(next);
  }).catch(next);
});

api.post('/transaction/:provider', (req, res, next) => {
  getProvider(req.params.provider).then((exchange) => {
    if (!exchange) {
      return res.status(400).send({ error: 'Unknown provider' });
    }
    exchange.createTransaction({
      walletId: req.query.id || req.body.id || '',
      from: req.body.from,
      to: req.body.to,
      amount: req.body.amount,
      address: req.body.address,
      extraId: req.body.extraId,
      refundAddress: req.body.refundAddress,
    }).then((data) => {
      res.status(200).send(data);
    }).catch(next);
  }).catch(next);
});

api.get('/transactions/:provider', (req, res, next) => {
  getProvider(req.params.provider).then((exchange) => {
    if (!exchange) {
      return res.status(400).send({ error: 'Unknown provider' });
    }
    exchange.getTransactions({
      ids: parseTransactions(req.query.transactions),
    }).then((data) => {
      res.status(200).send(data);
    }).catch(next);
  }).catch(next);
});

api.get('/csFee', (req, res) => {
  let network = req.query.network || 'bitcoin';
  if (network === 'bitcoincash') network = 'bitcoin-cash';
  if (network === 'bitcoinsv') network = 'bitcoin-sv';
  csFee.getCsFee(`${network}@${network}`).then((data) => {
    res.status(200).send(data);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.get('/ticker/applewatch', (req, res) => {
  tokens.getFromCacheForAppleWatch().then((data) => {
    res.status(200).send(data);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.get('/ethereum/tokens', (req, res) => {
  tokens.getTokens('ethereum', 50).then((data) => {
    res.status(200).send(data);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

api.all('/location', (req, res) => {
  res.status(410).send({ error: 'Please upgrade the app!' });
});

// for debug
// returns all releases
api.get('/updates', (req, res, next) => {
  github.getUpdates()
    .then((updates) => {
      return updates.map((item) => {
        return {
          name: item.name,
          version: item.version,
          url: item.url,
          distribution: item.distribution,
          arch: item.arch,
          app: item.app,
        };
      });
    })
    .then((updates) => {
      res.status(200).send(updates);
    })
    .catch(next);
});

api.get('/update/:distribution/:arch/:version', (req, res, next) => {
  const app = req.get('User-Agent').includes('CoinSpace') ? 'electron' : 'app';
  const { distribution, arch, version } = req.params;
  if (!semver.valid(version)) {
    return res.status(400).send({ error: `Invalid SemVer: "${version}"` });
  }
  github.getUpdate(distribution, arch, app)
    .then(update => {
      if (!update) {
        res.status(404).send({ error: 'Unsupported platform' });
      } else if (semver.gt(update.version, version)) {
        res.status(200).send({
          name: update.name,
          version: update.version,
          url: update.url,
        });
      } else {
        // send "no content" if version is equal or less
        res.status(204).end();
      }
    }).catch(next);
});

api.get('/update/win/x64/:version/RELEASES', (req, res, next) => {
  const { version } = req.params;
  if (!semver.valid(version)) {
    return res.status(400).send(`Invalid SemVer: "${version}"`);
  }
  github.getUpdate('win', 'x64', 'electron')
    .then(update => {
      if (!update) {
        res.status(404).send('Unsupported platform');
      } else {
        res.status(200).send(update.content);
      }
    }).catch(next);
});

api.get('/download/:distribution/:arch', (req, res, next) => {
  const { distribution, arch } = req.params;
  github.getUpdate(distribution, arch, 'app')
    .then(update => {
      if (!update) {
        res.redirect(302, `https://github.com/${github.account}/releases/latest`);
      } else {
        res.redirect(302, update.url);
      }
    }).catch(next);
});

function validateAuthParams(req, res, next) {
  if (!req.body.wallet_id || !validatePin(req.body.pin)) {
    return res.status(400).json({ error: 'Bad request' });
  }
  next();
}

function validatePin(pin) {
  return pin != undefined && pin.match(/^\d{4}$/);
}

async function getEnabledProviders() {
  if (!providersPromise) {
    providersPromise = loadProviders();
  }
  const providers = await providersPromise;
  return PROVIDERS
    .map(({ id }) => ({ id, exchange: providers[id] }))
    .filter(({ exchange }) => Boolean(exchange));
}

async function getProvider(id) {
  const providers = await getEnabledProviders();
  return providers.find((provider) => provider.id === id)?.exchange;
}

function parseTransactions(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

async function loadProviders() {
  const providers = {};

  if (process.env.CHANGENOW_API_KEY) {
    try {
      providers.changenow = await import('../exchanges/changenow.js');
    } catch (err) {
      console.error('Unable to load ChangeNOW provider', err.message);
    }
  }

  return providers;
}

export default api;
