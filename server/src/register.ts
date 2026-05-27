import * as pckg from '../../package.json';

const register = ({ strapi }: { strapi: any }) => {
  strapi.customFields.register({
    name: 'json-function',
    plugin: pckg.strapi.name,
    type: 'text',
  });
};

export default register;
