import type { Core } from '@strapi/strapi';
import * as pckg from '../../package.json';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase
  strapi.customFields.register({
    name: 'json-function',
    plugin: pckg.strapi.name,
    type: 'text',
  });
};

export default register;
