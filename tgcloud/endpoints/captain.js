import { fetch, EndpointError } from 'sdk';
import { createCaptainRelay } from '../lib/captain-relay.js';
import { captainServiceUrl } from '../lib/config.js';

export default createCaptainRelay({ fetcher: fetch, EndpointError, serviceUrl: captainServiceUrl });
