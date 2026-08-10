import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';

export const meta: MetaFunction = () => [
  { title: 'DevX Studio | Workspace' },
  {
    name: 'description',
    content: 'Build, inspect, run, and preview software in the DevX Studio workspace.',
  },
];

export async function loader(args: LoaderFunctionArgs) {
  return json({ id: args.params.id });
}

export default IndexRoute;
